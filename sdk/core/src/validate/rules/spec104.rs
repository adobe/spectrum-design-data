// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-104: component-slot-valid
//!
//! A component's `slots` MUST agree with its anatomy, options and the component catalog:
//! the part and the `accepts` entries exist, a `collection` names an array option, counts are
//! ordered, and names are unique. A slot named neither `default` nor after its part is a
//! warning (this replaces SPEC-021's canonical slot vocabulary).

use std::collections::{HashMap, HashSet};

use serde_json::Value;

use crate::graph::ComponentRecord;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn diag(
    id: &str,
    comp: &ComponentRecord,
    severity: Severity,
    path: String,
    message: String,
) -> Diagnostic {
    Diagnostic {
        file: comp.file.clone(),
        token: None,
        rule_id: Some(id.to_string()),
        severity,
        message,
        instance_path: Some(path),
        schema_path: None,
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-104"
    }

    fn name(&self) -> &'static str {
        "component-slot-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let components: HashMap<&str, &ComponentRecord> = ctx
            .graph
            .components
            .iter()
            .map(|c| (c.name.as_str(), c))
            .collect();

        for comp in &ctx.graph.components {
            let Some(slots) = comp.raw.get("slots").and_then(Value::as_array) else {
                continue;
            };
            let name = comp.name.as_str();
            let anatomy: Vec<&Value> = comp
                .raw
                .get("anatomy")
                .and_then(Value::as_array)
                .map(|a| a.iter().collect())
                .unwrap_or_default();
            let parts: HashSet<&str> = anatomy
                .iter()
                .filter_map(|p| p.get("name").and_then(Value::as_str))
                .collect();
            let parent_of = |part: &str| -> Option<&str> {
                anatomy.iter().find_map(|p| {
                    let holds = p
                        .get("contains")
                        .and_then(Value::as_array)?
                        .iter()
                        .any(|c| c.as_str() == Some(part));
                    holds.then(|| p.get("name").and_then(Value::as_str))?
                })
            };

            let mut seen: HashSet<&str> = HashSet::new();
            let mut hosts: HashMap<&str, &str> = HashMap::new();
            for (i, slot) in slots.iter().enumerate() {
                let Some(slot_name) = slot.get("name").and_then(Value::as_str) else {
                    continue;
                };
                let at = |f: &str| format!("/slots/{i}/{f}");
                let mut err = |path: String, message: String| {
                    out.push(diag(self.id(), comp, Severity::Error, path, message));
                };
                if !seen.insert(slot_name) {
                    err(
                        at("name"),
                        format!("Component '{name}' declares slot '{slot_name}' more than once"),
                    );
                }
                let part = slot.get("part").and_then(Value::as_str);
                if let Some(part) = part {
                    if !parts.contains(part) {
                        err(
                            at("part"),
                            format!("Slot '{slot_name}' of '{name}' names part '{part}', which is not a declared anatomy part"),
                        );
                    }
                }
                for (j, c) in slot
                    .get("accepts")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .enumerate()
                {
                    let path = format!("/slots/{i}/accepts/{j}");
                    match components.get(c) {
                        None => err(
                            path,
                            format!("Slot '{slot_name}' of '{name}' accepts '{c}', which is not a declared component"),
                        ),
                        Some(_) if c == name => err(
                            path,
                            format!("Slot '{slot_name}' of '{name}' accepts the component itself"),
                        ),
                        Some(t)
                            if t.raw
                                .pointer("/lifecycle/deprecatedIn")
                                .and_then(Value::as_str)
                                .is_some() =>
                        {
                            err(
                                path,
                                format!("Slot '{slot_name}' of '{name}' accepts '{c}', which is deprecated"),
                            )
                        }
                        Some(_) => {}
                    }
                }
                if let Some(opt) = slot.get("collection").and_then(Value::as_str) {
                    let ty = comp
                        .raw
                        .pointer(&format!("/options/{opt}/type"))
                        .and_then(Value::as_str);
                    if ty != Some("array") {
                        err(
                            at("collection"),
                            format!("Slot '{slot_name}' of '{name}' names collection '{opt}', which is not a declared array option"),
                        );
                    }
                    match part.filter(|p| parts.contains(p)) {
                        Some(p) => match parent_of(p) {
                            None => err(
                                at("part"),
                                format!("Collection slot '{slot_name}' of '{name}': part '{p}' has no anatomy parent (no part lists it in 'contains')"),
                            ),
                            Some(host) => {
                                if let Some(first) = hosts.insert(host, slot_name) {
                                    err(
                                        at("part"),
                                        format!("Part '{host}' of '{name}' hosts two collection slots ('{first}' and '{slot_name}'); a part hosts at most one"),
                                    );
                                }
                            }
                        },
                        None if part.is_none() => err(
                            at("part"),
                            format!("Collection slot '{slot_name}' of '{name}' needs a 'part', the part that repeats"),
                        ),
                        None => {}
                    }
                }
                let min = slot.get("min").and_then(Value::as_u64);
                let max = slot.get("max").and_then(Value::as_u64);
                if max == Some(0) || min.zip(max).is_some_and(|(lo, hi)| lo > hi) {
                    err(
                        at("max"),
                        format!("Slot '{slot_name}' of '{name}' needs min <= max and max >= 1"),
                    );
                }
                if slot.get("acceptsOnly").and_then(Value::as_bool) == Some(true)
                    && slot.get("accepts").and_then(Value::as_array).is_none()
                {
                    err(
                        at("acceptsOnly"),
                        format!(
                            "Slot '{slot_name}' of '{name}' sets acceptsOnly without 'accepts'"
                        ),
                    );
                }
                if let Some(demo) = slot.get("demo").and_then(Value::as_array) {
                    let count = demo.len() as u64;
                    let unit = if slot.get("collection").is_some() {
                        "entries"
                    } else {
                        "fills"
                    };
                    if part.is_none() {
                        err(
                            at("demo"),
                            format!("Slot '{slot_name}' of '{name}' has a demo but is not a slot with a part"),
                        );
                    }
                    if min.is_some_and(|lo| count < lo) || max.is_some_and(|hi| count > hi) {
                        err(
                            at("demo"),
                            format!("Demo of slot '{slot_name}' of '{name}' has {count} {unit}, outside its min and max"),
                        );
                    }
                }
                if let (Some(demo), Some(opt)) = (
                    slot.get("demo").and_then(Value::as_array),
                    slot.get("collection").and_then(Value::as_str),
                ) {
                    let item_props = comp
                        .raw
                        .pointer(&format!("/options/{opt}/items/properties"))
                        .and_then(Value::as_object);
                    for (j, entry) in demo.iter().enumerate() {
                        let Some(fields) = entry.as_object() else {
                            err(
                                format!("/slots/{i}/demo/{j}"),
                                format!("Demo entry {j} of slot '{slot_name}' of '{name}' is not an object"),
                            );
                            continue;
                        };
                        let Some(props) = item_props else { continue };
                        for (key, value) in fields {
                            let path = format!("/slots/{i}/demo/{j}/{key}");
                            let Some(def) = props.get(key) else {
                                err(
                                    path,
                                    format!("Demo of slot '{slot_name}' of '{name}' sets '{key}', which items of '{opt}' do not declare"),
                                );
                                continue;
                            };
                            let fits = match def.get("type").and_then(Value::as_str) {
                                Some("string") => value.is_string(),
                                Some("boolean") => value.is_boolean(),
                                Some("number") => value.is_number(),
                                Some("integer") => value.is_i64() || value.is_u64(),
                                _ => true,
                            };
                            if !fits {
                                err(
                                    path,
                                    format!("Demo of slot '{slot_name}' of '{name}' sets '{key}' to a value that is not its declared type"),
                                );
                            }
                        }
                    }
                }
                if let Some(demo) = slot
                    .get("demo")
                    .and_then(Value::as_array)
                    .filter(|_| slot.get("collection").is_none())
                {
                    let accepts: Vec<&str> = slot
                        .get("accepts")
                        .and_then(Value::as_array)
                        .map(|a| a.iter().filter_map(Value::as_str).collect())
                        .unwrap_or_default();
                    for (j, fill) in demo.iter().enumerate() {
                        let Some(c) = fill.get("component").and_then(Value::as_str) else {
                            continue;
                        };
                        if !accepts.contains(&c) {
                            err(
                                format!("/slots/{i}/demo/{j}/component"),
                                format!("Demo of slot '{slot_name}' of '{name}' fills it with '{c}', which the slot does not accept"),
                            );
                            continue;
                        }
                        let Some(target) = components.get(c) else {
                            continue;
                        };
                        for (key, value) in fill
                            .get("options")
                            .and_then(Value::as_object)
                            .into_iter()
                            .flatten()
                        {
                            if key == "label" {
                                continue;
                            }
                            let path = format!("/slots/{i}/demo/{j}/options/{key}");
                            match target.raw.pointer(&format!("/options/{key}")) {
                                None => err(
                                    path,
                                    format!("Demo of slot '{slot_name}' of '{name}' sets option '{key}', which '{c}' does not declare"),
                                ),
                                Some(def) => {
                                    let listed = def.get("values").and_then(Value::as_array);
                                    if listed.is_some_and(|vs| {
                                        !vs.iter().any(|v| v.get("value") == Some(value))
                                    }) {
                                        err(
                                            path,
                                            format!("Demo of slot '{slot_name}' of '{name}' sets option '{key}' of '{c}' to a value it does not list"),
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
                if slot_name != "default" && part != Some(slot_name) {
                    out.push(diag(
                        self.id(),
                        comp,
                        Severity::Warning,
                        at("name"),
                        format!("Slot '{slot_name}' of '{name}' is named neither 'default' nor after its part; rename it"),
                    ));
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::{Diagnostic, Severity};
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec104::Rule;

    fn run(comps: Vec<Value>) -> Vec<Diagnostic> {
        let mut g = TokenGraph::default();
        for raw in comps {
            g.components.push(ComponentRecord {
                name: raw["name"].as_str().unwrap().to_string(),
                file: PathBuf::from("dataset.json"),
                raw,
                layer: Layer::Foundation,
            });
        }
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn list() -> Value {
        json!({
            "name": "list",
            "options": {"items": {"type": "array"}, "size": {"type": "string"}},
            "anatomy": [
                {"name": "container", "contains": ["row", "footer"]},
                {"name": "row"}, {"name": "footer"}, {"name": "actions"}
            ],
            "slots": []
        })
    }

    fn one(slot: Value) -> Vec<Diagnostic> {
        let mut c = list();
        c["slots"] = json!([slot]);
        let chip = json!({"name": "chip"});
        run(vec![c, chip])
    }

    fn msgs(d: &[Diagnostic]) -> String {
        d.iter()
            .map(|d| d.message.clone())
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn a_valid_slot_set_is_clean() {
        let mut c = list();
        c["slots"] = json!([
            {"name": "default", "part": "row", "collection": "items"},
            {"name": "actions", "part": "actions", "accepts": ["chip"], "acceptsOnly": true, "min": 0, "max": 2},
            {"name": "footer", "part": "footer"}
        ]);
        assert!(run(vec![c, json!({"name": "chip"})]).is_empty());
    }

    #[test]
    fn part_and_accepts_must_exist() {
        let d = one(json!({"name": "default", "part": "nope", "accepts": ["ghost", "list"]}));
        assert_eq!(d.len(), 3, "{}", msgs(&d));
        assert!(d.iter().all(|d| d.severity == Severity::Error));
    }

    #[test]
    fn a_deprecated_component_is_not_accepted() {
        let mut c = list();
        c["slots"] = json!([{"name": "default", "accepts": ["old"]}]);
        let old = json!({"name": "old", "lifecycle": {"deprecatedIn": "2.0.0"}});
        assert_eq!(run(vec![c, old]).len(), 1);
    }

    #[test]
    fn collection_must_be_a_declared_array_with_a_parented_part() {
        let d = one(json!({"name": "default", "part": "row", "collection": "size"}));
        assert!(msgs(&d).contains("not a declared array option"));
        let d = one(json!({"name": "default", "part": "container", "collection": "items"}));
        assert!(msgs(&d).contains("no anatomy parent"));
        let d = one(json!({"name": "default", "collection": "items"}));
        assert!(msgs(&d).contains("needs a 'part'"));
    }

    #[test]
    fn a_part_hosts_one_collection_slot() {
        let mut c = list();
        c["slots"] = json!([
            {"name": "default", "part": "row", "collection": "items"},
            {"name": "footer", "part": "footer", "collection": "items"}
        ]);
        let d = run(vec![c]);
        assert_eq!(d.len(), 1, "{}", msgs(&d));
        assert!(d[0].message.contains("hosts two collection slots"));
    }

    #[test]
    fn counts_and_accepts_only_are_checked() {
        assert_eq!(one(json!({"name": "default", "min": 3, "max": 2})).len(), 1);
        assert_eq!(one(json!({"name": "default", "max": 0})).len(), 1);
        assert_eq!(
            one(json!({"name": "default", "acceptsOnly": true})).len(),
            1
        );
        assert!(one(json!({"name": "default", "min": 1})).is_empty());
    }

    #[test]
    fn one_array_option_may_feed_collection_slots_on_different_parents() {
        let c = json!({
            "name": "table",
            "options": {"rows": {"type": "array"}, "columns": {"type": "array"}},
            "anatomy": [
                {"name": "container", "contains": ["row", "column-header-row"]},
                {"name": "column-header-row", "contains": ["column-header"]},
                {"name": "row", "contains": ["cell"]},
                {"name": "column-header"}, {"name": "cell"}
            ],
            "slots": [
                {"name": "row", "part": "row", "collection": "rows"},
                {"name": "column-header", "part": "column-header", "collection": "columns"},
                {"name": "cell", "part": "cell", "collection": "columns"}
            ]
        });
        let d = run(vec![c]);
        assert!(d.is_empty(), "{}", msgs(&d));
    }

    #[test]
    fn a_demo_names_accepted_components_within_min_and_max_with_declared_options() {
        let chip = json!({"name": "chip", "options": {
            "tone": {"type": "string", "values": [{"value": "calm"}, {"value": "loud"}]},
            "isSelected": {"type": "boolean"}
        }});
        let with_demo = |demo: Value| {
            let mut c = list();
            c["slots"] = json!([{
                "name": "actions", "part": "actions", "accepts": ["chip"],
                "min": 1, "max": 2, "demo": demo
            }]);
            run(vec![c, chip.clone()])
        };
        let ok = json!([
            {"component": "chip", "options": {"tone": "calm", "label": "Label"}},
            {"component": "chip", "options": {"isSelected": true}}
        ]);
        assert!(with_demo(ok).is_empty());
        let d = with_demo(json!([{"component": "list"}]));
        assert!(msgs(&d).contains("does not accept"), "{}", msgs(&d));
        let d = with_demo(json!([{"component": "chip", "options": {"nope": 1}}]));
        assert!(msgs(&d).contains("does not declare"), "{}", msgs(&d));
        let d = with_demo(json!([{"component": "chip", "options": {"tone": "bold"}}]));
        assert!(msgs(&d).contains("does not list"), "{}", msgs(&d));
        let three = json!([{"component": "chip"}, {"component": "chip"}, {"component": "chip"}]);
        assert!(msgs(&with_demo(three)).contains("outside its min and max"));
        let mut c = list();
        c["slots"] = json!([{"name": "footer", "demo": [{"component": "chip"}]}]);
        assert!(msgs(&run(vec![c, chip.clone()])).contains("not a slot with a part"));
    }

    #[test]
    fn a_collection_demo_is_item_objects_of_the_options_fields() {
        let with_demo = |demo: Value| {
            let mut c = list();
            c["options"]["items"] = json!({"type": "array", "items": {"type": "object", "properties": {
                "label": {"type": "string"}, "isLiteral": {"type": "boolean"}, "count": {"type": "integer"}
            }}});
            c["slots"] = json!([{
                "name": "default", "part": "row", "collection": "items", "min": 1, "max": 3, "demo": demo
            }]);
            run(vec![c])
        };
        let ok = json!([{"label": "11"}, {"label": "/", "isLiteral": true}]);
        assert!(with_demo(ok).is_empty());
        let d = with_demo(json!([{"nope": 1}]));
        assert!(
            msgs(&d).contains("which items of 'items' do not declare"),
            "{}",
            msgs(&d)
        );
        let d = with_demo(json!([{"isLiteral": "yes"}]));
        assert!(msgs(&d).contains("not its declared type"), "{}", msgs(&d));
        let d = with_demo(json!(["text"]));
        assert!(msgs(&d).contains("is not an object"), "{}", msgs(&d));
        let d = with_demo(json!([{"count": 2}]));
        assert!(d.is_empty(), "{}", msgs(&d));
        let d = with_demo(json!([{"count": 2.5}]));
        assert!(msgs(&d).contains("not its declared type"), "{}", msgs(&d));
        let four = json!([{}, {}, {}, {}]);
        assert!(msgs(&with_demo(four)).contains("outside its min and max"));
    }

    #[test]
    fn names_are_unique() {
        let mut c = list();
        c["slots"] = json!([{"name": "default"}, {"name": "default"}]);
        assert_eq!(run(vec![c]).len(), 1);
    }

    #[test]
    fn a_name_that_is_not_default_or_the_part_warns() {
        let d = one(json!({"name": "badge", "part": "row"}));
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Warning);
        assert!(one(json!({"name": "row", "part": "row"})).is_empty());
        assert_eq!(one(json!({"name": "badge"})).len(), 1);
    }
}
