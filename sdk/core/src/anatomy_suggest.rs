// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Anatomy candidate suggestions.
//!
//! Proposes candidate anatomy parts for a component from the data already in the
//! dataset: relationship `scope.part` and `context` text, token `name.anatomy`
//! values, and the component's options. The output is a starting point for a
//! person, never reviewed anatomy: nothing is written, every result is `draft`,
//! and each candidate carries the evidence it came from and the checklist items
//! it fails (see `spec/anatomy-format.md#review-checklist`). Parts are not copied
//! from any one platform; a candidate is only as general as the names the dataset
//! already uses.

use std::collections::{BTreeMap, BTreeSet};

use serde::Serialize;
use serde_json::Value;

use crate::graph::TokenGraph;
use crate::registry::RegistryData;

/// A proposed anatomy part with the evidence for it and what a reviewer must check.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Candidate {
    pub name: String,
    /// The name is a term in the anatomy registry.
    pub registry: bool,
    pub evidence: Vec<String>,
    /// Checklist items this candidate does not yet satisfy.
    pub flags: Vec<String>,
    /// Declared component states the part should list in `states`, when state-only.
    pub states: Vec<String>,
}

/// A phrase the generator saw and did not propose, with the reason.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Excluded {
    pub phrase: String,
    pub reason: String,
}

/// Candidates for one component. Always a draft.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Suggestion {
    pub component: String,
    /// `none` when the component declares no anatomy, else the review status.
    pub current: String,
    pub candidates: Vec<Candidate>,
    pub excluded: Vec<Excluded>,
}

const PLATFORM_WORDS: &[&str] = &[
    "wrapper", "slot", "host", "root", "view", "pseudo", "layer", "helper",
];
/// Words that make a phrase a measurement or a condition, not a part.
const PROPERTY_WORDS: &[&str] = &[
    "size", "width", "height", "min", "max", "minimum", "maximum", "disabled",
];
/// Words that join several things or name a variant of one, so the phrase is not one part.
const COMPOUND_WORDS: &[&str] = &[
    "and",
    "or",
    "between",
    "small",
    "medium",
    "large",
    "extra",
    "horizontal",
    "vertical",
    "multiline",
    "compact",
    "radius",
    "rounding",
];
const LAYOUT_WORDS: &[&str] = &["gap", "spacer", "spacing", "padding", "margin", "stack"];
/// Context heads that style the component as a whole (the container) rather than name a part.
const WHOLE_HEADS: &[&str] = &[
    "background",
    "background and border",
    "border",
    "rounding",
    "corner radius",
    "fill",
    "opacity",
];
/// Context heads that name a property or a condition, not a part.
const PROPERTY_HEADS: &[&str] = &[
    "disabled",
    "height",
    "width",
    "size",
    "default",
    "minimum width",
    "maximum width",
    "minimum height",
    "maximum height",
    "width (minimum)",
    "width (default)",
    "height (minimum)",
];

fn kebab(s: &str) -> String {
    let mut out = String::new();
    for c in s.trim().to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.ends_with('-') && !out.is_empty() {
            out.push('-');
        }
    }
    out.trim_end_matches('-').to_string()
}

