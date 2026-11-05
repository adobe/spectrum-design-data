// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-085: visual-icon-exists
//!
//! Error. The `icon` an icon part references (`set` and `name`) exists in the `icons/`
//! catalog. Runs only when the catalog is loaded (`validate --icons-path`, or the probed
//! `packages/design-data/icons`).

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::error;
use crate::visual::IconRef;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-085"
    }

    fn name(&self) -> &'static str {
        "visual-icon-exists"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let graph = ctx.graph;
        if graph.icons.is_empty() {
            return vec![];
        }
        let mut out = Vec::new();
        for v in &graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (id, part) in parts {
                let Some(icon) = IconRef::of_part(part) else {
                    continue; // Layer 1 requires `icon` on icon parts
                };
                let set = graph.icons.iter().find(|s| s.set == icon.set);
                let found = set
                    .and_then(|s| s.raw.get("icons"))
                    .is_some_and(|icons| icons.get(&icon.name).is_some());
                if found {
                    continue;
                }
                let why = if set.is_none() {
                    format!("no icon set '{}' is loaded", icon.set)
                } else {
                    format!("set '{}' has no icon '{}'", icon.set, icon.name)
                };
                out.push(error(
                    self.id(),
                    v,
                    &format!("/parts/{id}/icon"),
                    format!(
                        "Part '{id}' of '{}' references icon {}:{}, but {why}",
                        v.component, icon.set, icon.name
                    ),
                ));
            }
        }
        out
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use super::Rule;
    use crate::graph::TokenGraph;
    use crate::report::Severity;
    use crate::validate::rules::visual_util::test_util::{graph, run};

    /// A graph with one checkbox recipe whose `mark` part references `icon`, plus the given
    /// icon sets.
    pub(crate) fn with_icons(icon: Value, sets: &[(&str, Value)]) -> TokenGraph {
        let g = graph(
            json!({"name": "checkbox"}),
            vec![],
            vec![],
            vec![(
                "checkbox",
                json!({ "component": "checkbox", "root": "box", "sizeScale": { "m": 100 },
                    "parts": {
                        "box": { "kind": "box", "children": ["mark"] },
                        "mark": { "kind": "icon", "icon": icon } } }),
            )],
        );
        let records = sets
            .iter()
            .map(|(set, icons)| {
                TokenGraph::icon_set_from_str(
                    &json!({ "set": set, "icons": icons }).to_string(),
                    PathBuf::from(format!("icons/{set}.json")),
                )
                .unwrap()
                .unwrap()
            })
            .collect();
        g.with_icons(records)
    }

    fn ui() -> Value {
        json!({ "checkmark": { "sizes": { "100": { "viewBox": "0 0 10 10", "paths": [{ "d": "M0 0" }] } } } })
    }

    #[test]
    fn an_existing_icon_passes() {
        let g = with_icons(json!({ "set": "ui", "name": "checkmark" }), &[("ui", ui())]);
        assert!(run(&Rule, &g).is_empty());
    }

    #[test]
    fn a_missing_icon_or_set_is_an_error() {
        let g = with_icons(json!({ "set": "ui", "name": "tick" }), &[("ui", ui())]);
        let d = run(&Rule, &g);
        assert_eq!(d.len(), 1, "{d:?}");
        assert_eq!(d[0].severity, Severity::Error);
        assert_eq!(d[0].instance_path.as_deref(), Some("/parts/mark/icon"));
        assert!(d[0].message.contains("set 'ui' has no icon 'tick'"));

        let g = with_icons(json!({ "set": "workflow", "name": "add" }), &[("ui", ui())]);
        assert!(run(&Rule, &g)[0]
            .message
            .contains("no icon set 'workflow' is loaded"));
    }

    #[test]
    fn skipped_without_an_icons_catalog() {
        let g = with_icons(json!({ "set": "ui", "name": "tick" }), &[]);
        assert!(run(&Rule, &g).is_empty());
    }
}
