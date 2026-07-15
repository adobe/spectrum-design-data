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
//! -{script?}-{family?}-{emphasis?}-{property}-{orientation?}-{position?}-{size?}
//! -{density?}-{shape?}-{state?}-{alignment?}-{qualifier?}-{role?}
//! ```
//!
//! Registry ids are expanded to their `tokenName` long-forms before joining
//! (e.g. `size: "xl"` → `"extra-large"`), mirroring the JS `serialize()` in
//! `tools/token-mapping-analyzer/src/decomposer.js`.
//!
//! Mode-set fields (`colorScheme`, `scale`, `contrast`), the color-domain field
//! (`colorFamily`, `colorRole`), and `scaleIndex` are excluded from the general key.
//! Color-palette tokens have their own path: `{variant?}-{colorFamily}-{scaleIndex?}`.
//! `weight`/`style` (CSS font-weight/font-style values) remain excluded pending their
//! own decomposition pass — only `script`/`family`/`emphasis` are enabled so far.

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

/// Context variant words (`category: "context"` in `variants.json`) that may appear
/// as the leading segment of a legacy key, ahead of `component` — e.g.
/// `inverse-icon-color`. These are the only variants naming-aware since they're the
/// only ones observed to precede `component` in a flat legacy key; other variant
/// categories (emphasis, semantic, color) don't currently appear in this position.
static VARIANT_WORDS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    ["inverse", "static", "over-background"]
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
    pub variant: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}

