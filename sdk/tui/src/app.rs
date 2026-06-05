// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared view/state types and palette/command helper functions.
//!
//! The legacy `App` state machine was retired once the TEA runtime (`Model` +
//! `update`) became the single source of truth (GH #1014). This module now only
//! re-exports the view types from [`crate::app_views`] and hosts the free helper
//! functions still used by `update`, `update_command`, and the runtime
//! (history persistence, table-selection math, hit-testing, resolve parsing).

use std::path::PathBuf;

use design_data_core::cascade::{apply_restrictions, parse_resolve_context, ResolutionContext};
use ratatui::layout::Rect;
use ratatui::widgets::TableState;

pub use crate::app_views::*;

// ── History persistence ───────────────────────────────────────────────────────

/// Resolve the path for the persistent palette history file.
///
/// Reads `DESIGN_DATA_TUI_HISTORY` env var first (used in tests), then falls
/// back to `dirs::data_dir()/design-data-tui/history`.
pub fn history_path() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DESIGN_DATA_TUI_HISTORY") {
        return Some(PathBuf::from(p));
    }
    // "design-data-tui" is the stable app-data name, intentionally kept even
    // though the binary is now `design-data`, to avoid orphaning history on
    // existing installs when the binary was renamed.
    dirs::data_dir().map(|d| d.join("design-data-tui").join("history"))
}

pub(crate) fn load_palette_history() -> Vec<String> {
    let Some(path) = history_path() else {
        return Vec::new();
    };
    std::fs::read_to_string(&path)
        .map(|s| {
            s.lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect()
        })
        .unwrap_or_default()
}

pub(crate) fn save_palette_history(history: &[String]) {
    let Some(path) = history_path() else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let content = history.join("\n");
    let tmp = path.with_extension("tmp");
    if std::fs::write(&tmp, &content).is_ok() {
        let _ = std::fs::rename(&tmp, &path);
    }
}

// ── Internal helpers ──────────────────────────────────────────────────────────
// `layer_str` lives in app_views.rs (re-exported here via `pub use crate::app_views::*`).
// `apply_scroll_delta` lives in app_views.rs (used by Modal::on_scroll).

/// Advance a `TableState` selection by `delta` rows, clamping at the bounds.
pub fn move_table_selection(state: &mut TableState, len: usize, delta: i64) {
    if len == 0 {
        return;
    }
    let current = state.selected().unwrap_or(0) as i64;
    let next = (current + delta).clamp(0, len as i64 - 1) as usize;
    state.select(Some(next));
}

/// Test whether `(row, col)` is inside `rect`.
pub(crate) fn rect_contains(rect: Rect, row: u16, col: u16) -> bool {
    col >= rect.x && col < rect.x + rect.width && row >= rect.y && row < rect.y + rect.height
}

/// Parse a `property=<name>,<modeSet>=<mode>,...` expression.
///
/// Delegates to [`design_data_core::cascade::parse_resolve_context`].
pub(crate) fn parse_resolve_args(rest: &str) -> Result<(String, ResolutionContext), String> {
    parse_resolve_context(rest)
}

/// Layer platform manifest mode-set restrictions onto a parsed resolve context.
///
/// Delegates to [`design_data_core::cascade::apply_restrictions`].
pub(crate) fn resolve_context_with_restrictions(
    ctx: ResolutionContext,
    restrictions: &std::collections::HashMap<String, Vec<String>>,
) -> ResolutionContext {
    apply_restrictions(ctx, restrictions)
}
