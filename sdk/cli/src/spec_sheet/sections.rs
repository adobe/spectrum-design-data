// Copyright 2026 Adobe. All rights reserved.

//! Template sections filled from component data. Each filler replaces a section's placeholder
//! with real blocks when the data backs it, and leaves the placeholder when it does not.

use super::*;

fn component_raw<'a>(graph: &'a TokenGraph, component: &str) -> Option<&'a Value> {
    graph
        .components
        .iter()
        .find(|c| c.name == component)
        .map(|c| &c.raw)
}

fn prose(section: &str, id: String, title: &str) -> Map<String, Value> {
    let mut b = Map::new();
    b.insert("kind".into(), json!("prose"));
    b.insert("id".into(), json!(id));
    b.insert("section".into(), json!(section));
    b.insert("title".into(), json!(title));
    b
}

fn table(section: &str, id: &str, title: &str, columns: &[&str], rows: Vec<Vec<String>>) -> Value {
    json!({
        "kind": "table", "id": id, "section": section, "title": title,
        "columns": columns, "rows": rows,
    })
}

fn placeholder(section: &str, id: &str, title: &str, hint: &str) -> Value {
    json!({"kind": "placeholder", "id": id, "section": section, "title": title, "hint": hint})
}

/// Replaces the blocks of the section `key`.
fn set_blocks(sections: &mut [Value], key: &str, blocks: Vec<Value>) {
    if let Some(sec) = sections.iter_mut().find(|x| x["key"] == key) {
        sec["blocks"] = json!(blocks);
    }
}

/// Usage: one prose block per purpose and guideline, and a do/don't block per do-dont. A
/// guideline's `content` is "Title.\n\nBody": the title is the first line.
fn usage(component: &Value) -> Option<Vec<Value>> {
    let blocks = component.get("documentBlocks").and_then(Value::as_array)?;
    let mut out = Vec::new();
    let mut guidelines = 0;
    let mut do_donts = 0;
    for b in blocks {
        let content = s(b, "content").unwrap_or("").trim();
        match s(b, "type") {
            Some("purpose") if !content.is_empty() => {
                let mut p = prose(
                    "usage",
                    format!("usage--purpose-{}", out.len() + 1),
                    "Purpose",
                );
                p.insert("paragraphs".into(), json!([content]));
                out.push(Value::Object(p));
            }
            Some("guideline") if !content.is_empty() => {
                guidelines += 1;
                let (title, body) = content.split_once("\n\n").unwrap_or((content, ""));
                let title = title.trim();
                let mut p = prose("usage", format!("usage--guideline-{guidelines}"), title);
                if !body.trim().is_empty() {
                    p.insert("paragraphs".into(), json!([body.trim()]));
                }
                out.push(Value::Object(p));
            }
            Some("do-dont") => {
                let (d, n) = (s(b, "do"), s(b, "dont"));
                if d.is_none() && n.is_none() {
                    continue;
                }
                do_donts += 1;
                let mut p = prose(
                    "usage",
                    format!("usage--do-dont-{do_donts}"),
                    if content.is_empty() {
                        "Do and don't"
                    } else {
                        content
                    },
                );
                if let Some(d) = d {
                    p.insert("do".into(), json!([d]));
                }
                if let Some(n) = n {
                    p.insert("dont".into(), json!([n]));
                }
                out.push(Value::Object(p));
            }
            _ => {}
        }
    }
    (!out.is_empty()).then_some(out)
}

