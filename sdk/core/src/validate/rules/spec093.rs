// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-093: relationship-context-names-option
//!
//! A relationship `context` names the role of a value. A condition on a component option
//! belongs in `scope.options`: a record that pins no option is the default, and a recipe
//! picks the record that pins the most options matching its request. A parenthesised part
//! that equals a declared option value (`primary`, `vertical`), a boolean option name
//! (`emphasized`) or its negation (`non emphasized`) repeats that option inside the string. A
//! `size` value counts in its spelled form too (`m` is `medium`, `xl` is `extra large`).
//! The word `default` is flagged only when a sibling record with the same main word names an
//! option value, because `Width (default)` beside `Width (minimum)` names a measurement.
//!
//! Interaction states (`down`, `focus`) are not options and are not checked.
//!
//! Warning, held at a baseline by `tests/recipe_lint_baseline.rs`.

use std::collections::{HashMap, HashSet};

use serde_json::Value;

use crate::registry::split_context;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn norm(s: &str) -> String {
    s.to_lowercase()
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

/// `isEmphasized` → `emphasized`, `hasHoldIcon` → `hold icon`.
fn boolean_words(name: &str) -> String {
    let rest = ["is", "has", "show"]
        .iter()
        .find_map(|p| {
            name.strip_prefix(p)
                .filter(|r| r.chars().next().is_some_and(char::is_uppercase))
        })
        .unwrap_or(name);
    let mut out = String::new();
    for (i, c) in rest.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            out.push(' ');
        }
        out.extend(c.to_lowercase());
    }
    out
}

/// The words a size value is spelled with in a context: `m` is `medium`, `xl` is `extra large`.
fn size_words(value: &str) -> Option<&'static str> {
    Some(match value {
        "xxs" => "extra extra small",
        "xs" => "extra small",
        "s" => "small",
        "m" => "medium",
        "l" => "large",
        "xl" => "extra large",
        "xxl" => "extra extra large",
        _ => return None,
    })
}

/// What each normalized term would mean as an option pin: term → `option=value`.
fn pins_of(options: &serde_json::Map<String, Value>) -> HashMap<String, String> {
    let mut pins = HashMap::new();
    for (name, o) in options {
        if o.get("type").and_then(Value::as_str) == Some("boolean") {
            let w = boolean_words(name);
            for neg in ["non", "not", "un"] {
                pins.insert(format!("{neg} {w}"), format!("{name}=false"));
                pins.insert(format!("{neg}{w}"), format!("{name}=false"));
            }
            pins.insert(w, format!("{name}=true"));
            continue;
        }
        let key = norm(name);
        for v in o
            .get("values")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let raw = v.get("value").unwrap_or(v);
            let val = match raw {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            let val_norm = norm(&val);
            if name == "size" {
                if let Some(words) = size_words(&val_norm) {
                    pins.insert(words.to_string(), format!("{name}={val}"));
                }
            }
            for form in [
                val_norm.clone(),
                format!("{val_norm} {key}"),
                format!("{val_norm} variant"),
                format!("{val_norm} style"),
                format!("{val_norm} density"),
            ] {
                pins.insert(form, format!("{name}={val}"));
            }
        }
    }
    pins
}

