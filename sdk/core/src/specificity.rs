// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Semantic specificity (spec: taxonomy.md, Semantic specificity). How much a token's name says
//! about what it is for, derived and never stored:
//!
//! 1. tier rank (primitive < semantic < component), then
//! 2. purpose-field count: name fields whose catalog entry has `impliesTokenTier: "semantic"`.
//!
//! The pair orders tokens; it never decides that one fits a use. [`refinements`] lists the
//! same-property tokens whose names add (narrower) or drop (broader) purpose fields, with whether
//! swapping changes any resolved value. Whether an added field fits the use is for the caller.
//! Like the tier, everything here reads the binary's embedded field catalog, not a dataset's own
//! `fields/`, and nothing is cached.

use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::cascade::{matches_context, specificity as mode_specificity, ResolutionContext};
use crate::graph::{TokenGraph, TokenRecord};
use crate::naming::extract_legacy_key;
use crate::registry::FieldCatalog;
use crate::token_tier;

/// A token's derived semantic specificity.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Specificity {
    /// Effective tier: `primitive`, `semantic` or `component`.
    pub tier: String,
    /// Name fields that imply a semantic role, in field catalog order.
    pub purpose_fields: Vec<String>,
}

impl Specificity {
    pub fn tier_rank(&self) -> u8 {
        match self.tier.as_str() {
            "component" => 2,
            "semantic" => 1,
            _ => 0,
        }
    }

    pub fn purpose_count(&self) -> usize {
        self.purpose_fields.len()
    }

    /// Compared left to right: tier rank, then purpose-field count.
    pub fn rank(&self) -> (u8, usize) {
        (self.tier_rank(), self.purpose_count())
    }
}

/// [`specificity_raw`] for a token record.
pub fn specificity(record: &TokenRecord) -> Specificity {
    specificity_raw(&record.raw)
}

/// Specificity from a token's source JSON.
pub fn specificity_raw(raw: &Value) -> Specificity {
    let catalog = FieldCatalog::embedded();
    let mut purpose: Vec<(u32, String)> = raw
        .get("name")
        .and_then(|v| v.as_object())
        .map(|name| {
            name.keys()
                .filter_map(|k| {
                    let entry = catalog.get(k)?;
                    (entry.implies_token_tier == Some("semantic"))
                        .then(|| (entry.position, k.clone()))
                })
                .collect()
        })
        .unwrap_or_default();
    purpose.sort();
    Specificity {
        tier: token_tier::effective_raw(raw).to_string(),
        purpose_fields: purpose.into_iter().map(|(_, k)| k).collect(),
    }
}

/// Whether swapping a token for a neighbor changes any resolved value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ValueMatch {
    /// Same resolved value in every mode combination.
    DropIn,
    /// Differs in at least one mode combination (see `differingModes`).
    Consider,
}

/// A same-property token whose name is a superset or subset of another's.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Neighbor {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub concept_id: Option<String>,
    /// Narrower: fields this token adds. Broader: fields this token lacks.
    pub fields: Map<String, Value>,
    pub specificity: Specificity,
    pub value_match: ValueMatch,
    /// Mode combinations (e.g. `colorScheme=dark,contrast=high`) where the values differ, or
    /// `["all"]` when they differ in every combination.
    pub differing_modes: Vec<String>,
}

/// A token's specificity and its same-property neighbors.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Refinements {
    pub token: String,
    pub specificity: Specificity,
    /// Names containing every field of the token, plus at least one more purpose field.
    pub narrower: Vec<Neighbor>,
    pub narrower_total: usize,
    /// Names whose fields all appear on the token, which has at least one more purpose field.
    pub broader: Vec<Neighbor>,
    pub broader_total: usize,
}

type Fields = BTreeMap<String, Value>;

fn is_deprecated(raw: &Value) -> bool {
    raw.get("lifecycle")
        .and_then(|l| l.get("deprecatedIn"))
        .is_some()
}

fn display(record: &TokenRecord) -> String {
    record
        .raw
        .get("name")
        .and_then(extract_legacy_key)
        .unwrap_or_else(|| record.name.clone())
}

/// A token's name fields without mode-set fields and `legacyKey`.
fn identity_fields(graph: &TokenGraph, raw: &Value) -> Option<Fields> {
    let name = raw.get("name")?.as_object()?;
    Some(
        name.iter()
            .filter(|(k, _)| {
                k.as_str() != "legacyKey" && !graph.mode_sets.iter().any(|m| &m.name == *k)
            })
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect(),
    )
}

