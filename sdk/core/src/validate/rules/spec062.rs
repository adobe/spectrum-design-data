// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-062: visual-selectors-resolve
//!
//! Every `relationship` selector in a visual recipe MUST resolve to a
//! relationship record scoped to the recipe's component, and every `token`
//! selector MUST match at least one token. `{size}`, `{sizeIndex}` and `{option}` templates
//! are expanded over the recipe's `sizeScale` and the option values before resolving.

use serde_json::{Map, Value};

use crate::graph::TokenGraph;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, error, expand_selector, has_template, option_entries, size_entries,
    tokens_matching, walk_objects,
};

pub struct Rule;

fn relationship_exists(graph: &TokenGraph, component: &str, sel: &Value) -> bool {
    graph.relationships.iter().any(|r| {
        r.raw.pointer("/scope/component").and_then(Value::as_str) == Some(component)
            && crate::scope::selector_matches(sel, &r.raw)
    })
}

/// The distinct identities of the records a structured selector names that bind a token.
fn identities(graph: &TokenGraph, component: &str, sel: &Value) -> Vec<String> {
    let mut out: Vec<String> = graph
        .relationships
        .iter()
        .filter(|r| {
            r.raw.get("$ref").is_some()
                && r.raw.pointer("/scope/component").and_then(Value::as_str) == Some(component)
                && crate::scope::selector_matches(sel, &r.raw)
        })
        .map(|r| crate::scope::relationship_identity(&r.raw))
        .collect();
    out.sort();
    out.dedup();
    out
}

