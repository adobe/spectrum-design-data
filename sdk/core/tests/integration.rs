// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for `design-data-core`, consolidated into one compiled binary.
//!
//! ponytail: merged from the former `prop_naming` and `suggest_calibration` test
//! files (bead spectrum-design-data-tdb) — each `tests/*.rs` file is its own
//! executable, and on this machine every freshly-built binary pays a large
//! first-exec cost from macOS Gatekeeper/XProtect on-exec scanning. Fewer test
//! binaries means fewer first-exec scans per `cargo test` run.
//!
//! Run a single suite with `cargo test -p design-data-core --test integration <filter>`,
//! e.g. `-- naming::` or `-- suggest_calibration::`.

mod naming {
    //! Property-based tests for pure naming/query functions (GH #sdk-testing).
    //!
    //! Uses `proptest` to exercise invariants that hand-written cases miss.

    use design_data_core::naming::{generate_legacy_name, parse_legacy_name, NameObject};
    use proptest::prelude::*;

    // ── Strategies ────────────────────────────────────────────────────────────

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

    /// Generate an optional state array (drawn directly from the known set).
    fn optional_state() -> impl Strategy<Value = Option<Vec<String>>> {
        // Sample from non-compound states only; compound states like "key-focus"
        // and "keyboard-focus" interact with the two-segment rmatch logic and are
        // better tested as dedicated unit tests. Proposal 006: `state` is always
        // an array, so a single sampled state becomes a one-element vec.
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
        .prop_map(|o| o.map(|s| vec![s.to_string()]))
    }

    // ── Properties ────────────────────────────────────────────────────────────

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

    // ── Query parser no-panic property ───────────────────────────────────────

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
}

mod suggest_calibration {
    //! Calibration benchmark for `suggest::suggest` against the real Spectrum token dataset.
    //!
    //! Empirical basis for `alias_threshold()` in `authoring/session.rs`.
    //!
    //! Run with `cargo test -p design-data-core --test integration suggest_calibration -- --nocapture`
    //! to see the raw score distribution.
    //!
    //! **Calibration methodology** (RFC #973 Q1):
    //!   Jaccard similarity over {intent words} ∩ {token name segments + name-object
    //!   field values + description words}.  Against `packages/tokens/src`:
    //!     - Clear positive matches score 0.6–1.0.
    //!     - Partial noise (single-word overlap on a 3-4 word token) scores 0.0–0.33.
    //!     - Chosen threshold: 0.35 — sits cleanly between the two bands.

    use design_data_core::authoring::session::alias_threshold;
    use design_data_core::graph::TokenGraph;
    use design_data_core::suggest;
    use std::path::Path;

    fn token_src() -> std::path::PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent() // sdk/
            .and_then(|p| p.parent()) // repo root
            .unwrap()
            .join("packages/tokens/src")
    }

    struct Case {
        intent: &'static str,
        /// Expected top-match token name (substring match).
        expected_top: &'static str,
        /// Expected confidence floor for the top result.
        min_confidence: f32,
    }

    #[test]
    fn positive_intents_score_above_threshold() {
        let src = token_src();
        assert!(
            src.is_dir(),
            "packages/tokens/src not found at {src:?} — tests must run from the repo root"
        );
        let graph = TokenGraph::from_json_dir(&src).expect("failed to load token graph");
        let threshold = alias_threshold();

        let cases: &[Case] = &[
            Case {
                intent: "neutral content color",
                expected_top: "neutral-content-color",
                min_confidence: 0.70,
            },
            Case {
                intent: "accent content color default",
                expected_top: "accent-content-color-default",
                min_confidence: 0.90,
            },
            Case {
                intent: "card background color",
                expected_top: "card-background",
                min_confidence: 0.70,
            },
            Case {
                intent: "spacing 100",
                expected_top: "spacing-100",
                min_confidence: 0.90,
            },
            Case {
                intent: "body font size",
                expected_top: "body",
                min_confidence: 0.60,
            },
            Case {
                intent: "static black text",
                expected_top: "static-black-text",
                min_confidence: 0.70,
            },
            Case {
                intent: "icon color cyan",
                expected_top: "icon-color-cyan",
                min_confidence: 0.55,
            },
            Case {
                intent: "drop zone background",
                expected_top: "drop-zone-background",
                min_confidence: 0.70,
            },
        ];

        let mut all_pass = true;
        for case in cases {
            let results = suggest::suggest(&graph, case.intent, None, 5);
            let top = results.first();
            let score = top.map(|r| r.confidence).unwrap_or(0.0);
            let name = top.map(|r| r.token_name.as_str()).unwrap_or("(none)");

            eprintln!(
                "[positive] {:?} → top={:?} score={:.3} (floor={:.2}, threshold={:.2})",
                case.intent, name, score, case.min_confidence, threshold
            );

            if score < case.min_confidence {
                eprintln!(
                    "  FAIL: expected score >= {:.2}, got {:.3}",
                    case.min_confidence, score
                );
                all_pass = false;
            }
            if !name.contains(case.expected_top) {
                eprintln!(
                    "  FAIL: expected top match to contain {:?}, got {:?}",
                    case.expected_top, name
                );
                all_pass = false;
            }
            assert!(
                score >= threshold,
                "intent {:?}: top score {:.3} is below alias_threshold() {:.2}",
                case.intent,
                score,
                threshold
            );
        }
        assert!(
            all_pass,
            "one or more positive calibration cases failed — see output above"
        );
    }

    #[test]
    fn negative_intents_score_below_threshold() {
        let src = token_src();
        assert!(
            src.is_dir(),
            "packages/tokens/src not found at {src:?} — tests must run from the repo root"
        );
        let graph = TokenGraph::from_json_dir(&src).expect("failed to load token graph");
        let threshold = alias_threshold();

        let negative_intents = &["frobozz qux", "xyz plorp wibble", "thequickbrownfox"];

        for intent in negative_intents {
            let results = suggest::suggest(&graph, intent, None, 5);
            let top_score = results.first().map(|r| r.confidence).unwrap_or(0.0);
            eprintln!(
                "[negative] {intent:?} → top score={top_score:.3} (threshold={threshold:.2})"
            );
            assert!(
                top_score < threshold,
                "negative intent {intent:?} should score below {threshold:.2}, got {top_score:.3}"
            );
        }
    }

    #[test]
    fn threshold_sits_in_calibrated_gap() {
        // Validate that alias_threshold() returns a value in the gap observed during
        // calibration: above pure noise (0.0) and below the positive-match floor (0.60).
        // Gap: 0.0–0.33 (noise) … threshold … 0.60+ (positives).
        //
        // Note: single-word queries matching a 2-segment token name can score ~0.5 and
        // DO legitimately trigger the banner — correct behavior, not a false positive.
        let threshold = alias_threshold();
        eprintln!("[gap-check] alias_threshold()={threshold:.2} should be in (0.0, 0.60)");
        assert!(
            threshold > 0.0,
            "threshold must be above pure noise (0.0), got {threshold}"
        );
        assert!(
            threshold < 0.60,
            "threshold must be below the positive-match floor (0.60), got {threshold}"
        );
    }
}
