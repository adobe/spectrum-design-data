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
//! M0 surface: primer header + empty active view + palette prompt.
//! The palette opens on `:` (command) or `/` (fuzzy-find) and closes on `Esc`.

use std::io::stderr;
use std::path::PathBuf;

use clap::Parser;
use crossterm::{
    event::{self, Event, KeyEventKind},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use design_data_core::graph::TokenGraph;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph},
};

use design_data_tui::app::App;

/// Token count and path summary loaded once at startup.
///
/// Stores only the information needed to render the primer header.
/// The `TokenGraph` itself is not retained after loading — it is only
/// used to extract `token_count` before being dropped.
struct PrimerData {
    token_count: usize,
    dataset_path: PathBuf,
}

impl PrimerData {
    fn load(path: PathBuf) -> Result<Self> {
        let graph = TokenGraph::from_json_dir(&path)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;
        Ok(Self {
            token_count: graph.tokens.len(),
            dataset_path: path,
        })
    }

    /// One-line summary for the primer header.
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

fn main() -> Result<()> {
    let cli = Cli::parse();
    let primer = PrimerData::load(cli.dataset)?;

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

    let result = run(&mut terminal, &primer);

    // Best-effort cleanup — continue even if individual steps fail so the
    // caller always gets the original result rather than a cleanup error.
    let _ = disable_raw_mode();
    let _ = execute!(terminal.backend_mut(), LeaveAlternateScreen);
    let _ = terminal.show_cursor();

    result
}

fn run<B: ratatui::backend::Backend>(terminal: &mut Terminal<B>, primer: &PrimerData) -> Result<()> {
    let mut app = App::new();

    loop {
        terminal.draw(|f| {
            let size = f.area();

            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(1), // primer header
                    Constraint::Min(0),    // active view
                    Constraint::Length(1), // palette prompt
                ])
                .split(size);

            // Primer header.
            let primer_text = Line::from(vec![
                Span::styled("▶ ", Style::default().fg(Color::Green)),
                Span::raw(primer.primer_line()),
            ]);
            f.render_widget(Paragraph::new(primer_text), chunks[0]);

            // Active view (empty for M0).
            let active_block = Block::default()
                .borders(Borders::ALL)
                .title(" Active View ");
            f.render_widget(active_block, chunks[1]);

            // Palette prompt.
            let palette_text = if app.palette_open {
                format!("{}{}", app.palette_prefix(), app.palette_input.value())
            } else {
                String::new()
            };
            f.render_widget(Paragraph::new(palette_text), chunks[2]);
        }).into_diagnostic()?;

        if event::poll(std::time::Duration::from_millis(16)).into_diagnostic()? {
            if let Event::Key(key) = event::read().into_diagnostic()? {
                // Ignore key-release events (Windows sends them; crossterm surfaces them).
                if key.kind == KeyEventKind::Press {
                    app.handle_key(key);
                }
            }
        }

        if app.quit {
            break;
        }
    }

    Ok(())
}