fn head(context: &str) -> String {
    context
        .split(" (")
        .next()
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

/// Names a spacing context points at: `Spacing (top/bottom edge to alert icon)` gives
/// `alert icon`. Edges are the container, not a part, so they are dropped.
fn spacing_endpoints(context: &str) -> Vec<String> {
    let Some(inner) = context
        .split_once(" (")
        .map(|(_, r)| r.trim_end_matches(')'))
    else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for side in inner.split(" to ") {
        let side = side.split(':').next().unwrap_or("").trim().to_lowercase();
        for piece in side.split('/') {
            let words: Vec<&str> = piece.split_whitespace().collect();
            // "top edge", "start/end edges": the edge is the container, not a part.
            if words.iter().any(|w| w.starts_with("edge")) {
                continue;
            }
            let name = words.join(" ");
            if !name.is_empty() && !["top", "bottom", "start", "end"].contains(&name.as_str()) {
                out.push(name);
            }
        }
    }
    out
}

#[derive(Default)]
struct Seen {
    evidence: BTreeSet<String>,
    spacing_only: bool,
}

fn add(seen: &mut BTreeMap<String, Seen>, name: &str, evidence: String, spacing: bool) {
    let e = seen.entry(name.to_string()).or_insert_with(|| Seen {
        evidence: BTreeSet::new(),
        spacing_only: true,
    });
    e.evidence.insert(evidence);
    if !spacing {
        e.spacing_only = false;
    }
}

/// Suggest candidate parts for one component. `None` when the component is unknown.
pub fn suggest_component(graph: &TokenGraph, component: &str) -> Option<Suggestion> {
    let comp = graph.components.iter().find(|c| c.name == component)?;
    let registry = RegistryData::embedded().for_field("anatomy");
    let in_registry = |n: &str| registry.is_some_and(|r| r.contains(n));

    let mut seen: BTreeMap<String, Seen> = BTreeMap::new();
    let mut excluded: Vec<Excluded> = Vec::new();
    let mut whole = false;

    for rel in &graph.relationships {
        let Some(scope) = rel.raw.get("scope") else {
            continue;
        };
        if scope.get("component").and_then(Value::as_str) != Some(component) {
            continue;
        }
        if let Some(part) = scope.get("part").and_then(Value::as_str) {
            add(
                &mut seen,
                part,
                format!("relationship part '{part}'"),
                false,
            );
        }
        let Some(context) = rel.raw.get("context").and_then(Value::as_str) else {
            whole = true;
            continue;
        };
        let h = head(context);
        if h == "spacing" {
            for p in spacing_endpoints(context) {
                add(&mut seen, &kebab(&p), format!("context '{context}'"), true);
            }
        } else if WHOLE_HEADS.contains(&h.as_str()) || h.is_empty() {
            whole = true;
        } else if PROPERTY_HEADS.contains(&h.as_str()) || h.starts_with("width") {
            excluded.push(Excluded {
                phrase: context.to_string(),
                reason: "names a property or condition, not a part".into(),
            });
        } else if h == "focus ring" || h == "focus indicator" || h == "focus" {
            add(
                &mut seen,
                "focus-indicator",
                format!("context '{context}'"),
                false,
            );
        } else {
            add(&mut seen, &kebab(&h), format!("context '{context}'"), false);
        }
    }

    for t in graph.tokens.values() {
        let Some(name) = t.raw.get("name") else {
            continue;
        };
        if name.get("component").and_then(Value::as_str) == Some(component) {
            if let Some(a) = name.get("anatomy").and_then(Value::as_str) {
                add(&mut seen, a, format!("token anatomy '{a}'"), false);
            }
        }
    }

    if let Some(opts) = comp.raw.get("options").and_then(Value::as_object) {
        for o in ["icon", "label"] {
            if opts.contains_key(o) {
                add(&mut seen, o, format!("option '{o}'"), false);
            }
        }
    }
    if whole || seen.is_empty() {
        add(
            &mut seen,
            "container",
            "background, border or size contexts style the component as a whole".into(),
            false,
        );
    }

    let focus_states: Vec<String> = comp
        .raw
        .get("states")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|s| s.get("name").and_then(Value::as_str))
                .filter(|n| *n == "focus" || *n == "keyboard-focus")
                .map(String::from)
                .collect()
        })
        .unwrap_or_default();

    let mut candidates = Vec::new();
    for (name, s) in seen {
        let words: Vec<&str> = name.split('-').collect();
        if let Some(w) = words
            .iter()
            .find(|w| PLATFORM_WORDS.contains(w) || LAYOUT_WORDS.contains(w))
        {
            excluded.push(Excluded {
                phrase: name.clone(),
                reason: if PLATFORM_WORDS.contains(w) {
                    format!("'{w}' is a platform word; not anatomy")
                } else {
                    format!("'{w}' is a layout helper; not anatomy")
                },
            });
            continue;
        }
        if name.chars().next().is_some_and(|c| c.is_ascii_digit()) || name.len() < 3 {
            excluded.push(Excluded {
                phrase: name,
                reason: "too short or numeric to be a part name".into(),
            });
            continue;
        }
        if let Some(w) = words.iter().find(|w| PROPERTY_WORDS.contains(w)) {
            excluded.push(Excluded {
                phrase: name.clone(),
                reason: format!("'{w}' makes this a measurement or condition, not a part"),
            });
            continue;
        }
        if let Some(w) = words
            .last()
            .filter(|w| ["color", "colors", "state", "variant", "style"].contains(w))
        {
            excluded.push(Excluded {
                phrase: name.clone(),
                reason: format!("ends in '{w}', which names a property or variant, not a part"),
            });
            continue;
        }
        if let Some(w) = words.iter().find(|w| COMPOUND_WORDS.contains(w)) {
            excluded.push(Excluded {
                phrase: name.clone(),
                reason: format!("'{w}' joins several things or names a variant, not one part"),
            });
            continue;
        }
        let registry_hit = in_registry(&name);
        let mut flags = Vec::new();
        if !registry_hit {
            let last = words.last().copied().unwrap_or("");
            if words.len() > 1 && in_registry(last) {
                flags.push(format!(
                    "custom name; nearest registry term '{last}' (naming rules)"
                ));
            } else {
                flags.push("custom name; give it a description or use a registry term".into());
            }
        }
        if name
            .split('-')
            .any(|w| component.split('-').any(|c| c == w))
            && name != "container"
            && words.len() > 1
        {
            flags.push("repeats the component name; drop it (naming rules)".into());
        }
        if name.len() > 3 && name.ends_with('s') && !name.ends_with("ss") {
            flags.push("looks plural; part names are singular".into());
        }
        if s.spacing_only {
            flags.push(
                "seen only in spacing contexts; confirm it is visible and styled on its own (checklist 1, 2)"
                    .into(),
            );
        }
        if name == "text" {
            flags.push("may duplicate `label`, `title` or `value`; name the role".into());
        }
        let mut states = Vec::new();
        if name == "focus-indicator" {
            match focus_states.iter().find(|n| n.as_str() == "focus") {
                Some(f) => states.push(f.clone()),
                None => match focus_states.first() {
                    Some(f) => states.push(f.clone()),
                    None => flags.push("no declared focus state to list in `states`".into()),
                },
            }
        }
        candidates.push(Candidate {
            name,
            registry: registry_hit,
            evidence: s.evidence.into_iter().collect(),
            flags,
            states,
        });
    }
    candidates
        .sort_by(|a, b| (a.name != "container", &a.name).cmp(&(b.name != "container", &b.name)));
    excluded.sort_by(|a, b| a.phrase.cmp(&b.phrase));
    excluded.dedup();

    let current = match comp.raw.get("anatomy").and_then(Value::as_array) {
        Some(a) if !a.is_empty() => comp
            .raw
            .get("anatomyReview")
            .and_then(|r| r.get("status"))
            .and_then(Value::as_str)
            .unwrap_or("draft")
            .to_string(),
        _ => "none".to_string(),
    };
    Some(Suggestion {
        component: component.to_string(),
        current,
        candidates,
        excluded,
    })
}