/// The parenthesised terms of a context, split at commas and `and`.
fn terms(context: &str) -> Vec<String> {
    let (_, detail) = split_context(context);
    detail
        .map(|d| {
            d.split(',')
                .flat_map(|p| p.split(" and "))
                .map(norm)
                .filter(|t| !t.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn main_word(context: &str) -> String {
    norm(split_context(context).0)
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-093"
    }

    fn name(&self) -> &'static str {
        "relationship-context-names-option"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let pins: HashMap<&str, HashMap<String, String>> = ctx
            .graph
            .components
            .iter()
            .filter_map(|c| {
                let o = c.raw.get("options")?.as_object()?;
                Some((c.name.as_str(), pins_of(o)))
            })
            .collect();

        // (component, main word) pairs where some record names an option value.
        let mut names_option: HashSet<(String, String)> = HashSet::new();
        let mut hits: Vec<(usize, Vec<String>)> = Vec::new();
        let rels = &ctx.graph.relationships;
        for (i, rel) in rels.iter().enumerate() {
            let Some(component) = rel
                .raw
                .get("scope")
                .and_then(|s| s.get("component"))
                .and_then(Value::as_str)
            else {
                continue;
            };
            let Some(context) = rel.raw.get("context").and_then(Value::as_str) else {
                continue;
            };
            let Some(table) = pins.get(component) else {
                continue;
            };
            let found: Vec<String> = terms(context)
                .iter()
                .filter_map(|t| table.get(t).cloned())
                .collect();
            if !found.is_empty() {
                names_option.insert((component.to_string(), main_word(context)));
                hits.push((i, found));
            }
        }

        let mut out = Vec::new();
        for (i, found) in &hits {
            out.push(self.diagnostic(
                rels,
                *i,
                format!(
                    "names {}; pin scope.options instead (a record that pins no option is the default)",
                    found.join(", ")
                ),
            ));
        }
        let flagged: HashSet<usize> = hits.iter().map(|(i, _)| *i).collect();
        for (i, rel) in rels.iter().enumerate() {
            let component = rel
                .raw
                .get("scope")
                .and_then(|s| s.get("component"))
                .and_then(Value::as_str);
            let context = rel.raw.get("context").and_then(Value::as_str);
            let (Some(component), Some(context)) = (component, context) else {
                continue;
            };
            if !flagged.contains(&i)
                && terms(context).iter().any(|t| t == "default")
                && names_option.contains(&(component.to_string(), main_word(context)))
            {
                out.push(self.diagnostic(
                    rels,
                    i,
                    "says default beside records that name an option value; leave the default record unpinned and drop the word".into(),
                ));
            }
        }
        out
    }
}

impl Rule {
    fn diagnostic(
        &self,
        rels: &[crate::graph::RelationshipRecord],
        i: usize,
        what: String,
    ) -> Diagnostic {
        let rel = &rels[i];
        let context = rel
            .raw
            .get("context")
            .and_then(Value::as_str)
            .unwrap_or_default();
        Diagnostic {
            file: rel.file.clone(),
            token: None,
            rule_id: Some(self.id().to_string()),
            severity: Severity::Warning,
            message: format!("Relationship context '{context}' {what}"),
            instance_path: Some(format!("/{}", rel.index)),
            schema_path: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{ComponentRecord, RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec093::Rule;

    fn warnings(contexts: &[&str]) -> usize {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = vec![ComponentRecord {
            layer: Default::default(),
            file: PathBuf::from("switch.json"),
            name: "switch".into(),
            raw: json!({
                "name": "switch",
                "options": {
                    "isEmphasized": {"type": "boolean", "default": false},
                    "isSelected": {"type": "boolean", "default": false},
                    "variant": {"type": "string", "default": "a", "values": [{"value": "a"}, {"value": "b"}]}
                }
            }),
        }];
        g.relationships = contexts
            .iter()
            .enumerate()
            .map(|(i, c)| RelationshipRecord {
                file: PathBuf::from("switch.json"),
                index: i,
                uuid: None,
                raw: json!({"scope": {"component": "switch", "property": "gap"}, "context": c, "$ref": "t"}),
            })
            .collect();
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).len()
    }

    #[test]
    fn option_values_and_negations_warn() {
        assert_eq!(
            warnings(&[
                "Control (selected, non emphasized)",
                "Control (selected, emphasized)",
                "Label (b variant)",
                "Label (a)",
            ]),
            4
        );
    }

    #[test]
    fn plain_parts_and_qualifiers_pass() {
        assert_eq!(
            warnings(&["Control", "Spacing (icon to label)", "Width (minimum)"]),
            0
        );
    }

    #[test]
    fn size_words_warn_for_a_size_option() {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = vec![ComponentRecord {
            layer: Default::default(),
            file: PathBuf::from("c.json"),
            name: "c".into(),
            raw: json!({"name": "c", "options": {"size": {"type": "string", "default": "m",
                "values": [{"value": "m"}, {"value": "xl"}, {"value": "xxs"}, {"value": "xxl"}]}}}),
        }];
        g.relationships = [
            "Height (medium)",
            "Gap (top, extra large)",
            "Gap (extra extra small)",
            "Gap (extra extra large)",
            "Gap (small)",
        ]
        .iter()
        .enumerate()
        .map(|(i, c)| RelationshipRecord {
            file: PathBuf::from("c.json"),
            index: i,
            uuid: None,
            raw: json!({"scope": {"component": "c", "property": "gap"}, "context": c, "$ref": "t"}),
        })
        .collect();
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        // "small" is not a declared value, so only the first four warn.
        assert_eq!(Rule.validate(&ctx).len(), 4);
    }

    #[test]
    fn default_warns_only_beside_an_option_value() {
        assert_eq!(warnings(&["Width (default)", "Width (minimum)"]), 0);
        assert_eq!(warnings(&["Border (default)", "Border (emphasized)"]), 2);
    }
}
