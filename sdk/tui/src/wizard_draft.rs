// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! TUI wizard draft persistence — `WizardState` ↔ `WizardDraft` conversions
//! and atomic on-disk save/load.
//!
//! The serializable `WizardDraft` DTO and its sub-types now live in
//! `design_data_core::authoring::draft` so they can be shared with the MCP
//! authoring-session state machine.  This module owns only the TUI-specific
//! conversion functions and the persistence helpers.
//!
//! Transient/derivable fields (suggestions, diff_preview, diff_scroll, error,
//! editing_schema_url, ValuesDraft.editing) are intentionally omitted from the
//! DTO; they are either rebuilt by `refresh_suggestions`/`advance_to_confirm`
//! or start at their default values.

use std::path::PathBuf;

use design_data_core::authoring::draft::{
    ClassificationDraftDto, NameFieldDto, ValueRowDto, ValuesDraftDto, WizardDraft,
};
use tui_input::Input;

use crate::wizard::{ClassificationDraft, NameField, ValueRow, ValuesDraft, WizardState};

// ── WizardState ↔ WizardDraft conversions ────────────────────────────────────

pub fn to_draft(ws: &WizardState) -> WizardDraft {
    WizardDraft {
        screen: ws.screen,
        intent: ws.intent.value().to_string(),
        selected_suggestion: ws.selected_suggestion,
        chosen_path: ws.chosen_path.clone(),
        classification: ClassificationDraftDto {
            layer: ws.classification.layer,
            property: ws.classification.property.value().to_string(),
            name_fields: ws
                .classification
                .name_fields
                .iter()
                .map(|f| NameFieldDto {
                    key: f.key.clone(),
                    value: f.value.value().to_string(),
                })
                .collect(),
            focused_field: ws.classification.focused_field,
        },
        values: ValuesDraftDto {
            rows: ws
                .values
                .rows
                .iter()
                .map(|r| ValueRowDto {
                    mode_combo: r.mode_combo.clone(),
                    kind: r.kind,
                    alias_target: r.alias_target.value().to_string(),
                    literal: r.literal.value().to_string(),
                })
                .collect(),
            selected: ws.values.selected,
        },
        rationale: ws.rationale.value().to_string(),
        schema_url: ws.schema_url.clone(),
        schema_url_input: ws.schema_url_input.value().to_string(),
    }
}

pub fn from_draft(d: WizardDraft) -> WizardState {
    let schema_url_str = d.schema_url_input.clone();
    WizardState {
        screen: d.screen,
        intent: Input::from(d.intent),
        // Transient — rebuilt by refresh_suggestions on the Intent screen.
        suggestions: Vec::new(),
        selected_suggestion: d.selected_suggestion,
        chosen_path: d.chosen_path,
        classification: ClassificationDraft {
            layer: d.classification.layer,
            property: Input::from(d.classification.property),
            name_fields: d
                .classification
                .name_fields
                .into_iter()
                .map(|f| NameField { key: f.key, value: Input::from(f.value) })
                .collect(),
            focused_field: d.classification.focused_field,
        },
        values: ValuesDraft {
            rows: d
                .values
                .rows
                .into_iter()
                .map(|r| ValueRow {
                    mode_combo: r.mode_combo,
                    kind: r.kind,
                    alias_target: Input::from(r.alias_target),
                    literal: Input::from(r.literal),
                })
                .collect(),
            selected: d.values.selected,
            // Transient — reset to false on restore.
            editing: false,
        },
        rationale: Input::from(d.rationale),
        // Transient — rebuilt by advance_to_confirm / build_diff when user reaches Screen 4.
        diff_preview: None,
        diff_scroll: 0,
        schema_url: d.schema_url,
        editing_schema_url: false,
        schema_url_input: Input::from(schema_url_str),
        error: None,
    }
}

// ── On-disk persistence ───────────────────────────────────────────────────────

/// Resolve the path for the persistent wizard draft file.
///
/// Reads `DESIGN_DATA_TUI_WIZARD_DRAFT` env var first (test seam), then falls
/// back to `dirs::data_dir()/design-data-tui/wizard-draft.json`.
pub fn wizard_draft_path() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DESIGN_DATA_TUI_WIZARD_DRAFT") {
        return Some(PathBuf::from(p));
    }
    dirs::data_dir().map(|d| d.join("design-data-tui").join("wizard-draft.json"))
}

/// Load a wizard draft from disk.  Returns `None` on any I/O or parse error.
pub fn load_wizard_draft() -> Option<WizardDraft> {
    let path = wizard_draft_path()?;
    let text = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&text).ok()
}

/// Write the wizard draft to disk atomically (write to `.tmp`, then rename).
pub fn save_wizard_draft(draft: &WizardDraft) {
    let Some(path) = wizard_draft_path() else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let json = match serde_json::to_string_pretty(draft) {
        Ok(j) => j,
        Err(_) => return,
    };
    let tmp = path.with_extension("tmp");
    if std::fs::write(&tmp, &json).is_ok() {
        let _ = std::fs::rename(&tmp, &path);
    }
}

/// Remove the wizard draft file.  Ignores `NotFound`.
pub fn clear_wizard_draft() {
    let Some(path) = wizard_draft_path() else { return };
    let _ = std::fs::remove_file(&path);
}
