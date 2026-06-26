// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Legacy name generation and parsing for the name-object ↔ kebab-case roundtrip.
//!
//! The **canonical generation order** for a legacy token name is driven by the field
//! catalog (`packages/design-data/fields/*.json`, `serialization.position` order).
//! For tokens with decomposed taxonomy fields the effective order is:
//!
//! ```text
//! {variant?}-{component?}-{structure?}-{substructure?}-{anatomy?}-{object?}
//! -{property}-{orientation?}-{position?}-{size?}-{density?}-{shape?}-{state?}
//! ```
//!
//! Registry ids are expanded to their `tokenName` long-forms before joining
//! (e.g. `size: "xl"` → `"extra-large"`), mirroring the JS `serialize()` in
//! `tools/token-mapping-analyzer/src/decomposer.js`.
//!
//! Mode-set fields (`colorScheme`, `scale`, `contrast`), the color-domain field
//! (`colorFamily`), and `scaleIndex` are excluded from the general key. Color-palette
//! tokens have their own path: `{variant?}-{colorFamily}-{scaleIndex?}`.

use std::collections::HashSet;
use std::path::Path;
use std::sync::LazyLock;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Well-known interactive / semantic state words that may appear as the
/// trailing segment(s) of a legacy token name.
static STATE_WORDS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "default",
        "hover",
        "down",
        "focus",
        "selected",
        "disabled",
        "key-focus",
        "emphasized",
        "error",
        "invalid",
        "active",
        "open",
        "closed",
        "indeterminate",
        "keyboard-focus",
    ]
    .into_iter()
    .collect()
});

/// Structured identity extracted from (or mapped to) a legacy kebab-case key.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NameObject {
    pub property: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}

/// Generate the canonical legacy name from a [`NameObject`].
///
/// Rules:
/// 1. If `component` is present, emit `{component}-{property}`.
/// 2. If `state` is present, append `-{state}`.
pub fn generate_legacy_name(obj: &NameObject) -> String {
    let mut parts: Vec<&str> = Vec::new();
    if let Some(c) = &obj.component {
        parts.push(c);
    }
    parts.push(&obj.property);
    if let Some(s) = &obj.state {
        parts.push(s);
    }
    parts.join("-")
}

/// Attempt to decompose a legacy key into a [`NameObject`].
///
/// `component_hint` comes from the legacy JSON body's `"component"` field when
/// present and is trusted for stripping the prefix.
///
/// After stripping the component prefix the remainder is split: if the **last**
/// hyphen-segment is a known state word it becomes `state`; everything else
/// becomes `property`.
pub fn parse_legacy_name(key: &str, component_hint: Option<&str>) -> NameObject {
    let remainder = match component_hint {
        Some(c) if key.starts_with(c) && key.get(c.len()..c.len() + 1) == Some("-") => {
            &key[c.len() + 1..]
        }
        _ => key,
    };

    let (property, state) = split_trailing_state(remainder);

    NameObject {
        property: property.to_string(),
        component: component_hint.map(str::to_string),
        state: state.map(str::to_string),
    }
}

/// Split a remainder string into `(property, Option<state>)` by checking
/// whether the last hyphen-delimited segment is a known state word.
///
/// Compound states like `key-focus` are two raw segments that form a single
/// state token; we try the two-segment suffix first.
fn split_trailing_state(s: &str) -> (&str, Option<&str>) {
    // Try two-segment compound states first (e.g., "key-focus", "keyboard-focus").
    if let Some(pos) = s.rmatch_indices('-').nth(1) {
        let candidate = &s[pos.0 + 1..];
        if STATE_WORDS.contains(candidate) {
            let prop = &s[..pos.0];
            if !prop.is_empty() {
                return (prop, Some(candidate));
            }
        }
    }

    // Try single-segment state.
    if let Some(pos) = s.rfind('-') {
        let candidate = &s[pos + 1..];
        if STATE_WORDS.contains(candidate) {
            let prop = &s[..pos];
            if !prop.is_empty() {
                return (prop, Some(candidate));
            }
        }
    }

    (s, None)
}

