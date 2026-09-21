// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The public entry points: build a Figma Variables POST payload from a flat
//! set of legacy-shaped tokens, and summarize an existing file's variables.

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use serde_json::Value;

use super::convert::{
    build_value_index, process_alias_token, process_color_set_token, process_flat_token,
    process_scale_set_token, resolve_variable_id, schema_to_figma_type, variable_alias_target_id,
};
use super::routing::{
    resolve_collections, CollectionSpec, TokenKind, ALIAS, COLLECTION_SPECS, COLOR, COLOR_SET,
    DIMENSION, FONT_FAMILY, FONT_SIZE, FONT_STYLE, FONT_WEIGHT, OPACITY, SCALE_SET, SKIP_SCHEMAS,
};
use crate::types::{
    FigmaVariableCollection, ModeValueAction, PostVariablesBody, VariableAction, VariablesMeta,
};
use crate::FigmaError;

/// A structured summary of one Figma collection and its non-remote variables.
#[derive(Debug)]
pub struct CollectionSummary {
    /// The collection record (name, id, modes).
    pub collection: FigmaVariableCollection,
    /// All non-remote variables in this collection, sorted by name.
    pub variables: Vec<crate::types::FigmaVariable>,
}

/// Summarize a `VariablesMeta` payload into a list of [`CollectionSummary`] entries,
/// one per collection, sorted by collection name.
///
/// Remote variables (where `variable.remote == true`) are excluded.  This is the
/// structured data behind the CLI's `figma read --format pretty` output; callers
/// apply their own presentation (sample limit, truncation text, etc.).
pub fn summarize_variables(meta: &VariablesMeta) -> Vec<CollectionSummary> {
    let mut collections: Vec<&FigmaVariableCollection> =
        meta.variable_collections.values().collect();
    collections.sort_by(|a, b| a.name.cmp(&b.name));

    collections
        .into_iter()
        .map(|col| {
            let mut variables: Vec<crate::types::FigmaVariable> = meta
                .variables
                .values()
                .filter(|v| v.variable_collection_id == col.id && !v.remote)
                .cloned()
                .collect();
            variables.sort_by(|a, b| a.name.cmp(&b.name));
            CollectionSummary {
                collection: col.clone(),
                variables,
            }
        })
        .collect()
}

/// Summary of an export operation.
#[derive(Debug, Default)]
pub struct ExportSummary {
    pub variables_created: usize,
    pub mode_values_set: usize,
    pub mode_values_aliased: usize,
    pub mode_warnings: Vec<String>,
    pub skipped_composite: Vec<String>,
    pub skipped_alias_unresolved: Vec<String>,
    pub skipped_unknown_schema: Vec<String>,
    pub skipped_unparseable_value: Vec<String>,
}

/// Build a Figma POST payload from a flat set of legacy-shaped token entries.
///
/// `tokens` is `(name, source file, raw legacy JSON entry)` triples — either
/// loaded straight from a token-source directory ([`super::convert::load_all_tokens`])
/// or collected from a manifest-resolved [`design_data_core::graph::TokenGraph`]
/// (`(record.name, record.file, record.raw)` for each
/// [`design_data_core::graph::TokenRecord`]) so platform overrides/extensions are
/// reflected in the export. The source file lets [`CollectionSpec::source_files`]
/// route a token by which file it came from, not just by `$schema`.
///
/// `existing` is the result of `GET /v1/files/:file_key/variables/local` —
/// used to look up collection and mode IDs for the target collections.
///
/// `overrides` maps a legacy token key to an explicit Figma Variable name
/// (from a `figma audit` artifact); keys absent from the map fall back to the
/// default `{prefix}/{legacyKey}` naming. `None` or an empty map preserves
/// today's naming for every token.
pub fn build_export_payload(
    tokens: &[(String, PathBuf, Value)],
    existing: &VariablesMeta,
    overrides: Option<&HashMap<String, String>>,
) -> Result<(PostVariablesBody, ExportSummary), FigmaError> {
    build_export_payload_with_platform_formats(tokens, existing, overrides, &[])
}

