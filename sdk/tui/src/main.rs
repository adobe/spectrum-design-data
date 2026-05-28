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
//! - `?` opens the help overlay; Esc or `?` closes it.
//! - `v` toggles text-selection mode; drag to copy.

use std::io::{Write, stderr};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use clap::{Parser, ValueEnum};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use design_data_core::graph::TokenGraph;
use design_data_core::schema::SchemaRegistry;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
};

use design_data_tui::app::{ActiveView, App, HitAction, HitRegion, StatusMessage, SubmitContext};
use design_data_tui::theme::Theme;
use design_data_tui::wizard::WizardCtx;

/// Which visual palette to use.
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum ThemeChoice {
    /// Terminal-native colors; works in any 256-color terminal.
    #[default]
    Terminal,
    /// Adobe Spectrum palette; requires a 24-bit truecolor terminal.
    Spectrum,
}

/// Token dataset loaded once at startup and held for the full session.
struct DatasetHandle {
    token_count: usize,
    dataset_path: PathBuf,
    graph: TokenGraph,
    components_dir: Option<PathBuf>,
    mode_sets_dir: Option<PathBuf>,
    schema_registry: Option<SchemaRegistry>,
    /// When true, wizard Screen 4 Submit writes to disk via `write_token`.
    allow_write: bool,
    /// Active color theme (terminal-native or Spectrum).
    theme: Theme,
}

impl DatasetHandle {
    fn load(
        path: PathBuf,
        components_arg: Option<PathBuf>,
        mode_sets_arg: Option<PathBuf>,
        allow_write: bool,
        theme: Theme,
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
            allow_write,
            theme,
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
        WizardCtx {
            graph: &self.graph,
            dataset_path: Some(&self.dataset_path),
            schema_registry: self.schema_registry.as_ref(),
            allow_write: self.allow_write,
        }
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
    /// Enable real disk writes from the wizard (Screen 4 Submit). Without this
    /// flag the wizard shows a diff preview but does not write to the dataset.
    #[arg(long)]
    allow_write: bool,
    /// Color theme. `terminal` uses terminal-native colors (default).
    /// `spectrum` uses the Adobe Spectrum palette (requires truecolor terminal).
    #[arg(long, value_enum, default_value_t = ThemeChoice::Terminal)]
    theme: ThemeChoice,
    /// Do not restore an in-progress wizard draft from the previous session.
    /// Useful for demo recording where you want a clean slate on every launch.
    #[arg(long)]
    no_resume_wizard: bool,
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
        "clipboard yank is not supported on Windows",
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
    let theme = match cli.theme {
        ThemeChoice::Terminal => Theme::terminal(),
        ThemeChoice::Spectrum => Theme::spectrum(),
    };
    let handle =
        DatasetHandle::load(cli.dataset, cli.components, cli.mode_sets, cli.allow_write, theme)?;
    let resume_wizard = !cli.no_resume_wizard;

    // Restore terminal on panic so the shell is not left in a broken state.
    let original_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = disable_raw_mode();
        let _ = execute!(stderr(), LeaveAlternateScreen, DisableMouseCapture);
        original_hook(info);
    }));

    enable_raw_mode().into_diagnostic()?;
    let mut stdout = std::io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture).into_diagnostic()?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend).into_diagnostic()?;

    let result = run(&mut terminal, &handle, resume_wizard);

    // Best-effort cleanup — continue even if individual steps fail.
    let _ = disable_raw_mode();
    let _ = execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture);
    let _ = terminal.show_cursor();

    result
}

/// Rebuild hit regions after a draw, mirroring the layout computed inside `view::draw`.
///
/// SYNC WITH view::draw layout: the constraint array below must stay identical to the
/// one in `view::draw`. If a chunk is added or reordered there, update this function to
/// match or click targets will silently drift.
fn compute_hit_regions(app: &App, status_height: u16, frame_area: Rect) -> Vec<HitRegion> {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),             // primer header  ← SYNC WITH view::draw
            Constraint::Min(0),                // active view    ← SYNC WITH view::draw
            Constraint::Length(status_height), // status message ← SYNC WITH view::draw
            Constraint::Length(1),             // palette prompt ← SYNC WITH view::draw
        ])
        .split(frame_area);

    let view_area = chunks[1];
    // Tables have a top border (1) + header row (1) before data rows start.
    let data_y = view_area.y + 2;
    let data_height = view_area.height.saturating_sub(2);

    let mut regions = Vec::new();
    match &app.active_view {
        ActiveView::Query(qv) => {
            for (i, row) in qv.rows.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                regions.push(HitRegion {
                    rect: Rect { x: view_area.x, y, width: view_area.width, height: 1 },
                    action: HitAction::SelectListRow(i),
                    text: format!("{}\t{}\t{}\t{}", row.name, row.value, row.file, row.layer),
                });
            }
        }
        ActiveView::Resolve(rv) => {
            for (i, row) in rv.rows.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                regions.push(HitRegion {
                    rect: Rect { x: view_area.x, y, width: view_area.width, height: 1 },
                    action: HitAction::SelectListRow(i),
                    text: format!("{}\t{}\t{}\t{}", row.name, row.value, row.file, row.layer),
                });
            }
        }
        ActiveView::Validate(vv) => {
            for (i, row) in vv.rows.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                regions.push(HitRegion {
                    rect: Rect { x: view_area.x, y, width: view_area.width, height: 1 },
                    action: HitAction::SelectListRow(i),
                    text: format!(
                        "{}\t{}\t{}\t{}",
                        row.severity, row.rule_id, row.token, row.message
                    ),
                });
            }
        }
        ActiveView::Empty | ActiveView::Describe(_) => {}
    }
    regions
}

fn run<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    handle: &DatasetHandle,
    resume_wizard: bool,
) -> Result<()> {
    let mut app = App::new_with_options(resume_wizard);

    loop {
        let mut frame_area = Rect::default();
        let status_height = u16::from(app.status_message.is_some());

        terminal.draw(|f| {
            frame_area = f.area();
            design_data_tui::draw(&mut app, f, &handle.theme, &handle.primer_line());
        }).into_diagnostic()?;

        // Rebuild hit regions from the frame geometry computed during draw.
        app.hit_regions = compute_hit_regions(&app, status_height, frame_area);

        // Copy to clipboard outside the draw closure (needs mutable app).
        if let Some(text) = app.take_pending_yank() {
            if let Err(e) = write_clipboard(&text) {
                app.status_message =
                    Some(StatusMessage::error(format!("clipboard unavailable: {e}")));
            }
        }

        if event::poll(std::time::Duration::from_millis(16)).into_diagnostic()? {
            match event::read().into_diagnostic()? {
                Event::Key(key) if key.kind == KeyEventKind::Press => {
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
                Event::Key(_) => {}
                Event::Mouse(me) => {
                    // handle_mouse sets pending_yank; it is drained above next frame.
                    app.handle_mouse(me);
                }
                _ => {}
            }
        }

        if app.quit {
            break;
        }
    }

    Ok(())
}
