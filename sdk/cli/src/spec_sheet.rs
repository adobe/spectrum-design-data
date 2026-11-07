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

use design_data_core::derived;
use design_data_core::graph::TokenGraph;
use design_data_core::naming;
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
const MARGIN_X: f64 = 200.0;
const MARGIN_Y: f64 = 160.0;
const MAX_SCALE: f64 = 5.0;

/// The `prop` of a highlight that comes from a recipe's `derived` entry.
const DERIVED: &str = "derived";

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
    graph
        .resolve_alias_key(uuid)
        .map(|t| &t.raw)
        .or_else(|| {
            graph
                .relationships
                .iter()
                .find(|r| r.uuid.as_deref() == Some(uuid))
                .map(|r| &r.raw)
        })
        .or_else(|| graph.relationship_set_members(uuid).first().map(|r| &r.raw))
}

/// The records a relationship shows. A `$ref` naming a mode-set group (`setUuid`) shows each
/// member, one per scale; a record that pins a scale shows only the member for it.
fn record_tokens<'a>(graph: &'a TokenGraph, raw: &'a Value) -> Vec<&'a Value> {
    let Some(rf) = s(raw, "$ref") else {
        return record_token(graph, raw).into_iter().collect();
    };
    if graph.resolve_alias_key(rf).is_some()
        || graph
            .relationships
            .iter()
            .any(|r| r.uuid.as_deref() == Some(rf))
    {
        return lookup(graph, rf).into_iter().collect();
    }
    let scale = raw.pointer("/scope/options/scale").and_then(Value::as_str);
    graph
        .relationship_set_members(rf)
        .into_iter()
        .map(|r| &r.raw)
        .filter(|m| {
            scale.is_none_or(|sc| {
                m.pointer("/scope/options/scale").and_then(Value::as_str) == Some(sc)
            })
        })
        .collect()
}

/// The token a relationship record shows: the record its `$ref` names, or the record itself
/// when it carries an inline value.
fn record_token<'a>(graph: &'a TokenGraph, raw: &'a Value) -> Option<&'a Value> {
    match s(raw, "$ref") {
        Some(rf) => lookup(graph, rf),
        None => raw.get("value").map(|_| raw),
    }
}

/// Block title for a record without a context: its relationship property, as words.
fn property_title(property: &str) -> String {
    let words = property.replace('-', " ");
    let mut chars = words.chars();
    chars
        .next()
        .map(|c| c.to_uppercase().chain(chars).collect())
        .unwrap_or_default()
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

/// Relationship properties that document type: font tokens and line-height multipliers
/// (a multiplier token has no font schema, so the property decides).
fn is_typography_property(property: &str) -> bool {
    ["font-", "line-height", "cjk-line-height"]
        .iter()
        .any(|p| property.starts_with(p))
        || property == "typography"
}

fn page_for(schema: &str, static_color: Option<&str>, property: &str) -> &'static str {
    if schema.contains("color") {
        match static_color {
            Some("white") => "Color (static white)",
            Some("black") => "Color (static black)",
            _ => "Color",
        }
    } else if schema.contains("font") || is_typography_property(property) {
        "Typography"
    } else {
        "Layout"
    }
}

