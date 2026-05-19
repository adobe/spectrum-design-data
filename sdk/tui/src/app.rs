// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use tui_input::backend::crossterm::EventHandler;
use tui_input::Input;

/// Which prefix the palette was opened with.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteMode {
    /// `:` — explicit command mode.
    Command,
    /// `/` — fuzzy-find mode.
    FuzzyFind,
}

/// Top-level application state.
pub struct App {
    /// Whether the palette is currently open.
    pub palette_open: bool,
    /// The mode the palette was opened in.
    pub palette_mode: PaletteMode,
    /// The text buffer for the palette prompt.
    pub palette_input: Input,
    /// Set to true when the application should exit.
    pub quit: bool,
}

impl App {
    pub fn new() -> Self {
        Self {
            palette_open: false,
            palette_mode: PaletteMode::Command,
            palette_input: Input::default(),
            quit: false,
        }
    }

    /// Process a key event and update state accordingly.
    pub fn handle_key(&mut self, key: KeyEvent) {
        // Ctrl-C always exits.
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
            self.quit = true;
            return;
        }

        if self.palette_open {
            match key.code {
                KeyCode::Esc => {
                    self.palette_open = false;
                    self.palette_input = Input::default();
                }
                // All other keys are forwarded to the input buffer.
                _ => {
                    self.palette_input.handle_event(&crossterm::event::Event::Key(key));
                }
            }
        } else {
            match key.code {
                KeyCode::Char(':') => {
                    self.palette_open = true;
                    self.palette_mode = PaletteMode::Command;
                    self.palette_input = Input::default();
                }
                KeyCode::Char('/') => {
                    self.palette_open = true;
                    self.palette_mode = PaletteMode::FuzzyFind;
                    self.palette_input = Input::default();
                }
                KeyCode::Char('q') => {
                    self.quit = true;
                }
                _ => {}
            }
        }
    }

    /// The prompt prefix to display when the palette is open.
    pub fn palette_prefix(&self) -> &'static str {
        match self.palette_mode {
            PaletteMode::Command => ":",
            PaletteMode::FuzzyFind => "/",
        }
    }
}

impl Default for App {
    fn default() -> Self {
        Self::new()
    }
}
