// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Which Figma collection a token routes to, and resolving that collection
//! (and its modes) against a real Figma file's `VariablesMeta`.

use std::collections::HashMap;
use std::path::Path;

use crate::types::{FigmaMode, FigmaVariableCollection, VariablesMeta};
use crate::FigmaError;

// ── Schema URL suffixes ──────────────────────────────────────────────────────

pub(super) const COLOR_SET: &str = "color-set.json";
pub(super) const COLOR: &str = "color.json";
pub(super) const SCALE_SET: &str = "scale-set.json";
pub(super) const DIMENSION: &str = "dimension.json";
pub(super) const ANGLE: &str = "angle.json";
pub(super) const MULTIPLIER: &str = "multiplier.json";
pub(crate) const OPACITY: &str = "opacity.json";
pub(super) const FONT_FAMILY: &str = "font-family.json";
pub(super) const FONT_SIZE: &str = "font-size.json";
pub(crate) const FONT_STYLE: &str = "font-style.json";
pub(crate) const FONT_WEIGHT: &str = "font-weight.json";
pub(super) const ALIAS: &str = "alias.json";

// Schemas excluded by export policy: composites and unsupported semantic types.
pub(super) const SKIP_SCHEMAS: &[&str] = &[
    "typography.json",
    "drop-shadow.json",
    "gradient-stop.json",
    "alignment.json",
    "text-transform.json",
];

// ── Collection prefixes ──────────────────────────────────────────────────────

pub(super) const COLOR_THEME_COLLECTION: &str = ".Color theme";
pub(super) const COLOR_THEME_PREFIX: &str = "colorTheme";
pub(super) const PLATFORM_SCALE_COLLECTION: &str = ".Platform scale";
pub(super) const PLATFORM_SCALE_PREFIX: &str = "platformScale";

/// Which declared mode set a token's schema routes through — orthogonal to
/// which specific collection it lands in. Each kind names the mode set whose
/// modes (from `graph.mode_sets`) the collection carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum TokenKind {
    Color,
    Scale,
}

impl TokenKind {
    /// Id of the `mode-sets/*.json` entry this kind routes through.
    pub(super) const fn mode_set(self) -> &'static str {
        match self {
            TokenKind::Color => "colorScheme",
            TokenKind::Scale => "scale",
        }
    }
}

/// A Figma collection this exporter can target, and which source token files
/// route into it. `source_files` is a list of file basenames; an empty slice
/// is a wildcard matching every file — used by today's two collections, since
/// the legacy corpus mixes color and scale schemas within the same files.
/// A non-empty `source_files` entry takes priority over a wildcard of the
/// same `kind` when a token's file matches both.
///
/// `modes` is the ordered mode list of the declared mode set the collection
/// models; it is not hardcoded here.
#[derive(Debug, Clone)]
pub struct CollectionSpec {
    pub(super) figma_collection_name: &'static str,
    pub(super) default_prefix: &'static str,
    pub(super) kind: TokenKind,
    pub(super) modes: Vec<String>,
    pub(super) source_files: &'static [&'static str],
}

/// Figma-side naming for each mode set this exporter maps to a collection.
/// Only the hand-built library's collection name and folder prefix live here;
/// the modes themselves come from the declared mode sets.
const FIGMA_COLLECTIONS: &[(TokenKind, &str, &str)] = &[
    (TokenKind::Color, COLOR_THEME_COLLECTION, COLOR_THEME_PREFIX),
    (
        TokenKind::Scale,
        PLATFORM_SCALE_COLLECTION,
        PLATFORM_SCALE_PREFIX,
    ),
];

