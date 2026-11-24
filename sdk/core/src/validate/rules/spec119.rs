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
//! interaction facet) with a value that facet has, and `do` changes only options in `state`. A
//! pattern's transitions are checked the same way, except that `do` may change only the
//! interaction facets the pattern (or one it extends) publishes, and only to `true` or `false`.

use std::collections::HashSet;

use serde_json::Value;

use crate::behavior::INTERACTION_EVENTS;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::behavior_util::{
    extends_of, facet_values, facet_values_of, state_ids, warning,
};

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
                for i in p
                    .get("handles")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .filter(|i| !ctx.registry.intents().contains(*i))
                {
                    problem(
                        format!("/parts/{part}/handles"),
                        format!(
                            "has part '{part}' handling '{i}', which is not in the intents registry"
                        ),
                    );
                }
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
            for o in state
                .iter()
                .filter(|o| ctx.registry.facet(o).is_some_and(|f| f.interaction))
            {
                problem(
                    "/state".into(),
                    format!("lists option '{o}', which is also an interaction facet"),
                );
            }
            let raises = |raw: &Value| {
                raw.get("transitions")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .any(|t| t.pointer("/do/raise").is_some())
            };
            let patterns: Vec<&Value> = extends_of(&b.raw)
                .iter()
                .filter_map(|n| ctx.graph.behavior_patterns.iter().find(|p| &p.pattern == n))
                .map(|p| &p.raw)
                .collect();
            let has_press = |raw: &Value| {
                raw.get("parts")
                    .and_then(Value::as_object)
                    .is_some_and(|o| o.values().any(|p| p.get("press").is_some()))
            };
            if (raises(&b.raw) || patterns.iter().any(|p| raises(p)))
                && !has_press(&b.raw)
                && !patterns.iter().any(|p| has_press(p))
            {
                problem(
                    "/parts".into(),
                    "raises `press` but no part declares `press`".into(),
                );
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
                if let Some(i) = t
                    .get("on")
                    .and_then(Value::as_str)
                    .filter(|i| t.pointer("/do/raise").is_some() && !INTERACTION_EVENTS.contains(i))
                {
                    problem(
                        format!("{at}/do/raise"),
                        format!("has a transition raising `press` on '{i}', which is not an event intent"),
                    );
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
                    match facet_values(ctx.graph, b, ctx.registry, facet) {
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
        for b in &ctx.graph.behaviors {
            let state = state_ids(b);
            let own = b
                .raw
                .get("transitions")
                .and_then(Value::as_array)
                .map_or(0, Vec::len);
            let Ok(m) = crate::behavior::flatten(&b.raw, &ctx.graph.behavior_patterns) else {
                continue;
            };
            for t in m.transitions.iter().skip(own) {
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
                for o in changed
                    .into_iter()
                    .filter(|o| !state.contains(*o) && !m.published.iter().any(|p| p == o))
                {
                    out.push(warning(
                        self.id(),
                        b,
                        "/extends",
                        format!(
                            "Behavior contract of '{}' extends a pattern whose transition changes '{o}', which is not in `state`",
                            b.component
                        ),
                    ));
                }
            }
        }
        for p in &ctx.graph.behavior_patterns {
            let mut published: HashSet<String> = HashSet::new();
            let mut seen: HashSet<String> = HashSet::new();
            let mut queue = vec![p.pattern.clone()];
            while let Some(name) = queue.pop() {
                if !seen.insert(name.clone()) {
                    continue;
                }
                for q in ctx
                    .graph
                    .behavior_patterns
                    .iter()
                    .filter(|q| q.pattern == name)
                {
                    published.extend(
                        q.raw
                            .get("publishes")
                            .and_then(Value::as_array)
                            .into_iter()
                            .flatten()
                            .filter_map(|v| v.as_str().map(String::from)),
                    );
                    queue.extend(extends_of(&q.raw));
                }
            }
            for (n, t) in p
                .raw
                .get("transitions")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let mut problems: Vec<(String, String)> = Vec::new();
                let at = format!("/transitions/{n}");
                if let Some(i) = t
                    .get("on")
                    .and_then(Value::as_str)
                    .filter(|i| !ctx.registry.intents().contains(*i))
                {
                    problems.push((
                        format!("{at}/on"),
                        format!("has a transition on '{i}', which is not in the intents registry"),
                    ));
                }
                for c in t
                    .get("needs")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .filter(|c| !ctx.registry.capabilities().contains(*c))
                {
                    problems.push((format!("{at}/needs"), format!("has a transition needing '{c}', which is not in the capabilities registry")));
                }
                if let Some(i) = t
                    .get("on")
                    .and_then(Value::as_str)
                    .filter(|i| t.pointer("/do/raise").is_some() && !INTERACTION_EVENTS.contains(i))
                {
                    problems.push((format!("{at}/do/raise"), format!("has a transition raising `press` on '{i}', which is not an event intent")));
                }
                let mut guards = Vec::new();
                if let Some(g) = t.get("guard") {
                    guard_facets(g, &mut guards);
                }
                for (facet, is) in guards {
                    match facet_values_of(ctx.graph, &p.raw, ctx.registry, facet) {
                        None => problems.push((format!("{at}/guard"), format!("has a transition reading facet '{facet}', which the pattern neither declares nor publishes"))),
                        Some(values) => {
                            if let Some(is) = is.filter(|is| !values.contains(*is)) {
                                problems.push((format!("{at}/guard"), format!("has a transition testing facet '{facet}' for '{is}', which is not one of its values")));
                            }
                        }
                    }
                }
                if let Some(set) = t.pointer("/do/set").and_then(Value::as_object) {
                    for (o, v) in set {
                        if published.contains(o) && !v.is_boolean() {
                            problems.push((format!("{at}/do"), format!("has a transition setting interaction facet '{o}' to a value other than true or false")));
                        }
                    }
                }
                for (path, msg) in problems {
                    out.push(Diagnostic {
                        file: p.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: crate::report::Severity::Warning,
                        message: format!("Behavior pattern '{}' {msg}", p.pattern),
                        instance_path: Some(path),
                        schema_path: None,
                    });
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

    fn pattern_graph(edit: impl FnOnce(&mut serde_json::Value)) -> Vec<String> {
        let mut g = graph(vec![]);
        let mut raw = json!({
            "pattern": "interactive",
            "publishes": ["hovered", "pressed"],
            "transitions": [
                { "on": "press-start", "do": { "set": { "pressed": true } } },
                { "on": "press-end", "guard": { "facet": "pressed", "is": "true" }, "do": { "set": { "pressed": false }, "raise": "press" } }
            ]
        });
        edit(&mut raw);
        g.behavior_patterns[0].raw = raw;
        run(&Rule, &g)
    }

    #[test]
    fn pattern_transitions_are_checked() {
        assert!(pattern_graph(|_| {}).is_empty());
        let cases: Vec<Case> = vec![
            (
                Box::new(|p| p["transitions"][0]["on"] = json!("tap")),
                "not in the intents registry",
            ),
            (
                Box::new(|p| p["transitions"][0]["needs"] = json!(["telepathy"])),
                "capabilities registry",
            ),
            (
                Box::new(|p| p["transitions"][0]["do"] = json!({ "set": { "pressed": "yes" } })),
                "other than true or false",
            ),
            (
                Box::new(|p| p["transitions"][1]["guard"]["facet"] = json!("focusVisible")),
                "neither declares nor publishes",
            ),
            (
                Box::new(|p| p["transitions"][1]["guard"]["is"] = json!("maybe")),
                "not one of its values",
            ),
        ];
        for (edit, why) in cases {
            let m = pattern_graph(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }

    #[test]
    fn a_pattern_may_change_state_the_extending_contract_lists() {
        let toggle = json!({
            "pattern": "toggle",
            "extends": ["interactive"],
            "facets": { "disabled": { "from": "isDisabled", "values": { "false": false, "true": true } } },
            "transitions": [{ "on": "activate", "guard": { "facet": "disabled", "is": "false" }, "do": { "toggle": "isSelected" } }]
        });
        let mut ok = good();
        ok["extends"] = json!(["toggle"]);
        ok["transitions"] = json!([]);
        let mut g = graph(vec![ok.clone()]);
        g.behavior_patterns
            .push(crate::graph::BehaviorPatternRecord {
                pattern: "toggle".into(),
                file: "behaviors/patterns/toggle.json".into(),
                raw: toggle.clone(),
            });
        assert!(run(&Rule, &g).is_empty(), "{:?}", run(&Rule, &g));
        ok["state"] = json!(["isDisabled"]);
        let mut g = graph(vec![ok]);
        g.behavior_patterns
            .push(crate::graph::BehaviorPatternRecord {
                pattern: "toggle".into(),
                file: "behaviors/patterns/toggle.json".into(),
                raw: toggle,
            });
        let m = run(&Rule, &g);
        assert!(
            m.iter().any(|m| m.contains("changes 'isSelected'")),
            "{m:?}"
        );
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
                Box::new(|c| c["parts"]["track"]["handles"] = json!(["navigate-sideways"])),
                "handling 'navigate-sideways'",
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
                Box::new(|c| {
                    c["transitions"][0]["do"] =
                        json!({ "set": { "isSelected": true }, "raise": "press" })
                }),
                "not an event intent",
            ),
            (
                Box::new(|c| {
                    c["transitions"] = json!([{ "on": "press-end", "do": { "raise": "press" } }]);
                    c["parts"]["track"].as_object_mut().unwrap().remove("press");
                }),
                "no part declares `press`",
            ),
            (
                Box::new(|c| c["state"] = json!(["isSelected", "isDisabled", "pressed"])),
                "also an interaction facet",
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
