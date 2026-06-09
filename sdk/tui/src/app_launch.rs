// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Terminal lifecycle and launch orchestration for the interactive TUI.
//!
//! The public [`launch`] function sets up raw mode, the alternate screen, the
//! panic hook, drives the event loop via [`crate::runtime::run`] / [`crate::replay`],
//! and restores the terminal on exit.  All other items in this module are
//! implementation details moved here from the former standalone binary.

use std::collections::HashMap;
use std::io::{stderr, BufRead as _, BufReader};
use std::path::PathBuf;
use std::sync::Arc;

use clap::ValueEnum;
use crossterm::{
    event::{DisableMouseCapture, EnableMouseCapture},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use design_data_core::data_source::{self, CliPathOverrides};
use design_data_core::graph::TokenGraph;
use design_data_core::manifest;
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{backend::Backend, backend::CrosstermBackend, Terminal};

use crate::runtime::{replay as tui_replay, run as tui_run};
use crate::theme::Theme;
use crate::{Message, Model, UpdateCtx};

/// Which visual palette to use.
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
pub enum ThemeChoice {
    /// Terminal-native colors; works in any 256-color terminal.
    #[default]
    Terminal,
    /// Adobe Spectrum palette; requires a 24-bit truecolor terminal.
    Spectrum,
}

/// Options for [`launch`].
pub struct LaunchOptions {
    /// Path to the token dataset directory.
    pub dataset: PathBuf,
    /// Path to the components directory (default: spec-bundled).
    pub components: Option<PathBuf>,
    /// Path to the mode-sets directory (default: spec-bundled).
    pub mode_sets: Option<PathBuf>,
    /// Enable real disk writes from the wizard (Screen 4 Submit). Without this flag the
    /// wizard shows a diff preview but does not write to the dataset.
    pub allow_write: bool,
    /// Color theme.
    pub theme: ThemeChoice,
    /// Do not restore an in-progress wizard draft from the previous session. Useful for
    /// demo recording where you want a clean slate on every launch.
    pub no_resume_wizard: bool,
    /// Record every dispatched Message to this file as NDJSON for later replay.
    /// Mutually exclusive with `replay`.
    pub record: Option<PathBuf>,
    /// Replay a previously recorded NDJSON message stream and print the final buffer.
    /// Mutually exclusive with `record`.
    pub replay: Option<PathBuf>,
    /// Run headless (no TTY) and print the final frame as ANSI SGR to stdout.
    pub snapshot_ansi: bool,
}

/// Token dataset loaded once at startup and held for the full session.
struct DatasetHandle {
    token_count: usize,
    dataset_path: PathBuf,
    graph: TokenGraph,
    token_index: TokenIndex,
    mode_set_restrictions: HashMap<String, Vec<String>>,
    platform_manifest_active: bool,
    components_dir: Option<PathBuf>,
    mode_sets_dir: Option<PathBuf>,
    schema_registry: Option<Arc<SchemaRegistry>>,
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
        // Resolve spec paths via the central data_source resolver.
        // The dataset path is already explicit; we only need spec catalog dirs + schema.
        let cwd = std::env::current_dir().into_diagnostic()?;
        let resolved = data_source::resolve(
            &cwd,
            &CliPathOverrides {
                components: components_arg,
                mode_sets: mode_sets_arg,
                ..Default::default()
            },
        )
        .into_diagnostic()?;

        let components_dir = resolved.components.clone();
        let mode_sets_dir = resolved.mode_sets.clone();

        let (mut graph, mut token_index) = TokenGraph::open_cached_with_index_with_catalogs(
            &path,
            mode_sets_dir.as_deref(),
            components_dir.as_deref(),
        )
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;

        // Apply a configured platform manifest (Foundation→Platform cascade), matching CLI query/resolve.
        let platform_manifest_active = resolved.platform_manifest.is_some();
        let mode_set_restrictions = manifest::apply_configured(&mut graph, &resolved)
            .into_diagnostic()
            .wrap_err("failed to apply platform manifest cascade")?;
        if platform_manifest_active {
            token_index = TokenIndex::build(&graph);
        }

        // Load schema registry for `:validate`. Silently skip if schema dir is absent
        // (schema_root has a fallback default; the load itself may fail when not in-repo).
        let schema_registry = SchemaRegistry::load_legacy_token_schemas(&resolved.schemas_root)
            .ok()
            .map(Arc::new);

        Ok(Self {
            token_count: graph.tokens.len(),
            dataset_path: path,
            graph,
            token_index,
            mode_set_restrictions,
            platform_manifest_active,
            components_dir,
            mode_sets_dir,
            schema_registry,
            allow_write,
            theme,
        })
    }

    fn primer_line(&self) -> String {
        let scope = if self.platform_manifest_active {
            "platform"
        } else {
            "tokens"
        };
        format!(
            " {} {scope}  ·  {}",
            self.token_count,
            self.dataset_path.display()
        )
    }

    fn update_ctx(&self) -> UpdateCtx<'_> {
        UpdateCtx {
            graph: &self.graph,
            dataset_path: Some(&self.dataset_path),
            components_dir: self.components_dir.as_deref(),
            schema_registry: self.schema_registry.clone(),
            mode_sets_dir: self.mode_sets_dir.as_deref(),
            token_index: self.token_index.clone(),
            mode_set_restrictions: self.mode_set_restrictions.clone(),
            allow_write: self.allow_write,
        }
    }
}

