// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Standalone find/query wizard — RFC #973 Q2 Track B.
//!
//! Two screens: Filters → Preview.
//! On accept, emits `FindEvent::OpenResults(QueryView)`; the modal closes and
//! `ActiveView::Query` takes over without a third wizard screen.
//! Entry point: `:find [<intent>]` in the TUI palette.

use crossterm::event::{KeyCode, KeyEvent};
use design_data_core::graph::{Layer, TokenGraph};
use design_data_core::registry::RegistryData;
use design_data_core::{query, suggest};
use tui_input::backend::crossterm::EventHandler;
use tui_input::Input;

use crate::app::{QueryRow, QueryView};
pub use crate::wizard_common::caps::{MAX_PROPERTY_SUGGESTIONS, MAX_SUGGEST_RESULTS};

/// The two wizard screens.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FindScreen {
    Filters,
    Preview,
}

impl FindScreen {
    pub const SCREEN_COUNT: u8 = 2;

    pub fn number(self) -> u8 {
        match self {
            FindScreen::Filters => 1,
            FindScreen::Preview => 2,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            FindScreen::Filters => "Filters",
            FindScreen::Preview => "Preview",
        }
    }
}

/// Outcome of a single key event inside the find wizard.
pub enum FindEvent {
    /// Normal; no state change visible to App.
    Continue,
    /// User pressed Esc — App should close the modal.
    Cancel,
    /// User accepted the preview — App should open this view and close the modal.
    OpenResults(QueryView),
}

/// All state for the two-screen find wizard.
pub struct FindWizardState {
    pub screen: FindScreen,
    /// Structured filter inputs (focused_field indices 0–3).
    pub property: Input,
    pub component: Input,
    pub variant: Input,
    pub state: Input,
    /// Fallback free-text intent (focused_field index 4).
    /// Used when no structured filter is filled; drives suggest::suggest.
    pub intent: Input,
    /// Which field has keyboard focus (0=property, 1=component, 2=variant, 3=state, 4=intent).
    pub focused_field: usize,
    /// Registry-sourced autocomplete suggestions for the property field.
    pub property_suggestions: Vec<String>,
    pub selected_property_suggestion: usize,
    /// All rows from the most recent preview refresh.
    pub preview_rows: Vec<QueryRow>,
    /// Total match count (== `preview_rows.len()`).
    pub preview_count: usize,
    /// Parse or query error from the most recent refresh, if any.
    pub preview_error: Option<String>,
}

impl FindWizardState {
    pub const FIELD_COUNT: usize = 5;

    pub fn new() -> Self {
        Self {
            screen: FindScreen::Filters,
            property: Input::default(),
            component: Input::default(),
            variant: Input::default(),
            state: Input::default(),
            intent: Input::default(),
            focused_field: 0,
            property_suggestions: Vec::new(),
            selected_property_suggestion: 0,
            preview_rows: Vec::new(),
            preview_count: 0,
            preview_error: None,
        }
    }

    /// Create a state pre-seeded with an intent string.
    ///
    /// Seeds the intent field and sets focus there so the user can refine or
    /// immediately press Enter to see suggest-ranked results.
    pub fn new_with_intent(intent: &str) -> Self {
        let mut s = Self::new();
        if !intent.is_empty() {
            s.intent = Input::from(intent.to_string());
            s.focused_field = 4;
        }
        s
    }

    /// Build a query DSL expression from the structured filter fields.
    ///
    /// Returns `None` when no structured filter is set, signalling the
    /// intent-fallback path in `refresh_preview`.
    pub fn assemble_expr(&self) -> Option<String> {
        let mut parts = Vec::new();
        let prop = self.property.value().trim().to_string();
        let comp = self.component.value().trim().to_string();
        let var = self.variant.value().trim().to_string();
        let st = self.state.value().trim().to_string();

        if !prop.is_empty() {
            parts.push(format!("property={prop}"));
        }
        if !comp.is_empty() {
            parts.push(format!("component={comp}"));
        }
        if !var.is_empty() {
            parts.push(format!("variant={var}"));
        }
        if !st.is_empty() {
            parts.push(format!("state={st}"));
        }

        if parts.is_empty() {
            None
        } else {
            Some(parts.join(","))
        }
    }

    /// Refresh `preview_rows`, `preview_count`, and `preview_error`.
    ///
    /// Uses structured-filter path when any filter field is non-empty;
    /// falls back to `suggest::suggest` when only `intent` is filled.
    pub fn refresh_preview(&mut self, graph: &TokenGraph, index: &query::TokenIndex) {
        if let Some(expr_str) = self.assemble_expr() {
            match query::parse(&expr_str) {
                Ok(filter) => {
                    let records = query::filter_with_index(graph, index, &filter);
                    self.preview_count = records.len();
                    self.preview_rows = records.iter().map(|r| QueryRow::from_record(r)).collect();
                    self.preview_error = None;
                }
                Err(e) => {
                    self.preview_count = 0;
                    self.preview_rows.clear();
                    self.preview_error = Some(e.to_string());
                }
            }
        } else if !self.intent.value().trim().is_empty() {
            // assemble_expr() returned None, so all structured fields (including property) are
            // empty. Pass no property hint.
            let intent = self.intent.value().trim().to_string();
            let results = suggest::suggest(graph, &intent, None, MAX_SUGGEST_RESULTS);
            self.preview_count = results.len();
            self.preview_rows = results.iter().map(suggestion_to_row).collect();
            self.preview_error = None;
        } else {
            self.preview_count = 0;
            self.preview_rows.clear();
            self.preview_error = None;
        }
        debug_assert_eq!(
            self.preview_count,
            self.preview_rows.len(),
            "preview_count must stay in sync with preview_rows.len()"
        );
    }

