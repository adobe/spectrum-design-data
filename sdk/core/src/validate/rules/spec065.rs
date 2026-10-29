// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-065: recipe-targets-excluded-combination
//!
//! A visual-recipe rule (`when.options`) or relationship `scope.options` that
//! matches only combinations excluded by an `error` constraint is dead data:
//! the combination is not a supported state. A rule that matches at least one
//! valid combination is fine, even if it also covers an excluded one.
//!
//! The check enumerates the combinations the rule matches. Options the rule
//! does not pin range over their declared `values[]` (booleans over
//! true/false); an option with an unknown domain is never proven excluded.
//! `state` is not an option here and `{ "present": true }` requirements are
//! never proven violated.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::constraints::{read_constraints, Combination, ConstraintSeverity, OptionConstraint};
use crate::graph::ComponentRecord;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{option_values, walk_objects};

/// Upper bound on enumerated combinations per rule.
const MAX_COMBINATIONS: usize = 4096;

pub struct Rule;

fn pinned(options: &serde_json::Map<String, Value>) -> Vec<(String, Vec<Value>)> {
    options
        .iter()
        .filter(|(k, _)| k.as_str() != "state")
        .map(|(k, v)| {
            let vals = match v {
                Value::Array(items) => items.clone(),
                other => vec![other.clone()],
            };
            (k.clone(), vals)
        })
        .collect()
}

fn domain(comp: &ComponentRecord, name: &str) -> Vec<Option<Value>> {
    let Some(def) = comp.raw.pointer(&format!("/options/{name}")) else {
        return vec![None];
    };
    match option_values(def) {
        Some(vals) if !vals.is_empty() => vals.into_iter().map(Some).collect(),
        _ if def.get("type").and_then(Value::as_str) == Some("boolean") => {
            vec![Some(Value::Bool(true)), Some(Value::Bool(false))]
        }
        _ => vec![None],
    }
}

