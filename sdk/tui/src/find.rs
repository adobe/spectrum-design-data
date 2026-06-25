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

use std::collections::HashMap;

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

// FacetOption is defined in wizard_common::facet so it can be shared with the
// authoring wizard's classification screen.
pub use crate::wizard_common::facet::FacetOption;

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
    /// Autocomplete suggestions for the currently focused field (fields 0–3),
    /// each paired with a cross-field match count.
    pub suggestions: Vec<FacetOption>,
    pub selected_suggestion: usize,
    /// All rows from the most recent preview refresh.
    pub preview_rows: Vec<QueryRow>,
    /// Total match count (== `preview_rows.len()`).
    pub preview_count: usize,
    /// Parse or query error from the most recent refresh, if any.
    pub preview_error: Option<String>,
}

impl FindWizardState {
    pub const FIELD_COUNT: usize = 5;
    /// Focus index of the Preview button — the element after all 5 filter fields.
    pub const PREVIEW_FOCUS: usize = 5;
    /// Total focusable elements on the Filters screen (5 fields + Preview button).
    pub const FOCUS_COUNT: usize = 6;
    /// How many zero-count (incompatible) options to show below the reachable list.
    /// Kept small so the dropdown doesn't grow unwieldy; large enough to surface
    /// the most common incompatibilities.
    const ZERO_COUNT_TAIL: usize = 4;