fn token_exists(graph: &TokenGraph, sel: &Map<String, Value>) -> bool {
    !tokens_matching(graph, sel).is_empty()
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-062"
    }

    fn name(&self) -> &'static str {
        "visual-selectors-resolve"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        if ctx.graph.components.is_empty() {
            return vec![];
        }
        let graph = ctx.graph;
        let mut out = Vec::new();
        for v in &graph.visuals {
            if component_of(graph, v).is_none() {
                continue; // SPEC-060 covers undeclared component
            }
            let Some(parts) = v.raw.get("parts") else {
                continue;
            };
            let sizes = size_entries(&v.raw);
            let options = option_entries(ctx.graph, v);
            walk_objects(parts, "/parts", &mut |path, node| {
                if let Some(rel) = node.get("relationship").filter(|r| r.is_object()) {
                    let rpath = format!("{path}/relationship");
                    if has_template(rel) && sizes.is_empty() {
                        out.push(error(
                            self.id(),
                            v,
                            &rpath,
                            "Selector uses a size template but the recipe has no sizeScale".into(),
                        ));
                    }
                    let mut seen = Vec::new();
                    for e in expand_selector(rel, &sizes, &options) {
                        let key = e.to_string();
                        if seen.contains(&key) {
                            continue;
                        }
                        seen.push(key);
                        if !relationship_exists(graph, &v.component, &e) {
                            let property = e.get("property").and_then(Value::as_str).unwrap_or("");
                            let message = match e.get("context").and_then(Value::as_str) {
                                Some(c) => format!(
                                    "No relationship for '{}' with property '{property}' and context '{}'",
                                    v.component,
                                    c.trim()
                                ),
                                None => format!(
                                    "No relationship for '{}' with property '{property}' and the structured identity in selector {e}",
                                    v.component
                                ),
                            };
                            out.push(error(self.id(), v, &rpath, message));
                        } else if e.get("context").is_none() {
                            let found = identities(graph, &v.component, &e);
                            if found.len() > 1 {
                                out.push(error(
                                    self.id(),
                                    v,
                                    &rpath,
                                    format!(
                                        "Selector {e} names {} relationship identities for '{}': {}",
                                        found.len(),
                                        v.component,
                                        found.join("; ")
                                    ),
                                ));
                            }
                        }
                    }
                }
                if let Some(tok) = node.get("token").filter(|t| t.is_object()) {
                    if graph.tokens.is_empty() {
                        return;
                    }
                    let tpath = format!("{path}/token");
                    if has_template(tok) && sizes.is_empty() {
                        out.push(error(
                            self.id(),
                            v,
                            &tpath,
                            "Selector uses a size template but the recipe has no sizeScale".into(),
                        ));
                    }
                    for e in expand_selector(tok, &sizes, &options) {
                        let Some(sel) = e.as_object() else { continue };
                        if !token_exists(graph, sel) {
                            out.push(error(
                                self.id(),
                                v,
                                &tpath,
                                format!("No token matches selector {e}"),
                            ));
                        }
                    }
                }
            });
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{
        ComponentRecord, Layer, RelationshipRecord, TokenGraph, TokenRecord, VisualRecord,
    };
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec062::Rule;

    fn rel(component: &str, property: &str, context: &str) -> RelationshipRecord {
        RelationshipRecord {
            file: PathBuf::from("relationships/button.json"),
            index: 0,
            uuid: None,
            raw: json!({"scope": {"component": component, "property": property}, "context": context}),
        }
    }

    fn run(parts: Value) -> Vec<crate::report::Diagnostic> {
        run_with(
            parts,
            vec![
                rel("button", "component-height-75", "Minimum height"),
                rel("button", "component-height-100", " Minimum height "),
                rel("other", "component-height-100", "Minimum height"),
            ],
        )
    }

    fn run_with(parts: Value, rels: Vec<RelationshipRecord>) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("components/button.json"),
            raw: json!({"name": "button", "options": {"tone": {"values": [{"value": "base"}, {"value": "other"}]}}}),
            layer: Layer::Foundation,
        });
        g.relationships = rels;
        let raw =
            json!({"name": {"property": "gap", "structure": "base", "size": "s"}, "value": "4px"});
        g.tokens.insert(
            "gap-s".into(),
            TokenRecord {
                name: "gap-s".into(),
                file: PathBuf::from("tokens/layout.tokens.json"),
                index: 0,
                schema_url: None,
                uuid: None,
                alias_target: None,
                layer: Layer::Foundation,
                raw,
            },
        );
        g.visuals.push(VisualRecord {
            component: "button".into(),
            file: PathBuf::from("visuals/button.json"),
            raw: json!({"component": "button", "sizeScale": {"s": 75, "m": 100}, "parts": parts}),
            layer: crate::graph::Layer::Foundation,
        });
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn height(property: &str, context: &str) -> Value {
        json!({"container": {"props": {"height": {"relationship": {
            "property": property, "context": context}}}}})
    }

    #[test]
    fn templated_relationship_resolves_for_every_size() {
        assert!(run(height("component-height-{sizeIndex}", "Minimum height")).is_empty());
    }

    #[test]
    fn missing_relationship_for_a_size_errors() {
        let mut g_parts = height("component-height-{sizeIndex}", "Minimum height");
        g_parts["container"]["props"]["x"] = json!({"relationship": {
            "property": "component-height-300", "context": "Minimum height"}});
        let d = run(g_parts);
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].rule_id.as_deref(), Some("SPEC-062"));
        assert!(d[0].message.contains("component-height-300"));
    }

    #[test]
    fn relationship_scoped_to_other_component_errors() {
        let d = run(height("component-height-100", "Icon"));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("Icon"));
    }

    #[test]
    fn token_selector_must_match() {
        let ok = json!({"c": {"props": {"gap": {"token": {
            "structure": "base", "property": "gap", "size": "s"}}}}});
        assert!(run(ok).is_empty());
        let bad = json!({"c": {"props": {"gap": {"token": {
            "structure": "base", "property": "gap", "size": "{size}"}}}}});
        let d = run(bad);
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("\"size\":\"m\""));
    }

    #[test]
    fn option_template_expands_over_the_declared_values() {
        let d = run(json!({"c": {"props": {"gap": {"token": {
            "structure": "{tone}", "property": "gap", "size": "s"}}}}}));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("\"structure\":\"other\""));
    }

    fn bound(property: &str, part: Option<&str>, role: Option<&str>) -> RelationshipRecord {
        let mut raw = json!({"scope": {"component": "button", "property": property}, "$ref": "t"});
        if let Some(p) = part {
            raw["scope"]["part"] = json!(p);
        }
        if let Some(r) = role {
            raw["contextRole"] = json!([r]);
        }
        RelationshipRecord {
            file: PathBuf::from("relationships/button.json"),
            index: 0,
            uuid: None,
            raw,
        }
    }

    fn structured(sel: Value) -> Value {
        json!({"c": {"props": {"x": {"relationship": sel}}}})
    }

    #[test]
    fn a_structured_selector_must_name_exactly_one_identity() {
        let rels = || {
            vec![
                bound("color", Some("handle"), None),
                bound("color", Some("handle"), None),
                bound("color", Some("track"), None),
                bound("color", None, Some("control")),
            ]
        };
        let ok = run_with(
            structured(json!({"property": "color", "part": "handle"})),
            rels(),
        );
        assert!(ok.is_empty(), "{ok:?}");
        let both = run_with(structured(json!({"property": "color"})), rels());
        assert_eq!(both.len(), 1);
        assert!(
            both[0].message.contains("3 relationship identities"),
            "{}",
            both[0].message
        );
        assert!(both[0].message.contains("color / - / - / track / -"));
        let none = run_with(
            structured(json!({"property": "color", "part": "nope"})),
            rels(),
        );
        assert_eq!(none.len(), 1);
        assert!(none[0].message.contains("structured identity"));
    }
}
