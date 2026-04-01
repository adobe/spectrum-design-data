// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Convert legacy Spectrum token files into a Figma Variables POST payload.
//!
//! Targets the `.Color theme` and `.Platform scale` collections, which use
//! `{camelCasePrefix}/{kebab-case-token-name}` naming — matching legacy token
//! names 1:1.

use std::collections::HashMap;
use std::path::Path;

use serde_json::Value;

use super::color::parse_color;
use super::types::{ModeValueAction, PostVariablesBody, VariableAction, VariablesMeta};
use super::FigmaError;

// ── Schema URL suffixes ──────────────────────────────────────────────────────

const COLOR_SET: &str = "color-set.json";
const COLOR: &str = "color.json";
const SCALE_SET: &str = "scale-set.json";
const DIMENSION: &str = "dimension.json";
const OPACITY: &str = "opacity.json";
const FONT_FAMILY: &str = "font-family.json";
const FONT_SIZE: &str = "font-size.json";
const FONT_STYLE: &str = "font-style.json";
const FONT_WEIGHT: &str = "font-weight.json";
const ALIAS: &str = "alias.json";

// Schemas we skip (composite types with no Figma Variable equivalent).
const SKIP_SCHEMAS: &[&str] = &[
    "typography.json",
    "drop-shadow.json",
    "gradient-stop.json",
    "multiplier.json",
    "text-align.json",
    "text-transform.json",
];

// ── Collection prefixes ──────────────────────────────────────────────────────

const COLOR_THEME_COLLECTION: &str = ".Color theme";
const COLOR_THEME_PREFIX: &str = "colorTheme";
const PLATFORM_SCALE_COLLECTION: &str = ".Platform scale";
const PLATFORM_SCALE_PREFIX: &str = "platformScale";

// ── Mode name mapping ────────────────────────────────────────────────────────

const COLOR_MODES: &[&str] = &["light", "dark", "wireframe"];
const SCALE_MODES: &[&str] = &["desktop", "mobile"];

/// Summary of an export operation.
#[derive(Debug, Default)]
pub struct ExportSummary {
    pub variables_created: usize,
    pub mode_values_set: usize,
    pub skipped_composite: Vec<String>,
    pub skipped_alias_unresolved: Vec<String>,
    pub skipped_unknown_schema: Vec<String>,
    pub skipped_unparseable_value: Vec<String>,
}

