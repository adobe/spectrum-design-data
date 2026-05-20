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
//! - Active view (flex): empty, query, resolve, describe, or validate.
//! - Status + palette (2 lines at bottom): optional status message, then palette prompt.
//!
//! Key bindings (M2):
//! - `:` opens palette in command mode; `/` opens in fuzzy-find mode.
//! - In palette, Enter dispatches the command; Esc cancels; Tab completes command name.
//! - In query/resolve/validate view: Up/k and Down/j navigate; `y` yanks; Esc returns.
//! - In describe view: Up/k Down/j scroll line-by-line; PgUp/PgDn by 10 lines; Esc returns.
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
use design_data_core::schema::SchemaRegistry;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{
    Frame, Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Clear, Paragraph, Row, Table},
};

use design_data_tui::app::{ActiveView, App, Modal, StatusKind, StatusMessage, SubmitContext};
use design_data_tui::wizard::{ValueKind, WizardCtx, WizardScreen, WizardState};

/// Token dataset loaded once at startup and held for the full session.
struct DatasetHandle {
    token_count: usize,
    dataset_path: PathBuf,
    graph: TokenGraph,
    components_dir: Option<PathBuf>,
    mode_sets_dir: Option<PathBuf>,
    schema_registry: Option<SchemaRegistry>,
}

impl DatasetHandle {
    fn load(
        path: PathBuf,
        components_arg: Option<PathBuf>,
        mode_sets_arg: Option<PathBuf>,
    ) -> Result<Self> {
        let mut graph = TokenGraph::from_json_dir(&path)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;

        // Resolve components directory: explicit arg → spec-bundled fallback.
        let components_dir = components_arg.or_else(default_components_path);
        if let Some(ref dir) = components_dir {
            if dir.is_dir() {
                let comps = TokenGraph::load_spec_components(dir)
                    .into_diagnostic()
                    .wrap_err_with(|| {
                        format!("failed to load components from {}", dir.display())
                    })?;
                graph = graph.with_components(comps);
            }
        }

        // Resolve mode-sets directory: explicit arg → spec-bundled fallback.
        let mode_sets_dir = mode_sets_arg.or_else(default_mode_sets_path);
        if let Some(ref dir) = mode_sets_dir {
            if dir.is_dir() {
                let mode_sets = TokenGraph::load_spec_mode_sets(dir)
                    .into_diagnostic()
                    .wrap_err_with(|| {
                        format!("failed to load mode sets from {}", dir.display())
                    })?;
                graph = graph.with_mode_sets(mode_sets);
            }
        }

        // Load schema registry for `:validate`. Silently skip if schema dir is absent.
        let schema_registry = default_schema_path()
            .and_then(|p| SchemaRegistry::load_legacy_token_schemas(&p).ok());

        Ok(Self {
            token_count: graph.tokens.len(),
            dataset_path: path,
            graph,
            components_dir,
            mode_sets_dir,
            schema_registry,
        })
    }

    fn primer_line(&self) -> String {
        format!(
            " {} tokens  ·  {}",
            self.token_count,
            self.dataset_path.display()
        )
    }

    fn submit_context(&self) -> SubmitContext<'_> {
        SubmitContext {
            graph: &self.graph,
            dataset_path: Some(&self.dataset_path),
            components_dir: self.components_dir.as_deref(),
            schema_registry: self.schema_registry.as_ref(),
            mode_sets_dir: self.mode_sets_dir.as_deref(),
        }
    }

    fn wizard_ctx(&self) -> WizardCtx<'_> {
        WizardCtx { graph: &self.graph, dataset_path: Some(&self.dataset_path) }
    }
}

fn default_schema_path() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DESIGN_DATA_SCHEMA_ROOT") {
        return Some(PathBuf::from(p));
    }
    let candidates = [
        PathBuf::from("packages/tokens/schemas"),
        PathBuf::from("../packages/tokens/schemas"),
    ];
    candidates.into_iter().find(|c| c.join("token-types").is_dir())
}

fn default_components_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("packages/design-data-spec/components"),
        PathBuf::from("../packages/design-data-spec/components"),
    ];
    candidates.into_iter().find(|c| c.is_dir())
}

fn default_mode_sets_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("packages/design-data-spec/mode-sets"),
        PathBuf::from("../packages/design-data-spec/mode-sets"),
    ];
    candidates.into_iter().find(|c| c.is_dir())
}

