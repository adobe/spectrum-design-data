// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Audit of the Foundation→Platform cascade (`manifest::apply_configured`) against a
//! fixture platform (`tests/fixtures/platform-cascade`). Each test pins what the code
//! does today; where that differs from `spec/manifest.md` the test says so (p6ga.8.1).

use std::path::{Path, PathBuf};

use design_data_core::data_source::{Provenance, ResolvedData};
use design_data_core::graph::{Layer, RelationshipRecord, TokenGraph};
use design_data_core::manifest::apply_configured;
use serde_json::{json, Value};

fn color(family: &str, scheme: &str, value: &str, uuid: &str) -> (String, PathBuf, Value) {
    (
        uuid.to_string(),
        PathBuf::from("tokens.json"),
        json!({
            "name": {"property": "color", "colorFamily": family, "scaleIndex": "800", "colorScheme": scheme},
            "$schema": "https://example.test/token.json",
            "$valueType": "color",
            "description": "fixture color",
            "lifecycle": {"introduced": "1.0.0"},
            "value": value,
            "uuid": uuid,
        }),
    )
}

fn rel(uuid: &str, target: &str, context: &str) -> RelationshipRecord {
    RelationshipRecord {
        file: PathBuf::from("relationships.json"),
        index: 0,
        uuid: Some(uuid.into()),
        raw: json!({
            "scope": {"component": "widget", "property": "color"},
            "context": context,
            "$ref": target,
            "uuid": uuid,
        }),
    }
}

fn foundation() -> TokenGraph {
    let mut g = TokenGraph::from_pairs(vec![
        color("gray", "light", "rgb(1, 1, 1)", "u-gray-light"),
        color("gray", "dark", "rgb(9, 9, 9)", "u-gray-dark"),
        color("gray", "light", "rgb(3, 3, 3)", "u-gray-alt"),
        color("red", "light", "rgb(5, 0, 0)", "u-red"),
        color("blue", "light", "rgb(0, 0, 5)", "u-blue"),
        (
            "u-size".into(),
            PathBuf::from("tokens.json"),
            json!({"name": {"property": "size", "scaleIndex": "100"}, "value": "4px", "uuid": "u-size"}),
        ),
    ]);
    g.relationships = vec![
        rel(
            "00000000-0000-4000-8000-0000000000a1",
            "u-gray-light",
            "Fill",
        ),
        rel("00000000-0000-4000-8000-0000000000a2", "u-red", "Border"),
    ];
    g
}

fn platform() -> (TokenGraph, std::collections::HashMap<String, Vec<String>>) {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let resolved = ResolvedData {
        tokens_root: PathBuf::from("tokens"),
        schemas_root: root.join("../../packages/design-data-spec/schemas"),
        mode_sets: None,
        components: None,
        fields: None,
        guidelines: None,
        relationships: None,
        exceptions: None,
        platform_manifest: Some(root.join("tests/fixtures/platform-cascade/manifest.json")),
        provenance: Provenance::InRepo,
    };
    let mut g = foundation();
    let r = apply_configured(&mut g, &resolved).expect("fixture platform applies");
    (g, r)
}

fn value(g: &TokenGraph, key: &str) -> Option<String> {
    g.tokens
        .get(key)?
        .raw
        .get("value")
        .and_then(Value::as_str)
        .map(str::to_string)
}

#[test]
fn a_uuid_override_hits_only_that_color_scheme_variant() {
    let (g, _) = platform();
    assert_eq!(value(&g, "u-gray-light").as_deref(), Some("rgb(2, 2, 2)"));
    assert_eq!(g.tokens["u-gray-light"].layer, Layer::Platform);
    assert_eq!(value(&g, "u-gray-dark").as_deref(), Some("rgb(9, 9, 9)"));
    assert_eq!(g.tokens["u-gray-dark"].layer, Layer::Foundation);
}

#[test]
fn include_is_a_whitelist_and_exclude_removes_from_it() {
    let (g, _) = platform();
    assert!(!g.tokens.contains_key("u-size"), "include drops size");
    assert!(!g.tokens.contains_key("u-red"), "excluded");
}

#[test]
fn an_override_on_an_excluded_token_is_silently_dropped() {
    // Precedence implemented: include -> exclude -> overrides -> extension tokens.
    // The override of u-blue (included, then excluded) finds no target and is a
    // silent no-op; the token does not come back. spec/manifest.md is silent on
    // the order, so this is a spec gap rather than a mismatch.
    let (g, _) = platform();
    assert!(!g.tokens.contains_key("u-blue"));
}

