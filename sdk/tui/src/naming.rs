// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Standalone naming wizard — RFC #973 Q2 Track A.
//!
//! Three screens: Intent → Classification → Result.
//! Output is an assembled token name string; no token is written to disk.
//! Entry point: `:name [<intent>]` in the TUI palette.

use crossterm::event::{KeyCode, KeyEvent};
use design_data_core::graph::TokenGraph;
use design_data_core::suggest::{self, SuggestionResult};
use tui_input::backend::crossterm::EventHandler;
use tui_input::Input;

use crate::wizard_common::classification::{
    assemble_name_from_classification, cycle_layer_backward, cycle_layer_forward,
    ClassificationDraft, NameField,
};
use design_data_core::authoring::session::alias_threshold;

/// The three screens of the naming wizard.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NamingScreen {
    Intent,
    Classification,
    Result,
}

impl NamingScreen {
    pub const SCREEN_COUNT: u8 = 3;

    pub fn number(self) -> u8 {
        match self {
            NamingScreen::Intent => 1,
            NamingScreen::Classification => 2,
            NamingScreen::Result => 3,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            NamingScreen::Intent => "Intent",
            NamingScreen::Classification => "Classification",
            NamingScreen::Result => "Result",
        }
    }
}

/// Outcome of a single key event inside the naming wizard.
pub enum NamingEvent {
    /// Normal; no state change visible to App.
    Continue,
    /// User pressed Esc/q — App should close the modal.
    Cancel,
    /// User copied the name — App should yank to clipboard.
    Copy(String),
}

/// All state for the three-screen naming wizard.
pub struct NamingWizardState {
    pub screen: NamingScreen,
    pub intent: Input,
    pub suggestions: Vec<SuggestionResult>,
    pub selected_suggestion: usize,
    pub can_alias: bool,
    pub classification: ClassificationDraft,
}

impl NamingWizardState {
    pub fn new() -> Self {
        Self {
            screen: NamingScreen::Intent,
            intent: Input::default(),
            suggestions: Vec::new(),
            selected_suggestion: 0,
            can_alias: false,
            classification: ClassificationDraft::new(),
        }
    }

    pub fn new_with_intent(intent: &str) -> Self {
        let mut s = Self::new();
        if !intent.is_empty() {
            s.intent = Input::from(intent.to_string());
        }
        s
    }

    /// Recompute `suggestions` and `can_alias` from the current intent string.
    pub fn refresh_suggestions(&mut self, graph: &TokenGraph) {
        let intent = self.intent.value().to_string();
        self.suggestions = suggest::suggest(graph, &intent, None, 5);
        self.can_alias = self
            .suggestions
            .first()
            .map(|s| s.confidence >= alias_threshold())
            .unwrap_or(false);
        if !self.suggestions.is_empty() && self.selected_suggestion >= self.suggestions.len() {
            self.selected_suggestion = self.suggestions.len() - 1;
        }
    }

    /// The assembled name from current classification fields.
    pub fn assembled_name(&self) -> String {
        assemble_name_from_classification(&self.classification)
    }

    // ── Dispatch ─────────────────────────────────────────────────────────────

    pub fn handle_key(&mut self, key: KeyEvent, graph: &TokenGraph) -> NamingEvent {
        if key.code == KeyCode::Esc {
            return NamingEvent::Cancel;
        }
        // Capture intent value before dispatch so we can skip suggest refresh when text
        // didn't change (e.g. Up/Down arrow navigation).
        let intent_before = self.intent.value().to_string();
        let event = match self.screen {
            NamingScreen::Intent => self.handle_intent_key(key, graph),
            NamingScreen::Classification => self.handle_classification_key(key),
            NamingScreen::Result => self.handle_result_key(key),
        };
        if self.screen == NamingScreen::Intent && self.intent.value() != intent_before {
            self.refresh_suggestions(graph);
        }
        event
    }

    // ── Screen 1: Intent ─────────────────────────────────────────────────────

