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
//! selector MUST match at least one token. `{size}` and `{sizeIndex}` templates
//! are expanded over the recipe's `sizeScale` before resolving.

use serde_json::{Map, Value};

use crate::graph::TokenGraph;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, error, expand_selector, has_template, size_entries, walk_objects,
};

pub struct Rule;

fn relationship_exists(graph: &TokenGraph, component: &str, property: &str, context: &str) -> bool {
    graph.relationships.iter().any(|r| {
        r.raw.pointer("/scope/component").and_then(Value::as_str) == Some(component)
            && r.raw.pointer("/scope/property").and_then(Value::as_str) == Some(property)
            && r.raw.get("context").and_then(Value::as_str).map(str::trim) == Some(context)
    })
}

fn name_matches(name: &Value, sel: &Map<String, Value>) -> bool {
    sel.iter().all(|(k, want)| match name.get(k) {
        Some(Value::Array(a)) => a.contains(want),
        Some(have) => have == want,
        None => false,
    })
}

fn token_exists(graph: &TokenGraph, sel: &Map<String, Value>) -> bool {
    let find = |sel: &Map<String, Value>| {
        graph
            .tokens
            .values()
            .any(|t| t.raw.get("name").is_some_and(|n| name_matches(n, sel)))
    };
    if find(sel) {
        return true;
    }
    // A bare `font-size-{n}` style property may also be encoded as property + scaleIndex.
    let Some((base, idx)) = sel
        .get("property")
        .and_then(Value::as_str)
        .and_then(|p| p.rsplit_once('-'))
    else {
        return false;
    };
    let Ok(i) = idx.parse::<u64>() else {
        return false;
    };
    let mut alt = sel.clone();
    alt.insert("property".into(), Value::String(base.into()));
    alt.insert("scaleIndex".into(), Value::from(i));
    find(&alt)
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
                    for e in expand_selector(rel, &sizes) {
                        let property = e.get("property").and_then(Value::as_str).unwrap_or("");
                        let context = e
                            .get("context")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .trim();
                        if seen.contains(&(property.to_string(), context.to_string())) {
                            continue;
                        }
                        seen.push((property.to_string(), context.to_string()));
                        if !relationship_exists(graph, &v.component, property, context) {
                            out.push(error(
                                self.id(),
                                v,
                                &rpath,
                                format!(
                                    "No relationship for '{}' with property '{property}' and context '{context}'",
                                    v.component
                                ),
                            ));
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
                    for e in expand_selector(tok, &sizes) {
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
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("components/button.json"),
            raw: json!({"name": "button"}),
            layer: Layer::Foundation,
        });
        g.relationships = vec![
            rel("button", "component-height-75", "Minimum height"),
            rel("button", "component-height-100", " Minimum height "),
            rel("other", "component-height-100", "Minimum height"),
        ];
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
}
