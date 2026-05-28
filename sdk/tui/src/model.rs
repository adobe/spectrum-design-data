// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `Model` — the TEA-style application state type (GH #1019).
//!
//! `Model` mirrors `App` field-for-field and will replace it once the `update`
//! function (GH #1020) and runtime adapter (GH #1021) land. It is additive for
//! now — `App` is still the live state type used by `main.rs` and `view.rs`.

use tui_input::Input;

use crate::app::{ActiveView, HitRegion, Modal, PaletteMode, StatusMessage};

/// Top-level application state for the TEA runtime.
///
/// Field names and semantics mirror `App` exactly. See `app.rs` for field-level
/// documentation until `App` is retired.
// TODO(#1020): remove the cross-reference to app.rs once App is retired.
pub struct Model {
    pub palette_open: bool,
    pub palette_mode: PaletteMode,
    pub palette_input: Input,
    pub quit: bool,
    pub active_view: ActiveView,
    pub status_message: Option<StatusMessage>,
    pub pending_yank: Option<String>,
    pub modal: Option<Modal>,
    pub palette_history: Vec<String>,
    pub palette_history_cursor: Option<usize>,
    pub hit_regions: Vec<HitRegion>,
    pub selection_mode: bool,
    pub sel_start: Option<(u16, u16)>,
    pub sel_end: Option<(u16, u16)>,
}

impl Model {
    pub fn new() -> Self {
        Self {
            palette_open: false,
            palette_mode: PaletteMode::Command,
            palette_input: Input::default(),
            quit: false,
            active_view: ActiveView::Empty,
            status_message: None,
            pending_yank: None,
            modal: None,
            palette_history: Vec::new(),
            palette_history_cursor: None,
            hit_regions: Vec::new(),
            selection_mode: false,
            sel_start: None,
            sel_end: None,
        }
    }

    /// Return the palette prompt prefix for the current mode.
    pub fn palette_prefix(&self) -> &'static str {
        match self.palette_mode {
            PaletteMode::Command => ":",
            PaletteMode::FuzzyFind => "/",
        }
    }
}

impl Default for Model {
    fn default() -> Self {
        Self::new()
    }
}