fn is_refining(field: &str) -> bool {
    FieldCatalog::embedded()
        .get(field)
        .and_then(|e| e.implies_token_tier)
        .is_some_and(|t| t == "semantic" || t == "component")
}

fn contexts(graph: &TokenGraph) -> Vec<Vec<(String, String)>> {
    let mut out: Vec<Vec<(String, String)>> = vec![Vec::new()];
    for ms in &graph.mode_sets {
        out = out
            .into_iter()
            .flat_map(|base| {
                ms.modes.iter().map(move |m| {
                    let mut next = base.clone();
                    next.push((ms.name.clone(), m.clone()));
                    next
                })
            })
            .collect();
    }
    out
}

fn value_in(graph: &TokenGraph, group: &[&TokenRecord], ctx: &[(String, String)]) -> Option<Value> {
    let mut rc = ResolutionContext::new();
    let mut map = HashMap::new();
    for (k, v) in ctx {
        rc = rc.with(k.clone(), v.clone());
        map.insert(k.clone(), v.clone());
    }
    let best = group
        .iter()
        .filter(|r| {
            r.raw
                .get("name")
                .and_then(|n| n.as_object())
                .is_some_and(|n| matches_context(n, &rc))
        })
        .max_by_key(|r| {
            let spec = r
                .raw
                .get("name")
                .and_then(|n| n.as_object())
                .map(|n| mode_specificity(n, &graph.mode_sets))
                .unwrap_or(0);
            (r.layer, spec, std::cmp::Reverse((r.file.clone(), r.index)))
        })?;
    best.resolve_leaf_in_context(graph, &map)
        .raw
        .get("value")
        .cloned()
}

fn compare(
    graph: &TokenGraph,
    ctxs: &[Vec<(String, String)>],
    a: &[&TokenRecord],
    b: &[&TokenRecord],
) -> (ValueMatch, Vec<String>) {
    let differing: Vec<String> = ctxs
        .iter()
        .filter(|c| value_in(graph, a, c) != value_in(graph, b, c))
        .map(|c| {
            c.iter()
                .map(|(k, v)| format!("{k}={v}"))
                .collect::<Vec<_>>()
                .join(",")
        })
        .collect();
    let differing = if differing.len() == ctxs.len() && ctxs.len() > 1 {
        vec!["all".to_string()]
    } else {
        differing
    };
    let kind = if differing.is_empty() {
        ValueMatch::DropIn
    } else {
        ValueMatch::Consider
    };
    (kind, differing)
}

/// The token a reference names: a uuid, a conceptId, a legacy name or a graph key, or the
/// `field=value` form query results use for tokens without a legacy name
/// (`property=corner-radius scaleIndex=500`, fields separated by spaces or commas, array values
/// joined with `+`). Mode-set fields are ignored in that form.
pub fn find<'a>(graph: &'a TokenGraph, reference: &str) -> Option<&'a TokenRecord> {
    let reference = reference.trim().trim_matches(|c| c == '{' || c == '}');
    graph
        .resolve_alias_key(reference)
        .or_else(|| find_by_fields(graph, reference))
}

fn find_by_fields<'a>(graph: &'a TokenGraph, reference: &str) -> Option<&'a TokenRecord> {
    let wanted: BTreeMap<&str, &str> = reference
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|part| !part.is_empty())
        .map(|part| part.split_once('='))
        .collect::<Option<Vec<_>>>()?
        .into_iter()
        .filter(|(k, _)| !graph.mode_sets.iter().any(|m| m.name == *k))
        .collect();
    if wanted.is_empty() {
        return None;
    }
    let text = |v: &Value| match v {
        Value::Array(items) => items
            .iter()
            .map(|i| i.as_str().map_or_else(|| i.to_string(), str::to_string))
            .collect::<Vec<_>>()
            .join("+"),
        other => other
            .as_str()
            .map_or_else(|| other.to_string(), str::to_string),
    };
    graph
        .tokens
        .values()
        .filter(|r| {
            identity_fields(graph, &r.raw).is_some_and(|f| {
                f.len() == wanted.len()
                    && f.iter()
                        .all(|(k, v)| wanted.get(k.as_str()).is_some_and(|w| *w == text(v)))
            })
        })
        .min_by_key(|r| (r.file.clone(), r.index))
}