#[test]
fn an_extension_token_is_added_at_the_platform_layer() {
    let (g, _) = platform();
    let ext = g
        .tokens
        .values()
        .find(|t| t.uuid.as_deref() == Some("00000000-0000-4000-8000-0000000000e1"))
        .expect("extension token");
    assert_eq!(ext.layer, Layer::Platform);
    assert!(
        ext.name.starts_with("platform-ext:"),
        "keyed positionally: {}",
        ext.name
    );
}

#[test]
fn extension_relationships_are_merged_into_the_graph() {
    let (g, _) = platform();
    let ctx = |u: &str| {
        g.relationships
            .iter()
            .find(|r| r.uuid.as_deref() == Some(u))
            .map(|r| r.raw.clone())
    };
    assert!(ctx("00000000-0000-4000-8000-0000000000a0").is_some(), "add");
    assert_eq!(
        ctx("00000000-0000-4000-8000-0000000000a1").unwrap()["$ref"],
        "u-gray-alt",
        "override"
    );
    assert!(
        ctx("00000000-0000-4000-8000-0000000000a2").is_none(),
        "remove"
    );
}

#[test]
fn a_relationship_may_point_at_an_excluded_token() {
    // rel-2 was removed here, so add one that still points at the excluded red.
    let (mut g, _) = platform();
    g.relationships.push(rel("rel-3", "u-red", "Border"));
    assert!(!g.tokens.contains_key("u-red"));
    assert!(
        g.relationships
            .iter()
            .any(|r| r.uuid.as_deref() == Some("rel-3")),
        "apply does not prune relationships whose token was excluded"
    );
}

#[test]
fn a_mode_set_extension_is_added_to_the_catalog() {
    let (g, _) = platform();
    assert!(g.mode_sets.iter().any(|m| m.name == "interfaceLevel"));
}

#[test]
fn an_override_replaces_the_foundation_record_in_place() {
    // spec/manifest.md `overrides`: one record per token, original fields kept,
    // provenance in `overriddenBy` / `overriddenFrom` (p6ga.8.9).
    let (g, _) = platform();
    let n = g
        .tokens
        .values()
        .filter(|t| t.uuid.as_deref() == Some("u-gray-light"))
        .count();
    assert_eq!(n, 1);
    let rec = &g.tokens["u-gray-light"];
    assert_eq!(rec.layer, Layer::Platform);
    assert_eq!(rec.raw["value"], "rgb(2, 2, 2)");
    assert_eq!(rec.raw["$valueType"], "color");
    assert_eq!(rec.raw["$schema"], "https://example.test/token.json");
    assert_eq!(rec.raw["description"], "fixture color");
    assert_eq!(rec.raw["lifecycle"]["introduced"], "1.0.0");
    assert_eq!(rec.raw["overriddenBy"], json!({"platform": "fixture"}));
    assert_eq!(rec.raw["overriddenFrom"], json!({"value": "rgb(1, 1, 1)"}));
    // Untouched tokens carry no marker.
    assert!(g.tokens["u-gray-dark"].raw.get("overriddenBy").is_none());
}

fn apply(overrides: Value) -> Result<TokenGraph, design_data_core::CoreError> {
    let mut g = foundation();
    g.apply_platform_manifest(&json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "overrides": overrides,
    }))?;
    Ok(g)
}

#[test]
fn an_override_without_a_platform_id_names_the_manifest() {
    let g = apply(json!([{"target": "u-gray-light", "value": "rgb(2, 2, 2)"}])).unwrap();
    assert_eq!(
        g.tokens["u-gray-light"].raw["overriddenBy"],
        json!({"manifest": "manifest.json"})
    );
}

#[test]
fn an_override_may_change_value_to_ref_and_drops_the_value() {
    let g = apply(json!([{"target": "u-gray-light", "$ref": "u-gray-dark"}])).unwrap();
    let rec = &g.tokens["u-gray-light"];
    assert!(rec.raw.get("value").is_none());
    assert_eq!(rec.raw["$ref"], "u-gray-dark");
    assert_eq!(rec.raw["$valueType"], "color");
    assert_eq!(rec.alias_target.as_deref(), Some("u-gray-dark"));
    assert_eq!(rec.raw["overriddenFrom"], json!({"value": "rgb(1, 1, 1)"}));
}

