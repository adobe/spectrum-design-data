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
//! Screens: Intent → Classification → Values → Confirm (diff preview + write).
//! M4 adds `--allow-write` gating: when enabled, Screen 4 Submit calls
//! `core::write::write_cascade_token` and records the token to disk.

use std::path::Path;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::graph::TokenGraph;
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use design_data_core::suggest::{self, SuggestionResult};
use design_data_core::write::{write_cascade_token, WriteCascadeTokenInput};
use tui_input::backend::crossterm::EventHandler;
use tui_input::Input;
use uuid::Uuid;

mod build;
pub mod draft;
use build::{
    build_value_rows, classification_to_name_dtos, infer_schema_url, resolve_target_file,
    value_rows_to_dtos,
};

/// Minimal graph context passed to wizard key handlers.
pub struct WizardCtx<'a> {
    pub graph: &'a TokenGraph,
    pub token_index: TokenIndex,
    pub dataset_path: Option<&'a Path>,
    pub schema_registry: Option<&'a SchemaRegistry>,
    /// When true, Screen 4 Submit writes to disk via `write_cascade_token`.
    pub allow_write: bool,
}

// ── Screen & path enums ──────────────────────────────────────────────────────
// Defined in `design_data_core::authoring::draft`; re-exported here so callers
// within this crate can still use the short `crate::wizard::WizardScreen` path.
pub use design_data_core::authoring::draft::{ValueKind, WizardPath, WizardScreen};
use design_data_core::authoring::session::alias_threshold;

// ── Classification types (re-exported from wizard_common) ───────────────────
// These live in `wizard_common::classification` so the naming wizard can import
// them without reaching into this module.  The re-exports keep every existing
// call-site (tests, wizard_draft.rs, main.rs) working unchanged.
pub use crate::wizard_common::classification::{
    assemble_name_from_classification, cycle_layer_backward, cycle_layer_forward,
    ClassificationDraft, NameField,
};

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
            self.mode_combo
                .iter()
                .map(|(k, v)| format!("{k}={v}"))
                .collect::<Vec<_>>()
                .join(", ")
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
        Self {
            rows: Vec::new(),
            selected: 0,
            editing: false,
        }
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
    /// `$schema` URL inferred or entered by the user; recommended for `write_cascade_token`.
    pub schema_url: Option<String>,
    /// True while the user is editing the schema URL inline on Screen 4.
    pub editing_schema_url: bool,
    /// Input buffer for the inline schema URL editor.
    pub schema_url_input: Input,
    /// Write error surfaced on Screen 4 when `write_token` fails; keeps modal open.
    pub error: Option<String>,
    /// True when the top suggestion's confidence meets the alias threshold.
    /// Drives the reuse-first banner on Screen 1 (RFC §3.10).
    pub can_alias: bool,
}