/// Extract the canonical legacy kebab-case key from a cascade `name` value.
///
/// Handles two name forms:
///
/// * **String** (SPEC-017 escape hatch): the string *is* the legacy key.
/// * **Object**: reconstructed by domain-aware rules:
///   - *Color-domain* (name has `colorFamily`):
///     `{variant?}-{colorFamily}-{scaleIndex?}` — `property` is implicit ("color") and not
///     serialized in the legacy key.
///   - *General* (all other tokens): uses [`generate_legacy_name`] which produces
///     `{component?}-{property}-{state?}`. For thin-format cascade tokens where
///     `property` already contains the full legacy key (possibly with component prefix),
///     the result equals `property` directly.
///
/// Returns `None` only when the name is not a recognised shape (neither string nor object
/// with a `property` field).
pub fn extract_legacy_key(name_val: &Value) -> Option<String> {
    // String escape hatch: the string IS the legacy key.
    if let Some(s) = name_val.as_str() {
        return Some(s.to_string());
    }

    let name: &Map<String, Value> = name_val.as_object()?;

    // Color-domain serialization: {variant?}-{colorFamily}-{scaleIndex?}
    // `property` ("color") is implicit for palette tokens and omitted from the key.
    if let Some(color_family) = name.get("colorFamily").and_then(|v| v.as_str()) {
        let mut parts: Vec<String> = Vec::new();
        if let Some(v) = name.get("variant").and_then(|v| v.as_str()) {
            parts.push(v.to_string());
        }
        parts.push(color_family.to_string());
        if let Some(i) = name.get("scaleIndex").and_then(|v| v.as_i64()) {
            parts.push(i.to_string());
        }
        return Some(parts.join("-"));
    }

    let property = name.get("property").and_then(|v| v.as_str())?;
    let component = name.get("component").and_then(|v| v.as_str());

    // Thin-format detection: `property` already begins with `{component}-`.
    // In the thin cascade format the full legacy key is stored in `property`; component is
    // duplicated as a metadata annotation only. Using `generate_legacy_name` would double
    // the prefix, so we return `property` directly.
    // `property[c.len()..].starts_with('-')` is idiomatic and avoids the byte-boundary
    // concern of a range index when `c` contains a multibyte character.
    let is_thin =
        component.is_some_and(|c| property.starts_with(c) && property[c.len()..].starts_with('-'));

    if is_thin {
        return Some(property.to_string());
    }

    // Decomposed/general format: walk the field catalog in serialization-position order,
    // expanding registry ids to their tokenName long-forms (e.g. size:"xl" → "extra-large").
    // Mirrors the JS serialize() in tools/token-mapping-analyzer/src/decomposer.js.
    //
    // Fields marked `excludeFromLegacyKey: true` in their packages/design-data/fields/*.json
    // declaration are skipped. Exclusion is opt-in — a new catalog field is NOT emitted into
    // the legacy key unless it explicitly opts in by omitting the flag (default false). This
    // replaced the prior opt-out SKIP const (ye1.9).
    //
    // Currently excluded fields, grouped by reason (see each field's JSON for per-field notes):
    //   Mode-set selectors (not part of the legacy name): colorScheme, scale, contrast
    //   Color-domain (handled by colorFamily branch above): colorFamily
    //   Integer scale (already embedded in `property`; would double-emit): scaleIndex
    //   Legacy metadata annotations (value already embedded in `property` for all current
    //     tokens): weight, family, style, structure — if any joins Phase D decomposition,
    //     remove its excludeFromLegacyKey flag and re-verify against the three legacy gates.

    let registry = crate::registry::RegistryData::embedded();
    let catalog = crate::registry::FieldCatalog::embedded();
    let mut parts: Vec<String> = Vec::new();

    for entry in catalog.entries_by_position() {
        if entry.exclude_from_legacy_key {
            continue;
        }
        if let Some(v) = name.get(entry.name).and_then(|v| v.as_str()) {
            // Expand short id to long-form tokenName (e.g. "xl" → "extra-large");
            // fall back to the raw value when no expansion is defined.
            let expanded = registry.token_name(entry.name, v).unwrap_or(v);
            parts.push(expanded.to_string());
        }
    }

    // ponytail: scaleIndex is not appended here because:
    //   - Color tokens (blue-100, etc.) reach this path only without colorFamily, which
    //     is extremely rare; their scaleIndex is handled by the colorFamily branch above.
    //   - Typography scale tokens pack scaleIndex into `property` already ("font-size-100").
    // If a future decomposition strips scaleIndex from property for a general-domain token,
    // revisit this path and add the conditional append.

    if parts.is_empty() {
        return None;
    }
    Some(parts.join("-"))
}

/// An entry in the naming-exceptions.json allowlist.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamingException {
    pub token: String,
    pub file: String,
    pub category: String,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested: Option<String>,
}

