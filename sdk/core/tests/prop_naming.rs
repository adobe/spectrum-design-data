// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Property-based tests for pure naming/query functions (GH #sdk-testing).
//!
//! Uses `proptest` to exercise invariants that hand-written cases miss.
//!
//! Run with `cargo test --package design-data-core --test prop_naming`.

use design_data_core::naming::{generate_legacy_name, parse_legacy_name, NameObject};
use proptest::prelude::*;

// ── Strategies ────────────────────────────────────────────────────────────────

/// Generate a kebab-case string that will NOT be misread as ending in a state word.
///
/// We generate safe properties by choosing from a fixed set of multi-segment property
/// names that are well-known in the Spectrum token vocabulary. This is simpler than
/// a rejection filter and still gives wide coverage of the roundtrip logic.
fn safe_property() -> impl Strategy<Value = String> {
    prop::sample::select(vec![
        "background-color",
        "color",
        "border-color",
        "border-width",
        "border-radius",
        "font-size",
        "font-weight",
        "line-height",
        "padding",
        "margin",
        "gap",
        "opacity",
        "size",
        "icon-size",
        "shadow",
        "outline-color",
        "focus-indicator-color",
        "animation-duration",
        "transition-duration",
        "text-color",
        "fill-color",
        "stroke-color",
        "min-width",
        "max-width",
        "min-height",
    ])
    .prop_map(str::to_string)
}

/// Generate an optional component name (well-known Spectrum component prefixes).
fn optional_component() -> impl Strategy<Value = Option<String>> {
    prop::option::of(prop::sample::select(vec![
        "action-button",
        "button",
        "checkbox",
        "badge",
        "combobox",
        "dialog",
        "field-label",
        "icon",
        "menu",
        "picker",
        "radio",
        "slider",
        "switch",
        "tag",
        "text-field",
        "tooltip",
    ]))
    .prop_map(|o| o.map(str::to_string))
}

/// Generate an optional state word (drawn directly from the known set).
fn optional_state() -> impl Strategy<Value = Option<String>> {
    // Sample from non-compound states only; compound states like "key-focus"
    // and "keyboard-focus" interact with the two-segment rmatch logic and are
    // better tested as dedicated unit tests.
    prop::option::of(prop::sample::select(vec![
        "default",
        "hover",
        "down",
        "focus",
        "selected",
        "disabled",
        "emphasized",
        "error",
        "invalid",
        "active",
        "open",
        "closed",
        "indeterminate",
    ]))
    .prop_map(|o| o.map(str::to_string))
}

// ── Properties ────────────────────────────────────────────────────────────────

proptest! {
    /// `parse_legacy_name(generate_legacy_name(obj), component) == obj`
    ///
    /// For any NameObject built from a safe property, optional component, and
    /// optional state, the round-trip must be lossless.
    #[test]
    fn naming_roundtrip(
        property in safe_property(),
        component in optional_component(),
        state in optional_state(),
    ) {
        // Skip cases where the component is a prefix of the property string,
        // since that triggers thin-format detection in generate_legacy_name and
        // deliberately breaks the general roundtrip (the thin-format path is
        // tested separately in naming.rs unit tests).
        prop_assume!(
            component.as_ref().map_or(true, |c| !property.starts_with(c.as_str()))
        );

        let obj = NameObject {
            property: property.clone(),
            component: component.clone(),
            state: state.clone(),
            variant: None,
        };
        let key = generate_legacy_name(&obj);
        let parsed = parse_legacy_name(&key, component.as_deref());

        prop_assert_eq!(
            parsed.property, property,
            "property should survive roundtrip"
        );
        prop_assert_eq!(
            parsed.component, component,
            "component should survive roundtrip"
        );
        prop_assert!(
            parsed.state == state,
            "state should survive roundtrip; key={} parsed_state={:?} expected={:?}",
            key,
            parsed.state,
            state
        );
    }

    /// `generate_legacy_name` must never produce an empty string.
    ///
    /// A `NameObject` with a non-empty `property` must always yield a non-empty key.
    #[test]
    fn generate_never_empty(
        property in safe_property(),
        component in optional_component(),
        state in optional_state(),
    ) {
        let obj = NameObject { property, component, state, variant: None };
        prop_assert!(!generate_legacy_name(&obj).is_empty());
    }

    /// `generate_legacy_name` output contains the property as a substring.
    #[test]
    fn generated_key_contains_property(property in safe_property()) {
        let obj = NameObject { property: property.clone(), component: None, state: None, variant: None };
        let key = generate_legacy_name(&obj);
        prop_assert!(
            key.contains(&property),
            "key {key:?} should contain property {property:?}"
        );
    }

    /// `generate_legacy_name` with no component or state equals the property.
    #[test]
    fn generate_bare_property_is_identity(property in safe_property()) {
        let obj = NameObject { property: property.clone(), component: None, state: None, variant: None };
        prop_assert_eq!(generate_legacy_name(&obj), property);
    }
}

// ── Query parser no-panic property ────────────────────────────────────────────

proptest! {
    /// `query::parse` must never panic on arbitrary input.
    ///
    /// Invalid expressions return `Err`, valid ones return `Ok`. The invariant
    /// is that the parser is total: no input causes a crash or `unwrap` failure.
    #[test]
    fn query_parse_does_not_panic(s in ".*") {
        // We just need it not to panic; the return value may be Ok or Err.
        let _ = design_data_core::query::parse(&s);
    }

    /// `query::parse` accepts valid `property=<value>` expressions.
    #[test]
    fn query_parse_accepts_property_expression(
        value in "[a-z][a-z0-9-]{1,20}",
    ) {
        let expr = format!("property={value}");
        let result = design_data_core::query::parse(&expr);
        prop_assert!(
            result.is_ok(),
            "property=<value> should parse successfully: {result:?}"
        );
    }
}

/// `inverse-icon-color` is the motivating case for `variant` support: a context-variant
/// word (`inverse`) leads the key, ahead of `component`.
#[test]
fn variant_leading_key_roundtrips() {
    let parsed = parse_legacy_name("inverse-icon-color", Some("icon"));
    assert_eq!(parsed.variant, Some("inverse".to_string()));
    assert_eq!(parsed.component, Some("icon".to_string()));
    assert_eq!(parsed.property, "color");
    assert_eq!(generate_legacy_name(&parsed), "inverse-icon-color");
}
