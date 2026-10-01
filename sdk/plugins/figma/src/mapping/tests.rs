// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::collections::HashMap;
use std::path::PathBuf;

use serde_json::json;

use super::convert::*;
use super::payload::*;
use super::routing::*;
use crate::types::*;

fn mock_meta() -> VariablesMeta {
    VariablesMeta {
        variables: HashMap::new(),
        variable_collections: HashMap::from([
            (
                "col-1".into(),
                super::super::types::FigmaVariableCollection {
                    id: "col-1".into(),
                    name: ".Color theme".into(),
                    key: "k1".into(),
                    modes: vec![
                        super::super::types::FigmaMode {
                            mode_id: "m-light".into(),
                            name: "Light".into(),
                        },
                        super::super::types::FigmaMode {
                            mode_id: "m-dark".into(),
                            name: "Dark".into(),
                        },
                        super::super::types::FigmaMode {
                            mode_id: "m-wire".into(),
                            name: "Wireframe".into(),
                        },
                    ],
                    default_mode_id: "m-light".into(),
                    remote: false,
                    hidden_from_publishing: false,
                    variable_ids: vec![],
                },
            ),
            (
                "col-2".into(),
                super::super::types::FigmaVariableCollection {
                    id: "col-2".into(),
                    name: ".Platform scale".into(),
                    key: "k2".into(),
                    modes: vec![super::super::types::FigmaMode {
                        mode_id: "m-desktop".into(),
                        name: "Desktop".into(),
                    }],
                    default_mode_id: "m-desktop".into(),
                    remote: false,
                    hidden_from_publishing: false,
                    variable_ids: vec![],
                },
            ),
        ]),
    }
}

#[test]
fn color_set_produces_three_mode_values() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                "test-color": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "rgb(255, 0, 0)", "uuid": "u1" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "rgb(0, 255, 0)", "uuid": "u2" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "rgb(0, 0, 255)", "uuid": "u3" }
                    },
                    "uuid": "u0"
                }
            })
        )
        .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    assert_eq!(summary.variables_created, 1);
    assert_eq!(summary.mode_values_set, 3);
    assert_eq!(body.variables.len(), 1);
    assert_eq!(body.variables[0].name, "colorTheme/test-color");
    assert_eq!(body.variables[0].resolved_type, "COLOR");
    assert_eq!(body.variable_mode_values.len(), 3);
}

#[test]
fn scale_set_token_with_no_matching_target_mode_warns_instead_of_silently_dropping() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("scale.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                "test-scale": {
                    "$schema": "https://example.com/scale-set.json",
                    "sets": {
                        "desktop": { "$schema": "https://example.com/dimension.json", "value": "16px", "uuid": "u1" },
                        "mobile": { "$schema": "https://example.com/dimension.json", "value": "24px", "uuid": "u2" }
                    },
                    "uuid": "u0"
                }
            })
        )
        .unwrap();

    // mock_meta()'s .Platform scale collection only defines a Desktop mode.
    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();

    // Desktop value still lands; Mobile value is dropped but now warned about.
    assert_eq!(summary.mode_values_set, 1);
    assert_eq!(body.variable_mode_values.len(), 1);
    assert_eq!(summary.mode_warnings.len(), 1);
    let warning = &summary.mode_warnings[0];
    assert!(warning.contains("test-scale"), "{warning}");
    assert!(warning.contains("mobile"), "{warning}");
    assert!(warning.contains(".Platform scale"), "{warning}");
}

#[test]
fn dimension_token_goes_to_platform_scale() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("layout.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!({
            "spacing-100": {
                "$schema": "https://example.com/dimension.json",
                "value": "8px",
                "uuid": "d1"
            }
        })
    )
    .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    assert_eq!(summary.variables_created, 1);
    assert_eq!(body.variables[0].name, "platformScale/spacing-100");
    assert_eq!(body.variables[0].resolved_type, "FLOAT");
    // Value should be 8.0
    let val = &body.variable_mode_values[0].value;
    assert_eq!(val.as_f64(), Some(8.0));
}