/// Same as [`build_export_payload`], but also populates `codeSyntax` for the
/// given platforms (Figma's `"ANDROID" | "iOS"` keys — `"WEB"` is always
/// populated from the legacy key) by running each manifest's `formatting`
/// config (`packages/design-data-spec/spec/manifest.md`) through
/// [`design_data_core::naming::format_name`]. An empty slice reproduces
/// [`build_export_payload`] exactly.
pub fn build_export_payload_with_platform_formats(
    tokens: &[(String, PathBuf, Value)],
    existing: &VariablesMeta,
    overrides: Option<&HashMap<String, String>>,
    platform_formats: &[(String, design_data_core::naming::FormattingConfig)],
) -> Result<(PostVariablesBody, ExportSummary), FigmaError> {
    let (mut body, summary) =
        build_export_payload_with_specs(tokens, existing, overrides, COLLECTION_SPECS)?;
    if !platform_formats.is_empty() {
        augment_code_syntax_with_platform_formats(&mut body.variables, platform_formats);
    }
    Ok((body, summary))
}

/// Best-effort per-platform code name for an already-exported variable, keyed
/// off the `WEB` `codeSyntax` entry [`super::convert`]'s `make_variable_action`
/// always sets (`--spectrum-{legacyKey}`) — cheaper than threading a new
/// parameter through every `process_*_token` call site, since the legacy key
/// is fully recoverable from it. Inverts the flat legacy key back into a
/// structured name object via [`design_data_core::naming::parse_legacy_name`]
/// (best-effort — see its docs) and runs that through the manifest
/// `formatting` engine.
///
/// ponytail: `component_hint` is passed as `None` here — there's no reliable way
/// to recover *which* leading segment of an already-flattened key was the
/// `component` without guessing (and `parse_legacy_name`'s hint is documented as
/// trusted, not inferred, since component ids can be ambiguous prefixes). So for
/// a component-scoped token, `formatting.conceptOrder`/`abbreviations` entries
/// for `"component"` have no effect through this path — the component segment
/// stays fused into `property` and only whole-token casing/delimiter conversion
/// applies. Upgrade path: thread the structured name (or just its `component`)
/// through the export call graph instead of reconstructing from the flat key.
fn platform_code_name(
    token_name: &str,
    config: &design_data_core::naming::FormattingConfig,
) -> Option<String> {
    let name_obj = design_data_core::naming::parse_legacy_name(token_name, None);
    let value = serde_json::to_value(&name_obj).ok()?;
    design_data_core::naming::format_name(&value, config)
}

/// Add ANDROID/iOS (or any other platform key) `codeSyntax` entries to every
/// already-built variable, derived from its `WEB` entry. See
/// [`platform_code_name`] for why this is a post-pass rather than threading a
/// new parameter through the export call graph.
pub(super) fn augment_code_syntax_with_platform_formats(
    variables: &mut [VariableAction],
    platform_formats: &[(String, design_data_core::naming::FormattingConfig)],
) {
    for var in variables.iter_mut() {
        let Some(code_syntax) = var.code_syntax.as_mut() else {
            continue;
        };
        let Some(token_name) = code_syntax
            .get("WEB")
            .and_then(|web| web.strip_prefix("--spectrum-"))
            .map(str::to_string)
        else {
            continue;
        };
        for (platform, config) in platform_formats {
            if let Some(name) = platform_code_name(&token_name, config) {
                code_syntax.insert(platform.clone(), name);
            }
        }
    }
}

