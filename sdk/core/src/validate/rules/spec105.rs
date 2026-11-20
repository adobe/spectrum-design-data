// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-105: type-style-ref-composite
//!
//! A relationship with `property: type-style` MUST `$ref` (through its alias chain) a typography
//! composite, and a relationship whose `$ref` is a typography composite MUST have that property.
//! A pinned `options.size` MUST be a size the component declares; without a pin the composite's
//! `name.size` MUST be a declared size, or the record can never be chosen. Every inner alias of
//! the composite MUST resolve in every `scale` mode.
//!
//! Warning. Deprecated records are skipped.

use std::collections::HashSet;

use serde_json::Value;

use crate::graph::{RelationshipRecord, TokenGraph, TokenRecord};
use crate::report::{Diagnostic, Severity};
use crate::typography;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::visual::declared_option_values;

pub struct Rule;

pub const PROPERTY: &str = "type-style";

/// The token a relationship ends at, following `$ref` through relationships and token aliases.
fn leaf_token<'a>(graph: &'a TokenGraph, rel: &'a RelationshipRecord) -> Option<&'a TokenRecord> {
    let mut target = rel.raw.get("$ref").and_then(Value::as_str)?;
    for _ in 0..16 {
        if let Some(t) = graph.resolve_alias_key(target) {
            return Some(t.resolve_leaf(graph));
        }
        let next = graph.relationships.iter().find(|r| {
            r.uuid.as_deref() == Some(target)
                || r.raw.get("setUuid").and_then(Value::as_str) == Some(target)
        })?;
        target = next.raw.get("$ref").and_then(Value::as_str)?;
    }
    None
}

fn label(t: &TokenRecord) -> &str {
    t.raw
        .pointer("/name/legacyKey")
        .and_then(Value::as_str)
        .unwrap_or(&t.name)
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-105"
    }

    fn name(&self) -> &'static str {
        "type-style-ref-composite"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let graph = ctx.graph;
        let components = super::component_map(graph);
        let mut checked: HashSet<String> = HashSet::new();

        for rel in &graph.relationships {
            let deprecated = rel
                .raw
                .pointer("/lifecycle/deprecatedIn")
                .is_some_and(|v| !v.is_null());
            let Some(leaf) = (!deprecated).then(|| leaf_token(graph, rel)).flatten() else {
                continue;
            };
            let property = rel.raw.pointer("/scope/property").and_then(Value::as_str);
            let composite = typography::is_composite(leaf);
            let warn = |path: &str, message: String| Diagnostic {
                file: rel.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message,
                instance_path: Some(format!("/{}{path}", rel.index)),
                schema_path: None,
            };

            if property == Some(PROPERTY) && !composite {
                out.push(warn(
                    "/$ref",
                    format!("A '{PROPERTY}' relationship must $ref a typography composite, but '{}' is not one", label(leaf)),
                ));
                continue;
            }
            if property != Some(PROPERTY) && composite {
                out.push(warn(
                    "/scope/property",
                    format!("A relationship that $refs the typography composite '{}' must have property '{PROPERTY}'", label(leaf)),
                ));
                continue;
            }
            if !composite {
                continue;
            }

            let component = rel.raw.pointer("/scope/component").and_then(Value::as_str);
            let declared = component
                .and_then(|c| components.get(c))
                .map(|c| declared_option_values(&c.raw, "size"))
                .unwrap_or_default();
            if !declared.is_empty() {
                match rel
                    .raw
                    .pointer("/scope/options/size")
                    .and_then(Value::as_str)
                {
                    Some(pin) if !declared.iter().any(|d| d == pin) => out.push(warn(
                        "/scope/options/size",
                        format!(
                            "Type style pins size '{pin}', which '{}' does not declare",
                            component.unwrap_or_default()
                        ),
                    )),
                    Some(_) => {}
                    None => {
                        let size = leaf.raw.pointer("/name/size").and_then(Value::as_str);
                        if !size.is_some_and(|s| declared.iter().any(|d| d == s)) {
                            out.push(warn(
                                "/$ref",
                                format!(
                                    "Composite '{}' has size '{}', which '{}' does not declare, and the record pins no size, so it can never be chosen",
                                    label(leaf),
                                    size.unwrap_or("none"),
                                    component.unwrap_or_default()
                                ),
                            ));
                        }
                    }
                }
            }

            if checked.insert(leaf.name.clone()) {
                out.extend(unresolved_inner_aliases(self.id(), graph, leaf));
            }
        }
        out
    }
}