#[test]
fn opacity_token_scales_fraction_to_figma_percent() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("color-aliases.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!({
            "background-opacity-down": {
                "$schema": "https://example.com/opacity.json",
                "value": "0.1",
                "uuid": "o1"
            }
        })
    )
    .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    assert_eq!(summary.variables_created, 1);
    // Opacity is a FLOAT, but lives in the Color theme collection in the
    // manual library, not Platform scale — see COLLECTION_SPECS routing.
    assert_eq!(body.variables[0].name, "colorTheme/background-opacity-down");
    assert_eq!(body.variables[0].resolved_type, "FLOAT");
    let val = &body.variable_mode_values[0].value;
    assert_eq!(val.as_f64(), Some(10.0));
}

#[test]
fn color_set_with_opacity_members_produces_float_not_color() {
    // Defensive coverage for process_color_set_token's any-member type
    // inference: even if the alias/first member weren't opacity, any
    // member being opacity.json must still yield FLOAT, not COLOR.
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("opacity-set.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                "test-opacity-set": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/opacity.json", "value": "0.1", "uuid": "u1" },
                        "dark": { "$schema": "https://example.com/opacity.json", "value": "0.2", "uuid": "u2" },
                        "wireframe": { "$schema": "https://example.com/opacity.json", "value": "0.3", "uuid": "u3" }
                    },
                    "uuid": "u0"
                }
            })
        )
        .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    assert_eq!(summary.variables_created, 1);
    assert_eq!(body.variables[0].resolved_type, "FLOAT");
    assert_eq!(body.variable_mode_values.len(), 3);
    for mv in &body.variable_mode_values {
        assert!(
            mv.value.as_f64().is_some(),
            "expected flattened FLOAT, got {mv:?}"
        );
    }
}

#[test]
fn build_export_payload_accepts_in_memory_tokens_not_just_a_directory() {
    // Mirrors what a manifest-resolved TokenGraph hands the exporter:
    // `(record.name, record.raw)` pairs with no backing directory — the
    // seam that lets `figma export --manifest` feed platform-overridden
    // `raw` values (e.g. from `apply_platform_manifest`) straight through
    // without materializing them to disk first.
    let tokens = vec![(
        "spacing-100".to_string(),
        PathBuf::from("in-memory.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "12px",
            "uuid": "d1"
        }),
    )];

    let meta = mock_meta();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    assert_eq!(summary.variables_created, 1);
    assert_eq!(body.variables[0].name, "platformScale/spacing-100");
    let val = &body.variable_mode_values[0].value;
    assert_eq!(val.as_f64(), Some(12.0));
}

#[test]
fn override_remaps_name_absent_override_stays_1to1() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("layout.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!({
            "spacing-100": {
                "$schema": "https://example.com/dimension.json",
                "value": "8px",
                "uuid": "d1"
            },
            "spacing-200": {
                "$schema": "https://example.com/dimension.json",
                "value": "16px",
                "uuid": "d2"
            }
        })
    )
    .unwrap();

    let meta = mock_meta();
    let overrides: HashMap<String, String> = [(
        "spacing-100".to_string(),
        "Layout/spacing-100-real".to_string(),
    )]
    .into_iter()
    .collect();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, _summary) = build_export_payload(&tokens, &meta, Some(&overrides)).unwrap();

    let by_name = |n: &str| body.variables.iter().find(|v| v.name == n);
    assert!(by_name("Layout/spacing-100-real").is_some());
    assert!(by_name("platformScale/spacing-200").is_some());
}

#[test]
fn alias_resolves_to_concrete_value() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!({
            "base-color": {
                "$schema": "https://example.com/color.json",
                "value": "rgb(100, 200, 50)",
                "uuid": "c1"
            },
            "alias-color": {
                "$schema": "https://example.com/alias.json",
                "value": "{base-color}",
                "uuid": "a1"
            }
        })
    )
    .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (_body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    // base-color (flat color) + alias-color (alias→color)
    assert_eq!(summary.variables_created, 2);
    assert!(summary.skipped_alias_unresolved.is_empty());
}