#[derive(Parser)]
#[command(name = "design-data-tui", about = "Interactive Spectrum design data TUI")]
struct Cli {
    /// Path to the token dataset directory.
    dataset: PathBuf,
    /// Path to the components directory (default: spec-bundled).
    #[arg(long)]
    components: Option<PathBuf>,
    /// Path to the mode-sets directory (default: spec-bundled).
    #[arg(long = "mode-sets")]
    mode_sets: Option<PathBuf>,
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

/// Return a centered `Rect` covering `percent_x` × `percent_y` of `area`.
fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
    let vert = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(area);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(vert[1])[1]
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let handle = DatasetHandle::load(cli.dataset, cli.components, cli.mode_sets)?;

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

fn render_wizard(f: &mut Frame<'_>, ws: &mut WizardState, area: Rect) {
    let screen_num = ws.screen.number();
    let screen_name = ws.screen.name();

    let outer = Block::default()
        .borders(Borders::ALL)
        .title(format!(" Wizard · {screen_num}/4 · {screen_name} "));
    let inner_area = outer.inner(area);
    f.render_widget(outer, area);

    let inner_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .split(inner_area);

    let footer_text = match ws.screen {
        WizardScreen::Intent => {
            "Enter: continue  Tab: reuse selected  ↑↓: select suggestion  Esc: cancel"
        }
        WizardScreen::Classification => {
            "Tab/Shift-Tab: next/prev field  ←→: cycle layer  +: add name field  Enter: continue  Esc: cancel"
        }
        WizardScreen::Values => {
            "a: alias  l: literal  e: edit value  ↑↓: select row  Enter: continue  Esc: cancel"
        }
        WizardScreen::Confirm => {
            "Type rationale, then Enter to preview (no write)  Esc: cancel"
        }
    };
    f.render_widget(
        Paragraph::new(footer_text).style(Style::default().fg(Color::DarkGray)),
        inner_chunks[1],
    );

    match ws.screen {
        WizardScreen::Intent => render_intent_screen(f, ws, inner_chunks[0]),
        WizardScreen::Classification => render_classification_screen(f, ws, inner_chunks[0]),
        WizardScreen::Values => render_values_screen(f, ws, inner_chunks[0]),
        WizardScreen::Confirm => render_confirm_screen(f, ws, inner_chunks[0]),
    }
}

fn render_intent_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(1), Constraint::Min(0)])
        .split(area);

    // Input line.
    let intent_line = format!("Intent: {}", ws.intent.value());
    f.render_widget(Paragraph::new(intent_line), chunks[0]);

    // Suggestions list.
    if ws.suggestions.is_empty() {
        if !ws.intent.value().is_empty() {
            f.render_widget(
                Paragraph::new("  (no suggestions — will create new token)"),
                chunks[1],
            );
        } else {
            f.render_widget(Paragraph::new("  Type to search for existing tokens…"), chunks[1]);
        }
    } else {
        let rows: Vec<Row> = ws
            .suggestions
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let marker = if i == ws.selected_suggestion { "▶" } else { " " };
                let conf = format!("{:.0}%", s.confidence * 100.0);
                Row::new(vec![
                    Cell::from(marker),
                    Cell::from(s.token_name.as_str()),
                    Cell::from(conf),
                ])
            })
            .collect();
        let widths = [Constraint::Length(2), Constraint::Min(0), Constraint::Length(5)];
        let table = Table::new(rows, widths).highlight_style(Style::default().bg(Color::DarkGray));
        f.render_widget(table, chunks[1]);
    }
}

fn render_classification_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect) {
    let layer_str = match ws.classification.layer {
        design_data_core::graph::Layer::Foundation => "Foundation",
        design_data_core::graph::Layer::Platform => "Platform",
        design_data_core::graph::Layer::Product => "Product",
    };

    let mut lines: Vec<Line> = Vec::new();
    let focused = ws.classification.focused_field;

    let layer_label = if focused == 0 {
        format!("▶ Layer:    ← {layer_str} →")
    } else {
        format!("  Layer:      {layer_str}")
    };
    lines.push(Line::from(layer_label));

    let prop_label = if focused == 1 {
        format!("▶ Property: {}", ws.classification.property.value())
    } else {
        format!("  Property: {}", ws.classification.property.value())
    };
    lines.push(Line::from(prop_label));

    for (i, field) in ws.classification.name_fields.iter().enumerate() {
        let marker = if focused == i + 2 { "▶" } else { " " };
        lines.push(Line::from(format!("{marker} {}: {}", field.key, field.value.value())));
    }

    lines.push(Line::from(""));
    let name = ws.assembled_name();
    lines.push(Line::from(format!("  Preview: {name}")));

    f.render_widget(Paragraph::new(lines), area);
}

fn render_values_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect) {
    if ws.values.rows.is_empty() {
        f.render_widget(Paragraph::new("  (no mode combinations — graph has no mode sets)"), area);
        return;
    }

    let header = Row::new(vec![
        Cell::from("Mode combo").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Kind").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Value / Alias target").style(Style::default().add_modifier(Modifier::BOLD)),
    ]);
    let rows: Vec<Row> = ws
        .values
        .rows
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let combo = row.combo_label();
            let kind = match row.kind {
                ValueKind::Alias => "alias",
                ValueKind::Literal => "literal",
            };
            let value = match row.kind {
                ValueKind::Alias => row.alias_target.value().to_string(),
                ValueKind::Literal => row.literal.value().to_string(),
            };
            let style = if i == ws.values.selected {
                Style::default().bg(Color::DarkGray)
            } else {
                Style::default()
            };
            Row::new(vec![Cell::from(combo), Cell::from(kind), Cell::from(value)]).style(style)
        })
        .collect();

    let widths = [
        Constraint::Percentage(30),
        Constraint::Percentage(10),
        Constraint::Percentage(60),
    ];
    let table = Table::new(rows, widths).header(header).block(
        Block::default().borders(Borders::NONE),
    );
    f.render_widget(table, area);
}

