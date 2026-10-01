// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Loading legacy token files, resolving their values, and converting a
//! single token into the `VariableAction`/`ModeValueAction` pair(s) that make
//! up a Figma Variables POST payload.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::Value;

use super::routing::{
    ALIAS, COLOR, COLOR_MODES, COLOR_SET, COLOR_THEME_COLLECTION, DIMENSION, FONT_SIZE,
    FONT_WEIGHT, OPACITY, PLATFORM_SCALE_COLLECTION, SCALE_MODES,
};
use crate::color::parse_color;
use crate::types::{FigmaVariableAlias, ModeValueAction, VariableAction};
use crate::FigmaError;

use super::payload::ExportSummary;

/// Load all legacy JSON token files from a directory into a flat map,
/// keeping each token's source file (basename-matchable against
/// [`super::routing::CollectionSpec::source_files`]).
pub fn load_all_tokens(dir: &Path) -> Result<Vec<(String, PathBuf, Value)>, FigmaError> {
    let mut tokens = Vec::new();
    let mut paths: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| FigmaError::Api {
            status: 0,
            message: format!("failed to read token directory: {e}"),
        })?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|ext| ext == "json"))
        .collect();
    paths.sort();

    for path in paths {
        let text = std::fs::read_to_string(&path).map_err(|e| FigmaError::Api {
            status: 0,
            message: format!("failed to read {}: {e}", path.display()),
        })?;
        let obj: serde_json::Map<String, Value> =
            serde_json::from_str(&text).map_err(|e| FigmaError::Api {
                status: 0,
                message: format!("failed to parse {}: {e}", path.display()),
            })?;
        for (name, entry) in obj {
            tokens.push((name, path.clone(), entry));
        }
    }
    Ok(tokens)
}

/// Build a lookup from token name → resolved concrete value string.
/// Follows alias chains up to 10 levels deep.
pub(super) fn build_value_index(tokens: &[(String, PathBuf, Value)]) -> HashMap<String, String> {
    let by_name: HashMap<&str, &Value> = tokens.iter().map(|(n, _, v)| (n.as_str(), v)).collect();
    let mut index = HashMap::new();

    for (name, _file, entry) in tokens {
        if let Some(resolved) = resolve_value(name, entry, &by_name, 0) {
            index.insert(name.clone(), resolved);
        }
    }
    index
}

/// Resolve a token's value, following alias chains.
/// For set tokens (no top-level `value`), picks the first mode's value.
fn resolve_value(
    _name: &str,
    entry: &Value,
    by_name: &HashMap<&str, &Value>,
    depth: usize,
) -> Option<String> {
    if depth > 10 {
        return None;
    }

    // Try top-level value first; fall back to a set mode's value.
    // Prefer "light" (color default) then "desktop" (scale default) so that
    // aliases which resolve through a set token pick the canonical default-mode
    // value rather than whichever mode happens to be listed first in the file.
    let value_str = entry.get("value").and_then(|v| v.as_str()).or_else(|| {
        entry
            .get("sets")
            .and_then(|s| s.as_object())
            .and_then(|sets| {
                sets.get("light")
                    .or_else(|| sets.get("desktop"))
                    .or_else(|| sets.values().next())
            })
            .and_then(|mode_entry| mode_entry.get("value"))
            .and_then(|v| v.as_str())
    })?;

    // Check if it's an alias reference: {token-name}
    if value_str.starts_with('{') && value_str.ends_with('}') {
        let target_name = &value_str[1..value_str.len() - 1];
        if let Some(target_entry) = by_name.get(target_name) {
            return resolve_value(target_name, target_entry, by_name, depth + 1);
        }
        return None;
    }

    Some(value_str.to_string())
}

pub(super) fn schema_to_figma_type(schema: &str) -> &'static str {
    if schema.ends_with(COLOR) {
        "COLOR"
    } else if schema.ends_with(DIMENSION)
        || schema.ends_with(OPACITY)
        || schema.ends_with(FONT_SIZE)
        || schema.ends_with(FONT_WEIGHT)
    {
        "FLOAT"
    } else {
        "STRING"
    }
}

