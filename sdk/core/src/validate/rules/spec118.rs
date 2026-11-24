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
    facet_values, option_names, part_names, state_ids, warning,
};

pub struct Rule;

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
                    if let Some(s) = s.as_str().filter(|s| !options.contains(*s)) {
                        problem(
                            "/state",
                            format!("lists '{s}', which is not an option of the component"),
                        );
                    }
                }
            }
            for (name, facet) in b
                .raw
                .get("facets")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
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
                for v in facet_values(b, ctx.registry, name).into_iter().flatten() {
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
                    let Some(values) = facet_values(b, ctx.registry, facet) else {
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
    fn no_behaviors_directory_is_clean() {
        assert!(run(&Rule, &graph(vec![])).is_empty());
    }

    #[test]
    fn flags_each_unresolved_reference() {
        let cases: Vec<Case> = vec![
            (Box::new(|c| c["component"] = json!("nope")), "not declared"),
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
        ];
        for (edit, why) in cases {
            let m = check(edit);
            assert!(m.iter().any(|m| m.contains(why)), "{why}: {m:?}");
        }
    }
}
