// Copyright 2026 Adobe. All rights reserved.
use design_data_core::cascade::{self, ResolutionContext};
use design_data_core::graph::{ModeSetRecord, TokenGraph, TokenRecord};
use miette::IntoDiagnostic;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::path::PathBuf;
use std::process::ExitCode;

#[derive(Deserialize)]
struct Record {
    id: String,
    source: String,
    raw: Value,
}

#[derive(Deserialize)]
struct Query {
    id: String,
    context: HashMap<String, String>,
    #[serde(default, rename = "selectConcept")]
    select_concept: bool,
}

#[derive(Deserialize)]
struct Request {
    records: Vec<Record>,
    queries: Vec<Query>,
    #[serde(default, rename = "modeSets")]
    mode_sets: Vec<ModeDeclaration>,
}

#[derive(Deserialize)]
struct ModeDeclaration {
    name: String,
    modes: Vec<String>,
    default: String,
}

fn compatible(raw: &Value, context: &HashMap<String, String>) -> bool {
    context.iter().all(
        |(key, requested)| match raw.get("name").and_then(|name| name.get(key)) {
            None => true,
            Some(Value::String(mode)) => mode == requested,
            Some(Value::Array(modes)) => modes.iter().any(|mode| mode.as_str() == Some(requested)),
            _ => false,
        },
    )
}

fn ambiguous(group: &TokenGraph, chosen: &Value, context: &HashMap<String, String>) -> bool {
    let score = |raw: &Value| {
        raw.get("name")
            .and_then(Value::as_object)
            .map(|name| cascade::specificity(name, &group.mode_sets))
            .unwrap_or(0)
    };
    group
        .tokens
        .values()
        .filter(|candidate| {
            compatible(&candidate.raw, context) && score(&candidate.raw) == score(chosen)
        })
        .count()
        > 1
}

fn missing_axis(group: &TokenGraph, context: &HashMap<String, String>) -> bool {
    group.mode_sets.iter().any(|axis| {
        !context.contains_key(&axis.name)
            && group.tokens.values().any(|token| {
                token
                    .raw
                    .get("name")
                    .and_then(|name| name.get(&axis.name))
                    .is_some()
            })
    })
}

fn evaluate(request: Request) -> Vec<Value> {
    let mut identities = HashMap::<String, usize>::new();
    for record in &request.records {
        if let Some(id) = record.raw.get("uuid").and_then(Value::as_str) {
            *identities.entry(id.to_owned()).or_default() += 1;
        }
    }
    let mut graph = TokenGraph::from_pairs(
        request
            .records
            .into_iter()
            .map(|record| (record.id, PathBuf::from(record.source), record.raw))
            .collect(),
    );
    graph.mode_sets = request
        .mode_sets
        .into_iter()
        .map(|mode| ModeSetRecord {
            file: PathBuf::from("comparison-mode-sets"),
            name: mode.name,
            modes: mode.modes,
            default_mode: mode.default,
        })
        .collect();
    let mut siblings = HashMap::<String, Vec<TokenRecord>>::new();
    for token in graph.tokens.values() {
        if let Some(concept) = token.raw.get("conceptId").and_then(Value::as_str) {
            siblings
                .entry(concept.to_owned())
                .or_default()
                .push(token.clone());
        }
    }
    let concepts: HashMap<String, TokenGraph> = siblings
        .into_iter()
        .map(|(concept, tokens)| {
            let mut group = TokenGraph::from_records(tokens);
            group.mode_sets = graph.mode_sets.clone();
            (concept, group)
        })
        .collect();
    request
        .queries
        .into_iter()
        .map(|query| {
            let mut chain = Vec::<String>::new();
            let mut seen = HashSet::new();
            let mut issue = None;
            let mut value = None;
            let initial = graph.tokens.get(&query.id);
            let mut ctx = ResolutionContext::new();
            for (axis, mode) in &query.context { ctx = ctx.with(axis.clone(), mode.clone()); }
            let mut current = initial.and_then(|token| {
                if !query.select_concept { return Some(token); }
                token.raw.get("conceptId").and_then(Value::as_str)
                    .and_then(|concept| concepts.get(concept))
                    .and_then(|group| cascade::resolve(group, &ctx))
                    .or(Some(token))
            });
            let selected_id = current.map(|token| token.name.clone());
            let label = current
                .and_then(|token| token.raw.get("name"))
                .and_then(design_data_core::naming::extract_legacy_key);
            if query.select_concept {
                if let Some(chosen) = current {
                    if let Some(concept) = chosen.raw.get("conceptId").and_then(Value::as_str) {
                        if concepts.get(concept).is_some_and(|group| missing_axis(group, &query.context)) {
                            issue = Some("Context is missing a required mode axis.");
                        } else if concepts.get(concept).is_some_and(|group| ambiguous(group, &chosen.raw, &query.context)) {
                            issue = Some("Token concept has ambiguous context siblings.");
                        }
                    }
                }
            }
            loop {
                if issue.is_some() { break; }
                let Some(token) = current else {
                    issue = Some("Reference target is unavailable.");
                    break;
                };
                if !seen.insert(token.name.clone()) {
                    issue = Some("Alias chain contains a cycle.");
                    break;
                }
                chain.push(token.name.clone());
                if token.uuid.as_ref().is_some_and(|id| identities.get(id) != Some(&1)) {
                    issue = Some("Token UUID is duplicated.");
                    break;
                }
                if !compatible(&token.raw, &query.context) {
                    issue = Some("Resolved token does not support the requested context.");
                    break;
                }
                if let Some(target) = token.alias_target.as_deref() {
                    current = if let Some(group) = concepts.get(target) {
                        cascade::resolve(group, &ctx)
                    } else {
                        graph.resolve_alias_key(target)
                    };
                    if let Some(chosen) = current {
                        if concepts.get(target).is_some_and(|group| missing_axis(group, &query.context)) {
                            issue = Some("Context is missing a required mode axis.");
                            break;
                        } else if concepts.get(target).is_some_and(|group| ambiguous(group, &chosen.raw, &query.context)) {
                            issue = Some("Alias concept has ambiguous context siblings.");
                            break;
                        }

                    }
                } else {
                    value = token.raw.get("value").cloned();
                    if value.is_none() {
                        issue = Some("Resolved token has no concrete value.");
                    }
                    break;
                }
            }
            json!({ "id": query.id, "selectedId": selected_id, "label": label, "context": query.context, "value": value, "chain": chain, "issue": issue })
        })
        .collect()
}