/// design-data stores opacity as a 0–1 fraction; Figma variables use a 0–100
/// scale. `is_opacity` callers convert between them at the codec boundary so
/// export/import/diff all agree on the fraction as the canonical scale.
fn fraction_to_figma_opacity(fraction: f64) -> f64 {
    // ponytail: round to 6 decimal places to shed float noise (0.1 * 100.0
    // can land on 10.000000000000002); precision beyond that isn't meaningful
    // for an opacity value.
    ((fraction * 100.0) * 1e6).round() / 1e6
}

pub(crate) fn figma_opacity_to_fraction(figma_value: f64) -> f64 {
    ((figma_value / 100.0) * 1e6).round() / 1e6
}

/// Convert a raw value string to a Figma-compatible JSON value.
fn value_to_figma(value_str: &str, figma_type: &str, is_opacity: bool) -> Option<Value> {
    match figma_type {
        "COLOR" => {
            let c = parse_color(value_str).ok()?;
            Some(serde_json::to_value(c).unwrap())
        }
        "FLOAT" => {
            // Strip common unit suffixes: px, em, rem, %
            // Note: dp (Android density-independent pixels) is intentionally not
            // stripped — dp values have no Figma equivalent and are tracked separately.
            // (The diff/import side's `UNIT_SUFFIXES` does recognize `dp`, for
            // comparison purposes only — a captured Figma file can carry a
            // dp-sourced numeric value even though export never writes one.)
            let s = value_str
                .trim()
                .trim_end_matches("rem")
                .trim_end_matches("em")
                .trim_end_matches("px")
                .trim_end_matches('%');
            let n: f64 = s.parse().ok()?;
            let n = if is_opacity {
                fraction_to_figma_opacity(n)
            } else {
                n
            };
            Some(Value::Number(serde_json::Number::from_f64(n)?))
        }
        "STRING" => Some(Value::String(value_str.to_string())),
        _ => None,
    }
}

/// Extract the target variable id from a [`ModeValueAction`] value if it's a
/// `VARIABLE_ALIAS` reference. Shared by the post-loop dangling-alias sweep in
/// [`super::payload::build_export_payload_with_specs`] and its tests, so a
/// shape change to the alias JSON can't drift the two apart.
pub(super) fn variable_alias_target_id(value: &Value) -> Option<&str> {
    if value.get("type").and_then(|t| t.as_str()) != Some("VARIABLE_ALIAS") {
        return None;
    }
    value.get("id").and_then(|id| id.as_str())
}

/// Resolve a token's Figma variable name and id (real id if it already exists in
/// the file, otherwise a temp id used for CREATE). Shared by [`make_variable_action`]
/// and the alias-target pre-pass so the two can't diverge.
pub(super) fn resolve_variable_id(
    token_name: &str,
    prefix: &str,
    existing_var_index: &HashMap<&str, &str>,
    overrides: Option<&HashMap<String, String>>,
) -> (String, String) {
    let figma_name = overrides
        .and_then(|m| m.get(token_name))
        .cloned()
        .unwrap_or_else(|| format!("{prefix}/{token_name}"));
    // Match against the final (possibly overridden) name. An override that
    // points at a name not already in the file produces a CREATE, not a
    // rename of the old variable — Figma's variables payload has no rename
    // action, so remapping an existing token surfaces as a new variable.
    let id = if let Some(&existing_id) = existing_var_index.get(figma_name.as_str()) {
        existing_id.to_string()
    } else {
        // Figma rejects temp IDs containing '/'; use '__' as separator.
        figma_name.replace('/', "__")
    };
    (figma_name, id)
}

