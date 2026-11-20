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

fn strings(v: Option<&Value>) -> Vec<&str> {
    v.and_then(Value::as_array)
        .map(|a| a.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default()
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

/// Replaces the placeholders the component data backs.
pub fn fill(sections: &mut [Value], graph: &TokenGraph, component: &str) {
    let Some(raw) = component_raw(graph, component) else {
        return;
    };
    if let Some(blocks) = usage(raw) {
        set_blocks(sections, "usage", blocks);
    }
}
