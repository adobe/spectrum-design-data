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

use crate::data_source::ResolvedData;
use crate::graph::TokenGraph;
use crate::schema::SchemaRegistry;
use crate::CoreError;

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
    let manifest: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
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

    let outcome = graph.apply_platform_manifest(&manifest)?;
    Ok(outcome.mode_set_restrictions)
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
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "extensions": {
                    "components": [{
                        "$id": "tab-bar-ios",
                        "name": "tab-bar-ios",
                        "displayName": "Tab Bar (iOS)",
                        "meta": {"category": "navigation", "documentationUrl": "https://example.com"}
                    }]
                }
            })
            .to_string(),
        )
        .unwrap();

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
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "extensions": {
                    "platformExtensions": [{
                        "platform": "iOS",
                        "extends": "states",
                        "extensions": [{"termId": "default", "platformTerm": "normal"}]
                    }]
                }
            })
            .to_string(),
        )
        .unwrap();

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
    fn manifest_injects_platform_guideline() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "extensions": {
                    "guidelines": [{
                        "$id": "https://example.com/guidelines/ios-haptics",
                        "name": "ios-haptics",
                        "title": "iOS Haptics",
                        "category": "developing",
                        "documentBlocks": [
                            {"type": "purpose", "content": "When to use haptic feedback on iOS."}
                        ]
                    }]
                }
            })
            .to_string(),
        )
        .unwrap();

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
    fn manifest_rejects_unknown_term_id() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "extensions": {
                    "platformExtensions": [{
                        "platform": "iOS",
                        "extends": "states",
                        "extensions": [{"termId": "not-a-real-state"}]
                    }]
                }
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("not-a-real-state"));
    }
}