/// Generate the canonical legacy name from a [`NameObject`].
///
/// Rules:
/// 1. If `variant` is present, emit `{variant}-` first (leads `component`, mirroring
///    the field-catalog serialization order in `extract_legacy_key`).
/// 2. If `component` is present, emit `{component}-`.
/// 3. Always emit `{property}`.
/// 4. If `state` is present, append `-{state}`.
pub fn generate_legacy_name(obj: &NameObject) -> String {
    let mut parts: Vec<&str> = Vec::new();
    if let Some(v) = &obj.variant {
        parts.push(v);
    }
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
/// A known context-variant word (see [`VARIANT_WORDS`]) leading the key is stripped
/// first, since it's ordered before `component` in the legacy key. The component
/// prefix is then stripped from what remains. Finally the trailing segment is
/// checked for a known state word; everything else becomes `property`.
pub fn parse_legacy_name(key: &str, component_hint: Option<&str>) -> NameObject {
    let (variant, rest) = strip_leading_variant(key);

    let remainder = match component_hint {
        Some(c) if rest.starts_with(c) && rest.get(c.len()..c.len() + 1) == Some("-") => {
            &rest[c.len() + 1..]
        }
        _ => rest,
    };

    let (property, state) = split_trailing_state(remainder);

    NameObject {
        property: property.to_string(),
        component: component_hint.map(str::to_string),
        variant: variant.map(str::to_string),
        state: state.map(str::to_string),
    }
}

/// Strip a known leading context-variant segment (e.g. `"inverse-"`) from `key`.
///
/// Returns `(Some(variant), remainder)` when found, else `(None, key)` unchanged.
fn strip_leading_variant(key: &str) -> (Option<&str>, &str) {
    for &v in VARIANT_WORDS.iter() {
        if let Some(rest) = key.strip_prefix(v) {
            if let Some(rest) = rest.strip_prefix('-') {
                return (Some(v), rest);
            }
        }
    }
    (None, key)
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

/// Resolve the legacy `component` metadata value for a name object.
///
/// Legacy output hoists `name.component` to an outer `component` field (see
/// `legacy::build_flat_entry` / `legacy::convert_set`). Icon-family tokens carry
/// `icon` instead of `component`; this expands the short registry id through
/// `tokenName` (e.g. `"add"` → `"add-icon"`) so published legacy output is
/// unaffected by the field rename. Returns `None` when neither field is present.
///
/// This duplicates the "prefer `component`, else expand `icon` via `tokenName`"
/// logic in the owner computation inside [`extract_legacy_key`]'s color-domain
/// branch — the two aren't wired together because one produces key *segments*
/// and the other an outer metadata *field*. Keep them in sync if either's
/// fallback behavior changes.
pub fn resolve_owner_component(name: &Map<String, Value>) -> Option<String> {
    if let Some(c) = name.get("component").and_then(|v| v.as_str()) {
        return Some(c.to_string());
    }
    let icon = name.get("icon").and_then(|v| v.as_str())?;
    let registry = crate::registry::RegistryData::embedded();
    Some(
        registry
            .token_name("icon", icon)
            .unwrap_or(icon)
            .to_string(),
    )
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

    // `legacyKey` escape hatch: pins the exact flat key written to legacy output,
    // independent of the rest of the (fully decomposed) `name` object. Use this when
    // correcting/extending a token's cascade decomposition (e.g. adding `variant`) would
    // otherwise change the key in the published legacy package.
    if let Some(lk) = name.get("legacyKey").and_then(|v| v.as_str()) {
        return Some(lk.to_string());
    }

    // Color-domain serialization — two sub-cases distinguished by owner presence.
    // `owner` is `component`, or `icon` for icon-family tokens (the two are
    // mutually exclusive — a name object never carries both).
    //
    //   Palette ramp (no owner): {variant?}-{colorFamily}-{scaleIndex?}
    //   `property` ("color") is implicit and omitted from the key.
    //   e.g. {colorFamily:"blue", scaleIndex:100} → "blue-100"
    //
    //   Owner color (owner + colorFamily and/or colorRole):
    //   {owner}-{property}-{colorFamily?}-{colorRole?}-{state?}
    //   `property` is always "color". Explicit ordering avoids the position-walk trap
    //   where state@12 < colorFamily@17 would produce the wrong segment order.
    //   `icon` is expanded through its registry `tokenName` (e.g. "checkmark" →
    //   "checkmark-icon") the same way the general position-walk path expands ids.
    //   e.g. {icon:"icon", property:"color", colorFamily:"blue", colorRole:"primary",
    //         state:"default"} → "icon-color-blue-primary-default"
    let color_family = name.get("colorFamily").and_then(|v| v.as_str());
    let color_role = name.get("colorRole").and_then(|v| v.as_str());
    let component = name.get("component").and_then(|v| v.as_str());
    let icon = name.get("icon").and_then(|v| v.as_str());
    let owner = component.or(icon).map(|v| {
        if component.is_some() {
            v.to_string()
        } else {
            crate::registry::RegistryData::embedded()
                .token_name("icon", v)
                .unwrap_or(v)
                .to_string()
        }
    });

    if let Some(cf) = color_family {
        if owner.is_none() {
            // Palette ramp: no owner, property implicit.
            let mut parts: Vec<String> = Vec::new();
            if let Some(v) = name.get("variant").and_then(|v| v.as_str()) {
                parts.push(v.to_string());
            }
            parts.push(cf.to_string());
            if let Some(i) = name.get("scaleIndex").and_then(|v| v.as_i64()) {
                parts.push(i.to_string());
            }
            return Some(parts.join("-"));
        }
    }

    // Owner color: owner present AND at least one of colorFamily/colorRole.
    if owner.is_some() && (color_family.is_some() || color_role.is_some()) {
        let property = name.get("property").and_then(|v| v.as_str())?;
        let mut parts: Vec<String> = Vec::new();
        parts.push(owner.unwrap());
        parts.push(property.to_string());
        if let Some(cf) = color_family {
            parts.push(cf.to_string());
        }
        if let Some(cr) = color_role {
            parts.push(cr.to_string());
        }
        if let Some(st) = name.get("state").and_then(|v| v.as_str()) {
            parts.push(st.to_string());
        }
        return Some(parts.join("-"));
    }

    let property = name.get("property").and_then(|v| v.as_str())?;

    // Icon (non-color) domain: an icon-family token without colorFamily/colorRole
    // (the owner-color branch above didn't apply). Unlike `component`, whose legacy
    // values already match the registry id, `icon` registry ids are the short form
    // (e.g. "add") and expand through `tokenName` to the long form used in legacy
    // keys ("add-icon"). Explicit branch — like the color and space-between cases
    // above — since `icon`'s position (100) sits after `property` in the catalog,
    // so the generic position-walk below can't express the required leading order.
    // e.g. {icon:"add", property:"size-100"} → "add-icon-size-100"
    //
    // Thin-format check mirrors the `component` case just below: some tokens store
    // the full legacy key in `property` already (e.g. property:"icon-color-disabled-
    // primary", icon:"icon"), with `icon` duplicated as a metadata annotation only.
    // Prepending the owner there would double the prefix.
    if let Some(ic) = icon {
        let registry = crate::registry::RegistryData::embedded();
        let ic_expanded = registry.token_name("icon", ic).unwrap_or(ic);
        let is_thin =
            property.starts_with(ic_expanded) && property[ic_expanded.len()..].starts_with('-');
        if is_thin {
            return Some(property.to_string());
        }
        let mut parts: Vec<String> = vec![ic_expanded.to_string(), property.to_string()];
        if let Some(st) = name.get("state").and_then(|v| v.as_str()) {
            parts.push(st.to_string());
        }
        return Some(parts.join("-"));
    }

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

    // Space-between (gap) domain: property is the literal term "space-between" and the
    // real endpoints live in the paired `from`/`to` fields (both excludeFromLegacyKey).
    // The legacy key reconstructs the connective form `{from}-to-{to}` in property's slot
    // (position 6) — an explicit branch, like the color branches above, because the
    // generic position-walk below can't express a joining `-to-` between two field values.
    // e.g. {component:"accordion", property:"space-between", from:"bottom", to:"handle",
    //       size:"xl", state:"hover"} → "accordion-bottom-to-handle-extra-large-hover"
    if property == "space-between" {
        let from = name.get("from").and_then(|v| v.as_str());
        let to = name.get("to").and_then(|v| v.as_str());
        if let (Some(f), Some(t)) = (from, to) {
            let registry = crate::registry::RegistryData::embedded();
            let catalog = crate::registry::FieldCatalog::embedded();
            let mut parts: Vec<String> = Vec::new();

            for entry in catalog.entries_by_position() {
                if entry.exclude_from_legacy_key {
                    continue;
                }
                if entry.name == "property" {
                    let f_expanded = registry.token_name("from", f).unwrap_or(f);
                    let t_expanded = registry.token_name("to", t).unwrap_or(t);
                    parts.push(format!("{f_expanded}-to-{t_expanded}"));
                    continue;
                }
                if let Some(v) = name.get(entry.name).and_then(|v| v.as_str()) {
                    let expanded = registry.token_name(entry.name, v).unwrap_or(v);
                    parts.push(expanded.to_string());
                }
            }

            if parts.is_empty() {
                return None;
            }
            return Some(parts.join("-"));
        }
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
    //   Color-domain (handled by color-domain branch above): colorFamily, colorRole
    //   Integer scale (already embedded in `property`; would double-emit): scaleIndex
    //   Legacy metadata annotations (value already embedded in `property` for all current
    //     tokens): weight, style, structure — if any joins Phase D decomposition, remove
    //     its excludeFromLegacyKey flag and re-verify against the three legacy gates.
    //
    // `family` and `emphasis` (typography-scoped, positions 6/7 — before `property` so
    // e.g. cjk-strong-font-weight serializes as family:"cjk" + emphasis:"strong" +
    // property:"font-weight") were enabled for the pur/typography decomposition pass.

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
    fn extract_key_script_sorts_before_family_and_property() {
        // script (pos 6) before family (pos 7) before emphasis (pos 8) before property (pos 9).
        let name = json!({
            "component": "body",
            "script": "cjk",
            "family": "serif",
            "emphasis": "strong",
            "property": "font-weight"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("body-cjk-serif-strong-font-weight")
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
    fn extract_key_space_between_from_to_reconstructs_connective() {
        // Decomposed space-between: from/to (excludeFromLegacyKey) reconstruct the
        // legacy `{from}-to-{to}` connective in property's slot (pos 6). Same target
        // key as extract_key_taxonomy_ordering_matches_catalog, but from decomposed fields.
        let name = json!({
            "component": "accordion",
            "property": "space-between",
            "from": "bottom",
            "to": "handle",
            "size": "xl",
            "state": "hover"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("accordion-bottom-to-handle-extra-large-hover")
        );
    }

    #[test]
    fn extract_key_space_between_missing_endpoint_falls_through() {
        // property "space-between" but only `from` present (no `to`) → falls through
        // to the generic walk, which pushes the literal "space-between" property value.
        let name = json!({"component": "accordion", "property": "space-between", "from": "bottom"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("accordion-space-between")
        );
    }

    #[test]
    fn extract_key_anatomy_before_property() {
        // anatomy (pos 4) before property (pos 8).
        let name = json!({"component": "button", "anatomy": "icon", "property": "color"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("button-icon-color")
        );
    }

    #[test]
    fn extract_key_family_emphasis_before_property() {
        // family (pos 6) and emphasis (pos 7) precede property (pos 8), matching the
        // real typography legacy name shape: {family}-{emphasis}-{property}.
        let name = json!({"family": "cjk", "emphasis": "strong", "property": "font-weight"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("cjk-strong-font-weight")
        );
    }

    #[test]
    fn extract_key_family_only_before_property() {
        // family present without emphasis: {family}-{property}.
        let name = json!({"family": "sans-serif", "property": "font-family"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("sans-serif-font-family")
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
        // structure, weight, style are legacy-metadata annotations whose values are
        // already embedded in `property` for all current tokens. They carry
        // exclude_from_legacy_key: true so a catalog-walk refactor can't silently re-include them.
        // (`family` was promoted out of this group for the pur/typography pass — see
        // extract_key_family_emphasis_before_property.)
        let name = json!({
            "component": "body",
            "property": "bold-font-weight",
            "structure": "body",
            "weight": "bold",
            "style": "italic"
        });
        let key = extract_legacy_key(&name).unwrap();
        assert_eq!(key, "body-bold-font-weight");
        assert!(
            !key.contains("italic"),
            "style must not appear in legacy key"
        );
    }

    // ── Component color branch (colorRole) ───────────────────────────────────

    #[test]
    fn extract_key_component_color_with_family_and_role() {
        // Component + colorFamily + colorRole → explicit {component}-{property}-{colorFamily}-{colorRole}-{state?}
        let name = json!({
            "component": "icon",
            "property": "color",
            "colorFamily": "blue",
            "colorRole": "primary",
            "state": "default"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("icon-color-blue-primary-default")
        );
    }

    #[test]
    fn extract_key_component_color_background_no_state() {
        let name = json!({
            "component": "icon",
            "property": "color",
            "colorFamily": "red",
            "colorRole": "background"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("icon-color-red-background")
        );
    }

    #[test]
    fn extract_key_component_color_role_only_no_family() {
        // colorRole present, no colorFamily (e.g. "color-primary" → no hue)
        let name = json!({
            "component": "icon",
            "property": "color",
            "colorRole": "primary",
            "state": "default"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("icon-color-primary-default")
        );
    }

    #[test]
    fn extract_key_palette_ramp_unaffected_by_component_color_branch() {
        // Palette ramp (no component) still uses the short form.
        let name = json!({"property": "color", "colorFamily": "blue", "scaleIndex": 700});
        assert_eq!(extract_legacy_key(&name).as_deref(), Some("blue-700"));
    }

    // ── Icon field (SPEC-009 icon-terms) ──────────────────────────────────────

    #[test]
    fn extract_key_icon_color_domain_uses_icon_as_owner() {
        // `icon` stands in for `component` in the owner-color branch; the bare
        // "icon" id has no tokenName expansion (already the legacy form).
        let name = json!({
            "icon": "icon",
            "property": "color",
            "colorScheme": "dark",
            "colorRole": "background",
            "colorFamily": "blue"
        });
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("icon-color-blue-background")
        );
    }

    #[test]
    fn extract_key_icon_non_color_expands_token_name() {
        // General (non-color) icon domain: short registry id "add" expands to
        // "add-icon" and leads `property`, mirroring {icon:"add-icon", property:"size-100"}.
        let name = json!({"icon": "add", "property": "size-100"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("add-icon-size-100")
        );
    }

    #[test]
    fn extract_key_icon_non_color_with_state() {
        let name = json!({"icon": "checkmark", "property": "size", "state": "hover"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("checkmark-icon-size-hover")
        );
    }

    #[test]
    fn extract_key_icon_unregistered_id_falls_back_to_raw_value() {
        // No tokenName expansion available (id not in the registry) — the raw
        // value is used verbatim rather than failing the roundtrip.
        let name = json!({"icon": "unregistered-widget", "property": "size-100"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("unregistered-widget-size-100")
        );
    }

    #[test]
    fn extract_key_icon_thin_format_not_double_prefixed() {
        // Thin cascade format: `property` already holds the full legacy key
        // ("icon-color-disabled-primary"); `icon:"icon"` (which expands to itself,
        // no tokenName mapping) is a metadata duplicate only. Regression test for
        // a bug where the icon branch unconditionally prepended the owner,
        // producing "icon-icon-color-disabled-primary".
        let name = json!({"icon": "icon", "property": "icon-color-disabled-primary"});
        assert_eq!(
            extract_legacy_key(&name).as_deref(),
            Some("icon-color-disabled-primary")
        );
    }
}