/// Outcome of a single key event inside the wizard.
pub enum WizardEvent {
    /// Normal key handling; no state change visible to App.
    Continue,
    /// User pressed Esc — App should close the modal.
    Cancel,
    /// User confirmed on Screen 4 — App should close the modal (or surface write error).
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
            schema_url: None,
            editing_schema_url: false,
            schema_url_input: Input::default(),
            error: None,
            can_alias: false,
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
        // Ctrl-C is handled globally above us (never reaches here).
        // Ctrl-S on Screen 4 opens the schema URL editor; all other Ctrl combos fall
        // through to the screen handlers so tui-input's readline bindings (Ctrl-A/E/W/U)
        // work in text fields — matching the behaviour of the palette and naming wizard.
        if key.modifiers.contains(KeyModifiers::CONTROL)
            && key.code == KeyCode::Char('s')
            && self.screen == WizardScreen::Confirm
        {
            self.editing_schema_url = true;
            return WizardEvent::Continue;
        }
        if key.code == KeyCode::Esc {
            // Sub-editor open on S4: close only the sub-editor.
            if self.editing_schema_url {
                self.editing_schema_url = false;
                return WizardEvent::Continue;
            }
            // S1: cancel the whole wizard.
            if self.screen == WizardScreen::Intent {
                return WizardEvent::Cancel;
            }
            // S2–S4: go back one screen without losing prior input.
            self.go_back();
            return WizardEvent::Continue;
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
        // Refresh registry-driven suggestions and catalog diagnostics on Screen 2.
        if matches!(self.screen, WizardScreen::Classification) {
            self.classification
                .refresh(&ctx.token_index, self.schema_url.as_deref());
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
                    let name = self.suggestions[self.selected_suggestion]
                        .token_name
                        .clone();
                    // Infer schema URL from the reuse target's token record.
                    if self.schema_url.is_none() {
                        if let Some(token) = ctx.graph.tokens.get(&name) {
                            self.schema_url = token.schema_url.clone();
                            if let Some(ref url) = self.schema_url {
                                self.schema_url_input = Input::from(url.clone());
                            }
                        }
                    }
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
        // Pre-populate registry suggestions for the focused field (property, focused_field==1).
        let index = design_data_core::query::TokenIndex::build(graph);
        self.classification
            .refresh(&index, self.schema_url.as_deref());
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
                self.classification.focused_field = (self.classification.focused_field + 1) % count;
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
                    suggestions: Vec::new(),
                });
                WizardEvent::Continue
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
                self.advance_to_confirm(ctx);
                WizardEvent::Continue
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if self.values.selected > 0 {
                    self.values.selected -= 1;
                }
                WizardEvent::Continue
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if !self.values.rows.is_empty() && self.values.selected < self.values.rows.len() - 1
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
        // Schema URL editor captures all input while active.
        if self.editing_schema_url {
            match key.code {
                KeyCode::Enter => {
                    let url = self.schema_url_input.value().trim().to_string();
                    self.schema_url = if url.is_empty() { None } else { Some(url) };
                    self.editing_schema_url = false;
                    self.build_diff(ctx.dataset_path);
                }
                _ => {
                    self.schema_url_input
                        .handle_event(&crossterm::event::Event::Key(key));
                }
            }
            return WizardEvent::Continue;
        }

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
                self.rationale
                    .handle_event(&crossterm::event::Event::Key(key));
                // Regenerate diff on each keystroke so rationale is reflected immediately.
                self.build_diff(ctx.dataset_path);
                WizardEvent::Continue
            }
        }
    }

    /// Navigate to the previous screen, preserving all already-filled fields.
    fn go_back(&mut self) {
        self.screen = match self.screen {
            WizardScreen::Classification => WizardScreen::Intent,
            WizardScreen::Values => WizardScreen::Classification,
            WizardScreen::Confirm => WizardScreen::Values,
            WizardScreen::Intent => unreachable!("go_back never called on S1; Esc on S1 cancels"),
        };
    }

    /// Recompute `suggestions` and `can_alias` from the current intent string.
    /// Cheap; safe to call on every key event.
    pub fn refresh_suggestions(&mut self, graph: &TokenGraph) {
        let intent = self.intent.value().to_string();
        self.suggestions = suggest::suggest(graph, &intent, None, 5);
        self.can_alias = self
            .suggestions
            .first()
            .map(|s| s.confidence >= alias_threshold())
            .unwrap_or(false);
        // Clamp selection.
        if !self.suggestions.is_empty() && self.selected_suggestion >= self.suggestions.len() {
            self.selected_suggestion = self.suggestions.len() - 1;
        }
    }

    /// Advance Screen 3 → Screen 4, inferring schema URL and computing an initial diff preview.
    pub fn advance_to_confirm(&mut self, ctx: &WizardCtx<'_>) {
        if self.schema_url.is_none() {
            let property = self.classification.property.value().trim().to_string();
            self.schema_url = infer_schema_url(ctx.graph, &property);
            if let Some(ref url) = self.schema_url {
                self.schema_url_input = Input::from(url.clone());
            }
        }
        self.build_diff(ctx.dataset_path);
        self.screen = WizardScreen::Confirm;
    }

    /// Assemble the owned [`WriteCascadeTokenInput`] for this wizard without touching the
    /// schema registry or performing any disk write.
    ///
    /// Split out from [`perform_write`](Self::perform_write) so the `update`
    /// runtime can build the input synchronously and move it into a `Task::Cmd`
    /// closure (which requires `Send + 'static`), keeping `update` free of I/O.
    pub fn build_write_input(
        &self,
        dataset_path: Option<&Path>,
        _graph: &TokenGraph,
    ) -> Result<WriteCascadeTokenInput, String> {
        let dataset_path = dataset_path.ok_or_else(|| "no dataset path available".to_string())?;

        if self.assembled_name().is_empty() {
            return Err("assembled token name is empty — fill in Property on Screen 2".to_string());
        }

        let property = self.classification.property.value().trim().to_string();
        let target = resolve_target_file(self.classification.layer, &property, dataset_path);

        // Build the full token object: $schema + name + value fields + uuid + rationale.
        // The uuid is injected here so the cascade writer can resolve identity by uuid
        // (UUID-stability contract, authoring-workflow.md L69).
        let mut token_obj = self.assembled_token();
        if let Some(obj) = token_obj.as_object_mut() {
            obj.insert(
                "uuid".into(),
                serde_json::Value::String(Uuid::new_v4().to_string()),
            );
        }
        let rationale_text = self.rationale.value().trim().to_string();
        let rationale = if rationale_text.is_empty() {
            None
        } else {
            Some(rationale_text)
        };

        Ok(WriteCascadeTokenInput {
            token: token_obj,
            target,
            rationale,
        })
    }

    /// Attempt to write the token to disk using the cascade writer.
    ///
    /// Returns `Ok(written_path)` on success, `Err(message)` on failure.
    /// Failures are non-fatal: the caller surfaces them on Screen 4 and keeps
    /// the modal open so the user can correct the error.
    pub fn perform_write(&self, ctx: &WizardCtx<'_>) -> Result<String, String> {
        let registry = ctx.schema_registry.ok_or_else(|| {
            "no schema registry available — run from the repo root or pass --schema-path"
                .to_string()
        })?;
        let input = self.build_write_input(ctx.dataset_path, ctx.graph)?;
        write_cascade_token(input, registry)
            .map(|out| out.written_to.display().to_string())
            .map_err(|e| e.to_string())
    }

    /// The assembled token name derived from classification fields (property + name fields).
    pub fn assembled_name(&self) -> String {
        assemble_name_from_classification(&self.classification)
    }

    /// Build the `$schema` + `name` + value fields shared by the write path and the diff
    /// preview. Value fields come from [`design_data_core::authoring::draft::build_value_fields`]
    /// over every mode-combo row (flat `$ref`/`value` for a single default row,
    /// nested `sets` otherwise). Callers add `uuid`/`rationale` as needed.
    fn base_token_map(&self) -> serde_json::Map<String, serde_json::Value> {
        let property = self.classification.property.value().trim().to_string();
        let name_fields = classification_to_name_dtos(&self.classification);
        let value_fields = design_data_core::authoring::draft::build_value_fields(
            &value_rows_to_dtos(&self.values.rows),
        );
        let mut map = serde_json::Map::new();
        if let Some(ref url) = self.schema_url {
            map.insert("$schema".into(), serde_json::Value::String(url.clone()));
        }
        map.insert(
            "name".into(),
            design_data_core::authoring::draft::build_name_object(&property, &name_fields),
        );
        for (field, value) in value_fields {
            map.insert(field, value);
        }
        map
    }

    /// The token JSON object the wizard will write — `$schema` + `name` + value fields +
    /// rationale — **excluding** the generated `uuid`. Both [`Self::perform_write`]
    /// and the diff preview ([`Self::build_diff`]) derive from this single source,
    /// so what you see in the Confirm diff is exactly what lands on disk (sans
    /// uuid). Exposed so tests can assert on the structured shape (e.g.
    /// `sets.light` / `sets.dark`) rather than the rendered diff string.
    pub fn assembled_token(&self) -> serde_json::Value {
        let mut map = self.base_token_map();
        let rationale = self.rationale.value().trim().to_string();
        if !rationale.is_empty() {
            map.insert("rationale".into(), serde_json::Value::String(rationale));
        }
        serde_json::Value::Object(map)
    }

    /// Build a unified diff between the current and predicted post-write state of the
    /// target file.  Populates `self.diff_preview`.  No files are written.
    pub fn build_diff(&mut self, dataset_path: Option<&Path>) {
        let Some(path) = dataset_path else {
            self.diff_preview = None;
            return;
        };

        let property = self.classification.property.value().trim().to_string();
        let target = resolve_target_file(self.classification.layer, &property, path);
        let file_name = target
            .file_name()
            .map(|f| f.to_string_lossy().into_owned())
            .unwrap_or_else(|| "tokens.json".to_string());

        // "before" — existing file content as a cascade array, or empty array.
        let before_raw = if target.exists() {
            std::fs::read_to_string(&target).unwrap_or_else(|_| "[]".to_string())
        } else {
            "[]".to_string()
        };
        let before = if before_raw.ends_with('\n') {
            before_raw.clone()
        } else {
            format!("{before_raw}\n")
        };

        // Mirror the write path exactly (minus the UUID, which is irrelevant to
        // the preview) so the diff matches what gets written: flat `$ref`/`value`
        // for a single default row, nested `sets` for multi-mode rows.
        let token_obj = self.assembled_token();

        // Append to the existing cascade array.
        let mut arr: Vec<serde_json::Value> = serde_json::from_str(&before_raw).unwrap_or_default();
        arr.push(token_obj);
        let after_body = serde_json::to_string_pretty(&serde_json::Value::Array(arr))
            .unwrap_or_else(|_| "[]".to_string());
        let after = format!("{after_body}\n");

        // Build unified diff.
        let diff_text = similar::TextDiff::from_lines(before.as_str(), after.as_str())
            .unified_diff()
            .header(&format!("a/{file_name}"), &format!("b/{file_name}"))
            .to_string();

        // Cap at 200 lines.
        let capped: String = diff_text
            .lines()
            .take(200)
            .collect::<Vec<&str>>()
            .join("\n");
        self.diff_preview = Some(capped);
    }
}

impl Default for WizardState {
    fn default() -> Self {
        Self::new()
    }
}