/// Set up the terminal, run the TUI event loop, and restore the terminal on exit.
///
/// This is the public entrypoint for launching the interactive TUI from any binary.
/// It owns the full terminal lifecycle: raw mode, alternate screen, mouse capture,
/// panic hook installation, and cleanup.
pub fn launch(opts: LaunchOptions) -> miette::Result<()> {
    let theme = match opts.theme {
        ThemeChoice::Terminal => Theme::terminal(),
        ThemeChoice::Spectrum => Theme::spectrum(),
    };
    let record_path = opts.record;
    let replay_path = opts.replay;
    let handle = DatasetHandle::load(
        opts.dataset,
        opts.components,
        opts.mode_sets,
        opts.allow_write,
        theme,
    )?;
    let resume_wizard = !opts.no_resume_wizard;

    // Headless snapshot mode: no TTY, no alternate screen, no raw mode.
    if opts.snapshot_ansi {
        return launch_headless(&handle, resume_wizard, replay_path);
    }

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

    let result = drive_terminal(
        &mut terminal,
        &handle,
        resume_wizard,
        record_path,
        replay_path,
    );

    // Best-effort cleanup — continue even if individual steps fail.
    let _ = disable_raw_mode();
    let _ = execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    );
    let _ = terminal.show_cursor();

    result
}

/// Drive the terminal event loop (replay or interactive) with an already-constructed
/// `Terminal`.  Extracted from the former standalone binary's `run()` function and
/// renamed to avoid shadowing the re-exported [`crate::runtime::run`].
fn drive_terminal<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    handle: &DatasetHandle,
    resume_wizard: bool,
    record_path: Option<PathBuf>,
    replay_path: Option<PathBuf>,
) -> Result<()> {
    let ctx = handle.update_ctx();

    // --replay: feed recorded messages through update, print final buffer, exit.
    if let Some(ref replay_path) = replay_path {
        let file = std::fs::File::open(replay_path)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to open replay file {}", replay_path.display()))?;
        let mut skipped = 0usize;
        let mut messages: Vec<Message> = Vec::new();
        for line_result in BufReader::new(file).lines() {
            let line = line_result
                .into_diagnostic()
                .wrap_err("replay: read error")?;
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<Message>(&line) {
                Ok(m) => messages.push(m),
                Err(_) => skipped += 1,
            }
        }
        if skipped > 0 {
            eprintln!(
                "warning: skipped {skipped} undeserializable line(s) in {}",
                replay_path.display()
            );
        }
        let model = Model::new_with_options(false);
        tui_replay(
            terminal,
            model,
            &ctx,
            &handle.theme,
            &handle.primer_line(),
            messages.into_iter(),
        )?;
        // Print the final buffer as plain text.
        let buf = terminal.current_buffer_mut();
        let area = buf.area();
        for y in 0..area.height {
            let row: String = (0..area.width)
                .map(|x| {
                    buf.cell((x, y))
                        .map(|c| c.symbol().to_string())
                        .unwrap_or_default()
                })
                .collect();
            println!("{}", row.trim_end());
        }
        return Ok(());
    }

    // Normal interactive mode (with optional --record).
    let model = Model::new_with_options(resume_wizard);
    let mut record_file = record_path
        .map(std::fs::File::create)
        .transpose()
        .into_diagnostic()
        .wrap_err("failed to create record file")?;
    tui_run(
        terminal,
        model,
        &ctx,
        &handle.theme,
        &handle.primer_line(),
        record_file.as_mut().map(|f| f as &mut dyn std::io::Write),
    )
}