#[test]
fn alias_to_set_token_resolves_to_light_mode_not_first_in_file() {
    // Regression test: resolve_value() used to call sets.values().next(),
    // which is HashMap-order-dependent. In real data "dark" appears before
    // "light" in color-palette.json, so an alias like
    //   accent-color-100 -> {blue-100}
    // was silently exporting the dark value into the Light Figma mode.
    //
    // The fix prefers sets["light"] over sets["desktop"] over first-in-file.
    // This test encodes that contract: dark is listed first in the JSON, but
    // the exported mode value must be the light value.
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                // Set token with dark listed first (mirrors real color-palette.json)
                "base-color-set": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "dark":      { "$schema": "https://example.com/color.json", "value": "rgb(0, 0, 255)", "uuid": "u-dark" },
                        "light":     { "$schema": "https://example.com/color.json", "value": "rgb(255, 0, 0)", "uuid": "u-light" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "rgb(0, 255, 0)", "uuid": "u-wire" }
                    },
                    "uuid": "u0"
                },
                // Top-level alias pointing at the set token
                "alias-to-set": {
                    "$schema": "https://example.com/alias.json",
                    "value": "{base-color-set}",
                    "uuid": "a1"
                }
            })
        )
        .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();

    assert!(
        summary.skipped_alias_unresolved.is_empty(),
        "alias should resolve"
    );

    // The alias variable must exist
    let alias_var = body
        .variables
        .iter()
        .find(|v| v.name == "colorTheme/alias-to-set")
        .expect("alias-to-set should be exported");
    assert_eq!(alias_var.resolved_type, "COLOR");

    // The mode value must carry the light color (r=1, g=0, b=0), not the
    // dark color (r=0, g=0, b=1) that would result from first-in-file order.
    let alias_id = alias_var.id.as_deref().unwrap_or("");
    let mv = body
        .variable_mode_values
        .iter()
        .find(|v| v.variable_id == alias_id)
        .expect("alias-to-set should have a mode value");

    let r = mv.value.get("r").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let b = mv.value.get("b").and_then(|v| v.as_f64()).unwrap_or(0.0);
    assert!(
        r > 0.9,
        "expected light value (r≈1), got r={r} — dark value was used instead"
    );
    assert!(
        b < 0.1,
        "expected light value (b≈0), got b={b} — dark value was used instead"
    );
}

#[test]
fn composite_types_are_skipped() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!({
            "heading-typography": {
                "$schema": "https://example.com/typography.json",
                "value": { "fontFamily": "Arial", "fontSize": "16px" },
                "uuid": "t1"
            },
            "shadow-1": {
                "$schema": "https://example.com/drop-shadow.json",
                "value": [{ "x": "0px", "y": "2px", "blur": "4px", "color": "rgba(0,0,0,0.1)" }],
                "uuid": "s1"
            }
        })
    )
    .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();
    assert_eq!(summary.variables_created, 0);
    assert_eq!(summary.skipped_composite.len(), 2);
    assert!(body.variables.is_empty());
}