    fn handle_intent_key(&mut self, key: KeyEvent, graph: &TokenGraph) -> NamingEvent {
        match key.code {
            KeyCode::Enter => {
                self.advance_to_classification(graph);
                NamingEvent::Continue
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if self.selected_suggestion > 0 {
                    self.selected_suggestion -= 1;
                }
                NamingEvent::Continue
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if !self.suggestions.is_empty()
                    && self.selected_suggestion < self.suggestions.len() - 1
                {
                    self.selected_suggestion += 1;
                }
                NamingEvent::Continue
            }
            _ => {
                self.intent.handle_event(&crossterm::event::Event::Key(key));
                NamingEvent::Continue
            }
        }
    }

    // _graph is reserved for future classification seeding (e.g. mode-set discovery).
    fn advance_to_classification(&mut self, _graph: &TokenGraph) {
        let intent = self.intent.value().to_string();
        if !intent.is_empty() && self.classification.property.value().is_empty() {
            if let Some(top) = self.suggestions.first() {
                if let Some(prop) = top
                    .name_object
                    .as_ref()
                    .and_then(|n| n.get("property"))
                    .and_then(|v| v.as_str())
                {
                    self.classification.property = Input::from(prop.to_string());
                }
            }
        }
        self.screen = NamingScreen::Classification;
    }

    // ── Screen 2: Classification ─────────────────────────────────────────────

    fn handle_classification_key(&mut self, key: KeyEvent) -> NamingEvent {
        match key.code {
            KeyCode::Enter => {
                self.screen = NamingScreen::Result;
                NamingEvent::Continue
            }
            // b goes back to Intent only when the layer selector is focused;
            // when a text field is focused, b is regular text input.
            KeyCode::Char('b') if self.classification.focused_field == 0 => {
                self.screen = NamingScreen::Intent;
                NamingEvent::Continue
            }
            KeyCode::Tab => {
                let count = self.classification.field_count();
                self.classification.focused_field = (self.classification.focused_field + 1) % count;
                NamingEvent::Continue
            }
            KeyCode::BackTab => {
                let count = self.classification.field_count();
                let f = self.classification.focused_field;
                self.classification.focused_field = if f == 0 { count - 1 } else { f - 1 };
                NamingEvent::Continue
            }
            KeyCode::Left | KeyCode::Char('h') if self.classification.focused_field == 0 => {
                self.classification.layer = cycle_layer_backward(self.classification.layer);
                NamingEvent::Continue
            }
            KeyCode::Right | KeyCode::Char('l') if self.classification.focused_field == 0 => {
                self.classification.layer = cycle_layer_forward(self.classification.layer);
                NamingEvent::Continue
            }
            KeyCode::Char('+') => {
                self.classification.name_fields.push(NameField {
                    key: "key".to_string(),
                    value: Input::default(),
                });
                NamingEvent::Continue
            }
            _ => {
                let focused = self.classification.focused_field;
                if focused == 1 {
                    self.classification
                        .property
                        .handle_event(&crossterm::event::Event::Key(key));
                } else if focused >= 2 {
                    let idx = focused - 2;
                    if let Some(field) = self.classification.name_fields.get_mut(idx) {
                        field.value.handle_event(&crossterm::event::Event::Key(key));
                    }
                }
                NamingEvent::Continue
            }
        }
    }

    // ── Screen 3: Result ─────────────────────────────────────────────────────

    fn handle_result_key(&mut self, key: KeyEvent) -> NamingEvent {
        match key.code {
            KeyCode::Char('c') | KeyCode::Char('y') => {
                let name = self.assembled_name();
                NamingEvent::Copy(name)
            }
            KeyCode::Char('e') => {
                self.screen = NamingScreen::Classification;
                NamingEvent::Continue
            }
            KeyCode::Char('q') => NamingEvent::Cancel,
            _ => NamingEvent::Continue,
        }
    }
}

impl Default for NamingWizardState {
    fn default() -> Self {
        Self::new()
    }
}
