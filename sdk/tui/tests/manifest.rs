// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! TUI session load applies the platform manifest the same way as the CLI.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use design_data_core::cascade::{resolve_property, ResolutionContext};
use design_data_core::data_source::{self, CliPathOverrides};
use design_data_core::graph::TokenGraph;
use design_data_core::manifest;
use design_data_core::query::{self, TokenIndex};
use design_data_tui::app::ActiveView;
use design_data_tui::message::Message;
use design_data_tui::model::Model;
use design_data_tui::update::{update, UpdateCtx};
use serde_json::json;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

fn setup_project(manifest: serde_json::Value) -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    let tokens_dir = project.path().join("tokens");
    fs::create_dir_all(&tokens_dir).expect("create tokens dir");

    fs::write(
        tokens_dir.join("tokens.json"),
        json!({
            "btn-bg": {"name": {"property": "background-color", "component": "button"}, "value": "#aaa", "uuid": "u-btn-bg"},
            "btn-fg": {"name": {"property": "color", "component": "button"}, "value": "#111", "uuid": "u-btn-fg"},
            "chk-bg": {"name": {"property": "background-color", "component": "checkbox"}, "value": "#bbb", "uuid": "u-chk-bg"}
        })
        .to_string(),
    )
    .expect("write tokens");

    fs::write(
        project.path().join("manifest.json"),
        serde_json::to_string_pretty(&manifest).expect("serialize manifest"),
    )
    .expect("write manifest");

    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\nmanifest = \"manifest.json\"\n",
            repo_root().display()
        ),
    )
    .expect("write config");

    project
}

/// Mirror `DatasetHandle::load` manifest application for integration tests.
fn load_session(
    project_path: &Path,
    tokens_path: &Path,
) -> (TokenGraph, TokenIndex, HashMap<String, Vec<String>>) {
    let (mut graph, mut token_index) =
        TokenGraph::open_cached_with_index(tokens_path).expect("open cached graph");

    let resolved =
        data_source::resolve(project_path, &CliPathOverrides::default()).expect("resolve");

    if let Some(ref dir) = resolved.mode_sets {
        if dir.is_dir() {
            let mode_sets = TokenGraph::load_spec_mode_sets(dir).expect("mode sets");
            graph = graph.with_mode_sets(mode_sets);
        }
    }

    let mode_set_restrictions =
        manifest::apply_configured(&mut graph, &resolved).expect("manifest");
    if resolved.platform_manifest.is_some() {
        token_index = TokenIndex::build(&graph);
    }

    (graph, token_index, mode_set_restrictions)
}

#[test]
fn session_load_applies_manifest_include_filter() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["component=button"]
    }));

    let project_path = project.path().to_path_buf();
    let tokens_dir = project_path.join("tokens");
    let (graph, token_index, restrictions) = load_session(&project_path, &tokens_dir);

    assert!(restrictions.is_empty());
    assert_eq!(graph.tokens.len(), 2);

    let expr = query::parse("").expect("empty filter");
    let matched = query::filter_with_index(&graph, &token_index, &expr);
    assert_eq!(matched.len(), 2);
    assert!(matched
        .iter()
        .all(|t| { t.raw["name"]["component"].as_str() == Some("button") }));
}

#[test]
fn resolve_respects_manifest_restrictions() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["component=button"],
        "modeSetRestrictions": {
            "colorScheme": {"allowed": ["light"]}
        }
    }));

    let project_path = project.path().to_path_buf();
    let tokens_dir = project_path.join("tokens");
    let (graph, token_index, restrictions) = load_session(&project_path, &tokens_dir);

    let prop = "background-color".to_string();
    let ctx = ResolutionContext::new().with("colorScheme", "light");
    let ctx = restrictions.iter().fold(ctx, |acc, (mode_set, allowed)| {
        acc.with_restriction(mode_set.clone(), allowed.clone())
    });
    let candidates = resolve_property(&graph, prop.as_str(), &ctx);
    assert!(!candidates.is_empty());
    assert!(candidates.iter().any(|c| c.is_winner));

    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(&tokens_dir),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index,
        mode_set_restrictions: restrictions,
        allow_write: false,
    };
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("resolve property=background-color,colorScheme=light".into()),
        &ctx,
    );
    match &model.active_view {
        ActiveView::Resolve(view) => {
            assert!(!view.rows.is_empty());
            assert!(view.rows.iter().any(|r| r.is_winner));
        }
        other => panic!(
            "expected resolve view, got {:?}",
            std::mem::discriminant(other)
        ),
    }
}