#[test]
fn in_set_alias_emits_variable_alias_reference() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                "base-color-set-a": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "rgb(255, 0, 0)", "uuid": "a-light" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "rgb(0, 255, 0)", "uuid": "a-dark" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "rgb(0, 0, 255)", "uuid": "a-wire" }
                    },
                    "uuid": "a0"
                },
                "base-color-set-b": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "rgb(1, 1, 1)", "uuid": "b-light" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "rgb(2, 2, 2)", "uuid": "b-dark" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "rgb(3, 3, 3)", "uuid": "b-wire" }
                    },
                    "uuid": "b0"
                },
                // Note: this key sorts before both base-color-set-* keys, so the
                // main loop processes it before its alias targets — exercising the
                // pre-pass that makes target ids available regardless of order.
                "alias-color-set": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "{base-color-set-a}", "uuid": "al-light" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "{base-color-set-b}", "uuid": "al-dark" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "{base-color-set-a}", "uuid": "al-wire" }
                    },
                    "uuid": "al0"
                }
            })
        )
        .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();

    assert_eq!(summary.mode_values_aliased, 3);
    assert_eq!(summary.mode_values_set, 6);

    let alias_var_id = body
        .variables
        .iter()
        .find(|v| v.name == "colorTheme/alias-color-set")
        .and_then(|v| v.id.clone())
        .expect("alias-color-set variable created");
    let alias_values: Vec<_> = body
        .variable_mode_values
        .iter()
        .filter(|mv| mv.variable_id == alias_var_id)
        .collect();
    assert_eq!(alias_values.len(), 3);
    for mv in &alias_values {
        assert_eq!(
            mv.value.get("type").and_then(|v| v.as_str()),
            Some("VARIABLE_ALIAS")
        );
    }
    let alias_target_ids: Vec<_> = alias_values
        .iter()
        .filter_map(|mv| mv.value.get("id").and_then(|v| v.as_str()))
        .collect();
    assert!(alias_target_ids.contains(&"colorTheme__base-color-set-a"));
    assert!(alias_target_ids.contains(&"colorTheme__base-color-set-b"));
}

#[test]
fn alias_to_malformed_set_target_drops_dangling_reference() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                // Malformed: color-set schema but no `sets` object, so
                // `process_color_set_token` bails without emitting a
                // VariableAction — even though the pre-pass already
                // registered an id for it.
                "base-color-set-a": {
                    "$schema": "https://example.com/color-set.json",
                    "uuid": "a0"
                },
                "alias-color-set": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "{base-color-set-a}", "uuid": "al-light" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "{base-color-set-a}", "uuid": "al-dark" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "{base-color-set-a}", "uuid": "al-wire" }
                    },
                    "uuid": "al0"
                }
            })
        )
        .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();

    let emitted_ids: std::collections::HashSet<_> = body
        .variables
        .iter()
        .filter_map(|v| v.id.as_deref())
        .collect();
    for mv in &body.variable_mode_values {
        if let Some(target) = variable_alias_target_id(&mv.value) {
            assert!(
                emitted_ids.contains(target),
                "dangling VARIABLE_ALIAS to '{target}' with no matching VariableAction"
            );
        }
    }
    assert!(
        summary
            .mode_warnings
            .iter()
            .any(|w| w.contains("dangling VARIABLE_ALIAS")),
        "expected a mode_warnings entry for the dropped alias, got: {:?}",
        summary.mode_warnings
    );

    // Every mode of `alias-color-set` aliased the malformed `base-color-set-a`,
    // so after dropping the dangling aliases it has zero mode values left — it
    // must be dropped entirely, not sent to Figma as an empty CREATE/UPDATE.
    assert!(
        !emitted_ids.contains("colorTheme__alias-color-set"),
        "expected the fully-dangling variable to be dropped, ids: {emitted_ids:?}"
    );
    assert!(
        summary
            .mode_warnings
            .iter()
            .any(|w| w.contains("dropped entirely")),
        "expected a mode_warnings entry for the dropped variable, got: {:?}",
        summary.mode_warnings
    );
    assert_eq!(
        summary.mode_values_aliased, 0,
        "dropped alias values must not be counted in the summary"
    );
}

