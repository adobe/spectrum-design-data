// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Opt-in modeless alias layer (bead `cn3v.4`).
//!
//! One modeless variable per exported token, in a single-mode collection. A
//! token that diverges on exactly one mode set aliases into the variable the
//! mode-group collection for that set already carries; an axis-invariant token
//! carries the concrete resolved value. The layer is derived from the payload
//! the regular export built, so it never changes the mode-group collections.

use std::collections::HashMap;

use serde_json::{json, Value};

use super::convert::{resolve_variable_id, variable_alias_target_id, VarIndex};
use super::graph::ExportToken;
use super::payload::ExportSummary;
use super::routing::{pick_collection, resolve_collections, CollectionSpec, TokenKind};
use crate::types::*;
use crate::FigmaError;

/// Name of the modeless collection the layer is written to. It must already
/// exist in the Figma file; the exporter never creates collections.
pub const MODELESS_COLLECTION: &str = "Spectrum";

/// Longest alias chain followed when resolving an axis-invariant value.
const MAX_ALIAS_DEPTH: usize = 32;

/// Append the modeless layer for `tokens` to a payload built from the same
/// `tokens`, `specs` and `overrides`.
///
/// A token whose mode-group variable was not emitted (skipped or unparseable)
/// gets no modeless variable. Tokens that diverge on more than one axis are
/// out of scope until the chained-alias design (`cn3v.5`) lands.
pub fn append_modeless_layer(
    body: &mut PostVariablesBody,
    summary: &mut ExportSummary,
    tokens: &[ExportToken],
    specs: &[CollectionSpec],
    existing: &VariablesMeta,
    overrides: Option<&HashMap<String, String>>,
) -> Result<(), FigmaError> {
    let collection = existing
        .variable_collections
        .values()
        .find(|c| c.name == MODELESS_COLLECTION)
        .ok_or_else(|| FigmaError::Api {
            status: 0,
            message: format!("collection '{MODELESS_COLLECTION}' not found in file"),
        })?;
    let mode_id = if collection.default_mode_id.is_empty() {
        collection.modes.first().map(|m| m.mode_id.as_str())
    } else {
        Some(collection.default_mode_id.as_str())
    }
    .ok_or_else(|| FigmaError::Api {
        status: 0,
        message: format!("collection '{MODELESS_COLLECTION}' has no modes"),
    })?;

    let resolved = resolve_collections(existing, specs)?;
    let existing_index: VarIndex<'_> = existing
        .variables
        .values()
        .filter(|v| v.variable_collection_id != collection.id)
        .map(|v| {
            (
                (v.variable_collection_id.as_str(), v.name.as_str()),
                v.id.as_str(),
            )
        })
        .collect();
    let modeless_index: HashMap<&str, &str> = existing
        .variables
        .values()
        .filter(|v| v.variable_collection_id == collection.id)
        .map(|v| (v.name.as_str(), v.id.as_str()))
        .collect();
    let default_mode_of: HashMap<&str, &str> = existing
        .variable_collections
        .values()
        .map(|c| (c.id.as_str(), c.default_mode_id.as_str()))
        .collect();

    let emitted: HashMap<&str, &VariableAction> = body
        .variables
        .iter()
        .filter_map(|v| v.id.as_deref().map(|id| (id, v)))
        .collect();
    let default_values: HashMap<&str, &Value> = body
        .variable_mode_values
        .iter()
        .filter(|mv| {
            emitted
                .get(mv.variable_id.as_str())
                .and_then(|v| default_mode_of.get(v.variable_collection_id.as_str()))
                .is_some_and(|default| *default == mv.mode_id)
        })
        .map(|mv| (mv.variable_id.as_str(), &mv.value))
        .collect();

    let mut variables = Vec::new();
    let mut mode_values = Vec::new();
    let mut aliased = 0usize;
    for token in tokens {
        let kinds: Vec<TokenKind> = match token.axis.as_deref() {
            Some(axis) => specs
                .iter()
                .find(|s| s.kind.mode_set() == axis)
                .map(|s| s.kind)
                .into_iter()
                .collect(),
            None => vec![TokenKind::Color, TokenKind::Scale],
        };
        let source = kinds.into_iter().find_map(|kind| {
            let rc = pick_collection(&resolved, kind, &token.file)?;
            let (_, id) = resolve_variable_id(
                &token.name,
                rc.spec.default_prefix,
                rc.collection_id,
                &existing_index,
                overrides,
            );
            emitted.get(id.as_str()).map(|v| (id, *v))
        });
        let Some((source_id, source)) = source else {
            summary.mode_warnings.push(format!(
                "modeless layer: '{}' has no mode-group variable in the export, skipped",
                token.name
            ));
            continue;
        };

        let value = if token.axis.is_some() {
            json!({ "type": "VARIABLE_ALIAS", "id": source_id })
        } else {
            let mut id = source_id.as_str();
            let mut depth = 0;
            let concrete = loop {
                let Some(value) = default_values.get(id) else {
                    break None;
                };
                match variable_alias_target_id(value) {
                    Some(next) if depth < MAX_ALIAS_DEPTH => {
                        id = next;
                        depth += 1;
                    }
                    Some(_) => break None,
                    None => break Some((*value).clone()),
                }
            };
            let Some(concrete) = concrete else {
                summary.mode_warnings.push(format!(
                    "modeless layer: '{}' has no concrete default value, skipped",
                    token.name
                ));
                continue;
            };
            concrete
        };

        let (action, id) = match modeless_index.get(token.name.as_str()) {
            Some(id) => ("UPDATE", (*id).to_string()),
            None => (
                "CREATE",
                format!("modeless__{}", token.name.replace('/', "__")),
            ),
        };
        variables.push(VariableAction {
            action: action.to_string(),
            id: Some(id.clone()),
            name: token.name.clone(),
            variable_collection_id: collection.id.clone(),
            resolved_type: source.resolved_type.clone(),
            description: source.description.clone(),
            hidden_from_publishing: source.hidden_from_publishing,
            scopes: source.scopes.clone(),
            code_syntax: source.code_syntax.clone(),
        });
        if token.axis.is_some() {
            aliased += 1;
        }
        mode_values.push(ModeValueAction {
            variable_id: id,
            mode_id: mode_id.to_string(),
            value,
        });
    }

    summary.variables_created += variables.len();
    summary.mode_values_set += mode_values.len() - aliased;
    summary.mode_values_aliased += aliased;
    body.variables.extend(variables);
    body.variable_mode_values.extend(mode_values);
    Ok(())
}