    pub fn new() -> Self {
        Self {
            screen: FindScreen::Filters,
            property: Input::default(),
            component: Input::default(),
            variant: Input::default(),
            state: Input::default(),
            intent: Input::default(),
            focused_field: 0,
            suggestions: Vec::new(),
            selected_suggestion: 0,
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
            // Field 4 (intent) has no suggestions — leave empty.
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

    /// Build a query expression from all structured filter fields *except* `skip_field`.
    ///
    /// Returns `None` when no other non-empty field provides a constraint.
    /// Used by `refresh_suggestions` to cross-filter the dropdown of the focused field
    /// by the values already set in the other fields.
    pub fn assemble_expr_excluding(&self, skip_field: usize) -> Option<String> {
        let mut parts = Vec::new();
        let prop = self.property.value().trim().to_string();
        let comp = self.component.value().trim().to_string();
        let var = self.variant.value().trim().to_string();
        let st = self.state.value().trim().to_string();

        if skip_field != 0 && !prop.is_empty() {
            parts.push(format!("property={prop}"));
        }
        if skip_field != 1 && !comp.is_empty() {
            parts.push(format!("component={comp}"));
        }
        if skip_field != 2 && !var.is_empty() {
            parts.push(format!("variant={var}"));
        }
        if skip_field != 3 && !st.is_empty() {
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

    /// Recompute autocomplete suggestions for the currently focused field (0–3).
    ///
    /// Draws the universe of candidate values from the live `TokenIndex`.  If other
    /// filter fields are already filled, cross-field faceting narrows each option's
    /// count to tokens that also match those constraints.  Zero-count options (incompatible
    /// with the current selection) are kept in the list but sorted last so the view can
    /// render them dimmed.
    ///
    /// Falls back to the static `RegistryData` vocabulary when the corpus has no index
    /// entries for the field (e.g. the graph is empty), preserving behavior during tests
    /// that build a minimal graph.
    ///
    /// Field 4 (intent) has no registry backing and is left empty.
    pub fn refresh_suggestions(&mut self, graph: &TokenGraph, index: &query::TokenIndex) {
        let (typed, field_key) = match self.focused_field {
            0 => (self.property.value().trim().to_lowercase(), "property"),
            1 => (self.component.value().trim().to_lowercase(), "component"),
            2 => (self.variant.value().trim().to_lowercase(), "variant"),
            3 => (self.state.value().trim().to_lowercase(), "state"),
            _ => {
                self.suggestions.clear();
                self.selected_suggestion = 0;
                return;
            }
        };

        // Universe: distinct values of this field from the corpus, each with their
        // whole-corpus count.  Fall back to the static registry vocabulary when the
        // corpus index has no entries for this field.
        let universe: Vec<(String, usize)> = {
            let from_index = index.field_value_counts(field_key);
            if from_index.is_empty() {
                if let Some(terms) = RegistryData::embedded().for_field(field_key) {
                    terms.iter().map(|t| (t.clone(), 0usize)).collect()
                } else {
                    Vec::new()
                }
            } else {
                from_index
            }
        };

        // Constrained counts: if other fields are already set, run the cross-field
        // filter to find which values of the focused field are still reachable.
        let constrained: Option<HashMap<String, usize>> = self
            .assemble_expr_excluding(self.focused_field)
            .and_then(|expr_str| query::parse(&expr_str).ok())
            .map(|filter| {
                query::facet_counts(graph, index, &filter, field_key)
                    .into_iter()
                    .collect()
            });

        // Build FacetOption list, applying the text-prefix filter.
        let mut options: Vec<FacetOption> = universe
            .into_iter()
            .filter(|(v, _)| typed.is_empty() || v.to_lowercase().contains(&typed))
            .map(|(value, baseline_count)| {
                let count = constrained
                    .as_ref()
                    .map(|c| c.get(&value).copied().unwrap_or(0))
                    .unwrap_or(baseline_count);
                FacetOption { value, count }
            })
            .collect();

        // Sort: reachable (count > 0) first by count desc, then value asc;
        // incompatible (count == 0) last, sorted alphabetically.
        options.sort_by(|a, b| match (a.count, b.count) {
            (0, 0) => a.value.cmp(&b.value),
            (0, _) => std::cmp::Ordering::Greater,
            (_, 0) => std::cmp::Ordering::Less,
            (ac, bc) => bc.cmp(&ac).then_with(|| a.value.cmp(&b.value)),
        });

        // Cap each tier separately so zero-count entries are never silently dropped
        // when the reachable list is full — upholding the "greyed, not hidden" contract.
        let split = options.partition_point(|o| o.count > 0);
        let (reachable, dimmed) = options.split_at(split);
        let mut capped: Vec<FacetOption> = reachable
            .iter()
            .take(MAX_PROPERTY_SUGGESTIONS)
            .cloned()
            .collect();
        capped.extend(dimmed.iter().take(Self::ZERO_COUNT_TAIL).cloned());
        options = capped;

        self.suggestions = options;
        if self.selected_suggestion >= self.suggestions.len() {
            self.selected_suggestion = 0;
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
            // Back one screen; cancel only from the first screen (mirrors authoring wizard).
            return match self.screen {
                FindScreen::Filters => FindEvent::Cancel,
                FindScreen::Preview => {
                    self.screen = FindScreen::Filters;
                    FindEvent::Continue
                }
            };
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
                if self.focused_field == Self::PREVIEW_FOCUS {
                    // Preview button is active — run the query and advance to Preview.
                    self.refresh_preview(graph, index);
                    self.screen = FindScreen::Preview;
                    return FindEvent::Continue;
                }
                // Field 0–3: accept the highlighted suggestion when it differs from input.
                if self.focused_field < Self::FIELD_COUNT - 1 && !self.suggestions.is_empty() {
                    if let Some(suggestion) = self.suggestions.get(self.selected_suggestion) {
                        let current = self.current_field_value().trim().to_string();
                        if suggestion.value.as_str() != current.as_str() {
                            let accepted = suggestion.value.clone();
                            self.set_current_field_value(accepted);
                            self.suggestions.clear();
                            self.selected_suggestion = 0;
                            self.refresh_preview(graph, index);
                            return FindEvent::Continue;
                        }
                    }
                }
                // Nothing to accept (intent field, empty list, or input == suggestion) —
                // advance focus one step, exactly like Tab.  Repeated Enter will walk
                // all the way down to the Preview button without jumping to Preview early.
                self.suggestions.clear();
                self.selected_suggestion = 0;
                self.focused_field = (self.focused_field + 1) % Self::FOCUS_COUNT;
                self.refresh_suggestions(graph, index);
                self.refresh_preview(graph, index);
                FindEvent::Continue
            }
            KeyCode::Tab => {
                self.suggestions.clear();
                self.selected_suggestion = 0;
                self.focused_field = (self.focused_field + 1) % Self::FOCUS_COUNT;
                self.refresh_suggestions(graph, index);
                self.refresh_preview(graph, index);
                FindEvent::Continue
            }
            KeyCode::BackTab => {
                self.suggestions.clear();
                self.selected_suggestion = 0;
                let f = self.focused_field;
                self.focused_field = if f == 0 { Self::FOCUS_COUNT - 1 } else { f - 1 };
                self.refresh_suggestions(graph, index);
                self.refresh_preview(graph, index);
                FindEvent::Continue
            }
            KeyCode::Up => {
                if self.selected_suggestion > 0 {
                    self.selected_suggestion -= 1;
                }
                FindEvent::Continue
            }
            KeyCode::Down => {
                if !self.suggestions.is_empty()
                    && self.selected_suggestion < self.suggestions.len() - 1
                {
                    self.selected_suggestion += 1;
                }
                FindEvent::Continue
            }
            _ => {
                // dispatch_to_focused_field is a no-op when focused on the Preview button.
                self.dispatch_to_focused_field(key);
                self.refresh_suggestions(graph, index);
                self.refresh_preview(graph, index);
                FindEvent::Continue
            }
        }
    }

    /// Return the current value of the focused field as a string slice.
    /// Returns `""` when the Preview button is focused (not a text field).
    fn current_field_value(&self) -> &str {
        match self.focused_field {
            0 => self.property.value(),
            1 => self.component.value(),
            2 => self.variant.value(),
            3 => self.state.value(),
            4 => self.intent.value(),
            _ => "",
        }
    }

    /// Set the value of the focused field.
    /// No-op when the Preview button is focused (not a text field).
    fn set_current_field_value(&mut self, value: String) {
        let input = Input::from(value);
        match self.focused_field {
            0 => self.property = input,
            1 => self.component = input,
            2 => self.variant = input,
            3 => self.state = input,
            4 => self.intent = input,
            _ => {}
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
        uuid: s.token_uuid.clone(),
        source_path: s.file.clone(),
    }
}
