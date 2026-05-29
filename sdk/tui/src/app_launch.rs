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

use std::io::{BufRead as _, BufReader, stderr};
use std::path::PathBuf;

use clap::ValueEnum;
use crossterm::{
    event::{DisableMouseCapture, EnableMouseCapture},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use design_data_core::graph::TokenGraph;
use design_data_core::schema::SchemaRegistry;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{Terminal, backend::CrosstermBackend};

use crate::theme::Theme;
use crate::{Message, Model, UpdateCtx};
use crate::runtime::{run as tui_run, replay as tui_replay};

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

    fn update_ctx(&self) -> UpdateCtx<'_> {
        UpdateCtx {
            graph: &self.graph,
            dataset_path: Some(&self.dataset_path),
            components_dir: self.components_dir.as_deref(),
            schema_registry: self.schema_registry.as_ref(),
            mode_sets_dir: self.mode_sets_dir.as_deref(),
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

    let result = drive_terminal(&mut terminal, &handle, resume_wizard, record_path, replay_path);

    // Best-effort cleanup — continue even if individual steps fail.
    let _ = disable_raw_mode();
    let _ = execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture);
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
            let line = line_result.into_diagnostic().wrap_err("replay: read error")?;
            if line.trim().is_empty() { continue; }
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
            terminal, model, &ctx, &handle.theme, &handle.primer_line(),
            messages.into_iter(),
        )?;
        // Print the final buffer as plain text.
        let buf = terminal.current_buffer_mut();
        let area = buf.area();
        for y in 0..area.height {
            let row: String = (0..area.width)
                .map(|x| buf.cell((x, y)).map(|c| c.symbol().to_string()).unwrap_or_default())
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
        terminal, model, &ctx, &handle.theme, &handle.primer_line(),
        record_file.as_mut().map(|f| f as &mut dyn std::io::Write),
    )
}