/// One warning per inner alias that has no value in some `scale` mode.
fn unresolved_inner_aliases(
    id: &str,
    graph: &TokenGraph,
    composite: &TokenRecord,
) -> Vec<Diagnostic> {
    let modes: Vec<String> = graph
        .mode_sets
        .iter()
        .find(|m| m.name == "scale")
        .map(|m| m.modes.clone())
        .unwrap_or_default();
    let mut missing: Vec<(String, String)> = Vec::new();
    for mode in modes {
        let ctx = [("scale".to_string(), mode.clone())].into_iter().collect();
        let Some(u) = typography::unpack(graph, composite, &ctx) else {
            continue;
        };
        for (key, sub) in [
            ("fontFamily", u.font_family),
            ("fontSize", u.font_size),
            ("fontWeight", u.font_weight),
            ("lineHeight", u.line_height),
            ("letterSpacing", u.letter_spacing),
        ] {
            if let Some(s) = sub.filter(|s| s.value.is_none()) {
                let entry = (
                    key.to_string(),
                    format!("{{{}}} in scale '{mode}'", s.token.unwrap_or_default()),
                );
                if !missing.contains(&entry) {
                    missing.push(entry);
                }
            }
        }
    }
    missing
        .into_iter()
        .map(|(key, what)| Diagnostic {
            file: composite.file.clone(),
            token: Some(composite.name.clone()),
            rule_id: Some(id.to_string()),
            severity: Severity::Warning,
            message: format!(
                "Typography composite '{}' {key} alias {what} does not resolve",
                label(composite)
            ),
            instance_path: Some(format!("/{}/value/{key}", composite.index)),
            schema_path: None,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{
        ComponentRecord, Layer, ModeSetRecord, RelationshipRecord, TokenGraph, TokenRecord,
    };
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    use super::Rule;

    const COMPOSITE: &str =
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/typography.json";

    fn token(uuid: &str, schema: Option<&str>, name: Value, value: Value) -> TokenRecord {
        TokenRecord {
            name: uuid.into(),
            file: PathBuf::from("t.json"),
            index: 0,
            schema_url: schema.map(String::from),
            uuid: Some(uuid.into()),
            alias_target: None,
            layer: Layer::Foundation,
            raw: json!({"name": name, "value": value, "uuid": uuid}),
        }
    }

    fn graph(rels: Vec<Value>, drop_mobile_size: bool) -> TokenGraph {
        let mut tokens = vec![
            token(
                "comp-m",
                Some(COMPOSITE),
                json!({"property": "typography", "size": "m"}),
                json!({"fontSize": "{fs}", "fontWeight": "{fw}"}),
            ),
            token(
                "comp-xs",
                Some(COMPOSITE),
                json!({"property": "typography", "size": "xs"}),
                json!({"fontSize": "{fs}"}),
            ),
            token("fw", None, json!({"legacyKey": "fw"}), json!("400")),
            token("plain", None, json!({"property": "color"}), json!("#000")),
            token(
                "fs-d",
                None,
                json!({"legacyKey": "fs", "scale": "desktop"}),
                json!("14px"),
            ),
        ];
        if !drop_mobile_size {
            tokens.push(token(
                "fs-m",
                None,
                json!({"legacyKey": "fs", "scale": "mobile"}),
                json!("17px"),
            ));
        }
        let mut g = TokenGraph::from_records(tokens);
        g.mode_sets.push(ModeSetRecord {
            file: PathBuf::from("scale.json"),
            name: "scale".into(),
            modes: vec!["desktop".into(), "mobile".into()],
            default_mode: "desktop".into(),
        });
        g.components.push(ComponentRecord {
            name: "field".into(),
            file: PathBuf::from("components/field.json"),
            raw: json!({"name": "field", "options": {"size": {"type": "string", "values": ["s", "m", "l"]}}}),
            layer: Layer::Foundation,
        });
        g.relationships = rels
            .into_iter()
            .enumerate()
            .map(|(index, raw)| RelationshipRecord {
                file: PathBuf::from("relationships/field.json"),
                index,
                uuid: None,
                raw,
            })
            .collect();
        g
    }

    fn rel(property: &str, target: &str, options: Value) -> Value {
        json!({"scope": {"component": "field", "property": property, "options": options}, "$ref": target})
    }

    fn messages(g: &TokenGraph) -> Vec<String> {
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).into_iter().map(|d| d.message).collect()
    }

    #[test]
    fn a_well_formed_record_passes() {
        assert!(messages(&graph(vec![rel("type-style", "comp-m", json!({}))], false)).is_empty());
    }

    #[test]
    fn property_and_ref_must_agree() {
        let g = graph(
            vec![
                rel("type-style", "plain", json!({})),
                rel("typography", "comp-m", json!({})),
            ],
            false,
        );
        let m = messages(&g);
        assert_eq!(m.len(), 2, "{m:?}");
        assert!(m[0].contains("must $ref a typography composite"));
        assert!(m[1].contains("must have property 'type-style'"));
    }

    #[test]
    fn the_size_must_be_declared() {
        let g = graph(
            vec![
                rel("type-style", "comp-xs", json!({})),
                rel("type-style", "comp-xs", json!({"size": "m"})),
                rel("type-style", "comp-m", json!({"size": "xl"})),
            ],
            false,
        );
        let m = messages(&g);
        assert_eq!(m.len(), 2, "{m:?}");
        assert!(m[0].contains("can never be chosen"));
        assert!(m[1].contains("pins size 'xl'"));
    }

    #[test]
    fn inner_aliases_must_resolve_in_every_scale() {
        // Only the desktop row exists: the base row still serves mobile, so it resolves.
        assert!(messages(&graph(vec![rel("type-style", "comp-m", json!({}))], true)).is_empty());
        let mut g = graph(vec![rel("type-style", "comp-m", json!({}))], false);
        g.tokens.remove("fw");
        let m = messages(&g);
        assert!(
            m.iter()
                .any(|s| s.contains("fontWeight alias {fw} in scale 'mobile'")),
            "{m:?}"
        );
    }
}