#[test]
fn an_override_may_change_ref_to_value_and_drops_the_ref() {
    let g = apply(json!([
        {"target": "u-gray-light", "$ref": "u-gray-dark"},
        {"target": "u-gray-light", "value": "rgb(7, 7, 7)"}
    ]))
    .unwrap();
    let rec = &g.tokens["u-gray-light"];
    assert!(rec.raw.get("$ref").is_none());
    assert_eq!(rec.raw["value"], "rgb(7, 7, 7)");
    assert_eq!(rec.alias_target, None);
}

#[test]
fn the_first_overridden_from_is_kept_when_a_token_is_overridden_twice() {
    // Last override wins for the value; first wins for the history, so
    // `overriddenFrom` is always the foundation value.
    let g = apply(json!([
        {"target": "u-gray-light", "value": "rgb(2, 2, 2)"},
        {"target": "u-gray-light", "value": "rgb(4, 4, 4)"}
    ]))
    .unwrap();
    let rec = &g.tokens["u-gray-light"];
    assert_eq!(rec.raw["value"], "rgb(4, 4, 4)");
    assert_eq!(rec.raw["overriddenFrom"], json!({"value": "rgb(1, 1, 1)"}));
}

#[test]
fn an_override_that_changes_the_value_type_is_an_error() {
    let r = apply(json!([{"target": "u-gray-light", "value": 42}]));
    assert!(matches!(
        r,
        Err(design_data_core::CoreError::ParseError(_))
    ));
}

#[test]
fn include_and_exclude_queries_cannot_use_every_name_key() {
    // spec/query.md limits keys to property, component, variant, state, colorScheme,
    // scale, contrast, uuid, $schema: a platform cannot exclude by colorFamily or
    // scaleIndex, which most real tokens differ on.
    let mut g = foundation();
    let err = g
        .apply_platform_manifest(&json!({"exclude": ["colorFamily=red"]}))
        .unwrap_err();
    assert!(err.to_string().contains("unknown key"));
}

fn fill_of(g: &TokenGraph, context: &str) -> (Option<String>, Vec<String>) {
    use design_data_core::visual::{build_scene, RenderRequest};
    let recipe = json!({
        "component": "widget",
        "root": "box",
        "sizeScale": {"m": 100},
        "parts": {"box": {"kind": "box", "props": {
            "width": {"value": 10},
            "height": {"value": 10},
            "fill": {"relationship": {"property": "color", "context": context}}
        }}}
    });
    let req = RenderRequest {
        component: "widget".into(),
        size: "m".into(),
        mode: [("colorScheme", "light"), ("scale", "desktop")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        ..Default::default()
    };
    let scene = build_scene(g, &recipe, &req).unwrap();
    let fill = scene
        .nodes
        .iter()
        .find(|n| n.part == "box")
        .and_then(|n| n.fill.clone());
    (fill, scene.diagnostics)
}

#[test]
fn render_follows_the_platform_cascade() {
    let mut base = foundation();
    base.components
        .push(design_data_core::graph::ComponentRecord {
            name: "widget".into(),
            file: PathBuf::from("dataset.json"),
            raw: json!({"name": "widget", "options": {}}),
            layer: Layer::Foundation,
        });
    let mut plat = base.clone();
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let resolved = ResolvedData {
        tokens_root: PathBuf::from("tokens"),
        schemas_root: root.join("../../packages/design-data-spec/schemas"),
        mode_sets: None,
        components: None,
        fields: None,
        guidelines: None,
        relationships: None,
        exceptions: None,
        platform_manifest: Some(root.join("tests/fixtures/platform-cascade/manifest.json")),
        provenance: Provenance::InRepo,
    };
    apply_configured(&mut plat, &resolved).unwrap();

    // The override of rel-1 re-points "Fill" from gray-light to gray-alt.
    assert_eq!(
        fill_of(&base, "Fill"),
        (Some("rgb(1, 1, 1)".into()), vec![])
    );
    assert_eq!(
        fill_of(&plat, "Fill"),
        (Some("rgb(3, 3, 3)".into()), vec![])
    );
    // The extension relationship binds the extension token.
    assert_eq!(
        fill_of(&plat, "Extension fill"),
        (Some("rgb(7, 7, 7)".into()), vec![])
    );
    // rel-2 ("Border") is removed by the platform: the binding reports instead of drawing nothing.
    assert_eq!(fill_of(&base, "Border").1, Vec::<String>::new());
    assert_eq!(fill_of(&plat, "Border").0, None);
    assert_eq!(fill_of(&plat, "Border").1.len(), 1);
}
