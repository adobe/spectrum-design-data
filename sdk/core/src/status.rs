// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Per-component status report: how far each component has moved to the structured data
//! system. Levels are computed from the data, never authored, and are cumulative
//! (a component is at level N when checks L1..LN all pass):
//!
//! 1. **L1 anatomy reviewed**: `anatomyReview.status == "reviewed"`.
//! 2. **L2 structured identity**: every live relationship record has `scope.part` or
//!    `scope.between` (`scope.options.from` and `.to` count as a between), no identity
//!    (component, property, part, between) is shared by records with different authored
//!    `context`, and no `scope.property` carries structure (`-to-`, a name of one of the
//!    component's own anatomy parts, or a trailing numeric scale). Deprecated records
//!    (`lifecycle.deprecatedIn`) are ignored.
//! 3. **L3 structured recipe**: the component has a visual recipe with no
//!    `relationship.context` selectors.
//! 4. **L4 clean labels**: no `contextPart`, `contextQualifier` or anatomy-word
//!    `contextRole`, and every authored `context` equals the label derived from the
//!    record's `contextRole` (SPEC-090's derivation).

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::graph::TokenGraph;
use crate::registry::RegistryData;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentStatus {
    pub component: String,
    /// Highest level whose check and every lower check pass (0 to 4).
    pub level: u8,
    /// Whether L1..L4 pass on their own, in order.
    pub checks: [bool; 4],
    /// `reviewed`, `draft` or `none`.
    pub anatomy: String,
    pub records: usize,
    /// Records with no `scope.part` and no between.
    pub unstructured_records: usize,
    /// Identity groups holding records with different authored contexts.
    pub colliding_identities: usize,
    /// Records whose `scope.property` carries structure.
    pub structured_property_records: usize,
    pub has_recipe: bool,
    /// `relationship.context` selectors in the component's recipe.
    pub context_selectors: usize,
    /// Records that fail the L4 label check.
    pub label_debt_records: usize,
}

fn str_of<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(Value::as_str)
}

fn has_between(scope: &Value) -> bool {
    scope.get("between").is_some()
        || scope
            .get("options")
            .is_some_and(|o| o.get("from").is_some() || o.get("to").is_some())
}

fn property_has_structure(property: &str, parts: &[&str]) -> bool {
    let padded = format!("-{property}-");
    padded.contains("-to-")
        || property
            .rsplit('-')
            .next()
            .is_some_and(|t| !t.is_empty() && t.bytes().all(|b| b.is_ascii_digit()))
        || parts.iter().any(|p| padded.contains(&format!("-{p}-")))
}

fn is_live(raw: &Value) -> bool {
    raw.get("lifecycle")
        .and_then(|l| l.get("deprecatedIn"))
        .is_none_or(Value::is_null)
}

fn count_context_selectors(v: &Value) -> usize {
    match v {
        Value::Object(m) => m
            .iter()
            .map(|(k, c)| {
                usize::from(k == "relationship" && c.get("context").is_some())
                    + count_context_selectors(c)
            })
            .sum(),
        Value::Array(a) => a.iter().map(count_context_selectors).sum(),
        _ => 0,
    }
}

/// Whether a record's label fields are clean (no part/qualifier/anatomy role, and the
/// authored `context`, if any, equals the one derived from `contextRole`).
fn label_clean(raw: &Value, reg: &RegistryData, anatomy: &HashSet<String>) -> bool {
    if raw.get("contextPart").is_some() || raw.get("contextQualifier").is_some() {
        return false;
    }
    let roles: Vec<&str> = raw
        .get("contextRole")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();
    if roles.iter().any(|r| anatomy.contains(*r)) {
        return false;
    }
    match str_of(raw, "context") {
        None => true,
        Some(c) => !roles.is_empty() && reg.context_agrees(c, &roles, None),
    }
}