pub fn run() -> miette::Result<ExitCode> {
    let mut input = String::new();
    std::io::stdin()
        .read_to_string(&mut input)
        .into_diagnostic()?;
    let request: Request = serde_json::from_str(&input).into_diagnostic()?;
    println!(
        "{}",
        serde_json::to_string(&evaluate(request)).into_diagnostic()?
    );
    Ok(ExitCode::SUCCESS)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filters_incompatible_siblings_before_ranking_and_requires_complete_context() {
        let result = evaluate(serde_json::from_value(json!({
            "modeSets": [
                {"name":"colorScheme","modes":["light","dark"],"default":"light"},
                {"name":"contrast","modes":["regular","high"],"default":"regular"}
            ],
            "records": [
                {"id":"base","source":"test","raw":{"uuid":"base","conceptId":"c","name":{"property":"color"},"value":"base"}},
                {"id":"high","source":"test","raw":{"uuid":"high","conceptId":"c","name":{"property":"color","contrast":"high"},"value":"high"}},
                {"id":"dark","source":"test","raw":{"uuid":"dark","conceptId":"c","name":{"property":"color","colorScheme":"dark"},"value":"dark"}},
                {"id":"dark-high","source":"test","raw":{"uuid":"dark-high","conceptId":"c","name":{"property":"color","colorScheme":"dark","contrast":"high"},"value":"dark-high"}}
            ],
            "queries": [
                {"id":"base","selectConcept":true,"context":{"colorScheme":"light","contrast":"regular"}},
                {"id":"base","selectConcept":true,"context":{"colorScheme":"dark","contrast":"regular"}},
                {"id":"base","selectConcept":true,"context":{"colorScheme":"dark","contrast":"high"}},
                {"id":"base","selectConcept":true,"context":{}}
            ]
        })).unwrap());
        assert_eq!(result[0]["value"], "base");
        assert_eq!(result[1]["value"], "dark");
        assert_eq!(result[2]["value"], "dark-high");
        assert!(result[3]["value"].is_null());
        assert!(result[3]["issue"].is_string());
    }

    #[test]
    fn follows_concepts_in_context_and_reports_cycles_and_duplicates() {
        let result = evaluate(serde_json::from_value(json!({
            "records": [
                {"id":"alias","source":"test","raw":{"uuid":"a","name":{"property":"color"},"$ref":"concept"}},
                {"id":"light","source":"test","raw":{"uuid":"l","conceptId":"concept","name":{"colorScheme":"light"},"value":"white"}},
                {"id":"dark","source":"test","raw":{"uuid":"d","conceptId":"concept","name":{"colorScheme":"dark"},"value":"black"}},
                {"id":"cycle","source":"test","raw":{"uuid":"c","$ref":"c"}},
                {"id":"dup1","source":"test","raw":{"uuid":"duplicate","value":1}},
                {"id":"dup2","source":"test","raw":{"uuid":"duplicate","value":2}},
                {"id":"missing","source":"test","raw":{"uuid":"m","$ref":"absent"}}
            ],
            "queries": [
                {"id":"alias","context":{"colorScheme":"dark"}},
                {"id":"alias","context":{"colorScheme":"light"}},
                {"id":"dark","context":{"colorScheme":"light"},"selectConcept":true},
                {"id":"cycle","context":{}},
                {"id":"dup1","context":{}},
                {"id":"missing","context":{}},
                {"id":"dark","context":{"colorScheme":"light"}},
                {"id":"alias","context":{}}
            ]
        })).unwrap());
        assert_eq!(result[0]["value"], "black");
        assert_eq!(result[1]["value"], "white");
        assert_eq!(result[2]["value"], "white");
        assert_eq!(result[2]["selectedId"], "light");
        assert_eq!(result[0]["chain"], json!(["alias", "dark"]));
        for row in &result[3..] {
            assert!(row["value"].is_null());
            assert!(row["issue"].is_string());
        }
    }
}