    /// Recompute property autocomplete suggestions from the registry.
    pub fn refresh_property_suggestions(&mut self) {
        let typed = self.property.value().trim().to_lowercase();
        if typed.is_empty() {
            self.property_suggestions.clear();
            self.selected_property_suggestion = 0;
            return;
        }
        if let Some(terms) = RegistryData::embedded().for_field("property") {
            let mut matching: Vec<String> = terms
                .iter()
                .filter(|t| t.to_lowercase().contains(&typed))
                .cloned()
                .collect();
            matching.sort();
            matching.truncate(MAX_PROPERTY_SUGGESTIONS);
            self.property_suggestions = matching;
        } else {
            self.property_suggestions.clear();
        }
        if self.selected_property_suggestion >= self.property_suggestions.len() {
            self.selected_property_suggestion = 0;
        }
    }

    // ── Dispatch ─────────────────────────────────────────────────────────────

    pub fn handle_key(
        &mut self,
        key: KeyEvent,
        graph: &TokenGraph,
        index: &query::TokenIndex,
    ) -> FindEvent {
        if key.code == KeyCode::Esc {
            return FindEvent::Cancel;
        }
        match self.screen {
            FindScreen::Filters => self.handle_filters_key(key, graph, index),
            FindScreen::Preview => self.handle_preview_key(key),
        }
    }

    // ── Screen 1: Filters ────────────────────────────────────────────────────

    fn handle_filters_key(
        &mut self,
        key: KeyEvent,
        graph: &TokenGraph,
        index: &query::TokenIndex,
    ) -> FindEvent {
        match key.code {
            KeyCode::Enter => {
                self.refresh_preview(graph, index);
                self.screen = FindScreen::Preview;
                FindEvent::Continue
            }
            KeyCode::Tab => {
                self.focused_field = (self.focused_field + 1) % Self::FIELD_COUNT;
                FindEvent::Continue
            }
            KeyCode::BackTab => {
                let f = self.focused_field;
                self.focused_field = if f == 0 { Self::FIELD_COUNT - 1 } else { f - 1 };
                FindEvent::Continue
            }
            KeyCode::Up if self.focused_field == 0 => {
                if self.selected_property_suggestion > 0 {
                    self.selected_property_suggestion -= 1;
                }
                FindEvent::Continue
            }
            KeyCode::Down if self.focused_field == 0 => {
                if !self.property_suggestions.is_empty()
                    && self.selected_property_suggestion < self.property_suggestions.len() - 1
                {
                    self.selected_property_suggestion += 1;
                }
                FindEvent::Continue
            }
            _ => {
                self.dispatch_to_focused_field(key);
                if self.focused_field == 0 {
                    self.refresh_property_suggestions();
                }
                FindEvent::Continue
            }
        }
    }

    fn dispatch_to_focused_field(&mut self, key: KeyEvent) {
        let ev = crossterm::event::Event::Key(key);
        match self.focused_field {
            0 => {
                self.property.handle_event(&ev);
            }
            1 => {
                self.component.handle_event(&ev);
            }
            2 => {
                self.variant.handle_event(&ev);
            }
            3 => {
                self.state.handle_event(&ev);
            }
            4 => {
                self.intent.handle_event(&ev);
            }
            _ => {}
        }
    }

    // ── Screen 2: Preview ────────────────────────────────────────────────────

    fn handle_preview_key(&mut self, key: KeyEvent) -> FindEvent {
        match key.code {
            KeyCode::Enter => {
                let expr = self
                    .assemble_expr()
                    .unwrap_or_else(|| self.intent.value().trim().to_string());
                let rows = std::mem::take(&mut self.preview_rows);
                FindEvent::OpenResults(QueryView::new(expr, rows))
            }
            KeyCode::Char('e') => {
                self.screen = FindScreen::Filters;
                FindEvent::Continue
            }
            KeyCode::Char('q') => FindEvent::Cancel,
            _ => FindEvent::Continue,
        }
    }
}

impl Default for FindWizardState {
    fn default() -> Self {
        Self::new()
    }
}

fn suggestion_to_row(s: &suggest::SuggestionResult) -> QueryRow {
    let value = s
        .value
        .as_ref()
        .map(|v| {
            if v.is_string() {
                v.as_str().unwrap_or("").to_string()
            } else {
                v.to_string()
            }
        })
        .unwrap_or_default();
    let file = s
        .file
        .file_name()
        .map(|f| f.to_string_lossy().into_owned())
        .unwrap_or_default();
    let layer = match s.layer {
        Layer::Foundation => "foundation",
        Layer::Platform => "platform",
        Layer::Product => "product",
    };
    QueryRow {
        name: s.token_name.clone(),
        value,
        file,
        layer: layer.to_string(),
    }
}