/// Same-property tokens narrower or broader than `token`, at most `limit` of each, closest first.
/// Deprecated tokens are left out.
pub fn refinements(graph: &TokenGraph, token: &TokenRecord, limit: usize) -> Refinements {
    let spec = specificity(token);
    let mut out = Refinements {
        token: display(token),
        specificity: spec,
        narrower: Vec::new(),
        narrower_total: 0,
        broader: Vec::new(),
        broader_total: 0,
    };
    let Some(mine) = identity_fields(graph, &token.raw) else {
        return out;
    };
    let Some(property) = mine.get("property") else {
        return out;
    };

    let mut groups: BTreeMap<String, (Fields, Vec<&TokenRecord>)> = BTreeMap::new();
    for r in graph.tokens.values() {
        let Some(f) = identity_fields(graph, &r.raw) else {
            continue;
        };
        if f.get("property") != Some(property) {
            continue;
        }
        let key = serde_json::to_string(&f).unwrap_or_default();
        groups
            .entry(key)
            .or_insert_with(|| (f, Vec::new()))
            .1
            .push(r);
    }
    let my_key = serde_json::to_string(&mine).unwrap_or_default();
    let Some((_, mine_group)) = groups.get(&my_key) else {
        return out;
    };
    let ctxs = contexts(graph);

    let mut narrower = Vec::new();
    let mut broader = Vec::new();
    for (key, (fields, recs)) in &groups {
        if *key == my_key || recs.iter().any(|r| is_deprecated(&r.raw)) {
            continue;
        }
        let (delta, is_narrower) = if mine.iter().all(|(k, v)| fields.get(k) == Some(v)) {
            (
                fields
                    .iter()
                    .filter(|(k, _)| !mine.contains_key(*k))
                    .collect::<Vec<_>>(),
                true,
            )
        } else if fields.iter().all(|(k, v)| mine.get(k) == Some(v)) {
            (
                mine.iter()
                    .filter(|(k, _)| !fields.contains_key(*k))
                    .collect::<Vec<_>>(),
                false,
            )
        } else {
            continue;
        };
        if !delta.iter().any(|(k, _)| is_refining(k)) {
            continue;
        }
        let first = recs[0];
        let (value_match, differing_modes) = compare(graph, &ctxs, mine_group, recs);
        let neighbor = Neighbor {
            name: display(first),
            concept_id: first
                .raw
                .get("conceptId")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            fields: delta
                .iter()
                .map(|(k, v)| ((*k).clone(), (*v).clone()))
                .collect(),
            specificity: specificity(first),
            value_match,
            differing_modes,
        };
        if is_narrower {
            narrower.push(neighbor);
        } else {
            broader.push(neighbor);
        }
    }
    let order = |a: &Neighbor, b: &Neighbor| {
        a.fields
            .len()
            .cmp(&b.fields.len())
            .then_with(|| a.name.cmp(&b.name))
    };
    narrower.sort_by(order);
    broader.sort_by(order);
    out.narrower_total = narrower.len();
    out.broader_total = broader.len();
    narrower.truncate(limit);
    broader.truncate(limit);
    out.narrower = narrower;
    out.broader = broader;
    out
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{Layer, ModeSetRecord};

    fn rec(i: usize, raw: Value) -> TokenRecord {
        TokenRecord {
            name: format!("t.json:{i}"),
            file: PathBuf::from("t.json"),
            index: i,
            schema_url: None,
            uuid: raw.get("uuid").and_then(|v| v.as_str()).map(str::to_string),
            alias_target: raw.get("$ref").and_then(|v| v.as_str()).map(str::to_string),
            raw,
            layer: Layer::Foundation,
        }
    }

    fn graph(raws: Vec<Value>) -> TokenGraph {
        TokenGraph::from_records(
            raws.into_iter()
                .enumerate()
                .map(|(i, r)| rec(i, r))
                .collect(),
        )
        .with_mode_sets(vec![ModeSetRecord {
            file: PathBuf::from("m.json"),
            name: "colorScheme".to_string(),
            modes: vec!["light".to_string(), "dark".to_string()],
            default_mode: "light".to_string(),
        }])
    }

    #[test]
    fn counts_purpose_fields_in_catalog_order() {
        let s = specificity_raw(&json!({
            "name": { "state": ["hover"], "property": "color", "colorRole": "accent", "object": "background" },
            "$ref": "x"
        }));
        assert_eq!(s.tier, "semantic");
        assert_eq!(s.purpose_fields.len(), 3);
        assert_eq!(s.rank(), (1, 3));
        let prim = specificity_raw(&json!({
            "name": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 }, "value": "#00f"
        }));
        assert_eq!(prim.rank(), (0, 0));
        assert!(prim.rank() < s.rank());
    }

    #[test]
    fn tier_outranks_purpose_count() {
        let component = specificity_raw(&json!({
            "name": { "component": "button", "property": "gap" }, "value": "1px"
        }));
        let semantic = specificity_raw(&json!({
            "name": { "colorRole": "a", "object": "b", "state": ["c"], "property": "color" }, "$ref": "x"
        }));
        assert!(component.rank() > semantic.rank());
    }

    fn color_set(uuid: &str, name: Value, light: &str, dark: &str) -> Vec<Value> {
        let mut out = Vec::new();
        for (mode, value) in [("light", light), ("dark", dark)] {
            let mut n = name.clone();
            n["colorScheme"] = json!(mode);
            out.push(json!({ "uuid": format!("{uuid}-{mode}"), "conceptId": uuid, "name": n, "value": value }));
        }
        out
    }

    #[test]
    fn narrower_and_broader_with_value_match() {
        let mut raws = Vec::new();
        raws.extend(color_set(
            "c-broad",
            json!({ "property": "color", "object": "background" }),
            "#fff",
            "#000",
        ));
        raws.extend(color_set(
            "c-same",
            json!({ "property": "color", "object": "background", "colorRole": "neutral" }),
            "#fff",
            "#000",
        ));
        raws.extend(color_set(
            "c-diff",
            json!({ "property": "color", "object": "background", "state": ["hover"] }),
            "#fff",
            "#111",
        ));
        raws.extend(color_set(
            "c-other",
            json!({ "property": "gap", "object": "background", "colorRole": "neutral" }),
            "#fff",
            "#000",
        ));
        raws.extend(color_set(
            "c-sibling",
            json!({ "property": "color", "object": "border" }),
            "#fff",
            "#000",
        ));
        let g = graph(raws);
        let token = find(&g, "c-broad").expect("token");
        let r = refinements(&g, token, 10);
        assert_eq!(r.narrower_total, 2);
        let same = r
            .narrower
            .iter()
            .find(|n| n.fields.contains_key("colorRole"))
            .unwrap();
        assert_eq!(same.value_match, ValueMatch::DropIn);
        let diff = r
            .narrower
            .iter()
            .find(|n| n.fields.contains_key("state"))
            .unwrap();
        assert_eq!(diff.value_match, ValueMatch::Consider);
        assert_eq!(diff.differing_modes, ["colorScheme=dark"]);
        assert!(r.broader.is_empty());

        let narrow = find(&g, "c-same").expect("token");
        let back = refinements(&g, narrow, 10);
        assert_eq!(back.broader_total, 1);
        assert_eq!(back.broader[0].concept_id.as_deref(), Some("c-broad"));
        assert_eq!(
            back.broader[0].fields.keys().collect::<Vec<_>>(),
            ["colorRole"]
        );
    }

    #[test]
    fn find_accepts_the_field_form_query_results_use() {
        let g = graph(vec![
            json!({ "uuid": "a", "name": { "property": "corner-radius", "scaleIndex": 500 }, "value": "8px" }),
            json!({ "uuid": "b", "name": { "property": "x", "state": ["selected", "hover"], "colorScheme": "dark" }, "value": "1" }),
        ]);
        assert_eq!(
            find(&g, "property=corner-radius scaleIndex=500")
                .unwrap()
                .uuid
                .as_deref(),
            Some("a")
        );
        assert_eq!(
            find(&g, "property=corner-radius,scaleIndex=500")
                .unwrap()
                .uuid
                .as_deref(),
            Some("a")
        );
        assert_eq!(
            find(&g, "property=x state=selected+hover colorScheme=light")
                .unwrap()
                .uuid
                .as_deref(),
            Some("b")
        );
        assert!(find(&g, "property=corner-radius").is_none());
        assert!(find(&g, "not a token").is_none());
    }

    #[test]
    fn non_purpose_fields_alone_do_not_refine() {
        let g = graph(vec![
            json!({ "uuid": "a", "name": { "property": "gap" }, "value": "1px" }),
            json!({ "uuid": "b", "name": { "property": "gap", "size": "m" }, "value": "2px" }),
        ]);
        let r = refinements(&g, find(&g, "a").unwrap(), 10);
        assert!(r.narrower.is_empty());
    }
}
