// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Platform manifest application for the Foundation→Platform cascade.
//!
//! Reads a Layer 2 platform `manifest.json` declared in `.design-data.toml`
//! (top-level `manifest` key), optionally validates it against `manifest.schema.json`,
//! and applies it to a [`TokenGraph`] via
//! [`TokenGraph::apply_platform_manifest`](crate::graph::TokenGraph::apply_platform_manifest).

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

use crate::data_source::ResolvedData;
use crate::discovery::discover_json_files;
use crate::graph::TokenGraph;
use crate::schema::SchemaRegistry;
use crate::CoreError;

/// Category subdirectories concatenated verbatim (sorted path order) into the
/// merged `extensions` object, keyed by directory name → manifest JSON key.
/// `tokens/` and `relationships/` have their own handling below and aren't here.
const CONCAT_CATEGORIES: &[(&str, &str)] = &[
    ("components", "components"),
    ("fields", "fields"),
    ("guidelines", "guidelines"),
    ("platform-extensions", "platformExtensions"),
];

/// Locate `packages/design-data-spec/schemas/manifest.schema.json` by walking up
/// from `schemas_root`.
pub fn locate_manifest_schema(schemas_root: &Path) -> Option<PathBuf> {
    schemas_root.ancestors().find_map(|p| {
        let candidate = p.join("packages/design-data-spec/schemas/manifest.schema.json");
        candidate.is_file().then_some(candidate)
    })
}

/// Apply the Layer 2 platform manifest declared in `.design-data.toml`
/// (top-level `manifest` key) to `graph`, returning mode-set restrictions to feed
/// into a [`ResolutionContext`](crate::cascade::ResolutionContext).
///
/// A no-op (empty map) when no manifest is configured. When the spec's
/// `manifest.schema.json` is locatable, the manifest is first validated (Layer 1);
/// schema violations return an error.
pub fn apply_configured(
    graph: &mut TokenGraph,
    resolved: &ResolvedData,
) -> Result<HashMap<String, Vec<String>>, CoreError> {
    let Some(manifest_path) = resolved.platform_manifest.as_ref() else {
        return Ok(HashMap::new());
    };
    let text = std::fs::read_to_string(manifest_path).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to read platform manifest {}: {e}",
            manifest_path.display()
        ))
    })?;
    let mut manifest: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to parse platform manifest {}: {e}",
            manifest_path.display()
        ))
    })?;

    let schema_path = locate_manifest_schema(&resolved.schemas_root).ok_or_else(|| {
        CoreError::ParseError(format!(
            "platform manifest {} is configured but manifest.schema.json could not be \
             located under {} — Layer 1 validation cannot run",
            manifest_path.display(),
            resolved.schemas_root.display()
        ))
    })?;
    let errors = SchemaRegistry::validate_manifest(&manifest, &schema_path)?;
    if !errors.is_empty() {
        return Err(CoreError::ParseError(format!(
            "platform manifest {} failed Layer 1 schema validation:\n  {}",
            manifest_path.display(),
            errors.join("\n  ")
        )));
    }

    // Layer 2's `extensions/` directory (spec/manifest.md#extensions-directory) is
    // glob+merged into the same `extensions` object shape the schema used to allow
    // inline, then spliced in post-validation — the manifest.json on disk no longer
    // carries `extensions` at all under the 26.1 schema, so validation above runs
    // clean, and `apply_platform_manifest` below is none the wiser.
    if let Some(ext) = build_extensions_value(manifest_path, &manifest)? {
        manifest
            .as_object_mut()
            .expect("manifest.json root is a JSON object (enforced by Layer 1 schema)")
            .insert("extensions".to_string(), ext);
    }

    let outcome = graph.apply_platform_manifest(&manifest)?;
    Ok(outcome.mode_set_restrictions)
}

