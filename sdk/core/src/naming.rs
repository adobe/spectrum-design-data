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
//! The **canonical generation order** for a legacy token name is:
//!
//! ```text
//! {component}-{property}-{state}
//! ```
//!
//! Where `component` and `state` are optional. Foundation tokens (no component)
//! produce just `{property}` or `{property}-{state}`.

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
    let state = name.get("state").and_then(|v| v.as_str());

    // Thin-format detection: `property` already begins with `{component}-`.
    // In the thin cascade format the full legacy key is stored in `property`; component is
    // duplicated as a metadata annotation only. Using `generate_legacy_name` would double
    // the prefix, so we return `property` directly.
    let is_thin = component.is_some_and(|c| {
        property.starts_with(c) && property.get(c.len()..c.len() + 1) == Some("-")
    });

    if is_thin {
        return Some(property.to_string());
    }

    // Decomposed/general format: reconstruct via generate_legacy_name.
    Some(generate_legacy_name(&NameObject {
        property: property.to_string(),
        component: component.map(str::to_string),
        state: state.map(str::to_string),
    }))
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
}
