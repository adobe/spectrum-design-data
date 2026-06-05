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
//! `core::write::write_token` and records the token to disk.

use std::path::{Path, PathBuf};

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph};
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use design_data_core::suggest::{self, SuggestionResult};
use design_data_core::write::{layer_target_filename, write_token, WriteTokenInput};
use tui_input::backend::crossterm::EventHandler;
use tui_input::Input;
use uuid::Uuid;

/// Minimal graph context passed to wizard key handlers.
pub struct WizardCtx<'a> {
    pub graph: &'a TokenGraph,
    pub token_index: TokenIndex,
    pub dataset_path: Option<&'a Path>,
    pub schema_registry: Option<&'a SchemaRegistry>,
    /// When true, Screen 4 Submit writes to disk via `write_token`.
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
    /// `$schema` URL inferred or entered by the user; required for `write_token`.
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
        // Ctrl-C should not be consumed here — App handles it above us.
        // Ctrl-S on Screen 4 opens the schema URL editor (safe since it uses a modifier).
        if key.modifiers.contains(KeyModifiers::CONTROL) {
            if key.code == KeyCode::Char('s') && self.screen == WizardScreen::Confirm {
                self.editing_schema_url = true;
                return WizardEvent::Continue;
            }
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
                KeyCode::Esc => {
                    self.editing_schema_url = false;
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

    // ── Public helpers ───────────────────────────────────────────────────────

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

    /// Assemble the owned [`WriteTokenInput`] for this wizard without touching the
    /// schema registry or performing any disk write.
    ///
    /// Split out from [`perform_write`](Self::perform_write) so the `update`
    /// runtime can build the input synchronously and move it into a `Task::Cmd`
    /// closure (which requires `Send + 'static`), keeping `update` free of I/O.
    pub fn build_write_input(
        &self,
        dataset_path: Option<&Path>,
        graph: &TokenGraph,
    ) -> Result<WriteTokenInput, String> {
        let dataset_path = dataset_path.ok_or_else(|| "no dataset path available".to_string())?;

        let key = self.assembled_name();
        if key.is_empty() {
            return Err("assembled token name is empty — fill in Property on Screen 2".to_string());
        }

        let property = self.classification.property.value().trim().to_string();
        let target = resolve_target_file(self.classification.layer, &property, dataset_path);

        // The exact token JSON the diff preview shows (`$schema` + value fields
        // from every mode-combo row + rationale), plus a fresh UUID for the new
        // token. Rationale is pre-injected so schema validation can see it;
        // write_token also receives it via WriteTokenInput::rationale and merges
        // with or_insert_with, so the field is never written twice.
        let mut token_obj = self.assembled_token();
        if let Some(obj) = token_obj.as_object_mut() {
            obj.insert(
                "uuid".into(),
                serde_json::Value::String(Uuid::new_v4().to_string()),
            );
        }
        let rationale_text = self.rationale.value().trim().to_string();

        let is_override = graph.tokens.contains_key(&key);

        let pc_path = dataset_path.join("product-context.json");
        let product_context = if pc_path.exists() {
            Some(pc_path)
        } else {
            None
        };

        Ok(WriteTokenInput {
            key,
            token: token_obj,
            target,
            product_context,
            rationale: Some(rationale_text),
            created_at: None,
            is_override,
        })
    }

    /// Attempt to write the token to disk using `write_token`.
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
        write_token(input, registry)
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
        let key = if key.is_empty() {
            "new-token".to_string()
        } else {
            key
        };

        // Mirror the write path exactly (minus the UUID, which is irrelevant to
        // the preview) so the diff matches what gets written: flat `$ref`/`value`
        // for a single default row, nested `sets` for multi-mode rows.
        let token_obj = self.assembled_token();

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

// ── Internal helpers ─────────────────────────────────────────────────────────

/// Derive the target file path from `layer` and `property`.
///
/// Return the target file path for `layer` inside `dataset_path`.
///
/// Delegates to [`design_data_core::write::layer_target_filename`] so the
/// layer → filename convention stays in one place.
/// `_property` is reserved for future sub-property routing.
fn resolve_target_file(layer: Layer, _property: &str, dataset_path: &Path) -> PathBuf {
    dataset_path.join(layer_target_filename(layer))
}

/// Scan the graph for a token whose `name.property` matches `property` and
/// return its `$schema` URL.
///
/// Delegates to [`design_data_core::graph::TokenGraph::infer_schema_url`].
fn infer_schema_url(graph: &TokenGraph, property: &str) -> Option<String> {
    graph.infer_schema_url(property)
}

/// Convert TUI classification name fields into the serializable DTO shape consumed by
/// [`design_data_core::authoring::draft::build_name_object`].
fn classification_to_name_dtos(
    classification: &ClassificationDraft,
) -> Vec<design_data_core::authoring::draft::NameFieldDto> {
    classification
        .name_fields
        .iter()
        .map(|f| design_data_core::authoring::draft::NameFieldDto {
            key: f.key.clone(),
            value: f.value.value().trim().to_string(),
        })
        .collect()
}

/// Convert TUI value rows into the serializable DTO shape consumed by
/// [`design_data_core::authoring::draft::build_value_fields`].
///
/// `tui_input::Input` collapses to `String` on the boundary, mirroring the
/// `WizardState` → `WizardDraft` conversion in `wizard_draft::to_draft`.
fn value_rows_to_dtos(rows: &[ValueRow]) -> Vec<design_data_core::authoring::draft::ValueRowDto> {
    rows.iter()
        .map(|r| design_data_core::authoring::draft::ValueRowDto {
            mode_combo: r.mode_combo.clone(),
            kind: r.kind,
            alias_target: r.alias_target.value().to_string(),
            literal: r.literal.value().to_string(),
        })
        .collect()
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
                alias_target: seed_alias(graph, intent, property_hint.as_deref()),
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
