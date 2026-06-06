// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Serializable wizard draft DTOs — shared between the TUI wizard and the
//! MCP authoring-session state machine.
//!
//! These types own their data (no `tui_input::Input`, no rendering state) so
//! they can live in core without pulling in any TUI-specific dependencies.
//! `tui_input::Input` collapses to `String` on the boundary.

use serde::{Deserialize, Serialize};

use crate::graph::Layer;

// ── Screen and path enums ─────────────────────────────────────────────────────

/// The four screens of the token authoring wizard (RFC #973 §3.10–§3.15).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WizardPath {
    CreateNew,
    AliasToExisting(String),
}

/// Whether a value row holds an alias or a literal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValueKind {
    Alias,
    Literal,
}

// ── DTOs (serializable mirror of TUI wizard state) ────────────────────────────

/// Serializable snapshot of the full wizard state.
///
/// `tui_input::Input` fields are collapsed to `String`; rehydrate via
/// `Input::from(s)` on the TUI side. Transient fields
/// (`suggestions`, `diff_preview`, `diff_scroll`, `error`,
/// `editing_schema_url`, `ValuesDraft.editing`) are intentionally omitted.
///
/// **Schema compatibility note:** Add new optional fields with `#[serde(default)]`
/// so old drafts remain loadable after field additions.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WizardDraft {
    pub screen: WizardScreen,
    pub intent: String,
    pub selected_suggestion: usize,
    pub chosen_path: WizardPath,
    pub classification: ClassificationDraftDto,
    pub values: ValuesDraftDto,
    pub rationale: String,
    pub schema_url: Option<String>,
    pub schema_url_input: String,
}

impl WizardDraft {
    /// Fresh draft with all fields at their default starting values.
    pub fn new() -> Self {
        Self {
            screen: WizardScreen::Intent,
            intent: String::new(),
            selected_suggestion: 0,
            chosen_path: WizardPath::CreateNew,
            classification: ClassificationDraftDto {
                layer: Layer::Foundation,
                property: String::new(),
                name_fields: Vec::new(),
                focused_field: 0,
            },
            values: ValuesDraftDto {
                rows: Vec::new(),
                selected: 0,
            },
            rationale: String::new(),
            schema_url: None,
            schema_url_input: String::new(),
        }
    }
}