fn scalar(v: &Value) -> String {
    match v {
        Value::String(x) => x.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

/// API table: one row per declared option, as the data states it. `Options` lists the declared
/// values; an option with no `values` leaves it blank.
fn api_table(component: &Value) -> Option<Value> {
    let options = component.get("options").and_then(Value::as_object)?;
    let rows: Vec<Vec<String>> = options
        .iter()
        .map(|(name, o)| {
            let values: Vec<String> = o
                .get("values")
                .and_then(Value::as_array)
                .map(|vs| {
                    vs.iter()
                        .map(|v| scalar(v.get("value").unwrap_or(v)))
                        .collect()
                })
                .unwrap_or_default();
            vec![
                name.clone(),
                s(o, "type").unwrap_or("").to_string(),
                o.get("default").map(scalar).unwrap_or_default(),
                values.join(", "),
            ]
        })
        .collect();
    (!rows.is_empty()).then(|| {
        table(
            "anatomy",
            "anatomy--api",
            "API",
            &["Name", "Type", "Default", "Options"],
            rows,
        )
    })
}

/// The name chain of a token: itself, then each alias hop to the terminal token.
fn alias_chain(graph: &TokenGraph, tok: &Value, property: &str) -> Vec<String> {
    let mut chain = Vec::new();
    let mut cur = tok;
    for _ in 0..8 {
        match s(cur, "$ref").and_then(|next| lookup(graph, next)) {
            Some(n) => {
                chain.push(token_name(n, property));
                cur = n;
            }
            None => break,
        }
    }
    chain
}

/// Tokens table: one row per distinct token the component's relationship records name, in
/// record order. `Alias of` is the whole alias chain to the terminal
/// token. A record with an inline value has no token: its row is named by the relationship
/// property and typed `inline`.
fn tokens_table(graph: &TokenGraph, component: &str) -> Option<Value> {
    let mut seen = BTreeSet::new();
    let mut rows: Vec<Vec<String>> = Vec::new();
    for r in &graph.relationships {
        let scope = r.raw.get("scope");
        if scope.and_then(|c| s(c, "component")) != Some(component) {
            continue;
        }
        let property = scope.and_then(|c| s(c, "property")).unwrap_or("");
        for tok in record_tokens(graph, &r.raw) {
            let name = token_name(tok, property);
            if !seen.insert(name.clone()) {
                continue;
            }
            let inline = s(&r.raw, "$ref").is_none();
            let chain = alias_chain(graph, tok, property);
            let ty = if inline {
                "inline".to_string()
            } else {
                terminal_schema(graph, tok)
                    .rsplit('/')
                    .next()
                    .unwrap_or("")
                    .trim_end_matches(".json")
                    .to_string()
            };
            rows.push(vec![
                name,
                ty,
                if chain.is_empty() { "No" } else { "Yes" }.to_string(),
                chain.join(" \u{2192} "),
            ]);
        }
    }
    if rows.is_empty() {
        return None;
    }
    let title = format!("Tokens ({})", rows.len());
    Some(table(
        "anatomy",
        "anatomy--tokens",
        &title,
        &["Name", "Type", "Alias?", "Alias of"],
        rows,
    ))
}

/// Informative default keys per keyboard intent (spec/accessibility.md); the data declares
/// intent only.
const DEFAULT_KEYS: [(&str, &str); 9] = [
    ("activate", "Enter, Space"),
    ("expand", "Space, Enter, ArrowDown"),
    ("collapse", "Escape, ArrowUp"),
    ("navigate-options", "ArrowUp, ArrowDown"),
    ("navigate-items", "ArrowLeft, ArrowRight"),
    ("increment", "ArrowUp, ArrowRight"),
    ("decrement", "ArrowDown, ArrowLeft"),
    ("dismiss", "Escape"),
    ("select-all", "Ctrl+A"),
];

/// Per-part roles the data cannot carry yet (RFC discussions/1995): (component, part, role).
// shortcut: hard-coded annotation, replace when anatomy parts carry `accessibility`.
const PART_ROLES: [(&str, &str, &str); 1] = [("accordion", "header", "button")];

/// The accessibility section. When the component has a behavior contract (A499), role, focus,
/// keyboard intents and WCAG criteria come from it and the `accessibility` block fills only what
/// the contract cannot say; the component-level `intents` labels have no contract field yet, so
/// they still come from the block. A field the contract cannot answer exactly keeps the block's.
fn accessibility(graph: &TokenGraph, component: &Value, name: &str) -> Option<Vec<Value>> {
    let a = component.get("accessibility").and_then(Value::as_object)?;
    let mut a = Value::Object(a.clone());
    if let Some(c) = graph.behaviors.iter().find(|b| b.component == name) {
        let v = design_data_core::behavior::accessibility_view(&c.raw, &graph.behavior_patterns);
        let obj = a.as_object_mut()?;
        if let Some(role) = v.role {
            obj.insert("role".into(), json!(role));
        }
        if let Some(f) = v.focusable {
            obj.insert("focusable".into(), json!(f));
        }
        if !v.keyboard_intents.is_empty() {
            obj.insert("keyboardIntents".into(), json!(v.keyboard_intents));
        }
        if !v.wcag.is_empty() {
            obj.insert("wcag".into(), Value::Array(v.wcag));
        }
    }
    let list = |k: &str| {
        a.get(k)
            .and_then(Value::as_array)
            .map(|v| v.iter().filter_map(Value::as_str).collect::<Vec<_>>())
            .unwrap_or_default()
    };
    let mut rows: Vec<Vec<String>> = vec![vec![
        "Role".into(),
        s(&a, "role").unwrap_or("Not declared").into(),
        "Component data".into(),
    ]];
    for (c, part, role) in PART_ROLES {
        if c == name && s(&a, "role").is_none() {
            rows.push(vec![
                format!("Role ({part} part)"),
                role.into(),
                "Annotation, not in component data (no per-part field yet)".into(),
            ]);
        }
    }
    rows.push(vec![
        "Intents".into(),
        list("intents").join(", "),
        "Component data".into(),
    ]);
    if let Some(f) = a.get("focusable").and_then(Value::as_bool) {
        rows.push(vec![
            "Focusable".into(),
            f.to_string(),
            "Component data".into(),
        ]);
    }
    let mut out = vec![table(
        "accessibility",
        "accessibility--summary",
        "Role, intents and focus",
        &["Property", "Value", "Source"],
        rows,
    )];
    let keys: Vec<Vec<String>> = list("keyboardIntents")
        .into_iter()
        .map(|i| {
            let k = DEFAULT_KEYS.iter().find(|d| d.0 == i).map_or("", |d| d.1);
            vec![i.into(), k.into(), "Informative default keys".into()]
        })
        .collect();
    if !keys.is_empty() {
        out.push(table(
            "accessibility",
            "accessibility--keyboard",
            "Keyboard",
            &["Intent", "Keys", "Note"],
            keys,
        ));
    }
    let wcag: Vec<Vec<String>> = a
        .get("wcag")
        .and_then(Value::as_array)
        .map(|w| {
            w.iter()
                .map(|c| {
                    ["criterion", "level", "title"]
                        .map(|k| s(c, k).unwrap_or("").to_string())
                        .to_vec()
                })
                .collect()
        })
        .unwrap_or_default();
    if !wcag.is_empty() {
        out.push(table(
            "accessibility",
            "accessibility--wcag",
            "WCAG criteria",
            &["Criterion", "Level", "Title"],
            wcag,
        ));
    }
    out.push(placeholder(
        "accessibility",
        "accessibility--screen-readers",
        "Screen reader notes",
        "Manual: VoiceOver, TalkBack, Narrator, React Native and TV notes.",
    ));
    Some(out)
}

fn trigger_text(t: Option<&Value>) -> String {
    match t {
        Some(Value::String(x)) => x.clone(),
        Some(o @ Value::Object(_)) => [s(o, "type"), s(o, "prop")]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(": "),
        _ => String::new(),
    }
}

/// States table: each declared state, its trigger, and how many of the component's
/// relationship records mention it. The state board, flow and responsive notes stay manual.
fn states(graph: &TokenGraph, component: &str, raw: &Value) -> Option<Vec<Value>> {
    let declared = raw.get("states").and_then(Value::as_array)?;
    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    for r in &graph.relationships {
        let scope = r.raw.get("scope");
        if scope.and_then(|c| s(c, "component")) != Some(component) {
            continue;
        }
        let mentioned = scope
            .and_then(|c| c.get("options"))
            .and_then(Value::as_object)
            .map(design_data_core::scope::mentioned_states)
            .unwrap_or_default();
        for m in mentioned {
            *counts.entry(m).or_default() += 1;
        }
    }
    let rows: Vec<Vec<String>> = declared
        .iter()
        .filter_map(|st| {
            let name = s(st, "name")?;
            Some(vec![
                name.to_string(),
                trigger_text(st.get("trigger")),
                counts.get(name).copied().unwrap_or(0).to_string(),
            ])
        })
        .collect();
    if rows.is_empty() {
        return None;
    }
    Some(vec![
        table(
            "states",
            "states--table",
            "States",
            &["State", "Trigger", "Relationship records"],
            rows,
        ),
        placeholder(
            "states",
            "states--placeholder",
            "States, interactions and responsive behavior",
            "State board, interaction flow and responsive behavior. Manual.",
        ),
    ])
}

/// Decision log: one row per changelog commit, newest first. Jira link, R&R contacts and the
/// decision with its rationale are authored by hand (decision A10), so they stay blank.
fn decision_log(changelog: &Value) -> Option<Value> {
    let mut rows: Vec<Vec<String>> = Vec::new();
    for rel in changelog.get("releases")?.as_array()? {
        for c in rel
            .get("commits")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let mut classes: Vec<&str> = c
                .get("entries")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|e| s(e, "class"))
                .collect();
            classes.sort();
            classes.dedup();
            let src = c.get("source");
            let details = match src {
                Some(src) => {
                    let title = s(src, "title").unwrap_or("");
                    let pr = src
                        .get("number")
                        .and_then(Value::as_u64)
                        .map(|n| format!(" (#{n})"))
                        .unwrap_or_default();
                    format!("{title}{pr} {}", s(src, "url").unwrap_or(""))
                        .trim()
                        .to_string()
                }
                None => s(c, "commit").unwrap_or("").chars().take(8).collect(),
            };
            rows.push(vec![
                s(c, "date").or_else(|| s(rel, "date")).unwrap_or("").into(),
                s(rel, "version").unwrap_or("").into(),
                classes.join(", "),
                details,
                String::new(),
                String::new(),
                String::new(),
            ]);
        }
    }
    if rows.is_empty() {
        return None;
    }
    rows.reverse();
    Some(table(
        "decision-log",
        "decision-log--table",
        "Decision log",
        &[
            "Date",
            "Version",
            "Class",
            "Details/PR",
            "Jira link",
            "R&R contacts",
            "Decision and rationale",
        ],
        rows,
    ))
}