#[test]
fn alias_to_non_prepassed_target_falls_back_to_literal() {
    use std::io::Write;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!({
                "base-color": {
                    "$schema": "https://example.com/color.json",
                    "value": "rgb(10, 20, 30)",
                    "uuid": "bc"
                },
                "base-alias": {
                    "$schema": "https://example.com/alias.json",
                    "value": "{base-color}",
                    "uuid": "ba"
                },
                "test-color-set": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "{base-alias}", "uuid": "t-light" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "{base-alias}", "uuid": "t-dark" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "{base-alias}", "uuid": "t-wire" }
                    },
                    "uuid": "t0"
                }
            })
        )
        .unwrap();

    let meta = mock_meta();
    let tokens = load_all_tokens(dir.path()).unwrap();
    let (body, summary) = build_export_payload(&tokens, &meta, None).unwrap();

    // "base-alias" is a top-level alias token, excluded from the alias-target
    // pre-pass (its own Figma routing isn't known up front), so aliasing it
    // still flattens through value_index instead of emitting a VARIABLE_ALIAS
    // pointing at something that isn't a Figma variable.
    assert_eq!(summary.mode_values_aliased, 0);

    let test_set_id = body
        .variables
        .iter()
        .find(|v| v.name == "colorTheme/test-color-set")
        .and_then(|v| v.id.clone())
        .expect("test-color-set variable created");
    let mode_values: Vec<_> = body
        .variable_mode_values
        .iter()
        .filter(|mv| mv.variable_id == test_set_id)
        .collect();
    assert_eq!(mode_values.len(), 3);
    for mv in mode_values {
        assert_ne!(
            mv.value.get("type").and_then(|v| v.as_str()),
            Some("VARIABLE_ALIAS")
        );
        assert!(
            mv.value.get("r").is_some(),
            "expected flattened FigmaColor literal, got {mv:?}"
        );
    }
}

/// `mock_meta()` plus a 3rd collection reachable only via a specific
/// `source_files` entry — proves `CollectionSpec`/`resolve_collections`
/// can route by file, without touching any of the real production
/// collections in `COLLECTION_SPECS`.
fn mock_meta_with_extra_collection() -> VariablesMeta {
    let mut meta = mock_meta();
    meta.variable_collections.insert(
        "col-3".into(),
        super::super::types::FigmaVariableCollection {
            id: "col-3".into(),
            name: ".Mock Extra".into(),
            key: "k3".into(),
            modes: vec![super::super::types::FigmaMode {
                mode_id: "m-extra".into(),
                name: "Desktop".into(),
            }],
            default_mode_id: "m-extra".into(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    meta
}

const MOCK_EXTRA_SPECS: &[CollectionSpec] = &[
    CollectionSpec {
        figma_collection_name: COLOR_THEME_COLLECTION,
        default_prefix: COLOR_THEME_PREFIX,
        kind: TokenKind::Color,
        source_files: &[],
    },
    CollectionSpec {
        figma_collection_name: ".Mock Extra",
        default_prefix: "mockExtra",
        kind: TokenKind::Scale,
        source_files: &["special-widget.json"],
    },
    CollectionSpec {
        figma_collection_name: PLATFORM_SCALE_COLLECTION,
        default_prefix: PLATFORM_SCALE_PREFIX,
        kind: TokenKind::Scale,
        source_files: &[],
    },
];

#[test]
fn file_specific_spec_routes_token_to_mock_collection() {
    let tokens = vec![(
        "widget-gap".to_string(),
        PathBuf::from("special-widget.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "8px",
            "uuid": "w1"
        }),
    )];
    let meta = mock_meta_with_extra_collection();
    let (body, summary) =
        build_export_payload_with_specs(&tokens, &meta, None, MOCK_EXTRA_SPECS).unwrap();
    assert_eq!(summary.variables_created, 1);
    assert_eq!(body.variables[0].name, "mockExtra/widget-gap");
}

#[test]
fn wildcard_spec_still_applies_for_files_not_listed_in_a_specific_entry() {
    let tokens = vec![(
        "spacing-100".to_string(),
        PathBuf::from("some-other-file.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "8px",
            "uuid": "d1"
        }),
    )];
    let meta = mock_meta_with_extra_collection();
    let (body, summary) =
        build_export_payload_with_specs(&tokens, &meta, None, MOCK_EXTRA_SPECS).unwrap();
    assert_eq!(summary.variables_created, 1);
    assert_eq!(body.variables[0].name, "platformScale/spacing-100");
}

#[test]
fn exported_variable_carries_web_code_syntax_for_dev_mode() {
    let tokens = vec![(
        "spacing-100".to_string(),
        PathBuf::from("some-other-file.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "8px",
            "uuid": "d1"
        }),
    )];
    let meta = mock_meta_with_extra_collection();
    let (body, _summary) =
        build_export_payload_with_specs(&tokens, &meta, None, MOCK_EXTRA_SPECS).unwrap();
    let code_syntax = body.variables[0]
        .code_syntax
        .as_ref()
        .expect("codeSyntax should be populated so Dev Mode shows the real token name");
    assert_eq!(
        code_syntax.get("WEB").map(String::as_str),
        Some("--spectrum-spacing-100")
    );
}