/// Top-level shape of the exceptions file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamingExceptionsFile {
    #[serde(rename = "$schema", skip_serializing_if = "Option::is_none")]
    pub schema: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub exceptions: Vec<NamingException>,
}

impl NamingExceptionsFile {
    pub fn load(path: &Path) -> Result<Self, crate::CoreError> {
        let text = std::fs::read_to_string(path)?;
        let file: Self = serde_json::from_str(&text)?;
        Ok(file)
    }

    pub fn token_set(&self) -> HashSet<String> {
        self.exceptions.iter().map(|e| e.token.clone()).collect()
    }
}

/// Check whether `key` roundtrips through parse → generate **and** that no
/// state word is embedded inside the `property` portion (which would indicate
/// the legacy name has state in a non-canonical position).
pub fn roundtrips(key: &str, component_hint: Option<&str>) -> bool {
    let obj = parse_legacy_name(key, component_hint);
    if generate_legacy_name(&obj) != key {
        return false;
    }
    !has_embedded_state(&obj.property)
}

/// Returns `true` when the property string contains a known state word as a
/// hyphen-delimited segment in a non-trailing position, indicating the
/// legacy name encoded state before property.
fn has_embedded_state(property: &str) -> bool {
    let segments: Vec<&str> = property.split('-').collect();
    if segments.len() <= 1 {
        return false;
    }
    // Check every segment except the last (the last is already handled by
    // split_trailing_state during parse).
    for (i, seg) in segments.iter().enumerate() {
        if i == segments.len() - 1 {
            continue;
        }
        if STATE_WORDS.contains(seg) {
            return true;
        }
        // Two-segment compounds: check "{seg}-{next}". The outer loop already
        // excludes the last segment, so segments[i+1] always exists here.
        let compound = format!("{}-{}", seg, segments[i + 1]);
        if STATE_WORDS.contains(compound.as_str()) {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_component_property() {
        let obj = parse_legacy_name("checkbox-control-size", Some("checkbox"));
        assert_eq!(obj.component.as_deref(), Some("checkbox"));
        assert_eq!(obj.property, "control-size");
        assert_eq!(obj.state, None);
        assert!(roundtrips("checkbox-control-size", Some("checkbox")));
    }

    #[test]
    fn component_property_state() {
        let obj = parse_legacy_name("menu-item-background-color-hover", Some("menu-item"));
        assert_eq!(obj.component.as_deref(), Some("menu-item"));
        assert_eq!(obj.property, "background-color");
        assert_eq!(obj.state.as_deref(), Some("hover"));
        assert!(roundtrips(
            "menu-item-background-color-hover",
            Some("menu-item")
        ));
    }

    #[test]
    fn foundation_no_component() {
        let obj = parse_legacy_name("corner-radius-100", None);
        assert_eq!(obj.component, None);
        assert_eq!(obj.property, "corner-radius-100");
        assert_eq!(obj.state, None);
        assert!(roundtrips("corner-radius-100", None));
    }

    #[test]
    fn compound_state_key_focus() {
        let obj = parse_legacy_name(
            "menu-item-background-color-keyboard-focus",
            Some("menu-item"),
        );
        assert_eq!(obj.state.as_deref(), Some("keyboard-focus"));
        assert_eq!(obj.property, "background-color");
        assert!(roundtrips(
            "menu-item-background-color-keyboard-focus",
            Some("menu-item")
        ));
    }

    #[test]
    fn state_first_does_not_roundtrip() {
        // "swatch-disabled-icon-border-color" has "disabled" before property.
        // parse_legacy_name will treat trailing "color" as property (not a state),
        // so the generated name won't match.
        assert!(!roundtrips(
            "swatch-disabled-icon-border-color",
            Some("swatch")
        ));
    }

    #[test]
    fn non_decomposable() {
        let obj = parse_legacy_name("white", None);
        assert_eq!(obj.property, "white");
        assert_eq!(obj.state, None);
        assert!(roundtrips("white", None));
    }

    #[test]
    fn foundation_with_trailing_state() {
        let obj = parse_legacy_name("accent-background-color-default", None);
        assert_eq!(obj.property, "accent-background-color");
        assert_eq!(obj.state.as_deref(), Some("default"));
        assert!(roundtrips("accent-background-color-default", None));
    }

    // ── extract_legacy_key ────────────────────────────────────────────────────

    use serde_json::json;

    #[test]
    fn extract_key_string_escape_hatch() {
        // String names (SPEC-017 escape hatch) are returned verbatim.
        let name = json!("drop-shadow-emphasized-default-color");
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("drop-shadow-emphasized-default-color")
        );
    }

    #[test]
    fn extract_key_color_family_with_scale_index() {
        // Color-domain: {colorFamily}-{scaleIndex}, property ("color") is implicit.
        let name = json!({"property": "color", "colorFamily": "blue", "scaleIndex": 100});
        assert_eq!(extract_legacy_key(&name).as_deref(), Some("blue-100"));
    }

    #[test]
    fn extract_key_color_family_no_scale_index() {
        let name = json!({"property": "color", "colorFamily": "black"});
        assert_eq!(extract_legacy_key(&name).as_deref(), Some("black"));
    }

    #[test]
    fn extract_key_color_family_with_variant() {
        let name = json!({"property": "color", "colorFamily": "cinnamon", "variant": "primary"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("primary-cinnamon")
        );
    }

    #[test]
    fn extract_key_decomposed_component_property_state() {
        // General / decomposed format: generate_legacy_name path.
        let name = json!({"component": "button", "property": "background-color", "state": "hover"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("button-background-color-hover")
        );
    }

    #[test]
    fn extract_key_thin_format_property_is_full_key() {
        // Thin format: property starts with component prefix → return property directly.
        let name = json!({"property": "swatch-disabled-icon-border-color", "component": "swatch"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("swatch-disabled-icon-border-color")
        );
    }

    #[test]
    fn extract_key_no_property_uses_color_domain() {
        // Object with colorFamily but no property → color-domain path still works
        // (property is implicit for palette tokens).
        let name = json!({"colorFamily": "blue"});
        assert_eq!(extract_legacy_key(&name).as_deref(), Some("blue"));
    }

    #[test]
    fn extract_key_no_property_no_color_family_returns_none() {
        // Object with neither property nor colorFamily → None.
        let name = json!({"state": "hover"});
        assert_eq!(extract_legacy_key(&name), None);
    }

    #[test]
    fn extract_key_non_string_non_object_returns_none() {
        assert_eq!(extract_legacy_key(&json!(null)), None);
        assert_eq!(extract_legacy_key(&json!(42)), None);
    }

    // ── Decomposed taxonomy fields ────────────────────────────────────────────

    #[test]
    fn extract_key_with_size_field_expands_token_name() {
        // size "xl" → tokenName "extra-large"; field catalog puts size (pos 9)
        // after property (pos 6), so order is: component-property-size.
        let name = json!({"component": "button", "property": "background-color", "size": "xl"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("button-background-color-extra-large")
        );
    }

    #[test]
    fn extract_key_taxonomy_ordering_matches_catalog() {
        // size (pos 9) after property (pos 6), state (pos 12) last.
        let name = json!({
            "component": "accordion",
            "property": "bottom-to-handle",
            "size": "xl",
            "state": "hover"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("accordion-bottom-to-handle-extra-large-hover")
        );
    }

    #[test]
    fn extract_key_anatomy_before_property() {
        // anatomy (pos 4) before property (pos 6).
        let name = json!({"component": "button", "anatomy": "icon", "property": "color"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("button-icon-color")
        );
    }

    #[test]
    fn extract_key_mode_set_fields_excluded_from_key() {
        // colorScheme, scale, contrast are dimension selectors — not part of the legacy key.
        let name = json!({
            "component": "button",
            "property": "background-color",
            "colorScheme": "light",
            "scale": "desktop",
            "contrast": "high"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("button-background-color")
        );
    }

    #[test]
    fn extract_key_legacy_annotation_fields_excluded_from_key() {
        // structure, family, weight, style are legacy-metadata annotations whose values
        // are already embedded in `property` for all current tokens. They carry
        // exclude_from_legacy_key: true so a catalog-walk refactor can't silently re-include them.
        let name = json!({
            "component": "body",
            "property": "bold-font-weight",
            "structure": "body",
            "family": "adobe-clean",
            "weight": "bold",
            "style": "italic"
        });
        let key = extract_legacy_key(&name).unwrap();
        assert_eq!(key, "body-bold-font-weight");
        assert!(
            !key.contains("adobe-clean"),
            "family must not appear in legacy key"
        );
        assert!(
            !key.contains("italic"),
            "style must not appear in legacy key"
        );
    }
}