fn render_confirm_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect) {
    let rationale_height = 3u16;
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(rationale_height), Constraint::Min(0)])
        .split(area);

    // Rationale input.
    let rationale_block = Block::default().borders(Borders::ALL).title(" Rationale (required) ");
    let rationale_text = ws.rationale.value();
    let rationale_line = if rationale_text.len() > 280 {
        Line::from(vec![
            Span::raw(rationale_text),
            Span::styled(" ⚠ >280 chars", Style::default().fg(Color::Yellow)),
        ])
    } else {
        Line::from(Span::raw(rationale_text))
    };
    f.render_widget(Paragraph::new(rationale_line).block(rationale_block), chunks[0]);

    // Diff preview.
    let diff_text = ws.diff_preview.as_deref().unwrap_or("(diff will appear here once rationale is added and Enter pressed)");
    let diff_para = Paragraph::new(diff_text)
        .block(Block::default().borders(Borders::ALL).title(" Diff preview "))
        .scroll((ws.diff_scroll, 0));
    f.render_widget(diff_para, chunks[1]);
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
                ActiveView::Resolve(ref mut rv) => {
                    let header = Row::new(vec![
                        Cell::from("★").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Name").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Value").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("File").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Layer").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Spec").style(Style::default().add_modifier(Modifier::BOLD)),
                    ]);
                    let rows: Vec<Row> = rv
                        .rows
                        .iter()
                        .map(|r| {
                            Row::new(vec![
                                Cell::from(if r.is_winner { "★" } else { "" }),
                                Cell::from(r.name.as_str()),
                                Cell::from(r.value.as_str()),
                                Cell::from(r.file.as_str()),
                                Cell::from(r.layer.as_str()),
                                Cell::from(r.specificity.to_string()),
                            ])
                        })
                        .collect();
                    let widths = [
                        Constraint::Length(2),
                        Constraint::Percentage(35),
                        Constraint::Percentage(25),
                        Constraint::Percentage(20),
                        Constraint::Percentage(12),
                        Constraint::Percentage(8),
                    ];
                    let table = Table::new(rows, widths)
                        .header(header)
                        .block(
                            Block::default()
                                .borders(Borders::ALL)
                                .title(format!(" Resolve: {} ", rv.property)),
                        )
                        .highlight_style(Style::default().bg(Color::DarkGray));
                    f.render_stateful_widget(table, chunks[1], &mut rv.table_state);
                }
                ActiveView::Describe(ref dv) => {
                    let para = Paragraph::new(dv.pretty_json.as_str())
                        .block(
                            Block::default()
                                .borders(Borders::ALL)
                                .title(format!(" Describe: {} ", dv.component)),
                        )
                        .scroll((dv.scroll, 0));
                    f.render_widget(para, chunks[1]);
                }
                ActiveView::Validate(ref mut vv) => {
                    let header = Row::new(vec![
                        Cell::from("Sev").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Rule").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Token").style(Style::default().add_modifier(Modifier::BOLD)),
                        Cell::from("Message").style(Style::default().add_modifier(Modifier::BOLD)),
                    ]);
                    let rows: Vec<Row> = vv
                        .rows
                        .iter()
                        .map(|r| {
                            Row::new(vec![
                                Cell::from(r.severity.as_str()),
                                Cell::from(r.rule_id.as_str()),
                                Cell::from(r.token.as_str()),
                                Cell::from(r.message.as_str()),
                            ])
                        })
                        .collect();
                    let widths = [
                        Constraint::Length(7),
                        Constraint::Percentage(12),
                        Constraint::Percentage(28),
                        Constraint::Percentage(60),
                    ];
                    let table = Table::new(rows, widths)
                        .header(header)
                        .block(
                            Block::default()
                                .borders(Borders::ALL)
                                .title(" Validate "),
                        )
                        .highlight_style(Style::default().bg(Color::DarkGray));
                    f.render_stateful_widget(table, chunks[1], &mut vv.table_state);
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

            // Palette prompt (hidden while a modal is open).
            let palette_text = if app.modal.is_none() && app.palette_open {
                format!("{}{}", app.palette_prefix(), app.palette_input.value())
            } else {
                String::new()
            };
            f.render_widget(Paragraph::new(palette_text), chunks[3]);

            // Overlay modal (rendered last so it appears on top).
            if let Some(Modal::Wizard(ref mut ws)) = app.modal {
                let popup_area = centered_rect(82, 85, size);
                f.render_widget(Clear, popup_area);
                render_wizard(f, ws, popup_area);
            }
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
                    if app.modal.is_some() {
                        // Modal captures all input; palette is suppressed.
                        app.handle_modal_key(key, &handle.wizard_ctx());
                    } else {
                        let was_open = app.palette_open;
                        app.handle_key(key);
                        // Palette just closed via Enter — dispatch command.
                        if was_open && !app.palette_open && key.code == KeyCode::Enter {
                            app.submit_palette(&handle.submit_context());
                        }
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