/// Display name of a token: the legacy key the dataset serializes from its structured name
/// (`naming::extract_legacy_key`), else the relationship property.
fn token_name(raw: &Value, rel_property: &str) -> String {
    raw.get("name")
        .and_then(naming::extract_legacy_key)
        .or_else(|| s(raw, "legacyKey").map(String::from))
        .unwrap_or_else(|| rel_property.to_string())
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

/// `(part, prop, context, property template)` for every relationship binding in the recipe.
fn recipe_bindings(recipe: &Value) -> Vec<(String, String, String, String)> {
    let mut out = Vec::new();
    let parts = recipe.get("parts").and_then(Value::as_object);
    for (part, def) in parts.into_iter().flatten() {
        let props = def.get("props").and_then(Value::as_object);
        for (prop, v) in props.into_iter().flatten() {
            for e in entries(v) {
                if let Some(rel) = e.get("relationship") {
                    let Some(c) = s(rel, "context") else { continue };
                    let t = (
                        part.clone(),
                        prop.clone(),
                        c.trim().to_string(),
                        s(rel, "property").unwrap_or_default().to_string(),
                    );
                    if !out.contains(&t) {
                        out.push(t);
                    }
                }
            }
        }
    }
    // A derived context has no prop to bind; `derived` stands in so the block highlights the part.
    for d in derived::declared(recipe) {
        out.push((d.part, DERIVED.to_string(), d.context, d.property));
    }
    out
}

/// Scalar component options the recipe's first binding for `context` requires (`when.options`),
/// such as `hideLabel: true` for the icon-only spacing. The block renders with them, so the
/// scene resolves the relationship the block documents.
fn when_options(recipe: &Value, context: &str) -> Map<String, Value> {
    let mut out = Map::new();
    let parts = recipe.get("parts").and_then(Value::as_object);
    for def in parts.into_iter().flat_map(|p| p.values()) {
        let props = def.get("props").and_then(Value::as_object);
        for v in props.into_iter().flat_map(|p| p.values()) {
            for e in entries(v) {
                let hit = e
                    .get("relationship")
                    .and_then(|r| s(r, "context"))
                    .is_some_and(|c| c.trim() == context);
                let opts = e.pointer("/when/options").and_then(Value::as_object);
                if let (true, Some(opts)) = (hit, opts) {
                    for (k, v) in opts {
                        if !v.is_array() && !out.contains_key(k) {
                            out.insert(k.clone(), v.clone());
                        }
                    }
                    return out;
                }
            }
        }
    }
    out
}

/// States and options the highlighted bindings need to appear: the part's `visibleWhen` (a focus
/// ring, the badge icon) and the `when` of the binding for `context` (the pressed scale). The
/// block renders with them, so the scene holds what the block documents. An option that lists
/// values takes the first.
fn required_visibility(
    recipe: &Value,
    context: &str,
    hl: &[(&str, &str)],
) -> (Vec<String>, Map<String, Value>) {
    let mut states: Vec<String> = Vec::new();
    let mut options = Map::new();
    let mut add = |cond: Option<&Value>| {
        let Some(cond) = cond else { return };
        for st in cond
            .get("states")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(st) = st.as_str().filter(|x| !states.iter().any(|o| o == x)) {
                states.push(st.to_string());
            }
        }
        for (k, v) in cond
            .get("options")
            .and_then(Value::as_object)
            .into_iter()
            .flatten()
        {
            let first = v.as_array().and_then(|a| a.first()).unwrap_or(v);
            options.entry(k.clone()).or_insert(first.clone());
        }
    };
    let base = context.split(" (").next().unwrap_or(context).trim();
    for (part, prop) in hl {
        let def = recipe.pointer(&format!("/parts/{part}"));
        add(def.and_then(|d| d.get("visibleWhen")));
        // A gap sits between children, so they must be visible.
        if *prop == "gap" {
            for child in def
                .and_then(|d| d.get("children"))
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
            {
                add(recipe.pointer(&format!("/parts/{child}/visibleWhen")));
            }
        }
        for e in def
            .and_then(|d| d.pointer(&format!("/props/{prop}")))
            .map(entries)
            .unwrap_or_default()
        {
            let c = e
                .get("relationship")
                .and_then(|r| s(r, "context"))
                .map(str::trim);
            if c == Some(context) || c == Some(base) {
                add(e.get("when"));
            }
        }
    }
    (states, options)
}

/// Whether a concrete relationship property fits a recipe property template such as
/// `component-height-{sizeIndex}`.
fn template_matches(template: &str, property: &str) -> bool {
    let mut segments = template.split(['{', '}']).enumerate();
    // Splitting on braces alternates literal text (even) and placeholder names (odd).
    let literals: Vec<&str> = segments
        .by_ref()
        .filter(|(i, _)| i % 2 == 0)
        .map(|(_, t)| t)
        .collect();
    if literals.len() == 1 {
        return template == property;
    }
    let (first, last) = (literals[0], literals[literals.len() - 1]);
    if property.len() < first.len() + last.len()
        || !property.starts_with(first)
        || !property.ends_with(last)
    {
        return false;
    }
    let mut rest = &property[first.len()..property.len() - last.len()];
    for lit in &literals[1..literals.len() - 1] {
        match rest.find(lit) {
            Some(at) => rest = &rest[at + lit.len()..],
            None => return false,
        }
    }
    true
}

