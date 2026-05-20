// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Four-screen token authoring wizard (RFC #973 §3.10–§3.15).
//!
//! Screens: Intent → Classification → Values → Confirm (diff preview).
//! M3 ends at preview; no real disk writes (M4).

use std::path::Path;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph};
use design_data_core::suggest::{self, SuggestionResult};
use tui_input::Input;
use tui_input::backend::crossterm::EventHandler;

/// Minimal graph context passed to wizard key handlers.
pub struct WizardCtx<'a> {
    pub graph: &'a TokenGraph,
    pub dataset_path: Option<&'a Path>,
}

// ── Screen & path enums ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WizardScreen {
    Intent,
    Classification,
    Values,
    Confirm,
}

impl WizardScreen {
    pub fn number(self) -> u8 {
        match self {
            WizardScreen::Intent => 1,
            WizardScreen::Classification => 2,
            WizardScreen::Values => 3,
            WizardScreen::Confirm => 4,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            WizardScreen::Intent => "Intent",
            WizardScreen::Classification => "Classification",
            WizardScreen::Values => "Values",
            WizardScreen::Confirm => "Confirm",
        }
    }
}

/// Whether the user is creating a new token or aliasing an existing one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WizardPath {
    CreateNew,
    AliasToExisting(String), // token name of the reuse target
}

// ── Draft types ──────────────────────────────────────────────────────────────

/// An additional name-object field (key + editable value).
pub struct NameField {
    pub key: String,
    pub value: Input,
}

/// State for Screen 2 (Classification).
///
/// `focused_field` index:  0 = layer selector, 1 = property, 2..= name_fields[i-2].
pub struct ClassificationDraft {
    pub layer: Layer,
    pub property: Input,
    pub name_fields: Vec<NameField>,
    pub focused_field: usize,
}

impl ClassificationDraft {
    fn new() -> Self {
        Self {
            layer: Layer::Foundation,
            property: Input::default(),
            name_fields: Vec::new(),
            focused_field: 0,
        }
    }

    fn field_count(&self) -> usize {
        2 + self.name_fields.len() // layer + property + name_fields
    }
}

/// Whether a value row uses an alias (reference) or a literal value.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValueKind {
    Alias,
    Literal,
}

/// One row in Screen 3's values table.
pub struct ValueRow {
    /// Mode-set conditions for this row, e.g. `[("colorScheme", "dark")]`.
    pub mode_combo: Vec<(String, String)>,
    pub kind: ValueKind,
    /// Target token name when `kind = Alias`.
    pub alias_target: Input,
    /// Literal value string when `kind = Literal`.
    pub literal: Input,
}

impl ValueRow {
    /// Human-readable label for the mode combo.
    pub fn combo_label(&self) -> String {
        if self.mode_combo.is_empty() {
            "default".to_string()
        } else {
            self.mode_combo.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join(", ")
        }
    }
}

/// State for Screen 3 (Values).
pub struct ValuesDraft {
    pub rows: Vec<ValueRow>,
    pub selected: usize,
    /// True when keyboard input is being routed into the selected row's active field.
    pub editing: bool,
}

impl ValuesDraft {
    fn new() -> Self {
        Self { rows: Vec::new(), selected: 0, editing: false }
    }
}

// ── Main wizard state ────────────────────────────────────────────────────────

/// All state for the four-screen wizard.
pub struct WizardState {
    pub screen: WizardScreen,
    pub intent: Input,
    pub suggestions: Vec<SuggestionResult>,
    pub selected_suggestion: usize,
    pub chosen_path: WizardPath,
    pub classification: ClassificationDraft,
    pub values: ValuesDraft,
    pub rationale: Input,
    pub diff_preview: Option<String>,
    pub diff_scroll: u16,
}

/// Outcome of a single key event inside the wizard.
pub enum WizardEvent {
    /// Normal key handling; no state change visible to App.
    Continue,
    /// User pressed Esc — App should close the modal.
    Cancel,
    /// User confirmed on Screen 4 — App should close the modal and show the preview status.
    Submit,
}

impl WizardState {
    pub fn new() -> Self {
        Self {
            screen: WizardScreen::Intent,
            intent: Input::default(),
            suggestions: Vec::new(),
            selected_suggestion: 0,
            chosen_path: WizardPath::CreateNew,
            classification: ClassificationDraft::new(),
            values: ValuesDraft::new(),
            rationale: Input::default(),
            diff_preview: None,
            diff_scroll: 0,
        }
    }

