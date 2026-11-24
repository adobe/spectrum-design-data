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
use crate::validate::rules::behavior_util::{facet_values, option_names, warning};

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
                    {
                        if !options.contains(k) {
                            problem(
                                "/start",
                                format!("starts '{k}', which is not an option of the component"),
                            );
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
                        match facet_values(b, ctx.registry, facet) {
                            None => problem(
                                "/expect",
                                format!(
                                    "expects facet '{facet}', which the contract does not declare"
                                ),
                            ),
                            Some(values) => {
                                if let Some(x) = value.as_str().filter(|x| !values.contains(*x)) {
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
}
