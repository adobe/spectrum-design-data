// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-119: behavior-transitions-well-formed
//!
//! Warning. Each transition and each part `press` names a registered intent, `needs` names
//! registered capabilities, a guard reads only facets the contract can read (declared, or an
//! interaction facet) with a value that facet has, and `do` changes only options in `state`.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::behavior_util::{facet_values, state_ids, warning};

pub struct Rule;

fn guard_facets<'a>(guard: &'a Value, out: &mut Vec<(&'a str, Option<&'a str>)>) {
    if let Some(f) = guard.get("facet").and_then(Value::as_str) {
        out.push((f, guard.get("is").and_then(Value::as_str)));
    }
    for key in ["all", "any"] {
        for g in guard
            .get(key)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            guard_facets(g, out);
        }
    }
    if let Some(g) = guard.get("not") {
        guard_facets(g, out);
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-119"
    }

    fn name(&self) -> &'static str {
        "behavior-transitions-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for b in &ctx.graph.behaviors {
            let state = state_ids(b);
            let mut problem = |path: String, msg: String| {
                out.push(warning(
                    self.id(),
                    b,
                    &path,
                    format!("Behavior contract of '{}' {msg}", b.component),
                ));
            };
            for (part, p) in b
                .raw
                .get("parts")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                if let Some(i) = p
                    .get("press")
                    .and_then(Value::as_str)
                    .filter(|i| !ctx.registry.intents().contains(*i))
                {
                    problem(
                        format!("/parts/{part}/press"),
                        format!(
                            "has part '{part}' press '{i}', which is not in the intents registry"
                        ),
                    );
                }
            }
            for (n, t) in b
                .raw
                .get("transitions")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let at = format!("/transitions/{n}");
                if let Some(i) = t
                    .get("on")
                    .and_then(Value::as_str)
                    .filter(|i| !ctx.registry.intents().contains(*i))
                {
                    problem(
                        format!("{at}/on"),
                        format!("has a transition on '{i}', which is not in the intents registry"),
                    );
                }
                for c in t
                    .get("needs")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                {
                    if !ctx.registry.capabilities().contains(c) {
                        problem(format!("{at}/needs"), format!("has a transition needing '{c}', which is not in the capabilities registry"));
                    }
                }
                let mut guards = Vec::new();
                if let Some(g) = t.get("guard") {
                    guard_facets(g, &mut guards);
                }
                if let Some(set) = t.pointer("/do/set").and_then(Value::as_object) {
                    for v in set.values().filter_map(|v| v.get("not")) {
                        guard_facets(v, &mut guards);
                    }
                }
                for (facet, is) in guards {
                    match facet_values(b, ctx.registry, facet) {
                        None => problem(format!("{at}/guard"), format!("has a transition reading facet '{facet}', which the contract does not declare")),
                        Some(values) => {
                            if let Some(is) = is.filter(|is| !values.contains(*is)) {
                                problem(format!("{at}/guard"), format!("has a transition testing facet '{facet}' for '{is}', which is not one of its values"));
                            }
                        }
                    }
                }
                let mut changed: Vec<&str> = t
                    .pointer("/do/toggle")
                    .and_then(Value::as_str)
                    .into_iter()
                    .collect();
                changed.extend(
                    t.pointer("/do/set")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flat_map(|o| o.keys().map(String::as_str)),
                );
                for o in changed.into_iter().filter(|o| !state.contains(*o)) {
                    problem(
                        format!("{at}/do"),
                        format!("has a transition changing '{o}', which is not in `state`"),
                    );
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
    fn well_formed_transitions_are_clean() {
        assert!(check(|_| {}).is_empty());
        assert!(check(|c| {
            c["transitions"][0]["guard"] = json!({ "all": [{ "facet": "disabled", "is": "false" }, { "not": { "facet": "hovered", "is": "true" } }] });
            c["transitions"][0]["needs"] = json!(["pointer-hover"]);
        })
        .is_empty());
    }

    #[test]
    fn flags_each_bad_transition() {
        let cases: Vec<Case> = vec![
            (
                Box::new(|c| c["transitions"][0]["on"] = json!("tap")),
                "not in the intents registry",
            ),
            (
                Box::new(|c| c["parts"]["track"]["press"] = json!("tap")),
                "not in the intents registry",
            ),
            (
                Box::new(|c| c["transitions"][0]["needs"] = json!(["telepathy"])),
                "capabilities registry",
            ),
            (
                Box::new(|c| c["transitions"][0]["guard"]["facet"] = json!("readOnly")),
                "does not declare",
            ),
            (
                Box::new(|c| c["transitions"][0]["guard"]["is"] = json!("maybe")),
                "not one of its values",
            ),
            (
                Box::new(|c| c["transitions"][0]["do"] = json!({ "toggle": "isGhost" })),
                "not in `state`",
            ),
            (
                Box::new(
                    |c| c["transitions"][0]["do"] = json!({ "set": { "isSelected": { "not": { "facet": "checked", "is": "mixed" } } } }),
                ),
                "not one of its values",
            ),
        ];
        for (edit, why) in cases {
            let m = check(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }
}
