// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `Model` — the TEA-style application state type (GH #1019, refined in #1024).
//!
//! The `mode` field replaces the old flat booleans (`palette_open`, `modal`,
//! `selection_mode`, `sel_start`, `sel_end`) with a sum type so impossible
//! combinations become compile-time errors.

use crate::app::{ActiveView, HitRegion, Modal, StatusMessage};
use crate::mode::{BrowsingState, ModalState, Mode, MouseMode, PaletteState};

/// Top-level application state for the TEA runtime.
pub struct Model {
    /// Primary interaction mode — browsing, modal, or palette.
    pub mode: Mode,
    /// Set to `true` when the application should exit.
    pub quit: bool,
    /// The currently active data view.
    pub active_view: ActiveView,
    /// One-line status message; `None` when hidden.
    pub status_message: Option<StatusMessage>,
    /// Text queued for clipboard write via `Task::Cmd`.
    pub pending_yank: Option<String>,
    /// Previously submitted palette commands, newest first.
    pub palette_history: Vec<String>,
    /// Mouse hit regions rebuilt each frame.
    pub hit_regions: Vec<HitRegion>,
}

impl Model {
    /// Create the model for a real session, loading palette history from disk and
    /// optionally restoring an in-progress wizard draft.
    pub fn new_with_options(resume_wizard: bool) -> Self {
        use crate::wizard_draft::{from_draft, load_wizard_draft};
        let mode = if resume_wizard {
            load_wizard_draft()
                .map(|d| {
                    Mode::InModal(ModalState {
                        modal: Modal::Wizard(Box::new(from_draft(d))),
                    })
                })
                .unwrap_or_else(|| Mode::Browsing(BrowsingState::default()))
        } else {
            Mode::Browsing(BrowsingState::default())
        };
        Self {
            palette_history: crate::app::load_palette_history(),
            mode,
            ..Self::new()
        }
    }

    pub fn new() -> Self {
        Self {
            mode: Mode::Browsing(BrowsingState::default()),
            quit: false,
            active_view: ActiveView::Empty,
            status_message: None,
            pending_yank: None,
            palette_history: Vec::new(),
            hit_regions: Vec::new(),
        }
    }

    // ── Palette helpers ───────────────────────────────────────────────────────

    pub fn is_palette_open(&self) -> bool {
        matches!(self.mode, Mode::InPalette(_))
    }

    pub fn open_command_palette(&mut self) {
        self.mode = Mode::InPalette(PaletteState::command());
    }

    pub fn open_fuzzy_palette(&mut self) {
        self.mode = Mode::InPalette(PaletteState::fuzzy());
    }

    /// Close the palette and return to Browsing. No-op if not in palette mode.
    pub fn close_palette(&mut self) {
        if matches!(self.mode, Mode::InPalette(_)) {
            self.mode = Mode::Browsing(BrowsingState::default());
        }
    }