    /// Create a wizard with `intent` pre-seeded from a palette `:new <intent>` command.
    pub fn new_with_intent(intent: &str) -> Self {
        let mut s = Self::new();
        if !intent.is_empty() {
            s.intent = Input::from(intent.to_string());
        }
        s
    }

    // ── Dispatch ─────────────────────────────────────────────────────────────

    /// Route a key event through the appropriate screen handler.
    pub fn handle_key(&mut self, key: KeyEvent, ctx: &WizardCtx<'_>) -> WizardEvent {
        // Ctrl-C should not be consumed here — App handles it above us.
        if key.modifiers.contains(KeyModifiers::CONTROL) {
            return WizardEvent::Continue;
        }
        if key.code == KeyCode::Esc {
            return WizardEvent::Cancel;
        }
        let event = match self.screen {
            WizardScreen::Intent => self.handle_intent_key(key, ctx),
            WizardScreen::Classification => self.handle_classification_key(key),
            WizardScreen::Values => self.handle_values_key(key, ctx),
            WizardScreen::Confirm => self.handle_confirm_key(key, ctx),
        };
        // Refresh suggestions on every Screen 1 key.
        if matches!(self.screen, WizardScreen::Intent) {
            self.refresh_suggestions(ctx.graph);
        }
        event
    }

    // ── Screen 1: Intent ─────────────────────────────────────────────────────

    fn handle_intent_key(&mut self, key: KeyEvent, ctx: &WizardCtx<'_>) -> WizardEvent {
        match key.code {
            KeyCode::Enter => {
                self.chosen_path = WizardPath::CreateNew;
                self.advance_to_classification(ctx.graph);
                WizardEvent::Continue
            }
            KeyCode::Tab => {
                if !self.suggestions.is_empty() {
                    let name = self.suggestions[self.selected_suggestion].token_name.clone();
                    self.chosen_path = WizardPath::AliasToExisting(name);
                    self.build_diff(ctx.dataset_path);
                    self.screen = WizardScreen::Confirm;
                }
                WizardEvent::Continue
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if self.selected_suggestion > 0 {
                    self.selected_suggestion -= 1;
                }
                WizardEvent::Continue
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if !self.suggestions.is_empty()
                    && self.selected_suggestion < self.suggestions.len() - 1
                {
                    self.selected_suggestion += 1;
                }
                WizardEvent::Continue
            }
            _ => {
                self.intent.handle_event(&crossterm::event::Event::Key(key));
                WizardEvent::Continue
            }
        }
    }