/// Suggestions for every component that has relationships and no reviewed anatomy.
pub fn suggest_all(graph: &TokenGraph) -> Vec<Suggestion> {
    let with_rels: BTreeSet<&str> = graph
        .relationships
        .iter()
        .filter_map(|r| r.raw.get("scope")?.get("component")?.as_str())
        .collect();
    let mut names: Vec<&str> = graph
        .components
        .iter()
        .map(|c| c.name.as_str())
        .filter(|n| with_rels.contains(n))
        .collect();
    names.sort();
    names
        .into_iter()
        .filter_map(|n| suggest_component(graph, n))
        .filter(|s| s.current != "reviewed")
        .collect()
}

/// Render suggestions as Markdown for a reviewer.
pub fn to_markdown(suggestions: &[Suggestion]) -> String {
    let mut out = String::from(
        "# Anatomy candidates (draft)\n\nSuggestions for review against the anatomy definition. \
Nothing here is reviewed anatomy.\n",
    );
    for s in suggestions {
        out.push_str(&format!(
            "\n## {} (current: {})\n\n",
            s.component, s.current
        ));
        for c in &s.candidates {
            let reg = if c.registry { "registry" } else { "custom" };
            out.push_str(&format!("- `{}` ({reg})", c.name));
            if !c.states.is_empty() {
                out.push_str(&format!(" states: {}", c.states.join(", ")));
            }
            out.push('\n');
            for e in &c.evidence {
                out.push_str(&format!("  - evidence: {e}\n"));
            }
            for f in &c.flags {
                out.push_str(&format!("  - check: {f}\n"));
            }
        }
        if !s.excluded.is_empty() {
            out.push_str("\nNot proposed:\n\n");
            for e in &s.excluded {
                out.push_str(&format!("- {}: {}\n", e.phrase, e.reason));
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{ComponentRecord, Layer, RelationshipRecord};

    fn graph(component: Value, rels: Vec<Value>) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: component["name"].as_str().unwrap().to_string(),
            file: PathBuf::from("c.json"),
            raw: component,
            layer: Layer::Foundation,
        });
        for (index, raw) in rels.into_iter().enumerate() {
            g.relationships.push(RelationshipRecord {
                file: PathBuf::from("r.json"),
                index,
                uuid: None,
                raw,
            });
        }
        g
    }
    fn rel(component: &str, context: Option<&str>, part: Option<&str>) -> Value {
        let mut scope = json!({"component": component, "property": "color"});
        if let Some(p) = part {
            scope["part"] = json!(p);
        }
        let mut v = json!({"scope": scope, "$ref": "t"});
        if let Some(c) = context {
            v["context"] = json!(c);
        }
        v
    }
    fn names(s: &Suggestion) -> Vec<&str> {
        s.candidates.iter().map(|c| c.name.as_str()).collect()
    }

    #[test]
    fn proposes_parts_from_contexts_parts_and_options() {
        let g = graph(
            json!({"name": "alert", "options": {"icon": {}}, "states": [{"name": "keyboard-focus"}]}),
            vec![
                rel("alert", Some("Background"), None),
                rel("alert", Some("Focus ring"), None),
                rel("alert", Some("Title"), Some("title")),
                rel(
                    "alert",
                    Some("Spacing (top/bottom edge to alert icon)"),
                    None,
                ),
                rel("alert", Some("Minimum width"), None),
            ],
        );
        let s = suggest_component(&g, "alert").unwrap();
        assert_eq!(s.current, "none");
        assert_eq!(
            names(&s),
            [
                "container",
                "alert-icon",
                "focus-indicator",
                "icon",
                "title"
            ]
        );
        let focus = s
            .candidates
            .iter()
            .find(|c| c.name == "focus-indicator")
            .unwrap();
        assert_eq!(focus.states, ["keyboard-focus"]);
        let ai = s
            .candidates
            .iter()
            .find(|c| c.name == "alert-icon")
            .unwrap();
        assert!(ai
            .flags
            .iter()
            .any(|f| f.contains("nearest registry term 'icon'")));
        assert!(ai
            .flags
            .iter()
            .any(|f| f.contains("repeats the component name")));
        assert!(ai.flags.iter().any(|f| f.contains("spacing contexts")));
        assert_eq!(s.excluded.len(), 1);
    }

    #[test]
    fn excludes_platform_and_layout_words() {
        let g = graph(
            json!({"name": "card"}),
            vec![
                rel("card", Some("Wrapper"), None),
                rel("card", Some("Stack"), None),
                rel("card", Some("Title"), None),
            ],
        );
        let s = suggest_component(&g, "card").unwrap();
        assert_eq!(names(&s), ["title"]);
        assert_eq!(s.excluded.len(), 2);
    }

    #[test]
    fn excludes_compounds_properties_and_variants() {
        let g = graph(
            json!({"name": "card"}),
            vec![
                rel("card", Some("Border and background color"), None),
                rel("card", Some("Title color"), None),
                rel("card", Some("Spacing (between title and body)"), None),
                rel("card", Some("Body"), None),
            ],
        );
        let s = suggest_component(&g, "card").unwrap();
        assert_eq!(names(&s), ["body"]);
        assert_eq!(s.excluded.len(), 3);
    }

    #[test]
    fn suggest_all_skips_reviewed_and_components_without_relationships() {
        let mut g = graph(
            json!({"name": "button", "anatomy": [{"name": "container"}], "anatomyReview": {"status": "reviewed"}}),
            vec![rel("button", Some("Label"), None)],
        );
        g.components.push(ComponentRecord {
            name: "divider".into(),
            file: PathBuf::from("d.json"),
            raw: json!({"name": "divider"}),
            layer: Layer::Foundation,
        });
        assert!(suggest_all(&g).is_empty());
    }

    #[test]
    fn markdown_lists_evidence_and_checks() {
        let g = graph(
            json!({"name": "tooltip"}),
            vec![rel("tooltip", Some("Label"), None)],
        );
        let md = to_markdown(&suggest_all(&g));
        assert!(md.contains("## tooltip (current: none)"));
        assert!(md.contains("- `label` (registry)"));
        assert!(md.contains("evidence: context 'Label'"));
    }
}