impl Default for WizardDraft {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClassificationDraftDto {
    pub layer: Layer,
    pub property: String,
    pub name_fields: Vec<NameFieldDto>,
    /// TUI-only cursor position; not meaningful for MCP sessions.
    #[serde(skip)]
    pub focused_field: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NameFieldDto {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValuesDraftDto {
    pub rows: Vec<ValueRowDto>,
    /// TUI-only cursor position; not meaningful for MCP sessions.
    #[serde(skip)]
    pub selected: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueRowDto {
    pub mode_combo: Vec<(String, String)>,
    pub kind: ValueKind,
    pub alias_target: String,
    pub literal: String,
}

// ── Token value assembly (shared TUI wizard + MCP authoring session) ──────────

/// Build the value-bearing fields of a token from a set of wizard value rows.
///
/// Returns a JSON object fragment containing exactly one of:
/// - nothing (no rows),
/// - a flat `$ref` (single row, alias kind, no mode conditions),
/// - a flat `value` (single row, literal kind, no mode conditions),
/// - a nested `sets` object (multiple rows, or any mode-conditional row).
///
/// This is the single source of truth for translating Screen 3 value rows into
/// token JSON. Both the TUI wizard (`design-data-tui`) and the MCP authoring
/// session call it so they emit identical multi-mode token shapes — previously
/// the TUI assembled JSON from the first row only, silently dropping every
/// other mode combination. `$ref` is the canonical alias key understood by the
/// graph loader, migrator, and SPEC-001 validator.
pub fn build_value_fields(rows: &[ValueRowDto]) -> serde_json::Map<String, serde_json::Value> {
    let mut fields = serde_json::Map::new();
    match rows {
        [] => {}
        [single] if single.mode_combo.is_empty() => match single.kind {
            ValueKind::Alias => {
                fields.insert(
                    "$ref".into(),
                    serde_json::Value::String(single.alias_target.clone()),
                );
            }
            ValueKind::Literal => {
                fields.insert(
                    "value".into(),
                    serde_json::Value::String(single.literal.clone()),
                );
            }
        },
        rows => {
            fields.insert("sets".into(), build_sets_from_rows(rows));
        }
    }
    fields
}

/// Build the structured `name` object: `{ "property": ..., <name_fields>... }`.
///
/// Single source of truth shared by the MCP authoring session and TUI wizard.
pub fn build_name_object(property: &str, name_fields: &[NameFieldDto]) -> serde_json::Value {
    let mut name_obj = serde_json::Map::new();
    name_obj.insert(
        "property".into(),
        serde_json::Value::String(property.to_string()),
    );
    for field in name_fields {
        name_obj.insert(
            field.key.clone(),
            serde_json::Value::String(field.value.clone()),
        );
    }
    serde_json::Value::Object(name_obj)
}

/// Canonical token key from a property name and name-field values.
///
/// Joins the non-empty trimmed parts with `-`, e.g. `"color"` + `["dark"]` →
/// `Some("color-dark")`.  Returns `None` when every part is empty or whitespace,
/// leaving the caller to choose an appropriate fallback:
///
/// - `session::derive_token_key` maps `None` → `"unnamed-token"` (MCP session behavior).
/// - `tui::assemble_name_from_classification` maps `None` → `""` (preview shows nothing
///   while the wizard is unfilled, so `build_write_input` can reject on empty).
///
/// This is the single source of truth for the join rule shared by both callers.
pub fn derive_token_key_from_parts<'a>(
    property: &'a str,
    field_values: impl Iterator<Item = &'a str>,
) -> Option<String> {
    let parts: Vec<&str> = std::iter::once(property)
        .chain(field_values)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("-"))
    }
}

/// Recursively build a `sets` object from a slice of value rows.
///
/// Rows are grouped by their first mode-combo dimension value; each group is
/// either a leaf (single row, no remaining dimensions) or recurses into an
/// inner `sets` layer.
fn build_sets_from_rows(rows: &[ValueRowDto]) -> serde_json::Value {
    let mut groups: std::collections::BTreeMap<String, Vec<ValueRowDto>> =
        std::collections::BTreeMap::new();

    for row in rows {
        if row.mode_combo.is_empty() {
            // Flat row mixed into a multi-row set — skip rather than silently
            // collide; callers should ensure consistency.
            continue;
        }
        let first_val = row.mode_combo[0].1.clone();
        let mut sub = row.clone();
        sub.mode_combo = row.mode_combo[1..].to_vec();
        groups.entry(first_val).or_default().push(sub);
    }

    let mut sets_map = serde_json::Map::new();
    for (key, sub_rows) in &groups {
        let entry = if sub_rows.len() == 1 && sub_rows[0].mode_combo.is_empty() {
            let mut leaf = serde_json::Map::new();
            match sub_rows[0].kind {
                ValueKind::Alias => {
                    leaf.insert(
                        "$ref".into(),
                        serde_json::Value::String(sub_rows[0].alias_target.clone()),
                    );
                }
                ValueKind::Literal => {
                    leaf.insert(
                        "value".into(),
                        serde_json::Value::String(sub_rows[0].literal.clone()),
                    );
                }
            }
            serde_json::Value::Object(leaf)
        } else {
            let inner = build_sets_from_rows(sub_rows);
            let mut wrapper = serde_json::Map::new();
            wrapper.insert("sets".into(), inner);
            serde_json::Value::Object(wrapper)
        };
        sets_map.insert(key.clone(), entry);
    }

    serde_json::Value::Object(sets_map)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── derive_token_key_from_parts ────────────────────────────────────────────

    #[test]
    fn key_parts_joined_with_dash() {
        assert_eq!(
            derive_token_key_from_parts("color", ["dark", "hover"].iter().copied()),
            Some("color-dark-hover".to_string())
        );
    }

    #[test]
    fn key_parts_skips_empty_fields() {
        assert_eq!(
            derive_token_key_from_parts("color", ["", "hover"].iter().copied()),
            Some("color-hover".to_string())
        );
    }

    #[test]
    fn key_parts_only_property() {
        assert_eq!(
            derive_token_key_from_parts("color", std::iter::empty()),
            Some("color".to_string())
        );
    }

    #[test]
    fn key_parts_all_empty_returns_none() {
        assert_eq!(derive_token_key_from_parts("", std::iter::empty()), None);
    }

    #[test]
    fn key_parts_whitespace_trimmed() {
        assert_eq!(
            derive_token_key_from_parts("  color  ", ["  dark  "].iter().copied()),
            Some("color-dark".to_string())
        );
    }

    fn alias_row(modes: &[(&str, &str)], target: &str) -> ValueRowDto {
        ValueRowDto {
            mode_combo: modes
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            kind: ValueKind::Alias,
            alias_target: target.to_string(),
            literal: String::new(),
        }
    }

    fn literal_row(modes: &[(&str, &str)], value: &str) -> ValueRowDto {
        ValueRowDto {
            mode_combo: modes
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            kind: ValueKind::Literal,
            alias_target: String::new(),
            literal: value.to_string(),
        }
    }

    #[test]
    fn build_name_object_property_only() {
        let name = build_name_object("background-color", &[]);
        let obj = name.as_object().unwrap();
        assert_eq!(obj["property"], "background-color");
        assert_eq!(obj.len(), 1);
    }

    #[test]
    fn build_name_object_includes_name_fields() {
        let name = build_name_object(
            "background-color",
            &[NameFieldDto {
                key: "variant".into(),
                value: "accent".into(),
            }],
        );
        let obj = name.as_object().unwrap();
        assert_eq!(obj["property"], "background-color");
        assert_eq!(obj["variant"], "accent");
    }

    #[test]
    fn build_value_fields_empty_rows_is_empty() {
        assert!(build_value_fields(&[]).is_empty());
    }

    #[test]
    fn build_value_fields_single_alias_is_flat_ref() {
        let fields = build_value_fields(&[alias_row(&[], "gray-900")]);
        assert_eq!(fields["$ref"], "gray-900");
        assert!(!fields.contains_key("sets"));
    }

    #[test]
    fn build_value_fields_single_literal_is_flat_value() {
        let fields = build_value_fields(&[literal_row(&[], "rgb(0, 0, 0)")]);
        assert_eq!(fields["value"], "rgb(0, 0, 0)");
        assert!(!fields.contains_key("sets"));
    }

    #[test]
    fn build_value_fields_multi_mode_emits_every_row() {
        let fields = build_value_fields(&[
            literal_row(&[("colorScheme", "light")], "white"),
            literal_row(&[("colorScheme", "dark")], "black"),
        ]);
        let sets = fields["sets"].as_object().unwrap();
        assert_eq!(sets["light"]["value"], "white");
        assert_eq!(sets["dark"]["value"], "black");
    }

    #[test]
    fn build_value_fields_nested_mode_dimensions_recurse() {
        let fields = build_value_fields(&[
            alias_row(&[("colorScheme", "light"), ("scale", "desktop")], "a"),
            alias_row(&[("colorScheme", "light"), ("scale", "mobile")], "b"),
            alias_row(&[("colorScheme", "dark"), ("scale", "desktop")], "c"),
            alias_row(&[("colorScheme", "dark"), ("scale", "mobile")], "d"),
        ]);
        let sets = fields["sets"].as_object().unwrap();
        assert_eq!(sets["light"]["sets"]["desktop"]["$ref"], "a");
        assert_eq!(sets["light"]["sets"]["mobile"]["$ref"], "b");
        assert_eq!(sets["dark"]["sets"]["desktop"]["$ref"], "c");
        assert_eq!(sets["dark"]["sets"]["mobile"]["$ref"], "d");
    }
}