/// Same as [`build_export_payload`], but with an explicit collection-spec
/// table — the production entry point always uses [`COLLECTION_SPECS`]; tests
/// use this to exercise routing against additional mock collections.
pub(super) fn build_export_payload_with_specs(
    tokens: &[(String, PathBuf, Value)],
    existing: &VariablesMeta,
    overrides: Option<&HashMap<String, String>>,
    specs: &'static [CollectionSpec],
) -> Result<(PostVariablesBody, ExportSummary), FigmaError> {
    // 1. Look up collection and mode IDs from the existing file, for every
    // collection the spec table can route to.
    let resolved = resolve_collections(existing, specs)?;

    // 2. Build a name→value lookup for alias resolution.
    let value_index = build_value_index(tokens);

    // 4. Process each token.
    let mut summary = ExportSummary::default();
    let mut variables: Vec<VariableAction> = Vec::new();
    let mut mode_values: Vec<ModeValueAction> = Vec::new();

    // Build index of existing variable names → IDs for UPDATE detection.
    let existing_var_index: HashMap<&str, &str> = existing
        .variables
        .values()
        .map(|v| (v.name.as_str(), v.id.as_str()))
        .collect();

    // 3. Pre-pass: resolve every non-skipped, non-alias-schema token's Figma
    // variable id up front, so a token that aliases a target processed later in
    // the main loop can still emit a VARIABLE_ALIAS instead of a flattened literal.
    let mut alias_target_ids: HashMap<String, String> = HashMap::new();
    for (token_name, token_file, token_entry) in tokens {
        let schema = token_entry
            .get("$schema")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if SKIP_SCHEMAS.iter().any(|s| schema.ends_with(s)) || schema.ends_with(ALIAS) {
            continue;
        }
        let kind = if schema.ends_with(COLOR_SET)
            || schema.ends_with(COLOR)
            || schema.ends_with(OPACITY)
        {
            // Opacity lives in the Color theme collection in the manual
            // library, not Platform scale, despite being a FLOAT.
            TokenKind::Color
        } else if schema.ends_with(SCALE_SET)
            || schema.ends_with(DIMENSION)
            || schema.ends_with(FONT_FAMILY)
            || schema.ends_with(FONT_SIZE)
            || schema.ends_with(FONT_STYLE)
            || schema.ends_with(FONT_WEIGHT)
        {
            TokenKind::Scale
        } else {
            continue;
        };
        let Some(rc) = super::routing::pick_collection(&resolved, kind, token_file) else {
            continue;
        };
        let (_, id) = resolve_variable_id(
            token_name,
            rc.spec.default_prefix,
            &existing_var_index,
            overrides,
        );
        alias_target_ids.insert(token_name.clone(), id);
    }

    for (token_name, token_file, token_entry) in tokens {
        let schema = token_entry
            .get("$schema")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // Skip composite types.
        if SKIP_SCHEMAS.iter().any(|s| schema.ends_with(s)) {
            summary.skipped_composite.push(token_name.clone());
            continue;
        }

        // Route to the appropriate collection.
        if schema.ends_with(COLOR_SET) {
            let Some(rc) = super::routing::pick_collection(&resolved, TokenKind::Color, token_file)
            else {
                summary.skipped_unknown_schema.push(token_name.clone());
                continue;
            };
            process_color_set_token(
                token_name,
                token_entry,
                rc.collection_id,
                rc.spec.default_prefix,
                &rc.mode_ids,
                &value_index,
                &existing_var_index,
                &alias_target_ids,
                overrides,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(SCALE_SET) {
            let Some(rc) = super::routing::pick_collection(&resolved, TokenKind::Scale, token_file)
            else {
                summary.skipped_unknown_schema.push(token_name.clone());
                continue;
            };
            process_scale_set_token(
                token_name,
                token_entry,
                rc.collection_id,
                rc.spec.default_prefix,
                &rc.mode_ids,
                &value_index,
                &existing_var_index,
                &alias_target_ids,
                overrides,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(COLOR) {
            // Flat color token → resolved Color-kind collection, default mode (Light).
            let Some(rc) = super::routing::pick_collection(&resolved, TokenKind::Color, token_file)
            else {
                summary.skipped_unknown_schema.push(token_name.clone());
                continue;
            };
            process_flat_token(
                token_name,
                token_entry,
                rc.collection_id,
                rc.spec.default_prefix,
                "COLOR",
                rc.default_mode_id,
                &value_index,
                &existing_var_index,
                overrides,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(ALIAS) {
            // Top-level alias — route based on what it resolves to.
            let (Some(color_rc), Some(scale_rc)) = (
                super::routing::pick_collection(&resolved, TokenKind::Color, token_file),
                super::routing::pick_collection(&resolved, TokenKind::Scale, token_file),
            ) else {
                summary.skipped_unknown_schema.push(token_name.clone());
                continue;
            };
            process_alias_token(
                token_name,
                token_entry,
                color_rc.collection_id,
                color_rc.spec.default_prefix,
                scale_rc.collection_id,
                scale_rc.spec.default_prefix,
                color_rc.default_mode_id,
                scale_rc.default_mode_id,
                &value_index,
                tokens,
                &existing_var_index,
                overrides,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(OPACITY) {
            // Flat opacity token → Color theme collection (matches the manual
            // library, which files all opacity under .Color theme), default mode.
            let Some(rc) = super::routing::pick_collection(&resolved, TokenKind::Color, token_file)
            else {
                summary.skipped_unknown_schema.push(token_name.clone());
                continue;
            };
            process_flat_token(
                token_name,
                token_entry,
                rc.collection_id,
                rc.spec.default_prefix,
                "FLOAT",
                rc.default_mode_id,
                &value_index,
                &existing_var_index,
                overrides,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(DIMENSION)
            || schema.ends_with(FONT_FAMILY)
            || schema.ends_with(FONT_SIZE)
            || schema.ends_with(FONT_STYLE)
            || schema.ends_with(FONT_WEIGHT)
        {
            // Flat non-color token → resolved Scale-kind collection, default mode (Desktop).
            let Some(rc) = super::routing::pick_collection(&resolved, TokenKind::Scale, token_file)
            else {
                summary.skipped_unknown_schema.push(token_name.clone());
                continue;
            };
            let figma_type = schema_to_figma_type(schema);
            process_flat_token(
                token_name,
                token_entry,
                rc.collection_id,
                rc.spec.default_prefix,
                figma_type,
                rc.default_mode_id,
                &value_index,
                &existing_var_index,
                overrides,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if !schema.is_empty() {
            summary.skipped_unknown_schema.push(token_name.clone());
        }
    }

    // ponytail: the alias-target pre-pass registers an id for a token before
    // knowing whether that token's own processing later bails (malformed
    // `sets`/`value` — no schema validation runs before export). Enforce the
    // invariant here, once, instead of threading it through every bail site:
    // a VARIABLE_ALIAS may only point at an id that actually made it into
    // `variables`. Drop any that don't and warn, rather than sending Figma a
    // POST that references an undefined variable id.
    let mut dangling_variable_ids: HashSet<String> = HashSet::new();
    {
        let emitted_ids: HashSet<&str> = variables.iter().filter_map(|v| v.id.as_deref()).collect();
        mode_values.retain(|mv| {
            let Some(alias_id) = variable_alias_target_id(&mv.value) else {
                return true;
            };
            if emitted_ids.contains(alias_id) {
                true
            } else {
                dangling_variable_ids.insert(mv.variable_id.clone());
                summary.mode_values_aliased = summary.mode_values_aliased.saturating_sub(1);
                summary.mode_warnings.push(format!(
                    "dangling VARIABLE_ALIAS to '{alias_id}' — target variable was never created, value dropped"
                ));
                false
            }
        });
    }

    // A variable whose every mode value pointed at a dangling alias now has no
    // mode values at all — don't send Figma an otherwise-empty CREATE/UPDATE
    // for it.
    if !dangling_variable_ids.is_empty() {
        let variable_ids_with_values: HashSet<&str> = mode_values
            .iter()
            .map(|mv| mv.variable_id.as_str())
            .collect();
        variables.retain(|v| {
            let Some(id) = v.id.as_deref() else {
                return true;
            };
            if dangling_variable_ids.contains(id) && !variable_ids_with_values.contains(id) {
                summary.variables_created = summary.variables_created.saturating_sub(1);
                summary.mode_warnings.push(format!(
                    "'{id}' dropped entirely — every mode value pointed at a missing alias target"
                ));
                false
            } else {
                true
            }
        });
    }

    let body = PostVariablesBody {
        variable_collections: vec![],
        variable_modes: vec![],
        variables,
        variable_mode_values: mode_values,
    };

    Ok((body, summary))
}
