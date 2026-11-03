// Copyright 2026 Adobe. All rights reserved.

//! `design-data spec-sheet <component>`: the spec-sheet model (draft) for one component.
//!
//! Pages hold blocks; a block is one relationship context. Each block carries a render request
//! with its scene (so renderers draw from the scene and compute no layout), the token rows
//! taken from the relationship records, and change markers from a changelog JSON. Option labels
//! come from component options and the registry; token names are never parsed.

use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{self, RenderRequest};
use miette::{IntoDiagnostic, WrapErr};
use serde_json::{json, Map, Value};

const PAGE_ORDER: [&str; 5] = [
    "Layout",
    "Typography",
    "Color",
    "Color (static white)",
    "Color (static black)",
];

/// Block visual size in px, and the room kept free around the scene for markers and labels.
const BLOCK_W: f64 = 480.0;
const BLOCK_H: f64 = 360.0;
const MARGIN_X: f64 = 160.0;
const MARGIN_Y: f64 = 120.0;
const MAX_SCALE: f64 = 5.0;

const MEASURED_PROPS: [&str; 7] = [
    "height",
    "paddingInlineStart",
    "paddingInlineEnd",
    "paddingBlockStart",
    "paddingBlockEnd",
    "gap",
    "cornerRadius",
];

fn s<'a>(v: &'a Value, key: &str) -> Option<&'a str> {
    v.get(key).and_then(Value::as_str)
}

fn entries(v: &Value) -> Vec<&Value> {
    match v {
        Value::Array(a) => a.iter().collect(),
        other => vec![other],
    }
}

/// Token or inline relationship record for a `$ref` uuid.
fn lookup<'a>(graph: &'a TokenGraph, uuid: &str) -> Option<&'a Value> {
    graph.resolve_alias_key(uuid).map(|t| &t.raw).or_else(|| {
        graph
            .relationships
            .iter()
            .find(|r| r.uuid.as_deref() == Some(uuid))
            .map(|r| &r.raw)
    })
}

/// The terminal token type of a record, following alias hops.
fn terminal_schema(graph: &TokenGraph, raw: &Value) -> String {
    let mut cur = raw;
    for _ in 0..8 {
        match s(cur, "$ref").and_then(|next| lookup(graph, next)) {
            Some(n) => cur = n,
            None => break,
        }
    }
    s(cur, "$schema").unwrap_or("").to_string()
}

fn page_for(schema: &str, static_color: Option<&str>) -> &'static str {
    if schema.contains("color") {
        match static_color {
            Some("white") => "Color (static white)",
            Some("black") => "Color (static black)",
            _ => "Color",
        }
    } else if schema.contains("font") {
        "Typography"
    } else {
        "Layout"
    }
}

/// Display name of a token: its `legacyKey`, else its structured name fields joined (without
/// the `property` field and the mode fields), else the relationship property.
fn token_name(raw: &Value, rel_property: &str) -> String {
    structured_name(raw, rel_property, false)
}

/// Like [`token_name`], keeping the `property` field: names an alias target on its own.
fn full_token_name(raw: &Value, rel_property: &str) -> String {
    structured_name(raw, rel_property, true)
}