/// Glob+merge the Layer 2 manifest's `extensions/` directory (default name
/// `"extensions"`, overridable via the manifest's `extensionsDir` field) into the
/// merged `extensions` `Value` [`TokenGraph::apply_platform_manifest`] expects.
///
/// Returns `Ok(None)` when the directory doesn't exist (or exists but every
/// category subdirectory is missing/empty) — this is not an error; a platform
/// with no extensions simply omits the directory.
///
/// See `packages/design-data-spec/spec/manifest.md#extensions-directory` for the
/// normative discovery/merge/precedence rules this implements.
fn build_extensions_value(
    manifest_path: &Path,
    manifest: &Value,
) -> Result<Option<Value>, CoreError> {
    let dir_name = manifest
        .get("extensionsDir")
        .and_then(|v| v.as_str())
        .unwrap_or("extensions");
    let ext_root = manifest_path
        .parent()
        .map_or_else(|| PathBuf::from(dir_name), |p| p.join(dir_name));
    if !ext_root.is_dir() {
        return Ok(None);
    }

    let mut out = Map::new();

    // tokens/ — *.tokens.json cascade-format files, concatenated in sorted path
    // order into one array (cascade token files are themselves top-level arrays,
    // which is exactly what `apply_platform_manifest` reads for `extensions.tokens`).
    let tokens_dir = ext_root.join("tokens");
    if tokens_dir.is_dir() {
        let files: Vec<PathBuf> = discover_json_files(&tokens_dir)?
            .into_iter()
            .filter(|p| p.to_string_lossy().ends_with(".tokens.json"))
            .collect();
        let tokens = load_and_concat(&files)?;
        if !tokens.is_empty() {
            out.insert("tokens".to_string(), Value::Array(tokens));
        }
    }

    // components/, fields/, guidelines/, platform-extensions/ — one artifact per
    // file (though a file holding an array of several is tolerated too), all files
    // in the subdirectory concatenated in sorted path order.
    for (dir_name, key) in CONCAT_CATEGORIES {
        let dir = ext_root.join(dir_name);
        if !dir.is_dir() {
            continue;
        }
        let items = load_and_concat(&discover_json_files(&dir)?)?;
        if !items.is_empty() {
            out.insert((*key).to_string(), Value::Array(items));
        }
    }

    // relationships/ — plain adds (no "op") must precede override/remove ops, so
    // that an override/remove in a later-sorted file can still target an add from
    // an earlier one; `apply_platform_manifest` processes this array strictly in
    // order. Partition is stable: within each group, sorted-path order is kept.
    let rel_dir = ext_root.join("relationships");
    if rel_dir.is_dir() {
        let items = load_and_concat(&discover_json_files(&rel_dir)?)?;
        if !items.is_empty() {
            let (mut adds, ops): (Vec<Value>, Vec<Value>) =
                items.into_iter().partition(|v| v.get("op").is_none());
            adds.extend(ops);
            out.insert("relationships".to_string(), Value::Array(adds));
        }
    }

    Ok((!out.is_empty()).then_some(Value::Object(out)))
}

