// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Primer: structural dataset overview for agent session start.
//!
//! [`build`] assembles a [`PrimerData`] from a [`TokenGraph`] and a
//! caller-supplied provenance value.  Both CLI and WASM share this logic;
//! they differ only in how they derive provenance and how they print/return
//! the result.

use serde::{Deserialize, Serialize};

use crate::graph::TokenGraph;

/// Spec version string declared by this crate.
///
/// Mirrors the `specVersion` field in the primer payload and the CLI output.
pub const SPEC_VERSION: &str = "1.0.0-draft";

/// Re-export of the embedded dataset tokens-version string for consumers (e.g. WASM)
/// that cannot access the private `data_source::embedded` module.
pub use crate::data_source::embedded::EMBEDDED_DATA_VERSION;

/// A mode-set summary entry in a primer payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimerModeSet {
    pub name: String,
    pub modes: Vec<String>,
    pub default_mode: String,
}

/// A taxonomy field summary entry in a primer payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimerField {
    pub name: String,
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Full primer payload assembled from a [`TokenGraph`].
///
/// Shape: `{ specVersion, tokenCount, modeSets, components, taxonomyFields,
/// manifest, provenance }` — identical to the JSON emitted by `design-data primer`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimerData {
    pub spec_version: String,
    pub token_count: usize,
    pub mode_sets: Vec<PrimerModeSet>,
    pub components: Vec<String>,
    pub taxonomy_fields: Vec<PrimerField>,
    pub manifest: serde_json::Value,
    pub provenance: serde_json::Value,
}

/// Build a primer payload from `graph` and caller-supplied `provenance`.
///
/// `provenance` is surface-specific:
/// - CLI derives it from `data_source::Provenance` (in-repo, config, cache, embedded).
/// - WASM uses `{ "source": "embedded", "tokensVersion": EMBEDDED_DATA_VERSION }`
///   for the embedded dataset, or `{ "source": "in-memory" }` for `fromTokens`.
pub fn build(graph: &TokenGraph, provenance: serde_json::Value) -> PrimerData {
    let mode_sets: Vec<PrimerModeSet> = graph
        .mode_sets
        .iter()
        .map(|ms| PrimerModeSet {
            name: ms.name.clone(),
            modes: ms.modes.clone(),
            default_mode: ms.default_mode.clone(),
        })
        .collect();

    let mut components: Vec<String> = graph.components.iter().map(|c| c.name.clone()).collect();
    components.sort();

    let mut taxonomy_fields: Vec<PrimerField> = graph
        .fields
        .iter()
        .map(|f| PrimerField {
            name: f.name.clone(),
            required: f.required,
            description: f.description.clone(),
        })
        .collect();
    taxonomy_fields.sort_by(|a, b| a.name.cmp(&b.name));

    PrimerData {
        spec_version: SPEC_VERSION.to_string(),
        token_count: graph.tokens.len(),
        mode_sets,
        components,
        taxonomy_fields,
        manifest: graph.manifest.clone(),
        provenance,
    }
}