/// Compute the status of every component in the graph, sorted by name. Components that only
/// platform extensions add are included like any other; run on the foundation graph for a
/// foundation report.
pub fn status_report(graph: &TokenGraph) -> Vec<ComponentStatus> {
    let reg = RegistryData::embedded();
    let anatomy = reg.for_field("anatomy-terms").cloned().unwrap_or_default();

    let mut names: BTreeSet<String> = graph.components.iter().map(|c| c.name.clone()).collect();
    let mut live: HashMap<&str, Vec<&Value>> = HashMap::new();
    for r in graph.relationships.iter().filter(|r| is_live(&r.raw)) {
        if let Some(c) = r.raw.get("scope").and_then(|s| str_of(s, "component")) {
            names.insert(c.to_string());
            live.entry(c).or_default().push(&r.raw);
        }
    }

    let mut out = Vec::new();
    for name in names {
        let decl = graph.components.iter().find(|c| c.name == name);
        let parts: Vec<&str> = decl
            .and_then(|c| c.raw.get("anatomy"))
            .and_then(Value::as_array)
            .map(|a| a.iter().filter_map(|p| str_of(p, "name")).collect())
            .unwrap_or_default();
        let anatomy_status = decl
            .and_then(|c| c.raw.get("anatomyReview"))
            .and_then(|a| str_of(a, "status"))
            .unwrap_or("none")
            .to_string();

        let mut s = ComponentStatus {
            component: name.clone(),
            level: 0,
            checks: [false; 4],
            anatomy: anatomy_status,
            records: 0,
            unstructured_records: 0,
            colliding_identities: 0,
            structured_property_records: 0,
            has_recipe: false,
            context_selectors: 0,
            label_debt_records: 0,
        };
        // identity key -> distinct authored contexts
        let mut identities: HashMap<String, BTreeSet<Option<String>>> = HashMap::new();
        for raw in live.get(name.as_str()).into_iter().flatten() {
            let Some(scope) = raw.get("scope") else {
                continue;
            };
            s.records += 1;
            let part = scope.get("part").and_then(Value::as_str);
            let options = scope.get("options");
            let between = scope.get("between").map(Value::to_string).or_else(|| {
                let (f, t) = (
                    options.and_then(|o| o.get("from")),
                    options.and_then(|o| o.get("to")),
                );
                (f.is_some() || t.is_some()).then(|| format!("{f:?}->{t:?}"))
            });
            if part.is_none() && !has_between(scope) {
                s.unstructured_records += 1;
            }
            let property = str_of(scope, "property").unwrap_or("");
            if property_has_structure(property, &parts) {
                s.structured_property_records += 1;
            }
            if !label_clean(raw, reg, &anatomy) {
                s.label_debt_records += 1;
            }
            let key = format!("{property}\u{0}{part:?}\u{0}{between:?}");
            identities
                .entry(key)
                .or_default()
                .insert(str_of(raw, "context").map(str::to_string));
        }
        s.colliding_identities = identities.values().filter(|c| c.len() > 1).count();
        for v in graph.visuals.iter().filter(|v| v.component == name) {
            s.has_recipe = true;
            s.context_selectors += count_context_selectors(&v.raw);
        }

        s.checks = [
            s.anatomy == "reviewed",
            s.unstructured_records == 0
                && s.colliding_identities == 0
                && s.structured_property_records == 0,
            s.has_recipe && s.context_selectors == 0,
            s.label_debt_records == 0,
        ];
        s.level = s.checks.iter().take_while(|c| **c).count() as u8;
        out.push(s);
    }
    out
}