/// Build a Figma POST payload from legacy token source files.
///
/// `existing` is the result of `GET /v1/files/:file_key/variables/local` —
/// used to look up collection and mode IDs for the target collections.
pub fn build_export_payload(
    token_dir: &Path,
    existing: &VariablesMeta,
) -> Result<(PostVariablesBody, ExportSummary), FigmaError> {
    // 1. Look up collection and mode IDs from the existing file.
    let color_col =
        find_collection(existing, COLOR_THEME_COLLECTION).ok_or_else(|| FigmaError::Api {
            status: 0,
            message: format!("collection '{COLOR_THEME_COLLECTION}' not found in file"),
        })?;
    let scale_col =
        find_collection(existing, PLATFORM_SCALE_COLLECTION).ok_or_else(|| FigmaError::Api {
            status: 0,
            message: format!("collection '{PLATFORM_SCALE_COLLECTION}' not found in file"),
        })?;

    let color_mode_ids = resolve_mode_ids(&color_col.modes, COLOR_MODES);
    let scale_mode_ids = resolve_mode_ids(&scale_col.modes, SCALE_MODES);
    let color_default_mode = &color_col.default_mode_id;
    let scale_default_mode = &scale_col.default_mode_id;

    // 2. Load all token files from the directory.
    let all_tokens = load_all_tokens(token_dir)?;

    // 3. Build a name→value lookup for alias resolution.
    let value_index = build_value_index(&all_tokens);

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

    for (token_name, token_entry) in &all_tokens {
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
            process_color_set_token(
                token_name,
                token_entry,
                &color_col.id,
                COLOR_THEME_PREFIX,
                &color_mode_ids,
                &value_index,
                &existing_var_index,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(SCALE_SET) {
            process_scale_set_token(
                token_name,
                token_entry,
                &scale_col.id,
                PLATFORM_SCALE_PREFIX,
                &scale_mode_ids,
                &value_index,
                &existing_var_index,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(COLOR) {
            // Flat color token → .Color theme, default mode (Light).
            process_flat_token(
                token_name,
                token_entry,
                &color_col.id,
                COLOR_THEME_PREFIX,
                "COLOR",
                color_default_mode,
                &value_index,
                &existing_var_index,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(ALIAS) {
            // Top-level alias — route based on what it resolves to.
            process_alias_token(
                token_name,
                token_entry,
                &color_col.id,
                &scale_col.id,
                color_default_mode,
                scale_default_mode,
                &value_index,
                &all_tokens,
                &existing_var_index,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if schema.ends_with(DIMENSION)
            || schema.ends_with(OPACITY)
            || schema.ends_with(FONT_FAMILY)
            || schema.ends_with(FONT_SIZE)
            || schema.ends_with(FONT_STYLE)
            || schema.ends_with(FONT_WEIGHT)
        {
            // Flat non-color token → .Platform scale, default mode (Desktop).
            let figma_type = schema_to_figma_type(schema);
            process_flat_token(
                token_name,
                token_entry,
                &scale_col.id,
                PLATFORM_SCALE_PREFIX,
                figma_type,
                scale_default_mode,
                &value_index,
                &existing_var_index,
                &mut variables,
                &mut mode_values,
                &mut summary,
            );
        } else if !schema.is_empty() {
            summary.skipped_unknown_schema.push(token_name.clone());
        }
    }

    let body = PostVariablesBody {
        variable_collections: vec![],
        variable_modes: vec![],
        variables,
        variable_mode_values: mode_values,
    };

    Ok((body, summary))
}

// ── Internal helpers ─────────────────────────────────────────────────────────

fn find_collection<'a>(
    meta: &'a VariablesMeta,
    name: &str,
) -> Option<&'a super::types::FigmaVariableCollection> {
    meta.variable_collections.values().find(|c| c.name == name)
}

/// Map mode names (e.g. "light", "dark") to their Figma mode IDs.
/// Case-insensitive matching since Figma uses "Light"/"Dark" etc.
fn resolve_mode_ids(
    figma_modes: &[super::types::FigmaMode],
    expected: &[&str],
) -> HashMap<String, String> {
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

/// Load all legacy JSON token files from a directory into a flat map.
fn load_all_tokens(dir: &Path) -> Result<Vec<(String, Value)>, FigmaError> {
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
            tokens.push((name, entry));
        }
    }
    Ok(tokens)
}

/// Build a lookup from token name → resolved concrete value string.
/// Follows alias chains up to 10 levels deep.
fn build_value_index(tokens: &[(String, Value)]) -> HashMap<String, String> {
    let by_name: HashMap<&str, &Value> = tokens.iter().map(|(n, v)| (n.as_str(), v)).collect();
    let mut index = HashMap::new();

    for (name, entry) in tokens {
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

fn schema_to_figma_type(schema: &str) -> &'static str {
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

/// Convert a raw value string to a Figma-compatible JSON value.
fn value_to_figma(value_str: &str, figma_type: &str) -> Option<Value> {
    match figma_type {
        "COLOR" => {
            let c = parse_color(value_str).ok()?;
            Some(serde_json::to_value(c).unwrap())
        }
        "FLOAT" => {
            // Strip common unit suffixes: px, em, rem, %
            // Note: dp (Android density-independent pixels) is intentionally not
            // stripped — dp values have no Figma equivalent and are tracked separately.
            let s = value_str
                .trim()
                .trim_end_matches("rem")
                .trim_end_matches("em")
                .trim_end_matches("px")
                .trim_end_matches('%');
            let n: f64 = s.parse().ok()?;
            Some(Value::Number(serde_json::Number::from_f64(n)?))
        }
        "STRING" => Some(Value::String(value_str.to_string())),
        _ => None,
    }
}

fn make_variable_action(
    token_name: &str,
    prefix: &str,
    collection_id: &str,
    figma_type: &str,
    description: Option<&str>,
    existing_var_index: &HashMap<&str, &str>,
) -> (VariableAction, String) {
    let figma_name = format!("{prefix}/{token_name}");
    let (action, id, var_id) =
        if let Some(&existing_id) = existing_var_index.get(figma_name.as_str()) {
            let real_id = existing_id.to_string();
            ("UPDATE".to_string(), Some(real_id.clone()), real_id)
        } else {
            // Figma rejects temp IDs containing '/'; use '__' as separator.
            let temp_id = figma_name.replace('/', "__");
            ("CREATE".to_string(), Some(temp_id.clone()), temp_id)
        };

    let va = VariableAction {
        action,
        id,
        name: figma_name,
        variable_collection_id: collection_id.to_string(),
        resolved_type: figma_type.to_string(),
        description: description.map(String::from),
        hidden_from_publishing: None,
        scopes: None,
        code_syntax: None,
    };
    (va, var_id)
}

#[allow(clippy::too_many_arguments)]
fn process_color_set_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    value_index: &HashMap<String, String>,
    existing_var_index: &HashMap<&str, &str>,
    variables: &mut Vec<VariableAction>,
    mode_values: &mut Vec<ModeValueAction>,
    summary: &mut ExportSummary,
) {
    let sets = match entry.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return,
    };

    // Determine the inner type from first mode entry.
    let inner_schema = sets
        .values()
        .next()
        .and_then(|v| v.get("$schema"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let figma_type = if inner_schema.ends_with(OPACITY) {
        "FLOAT"
    } else {
        "COLOR"
    };

    let desc = entry.get("description").and_then(|v| v.as_str());
    let (va, var_id) = make_variable_action(
        token_name,
        prefix,
        collection_id,
        figma_type,
        desc,
        existing_var_index,
    );
    variables.push(va);
    summary.variables_created += 1;

    for &mode_name in COLOR_MODES {
        let Some(mode_id) = mode_ids.get(mode_name) else {
            continue;
        };
        let Some(mode_entry) = sets.get(mode_name) else {
            continue;
        };
        let raw_value = mode_entry.get("value").and_then(|v| v.as_str());
        let resolved = raw_value.and_then(|v| {
            if v.starts_with('{') && v.ends_with('}') {
                let target = &v[1..v.len() - 1];
                value_index.get(target).map(|s| s.as_str())
            } else {
                Some(v)
            }
        });

        if let Some(val_str) = resolved {
            if let Some(figma_val) = value_to_figma(val_str, figma_type) {
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
fn process_scale_set_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    mode_ids: &HashMap<String, String>,
    value_index: &HashMap<String, String>,
    existing_var_index: &HashMap<&str, &str>,
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
    );
    variables.push(va);
    summary.variables_created += 1;

    for &mode_name in SCALE_MODES {
        let Some(mode_id) = mode_ids.get(mode_name) else {
            continue;
        };
        let Some(mode_entry) = sets.get(mode_name) else {
            continue;
        };
        let raw_value = mode_entry.get("value").and_then(|v| v.as_str());
        let resolved = raw_value.and_then(|v| {
            if v.starts_with('{') && v.ends_with('}') {
                let target = &v[1..v.len() - 1];
                value_index.get(target).map(|s| s.as_str())
            } else {
                Some(v)
            }
        });

        if let Some(val_str) = resolved {
            if let Some(figma_val) = value_to_figma(val_str, figma_type) {
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
fn process_flat_token(
    token_name: &str,
    entry: &Value,
    collection_id: &str,
    prefix: &str,
    figma_type: &str,
    default_mode_id: &str,
    value_index: &HashMap<String, String>,
    existing_var_index: &HashMap<&str, &str>,
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

    let figma_val = match value_to_figma(resolved, figma_type) {
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
fn process_alias_token(
    token_name: &str,
    entry: &Value,
    color_collection_id: &str,
    scale_collection_id: &str,
    color_default_mode_id: &str,
    scale_default_mode_id: &str,
    value_index: &HashMap<String, String>,
    all_tokens: &[(String, Value)],
    existing_var_index: &HashMap<&str, &str>,
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
        .find(|(n, _)| n == target_name)
        .and_then(|(_, v)| v.get("$schema"))
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
        (
            color_collection_id,
            COLOR_THEME_PREFIX,
            color_default_mode_id,
        )
    } else {
        (
            scale_collection_id,
            PLATFORM_SCALE_PREFIX,
            scale_default_mode_id,
        )
    };

    let figma_val = match value_to_figma(resolved_value, figma_type) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn mock_meta() -> VariablesMeta {
        VariablesMeta {
            variables: HashMap::new(),
            variable_collections: HashMap::from([
                (
                    "col-1".into(),
                    super::super::types::FigmaVariableCollection {
                        id: "col-1".into(),
                        name: ".Color theme".into(),
                        key: "k1".into(),
                        modes: vec![
                            super::super::types::FigmaMode {
                                mode_id: "m-light".into(),
                                name: "Light".into(),
                            },
                            super::super::types::FigmaMode {
                                mode_id: "m-dark".into(),
                                name: "Dark".into(),
                            },
                            super::super::types::FigmaMode {
                                mode_id: "m-wire".into(),
                                name: "Wireframe".into(),
                            },
                        ],
                        default_mode_id: "m-light".into(),
                        remote: false,
                        hidden_from_publishing: false,
                        variable_ids: vec![],
                    },
                ),
                (
                    "col-2".into(),
                    super::super::types::FigmaVariableCollection {
                        id: "col-2".into(),
                        name: ".Platform scale".into(),
                        key: "k2".into(),
                        modes: vec![super::super::types::FigmaMode {
                            mode_id: "m-desktop".into(),
                            name: "Desktop".into(),
                        }],
                        default_mode_id: "m-desktop".into(),
                        remote: false,
                        hidden_from_publishing: false,
                        variable_ids: vec![],
                    },
                ),
            ]),
        }
    }

    #[test]
    fn color_set_produces_three_mode_values() {
        use std::io::Write;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("colors.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                "test-color": {
                    "$schema": "https://example.com/color-set.json",
                    "sets": {
                        "light": { "$schema": "https://example.com/color.json", "value": "rgb(255, 0, 0)", "uuid": "u1" },
                        "dark": { "$schema": "https://example.com/color.json", "value": "rgb(0, 255, 0)", "uuid": "u2" },
                        "wireframe": { "$schema": "https://example.com/color.json", "value": "rgb(0, 0, 255)", "uuid": "u3" }
                    },
                    "uuid": "u0"
                }
            })
        )
        .unwrap();

        let meta = mock_meta();
        let (body, summary) = build_export_payload(dir.path(), &meta).unwrap();
        assert_eq!(summary.variables_created, 1);
        assert_eq!(summary.mode_values_set, 3);
        assert_eq!(body.variables.len(), 1);
        assert_eq!(body.variables[0].name, "colorTheme/test-color");
        assert_eq!(body.variables[0].resolved_type, "COLOR");
        assert_eq!(body.variable_mode_values.len(), 3);
    }

    #[test]
    fn dimension_token_goes_to_platform_scale() {
        use std::io::Write;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("layout.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                "spacing-100": {
                    "$schema": "https://example.com/dimension.json",
                    "value": "8px",
                    "uuid": "d1"
                }
            })
        )
        .unwrap();

        let meta = mock_meta();
        let (body, summary) = build_export_payload(dir.path(), &meta).unwrap();
        assert_eq!(summary.variables_created, 1);
        assert_eq!(body.variables[0].name, "platformScale/spacing-100");
        assert_eq!(body.variables[0].resolved_type, "FLOAT");
        // Value should be 8.0
        let val = &body.variable_mode_values[0].value;
        assert_eq!(val.as_f64(), Some(8.0));
    }

    #[test]
    fn alias_resolves_to_concrete_value() {
        use std::io::Write;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                "base-color": {
                    "$schema": "https://example.com/color.json",
                    "value": "rgb(100, 200, 50)",
                    "uuid": "c1"
                },
                "alias-color": {
                    "$schema": "https://example.com/alias.json",
                    "value": "{base-color}",
                    "uuid": "a1"
                }
            })
        )
        .unwrap();

        let meta = mock_meta();
        let (body, summary) = build_export_payload(dir.path(), &meta).unwrap();
        // base-color (flat color) + alias-color (alias→color)
        assert_eq!(summary.variables_created, 2);
        assert!(summary.skipped_alias_unresolved.is_empty());
    }

    #[test]
    fn composite_types_are_skipped() {
        use std::io::Write;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                "heading-typography": {
                    "$schema": "https://example.com/typography.json",
                    "value": { "fontFamily": "Arial", "fontSize": "16px" },
                    "uuid": "t1"
                },
                "shadow-1": {
                    "$schema": "https://example.com/drop-shadow.json",
                    "value": [{ "x": "0px", "y": "2px", "blur": "4px", "color": "rgba(0,0,0,0.1)" }],
                    "uuid": "s1"
                }
            })
        )
        .unwrap();

        let meta = mock_meta();
        let (body, summary) = build_export_payload(dir.path(), &meta).unwrap();
        assert_eq!(summary.variables_created, 0);
        assert_eq!(summary.skipped_composite.len(), 2);
        assert!(body.variables.is_empty());
    }
}