/// Whether every combination the condition matches is excluded by an error constraint.
fn only_excluded(
    comp: &ComponentRecord,
    constraints: &[OptionConstraint],
    cond: &[(String, Vec<Value>)],
) -> bool {
    let mut names: BTreeSet<&str> = cond.iter().map(|(k, _)| k.as_str()).collect();
    for c in constraints {
        names.extend(c.when.keys().map(String::as_str));
        names.extend(c.require.keys().map(String::as_str));
    }
    let axes: Vec<(&str, Vec<Option<Value>>)> = names
        .into_iter()
        .map(|name| {
            let vals = match cond.iter().find(|(k, _)| k == name) {
                Some((_, vals)) => vals.iter().cloned().map(Some).collect(),
                None => domain(comp, name),
            };
            (name, vals)
        })
        .collect();
    let total = axes
        .iter()
        .try_fold(1usize, |n, (_, v)| n.checked_mul(v.len().max(1)));
    if total.is_none_or(|n| n > MAX_COMBINATIONS) {
        return false;
    }
    let mut combos: Vec<Combination> = vec![Combination::new()];
    for (name, vals) in &axes {
        combos = combos
            .into_iter()
            .flat_map(|base| {
                vals.iter().map(move |v| {
                    let mut c = base.clone();
                    c.insert((*name).to_string(), v.clone());
                    c
                })
            })
            .collect();
    }
    combos
        .iter()
        .all(|combo| constraints.iter().any(|c| c.excludes(combo)))
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-065"
    }

    fn name(&self) -> &'static str {
        "recipe-targets-excluded-combination"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let error_constraints = |comp: &ComponentRecord| -> Vec<OptionConstraint> {
            read_constraints(&comp.raw)
                .into_iter()
                .map(|(_, c)| c)
                .filter(|c| c.severity == ConstraintSeverity::Error)
                .collect()
        };
        let warn = |file: &std::path::PathBuf, path: String, message: String| Diagnostic {
            file: file.clone(),
            token: None,
            rule_id: Some("SPEC-065".to_string()),
            severity: Severity::Warning,
            message,
            instance_path: Some(path),
            schema_path: None,
        };

        for v in &ctx.graph.visuals {
            let Some(comp) = ctx.graph.components.iter().find(|c| c.name == v.component) else {
                continue;
            };
            let constraints = error_constraints(comp);
            if constraints.is_empty() {
                continue;
            }
            let Some(parts) = v.raw.get("parts") else {
                continue;
            };
            walk_objects(parts, "/parts", &mut |path, node| {
                let Some(opts) = node
                    .get("when")
                    .and_then(|w| w.get("options"))
                    .and_then(Value::as_object)
                else {
                    return;
                };
                let cond = pinned(opts);
                if !cond.is_empty() && only_excluded(comp, &constraints, &cond) {
                    out.push(warn(
                        &v.file,
                        format!("{path}/when/options"),
                        format!(
                            "Recipe rule for '{}' matches only combinations excluded by an error constraint",
                            comp.name
                        ),
                    ));
                }
            });
        }

        for rel in &ctx.graph.relationships {
            let Some(scope) = rel.raw.get("scope") else {
                continue;
            };
            let Some(opts) = scope.get("options").and_then(Value::as_object) else {
                continue;
            };
            let Some(name) = scope.get("component").and_then(Value::as_str) else {
                continue;
            };
            let Some(comp) = ctx.graph.components.iter().find(|c| c.name == name) else {
                continue;
            };
            let constraints = error_constraints(comp);
            let cond = pinned(opts);
            if !constraints.is_empty()
                && !cond.is_empty()
                && only_excluded(comp, &constraints, &cond)
            {
                out.push(warn(
                    &rel.file,
                    format!("/{}/scope/options", rel.index),
                    format!(
                        "Relationship scope for '{name}' matches only combinations excluded by an error constraint"
                    ),
                ));
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, RelationshipRecord, TokenGraph, VisualRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(conds: Vec<Value>, scope_options: Option<Value>) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("button.json"),
            raw: json!({
                "name": "button",
                "options": {
                    "variant": {"values": [{"value": "primary"}, {"value": "accent"}]},
                    "style": {"values": [{"value": "fill"}, {"value": "outline"}]},
                    "isDisabled": {"type": "boolean"}
                },
                "constraints": [
                    {"when": {"style": "outline"}, "require": {"variant": ["primary"]}, "severity": "error"},
                    {"when": {"isDisabled": true}, "require": {"variant": ["primary"]}, "severity": "advisory"}
                ]
            }),
            layer: Layer::Foundation,
        });
        let parts: Vec<Value> = conds
            .into_iter()
            .map(|o| json!({"when": {"options": o}}))
            .collect();
        g.visuals.push(VisualRecord {
            component: "button".into(),
            file: PathBuf::from("visuals/button.json"),
            raw: json!({"component": "button", "parts": {"root": {"rules": parts}}}),
        });
        if let Some(o) = scope_options {
            g.relationships.push(RelationshipRecord {
                file: PathBuf::from("relationships/button.json"),
                index: 0,
                uuid: None,
                raw: json!({"scope": {"component": "button", "options": o}}),
            });
        }
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        super::Rule.validate(&ctx)
    }

    #[test]
    fn only_excluded_combination_warns() {
        let d = run(vec![json!({"style": "outline", "variant": "accent"})], None);
        assert_eq!(d.len(), 1, "{d:?}");
        assert_eq!(d[0].severity, Severity::Warning);
        assert_eq!(d[0].rule_id.as_deref(), Some("SPEC-065"));
    }

    #[test]
    fn rule_that_also_matches_valid_combinations_is_silent() {
        // accent also matches accent+fill, which is valid.
        assert!(run(vec![json!({"variant": "accent"})], None).is_empty());
        assert!(run(
            vec![json!({"style": "outline", "variant": "primary"})],
            None
        )
        .is_empty());
        assert!(run(vec![json!({"style": "outline"})], None).is_empty());
    }

    #[test]
    fn advisory_constraints_are_ignored() {
        assert!(run(vec![json!({"isDisabled": true, "variant": "accent"})], None).is_empty());
    }

    #[test]
    fn relationship_scope_is_checked() {
        let d = run(
            vec![],
            Some(json!({"style": "outline", "variant": ["accent"]})),
        );
        assert_eq!(d.len(), 1, "{d:?}");
        assert!(d[0].message.starts_with("Relationship scope"));
    }
}
