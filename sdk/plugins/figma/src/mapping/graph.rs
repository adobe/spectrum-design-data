// Copyright 2026 Adobe. All rights reserved.

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::PathBuf;

use design_data_core::{graph::TokenGraph, naming::extract_legacy_key};
use serde_json::Value;

use super::routing::{ALIAS, COLOR, COLOR_SET, DIMENSION, SCALE_SET};
use crate::FigmaError;

#[derive(Debug, Clone, Default)]
pub struct ExportValue {
    pub(super) schema: String,
    pub(super) literal: Option<Value>,
    pub(super) alias: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ExportToken {
    pub(super) name: String,
    pub(super) file: PathBuf,
    pub(super) value: ExportValue,
    pub(super) modes: BTreeMap<String, ExportValue>,
    pub(super) description: Option<String>,
    pub(super) deprecated: bool,
    pub(super) replacement: Option<String>,
    /// Mode set this token's resolved value diverges on (per
    /// `TokenGraph::diverges_on_axis`); `None` when it is axis-invariant.
    pub(super) axis: Option<String>,
}

struct Record<'a> {
    raw: &'a Value,
    name: Option<&'a Value>,
    key: String,
    file: PathBuf,
    index: usize,
    relationship: bool,
}

impl Record<'_> {
    fn field(&self, field: &str) -> Option<&Value> {
        self.raw.get(if self.relationship {
            match field {
                "conceptId" => "setUuid",
                "set_schema" => "setSchema",
                _ => field,
            }
        } else {
            field
        })
    }
}

/// Group canonical records into Figma variables without a legacy JSON projection.
pub fn export_tokens(graph: &TokenGraph) -> Result<Vec<ExportToken>, FigmaError> {
    let mut records = Vec::new();
    for token in graph.tokens.values() {
        let name = token.raw.get("name");
        if name.and_then(|n| n.get("contrast")).is_some() {
            continue;
        }
        if let Some(key) = name.and_then(extract_legacy_key) {
            records.push(Record {
                raw: &token.raw,
                name,
                key,
                file: token.file.clone(),
                index: token.index,
                relationship: false,
            });
        }
    }
    for relationship in &graph.relationships {
        let Some(key) = relationship
            .raw
            .get("legacyKey")
            .and_then(Value::as_str)
            .filter(|key| !key.is_empty())
        else {
            continue;
        };
        records.push(Record {
            raw: &relationship.raw,
            name: relationship.raw.get("scope").and_then(|s| s.get("options")),
            key: key.to_string(),
            file: relationship.file.clone(),
            index: relationship.index,
            relationship: true,
        });
    }
    records.sort_by(|a, b| {
        (&a.file, a.relationship, a.index).cmp(&(&b.file, b.relationship, b.index))
    });
    let mut names = HashMap::new();
    for record in &records {
        for field in ["uuid", "conceptId"] {
            if let Some(id) = record.field(field).and_then(Value::as_str) {
                names.insert(id.to_string(), record.key.clone());
            }
        }
    }
    // An override replaces its foundation record but carries `file = manifest.json`;
    // group it with its siblings so their other modes are not replaced with it
    // (p6ga.8.29).
    let mut home_files: HashMap<&str, &PathBuf> = HashMap::new();
    for record in &records {
        if !is_override(record) {
            home_files.entry(&record.key).or_insert(&record.file);
        }
    }
    let mut groups: BTreeMap<(&PathBuf, &str), Vec<&Record<'_>>> = BTreeMap::new();
    for record in &records {
        let file = match home_files.get(record.key.as_str()) {
            Some(home) if is_override(record) => *home,
            _ => &record.file,
        };
        groups.entry((file, &record.key)).or_default().push(record);
    }
    let mut tokens: Vec<ExportToken> = Vec::new();
    let mut positions = HashMap::new();
    for ((file, key), records) in groups {
        let dimensions: BTreeSet<&str> = records
            .iter()
            .flat_map(|record| {
                ["colorScheme", "scale"]
                    .into_iter()
                    .filter(|dim| record.name.and_then(|n| n.get(*dim)).is_some())
            })
            .collect();
        if dimensions.len() > 1 {
            return Err(FigmaError::Api {
                status: 0,
                message: format!("token '{key}' spans multiple mode dimensions"),
            });
        }
        let dimension = dimensions.into_iter().next();
        let mut value = read_value(records[0], &names);
        let mut modes = BTreeMap::new();
        if let Some(dim) = dimension {
            value = ExportValue {
                schema: consistent(&records, |record| record.field("set_schema"))
                    .and_then(Value::as_str)
                    .unwrap_or(if dim == "colorScheme" {
                        COLOR_SET
                    } else {
                        SCALE_SET
                    })
                    .to_string(),
                ..Default::default()
            };
            for record in &records {
                let Some(mode) = record.name.and_then(|n| n.get(dim)).and_then(Value::as_str)
                else {
                    continue;
                };
                let mut mode_value = read_value(record, &names);
                if mode_value.schema.is_empty() {
                    mode_value.schema = records
                        .iter()
                        .find(|sibling| {
                            sibling.field("$ref").is_some() == record.field("$ref").is_some()
                                && sibling.field("$schema").and_then(Value::as_str).is_some()
                        })
                        .and_then(|r| r.field("$schema"))
                        .and_then(Value::as_str)
                        .unwrap_or(if record.field("$ref").is_some() {
                            ALIAS
                        } else if dim == "colorScheme" {
                            COLOR
                        } else {
                            DIMENSION
                        })
                        .to_string();
                }
                modes.insert(mode.to_string(), mode_value);
            }
        }
        let description = if dimension.is_some() {
            consistent(&records, |r| r.field("description"))
        } else {
            records[0].field("description")
        }
        .and_then(Value::as_str)
        .map(str::to_string);
        let lifecycle_records: Vec<_> = if let Some(dim) = dimension {
            records
                .iter()
                .copied()
                .filter(|r| {
                    r.name
                        .and_then(|n| n.get(dim))
                        .and_then(Value::as_str)
                        .is_some()
                })
                .collect()
        } else {
            vec![records[0]]
        };
        let deprecated = lifecycle_records.first().is_some_and(|first| {
            is_deprecated(first) && lifecycle_records.iter().all(|r| is_deprecated(r))
        });
        let replacement = lifecycle_records
            .first()
            .and_then(|r| replacement(r, &names))
            .filter(|first| {
                lifecycle_records
                    .iter()
                    .all(|r| replacement(r, &names).as_ref() == Some(first))
            });
        let axis = dimension
            .filter(|dim| {
                graph
                    .mode_sets
                    .iter()
                    .find(|set| set.name == *dim)
                    .is_none_or(|set| graph.diverges_on_axis(key, set))
            })
            .map(str::to_string);
        let token = ExportToken {
            name: key.to_string(),
            file: file.clone(),
            value,
            modes,
            description,
            deprecated,
            replacement,
            axis,
        };
        // Later files replace a colliding name without changing its export position.
        if let Some(&position) = positions.get(key) {
            tokens[position] = token;
        } else {
            positions.insert(key, tokens.len());
            tokens.push(token);
        }
    }
    Ok(tokens)
}

