// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Offline lookup of the Figma collection and variable name each token exports
//! to. It mirrors the schema routing in [`super::payload`] without a Figma file,
//! so tools that only need the names (such as the component explorer) don't have
//! to build a whole POST payload.

use std::collections::HashMap;

use super::convert::{alias_exportable_route, build_value_index};
use super::graph::ExportToken;
use super::routing::{
    CollectionSpec, TokenKind, ALIAS, ANGLE, COLOR, COLOR_SET, DIMENSION, FONT_FAMILY, FONT_SIZE,
    FONT_STYLE, FONT_WEIGHT, MULTIPLIER, OPACITY, SCALE_SET, SKIP_SCHEMAS,
};

/// Where a token lives in Figma.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FigmaVariableName {
    pub collection: String,
    pub name: String,
}

fn kind_for(schema: &str, alias_is_color: Option<bool>) -> Option<TokenKind> {
    if SKIP_SCHEMAS.iter().any(|s| schema.ends_with(s)) {
        return None;
    }
    if schema.ends_with(ALIAS) {
        return alias_is_color.map(|c| {
            if c {
                TokenKind::Color
            } else {
                TokenKind::Scale
            }
        });
    }
    // Opacity is a FLOAT but lives in the Color theme collection.
    if schema.ends_with(COLOR_SET) || schema.ends_with(COLOR) || schema.ends_with(OPACITY) {
        Some(TokenKind::Color)
    } else if [
        SCALE_SET,
        DIMENSION,
        ANGLE,
        MULTIPLIER,
        FONT_FAMILY,
        FONT_SIZE,
        FONT_STYLE,
        FONT_WEIGHT,
    ]
    .iter()
    .any(|s| schema.ends_with(s))
    {
        Some(TokenKind::Scale)
    } else {
        None
    }
}

/// Figma collection and variable name for every exportable token, keyed by
/// token name (its legacy key). Tokens that don't export (composites,
/// unsupported schemas) are absent. `overrides` has the same meaning as in
/// [`super::build_export_payload`].
pub fn variable_names(
    tokens: &[ExportToken],
    specs: &[CollectionSpec],
    overrides: Option<&HashMap<String, String>>,
) -> HashMap<String, FigmaVariableName> {
    let value_index = build_value_index(tokens);
    let mut out = HashMap::new();
    for token in tokens {
        let schema = token.value.schema.as_str();
        let alias_is_color = if schema.ends_with(ALIAS) {
            alias_exportable_route(&value_index, &token.name)
        } else {
            None
        };
        let Some(kind) = kind_for(schema, alias_is_color) else {
            continue;
        };
        let file = token
            .file
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("");
        let spec = specs
            .iter()
            .find(|s| s.kind == kind && s.source_files.contains(&file))
            .or_else(|| {
                specs
                    .iter()
                    .find(|s| s.kind == kind && s.source_files.is_empty())
            });
        let Some(spec) = spec else {
            continue;
        };
        let name = overrides
            .and_then(|m| m.get(&token.name))
            .cloned()
            .unwrap_or_else(|| {
                if spec.default_prefix.is_empty() {
                    token.name.clone()
                } else {
                    format!("{}/{}", spec.default_prefix, token.name)
                }
            });
        out.insert(
            token.name.clone(),
            FigmaVariableName {
                collection: spec.figma_collection_name.to_string(),
                name,
            },
        );
    }
    out
}
