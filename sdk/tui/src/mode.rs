// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Sum-type application mode, replacing the old `palette_open`, `modal`, and
//! `selection_mode` booleans/Options (GH #1024).
//!
//! Having `Browsing | InModal | InPalette` as a single enum makes impossible
//! combinations — palette open while a modal is active, selection start without
//! end — compile-time errors rather than runtime surprises.

use tui_input::Input;

use crate::app::{Modal, PaletteMode};

// ── Top-level mode ────────────────────────────────────────────────────────────

/// The primary interaction mode. Only one can be active at a time.
pub enum Mode {
    /// Normal browsing — no palette or modal overlay.
    Browsing(BrowsingState),
    /// A modal dialog has keyboard focus.
    InModal(ModalState),
    /// The command palette has keyboard focus.
    InPalette(PaletteState),
}

// ── Browsing state ────────────────────────────────────────────────────────────

/// State carried while in normal `Browsing` mode.
#[derive(Debug, Default)]
pub struct BrowsingState {
    /// Mouse selection state.
    pub mouse: MouseMode,
}

/// Mouse interaction state.
#[derive(Debug, Default)]
pub enum MouseMode {
    /// Normal — no selection mode active.
    #[default]
    Normal,
    /// Selection mode enabled (`v` key was pressed) but no drag has started yet.
    SelectionEnabled,
    /// A drag-selection is in progress (mouse Down → Drag).
    Selecting { start: (u16, u16), end: (u16, u16) },
}

// ── Modal state ───────────────────────────────────────────────────────────────

/// State carried while a modal overlay is open.
pub struct ModalState {
    pub modal: Modal,
}

// ── Palette state ─────────────────────────────────────────────────────────────

/// State carried while the command palette is open.
#[derive(Debug)]
pub struct PaletteState {
    pub mode: PaletteMode,
    pub input: Input,
    /// Index into `Model::palette_history`; `None` = fresh input.
    pub history_cursor: Option<usize>,
}

impl PaletteState {
    /// Open the palette in command (`:`) mode.
    pub fn command() -> Self {
        Self {
            mode: PaletteMode::Command,
            input: Input::default(),
            history_cursor: None,
        }
    }

    /// Open the palette in fuzzy-find (`/`) mode.
    pub fn fuzzy() -> Self {
        Self {
            mode: PaletteMode::FuzzyFind,
            input: Input::default(),
            history_cursor: None,
        }
    }

    /// The prompt prefix character for this palette mode.
    pub fn prefix(&self) -> &'static str {
        match self.mode {
            PaletteMode::Command => ":",
            PaletteMode::FuzzyFind => "/",
        }
    }
}
