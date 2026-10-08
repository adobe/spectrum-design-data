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

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use serde_json::Value;

use super::routing::{
    ALIAS, ANGLE, COLOR, COLOR_MODES, COLOR_SET, COLOR_THEME_COLLECTION, DIMENSION, FONT_FAMILY,
    FONT_SIZE, FONT_STYLE, FONT_WEIGHT, MULTIPLIER, OPACITY, PLATFORM_SCALE_COLLECTION,
    SCALE_MODES, SCALE_SET,
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

pub(super) struct ResolvedValue {
    value: String,
    schema: String,
    target: String,
}

pub(super) enum ResolutionError {
    Unresolved(String),
    UnsupportedSchema { target: String, schema: String },
    Unparseable,
}

pub(super) type ValueIndex = HashMap<String, Result<ResolvedValue, ResolutionError>>;

fn scalar_schema_supported(schema: &str) -> bool {
    [
        COLOR,
        DIMENSION,
        ANGLE,
        MULTIPLIER,
        OPACITY,
        FONT_FAMILY,
        FONT_SIZE,
        FONT_STYLE,
        FONT_WEIGHT,
    ]
    .iter()
    .any(|s| schema.ends_with(s))
}

fn scalar_value(entry: &Value) -> Option<String> {
    match entry.get("value")? {
        Value::String(s) => Some(s.clone()),
        Value::Number(n)
            if entry
                .get("$schema")
                .and_then(Value::as_str)
                .is_some_and(|schema| schema.ends_with(ANGLE) || schema.ends_with(MULTIPLIER)) =>
        {
            Some(n.to_string())
        }
        _ => None,
    }
}

/// Build a lookup from token name → resolved value and leaf schema.
/// Follows alias chains up to 10 levels deep.
pub(super) fn build_value_index(tokens: &[(String, PathBuf, Value)]) -> ValueIndex {
    let by_name: HashMap<&str, &Value> = tokens.iter().map(|(n, _, v)| (n.as_str(), v)).collect();
    let mut index = HashMap::new();

    for (name, _file, entry) in tokens {
        index.insert(name.clone(), resolve_value(name, entry, &by_name, 0));
    }
    index
}

/// Resolve a token's value, following alias chains.
/// For set tokens, prefers Light/Desktop when determining the leaf schema.
fn resolve_value(
    name: &str,
    entry: &Value,
    by_name: &HashMap<&str, &Value>,
    depth: usize,
) -> Result<ResolvedValue, ResolutionError> {
    if depth > 10 {
        return Err(ResolutionError::Unresolved(format!(
            "alias chain exceeds 10 levels at '{name}' (possible cycle)"
        )));
    }

    let schema = entry.get("$schema").and_then(Value::as_str).unwrap_or("");
    if ![ALIAS, COLOR_SET, SCALE_SET]
        .iter()
        .any(|s| schema.ends_with(s))
        && !scalar_schema_supported(schema)
    {
        return Err(ResolutionError::UnsupportedSchema {
            target: name.to_string(),
            schema: schema.to_string(),
        });
    }

    // Try top-level value first; fall back to a set mode's value.
    // Prefer "light" (color default) then "desktop" (scale default) so that
    // aliases which resolve through a set token pick the canonical default-mode
    // value rather than whichever mode happens to be listed first in the file.
    let leaf = if entry.get("value").is_some() {
        entry
    } else {
        entry
            .get("sets")
            .and_then(|s| s.as_object())
            .and_then(|sets| {
                sets.get("light")
                    .or_else(|| sets.get("desktop"))
                    .or_else(|| sets.values().next())
            })
            .ok_or(ResolutionError::Unparseable)?
    };
    let leaf_schema = leaf.get("$schema").and_then(Value::as_str).unwrap_or("");
    if !leaf_schema.is_empty()
        && !leaf_schema.ends_with(ALIAS)
        && !scalar_schema_supported(leaf_schema)
    {
        return Err(ResolutionError::UnsupportedSchema {
            target: name.to_string(),
            schema: leaf_schema.to_string(),
        });
    }
    let value_str = scalar_value(leaf).ok_or(ResolutionError::Unparseable)?;

    // Check if it's an alias reference: {token-name}
    if value_str.starts_with('{') && value_str.ends_with('}') {
        let target_name = &value_str[1..value_str.len() - 1];
        if let Some(target_entry) = by_name.get(target_name) {
            let mut resolved = resolve_value(target_name, target_entry, by_name, depth + 1)?;
            // Keep a set as the reference target, not its selected mode's leaf.
            if !schema.ends_with(ALIAS) {
                resolved.target = name.to_string();
            }
            return Ok(resolved);
        }
        return Err(ResolutionError::Unresolved(format!(
            "missing alias target '{target_name}'"
        )));
    }

    if !scalar_schema_supported(leaf_schema) {
        return Err(ResolutionError::UnsupportedSchema {
            target: name.to_string(),
            schema: leaf_schema.to_string(),
        });
    }

    Ok(ResolvedValue {
        value: value_str,
        schema: leaf_schema.to_string(),
        target: name.to_string(),
    })
}

pub(super) fn schema_to_figma_type(schema: &str) -> &'static str {
    if schema.ends_with(COLOR) {
        "COLOR"
    } else if schema.ends_with(DIMENSION)
        || schema.ends_with(ANGLE)
        || schema.ends_with(MULTIPLIER)
        || schema.ends_with(OPACITY)
        || schema.ends_with(FONT_SIZE)
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

enum ValueError {
    UnsupportedUnit,
    Unparseable,
}

fn record_value_error(summary: &mut ExportSummary, token_name: &str, error: ValueError) {
    let skipped = match error {
        ValueError::UnsupportedUnit => &mut summary.skipped_unsupported_unit,
        ValueError::Unparseable => &mut summary.skipped_unparseable_value,
    };
    if !skipped.iter().any(|name| name == token_name) {
        skipped.push(token_name.to_string());
    }
}

fn record_resolution_error(
    summary: &mut ExportSummary,
    token_name: &str,
    error: Option<&ResolutionError>,
) {
    match error {
        Some(ResolutionError::UnsupportedSchema { target, schema }) => {
            let reason = format!(
                "{token_name}: target '{target}' uses unsupported schema '{schema}'; no supported Figma Variable mapping"
            );
            if !summary.skipped_alias_unsupported.contains(&reason) {
                summary.skipped_alias_unsupported.push(reason);
            }
        }
        Some(ResolutionError::Unparseable) => {
            record_value_error(summary, token_name, ValueError::Unparseable);
        }
        _ => {
            if !summary
                .skipped_alias_unresolved
                .iter()
                .any(|n| n == token_name)
            {
                summary
                    .skipped_alias_unresolved
                    .push(token_name.to_string());
            }
            if let Some(ResolutionError::Unresolved(reason)) = error {
                summary
                    .mode_warnings
                    .push(format!("{token_name}: {reason}"));
            }
        }
    }
}

/// Convert a resolved value at the Figma boundary without changing canonical data.
fn value_to_figma(value_str: &str, figma_type: &str, schema: &str) -> Result<Value, ValueError> {
    if schema.ends_with(DIMENSION) {
        if let Some(number) = value_str.trim().strip_suffix("dp") {
            return match number.parse::<f64>() {
                Ok(n) if n.is_finite() => Err(ValueError::UnsupportedUnit),
                _ => Err(ValueError::Unparseable),
            };
        }
    }
    match figma_type {
        "COLOR" => {
            let c = parse_color(value_str).map_err(|_| ValueError::Unparseable)?;
            Ok(serde_json::to_value(c).unwrap())
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
            let n: f64 = s.parse().map_err(|_| ValueError::Unparseable)?;
            let n = if schema.ends_with(OPACITY) {
                fraction_to_figma_opacity(n)
            } else {
                n
            };
            serde_json::Number::from_f64(n)
                .map(Value::Number)
                .ok_or(ValueError::Unparseable)
        }
        "STRING" => {
            let value = if schema.ends_with(FONT_WEIGHT) {
                match value_str {
                    "light" => "Light",
                    "regular" => "Regular",
                    "medium" => "Medium",
                    "bold" => "Bold",
                    "extra-bold" => "ExtraBold",
                    "black" => "Black",
                    _ => return Err(ValueError::Unparseable),
                }
            } else {
                value_str
            };
            Ok(Value::String(value.to_string()))
        }
        _ => Err(ValueError::Unparseable),
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

/// Schema family used to decide whether a deprecated token and its
/// replacement are interchangeable as a Figma alias (a font weight must never
/// alias a font family, a dimension never a font size).
fn schema_class(schema: &str) -> Option<&'static str> {
    [
        COLOR,
        DIMENSION,
        ANGLE,
        MULTIPLIER,
        OPACITY,
        FONT_FAMILY,
        FONT_SIZE,
        FONT_STYLE,
        FONT_WEIGHT,
    ]
    .into_iter()
    .find(|s| schema.ends_with(s))
}

/// Map each deprecated token to the terminal replacement it should alias.
///
/// Follows the legacy `renamed` chain (`lifecycle.replacedBy` in the canonical
/// format) transitively, stopping at the first token that isn't itself
/// deprecated-with-a-replacement. Tokens whose chain cycles, dangles, has no
/// exported variable, or crosses schema families are left on their own
/// literal and recorded in `summary.redirect_skipped`.
pub(super) fn compute_redirects(
    tokens: &[(String, PathBuf, Value)],
    value_index: &ValueIndex,
    alias_target_ids: &HashMap<String, String>,
    summary: &mut ExportSummary,
) -> HashMap<String, String> {
    let by_name: HashMap<&str, &Value> = tokens.iter().map(|(n, _, v)| (n.as_str(), v)).collect();
    let mut redirects = HashMap::new();

    for (name, _file, entry) in tokens {
        if entry.get("deprecated").and_then(Value::as_bool) != Some(true) {
            continue;
        }
        let Some(first) = entry.get("renamed").and_then(Value::as_str) else {
            continue;
        };

        let mut seen: HashSet<&str> = HashSet::from([name.as_str()]);
        let mut current = first;
        let terminal = loop {
            if !seen.insert(current) {
                break Err("replacement chain cycles".to_string());
            }
            let Some(target) = by_name.get(current) else {
                break Err(format!("replacement '{current}' not found"));
            };
            let next = (target.get("deprecated").and_then(Value::as_bool) == Some(true))
                .then(|| target.get("renamed").and_then(Value::as_str))
                .flatten();
            match next {
                Some(next) => current = next,
                None => break Ok(current),
            }
        };

        let skip = |summary: &mut ExportSummary, reason: String| {
            summary.redirect_skipped.push(format!("{name}: {reason}"));
        };
        let terminal = match terminal {
            Ok(t) => t,
            Err(reason) => {
                skip(summary, reason);
                continue;
            }
        };
        if !alias_target_ids.contains_key(terminal) {
            skip(
                summary,
                format!("replacement '{terminal}' has no exported variable"),
            );
            continue;
        }
        let (Some(Ok(own)), Some(Ok(replacement))) =
            (value_index.get(name), value_index.get(terminal))
        else {
            skip(
                summary,
                format!("could not resolve a value for it or '{terminal}'"),
            );
            continue;
        };
        if schema_class(&own.schema).is_none()
            || schema_class(&own.schema) != schema_class(&replacement.schema)
        {
            skip(
                summary,
                format!("replacement '{terminal}' has a different value type"),
            );
            continue;
        }
        redirects.insert(name.clone(), terminal.to_string());
    }
    redirects
}

/// Whether an alias-schema token will be exported as a variable by
/// [`process_alias_token`] (it resolves and its value converts), and if so
/// whether it routes to the color collection.
pub(super) fn alias_exportable_route(value_index: &ValueIndex, token_name: &str) -> Option<bool> {
    let resolved = value_index.get(token_name)?.as_ref().ok()?;
    let figma_type = schema_to_figma_type(&resolved.schema);
    value_to_figma(&resolved.value, figma_type, &resolved.schema).ok()?;
    Some(figma_type == "COLOR" || resolved.schema.ends_with(OPACITY))
}

/// Figma type and whether the token belongs in the color collection, for a
/// redirected token (derived from its own resolved value, like
/// [`process_alias_token`]).
pub(super) fn redirect_route(value_index: &ValueIndex, token_name: &str) -> Option<(String, bool)> {
    let resolved = value_index.get(token_name)?.as_ref().ok()?;
    let figma_type = schema_to_figma_type(&resolved.schema);
    let is_color = figma_type == "COLOR" || resolved.schema.ends_with(OPACITY);
    Some((figma_type.to_string(), is_color))
}

/// Emit a deprecated token as a variable whose every mode aliases the
/// replacement variable, instead of its own stale literal.
#[allow(clippy::too_many_arguments)]
pub(super) fn process_redirected_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    figma_type: &str,
    target_id: &str,
    existing_var_index: &HashMap<&str, &str>,
    overrides: Option<&HashMap<String, String>>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
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

    let mut modes: Vec<&String> = mode_ids.values().collect();
    modes.sort();
    for mode_id in modes {
        mode_values.push(ModeValueAction {
            variable_id: var_id.clone(),
            mode_id: mode_id.clone(),
            value: serde_json::to_value(FigmaVariableAlias::new(target_id.to_string())).unwrap(),
        });
        summary.mode_values_aliased += 1;
    }
    summary.redirected_deprecated.push(token_name.to_string());
}

#[allow(clippy::too_many_arguments)]
pub(super) fn process_color_set_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    value_index: &ValueIndex,
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
    let values_start = mode_values.len();

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
        let raw_value = scalar_value(mode_entry);

        let alias_target = raw_value
            .as_deref()
            .filter(|v| v.starts_with('{') && v.ends_with('}'));
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

        let mode_schema = mode_entry
            .get("$schema")
            .and_then(Value::as_str)
            .unwrap_or("");
        let resolved = raw_value.as_deref().and_then(|v| {
            if v.starts_with('{') && v.ends_with('}') {
                let target = &v[1..v.len() - 1];
                value_index
                    .get(target)
                    .and_then(|r| r.as_ref().ok())
                    .map(|r| (r.value.as_str(), r.schema.as_str()))
            } else {
                Some((v, mode_schema))
            }
        });

        if let Some((val_str, schema)) = resolved {
            match value_to_figma(val_str, figma_type, schema) {
                Ok(figma_val) => {
                    mode_values.push(ModeValueAction {
                        variable_id: var_id.clone(),
                        mode_id: mode_id.clone(),
                        value: figma_val,
                    });
                    summary.mode_values_set += 1;
                }
                Err(error) => record_value_error(summary, token_name, error),
            }
        } else if let Some(target) = alias_target {
            record_resolution_error(
                summary,
                token_name,
                value_index
                    .get(&target[1..target.len() - 1])
                    .and_then(|r| r.as_ref().err()),
            );
        } else {
            record_value_error(summary, token_name, ValueError::Unparseable);
        }
    }
    if mode_values.len() == values_start {
        variables.pop();
        summary.variables_created -= 1;
    }
}