/// Replaces the placeholders the component data backs.
pub fn fill(
    sections: &mut [Value],
    graph: &TokenGraph,
    component: &str,
    changelog: Option<&Value>,
    gallery: Vec<Value>,
) {
    let Some(raw) = component_raw(graph, component) else {
        return;
    };
    let mut anatomy: Vec<Value> = [api_table(raw), tokens_table(graph, component)]
        .into_iter()
        .flatten()
        .collect();
    let generated = !gallery.is_empty();
    anatomy.extend(gallery);
    if !anatomy.is_empty() {
        let hint = if generated {
            "Structural indicators (nested instances, slots, required vs optional parts). Manual."
        } else {
            "Variants and multi-item board. Manual until generated from component data."
        };
        anatomy.push(placeholder(
            "anatomy",
            "anatomy--placeholder",
            "Anatomy",
            hint,
        ));
        set_blocks(sections, "anatomy", anatomy);
    }
    if let Some(blocks) = accessibility(graph, raw, component) {
        set_blocks(sections, "accessibility", blocks);
    }
    if let Some(blocks) = states(graph, component, raw) {
        set_blocks(sections, "states", blocks);
    }
    if let Some(log) = changelog.and_then(decision_log) {
        set_blocks(sections, "decision-log", vec![log]);
    }
    if let Some(blocks) = usage(raw) {
        set_blocks(sections, "usage", blocks);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use design_data_core::behavior::accessibility_view;

    fn graph(with_contracts: bool) -> TokenGraph {
        let packages =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data");
        let mut g = TokenGraph::from_json_dir_with_catalogs(
            &packages.join("tokens"),
            Some(&packages.join("mode-sets")),
            Some(&packages.join("components")),
        )
        .unwrap();
        if with_contracts {
            g.behaviors = TokenGraph::load_spec_behaviors(&packages.join("behaviors")).unwrap();
            g.behavior_patterns =
                TokenGraph::load_spec_behavior_patterns(&packages.join("behaviors/patterns"))
                    .unwrap();
        }
        g
    }

    /// A499: for each component with a contract, the accessibility section built from the contract
    /// equals the one built from the `accessibility` block, and the contract answers every field
    /// itself (no fallback to the block) except the component-level `intents` labels, a roving
    /// focus model (`focusable` is not derivable from it) and a group that declares no role.
    #[test]
    fn contract_derived_accessibility_equals_the_block() {
        let (legacy, derived) = (graph(false), graph(true));
        for name in [
            "switch",
            "checkbox",
            "radio-button",
            "radio-group",
            "action-button",
            "button",
            "close-button",
            "link",
            "clear-button",
        ] {
            let raw = component_raw(&legacy, name).unwrap();
            let contract = derived
                .behaviors
                .iter()
                .find(|b| b.component == name)
                .unwrap();
            let v = accessibility_view(&contract.raw, &derived.behavior_patterns);
            let a = &raw["accessibility"];
            assert_eq!(v.role.as_deref(), a["role"].as_str(), "{name} role");
            if name == "radio-button" {
                assert_eq!(v.focusable, None, "{name}: roving focus is not derivable");
            } else {
                assert_eq!(v.focusable, a["focusable"].as_bool(), "{name} focusable");
            }
            if a["keyboardIntents"].is_null() {
                assert!(v.keyboard_intents.is_empty(), "{name} keyboardIntents");
            } else {
                assert_eq!(
                    json!(v.keyboard_intents),
                    a["keyboardIntents"],
                    "{name} keyboardIntents"
                );
            }
            assert_eq!(json!(v.wcag), a["wcag"], "{name} wcag");
            assert_eq!(
                accessibility(&legacy, raw, name),
                accessibility(&derived, raw, name),
                "{name} section"
            );
        }
    }

    /// Mutation guard: a contract that disagrees with the block changes the section.
    #[test]
    fn a_contract_that_disagrees_changes_the_section() {
        let mut g = graph(true);
        let c = g
            .behaviors
            .iter_mut()
            .find(|b| b.component == "switch")
            .unwrap();
        c.raw["parts"]["track"]["focus"] = json!("none");
        let raw = component_raw(&g, "switch").unwrap();
        assert_ne!(
            accessibility(&g, raw, "switch"),
            accessibility(&graph(false), raw, "switch")
        );
    }
}