fn structured_name(raw: &Value, rel_property: &str, with_property: bool) -> String {
    let Some(name) = raw.get("name").and_then(Value::as_object) else {
        return s(raw, "legacyKey").unwrap_or(rel_property).to_string();
    };
    if let Some(k) = name.get("legacyKey").and_then(Value::as_str) {
        return k.to_string();
    }
    let joined = name
        .iter()
        .filter(|(k, _)| {
            !matches!(k.as_str(), "scale" | "colorScheme" | "contrast")
                && (with_property || k.as_str() != "property")
        })
        .filter_map(|(_, v)| match v {
            Value::String(t) => Some(t.clone()),
            Value::Number(n) => Some(n.to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("-");
    if joined.is_empty() {
        rel_property.to_string()
    } else {
        joined
    }
}

struct Labels {
    options: BTreeMap<(String, String), String>,
    registry: BTreeMap<(String, String), String>,
}

impl Labels {
    fn new(graph: &TokenGraph, component: &str, registry_dir: &Path) -> Self {
        let mut options = BTreeMap::new();
        let declared = graph
            .components
            .iter()
            .find(|c| c.name == component)
            .and_then(|c| c.raw.get("options"))
            .and_then(Value::as_object);
        for (name, def) in declared.into_iter().flatten() {
            for v in def
                .get("values")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                if let (Some(id), Some(label)) = (s(v, "value"), s(v, "label")) {
                    options.insert((name.clone(), id.to_string()), label.to_string());
                }
            }
        }
        // shortcut: only the size and state registries are read; other options fall back to
        // their id until component options carry labels.
        let mut registry = BTreeMap::new();
        for (kind, file) in [("size", "sizes.json"), ("state", "states.json")] {
            let doc = std::fs::read_to_string(registry_dir.join(file))
                .ok()
                .and_then(|t| serde_json::from_str::<Value>(&t).ok());
            for v in doc
                .iter()
                .filter_map(|d| d.get("values").and_then(Value::as_array))
                .flatten()
            {
                if let (Some(id), Some(label)) = (s(v, "id"), s(v, "label")) {
                    registry.insert((kind.to_string(), id.to_string()), label.to_string());
                }
            }
        }
        Labels { options, registry }
    }

    fn label(&self, option: &str, id: &str) -> String {
        let key = (option.to_string(), id.to_string());
        self.options
            .get(&key)
            .or_else(|| self.registry.get(&key))
            .cloned()
            .unwrap_or_else(|| id.to_string())
    }
}

/// `(part, prop, context)` for every relationship binding in the recipe.
fn recipe_bindings(recipe: &Value) -> Vec<(String, String, String)> {
    let mut out = Vec::new();
    let parts = recipe.get("parts").and_then(Value::as_object);
    for (part, def) in parts.into_iter().flatten() {
        let props = def.get("props").and_then(Value::as_object);
        for (prop, v) in props.into_iter().flatten() {
            for e in entries(v) {
                if let Some(c) = e.get("relationship").and_then(|r| s(r, "context")) {
                    let t = (part.clone(), prop.clone(), c.trim().to_string());
                    if !out.contains(&t) {
                        out.push(t);
                    }
                }
            }
        }
    }
    out
}

/// Concrete relationship property -> size id, from the recipe's `{sizeIndex}`/`{size}` templates.
fn size_by_property(recipe: &Value) -> BTreeMap<String, String> {
    let mut map = BTreeMap::new();
    let Some(scale) = recipe.get("sizeScale").and_then(Value::as_object) else {
        return map;
    };
    let parts = recipe.get("parts").and_then(Value::as_object);
    for def in parts.into_iter().flat_map(|p| p.values()) {
        let props = def.get("props").and_then(Value::as_object);
        for v in props.into_iter().flat_map(|p| p.values()) {
            for e in entries(v) {
                let Some(p) = e.get("relationship").and_then(|r| s(r, "property")) else {
                    continue;
                };
                for (size, idx) in scale {
                    let concrete = p
                        .replace("{sizeIndex}", &idx.to_string())
                        .replace("{size}", size);
                    if concrete != p {
                        map.insert(concrete, size.clone());
                    }
                }
            }
        }
    }
    map
}

struct Item {
    label: String,
    size: Option<String>,
    states: Vec<String>,
    name: String,
    uuid: Option<String>,
    property: String,
    values: Map<String, Value>,
}

impl Item {
    fn json(&self) -> Value {
        json!({
            "label": self.label,
            "size": self.size,
            "states": self.states,
            "token": {"name": self.name, "uuid": self.uuid, "property": self.property},
            "values": self.values,
        })
    }
}

struct Ctx<'a> {
    graph: &'a TokenGraph,
    recipe: &'a Value,
    component: &'a str,
    size: &'a str,
    labels: Labels,
}

impl Ctx<'_> {
    fn render(&self, options: &Map<String, Value>) -> miette::Result<Value> {
        let req = RenderRequest {
            component: self.component.to_string(),
            size: self.size.to_string(),
            states: Vec::new(),
            options: options
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect(),
            mode: [
                ("colorScheme".to_string(), "light".to_string()),
                ("scale".to_string(), "desktop".to_string()),
            ]
            .into(),
            label: "Label".into(),
        };
        let scene =
            visual::build_scene(self.graph, self.recipe, &req).map_err(|e| miette::miette!(e))?;
        // Fit the scene into the block once, so renderers only apply this view.
        let scale = ((BLOCK_W - MARGIN_X) / scene.width)
            .min((BLOCK_H - MARGIN_Y) / scene.height)
            .min(MAX_SCALE);
        Ok(json!({
            "view": {
                "scale": scale,
                "x": (BLOCK_W - scene.width * scale) / 2.0,
                "y": (BLOCK_H - scene.height * scale) / 2.0,
            },
            "request": {
                "component": req.component,
                "size": req.size,
                "states": req.states,
                "options": options,
                "mode": req.mode,
            },
            "scene": scene,
        }))
    }

    fn row_items(&self, recs: &[&Value], sizes: &BTreeMap<String, String>) -> Vec<Item> {
        let distinct: BTreeSet<&str> = recs
            .iter()
            .filter_map(|r| r.get("scope").and_then(|c| s(c, "property")))
            .collect();
        let mut items: Vec<Item> = Vec::new();
        for r in recs {
            let scope = r.get("scope").unwrap_or(&Value::Null);
            let prop = s(scope, "property").unwrap_or("");
            let Some(tok) = s(r, "$ref").and_then(|rf| lookup(self.graph, rf)) else {
                continue;
            };
            let states: Vec<String> = scope
                .get("options")
                .and_then(|o| o.get("state"))
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            let size = sizes
                .get(prop)
                .cloned()
                .or_else(|| tok.get("name").and_then(|n| s(n, "size")).map(String::from));
            // One property per size names the token; a shared property needs the token's own name.
            let name = if distinct.len() > 1 {
                prop.to_string()
            } else {
                token_name(tok, prop)
            };
            let scale = tok
                .get("name")
                .and_then(|n| s(n, "scale"))
                .unwrap_or("value")
                .to_string();
            let value = tok.get("value").cloned().unwrap_or_else(|| {
                let target = s(tok, "$ref").and_then(|t| lookup(self.graph, t));
                json!({"alias": target.map(|t| full_token_name(t, prop))})
            });
            if let Some(it) = items
                .iter_mut()
                .find(|i| i.size == size && i.states == states && i.name == name)
            {
                it.values.insert(scale, value);
                continue;
            }
            let state_label = states
                .iter()
                .map(|x| self.labels.label("state", x))
                .collect::<Vec<_>>()
                .join(" / ");
            let label = match (&size, states.is_empty()) {
                (Some(sz), true) => self.labels.label("size", sz),
                (Some(sz), false) => format!("{} {state_label}", self.labels.label("size", sz)),
                (None, true) => "Default".to_string(),
                (None, false) => state_label,
            };
            items.push(Item {
                label,
                size,
                states,
                name,
                uuid: s(r, "$ref").map(String::from),
                property: prop.to_string(),
                values: Map::from_iter([(scale, value)]),
            });
        }
        items
    }

    fn blocks(&self, changelog: Option<&Value>) -> miette::Result<Vec<Value>> {
        let sizes = size_by_property(self.recipe);
        let bindings = recipe_bindings(self.recipe);
        let mut order: Vec<(String, String)> = Vec::new();
        let mut groups: BTreeMap<(String, String), Vec<&Value>> = BTreeMap::new();
        for r in &self.graph.relationships {
            let raw = &r.raw;
            let scope = raw.get("scope");
            if scope.and_then(|c| s(c, "component")) != Some(self.component) {
                continue;
            }
            let (Some(context), Some(rf)) = (s(raw, "context"), s(raw, "$ref")) else {
                continue;
            };
            let Some(tok) = lookup(self.graph, rf) else {
                continue;
            };
            let static_color = scope
                .and_then(|c| c.get("options"))
                .and_then(|o| s(o, "staticColor"));
            let page = page_for(&terminal_schema(self.graph, tok), static_color).to_string();
            let key = (page, context.trim().to_string());
            if !groups.contains_key(&key) {
                order.push(key.clone());
            }
            groups.entry(key).or_default().push(raw);
        }
        order.sort_by_key(|(p, _)| PAGE_ORDER.iter().position(|x| x == p).unwrap_or(usize::MAX));

        let mut blocks = Vec::new();
        for (page, context) in order {
            let recs = &groups[&(page.clone(), context.clone())];
            // Rows: records sharing the same scalar option conditions (state is a column).
            let mut row_order: Vec<String> = Vec::new();
            let mut rows: BTreeMap<String, (Map<String, Value>, Vec<&Value>)> = BTreeMap::new();
            for r in recs {
                let mut cond = Map::new();
                let opts = r
                    .get("scope")
                    .and_then(|c| c.get("options"))
                    .and_then(Value::as_object);
                for (k, v) in opts.into_iter().flatten() {
                    if !v.is_array() && k != "state" {
                        cond.insert(k.clone(), v.clone());
                    }
                }
                let key = serde_json::to_string(&cond).unwrap_or_default();
                if !rows.contains_key(&key) {
                    row_order.push(key.clone());
                }
                rows.entry(key)
                    .or_insert_with(|| (cond, Vec::new()))
                    .1
                    .push(r);
            }

            // Highlighted parts: bindings for this context, else for its base context
            // ("Background (disabled)" falls back to "Background").
            let base = context.split(" (").next().unwrap_or(&context).trim();
            let mut hl: Vec<_> = bindings.iter().filter(|b| b.2 == context).collect();
            if hl.is_empty() {
                hl = bindings.iter().filter(|b| b.2 == base).collect();
            }
            let mut parts: Vec<&str> = Vec::new();
            for b in &hl {
                if !parts.contains(&b.0.as_str()) {
                    parts.push(&b.0);
                }
            }

            let options = rows[&row_order[0]].0.clone();
            let mut render = self.render(&options)?;
            render["highlight"] = json!(hl
                .iter()
                .map(|b| json!({"part": b.0, "prop": b.1}))
                .collect::<Vec<_>>());
            render["markers"] = json!(parts
                .iter()
                .enumerate()
                .map(|(i, p)| json!({"n": i + 1, "part": p}))
                .collect::<Vec<_>>());
            render["measurements"] = json!(hl
                .iter()
                .map(|b| b.1.as_str())
                .filter(|p| MEASURED_PROPS.contains(p))
                .collect::<Vec<_>>());

            // shortcut: rows carry a marker only when one part is highlighted.
            let marker = (parts.len() == 1).then_some(1);
            let out_rows: Vec<Value> = row_order
                .iter()
                .map(|k| {
                    let (cond, rrecs) = &rows[k];
                    json!({
                        "conditions": cond,
                        "marker": marker,
                        "items": self.row_items(rrecs, &sizes).iter().map(Item::json).collect::<Vec<_>>(),
                    })
                })
                .collect();

            let mut changes = Vec::new();
            let mut values_updated = false;
            let revisions = changelog
                .and_then(|c| c.get("revisions"))
                .and_then(Value::as_array);
            for e in revisions
                .into_iter()
                .flatten()
                .flat_map(|rev| rev.get("entries").and_then(Value::as_array))
                .flatten()
            {
                let hit = e
                    .get("contexts")
                    .and_then(Value::as_array)
                    .is_some_and(|cs| cs.iter().any(|c| c.as_str() == Some(context.as_str())));
                if !hit {
                    continue;
                }
                changes.extend(s(e, "id").map(|id| json!(id)));
                values_updated |= s(e, "class") == Some("visual") && s(e, "kind") == Some("token");
            }

            let slug = |t: &str| {
                t.to_lowercase()
                    .replace(|c: char| !c.is_ascii_alphanumeric(), "-")
            };
            blocks.push(json!({
                "id": format!("{}--{}", slug(&page), slug(&context)),
                "page": page,
                "title": context,
                "render": render,
                "rows": out_rows,
                "notes": [],
                "changes": changes,
                "badges": if values_updated { vec!["Values updated"] } else { vec![] },
            }));
        }
        Ok(blocks)
    }
}

