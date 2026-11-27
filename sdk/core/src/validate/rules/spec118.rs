// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-118: behavior-references-resolve
//!
//! Warning. A behavior contract names things the rest of the dataset declares: its component
//! and the `state` options exist, each facet derives from a `state` option and is a registered
//! facet whose values are registry values, and each `parts` and `semantics` key is an anatomy
//! part. Skipped for a component that is not loaded.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::behavior_util::{
    extends_of, facet_values, option_names, part_names, state_ids, warning,
};

pub struct Rule;

/// The slot of the component a `collection` names, then its item and the facets its `choose` and
/// `selectOnMove` read.
fn check_collection(
    ctx: &ValidationContext<'_>,
    b: &crate::graph::BehaviorRecord,
    col: &Value,
    problem: &mut dyn FnMut(&str, String),
) {
    let component = ctx.graph.components.iter().find(|c| c.name == b.component);
    let slot = col.get("slot").and_then(Value::as_str).unwrap_or_default();
    let decl = component.and_then(|c| {
        c.raw
            .get("slots")
            .and_then(Value::as_array)?
            .iter()
            .find(|s| s.get("name").and_then(Value::as_str) == Some(slot))
    });
    if component.is_some() && decl.is_none() {
        problem(
            "/collection/slot",
            format!("names slot '{slot}' in `collection`, which the component does not declare"),
        );
    }
    match col.get("item") {
        Some(Value::String(item)) => {
            if !ctx.graph.behaviors.iter().any(|c| &c.component == item) {
                problem(
                    "/collection/item",
                    format!("names item '{item}' in `collection`, which has no behavior contract"),
                );
            }
            let accepted = decl
                .and_then(|d| d.get("accepts").and_then(Value::as_array))
                .is_some_and(|a| a.iter().any(|x| x.as_str() == Some(item)));
            if decl.is_some_and(|d| d.get("accepts").is_some()) && !accepted {
                problem(
                    "/collection/item",
                    format!(
                        "names item '{item}' in `collection`, which slot '{slot}' does not accept"
                    ),
                );
            }
        }
        Some(Value::Object(_)) => {
            if decl.is_some_and(|d| d.get("collection").is_none()) {
                problem(
                    "/collection/item",
                    format!("has an inline item in `collection`, but slot '{slot}' is not a `collection` slot"),
                );
            }
        }
        _ => {}
    }
    for (path, values) in [
        (
            "/collection/choose/mode",
            &["none", "single", "multiple"][..],
        ),
        ("/collection/choose/allowsEmpty", &["true", "false"][..]),
        ("/collection/traversal/selectOnMove", &["true", "false"][..]),
    ] {
        let Some(facet) = col
            .pointer(&path["/collection".len()..])
            .and_then(|v| v.get("facet"))
            .and_then(Value::as_str)
        else {
            continue;
        };
        match facet_values(ctx.graph, b, ctx.registry, facet) {
            None => problem(
                path,
                format!(
                    "reads facet '{facet}' in `collection`, which the contract does not declare"
                ),
            ),
            Some(have) => {
                for v in have.iter().filter(|v| !values.contains(&v.as_str())) {
                    problem(
                        path,
                        format!("reads facet '{facet}' in `collection`, whose value '{v}' is not one of {values:?}"),
                    );
                }
            }
        }
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-118"
    }

    fn name(&self) -> &'static str {
        "behavior-references-resolve"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for b in &ctx.graph.behaviors {
            let mut problem = |path: &str, msg: String| {
                out.push(warning(
                    self.id(),
                    b,
                    path,
                    format!("Behavior contract of '{}' {msg}", b.component),
                ));
            };
            for name in extends_of(&b.raw) {
                if !ctx
                    .graph
                    .behavior_patterns
                    .iter()
                    .any(|p| p.pattern == name)
                {
                    problem(
                        "/extends",
                        format!("extends '{name}', which is not a pattern in behaviors/patterns/"),
                    );
                }
            }
            if !ctx.graph.components.is_empty()
                && !ctx.graph.components.iter().any(|c| c.name == b.component)
            {
                problem(
                    "/component",
                    "names a component that is not declared".into(),
                );
                continue;
            }
            let options = option_names(ctx.graph, b);
            let state = state_ids(b);
            if let Some(options) = &options {
                for s in b
                    .raw
                    .get("state")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    if let Some(s) = s.as_str().filter(|s| {
                        !options.contains(*s) && ctx.registry.environment_property(s).is_none()
                    }) {
                        problem(
                            "/state",
                            format!("lists '{s}', which is not an option of the component or a registered environment property"),
                        );
                    }
                }
            }
            if let Some(col) = b.raw.get("collection") {
                check_collection(ctx, b, col, &mut problem);
            }
            let own = crate::behavior::flatten(&b.raw, &ctx.graph.behavior_patterns).ok();
            for (name, facet) in own.iter().flat_map(|m| m.facets.iter()) {
                let path = format!("/facets/{name}");
                let Some(registered) = ctx.registry.facet(name) else {
                    problem(
                        &path,
                        format!("declares facet '{name}', which is not in the facets registry"),
                    );
                    continue;
                };
                let sources = match facet.get("from") {
                    Some(Value::String(s)) => vec![s.as_str()],
                    Some(Value::Array(a)) => a.iter().filter_map(Value::as_str).collect(),
                    _ => vec![],
                };
                for s in sources.iter().filter(|s| !state.contains(**s)) {
                    problem(
                        &path,
                        format!("derives facet '{name}' from '{s}', which is not in `state`"),
                    );
                }
                let values = facet.get("values").and_then(Value::as_object);
                if let Some(o) = facet.get("otherwise").and_then(Value::as_str) {
                    if values.is_some_and(|v| v.contains_key(o)) {
                        problem(
                            &path,
                            format!("gives facet '{name}' `otherwise` '{o}', which `values` already lists"),
                        );
                    }
                }
                if sources.len() > 1 && values.is_some_and(|v| v.values().any(Value::is_array)) {
                    problem(
                        &path,
                        format!("gives facet '{name}' an any-of list, which needs a single source option"),
                    );
                }
                for v in facet_values(ctx.graph, b, ctx.registry, name)
                    .into_iter()
                    .flatten()
                {
                    if !registered.values.contains(&v) {
                        problem(&path, format!("gives facet '{name}' the value '{v}', which the facets registry does not list"));
                    }
                }
            }
            if let Some(parts) = part_names(ctx.graph, b) {
                for key in ["parts", "semantics"] {
                    for part in b
                        .raw
                        .get(key)
                        .and_then(Value::as_object)
                        .into_iter()
                        .flat_map(|o| o.keys())
                    {
                        if !parts.contains(part) {
                            problem(
                                &format!("/{key}/{part}"),
                                format!(
                                    "names part '{part}' in `{key}`, which is not an anatomy part"
                                ),
                            );
                        }
                    }
                }
            }
            for (part, facets) in b
                .raw
                .get("semantics")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                for (facet, sem) in facets.as_object().into_iter().flatten() {
                    let path = format!("/semantics/{part}/{facet}");
                    if sem.get("copy") == Some(&Value::Bool(true)) {
                        let absent = sem
                            .get("absentWhen")
                            .and_then(Value::as_object)
                            .into_iter()
                            .flat_map(|w| w.keys());
                        for o in std::iter::once(facet).chain(absent) {
                            if !state.contains(o) {
                                problem(
                                    &path,
                                    format!("copies '{o}' into an attribute, but `state` does not list it"),
                                );
                            }
                        }
                        continue;
                    }
                    let Some(values) = facet_values(ctx.graph, b, ctx.registry, facet) else {
                        problem(
                            &path,
                            format!("exposes facet '{facet}', which the contract does not declare"),
                        );
                        continue;
                    };
                    for v in sem
                        .get("map")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flat_map(|m| m.keys())
                    {
                        if !values.contains(v) {
                            problem(
                                &path,
                                format!("maps '{v}', which is not a value of facet '{facet}'"),
                            );
                        }
                    }
                }
            }
        }
        for p in &ctx.graph.behavior_patterns {
            let mut problem = |path: &str, msg: String| {
                out.push(Diagnostic {
                    file: p.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: crate::report::Severity::Warning,
                    message: format!("Behavior pattern '{}' {msg}", p.pattern),
                    instance_path: Some(path.to_string()),
                    schema_path: None,
                });
            };
            for name in extends_of(&p.raw) {
                if !ctx
                    .graph
                    .behavior_patterns
                    .iter()
                    .any(|q| q.pattern == name)
                {
                    problem(
                        "/extends",
                        format!("extends '{name}', which is not a pattern in behaviors/patterns/"),
                    );
                }
            }
            for f in p
                .raw
                .get("publishes")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
            {
                if !ctx.registry.facet(f).is_some_and(|e| e.interaction) {
                    problem(
                        "/publishes",
                        format!("publishes '{f}', which is not an interaction facet in the facets registry"),
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
    fn a_resolving_contract_is_clean() {
        assert!(check(|_| {}).is_empty());
    }

    #[test]
    fn flags_a_pattern_that_extends_or_publishes_wrongly() {
        let mut g = graph(vec![]);
        g.behavior_patterns
            .push(crate::graph::BehaviorPatternRecord {
                pattern: "p".into(),
                file: "behaviors/patterns/p.json".into(),
                raw: json!({ "pattern": "p", "extends": ["ghost"], "publishes": ["checked"] }),
            });
        let m = run(&Rule, &g);
        assert!(m.iter().any(|m| m.contains("not a pattern")), "{m:?}");
        assert!(
            m.iter().any(|m| m.contains("not an interaction facet")),
            "{m:?}"
        );
    }

    #[test]
    fn no_behaviors_directory_is_clean() {
        assert!(run(&Rule, &graph(vec![])).is_empty());
    }

    #[test]
    fn flags_each_unresolved_reference() {
        let cases: Vec<Case> = vec![
            (Box::new(|c| c["component"] = json!("nope")), "not declared"),
            (
                Box::new(|c| c["extends"] = json!(["interactive", "ghost"])),
                "not a pattern",
            ),
            (
                Box::new(|c| c["state"] = json!(["isSelected", "isGhost"])),
                "not an option",
            ),
            (
                Box::new(|c| c["facets"]["checked"]["from"] = json!("isOther")),
                "not in `state`",
            ),
            (
                Box::new(|c| {
                    c["facets"]["glow"] = json!({ "from": "isSelected", "values": { "on": true } })
                }),
                "not in the facets registry",
            ),
            (
                Box::new(|c| c["facets"]["checked"]["values"]["maybe"] = json!(true)),
                "does not list",
            ),
            (
                Box::new(|c| c["facets"]["checked"]["otherwise"] = json!("checked")),
                "`otherwise` 'checked'",
            ),
            (
                Box::new(|c| c["facets"]["checked"]["otherwise"] = json!("maybe")),
                "does not list",
            ),
            (
                Box::new(|c| {
                    c["facets"]["checked"]["from"] = json!(["isSelected", "isIndeterminate"]);
                    c["facets"]["checked"]["values"]["unchecked"] = json!([false, ""]);
                }),
                "single source",
            ),
            (
                Box::new(|c| c["parts"]["ghost"] = json!({ "role": "switch" })),
                "not an anatomy part",
            ),
            (
                Box::new(|c| c["semantics"]["ghost"] = json!({})),
                "not an anatomy part",
            ),
            (
                Box::new(|c| {
                    c["semantics"]["track"]["readOnly"] =
                        json!({ "ariaState": "aria-readonly", "map": {} })
                }),
                "does not declare",
            ),
            (
                Box::new(|c| c["semantics"]["track"]["checked"]["map"]["maybe"] = json!("x")),
                "not a value of facet",
            ),
            (
                Box::new(|c| {
                    c["semantics"]["track"]["isGhost"] =
                        json!({ "ariaState": "aria-valuenow", "copy": true })
                }),
                "`state` does not list",
            ),
            (
                Box::new(
                    |c| c["semantics"]["track"]["isSelected"] = json!({ "ariaState": "aria-valuenow", "copy": true, "absentWhen": { "isGhost": true } }),
                ),
                "'isGhost'",
            ),
        ];
        for (edit, why) in cases {
            let m = check(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }

    #[test]
    fn flags_an_unresolved_collection() {
        let cases: Vec<Case> = vec![
            (
                Box::new(|c| c["collection"] = json!({ "slot": "default", "item": "ghost" })),
                "has no behavior contract",
            ),
            (
                Box::new(|c| c["collection"] = json!({ "slot": "default", "item": "switch" })),
                "does not declare",
            ),
            (
                Box::new(|c| {
                    c["collection"] = json!({ "slot": "default", "item": "switch",
                        "choose": { "mode": { "facet": "ghost" } } })
                }),
                "does not declare",
            ),
            (
                Box::new(|c| {
                    c["collection"] = json!({ "slot": "default", "item": "switch",
                        "choose": { "mode": { "facet": "disabled" } } })
                }),
                "is not one of",
            ),
        ];
        for (edit, why) in cases {
            let m = check(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }
}
