// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-124: behavior-bindings-well-formed
//!
//! Warning. A platform's key bindings file lists registered capabilities, binds keys only when
//! the platform has the `keyboard` capability, and every `down` or `up` entry names a registered
//! intent.

use serde_json::Value;

use crate::behavior::{flatten, Machine, INTERACTION_EVENTS};
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

/// Whether a flattened contract does something with `intent`: an event intent, a transition on it,
/// or a part that handles it.
fn handles(m: &Machine, intent: &str) -> bool {
    INTERACTION_EVENTS.contains(&intent)
        || m.transitions
            .iter()
            .any(|t| t.get("on").and_then(Value::as_str) == Some(intent))
        || m.parts.values().any(|p| {
            p.get("handles")
                .and_then(Value::as_array)
                .is_some_and(|a| a.iter().any(|i| i.as_str() == Some(intent)))
        })
}

fn names(v: Option<&Value>) -> Vec<&str> {
    match v {
        Some(Value::String(s)) => vec![s.as_str()],
        Some(Value::Array(a)) => a.iter().filter_map(Value::as_str).collect(),
        _ => vec![],
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-124"
    }

    fn name(&self) -> &'static str {
        "behavior-bindings-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for b in &ctx.graph.behavior_bindings {
            let mut problem = |path: String, msg: String| {
                out.push(Diagnostic {
                    file: b.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!("Key bindings of platform '{}' {msg}", b.platform),
                    instance_path: Some(path),
                    schema_path: None,
                });
            };
            let capabilities = names(b.raw.get("capabilities"));
            for c in &capabilities {
                if !ctx.registry.capabilities().contains(*c) {
                    problem(
                        "/capabilities".into(),
                        format!("list capability '{c}', which is not in the capabilities registry"),
                    );
                }
            }
            for (role, r) in b
                .raw
                .get("roles")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                let keyboard = r.get("keyboard").and_then(Value::as_array);
                let contracts: Vec<_> = ctx
                    .graph
                    .behaviors
                    .iter()
                    .filter_map(|c| flatten(&c.raw, &ctx.graph.behavior_patterns).ok())
                    .filter(|m| {
                        m.parts
                            .values()
                            .any(|p| p.get("role").and_then(Value::as_str) == Some(role))
                    })
                    .collect();
                if keyboard.is_some_and(|k| !k.is_empty()) && !capabilities.contains(&"keyboard") {
                    problem(
                        format!("/roles/{role}/keyboard"),
                        format!("bind keys for role '{role}' but the platform has no `keyboard` capability"),
                    );
                }
                for (i, entry) in keyboard.into_iter().flatten().enumerate() {
                    for phase in ["down", "up"] {
                        for intent in names(entry.get(phase)) {
                            if !ctx.registry.intents().contains(intent) {
                                problem(
                                    format!("/roles/{role}/keyboard/{i}/{phase}"),
                                    format!("bind role '{role}' to intent '{intent}', which is not in the intents registry"),
                                );
                            } else if !contracts.is_empty()
                                && !contracts.iter().any(|m| handles(m, intent))
                            {
                                problem(
                                    format!("/roles/{role}/keyboard/{i}/{phase}"),
                                    format!("bind role '{role}' to intent '{intent}', which no contract with that role (or the patterns it extends) handles"),
                                );
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
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use super::Rule;
    use crate::graph::BehaviorBindingsRecord;
    use crate::validate::rules::behavior_util::test_util::{graph, run};

    fn run_bindings(raw: Value) -> Vec<String> {
        let mut g = graph(vec![]);
        g.behavior_bindings.push(BehaviorBindingsRecord {
            platform: "web".into(),
            file: PathBuf::from("behaviors/bindings/web.json"),
            raw,
        });
        run(&Rule, &g)
    }

    fn good() -> Value {
        json!({
            "platform": "web",
            "capabilities": ["keyboard"],
            "roles": { "switch": { "keyboard": [{ "key": "Space", "down": "press-start", "up": "press-end" }] } }
        })
    }

    #[test]
    fn accepts_the_web_bindings_shape() {
        assert!(run_bindings(good()).is_empty());
    }

    #[test]
    fn flags_each_problem() {
        let mut cases: Vec<(Value, &str)> = Vec::new();
        let mut c = good();
        c["capabilities"] = json!(["keyboard", "telepathy"]);
        cases.push((c, "capability 'telepathy'"));
        let mut c = good();
        c["roles"]["switch"]["keyboard"][0]["up"] = json!(["press-end", "tap"]);
        cases.push((c, "intent 'tap'"));
        let mut c = good();
        c["capabilities"] = json!([]);
        cases.push((c, "no `keyboard` capability"));
        for (raw, want) in cases {
            let m = run_bindings(raw);
            assert_eq!(m.len(), 1, "{want}: {m:?}");
            assert!(m[0].contains(want), "{want}: {m:?}");
        }
    }

    #[test]
    fn flags_an_intent_the_role_contract_does_not_handle() {
        let mut g = graph(vec![
            crate::validate::rules::behavior_util::test_util::good(),
        ]);
        let mut c = good();
        g.behavior_bindings.push(BehaviorBindingsRecord {
            platform: "web".into(),
            file: PathBuf::from("behaviors/bindings/web.json"),
            raw: c.clone(),
        });
        assert!(run(&Rule, &g).is_empty());
        // `increment` is registered, but the switch contract neither transitions on it nor handles it.
        c["roles"]["switch"]["keyboard"][0]["down"] = json!("increment");
        g.behavior_bindings[0].raw = c.clone();
        let m = run(&Rule, &g);
        assert!(m.len() == 1 && m[0].contains("handles"), "{m:?}");
        // A role with no contract in the dataset is not checked.
        c["roles"] = json!({ "slider": c["roles"]["switch"].clone() });
        g.behavior_bindings[0].raw = c;
        assert!(run(&Rule, &g).is_empty());
    }
}