    fn advance_to_classification(&mut self, graph: &TokenGraph) {
        // Pre-populate property from the intent hint.
        let intent = self.intent.value().to_string();
        if !intent.is_empty() && self.classification.property.value().is_empty() {
            // Seed property from the top suggestion's name.property if available.
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
        // Build value rows based on graph mode sets.
        self.values.rows = build_value_rows(&graph.mode_sets, graph, &intent);
        self.screen = WizardScreen::Classification;
    }

    // ── Screen 2: Classification ─────────────────────────────────────────────

    fn handle_classification_key(&mut self, key: KeyEvent) -> WizardEvent {
        match key.code {
            KeyCode::Enter => {
                self.screen = WizardScreen::Values;
                WizardEvent::Continue
            }
            KeyCode::Tab => {
                let count = self.classification.field_count();
                self.classification.focused_field =
                    (self.classification.focused_field + 1) % count;
                WizardEvent::Continue
            }
            KeyCode::BackTab => {
                let count = self.classification.field_count();
                let f = self.classification.focused_field;
                self.classification.focused_field = if f == 0 { count - 1 } else { f - 1 };
                WizardEvent::Continue
            }
            KeyCode::Left | KeyCode::Char('h') if self.classification.focused_field == 0 => {
                self.classification.layer = cycle_layer_backward(self.classification.layer);
                WizardEvent::Continue
            }
            KeyCode::Right | KeyCode::Char('l') if self.classification.focused_field == 0 => {
                self.classification.layer = cycle_layer_forward(self.classification.layer);
                WizardEvent::Continue
            }
            KeyCode::Char('+') => {
                // Add a new name field.
                self.classification.name_fields.push(NameField {
                    key: "key".to_string(),
                    value: Input::default(),
                });
                WizardEvent::Continue
            }
            _ => {
                let focused = self.classification.focused_field;
                if focused == 1 {
                    self.classification.property.handle_event(&crossterm::event::Event::Key(key));
                } else if focused >= 2 {
                    let idx = focused - 2;
                    if let Some(field) = self.classification.name_fields.get_mut(idx) {
                        field.value.handle_event(&crossterm::event::Event::Key(key));
                    }
                }
                WizardEvent::Continue
            }
        }
    }

    // ── Screen 3: Values ─────────────────────────────────────────────────────

    fn handle_values_key(&mut self, key: KeyEvent, ctx: &WizardCtx<'_>) -> WizardEvent {
        if self.values.editing {
            // Route keys into the active row input; Esc or Enter exits edit mode.
            match key.code {
                KeyCode::Esc | KeyCode::Enter => {
                    self.values.editing = false;
                }
                _ => {
                    if let Some(row) = self.values.rows.get_mut(self.values.selected) {
                        let input = match row.kind {
                            ValueKind::Alias => &mut row.alias_target,
                            ValueKind::Literal => &mut row.literal,
                        };
                        input.handle_event(&crossterm::event::Event::Key(key));
                    }
                }
            }
            return WizardEvent::Continue;
        }

        match key.code {
            KeyCode::Enter => {
                self.advance_to_confirm(ctx.dataset_path);
                WizardEvent::Continue
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if self.values.selected > 0 {
                    self.values.selected -= 1;
                }
                WizardEvent::Continue
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if !self.values.rows.is_empty()
                    && self.values.selected < self.values.rows.len() - 1
                {
                    self.values.selected += 1;
                }
                WizardEvent::Continue
            }
            KeyCode::Char('a') => {
                if let Some(row) = self.values.rows.get_mut(self.values.selected) {
                    row.kind = ValueKind::Alias;
                }
                WizardEvent::Continue
            }
            KeyCode::Char('l') => {
                if let Some(row) = self.values.rows.get_mut(self.values.selected) {
                    row.kind = ValueKind::Literal;
                }
                WizardEvent::Continue
            }
            KeyCode::Char('e') => {
                if !self.values.rows.is_empty() {
                    self.values.editing = true;
                }
                WizardEvent::Continue
            }
            _ => WizardEvent::Continue,
        }
    }

    // ── Screen 4: Confirm ────────────────────────────────────────────────────

    fn handle_confirm_key(&mut self, key: KeyEvent, ctx: &WizardCtx<'_>) -> WizardEvent {
        match key.code {
            KeyCode::Enter => {
                if !self.rationale.value().is_empty() {
                    // Regenerate so the final diff includes the rationale field.
                    self.build_diff(ctx.dataset_path);
                    WizardEvent::Submit
                } else {
                    WizardEvent::Continue
                }
            }
            KeyCode::Up => {
                self.diff_scroll = self.diff_scroll.saturating_sub(1);
                WizardEvent::Continue
            }
            KeyCode::Down => {
                self.diff_scroll = self.diff_scroll.saturating_add(1);
                WizardEvent::Continue
            }
            _ => {
                self.rationale.handle_event(&crossterm::event::Event::Key(key));
                // Regenerate the diff on each keystroke so the rationale field
                // is reflected immediately in the preview panel.
                self.build_diff(ctx.dataset_path);
                WizardEvent::Continue
            }
        }
    }

    // ── Public helpers ───────────────────────────────────────────────────────

    /// Recompute `suggestions` from the current intent string.  Cheap; safe to call on
    /// every key event.
    pub fn refresh_suggestions(&mut self, graph: &TokenGraph) {
        let intent = self.intent.value().to_string();
        self.suggestions = suggest::suggest(graph, &intent, None, 5);
        // Clamp selection.
        if !self.suggestions.is_empty() && self.selected_suggestion >= self.suggestions.len() {
            self.selected_suggestion = self.suggestions.len() - 1;
        }
    }

    /// Advance Screen 3 → Screen 4, computing an initial diff preview.
    pub fn advance_to_confirm(&mut self, dataset_path: Option<&Path>) {
        self.build_diff(dataset_path);
        self.screen = WizardScreen::Confirm;
    }

    /// The assembled token name derived from classification fields (property + name fields).
    pub fn assembled_name(&self) -> String {
        let mut parts: Vec<String> = Vec::new();
        let prop = self.classification.property.value().trim().to_string();
        if !prop.is_empty() {
            parts.push(prop);
        }
        for field in &self.classification.name_fields {
            let v = field.value.value().trim().to_string();
            if !v.is_empty() {
                parts.push(v);
            }
        }
        parts.join("-")
    }

    /// Build a unified diff between the current and predicted post-write state of the
    /// target file.  Populates `self.diff_preview`.  No files are written.
    pub fn build_diff(&mut self, dataset_path: Option<&Path>) {
        let Some(path) = dataset_path else {
            self.diff_preview = None;
            return;
        };

        let target = path.join("tokens.json");

        // "before" — existing file content, or empty object.
        let before_raw = if target.exists() {
            std::fs::read_to_string(&target).unwrap_or_else(|_| "{}".to_string())
        } else {
            "{}".to_string()
        };
        let before = if before_raw.ends_with('\n') {
            before_raw.clone()
        } else {
            format!("{before_raw}\n")
        };

        // Build the new token object.
        let key = self.assembled_name();
        let key = if key.is_empty() { "new-token".to_string() } else { key };

        // M3: preview uses only the first value row. Full per-mode diff is M4.
        let token_value = match self.values.rows.first() {
            Some(row) => match row.kind {
                ValueKind::Alias => {
                    let t = row.alias_target.value();
                    if t.is_empty() {
                        serde_json::Value::Null
                    } else {
                        serde_json::json!({ "$alias": t })
                    }
                }
                ValueKind::Literal => {
                    let v = row.literal.value().to_string();
                    serde_json::Value::String(v)
                }
            },
            None => serde_json::Value::Null,
        };

        let mut token_obj = serde_json::json!({ "value": token_value });
        let rationale = self.rationale.value().trim().to_string();
        if !rationale.is_empty() {
            token_obj["rationale"] = serde_json::Value::String(rationale);
        }

        // Merge into the existing file map.
        let mut map: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(&before_raw).unwrap_or_default();
        map.insert(key, token_obj);
        let after_body = serde_json::to_string_pretty(&serde_json::Value::Object(map))
            .unwrap_or_else(|_| "{}".to_string());
        let after = format!("{after_body}\n");

        // Build unified diff.
        let diff_text = similar::TextDiff::from_lines(before.as_str(), after.as_str())
            .unified_diff()
            .header("a/tokens.json", "b/tokens.json")
            .to_string();

        // Cap at 200 lines.
        let capped: String = diff_text.lines().take(200).collect::<Vec<&str>>().join("\n");
        self.diff_preview = Some(capped);
    }
}

impl Default for WizardState {
    fn default() -> Self {
        Self::new()
    }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

fn cycle_layer_forward(layer: Layer) -> Layer {
    match layer {
        Layer::Foundation => Layer::Platform,
        Layer::Platform => Layer::Product,
        Layer::Product => Layer::Foundation,
    }
}

fn cycle_layer_backward(layer: Layer) -> Layer {
    match layer {
        Layer::Foundation => Layer::Product,
        Layer::Platform => Layer::Foundation,
        Layer::Product => Layer::Platform,
    }
}

/// Build Screen 3 value rows from a graph's mode sets.
///
/// Produces the Cartesian product of all mode values.  If the graph has no
/// mode sets, a single "default" row is returned.
fn build_value_rows(
    mode_sets: &[ModeSetRecord],
    graph: &TokenGraph,
    intent: &str,
) -> Vec<ValueRow> {
    let combos = cartesian_product(mode_sets);
    if combos.is_empty() {
        return vec![ValueRow {
            mode_combo: vec![],
            kind: ValueKind::Alias,
            alias_target: seed_alias(graph, intent, None),
            literal: Input::default(),
        }];
    }
    combos
        .into_iter()
        .map(|combo| {
            let property_hint: Option<String> = None; // refined in M4 with primer
            ValueRow {
                mode_combo: combo,
                kind: ValueKind::Alias,
                alias_target: seed_alias(
                    graph,
                    intent,
                    property_hint.as_deref(),
                ),
                literal: Input::default(),
            }
        })
        .collect()
}

fn seed_alias(graph: &TokenGraph, intent: &str, property_hint: Option<&str>) -> Input {
    let suggestions = suggest::suggest(graph, intent, property_hint, 1);
    if let Some(top) = suggestions.into_iter().next() {
        Input::from(top.token_name)
    } else {
        Input::default()
    }
}

/// Cartesian product of mode sets → list of mode-combo vectors.
fn cartesian_product(mode_sets: &[ModeSetRecord]) -> Vec<Vec<(String, String)>> {
    let mut result: Vec<Vec<(String, String)>> = vec![vec![]];
    for ms in mode_sets {
        let mut next = Vec::new();
        for combo in &result {
            for mode in &ms.modes {
                let mut new_combo = combo.clone();
                new_combo.push((ms.name.clone(), mode.clone()));
                next.push(new_combo);
            }
        }
        result = next;
    }
    result
}

