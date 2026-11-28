// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language

//! SPEC-126: behavior-relations-well-formed
//!
//! Warning. A behavior contract's `relations` name elements the dataset can resolve: an end is an
//! anatomy part of the component or a registered external role (`relation-roles.json`) and at
//! least one end is an anatomy part; `kind` is `labelledby` or `describedby`; no element relates
//! to itself, and the relations of one kind form no cycle; a `when` reads a facet the contract
//! declares. Anatomy checks are skipped for a component that is not loaded.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::behavior_util::{facet_values, part_names, warning};

pub struct Rule;

const KINDS: [&str; 2] = ["labelledby", "describedby"];

/// `part:x` or `role:y` for a well-formed end.
fn node(end: &Value) -> Option<String> {
    let o = end.as_object().filter(|o| o.len() == 1)?;
    let (k, v) = o.iter().next()?;
    matches!(k.as_str(), "part" | "role").then(|| format!("{k}:{}", v.as_str().unwrap_or_default()))
}

fn reaches(
    edges: &BTreeMap<&str, BTreeSet<&str>>,
    from: &str,
    target: &str,
    seen: &mut BTreeSet<String>,
) -> bool {
    edges.get(from).is_some_and(|next| {
        next.iter().any(|n| {
            *n == target || (seen.insert((*n).to_string()) && reaches(edges, n, target, seen))
        })
    })
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-126"
    }

    fn name(&self) -> &'static str {
        "behavior-relations-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for b in &ctx.graph.behaviors {
            let Some(relations) = b.raw.get("relations").and_then(Value::as_array) else {
                continue;
            };
            let parts = part_names(ctx.graph, b);
            let mut problem = |i: usize, msg: String| {
                out.push(warning(
                    self.id(),
                    b,
                    &format!("/relations/{i}"),
                    format!("Behavior contract of '{}' relation {i} {msg}", b.component),
                ));
            };
            let mut by_kind: BTreeMap<&str, BTreeMap<&str, BTreeSet<&str>>> = BTreeMap::new();
            let mut nodes: Vec<(usize, &str, String, String)> = Vec::new();
            for (i, r) in relations.iter().enumerate() {
                let kind = r.get("kind").and_then(Value::as_str).unwrap_or_default();
                if !KINDS.contains(&kind) {
                    problem(
                        i,
                        format!("has kind '{kind}', which is not one of {KINDS:?}"),
                    );
                }
                let mut ends = [false; 2];
                let mut keys = [String::new(), String::new()];
                for (e, side) in ["from", "to"].into_iter().enumerate() {
                    let end = r.get(side).unwrap_or(&Value::Null);
                    let Some(key) = node(end) else {
                        problem(
                            i,
                            format!("has a `{side}` that is not one of `part` or `role`"),
                        );
                        continue;
                    };
                    let (k, name) = key.split_once(':').unwrap_or_default();
                    if k == "part" {
                        ends[e] = true;
                        if parts.as_ref().is_some_and(|p| !p.contains(name)) {
                            problem(
                                i,
                                format!("`{side}` names part '{name}', which the component does not declare"),
                            );
                        }
                    } else if !ctx.registry.relation_roles().contains(name) {
                        problem(
                            i,
                            format!(
                                "`{side}` names role '{name}', which is not in relation-roles.json"
                            ),
                        );
                    }
                    keys[e] = key;
                }
                if keys.iter().all(|k| !k.is_empty()) {
                    if !ends[0] && !ends[1] {
                        problem(
                            i,
                            "relates two external roles: one end must be an anatomy part".into(),
                        );
                    }
                    if keys[0] == keys[1] {
                        problem(i, format!("relates '{}' to itself", keys[0]));
                    } else {
                        nodes.push((i, kind, keys[0].clone(), keys[1].clone()));
                    }
                }
                if let Some(f) = r.pointer("/when/facet").and_then(Value::as_str) {
                    if facet_values(ctx.graph, b, ctx.registry, f).is_none() {
                        problem(i, format!("has a `when` that reads facet '{f}', which the contract does not declare"));
                    }
                }
            }
            for (_, kind, from, to) in &nodes {
                by_kind
                    .entry(kind)
                    .or_default()
                    .entry(from)
                    .or_default()
                    .insert(to);
            }
            for (i, kind, from, to) in &nodes {
                let edges = &by_kind[kind];
                if reaches(edges, to, from, &mut BTreeSet::new()) {
                    problem(
                        i.to_owned(),
                        format!("is part of a `{kind}` cycle through '{from}' and '{to}'"),
                    );
                }
            }
        }
        out
    }
}