/// Level per component, the shape of the committed ratchet baseline.
pub fn levels(report: &[ComponentStatus]) -> BTreeMap<String, u8> {
    report
        .iter()
        .map(|s| (s.component.clone(), s.level))
        .collect()
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{ComponentRecord, Layer, RelationshipRecord, VisualRecord};

    fn graph(anatomy: &str, rels: Vec<Value>, recipe: Option<Value>) -> TokenGraph {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = vec![ComponentRecord {
            name: "tag".into(),
            file: PathBuf::from("tag.json"),
            raw: json!({"anatomyReview": {"status": anatomy}, "anatomy": [{"name": "label"}]}),
            layer: Layer::default(),
        }];
        g.relationships = rels
            .into_iter()
            .enumerate()
            .map(|(index, raw)| RelationshipRecord {
                file: PathBuf::from("tag.json"),
                index,
                uuid: None,
                raw,
            })
            .collect();
        g.visuals = recipe
            .map(|raw| {
                vec![VisualRecord {
                    component: "tag".into(),
                    file: PathBuf::from("tag.json"),
                    raw,
                    layer: Layer::default(),
                }]
            })
            .unwrap_or_default();
        g
    }

    fn rel(property: &str, part: Option<&str>, context: &str, roles: Value) -> Value {
        let mut scope = json!({"component": "tag", "property": property});
        if let Some(p) = part {
            scope["part"] = json!(p);
        }
        json!({"scope": scope, "context": context, "contextRole": roles})
    }

    fn level(g: &TokenGraph) -> u8 {
        status_report(g)[0].level
    }

    #[test]
    fn each_level_needs_the_one_below() {
        let clean = rel("gap", Some("label"), "Spacing", json!(["spacing"]));
        let recipe = json!({"component": "tag", "x": {"relationship": {"property": "gap"}}});
        assert_eq!(
            level(&graph("draft", vec![clean.clone()], Some(recipe.clone()))),
            0
        );
        assert_eq!(level(&graph("reviewed", vec![], None)), 2);
        assert_eq!(
            level(&graph("reviewed", vec![clean.clone()], None)),
            2,
            "no recipe stops at L2"
        );
        assert_eq!(
            level(&graph("reviewed", vec![clean.clone()], Some(recipe))),
            4
        );
        let selector = json!({"component": "tag", "x": [{"relationship": {"context": "Spacing"}}]});
        assert_eq!(level(&graph("reviewed", vec![clean], Some(selector))), 2);
    }

    #[test]
    fn identity_failures_stop_at_l1() {
        let no_part = rel("gap", None, "Spacing", json!(["spacing"]));
        assert_eq!(level(&graph("reviewed", vec![no_part], None)), 1);
        let between = json!({"scope": {"component": "tag", "property": "gap",
            "options": {"from": "a", "to": "b"}}});
        assert_eq!(
            status_report(&graph("reviewed", vec![between], None))[0].unstructured_records,
            0
        );
        let a = rel("gap", Some("label"), "Spacing", json!(["spacing"]));
        let b = rel("gap", Some("label"), "Width", json!(["width"]));
        assert_eq!(
            status_report(&graph("reviewed", vec![a.clone(), b], None))[0].colliding_identities,
            1
        );
        let same = status_report(&graph("reviewed", vec![a.clone(), a], None));
        assert_eq!(
            same[0].colliding_identities, 0,
            "same context is not a collision"
        );
        for p in ["icon-to-label", "label-gap", "gap-100"] {
            let r = rel(p, Some("label"), "Spacing", json!(["spacing"]));
            assert_eq!(
                status_report(&graph("reviewed", vec![r], None))[0].structured_property_records,
                1,
                "{p}"
            );
        }
    }

    #[test]
    fn label_debt_stops_at_l3() {
        let recipe = json!({"component": "tag"});
        for extra in [
            json!({"contextPart": "icon"}),
            json!({"contextQualifier": "q"}),
        ] {
            let mut r = rel("gap", Some("label"), "Spacing", json!(["spacing"]));
            r.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            assert_eq!(level(&graph("reviewed", vec![r], Some(recipe.clone()))), 3);
        }
        let mismatch = rel("gap", Some("label"), "Width", json!(["spacing"]));
        assert_eq!(level(&graph("reviewed", vec![mismatch], Some(recipe))), 3);
    }

    #[test]
    fn edge_cases() {
        let clean = rel("gap", Some("root"), "Spacing", json!(["spacing"]));
        let recipe = json!({"component": "tag"});
        assert_eq!(
            level(&graph("reviewed", vec![clean], Some(recipe.clone()))),
            4,
            "explicit root part counts"
        );
        let between =
            json!({"scope": {"component": "tag", "property": "gap", "between": ["a", "b"]}});
        assert_eq!(level(&graph("reviewed", vec![between], None)), 2);
        assert_eq!(level(&graph("reviewed", vec![], Some(recipe.clone()))), 4);
        let anatomy_role = rel("gap", Some("label"), "Label", json!(["label"]));
        assert_eq!(
            level(&graph("reviewed", vec![anatomy_role], Some(recipe.clone()))),
            3
        );
        let no_role = json!({"scope": {"component": "tag", "property": "gap", "part": "label"}, "context": "Spacing"});
        assert_eq!(level(&graph("reviewed", vec![no_role], Some(recipe))), 3);
    }

    #[test]
    fn deprecated_records_are_ignored() {
        let mut bad = vec![
            rel("gap", None, "Old", json!(["spacing"])),
            rel(
                "icon-to-label",
                Some("label"),
                "Spacing",
                json!(["spacing"]),
            ),
            rel("gap", Some("label"), "Stale", json!(["width"])),
        ];
        bad.push(rel("gap", Some("label"), "Spacing", json!(["spacing"])));
        for b in &mut bad {
            b["lifecycle"] = json!({"deprecatedIn": "1.0.0"});
        }
        let ok = rel("gap", Some("label"), "Spacing", json!(["spacing"]));
        bad.push(ok);
        let g = graph("reviewed", bad, Some(json!({"component": "tag"})));
        let s = &status_report(&g)[0];
        assert_eq!((s.records, s.level), (1, 4));
    }
}