#[test]
fn platform_formats_add_extra_code_syntax_entries_from_web() {
    let tokens = vec![(
        "avatar-group-size-100".to_string(),
        PathBuf::from("some-other-file.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "8px",
            "uuid": "d1"
        }),
    )];
    let meta = mock_meta_with_extra_collection();
    let android_format = design_data_core::naming::FormattingConfig {
        casing: Some(design_data_core::naming::Casing::CamelCase),
        ..Default::default()
    };
    let platform_formats = vec![("ANDROID".to_string(), android_format)];
    let (mut body, _summary) =
        build_export_payload_with_specs(&tokens, &meta, None, MOCK_EXTRA_SPECS).unwrap();
    augment_code_syntax_with_platform_formats(&mut body.variables, &platform_formats);
    let code_syntax = body.variables[0].code_syntax.as_ref().unwrap();
    assert_eq!(
        code_syntax.get("WEB").map(String::as_str),
        Some("--spectrum-avatar-group-size-100")
    );
    assert_eq!(
        code_syntax.get("ANDROID").map(String::as_str),
        Some("avatarGroupSize100")
    );
}

/// Locks in the documented ceiling on `platform_code_name`: for a
/// component-prefixed legacy key, `conceptOrder` placing `"component"` last
/// has no effect, because the flat-key reconstruction never recovers a
/// `component` value to move (see the `ponytail:` note on
/// `platform_code_name`). The component segment stays fused to the front of
/// `property` regardless of where `"component"` appears in `conceptOrder`.
#[test]
fn platform_formats_component_concept_order_is_a_no_op() {
    let tokens = vec![(
        "button-background-color-default".to_string(),
        PathBuf::from("some-other-file.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "8px",
            "uuid": "d1"
        }),
    )];
    let meta = mock_meta_with_extra_collection();
    let android_format = design_data_core::naming::FormattingConfig {
        concept_order: Some(vec![
            "state".to_string(),
            "property".to_string(),
            "component".to_string(),
        ]),
        casing: Some(design_data_core::naming::Casing::CamelCase),
        ..Default::default()
    };
    let platform_formats = vec![("ANDROID".to_string(), android_format)];
    let (mut body, _summary) =
        build_export_payload_with_specs(&tokens, &meta, None, MOCK_EXTRA_SPECS).unwrap();
    augment_code_syntax_with_platform_formats(&mut body.variables, &platform_formats);
    let code_syntax = body.variables[0].code_syntax.as_ref().unwrap();
    // If `component` were actually recovered and moved per `conceptOrder`,
    // this would read "defaultBackgroundColorButton". It doesn't — the
    // "button" prefix stays glued to the front of `property`.
    assert_eq!(
        code_syntax.get("ANDROID").map(String::as_str),
        Some("defaultButtonBackgroundColor")
    );
}

#[test]
fn s2_web_baseline_fixture_deserializes() {
    let raw = include_str!("../../tests/fixtures/figma/s2-web-variables.baseline.json");
    let meta: crate::types::VariablesMeta =
        serde_json::from_str(raw).expect("baseline fixture is valid VariablesMeta");
    assert!(
        !meta.variable_collections.is_empty(),
        "expected at least one collection"
    );
    assert!(!meta.variables.is_empty(), "expected at least one variable");
}
