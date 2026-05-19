// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Interactive TUI for Spectrum design data authoring and inspection.
//!
//! Three-region layout (RFC #973 §3.1):
//! - Primer header (1 line): token count + dataset path.
//! - Active view (flex): empty, or a query-results table.
//! - Status + palette (2 lines at bottom): optional status message, then palette prompt.
//!
//! Key bindings (M1):
//! - `:` opens palette in command mode; `/` opens in fuzzy-find mode.
//! - In palette, Enter dispatches the command; Esc cancels.
//! - In query view: Up/k and Down/j navigate; `y` yanks selected name; Esc returns to empty.
//! - `q` quits when palette is closed; Ctrl-C always quits.

use std::io::{Write, stderr};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use clap::Parser;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use design_data_core::graph::TokenGraph;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
};

use design_data_tui::app::{ActiveView, App, StatusKind, StatusMessage};

/// Token dataset loaded once at startup and held for the full session.
struct DatasetHandle {
    token_count: usize,
    dataset_path: PathBuf,
    graph: TokenGraph,
}

impl DatasetHandle {
    fn load(path: PathBuf) -> Result<Self> {
        let graph = TokenGraph::from_json_dir(&path)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;
        Ok(Self {
            token_count: graph.tokens.len(),
            dataset_path: path,
            graph,
        })
    }

    fn primer_line(&self) -> String {
        format!(
            " {} tokens  ·  {}",
            self.token_count,
            self.dataset_path.display()
        )
    }
}

#[derive(Parser)]
#[command(name = "design-data-tui", about = "Interactive Spectrum design data TUI")]
struct Cli {
    /// Path to the token dataset directory.
    dataset: PathBuf,
}

/// Write `text` to the system clipboard.
///
/// - macOS: `pbcopy`
/// - Linux: `xclip -selection clipboard`
/// - Windows: not supported; returns an error that main.rs surfaces in the status bar.
fn write_clipboard(text: &str) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    let mut child = Command::new("pbcopy").stdin(Stdio::piped()).spawn()?;

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let mut child = Command::new("xclip")
        .args(["-selection", "clipboard"])
        .stdin(Stdio::piped())
        .spawn()?;

    #[cfg(target_os = "windows")]
    return Err(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "clipboard yank is not supported on Windows (coming in M5)",
    ));

    #[cfg(not(target_os = "windows"))]
    {
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(text.as_bytes())?;
        }
        child.wait()?;
        Ok(())
    }
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let handle = DatasetHandle::load(cli.dataset)?;

    // Restore terminal on panic so the shell is not left in a broken state.
    let original_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = disable_raw_mode();
        let _ = execute!(stderr(), LeaveAlternateScreen);
        original_hook(info);
    }));

    enable_raw_mode().into_diagnostic()?;
    let mut stdout = std::io::stdout();
    execute!(stdout, EnterAlternateScreen).into_diagnostic()?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend).into_diagnostic()?;

    let result = run(&mut terminal, &handle);

    // Best-effort cleanup — continue even if individual steps fail.
    let _ = disable_raw_mode();
    let _ = execute!(terminal.backend_mut(), LeaveAlternateScreen);
    let _ = terminal.show_cursor();

    result
}

fn run<B: ratatui::backend::Backend>(terminal: &mut Terminal<B>, handle: &DatasetHandle) -> Result<()> {
    let mut app = App::new();

    loop {
        terminal.draw(|f| {
            let size = f.area();

            // Bottom area: status line (when present) + palette prompt.
            let status_height = if app.status_message.is_some() { 1 } else { 0 };
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(1),             // primer header
                    Constraint::Min(0),                // active view
                    Constraint::Length(status_height), // status message
                    Constraint::Length(1),             // palette prompt
                ])
                .split(size);

            // Primer header.
            let primer_text = Line::from(vec![
                Span::styled("▶ ", Style::default().fg(Color::Green)),
                Span::raw(handle.primer_line()),
            ]);
            f.render_widget(Paragraph::new(primer_text), chunks[0]);

            // Active view.
            match &mut app.active_view {
                ActiveView::Empty => {
                    let block = Block::default()
                        .borders(Borders::ALL)
                        .title(" Active View ");
                    f.render_widget(block, chunks[1]);
                }
                ActiveView::Query(ref mut qv) => {
                    let header = Row::new(vec![
                        Cell::from("Name").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Value").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("File").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Layer").style(Style::default().add_modifier(Modifier::BOLD)),
                    ]);
                    let rows: Vec<Row> = qv
                        .rows
                        .iter()
                        .map(|r| {
                            Row::new(vec![
                                Cell::from(r.name.as_str()),
                                Cell::from(r.value.as_str()),
                                Cell::from(r.file.as_str()),
                                Cell::from(r.layer.as_str()),
                            ])
                        })
                        .collect();
                    let widths = [
                        Constraint::Percentage(40),
                        Constraint::Percentage(30),
                        Constraint::Percentage(20),
                        Constraint::Percentage(10),
                    ];
                    let table = Table::new(rows, widths)
                        .header(header)
                        .block(
                            Block::default()
                                .borders(Borders::ALL)
                                .title(format!(" Query: {} ", qv.expr_text)),
                        )
                        .highlight_style(Style::default().bg(Color::DarkGray));
                    f.render_stateful_widget(table, chunks[1], &mut qv.table_state);
                }
            }

            // Status message — green for info, red for errors.
            if let Some(ref msg) = app.status_message {
                let color = match msg.kind {
                    StatusKind::Info => Color::Green,
                    StatusKind::Error => Color::Red,
                };
                let status = Paragraph::new(msg.text.as_str())
                    .style(Style::default().fg(color));
                f.render_widget(status, chunks[2]);
            }

            // Palette prompt.
            let palette_text = if app.palette_open {
                format!("{}{}", app.palette_prefix(), app.palette_input.value())
            } else {
                String::new()
            };
            f.render_widget(Paragraph::new(palette_text), chunks[3]);
        }).into_diagnostic()?;

        // Copy to clipboard outside the draw closure (needs mutable app).
        if let Some(text) = app.take_pending_yank() {
            if let Err(e) = write_clipboard(&text) {
                app.status_message = Some(StatusMessage::error(format!("clipboard unavailable: {e}")));
            }
        }

        if event::poll(std::time::Duration::from_millis(16)).into_diagnostic()? {
            if let Event::Key(key) = event::read().into_diagnostic()? {
                if key.kind == KeyEventKind::Press {
                    let was_open = app.palette_open;
                    app.handle_key(key);
                    // Palette just closed via Enter — dispatch command.
                    if was_open && !app.palette_open && key.code == KeyCode::Enter {
                        app.submit_palette(&handle.graph);
                    }
                }
            }
        }

        if app.quit {
            break;
        }
    }

    Ok(())
}