pub fn run(
    component: String,
    size: String,
    changelog: Option<PathBuf>,
    path: Option<PathBuf>,
    output: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let (graph, visuals_dir, _) = super::load_visual_env(path, None, true)?;
    let recipe = &graph
        .visual_recipe(&component)
        .ok_or_else(|| miette::miette!("no visual recipe for '{component}'"))?
        .raw;
    let component = graph.canonical_component(&component).to_string();
    let registry = visuals_dir
        .parent()
        .map(|p| p.join("registry"))
        .unwrap_or_default();
    let changelog = match changelog {
        Some(p) => {
            let text = std::fs::read_to_string(&p)
                .into_diagnostic()
                .wrap_err_with(|| format!("failed to read {}", p.display()))?;
            Some(serde_json::from_str::<Value>(&text).into_diagnostic()?)
        }
        None => None,
    };
    let ctx = Ctx {
        graph: &graph,
        recipe,
        component: &component,
        size: &size,
        labels: Labels::new(&graph, &component, &registry),
    };

    let mut pages: Vec<Value> = Vec::new();
    for b in ctx.blocks(changelog.as_ref())? {
        let title = b["page"].as_str().unwrap_or("").to_string();
        match pages.iter_mut().find(|p| p["title"] == title) {
            Some(p) => p["blocks"].as_array_mut().unwrap().push(b),
            None => pages.push(json!({"title": title, "blocks": [b]})),
        }
    }
    let display = graph
        .components
        .iter()
        .find(|c| c.name == component)
        .and_then(|c| s(&c.raw, "displayName").map(String::from))
        .unwrap_or_else(|| component.clone());
    let sheet = json!({
        "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component-spec-sheet.schema.json",
        "specVersion": "1.0.0-draft",
        "component": component,
        "displayName": display,
        "size": size,
        "block": {"width": BLOCK_W, "height": BLOCK_H},
        "pages": pages,
    });
    let text = serde_json::to_string_pretty(&sheet).into_diagnostic()?;
    match output {
        Some(p) => std::fs::write(&p, text + "\n")
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to write {}", p.display()))?,
        None => println!("{text}"),
    }
    Ok(ExitCode::SUCCESS)
}
