// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-120: behavior-vectors-well-formed
//!
//! Warning. A conformance vector names its own component, registered capabilities and
//! registered intents in its steps, starts from declared options, and expects only facets the
//! contract can read, with values those facets have, after a step that exists.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::behavior_util::{
    collection_item, facet_values, facet_values_of, option_names, warning,
};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-120"
    }

    fn name(&self) -> &'static str {
        "behavior-vectors-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for b in &ctx.graph.behaviors {
            let options = option_names(ctx.graph, b);
            for (n, v) in b
                .raw
                .get("vectors")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let name = v.get("name").and_then(Value::as_str).unwrap_or("(unnamed)");
                let mut problem = |path: &str, msg: String| {
                    out.push(warning(
                        self.id(),
                        b,
                        &format!("/vectors/{n}{path}"),
                        format!("Vector '{name}' of '{}' {msg}", b.component),
                    ));
                };
                if let Some(c) = v
                    .get("component")
                    .and_then(Value::as_str)
                    .filter(|c| *c != b.component)
                {
                    problem(
                        "/component",
                        format!("names component '{c}', not the contract's"),
                    );
                }
                for c in v
                    .get("needs")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                {
                    if !ctx.registry.capabilities().contains(c) {
                        problem(
                            "/needs",
                            format!("needs '{c}', which is not in the capabilities registry"),
                        );
                    }
                }
                if let Some(options) = &options {
                    for k in v
                        .get("start")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flat_map(|o| o.keys())
                        .filter(|k| !matches!(k.as_str(), "items" | "focused"))
                    {
                        match ctx.registry.environment_property(k) {
                            Some(env) => {
                                let v = v["start"][k].as_str().unwrap_or_default();
                                if !env.values.contains(v) {
                                    problem(
                                        "/start",
                                        format!("starts environment property '{k}' at '{v}', which the environment registry does not list"),
                                    );
                                }
                            }
                            None if !options.contains(k) => problem(
                                "/start",
                                format!("starts '{k}', which is not an option of the component or a registered environment property"),
                            ),
                            None => {}
                        }
                    }
                }
                let items = v
                    .pointer("/start/items")
                    .and_then(Value::as_array)
                    .map_or(0, Vec::len);
                if v.get("start").is_some_and(|s| s.get("items").is_some()) {
                    let item = collection_item(ctx.graph, b);
                    if b.raw.get("collection").is_none() {
                        problem(
                            "/start",
                            "starts `items`, but the contract has no `collection`".into(),
                        );
                    }
                    for (i, o) in v
                        .pointer("/start/items")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .enumerate()
                    {
                        let known = item.as_ref().and_then(|i| i.options.as_ref());
                        for k in o.as_object().into_iter().flat_map(|o| o.keys()) {
                            if known.is_some_and(|known| !known.contains(k)) {
                                problem("/start/items", format!("starts item {i} with '{k}', which is not an option of the item"));
                            }
                        }
                    }
                    if let Some(f) = v
                        .pointer("/start/focused")
                        .and_then(Value::as_u64)
                        .filter(|f| *f as usize >= items)
                    {
                        problem(
                            "/start/focused",
                            format!("starts focused on item {f}, but has {items} items"),
                        );
                    }
                    for at in v
                        .get("steps")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .filter_map(|s| s.get("item")?.as_u64())
                        .filter(|at| *at as usize >= items)
                    {
                        problem(
                            "/steps",
                            format!("has a step on item {at}, but has {items} items"),
                        );
                    }
                    for (i, want) in v
                        .get("expect")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .filter_map(|e| e.get("items")?.as_array())
                        .flatten()
                        .enumerate()
                    {
                        let Some(item) = &item else { continue };
                        if i >= items {
                            problem(
                                "/expect",
                                format!("expects item {i}, but has {items} items"),
                            );
                        }
                        for (facet, value) in want.as_object().into_iter().flatten() {
                            match facet_values_of(ctx.graph, &item.raw, ctx.registry, facet) {
                                None => problem("/expect", format!("expects facet '{facet}' of item {i}, which the item contract does not declare")),
                                Some(values) => {
                                    let x = match value {
                                        Value::Bool(b) => Some(b.to_string()),
                                        v => v.as_str().map(String::from),
                                    };
                                    if let Some(x) = x.filter(|x| !values.contains(x)) {
                                        problem("/expect", format!("expects facet '{facet}' of item {i} to be '{x}', which is not one of its values"));
                                    }
                                }
                            }
                        }
                    }
                }
                let steps = v.get("steps").and_then(Value::as_array).map_or(0, Vec::len);
                for i in v
                    .get("steps")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(|s| s.get("intent")?.as_str())
                {
                    if !ctx.registry.intents().contains(i) {
                        problem("/steps", format!("has a step with intent '{i}', which is not in the intents registry"));
                    }
                }
                for e in v
                    .get("expect")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    if let Some(after) = e
                        .get("after")
                        .and_then(Value::as_u64)
                        .filter(|a| *a as usize > steps)
                    {
                        problem(
                            "/expect",
                            format!("expects after step {after}, but has {steps} steps"),
                        );
                    }
                    for (facet, value) in e
                        .get("facets")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flatten()
                    {
                        match facet_values(ctx.graph, b, ctx.registry, facet) {
                            None => problem(
                                "/expect",
                                format!(
                                    "expects facet '{facet}', which the contract does not declare"
                                ),
                            ),
                            Some(values) => {
                                let x = match value {
                                    Value::Bool(b) => Some(b.to_string()),
                                    v => v.as_str().map(String::from),
                                };
                                if let Some(x) = x.filter(|x| !values.contains(x)) {
                                    problem("/expect", format!("expects facet '{facet}' to be '{x}', which is not one of its values"));
                                }
                            }
                        }
                    }
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::validate::rules::behavior_util::test_util::{good, graph, run, Case};

    fn check(edit: impl FnOnce(&mut serde_json::Value)) -> Vec<String> {
        let mut c = good();
        edit(&mut c);
        run(&Rule, &graph(vec![c]))
    }

    #[test]
    fn a_well_formed_vector_is_clean() {
        assert!(check(|_| {}).is_empty());
    }

    #[test]
    fn flags_each_bad_vector() {
        let cases: Vec<Case> = vec![
            (
                Box::new(|c| c["vectors"][0]["component"] = json!("checkbox")),
                "not the contract's",
            ),
            (
                Box::new(|c| c["vectors"][0]["needs"] = json!(["telepathy"])),
                "capabilities registry",
            ),
            (
                Box::new(|c| c["vectors"][0]["start"] = json!({ "isGhost": true })),
                "not an option",
            ),
            (
                Box::new(|c| c["vectors"][0]["start"] = json!({ "direction": "sideways" })),
                "environment registry",
            ),
            (
                Box::new(|c| c["vectors"][0]["steps"][0]["intent"] = json!("tap")),
                "intents registry",
            ),
            (
                Box::new(|c| c["vectors"][0]["expect"][0]["after"] = json!(2)),
                "has 1 steps",
            ),
            (
                Box::new(|c| c["vectors"][0]["expect"][0]["facets"] = json!({ "glow": "on" })),
                "does not declare",
            ),
            (
                Box::new(|c| {
                    c["vectors"][0]["expect"][0]["facets"] = json!({ "checked": "mixed" })
                }),
                "not one of its values",
            ),
        ];
        for (edit, why) in cases {
            let m = check(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }

    #[test]
    fn flags_a_bad_group_vector() {
        let group = |c: &mut serde_json::Value| {
            c["collection"] = json!({ "slot": "default", "item": "switch" });
        };
        let cases: Vec<Case> = vec![
            (
                Box::new(move |c| {
                    group(c);
                    c["vectors"][0]["start"] = json!({ "items": [{ "isGhost": true }] });
                }),
                "not an option of the item",
            ),
            (
                Box::new(move |c| {
                    group(c);
                    c["vectors"][0]["start"] = json!({ "items": [{}], "focused": 2 });
                }),
                "starts focused on item 2",
            ),
            (
                Box::new(move |c| {
                    group(c);
                    c["vectors"][0]["start"] = json!({ "items": [{}] });
                    c["vectors"][0]["steps"][0]["item"] = json!(3);
                }),
                "step on item 3",
            ),
            (
                Box::new(move |c| {
                    group(c);
                    c["vectors"][0]["start"] = json!({ "items": [{}] });
                    c["vectors"][0]["expect"][0]["items"] = json!([{ "checked": "mixed" }]);
                }),
                "not one of its values",
            ),
            (
                Box::new(|c| c["vectors"][0]["start"] = json!({ "items": [{}] })),
                "no `collection`",
            ),
        ];
        for (edit, why) in cases {
            let m = check(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }
}