/// Read and parse each file in `files`, flattening top-level arrays (cascade
/// token files, or a fragment file holding several entries) and pushing bare
/// objects as-is, preserving `files`' order throughout.
fn load_and_concat(files: &[PathBuf]) -> Result<Vec<Value>, CoreError> {
    let mut out = Vec::new();
    for f in files {
        let text = std::fs::read_to_string(f)?;
        let val: Value = serde_json::from_str(&text).map_err(|e| {
            CoreError::ParseError(format!(
                "failed to parse extension fragment {}: {e}",
                f.display()
            ))
        })?;
        match val {
            Value::Array(items) => out.extend(items),
            other => out.push(other),
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_source::{Provenance, ResolvedData};
    use crate::graph::TokenGraph;
    use serde_json::json;
    use std::path::PathBuf;

    /// The real `packages/tokens/schemas` dir, whose ancestry contains
    /// `packages/design-data-spec/schemas/manifest.schema.json` — mirrors the
    /// default `schemas_root` an in-repo `ResolvedData` carries.
    fn repo_schemas_root() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/schemas")
    }

    fn resolved_with_manifest(manifest_path: PathBuf, schemas_root: PathBuf) -> ResolvedData {
        ResolvedData {
            tokens_root: PathBuf::from("tokens"),
            schemas_root,
            mode_sets: None,
            components: None,
            fields: None,
            guidelines: None,
            relationships: None,
            exceptions: None,
            manifest: None,
            platform_manifest: Some(manifest_path),
            provenance: Provenance::InRepo,
        }
    }

    fn make_graph() -> TokenGraph {
        TokenGraph::from_pairs(vec![
            (
                "btn-bg".into(),
                PathBuf::from("tokens.json"),
                json!({
                    "name": {"property": "background-color", "component": "button"},
                    "value": "#aaa",
                    "uuid": "u-btn-bg"
                }),
            ),
            (
                "btn-fg".into(),
                PathBuf::from("tokens.json"),
                json!({
                    "name": {"property": "color", "component": "button"},
                    "value": "#111",
                    "uuid": "u-btn-fg"
                }),
            ),
            (
                "chk-bg".into(),
                PathBuf::from("tokens.json"),
                json!({
                    "name": {"property": "background-color", "component": "checkbox"},
                    "value": "#bbb",
                    "uuid": "u-chk-bg"
                }),
            ),
        ])
    }

    /// Write `manifest.json` (specVersion/foundationVersion plus any `extra`
    /// top-level fields — e.g. `extensionsDir`) and, for each `(subdir, filename,
    /// content)` triple, a fragment file under `<dir>/extensions/<subdir>/<filename>`.
    /// Returns the manifest path. `content` is written as-is, so pass a JSON array
    /// for `tokens/`/`relationships/` fixtures that need several entries in one file.
    fn write_manifest_with_extensions(
        dir: &Path,
        extra: Value,
        files: &[(&str, &str, Value)],
    ) -> PathBuf {
        let mut manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
        });
        if let Value::Object(extra) = extra {
            manifest.as_object_mut().unwrap().extend(extra);
        }
        let manifest_path = dir.join("manifest.json");
        std::fs::write(&manifest_path, manifest.to_string()).unwrap();

        for (subdir, filename, content) in files {
            let sub = dir.join("extensions").join(subdir);
            std::fs::create_dir_all(&sub).unwrap();
            std::fs::write(sub.join(filename), content.to_string()).unwrap();
        }
        manifest_path
    }

    #[test]
    fn no_manifest_is_noop() {
        let mut graph = make_graph();
        let resolved = ResolvedData {
            tokens_root: PathBuf::from("tokens"),
            schemas_root: PathBuf::from("schemas"),
            mode_sets: None,
            components: None,
            fields: None,
            guidelines: None,
            relationships: None,
            exceptions: None,
            manifest: None,
            platform_manifest: None,
            provenance: Provenance::InRepo,
        };
        let restrictions = apply_configured(&mut graph, &resolved).unwrap();
        assert!(restrictions.is_empty());
        assert_eq!(graph.tokens.len(), 3);
    }

    #[test]
    fn include_filter_reduces_token_set() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "include": ["component=button"]
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let restrictions = apply_configured(&mut graph, &resolved).unwrap();
        assert!(restrictions.is_empty());
        assert_eq!(graph.tokens.len(), 2);
        assert!(graph.tokens.contains_key("btn-bg"));
        assert!(graph.tokens.contains_key("btn-fg"));
        assert!(!graph.tokens.contains_key("chk-bg"));
    }

    #[test]
    fn invalid_manifest_query_returns_error() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "include": ["not-a-valid-query"]
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("query parse error"));
    }

    #[test]
    fn missing_schema_is_an_error_not_a_silent_skip() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0"
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        // schemas_root has no ancestor containing manifest.schema.json.
        let resolved = resolved_with_manifest(manifest_path, dir.path().to_path_buf());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("could not be located"));
    }

    #[test]
    fn manifest_injects_platform_component() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "components",
                "tab-bar-ios.json",
                json!({
                    "$id": "tab-bar-ios",
                    "name": "tab-bar-ios",
                    "displayName": "Tab Bar (iOS)",
                    "meta": {"category": "navigation", "documentationUrl": "https://example.com"}
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let injected = graph
            .components
            .iter()
            .find(|c| c.name == "tab-bar-ios")
            .expect("injected component present");
        assert_eq!(injected.layer, crate::graph::Layer::Platform);
    }

    #[test]
    fn manifest_injects_platform_extension() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "platform-extensions",
                "ios-states.json",
                json!({
                    "platform": "iOS",
                    "extends": "states",
                    "extensions": [{"termId": "default", "platformTerm": "normal"}]
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let injected = graph
            .platform_extensions
            .iter()
            .find(|r| r.platform == "iOS" && r.extends == "states")
            .expect("injected platform extension present");
        assert_eq!(injected.raw["extensions"][0]["termId"], "default");
    }

    #[test]
    fn manifest_injects_platform_field() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "fields",
                "hapticStyle.json",
                json!({
                    "name": "hapticStyle",
                    "kind": "semantic",
                    "registry": null,
                    "validation": "none",
                    "serialization": {"position": 9},
                    "required": false
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let injected = graph
            .fields
            .iter()
            .find(|f| f.name == "hapticStyle")
            .expect("injected field present");
        assert!(!injected.required);
    }

    #[test]
    fn manifest_injects_platform_guideline() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "guidelines",
                "ios-haptics.json",
                json!({
                    "$id": "https://example.com/guidelines/ios-haptics",
                    "name": "ios-haptics",
                    "title": "iOS Haptics",
                    "category": "developing",
                    "documentBlocks": [
                        {"type": "purpose", "content": "When to use haptic feedback on iOS."}
                    ]
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let injected = graph
            .guidelines
            .iter()
            .find(|g| g.name == "ios-haptics")
            .expect("injected guideline present");
        assert_eq!(injected.raw["title"], "iOS Haptics");
    }

    #[test]
    fn manifest_injects_platform_relationship() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "relationships",
                "button.json",
                json!({
                    "scope": {"component": "button", "property": "corner-radius"},
                    "value": "4px",
                    "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let injected = graph
            .relationships
            .iter()
            .find(|r| r.uuid.as_deref() == Some("9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"))
            .expect("injected relationship present");
        assert_eq!(injected.raw["value"], "4px");
    }

    #[test]
    fn manifest_overrides_relationship_by_uuid() {
        // The override file sorts *before* the add file alphabetically
        // ("a-override.json" < "z-add.json"), which would misorder a naive
        // sorted-path concat — the loader's adds-before-ops partition must
        // still land the add ahead of its override regardless of file order.
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[
                (
                    "relationships",
                    "a-override.json",
                    json!({
                        "op": "override",
                        "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a",
                        "value": {
                            "scope": {"component": "button", "property": "corner-radius"},
                            "value": "8px",
                            "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                        }
                    }),
                ),
                (
                    "relationships",
                    "z-add.json",
                    json!({
                        "scope": {"component": "button", "property": "corner-radius"},
                        "value": "4px",
                        "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                    }),
                ),
            ],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let overridden = graph
            .relationships
            .iter()
            .find(|r| r.uuid.as_deref() == Some("9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"))
            .expect("overridden relationship present");
        assert_eq!(overridden.raw["value"], "8px");
        assert_eq!(graph.relationships.len(), 1);
    }

    #[test]
    fn manifest_plain_add_relationship_appends_even_on_uuid_collision() {
        // A plain add (no "op") must never silently overwrite an existing
        // relationship, even if its uuid happens to collide — only an explicit
        // "op": "override" entry may replace. Regression for a bug where
        // colliding plain adds were routed through upsert-by-uuid.
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[
                (
                    "relationships",
                    "button.json",
                    json!({
                        "scope": {"component": "button", "property": "corner-radius"},
                        "value": "4px",
                        "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                    }),
                ),
                (
                    "relationships",
                    "slider.json",
                    json!({
                        "scope": {"component": "slider", "property": "corner-radius"},
                        "value": "2px",
                        "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                    }),
                ),
            ],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let matching: Vec<_> = graph
            .relationships
            .iter()
            .filter(|r| r.uuid.as_deref() == Some("9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"))
            .collect();
        assert_eq!(
            matching.len(),
            2,
            "both plain adds must be appended, not one overwriting the other"
        );
    }

    #[test]
    fn manifest_removes_relationship_by_uuid() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[
                (
                    "relationships",
                    "button.json",
                    json!({
                        "scope": {"component": "button", "property": "corner-radius"},
                        "value": "4px",
                        "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                    }),
                ),
                (
                    "relationships",
                    "remove-button.json",
                    json!({
                        "op": "remove",
                        "uuid": "9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a"
                    }),
                ),
            ],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        assert!(graph
            .relationships
            .iter()
            .all(|r| r.uuid.as_deref() != Some("9c858f9c-1d90-4f1a-8c1a-1f1a1f1a1f1a")));
    }

    #[test]
    fn manifest_rejects_relationship_override_without_uuid() {
        // Under the extensions/ directory layout, manifest.json itself no longer
        // carries `extensions` (schema forbids it — see PR #1420), so there's no
        // more inline-schema rejection path for this. It's now
        // `apply_platform_manifest` (graph.rs) that rejects an override/remove
        // entry missing "uuid", once the loader has spliced the fragment in.
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "relationships",
                "bad-override.json",
                json!({
                    "op": "override",
                    "value": {
                        "scope": {"component": "button", "property": "corner-radius"},
                        "value": "8px"
                    }
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("missing a \"uuid\""));
    }

    #[test]
    fn manifest_rejects_unknown_term_id() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "platform-extensions",
                "ios-states.json",
                json!({
                    "platform": "iOS",
                    "extends": "states",
                    "extensions": [{"termId": "not-a-real-state"}]
                }),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("not-a-real-state"));
    }

    #[test]
    fn missing_extensions_dir_is_noop_not_an_error() {
        let dir = tempfile::tempdir().unwrap();
        // No `extensions/` directory at all next to manifest.json.
        let manifest_path = write_manifest_with_extensions(dir.path(), json!({}), &[]);

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let restrictions = apply_configured(&mut graph, &resolved).unwrap();
        assert!(restrictions.is_empty());
        assert_eq!(graph.tokens.len(), 3, "no extensions injected");
    }

    #[test]
    fn tokens_dir_concatenates_multiple_tokens_json_files_in_sorted_order() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[
                (
                    "tokens",
                    "a.tokens.json",
                    json!([{
                        "name": {"property": "elevation", "component": "card"},
                        "value": "4dp",
                        "uuid": "u-card-elev"
                    }]),
                ),
                (
                    "tokens",
                    "b.tokens.json",
                    json!([{
                        "name": {"property": "elevation", "component": "sheet"},
                        "value": "8dp",
                        "uuid": "u-sheet-elev"
                    }]),
                ),
            ],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let injected: Vec<_> = graph
            .tokens
            .values()
            .filter(|t| t.layer == crate::graph::Layer::Platform)
            .collect();
        assert_eq!(injected.len(), 2, "both tokens.json files injected");
        assert!(injected
            .iter()
            .any(|t| t.uuid.as_deref() == Some("u-card-elev")));
        assert!(injected
            .iter()
            .any(|t| t.uuid.as_deref() == Some("u-sheet-elev")));
    }

    #[test]
    fn later_file_wins_on_duplicate_component_name() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[
                (
                    "components",
                    "a-tab-bar-ios.json",
                    json!({
                        "$id": "tab-bar-ios",
                        "name": "tab-bar-ios",
                        "displayName": "First",
                        "meta": {"category": "navigation", "documentationUrl": "https://example.com"}
                    }),
                ),
                (
                    "components",
                    "b-tab-bar-ios.json",
                    json!({
                        "$id": "tab-bar-ios",
                        "name": "tab-bar-ios",
                        "displayName": "Second",
                        "meta": {"category": "navigation", "documentationUrl": "https://example.com"}
                    }),
                ),
            ],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        let matching: Vec<_> = graph
            .components
            .iter()
            .filter(|c| c.name == "tab-bar-ios")
            .collect();
        assert_eq!(matching.len(), 1, "add-or-replace by name, not two entries");
        assert_eq!(matching[0].raw["displayName"], "Second");
    }

    #[test]
    fn extensions_dir_field_overrides_default_directory_name() {
        let dir = tempfile::tempdir().unwrap();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "extensionsDir": "platform-extras",
        });
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(&manifest_path, manifest.to_string()).unwrap();
        let components_dir = dir.path().join("platform-extras").join("components");
        std::fs::create_dir_all(&components_dir).unwrap();
        std::fs::write(
            components_dir.join("tab-bar-ios.json"),
            json!({
                "$id": "tab-bar-ios",
                "name": "tab-bar-ios",
                "displayName": "Tab Bar (iOS)",
                "meta": {"category": "navigation", "documentationUrl": "https://example.com"}
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();
        assert!(graph.components.iter().any(|c| c.name == "tab-bar-ios"));
    }
}