/// Headless snapshot: use a TestBackend, optionally replay, then emit ANSI SGR to stdout.
fn launch_headless(
    handle: &DatasetHandle,
    resume_wizard: bool,
    replay_path: Option<PathBuf>,
) -> miette::Result<()> {
    use ratatui::backend::TestBackend;

    let cols: u16 = std::env::var("COLUMNS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(80);
    let rows: u16 = std::env::var("LINES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(24);

    let backend = TestBackend::new(cols, rows);
    let mut terminal = Terminal::new(backend).into_diagnostic()?;
    let ctx = handle.update_ctx();

    if let Some(ref path) = replay_path {
        let file = std::fs::File::open(path)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to open replay file {}", path.display()))?;
        let mut messages: Vec<Message> = Vec::new();
        let mut skipped = 0usize;
        for line_result in BufReader::new(file).lines() {
            let line = line_result.into_diagnostic().wrap_err("replay: read error")?;
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<Message>(&line) {
                Ok(m) => messages.push(m),
                Err(_) => skipped += 1,
            }
        }
        if skipped > 0 {
            eprintln!("warning: skipped {skipped} undeserializable replay line(s)");
        }
        let model = Model::new_with_options(false);
        tui_replay(
            &mut terminal,
            model,
            &ctx,
            &handle.theme,
            &handle.primer_line(),
            messages.into_iter(),
        )?;
    } else {
        let mut model = Model::new_with_options(resume_wizard);
        terminal
            .draw(|f| crate::draw(&mut model, f, &handle.theme, &handle.primer_line()))
            .into_diagnostic()?;
    }

    // Emit the final frame as ANSI SGR to stdout.
    let ansi = buffer_to_ansi(terminal.backend().buffer());
    print!("{ansi}");

    // Append a CUP escape (1-based row;col) so tuiwright's ANSI decoder can
    // capture cursor position.  Until views call set_cursor_position() this
    // will report (0, 0), which is documented and expected; it will become
    // meaningful once the palette/find caret wires up a real cursor.
    let cursor_pos = terminal
        .backend_mut()
        .get_cursor_position()
        .ok()
        .map(|p| (p.y, p.x)) // ratatui Position uses x=col, y=row
        .unwrap_or((0, 0));
    print!("\x1b[{};{}H", cursor_pos.0 + 1, cursor_pos.1 + 1);

    Ok(())
}

fn fg_code(c: ratatui::style::Color) -> Option<String> {
    use ratatui::style::Color;
    match c {
        Color::Reset => None,
        Color::Black => Some("30".into()),
        Color::Red => Some("31".into()),
        Color::Green => Some("32".into()),
        Color::Yellow => Some("33".into()),
        Color::Blue => Some("34".into()),
        Color::Magenta => Some("35".into()),
        Color::Cyan => Some("36".into()),
        Color::Gray => Some("37".into()),
        Color::DarkGray => Some("90".into()),
        Color::LightRed => Some("91".into()),
        Color::LightGreen => Some("92".into()),
        Color::LightYellow => Some("93".into()),
        Color::LightBlue => Some("94".into()),
        Color::LightMagenta => Some("95".into()),
        Color::LightCyan => Some("96".into()),
        Color::White => Some("97".into()),
        Color::Indexed(n) => Some(format!("38;5;{n}")),
        Color::Rgb(r, g, b) => Some(format!("38;2;{r};{g};{b}")),
    }
}

fn bg_code(c: ratatui::style::Color) -> Option<String> {
    use ratatui::style::Color;
    match c {
        Color::Reset => None,
        Color::Black => Some("40".into()),
        Color::Red => Some("41".into()),
        Color::Green => Some("42".into()),
        Color::Yellow => Some("43".into()),
        Color::Blue => Some("44".into()),
        Color::Magenta => Some("45".into()),
        Color::Cyan => Some("46".into()),
        Color::Gray => Some("47".into()),
        Color::DarkGray => Some("100".into()),
        Color::LightRed => Some("101".into()),
        Color::LightGreen => Some("102".into()),
        Color::LightYellow => Some("103".into()),
        Color::LightBlue => Some("104".into()),
        Color::LightMagenta => Some("105".into()),
        Color::LightCyan => Some("106".into()),
        Color::White => Some("107".into()),
        Color::Indexed(n) => Some(format!("48;5;{n}")),
        Color::Rgb(r, g, b) => Some(format!("48;2;{r};{g};{b}")),
    }
}

fn cell_sgr(cell: &ratatui::buffer::Cell) -> String {
    use ratatui::style::Modifier;
    let mut codes = vec!["0".to_string()];
    let m = cell.modifier;
    if m.contains(Modifier::BOLD) {
        codes.push("1".into());
    }
    if m.contains(Modifier::DIM) {
        codes.push("2".into());
    }
    if m.contains(Modifier::ITALIC) {
        codes.push("3".into());
    }
    if m.contains(Modifier::UNDERLINED) {
        codes.push("4".into());
    }
    if let Some(code) = fg_code(cell.fg) {
        codes.push(code);
    }
    if let Some(code) = bg_code(cell.bg) {
        codes.push(code);
    }
    format!("\x1b[{}m", codes.join(";"))
}

fn buffer_to_ansi(buf: &ratatui::buffer::Buffer) -> String {
    let area = buf.area();
    let mut out = String::new();
    for y in area.top()..area.bottom() {
        out.push_str("\x1b[0m");
        let mut prev_codes: Option<String> = None;
        for x in area.left()..area.right() {
            let cell = buf.cell((x, y)).expect("cell within bounds");
            let codes = cell_sgr(cell);
            if prev_codes.as_deref() != Some(&codes) {
                out.push_str(&codes);
                prev_codes = Some(codes);
            }
            out.push_str(cell.symbol());
        }
        out.push_str("\x1b[0m\n");
    }
    out
}