#[allow(clippy::too_many_arguments)]
fn make_variable_action(
    token_name: &str,
    prefix: &str,
    collection_id: &str,
    figma_type: &str,
    description: Option<&str>,
    existing_var_index: &HashMap<&str, &str>,
    overrides: Option<&HashMap<String, String>>,
) -> (VariableAction, String) {
    let (figma_name, var_id) =
        resolve_variable_id(token_name, prefix, existing_var_index, overrides);
    let action = if existing_var_index.contains_key(figma_name.as_str()) {
        "UPDATE".to_string()
    } else {
        "CREATE".to_string()
    };
    let id = Some(var_id.clone());

    // Dev Mode reads this to show engineers the real code name for a
    // variable. `token_name` is already the legacy key 1:1 with the CSS
    // custom property Web engineers paste (see module doc).
    let code_syntax = HashMap::from([("WEB".to_string(), format!("--spectrum-{token_name}"))]);

    let va = VariableAction {
        action,
        id,
        name: figma_name,
        variable_collection_id: collection_id.to_string(),
        resolved_type: figma_type.to_string(),
        description: description.map(String::from),
        hidden_from_publishing: None,
        scopes: None,
        code_syntax: Some(code_syntax),
    };
    (va, var_id)
}

#[allow(clippy::too_many_arguments)]
pub(super) fn process_color_set_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    value_index: &HashMap<String, String>,
    existing_var_index: &HashMap<&str, &str>,
    alias_target_ids: &HashMap<String, String>,
    overrides: Option<&HashMap<String, String>>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
    let sets = match entry.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return,
    };

    // Determine the inner type from any mode entry — not just the first —
    // since a set's first member can be an `alias.json` pointer (no
    // `$schema` of its own) while a sibling member carries the real
    // `opacity.json`/`color.json` schema. Inferring from the first member
    // only would misclassify such a set as COLOR, making its opacity
    // values fail `parse_color` and get silently dropped.
    let is_opacity = sets.values().any(|v| {
        v.get("$schema")
            .and_then(|s| s.as_str())
            .is_some_and(|s| s.ends_with(OPACITY))
    });
    let figma_type = if is_opacity { "FLOAT" } else { "COLOR" };

    let desc = entry.get("description").and_then(|v| v.as_str());
    let (va, var_id) = make_variable_action(
        token_name,
        prefix,
        collection_id,
        figma_type,
        desc,
        existing_var_index,
        overrides,
    );
    variables.push(va);
    summary.variables_created += 1;

    for &mode_name in COLOR_MODES {
        let Some(mode_entry) = sets.get(mode_name) else {
            continue;
        };
        let Some(mode_id) = mode_ids.get(mode_name) else {
            summary.mode_warnings.push(format!(
                "{token_name}: no '{mode_name}' mode in '{COLOR_THEME_COLLECTION}' — value dropped"
            ));
            continue;
        };
        let raw_value = mode_entry.get("value").and_then(|v| v.as_str());

        let alias_target = raw_value.filter(|v| v.starts_with('{') && v.ends_with('}'));
        if let Some(target_id) = alias_target.and_then(|v| alias_target_ids.get(&v[1..v.len() - 1]))
        {
            mode_values.push(ModeValueAction {
                variable_id: var_id.clone(),
                mode_id: mode_id.clone(),
                value: serde_json::to_value(FigmaVariableAlias::new(target_id.clone())).unwrap(),
            });
            summary.mode_values_aliased += 1;
            continue;
        }

        let resolved = raw_value.and_then(|v| {
            if v.starts_with('{') && v.ends_with('}') {
                let target = &v[1..v.len() - 1];
                value_index.get(target).map(|s| s.as_str())
            } else {
                Some(v)
            }
        });

        if let Some(val_str) = resolved {
            if let Some(figma_val) = value_to_figma(val_str, figma_type, is_opacity) {
                mode_values.push(ModeValueAction {
                    variable_id: var_id.clone(),
                    mode_id: mode_id.clone(),
                    value: figma_val,
                });
                summary.mode_values_set += 1;
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
pub(super) fn process_scale_set_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    value_index: &HashMap<String, String>,
    existing_var_index: &HashMap<&str, &str>,
    alias_target_ids: &HashMap<String, String>,
    overrides: Option<&HashMap<String, String>>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
    let sets = match entry.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return,
    };

    let inner_schema = sets
        .values()
        .next()
        .and_then(|v| v.get("$schema"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    // If inner entries are aliases, determine type from the first resolved value.
    let figma_type = if inner_schema.ends_with(ALIAS) {
        let first_resolved = sets.values().next().and_then(|v| {
            let raw = v.get("value").and_then(|v| v.as_str())?;
            if raw.starts_with('{') && raw.ends_with('}') {
                let target = &raw[1..raw.len() - 1];
                value_index.get(target).map(|s| s.as_str())
            } else {
                Some(raw)
            }
        });
        match first_resolved {
            Some(v) if parse_color(v).is_ok() => "COLOR",
            Some(v)
                if v.trim()
                    .trim_end_matches("rem")
                    .trim_end_matches("em")
                    .trim_end_matches("px")
                    .trim_end_matches('%')
                    .parse::<f64>()
                    .is_ok() =>
            {
                "FLOAT"
            }
            _ => "STRING",
        }
    } else {
        schema_to_figma_type(inner_schema)
    };

    let desc = entry.get("description").and_then(|v| v.as_str());
    let (va, var_id) = make_variable_action(
        token_name,
        prefix,
        collection_id,
        figma_type,
        desc,
        existing_var_index,
        overrides,
    );
    variables.push(va);
    summary.variables_created += 1;

    for &mode_name in SCALE_MODES {
        let Some(mode_entry) = sets.get(mode_name) else {
            continue;
        };
        let Some(mode_id) = mode_ids.get(mode_name) else {
            summary.mode_warnings.push(format!(
                "{token_name}: no '{mode_name}' mode in '{PLATFORM_SCALE_COLLECTION}' — value dropped"
            ));
            continue;
        };
        let raw_value = mode_entry.get("value").and_then(|v| v.as_str());

        let alias_target = raw_value.filter(|v| v.starts_with('{') && v.ends_with('}'));
        if let Some(target_id) = alias_target.and_then(|v| alias_target_ids.get(&v[1..v.len() - 1]))
        {
            mode_values.push(ModeValueAction {
                variable_id: var_id.clone(),
                mode_id: mode_id.clone(),
                value: serde_json::to_value(FigmaVariableAlias::new(target_id.clone())).unwrap(),
            });
            summary.mode_values_aliased += 1;
            continue;
        }

        let resolved = raw_value.and_then(|v| {
            if v.starts_with('{') && v.ends_with('}') {
                let target = &v[1..v.len() - 1];
                value_index.get(target).map(|s| s.as_str())
            } else {
                Some(v)
            }
        });

        if let Some(val_str) = resolved {
            if let Some(figma_val) =
                value_to_figma(val_str, figma_type, inner_schema.ends_with(OPACITY))
            {
                mode_values.push(ModeValueAction {
                    variable_id: var_id.clone(),
                    mode_id: mode_id.clone(),
                    value: figma_val,
                });
                summary.mode_values_set += 1;
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
pub(super) fn process_flat_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    figma_type: &str,
    default_mode_id: &str,
    value_index: &HashMap<String, String>,
    existing_var_index: &HashMap<&str, &str>,
    overrides: Option<&HashMap<String, String>>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
    let raw_value = match entry.get("value").and_then(|v| v.as_str()) {
        Some(v) => v,
        None => return,
    };

    // Resolve aliases.
    let resolved = if raw_value.starts_with('{') && raw_value.ends_with('}') {
        let target = &raw_value[1..raw_value.len() - 1];
        match value_index.get(target) {
            Some(v) => v.as_str(),
            None => {
                summary
                    .skipped_alias_unresolved
                    .push(token_name.to_string());
                return;
            }
        }
    } else {
        raw_value
    };

    let is_opacity = entry
        .get("$schema")
        .and_then(|v| v.as_str())
        .is_some_and(|s| s.ends_with(OPACITY));
    let figma_val = match value_to_figma(resolved, figma_type, is_opacity) {
        Some(v) => v,
        None => {
            summary
                .skipped_unparseable_value
                .push(token_name.to_string());
            return;
        }
    };

    let desc = entry.get("description").and_then(|v| v.as_str());
    let (va, var_id) = make_variable_action(
        token_name,
        prefix,
        collection_id,
        figma_type,
        desc,
        existing_var_index,
        overrides,
    );
    variables.push(va);
    summary.variables_created += 1;

    // Set value in the collection's default mode.
    mode_values.push(ModeValueAction {
        variable_id: var_id,
        mode_id: default_mode_id.to_string(),
        value: figma_val,
    });
    summary.mode_values_set += 1;
}

#[allow(clippy::too_many_arguments)]
pub(super) fn process_alias_token(
    token_name: &str,
    entry: &Value,
    color_collection_id: &str,
    color_prefix: &str,
    scale_collection_id: &str,
    scale_prefix: &str,
    color_default_mode_id: &str,
    scale_default_mode_id: &str,
    value_index: &HashMap<String, String>,
    all_tokens: &[(String, PathBuf, Value)],
    existing_var_index: &HashMap<&str, &str>,
    overrides: Option<&HashMap<String, String>>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
    let raw_value = match entry.get("value").and_then(|v| v.as_str()) {
        Some(v) => v,
        None => return,
    };

    // Resolve the alias chain to find the target token and its type.
    if !(raw_value.starts_with('{') && raw_value.ends_with('}')) {
        return;
    }

    let target_name = &raw_value[1..raw_value.len() - 1];

    // Find the target token to determine its schema.
    let target_schema = all_tokens
        .iter()
        .find(|(n, _, _)| n == target_name)
        .and_then(|(_, _, v)| v.get("$schema"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // For aliases that target other aliases, resolve to find the concrete value.
    let resolved_value = match value_index.get(token_name) {
        Some(v) => v.as_str(),
        None => {
            summary
                .skipped_alias_unresolved
                .push(token_name.to_string());
            return;
        }
    };

    // Determine the Figma type from the resolved concrete value.
    let figma_type = if parse_color(resolved_value).is_ok() {
        "COLOR"
    } else if resolved_value
        .trim()
        .trim_end_matches("rem")
        .trim_end_matches("em")
        .trim_end_matches("px")
        .trim_end_matches('%')
        .parse::<f64>()
        .is_ok()
    {
        "FLOAT"
    } else {
        "STRING"
    };

    // Route to the right collection based on the resolved value type.
    // Colors and opacities go to .Color theme; everything else to .Platform scale.
    let is_color = figma_type == "COLOR"
        || (figma_type == "FLOAT"
            && (target_schema.ends_with(OPACITY) || target_schema.ends_with(COLOR_SET)));
    let (collection_id, prefix, default_mode_id) = if is_color {
        (color_collection_id, color_prefix, color_default_mode_id)
    } else {
        (scale_collection_id, scale_prefix, scale_default_mode_id)
    };

    let figma_val =
        match value_to_figma(resolved_value, figma_type, target_schema.ends_with(OPACITY)) {
            Some(v) => v,
            None => return,
        };

    let desc = entry.get("description").and_then(|v| v.as_str());
    let (va, var_id) = make_variable_action(
        token_name,
        prefix,
        collection_id,
        figma_type,
        desc,
        existing_var_index,
        overrides,
    );
    variables.push(va);
    summary.variables_created += 1;

    mode_values.push(ModeValueAction {
        variable_id: var_id,
        mode_id: default_mode_id.to_string(),
        value: figma_val,
    });
    summary.mode_values_set += 1;
}