    /// Return the palette prompt prefix (`:` or `/`), or `""` if closed.
    pub fn palette_prefix(&self) -> &'static str {
        if let Mode::InPalette(ref ps) = self.mode {
            ps.prefix()
        } else {
            ""
        }
    }

    /// Return the current palette input text, or `""` if palette is closed.
    pub fn palette_input_value(&self) -> &str {
        if let Mode::InPalette(ref ps) = self.mode {
            ps.input.value()
        } else {
            ""
        }
    }

    // ── Modal helpers ─────────────────────────────────────────────────────────

    pub fn is_modal_open(&self) -> bool {
        matches!(self.mode, Mode::InModal(_))
    }

    /// Open a modal, entering `InModal` mode.
    pub fn open_modal(&mut self, modal: Modal) {
        self.mode = Mode::InModal(ModalState { modal });
    }

    /// Close the modal and return to Browsing. No-op if not in modal mode.
    pub fn close_modal(&mut self) {
        if matches!(self.mode, Mode::InModal(_)) {
            self.mode = Mode::Browsing(BrowsingState::default());
        }
    }

    /// Immutable reference to the active modal, if any.
    pub fn modal(&self) -> Option<&Modal> {
        if let Mode::InModal(ref ms) = self.mode {
            Some(&ms.modal)
        } else {
            None
        }
    }

    /// Mutable reference to the active modal, if any.
    pub fn modal_mut(&mut self) -> Option<&mut Modal> {
        if let Mode::InModal(ref mut ms) = self.mode {
            Some(&mut ms.modal)
        } else {
            None
        }
    }

    // ── Palette accessors ─────────────────────────────────────────────────────

    /// Return the palette history cursor position (`None` = fresh input), or
    /// `None` if the palette is closed.
    pub fn palette_history_cursor(&self) -> Option<usize> {
        if let Mode::InPalette(ref ps) = self.mode {
            ps.history_cursor
        } else {
            None
        }
    }

    /// Mutable access to the active `PaletteState`, or `None` if the palette is closed.
    pub fn palette_state_mut(&mut self) -> Option<&mut PaletteState> {
        if let Mode::InPalette(ref mut ps) = self.mode {
            Some(ps)
        } else {
            None
        }
    }

    /// Return the current `PaletteMode`, or `None` if the palette is closed.
    ///
    /// Guard with `is_palette_open()` before calling this to avoid confusing
    /// "palette closed" with "palette open in Command mode".
    pub fn palette_mode(&self) -> Option<crate::app::PaletteMode> {
        if let Mode::InPalette(ref ps) = self.mode {
            Some(ps.mode)
        } else {
            None
        }
    }

    // ── Selection helpers ─────────────────────────────────────────────────────

    /// Whether selection mode is enabled (user pressed `v`), with or without
    /// a drag in progress.
    pub fn is_selection_mode_enabled(&self) -> bool {
        matches!(
            self.mode,
            Mode::Browsing(BrowsingState {
                mouse: MouseMode::SelectionEnabled | MouseMode::Selecting { .. }
            })
        )
    }

    /// Whether a drag-selection is actively in progress (mouse is held down).
    pub fn is_selecting(&self) -> bool {
        matches!(
            self.mode,
            Mode::Browsing(BrowsingState {
                mouse: MouseMode::Selecting { .. }
            })
        )
    }

    /// Begin a drag-selection at `pos`. Transitions `SelectionEnabled → Selecting`.
    pub fn start_selection(&mut self, pos: (u16, u16)) {
        if let Mode::Browsing(ref mut bs) = self.mode {
            bs.mouse = MouseMode::Selecting {
                start: pos,
                end: pos,
            };
        }
    }

    pub fn update_selection_end(&mut self, pos: (u16, u16)) {
        if let Mode::Browsing(BrowsingState {
            mouse: MouseMode::Selecting { ref mut end, .. },
        }) = self.mode
        {
            *end = pos;
        }
    }

    /// End a drag-selection and return `(start, end)`, resetting to `Normal`.
    /// Returns `None` if no selection was active.
    pub fn end_selection(&mut self) -> Option<((u16, u16), (u16, u16))> {
        if let Mode::Browsing(ref mut bs) = self.mode {
            if let MouseMode::Selecting { start, end } = bs.mouse {
                bs.mouse = MouseMode::Normal;
                return Some((start, end));
            }
        }
        None
    }

    /// Return the selection start position, if a drag is in progress.
    pub fn selection_start(&self) -> Option<(u16, u16)> {
        if let Mode::Browsing(BrowsingState {
            mouse: MouseMode::Selecting { start, .. },
        }) = self.mode
        {
            Some(start)
        } else {
            None
        }
    }

    /// Return the selection end position, if a drag is in progress.
    pub fn selection_end(&self) -> Option<(u16, u16)> {
        if let Mode::Browsing(BrowsingState {
            mouse: MouseMode::Selecting { end, .. },
        }) = self.mode
        {
            Some(end)
        } else {
            None
        }
    }

    /// Toggle text-selection mode. `Normal ↔ SelectionEnabled`; clears any
    /// in-progress drag when turning off.
    pub fn toggle_selection_mode(&mut self) {
        if let Mode::Browsing(ref mut bs) = self.mode {
            bs.mouse = match bs.mouse {
                MouseMode::Normal => MouseMode::SelectionEnabled,
                MouseMode::SelectionEnabled | MouseMode::Selecting { .. } => MouseMode::Normal,
            };
        }
    }
}

impl Default for Model {
    fn default() -> Self {
        Self::new()
    }
}