#[allow(clippy::too_many_arguments)]
pub(super) fn process_scale_set_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    value_index: &ValueIndex,
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
        .filter_map(|v| v.get("$schema").and_then(Value::as_str))
        .find(|schema| !schema.ends_with(ALIAS))
        .or_else(|| {
            value_index
                .get(token_name)
                .and_then(|r| r.as_ref().ok())
                .map(|r| r.schema.as_str())
        })
        .unwrap_or("");
    let figma_type = schema_to_figma_type(inner_schema);

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
    let values_start = mode_values.len();

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
        let raw_value = scalar_value(mode_entry);

        let alias_target = raw_value
            .as_deref()
            .filter(|v| v.starts_with('{') && v.ends_with('}'));
        let resolved = raw_value.as_deref().and_then(|v| {
            if v.starts_with('{') && v.ends_with('}') {
                value_index
                    .get(&v[1..v.len() - 1])
                    .and_then(|r| r.as_ref().ok())
                    .map(|r| (r.value.as_str(), r.schema.as_str()))
            } else {
                Some((v, inner_schema))
            }
        });
        let converted = match resolved {
            Some((value, schema)) => match value_to_figma(value, figma_type, schema) {
                Ok(value) => Some(value),
                Err(error) => {
                    record_value_error(summary, token_name, error);
                    continue;
                }
            },
            None => None,
        };
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

        if let Some(figma_val) = converted {
            mode_values.push(ModeValueAction {
                variable_id: var_id.clone(),
                mode_id: mode_id.clone(),
                value: figma_val,
            });
            summary.mode_values_set += 1;
        } else if let Some(target) = alias_target {
            record_resolution_error(
                summary,
                token_name,
                value_index
                    .get(&target[1..target.len() - 1])
                    .and_then(|r| r.as_ref().err()),
            );
        } else {
            record_value_error(summary, token_name, ValueError::Unparseable);
        }
    }
    if mode_values.len() == values_start {
        variables.pop();
        summary.variables_created -= 1;
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
    value_index: &ValueIndex,
    existing_var_index: &HashMap<&str, &str>,
    overrides: Option<&HashMap<String, String>>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
    let raw_value = match scalar_value(entry) {
        Some(v) => v,
        None => {
            record_value_error(summary, token_name, ValueError::Unparseable);
            return;
        }
    };

    // Resolve aliases.
    let resolved = if raw_value.starts_with('{') && raw_value.ends_with('}') {
        let target = &raw_value[1..raw_value.len() - 1];
        match value_index.get(target) {
            Some(Ok(v)) => v.value.as_str(),
            result => {
                record_resolution_error(summary, token_name, result.and_then(|r| r.as_ref().err()));
                return;
            }
        }
    } else {
        raw_value.as_str()
    };

    let schema = entry.get("$schema").and_then(|v| v.as_str()).unwrap_or("");
    let figma_val = match value_to_figma(resolved, figma_type, schema) {
        Ok(v) => v,
        Err(error) => {
            record_value_error(summary, token_name, error);
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
    value_index: &ValueIndex,
    existing_var_index: &HashMap<&str, &str>,
    alias_target_ids: &HashMap<String, String>,
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

    let resolved = match value_index.get(token_name) {
        Some(Ok(v)) => v,
        result => {
            record_resolution_error(summary, token_name, result.and_then(|r| r.as_ref().err()));
            return;
        }
    };

    let figma_type = schema_to_figma_type(&resolved.schema);

    // Route to the right collection based on the resolved value type.
    // Colors and opacities go to .Color theme; everything else to .Platform scale.
    let is_color = figma_type == "COLOR" || resolved.schema.ends_with(OPACITY);
    let (collection_id, prefix, default_mode_id) = if is_color {
        (color_collection_id, color_prefix, color_default_mode_id)
    } else {
        (scale_collection_id, scale_prefix, scale_default_mode_id)
    };

    let figma_val = match value_to_figma(&resolved.value, figma_type, &resolved.schema) {
        Ok(v) => v,
        Err(error) => {
            record_value_error(summary, token_name, error);
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

    let target_name = &raw_value[1..raw_value.len() - 1];
    let alias_id = alias_target_ids
        .get(target_name)
        .or_else(|| alias_target_ids.get(&resolved.target));
    let value = if let Some(id) = alias_id {
        summary.mode_values_aliased += 1;
        serde_json::to_value(FigmaVariableAlias::new(id.clone())).unwrap()
    } else {
        summary.mode_values_set += 1;
        figma_val
    };
    mode_values.push(ModeValueAction {
        variable_id: var_id,
        mode_id: default_mode_id.to_string(),
        value,
    });
}