fn is_override(record: &Record<'_>) -> bool {
    record.field("overriddenBy").is_some()
}

fn consistent<'a>(
    records: &[&'a Record<'a>],
    field: impl Fn(&'a Record<'a>) -> Option<&'a Value>,
) -> Option<&'a Value> {
    let first = field(records.first()?)?;
    records
        .iter()
        .all(|record| field(record) == Some(first))
        .then_some(first)
}

fn read_value(record: &Record<'_>, names: &HashMap<String, String>) -> ExportValue {
    let literal = record.field("value").cloned();
    let alias = if literal.is_none() {
        record
            .field("$ref")
            .and_then(Value::as_str)
            .map(|id| names.get(id).cloned().unwrap_or_else(|| id.to_string()))
    } else {
        None
    };
    ExportValue {
        schema: record
            .field("$schema")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
        literal,
        alias,
    }
}

fn is_deprecated(record: &Record<'_>) -> bool {
    record
        .raw
        .get("lifecycle")
        .and_then(|l| l.get("deprecatedIn"))
        .is_some_and(|value| !matches!(value, Value::Bool(false) | Value::Null))
}

fn replacement(record: &Record<'_>, names: &HashMap<String, String>) -> Option<String> {
    let replaced = record.raw.get("lifecycle")?.get("replacedBy")?;
    if let Some(id) = replaced.as_str() {
        return names.get(id).cloned();
    }
    let distinct: BTreeSet<_> = replaced
        .as_array()?
        .iter()
        .filter_map(Value::as_str)
        .filter_map(|id| names.get(id))
        .collect();
    (distinct.len() == 1).then(|| (*distinct.first().unwrap()).clone())
}
