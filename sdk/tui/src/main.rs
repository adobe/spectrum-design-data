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

use std::io::stderr;
use std::path::PathBuf;

use clap::{Parser, ValueEnum};
use crossterm::{
    event::{DisableMouseCapture, EnableMouseCapture},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use design_data_core::graph::TokenGraph;
use design_data_core::schema::SchemaRegistry;
use miette::{IntoDiagnostic, Result, WrapErr};
use ratatui::{Terminal, backend::CrosstermBackend};

use design_data_tui::theme::Theme;
use design_data_tui::{Model, UpdateCtx};

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

fn run<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    handle: &DatasetHandle,
    resume_wizard: bool,
) -> Result<()> {
    let model = Model::new_with_options(resume_wizard);
    let ctx = handle.update_ctx();
    design_data_tui::run(terminal, model, &ctx, &handle.theme, &handle.primer_line())
}