/// Build the collection specs from the graph's declared mode sets
/// (`graph.mode_sets`): one spec per mapped mode set, with its modes in
/// declaration order. Fails if a mapped mode set isn't declared, since the
/// export can't route that kind of token without it.
pub fn collection_specs(
    mode_sets: &[design_data_core::graph::ModeSetRecord],
) -> Result<Vec<CollectionSpec>, FigmaError> {
    // A graph loaded without a mode-sets directory declares none; use the
    // spec's built-in color-scheme and scale sets so such graphs still export.
    let builtin;
    let mode_sets = if mode_sets.is_empty() {
        let record = |name: &str, modes: &[&str]| design_data_core::graph::ModeSetRecord {
            file: std::path::PathBuf::new(),
            name: name.to_string(),
            modes: modes.iter().map(|m| (*m).to_string()).collect(),
            default_mode: modes[0].to_string(),
        };
        builtin = [
            record("colorScheme", &["light", "dark", "wireframe"]),
            record("scale", &["desktop", "mobile"]),
        ];
        &builtin[..]
    } else {
        mode_sets
    };
    FIGMA_COLLECTIONS
        .iter()
        .map(|&(kind, figma_collection_name, default_prefix)| {
            let set = mode_sets
                .iter()
                .find(|m| m.name == kind.mode_set())
                .ok_or_else(|| FigmaError::Api {
                    status: 0,
                    message: format!(
                        "mode set '{}' is not declared; it is required for collection '{figma_collection_name}'",
                        kind.mode_set()
                    ),
                })?;
            Ok(CollectionSpec {
                figma_collection_name,
                default_prefix,
                kind,
                modes: set.modes.clone(),
                source_files: &[],
            })
        })
        .collect()
}

fn find_collection<'a>(meta: &'a VariablesMeta, name: &str) -> Option<&'a FigmaVariableCollection> {
    meta.variable_collections.values().find(|c| c.name == name)
}

/// A [`CollectionSpec`] resolved against a real Figma file's collections/modes.
pub(super) struct ResolvedCollection<'a> {
    pub(super) spec: &'a CollectionSpec,
    pub(super) collection_id: &'a str,
    pub(super) mode_ids: HashMap<String, String>,
    pub(super) default_mode_id: &'a str,
}

/// Resolve every entry in `specs` against `existing`, failing fast if any
/// named collection is missing from the file — same fail-fast behavior as
/// the two hardcoded `find_collection` calls this replaces, generalized to
/// however many entries `specs` has.
pub(super) fn resolve_collections<'a>(
    existing: &'a VariablesMeta,
    specs: &'a [CollectionSpec],
) -> Result<Vec<ResolvedCollection<'a>>, FigmaError> {
    specs
        .iter()
        .map(|spec| {
            let col = find_collection(existing, spec.figma_collection_name).ok_or_else(|| {
                FigmaError::Api {
                    status: 0,
                    message: format!(
                        "collection '{}' not found in file",
                        spec.figma_collection_name
                    ),
                }
            })?;
            Ok(ResolvedCollection {
                spec,
                collection_id: &col.id,
                mode_ids: resolve_mode_ids(&col.modes, &spec.modes),
                default_mode_id: &col.default_mode_id,
            })
        })
        .collect()
}

/// Pick the collection a token in `file` should route to for `kind`. A
/// specific (non-empty `source_files`) match always wins over the wildcard
/// fallback for the same kind, regardless of table order.
pub(super) fn pick_collection<'a, 'b>(
    resolved: &'b [ResolvedCollection<'a>],
    kind: TokenKind,
    file: &Path,
) -> Option<&'b ResolvedCollection<'a>> {
    let basename = file.file_name().and_then(|f| f.to_str()).unwrap_or("");
    resolved
        .iter()
        .find(|r| r.spec.kind == kind && r.spec.source_files.contains(&basename))
        .or_else(|| {
            resolved
                .iter()
                .find(|r| r.spec.kind == kind && r.spec.source_files.is_empty())
        })
}

/// Map mode names (e.g. "light", "dark") to their Figma mode IDs.
/// Case-insensitive matching since Figma uses "Light"/"Dark" etc.
fn resolve_mode_ids(figma_modes: &[FigmaMode], expected: &[String]) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for mode_name in expected {
        if let Some(fm) = figma_modes
            .iter()
            .find(|m| m.name.eq_ignore_ascii_case(mode_name))
        {
            map.insert(mode_name.to_string(), fm.mode_id.clone());
        }
    }
    map
}