/// A relationship property without its size part: the `{sizeIndex}`/`{size}` placeholder of the
/// recipe template is dropped with the separator next to it.
fn group_label(template: &str) -> String {
    let mut out = template.to_string();
    for placeholder in ["{sizeIndex}", "{size}"] {
        out = out.replace(placeholder, "");
    }
    out.trim_matches('-').replace("--", "-")
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
    inline: bool,
    /// Relationship records merged into this item (one per scale or color scheme).
    records: usize,
    /// Identity of the token across scales (desktop/mobile): rows merge scales of one token only.
    concept: String,
    marker: Option<usize>,
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
            "marker": self.marker,
            "label": self.label,
            "size": self.size,
            "states": self.states,
            "source": if self.inline { "inline" } else { "token" },
            "token": {"name": self.name, "uuid": self.uuid, "property": self.property},
            "values": self.values,
        })
    }
}

struct Ctx<'a> {
    graph: &'a TokenGraph,
    /// None for a table-only sheet: the component has relationships but no visual recipe yet.
    recipe: Option<&'a Value>,
    component: &'a str,
    size: &'a str,
    labels: Labels,
    scenes: visual::SceneCache,
}

impl Ctx<'_> {
    /// The property as a size template, for a group no recipe binding names: the size's index
    /// from the recipe's `sizeScale` stands in for `{sizeIndex}`, the inverse of
    /// `size_by_property`. Kept as is unless the index occurs exactly once.
    fn size_template(&self, property: &str, size: &str) -> String {
        let idx = self
            .recipe
            .and_then(|r| r.pointer(&format!("/sizeScale/{size}")))
            .map(|v| v.to_string().trim_matches('"').to_string());
        match idx {
            Some(i) if property.matches(&i).count() == 1 => property.replace(&i, "{sizeIndex}"),
            _ => property.to_string(),
        }
    }

    fn render(
        &self,
        recipe: &Value,
        options: &Map<String, Value>,
        states: Vec<String>,
    ) -> miette::Result<Value> {
        let req = RenderRequest {
            component: self.component.to_string(),
            size: self.size.to_string(),
            states,
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
            icon: None,
        };
        let scene = visual::build_scene_cached(self.graph, recipe, &req, &self.scenes)
            .map_err(|e| miette::miette!(e))?;
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
                // A HashMap would reorder keys from run to run; sorted keys keep sheets reproducible.
                "mode": req.mode.iter().collect::<BTreeMap<_, _>>(),
            },
            "scene": scene,
        }))
    }

    fn row_items(&self, recs: &[&Value], sizes: &BTreeMap<String, String>) -> Vec<Item> {
        let mut items: Vec<Item> = Vec::new();
        for r in recs {
            let scope = r.get("scope").unwrap_or(&Value::Null);
            let prop = s(scope, "property").unwrap_or("");
            for (i, tok) in record_tokens(self.graph, r).into_iter().enumerate() {
                // A group expands to several members but is one record.
                let counted = usize::from(i == 0);
                let inline = s(r, "$ref").is_none();
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
                let name = token_name(tok, prop);
                let scale = tok
                    .get("name")
                    .and_then(|n| s(n, "scale").or_else(|| s(n, "colorScheme")))
                    .or_else(|| {
                        [tok, r].iter().find_map(|v| {
                            ["scale", "colorScheme"]
                                .iter()
                                .find_map(|k| v.pointer(&format!("/scope/options/{k}"))?.as_str())
                        })
                    })
                    .unwrap_or("value")
                    .to_string();
                let concept = ["conceptId", "setUuid", "uuid"]
                    .iter()
                    .find_map(|k| s(tok, k))
                    .unwrap_or_default()
                    .to_string();
                let value = tok.get("value").cloned().unwrap_or_else(|| {
                    let target = s(tok, "$ref").and_then(|t| lookup(self.graph, t));
                    json!({"alias": target.map(|t| token_name(t, prop))})
                });
                if let Some(it) = items.iter_mut().find(|i| {
                    i.size == size
                        && i.states == states
                        && i.name == name
                        && i.concept == concept
                        && i.property == prop
                }) {
                    it.values.insert(scale, value);
                    it.records += counted;
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
                    inline,
                    records: counted,
                    concept,
                    marker: None,
                    label,
                    size,
                    states,
                    name,
                    uuid: s(r, "$ref").map(String::from),
                    property: prop.to_string(),
                    values: Map::from_iter([(scale, value)]),
                });
            }
        }
        items
    }

    fn blocks(&self, changelog: Option<&Value>) -> miette::Result<Vec<Value>> {
        let sizes = self.recipe.map(size_by_property).unwrap_or_default();
        let bindings = self.recipe.map(recipe_bindings).unwrap_or_default();
        // Key: (page, title, by_property). Records without a context group by relationship
        // property under a title made from it; those blocks follow the authored contexts.
        type Key = (String, String, bool);
        let mut order: Vec<Key> = Vec::new();
        let mut groups: BTreeMap<Key, Vec<&Value>> = BTreeMap::new();
        for r in &self.graph.relationships {
            let raw = &r.raw;
            let scope = raw.get("scope");
            if scope.and_then(|c| s(c, "component")) != Some(self.component) {
                continue;
            }
            let Some(tok) = record_token(self.graph, raw) else {
                continue;
            };
            let static_color = scope
                .and_then(|c| c.get("options"))
                .and_then(|o| s(o, "staticColor"));
            let property = scope.and_then(|c| s(c, "property")).unwrap_or("");
            let page =
                page_for(&terminal_schema(self.graph, tok), static_color, property).to_string();
            let key = match s(raw, "context") {
                Some(context) => (page, context.trim().to_string(), false),
                None => (page, property_title(property), true),
            };
            if !groups.contains_key(&key) {
                order.push(key.clone());
            }
            groups.entry(key).or_default().push(raw);
        }
        order.sort_by_key(|(p, _, by_property)| {
            (
                PAGE_ORDER.iter().position(|x| x == p).unwrap_or(usize::MAX),
                *by_property,
            )
        });

        let mut blocks = Vec::new();
        for (page, context, by_property) in order {
            let recs = &groups[&(page.clone(), context.clone(), by_property)];
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
                    // A generated group's scale is a value column, not a condition.
                    if !v.is_array() && k != "state" && !(by_property && k == "scale") {
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
            if by_property {
                hl.clear();
            }
            let mut notes: Vec<String> = Vec::new();
            let mut render = match self.recipe {
                Some(recipe) => {
                    let mut options = Map::new();
                    if !by_property {
                        options = rows[&row_order[0]].0.clone();
                        for (k, v) in when_options(recipe, &context) {
                            options.entry(k).or_insert(v);
                        }
                    }
                    let pairs: Vec<(&str, &str)> =
                        hl.iter().map(|b| (b.0.as_str(), b.1.as_str())).collect();
                    let (states, wanted) = required_visibility(recipe, &context, &pairs);
                    for (k, v) in wanted {
                        options.entry(k).or_insert(v);
                    }
                    self.render(recipe, &options, states)?
                }
                None => Value::Null,
            };
            if !render.is_null() {
                let mut highlight: Vec<Value> = Vec::new();
                for b in &hl {
                    let h = json!({"part": b.0, "prop": b.1});
                    if !highlight.contains(&h) {
                        highlight.push(h);
                    }
                }
                render["highlight"] = json!(highlight);
                // Measurements are the scene's own. A relationship-bound one belongs to the block
                // when its context is the title or the base context the highlight fell back to;
                // a direct token selector has no relationship, so the highlighted props decide.
                let hl_props: Vec<(&str, &str)> =
                    hl.iter().map(|b| (b.0.as_str(), b.1.as_str())).collect();
                let measurements: Vec<Value> = render["scene"]["measurements"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .enumerate()
                    .filter(
                        |(_, m)| match m["token"]["relationship"]["context"].as_str() {
                            // Dimensions belong on the Layout page; Color blocks share contexts
                            // such as "Focus indicator" but document the colors.
                            _ if by_property || page != "Layout" => false,
                            // A base-context measurement whose relationship is not one of this
                            // block's records would name a token the rows do not list.
                            Some(c) => {
                                (c == context || c == base)
                                    && s(&m["token"]["relationship"], "uuid").is_none_or(|u| {
                                        recs.iter().any(|r| s(r, "uuid") == Some(u))
                                    })
                            }
                            None => m["part"]
                                .as_str()
                                .zip(m["prop"].as_str())
                                .is_some_and(|pp| hl_props.contains(&pp)),
                        },
                    )
                    .map(|(index, m)| {
                        let rel = &m["token"]["relationship"];
                        // Same source and name as the token rows: the bound token's structured
                        // name; the relationship property only when no record resolves.
                        let bound = s(rel, "uuid")
                            .and_then(|u| lookup(self.graph, u))
                            .and_then(|r| record_token(self.graph, r))
                            .map(|t| token_name(t, s(rel, "property").unwrap_or("")));
                        json!({
                            "index": index,
                            "prop": m["prop"],
                            "kind": m["kind"],
                            "label": match bound {
                                Some(name) => json!(name),
                                None if rel.is_null() => m["token"]["token"].clone(),
                                None => rel["property"].clone(),
                            },
                            "relationship": rel["uuid"],
                        })
                    })
                    .collect();
                render["measurements"] = json!(measurements);
                if !by_property && page == "Layout" {
                    if let Some(recipe) = self.recipe {
                        add_derived_measurements(&mut render, recipe, &hl, &mut notes);
                    }
                }
            }
            // Markers: one per group of rows that share a recipe property template (or, when
            // no recipe binding fits, a relationship property), numbered 1..n in row order.
            // A marker sits on the part of the first binding that fits; none fits: no part.
            let mut markers: Vec<(String, String, Option<&str>, String, bool)> = Vec::new();
            let mut out_rows: Vec<Value> = Vec::new();
            let mut records = 0;
            for k in &row_order {
                let (cond, rrecs) = &rows[k];
                let mut items = self.row_items(rrecs, &sizes);
                // Without a recipe binding, items that run through the sizes (xs..xl) once are
                // one family: its n-th occurrence of a size belongs to the n-th family.
                let mut seen_sizes: Vec<&str> = Vec::new();
                for it in &mut items {
                    let binding = hl.iter().find(|b| template_matches(&b.3, &it.property));
                    let group = match (binding, it.size.as_deref()) {
                        (Some(b), _) => b.3.clone(),
                        (None, Some(sz)) => {
                            let family = seen_sizes.iter().filter(|x| **x == sz).count();
                            seen_sizes.push(sz);
                            format!("#family{family}")
                        }
                        (None, None) => it.property.clone(),
                    };
                    let n = match markers.iter().position(|m| m.0 == group) {
                        Some(i) => i,
                        None => {
                            let template = match (binding, it.size.as_deref()) {
                                (Some(b), _) => b.3.clone(),
                                (None, Some(sz)) => self.size_template(&it.property, sz),
                                (None, None) => it.property.clone(),
                            };
                            let label = group_label(&template);
                            markers.push((
                                group,
                                label,
                                binding.map(|b| b.0.as_str()),
                                it.name.clone(),
                                binding.is_some_and(|b| b.1 == DERIVED),
                            ));
                            markers.len() - 1
                        }
                    };
                    it.marker = (!render.is_null() && !by_property).then_some(n + 1);
                }
                records += items.iter().map(|i| i.records).sum::<usize>();
                out_rows.push(json!({
                    "conditions": cond,
                    "items": items.iter().map(Item::json).collect::<Vec<_>>(),
                }));
            }
            if !render.is_null() {
                if by_property {
                    markers.clear();
                }
                // A marker is drawn when its part is a node of the scene; the rows keep its
                // number either way.
                let nodes = render["scene"]["nodes"].as_array();
                let drawn = |part: &Option<&str>| {
                    part.is_some_and(|p| {
                        nodes.is_some_and(|ns| ns.iter().any(|n| n["part"].as_str() == Some(p)))
                    })
                };
                // Groups whose properties are the same (they differ by token) are told apart by
                // the token of their first row.
                let labels: Vec<String> = markers.iter().map(|m| m.1.clone()).collect();
                for m in &mut markers {
                    if labels.iter().filter(|l| **l == m.1).count() > 1 {
                        m.1 = format!("{} ({})", m.1, m.3);
                    }
                }
                render["markers"] = json!(markers
                    .iter()
                    .enumerate()
                    .map(|(i, (_, label, part, _, derived))| {
                        let mut m = json!({
                            "n": i + 1, "part": part, "label": label, "drawn": drawn(part),
                        });
                        if *derived {
                            m["derived"] = json!(true);
                        }
                        m
                    })
                    .collect::<Vec<_>>());
            }

            let mut changes = Vec::new();
            let mut values_updated = false;
            let mut bindings_changed = false;
            let releases = changelog
                .and_then(|c| c.get("releases"))
                .and_then(Value::as_array);
            for e in releases
                .into_iter()
                .flatten()
                .flat_map(|r| r.get("commits").and_then(Value::as_array))
                .flatten()
                .flat_map(|c| c.get("entries").and_then(Value::as_array))
                .flatten()
            {
                let hit = !by_property
                    && e.get("contexts")
                        .and_then(Value::as_array)
                        .is_some_and(|cs| cs.iter().any(|c| c.as_str() == Some(context.as_str())));
                if !hit {
                    continue;
                }
                changes.extend(s(e, "id").map(|id| json!(id)));
                if s(e, "class") == Some("visual") {
                    match s(e, "kind") {
                        Some("token") => values_updated = true,
                        Some("relationship") => bindings_changed = true,
                        _ => {}
                    }
                }
            }

            let mut badges = Vec::new();
            if values_updated {
                badges.push("Values updated");
            }
            if bindings_changed {
                badges.push("Bindings changed");
            }
            let slug = |t: &str| {
                t.to_lowercase()
                    .replace(|c: char| !c.is_ascii_alphanumeric(), "-")
            };
            blocks.push(json!({
                "id": format!(
                    "{}--{}{}",
                    slug(&page),
                    slug(&context),
                    if by_property { "--property" } else { "" }
                ),
                "page": page,
                "title": context,
                "titleSource": if by_property { "property" } else { "context" },
                "render": render,
                "records": records,
                "rows": out_rows,
                "notes": notes,
                "changes": changes,
                "badges": badges,
            }));
        }
        Ok(blocks)
    }
}

/// Adds a measurement for each derived context the block highlights: the band from the
/// container edge that the formula gives over the solved scene, labelled as derived from
/// height. It joins `scene.measurements`, so views draw it like any other span, and a note
/// states the formula.
fn add_derived_measurements(
    render: &mut Value,
    recipe: &Value,
    hl: &[&(String, String, String, String)],
    notes: &mut Vec<String>,
) {
    let nodes = render["scene"]["nodes"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let node_h = |part: &str| {
        nodes
            .iter()
            .find(|n| n["part"].as_str() == Some(part))
            .and_then(|n| n["h"].as_f64())
    };
    let Some(root) = recipe
        .get("root")
        .and_then(Value::as_str)
        .and_then(|r| nodes.iter().find(|n| n["part"].as_str() == Some(r)))
    else {
        return;
    };
    let (x, y, w, h) = (
        root["x"].as_f64().unwrap_or_default(),
        root["y"].as_f64().unwrap_or_default(),
        root["w"].as_f64().unwrap_or_default(),
        root["h"].as_f64().unwrap_or_default(),
    );
    for d in derived::declared(recipe) {
        if !hl
            .iter()
            .any(|b| b.1 == DERIVED && b.2 == d.context && b.3 == d.property)
        {
            continue;
        }
        let Some(v) = d.value(h, node_h) else {
            continue;
        };
        let prop = d.padding_prop();
        let text = if v.fract() == 0.0 {
            format!("{v}px")
        } else {
            format!("{v:.2}px")
        };
        let band_y = if d.bottom { y + h - v } else { y };
        let scene_ms = render["scene"]["measurements"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        let index = scene_ms.len();
        let mut all = scene_ms;
        all.push(json!({
            "kind": "padding", "part": recipe["root"], "prop": prop,
            "x": x, "y": band_y, "w": w, "h": v,
            "token": {"prop": prop, "token": "derived from height", "value": text, "chain": []},
        }));
        render["scene"]["measurements"] = json!(all);
        if let Some(list) = render["measurements"].as_array_mut() {
            list.push(json!({
                "index": index, "prop": prop, "kind": "padding",
                "label": "derived from height", "relationship": null, "derived": true,
            }));
        }
        let note = format!(
            "Derived from height: {}. The recipe does not bind this context to its token.",
            d.from
        );
        if !notes.contains(&note) {
            notes.push(note);
        }
    }
}

/// Components that have at least one relationship record, sorted.
fn components_with_relationships(graph: &TokenGraph) -> Vec<String> {
    let names: BTreeSet<String> = graph
        .relationships
        .iter()
        .filter_map(|r| r.raw.get("scope").and_then(|c| s(c, "component")))
        .filter(|c| graph.components.iter().any(|k| k.name == *c))
        .map(String::from)
        .collect();
    names.into_iter().collect()
}

fn read_changelog(p: &Path) -> miette::Result<Value> {
    let text = std::fs::read_to_string(p)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to read {}", p.display()))?;
    serde_json::from_str::<Value>(&text).into_diagnostic()
}

/// The sheet for one component: full when it has a visual recipe, else table-only.
fn build_sheet(
    graph: &TokenGraph,
    registry: &Path,
    component: &str,
    size: &str,
    changelog: Option<&Value>,
) -> miette::Result<Value> {
    let recipe = graph.visual_recipe(component).map(|r| &r.raw);
    let component = graph.canonical_component(component).to_string();
    let ctx = Ctx {
        graph,
        recipe,
        component: &component,
        size,
        labels: Labels::new(graph, &component, registry),
        scenes: Default::default(),
    };

    let mut pages: Vec<Value> = Vec::new();
    for b in ctx.blocks(changelog)? {
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
    Ok(json!({
        "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component-spec-sheet.schema.json",
        "specVersion": "1.0.0-draft",
        "component": component,
        "displayName": display,
        "visual": recipe.is_some(),
        "size": size,
        "datasetRevision": changelog
            .and_then(|c| c.get("releases"))
            .and_then(Value::as_array)
            .and_then(|r| r.last())
            .and_then(|r| r.get("commit"))
            .cloned(),
        "block": {"width": BLOCK_W, "height": BLOCK_H},
        "pages": pages,
    }))
}

fn write_text(p: &Path, text: String) -> miette::Result<()> {
    std::fs::write(p, text + "\n")
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to write {}", p.display()))
}

/// `--all`: one sheet per component with relationships in `out_dir`, plus `index.json`
/// (component, visual, counts, and version / latest release from `changelog_dir`).
fn run_all(
    graph: &TokenGraph,
    registry: &Path,
    size: &str,
    changelog_dir: Option<&Path>,
    out_dir: &Path,
) -> miette::Result<ExitCode> {
    std::fs::create_dir_all(out_dir)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to create {}", out_dir.display()))?;
    let mut index = Vec::new();
    for component in components_with_relationships(graph) {
        let changelog = match changelog_dir.map(|d| d.join(format!("{component}.json"))) {
            Some(p) if p.is_file() => Some(read_changelog(&p)?),
            _ => None,
        };
        let sheet = build_sheet(graph, registry, &component, size, changelog.as_ref())?;
        let blocks: usize = sheet["pages"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|p| p["blocks"].as_array().map_or(0, Vec::len))
            .sum();
        let latest = changelog
            .as_ref()
            .and_then(|c| c.get("releases"))
            .and_then(Value::as_array)
            .and_then(|r| r.last());
        index.push(json!({
            "component": component,
            "displayName": sheet["displayName"],
            "visual": sheet["visual"],
            "sheet": format!("{component}.json"),
            "pages": sheet["pages"].as_array().map_or(0, Vec::len),
            "blocks": blocks,
            "version": latest.and_then(|r| r.get("version")),
            "latestRelease": latest.map(|r| json!({"release": r["release"], "date": r["date"], "bump": r["bump"]})),
        }));
        write_text(
            &out_dir.join(format!("{component}.json")),
            serde_json::to_string_pretty(&sheet).into_diagnostic()?,
        )?;
    }
    let text = serde_json::to_string_pretty(&json!({"components": index})).into_diagnostic()?;
    write_text(&out_dir.join("index.json"), text)?;
    eprintln!("wrote {} sheets to {}", index.len(), out_dir.display());
    Ok(ExitCode::SUCCESS)
}

pub fn run(
    component: Option<String>,
    all: bool,
    size: String,
    changelog: Option<PathBuf>,
    changelog_dir: Option<PathBuf>,
    path: Option<PathBuf>,
    output: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let (graph, visuals_dir, _) = super::load_visual_env(path, None, true)?;
    let registry = visuals_dir
        .parent()
        .map(|p| p.join("registry"))
        .unwrap_or_default();
    if all {
        let out_dir = output.ok_or_else(|| miette::miette!("--all needs --output <DIR>"))?;
        return run_all(&graph, &registry, &size, changelog_dir.as_deref(), &out_dir);
    }
    let component = component.ok_or_else(|| miette::miette!("give a component or --all"))?;
    if !components_with_relationships(&graph)
        .contains(&graph.canonical_component(&component).to_string())
    {
        return Err(miette::miette!("no relationships for '{component}'"));
    }
    let changelog = changelog.as_deref().map(read_changelog).transpose()?;
    let sheet = build_sheet(&graph, &registry, &component, &size, changelog.as_ref())?;
    let text = serde_json::to_string_pretty(&sheet).into_diagnostic()?;
    match output {
        Some(p) => write_text(&p, text)?,
        None => println!("{text}"),
    }
    Ok(ExitCode::SUCCESS)
}
