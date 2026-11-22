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
use design_data_core::text_metrics::TextMetrics;
use design_data_core::typography;
use design_data_core::visual::{self, RenderRequest};
use miette::{IntoDiagnostic, WrapErr};
use serde_json::{json, Map, Value};

mod sections;

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
/// Gallery cells: a variants-board cell, and the multi-item specimen.
const CELL_W: f64 = 224.0;
const CELL_H: f64 = 120.0;
const SPECIMEN_W: f64 = 480.0;
const SPECIMEN_H: f64 = 320.0;

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

/// A typography composite's resolved sub-values as row values: one `value` entry, or a
/// `desktop`/`mobile` entry per `scale` mode when they differ. `None` for any other token.
fn composite_entries(graph: &TokenGraph, tok: &Value) -> Option<Vec<(String, Value)>> {
    let record = graph.resolve_alias_key(s(tok, "uuid")?)?;
    let modes: Vec<String> = graph
        .mode_sets
        .iter()
        .find(|m| m.name == "scale")
        .map(|m| m.modes.clone())
        .unwrap_or_default();
    let by_mode = |mode: Option<&String>| {
        let ctx = mode
            .map(|m| ("scale".to_string(), m.clone()))
            .into_iter()
            .collect();
        let u = typography::unpack(graph, record, &ctx)?;
        let mut out = Map::new();
        for (key, sub) in [
            ("fontFamily", u.font_family),
            ("fontSize", u.font_size),
            ("fontWeight", u.font_weight),
            ("lineHeight", u.line_height),
            ("letterSpacing", u.letter_spacing),
        ] {
            if let Some(sub) = sub {
                out.insert(key.to_string(), sub.value.unwrap_or(Value::Null));
            }
        }
        Some(Value::Object(out))
    };
    let styles: Vec<(String, Value)> = modes
        .iter()
        .map(|m| Some((m.clone(), by_mode(Some(m))?)))
        .collect::<Option<_>>()?;
    if styles.windows(2).all(|w| w[0].1 == w[1].1) {
        return Some(vec![("value".to_string(), by_mode(None)?)]);
    }
    Some(styles)
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
/// (a multiplier token has no font schema, so the property decides) and type styles.
fn is_typography_property(property: &str) -> bool {
    ["font-", "line-height", "cjk-line-height"]
        .iter()
        .any(|p| property.starts_with(p))
        || property == "type-style"
}

fn page_for(schema: &str, static_color: Option<&str>, property: &str) -> &'static str {
    if schema.contains("color") {
        match static_color {
            Some("white") => "Color (static white)",
            Some("black") => "Color (static black)",
            _ => "Color",
        }
    } else if schema.contains("font")
        || schema.ends_with(typography::COMPOSITE_SCHEMA_SUFFIX)
        || is_typography_property(property)
    {
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

/// States and options the highlighted bindings need to appear: the part's presence condition (a focus
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

/// The pins that make a record a variant of its context: any-of and a declared boolean option
/// pinned true (`isSelected`, `isDisabled`). A false pin is the default and does not split. Those were qualifiers in the context string before SPEC-093, so
/// a block per variant restores the old blocks. A string option (`size`, `variant`) stays a row,
/// as does an interaction state or mode, and an undeclared key is a token name field.
fn variant_pins(
    declared: Option<&Map<String, Value>>,
    options: Option<&Map<String, Value>>,
) -> Map<String, Value> {
    // Sorted, so two records that pin the same options in another key order are one variant.
    let sorted: BTreeMap<&String, &Value> = options
        .into_iter()
        .flatten()
        .filter(|(k, v)| {
            k.as_str() == design_data_core::scope::ANY_OF
                || (is_boolean_option(declared, k) && **v == Value::Bool(true))
        })
        .collect();
    let mut out = Map::new();
    for (k, v) in sorted {
        let v = if k == design_data_core::scope::ANY_OF {
            let mut alts: Vec<Value> = v
                .as_array()
                .into_iter()
                .flatten()
                .map(|alt| match alt.as_object() {
                    Some(o) => Value::Object(
                        o.iter()
                            .collect::<BTreeMap<_, _>>()
                            .into_iter()
                            .map(|(k, v)| (k.clone(), v.clone()))
                            .collect(),
                    ),
                    None => alt.clone(),
                })
                .collect();
            alts.sort_by_key(Value::to_string);
            Value::Array(alts)
        } else {
            v.clone()
        };
        out.insert(k.clone(), v);
    }
    out
}

fn is_boolean_option(declared: Option<&Map<String, Value>>, name: &str) -> bool {
    declared
        .and_then(|d| d.get(name))
        .is_some_and(|o| s(o, "type") == Some("boolean"))
}

/// `isEmphasized` becomes `emphasized`, `hasHoldIcon` becomes `hold icon`.
fn option_words(name: &str) -> String {
    let rest = ["is", "has", "show"]
        .iter()
        .find_map(|p| {
            name.strip_prefix(p)
                .filter(|r| r.chars().next().is_some_and(char::is_uppercase))
        })
        .unwrap_or(name);
    let mut out = String::new();
    for (i, c) in rest.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            out.push(' ');
        }
        out.extend(c.to_lowercase());
    }
    out
}

/// One pin in words. A top-level pin is always a true boolean; an any-of alternative may also
/// pin a false boolean (`not selected`) or a string option (its value).
fn pin_words(name: &str, value: &Value) -> String {
    match value {
        Value::Bool(true) => option_words(name),
        Value::Bool(false) => format!("not {}", option_words(name)),
        Value::String(v) => v.clone(),
        other => other.to_string(),
    }
}

/// The block title of a variant: the context with the pins in words, such as
/// `Control (selected or indeterminate, emphasized)`.
fn variant_title(context: &str, pins: &Map<String, Value>) -> String {
    let mut parts: Vec<String> = Vec::new();
    if let Some(alts) = pins
        .get(design_data_core::scope::ANY_OF)
        .and_then(Value::as_array)
    {
        let words: Vec<String> = alts
            .iter()
            .filter_map(Value::as_object)
            .map(|alt| {
                alt.iter()
                    .map(|(k, v)| pin_words(k, v))
                    .collect::<Vec<_>>()
                    .join(" and ")
            })
            .collect();
        parts.push(words.join(" or "));
    }
    parts.extend(
        pins.iter()
            .filter(|(k, _)| k.as_str() != design_data_core::scope::ANY_OF)
            .map(|(k, v)| pin_words(k, v)),
    );
    if parts.is_empty() {
        return context.to_string();
    }
    let detail = parts.join(", ");
    match context.strip_suffix(')') {
        Some(head) => format!("{head}, {detail})"),
        None => format!("{context} ({detail})"),
    }
}

/// The options a variant's scene renders with: each pin, an array's first value, and the first
/// alternative of an any-of.
fn variant_options(pins: &Map<String, Value>) -> Map<String, Value> {
    let mut out = Map::new();
    for (k, v) in pins {
        if k == design_data_core::scope::ANY_OF {
            if let Some(alt) = v
                .as_array()
                .and_then(|a| a.first())
                .and_then(Value::as_object)
            {
                for (ak, av) in alt {
                    out.insert(ak.clone(), av.clone());
                }
            }
        } else {
            out.insert(
                k.clone(),
                v.as_array().and_then(|a| a.first()).unwrap_or(v).clone(),
            );
        }
    }
    out
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
    text_metrics: Option<&'a TextMetrics>,
    /// Also write `render.svg` (`scene_to_svg`), so views need no renderer of their own.
    svg: bool,
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
        slot_parts: &[&str],
    ) -> miette::Result<Value> {
        let mut options = options.clone();
        self.default_repeat_items(recipe, &mut options);
        let options = &options;
        self.render_in(
            recipe,
            options,
            states,
            self.size,
            (BLOCK_W, BLOCK_H),
            (BLOCK_W - MARGIN_X, BLOCK_H - MARGIN_Y),
            slot_parts,
        )
    }

    /// A recipe that repeats a part over an array option the block leaves unset draws one copy,
    /// so no spacing between copies shows. Gives it two collapsed entries (the first keeps the
    /// measurements). An entry field the block pins through `with` is left out: it would override the pin.
    fn default_repeat_items(&self, recipe: &Value, options: &mut Map<String, Value>) {
        let Some(comp) = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.component)
        else {
            return;
        };
        let Some(parts) = recipe.get("parts").and_then(Value::as_object) else {
            return;
        };
        for rep in parts.values().filter_map(|p| p.get("repeat")) {
            let Some((_, option)) = rep
                .get("slot")
                .and_then(Value::as_str)
                .and_then(|slot| design_data_core::visual::collection_slot(&comp.raw, slot))
            else {
                continue;
            };
            if options.contains_key(option) {
                continue;
            }
            let is_bool = |o: &str| {
                comp.raw
                    .pointer(&format!("/options/{o}/type"))
                    .and_then(Value::as_str)
                    == Some("boolean")
            };
            let items: Vec<Value> = ["one", "two"]
                .iter()
                .map(|n| {
                    let mut item = Map::new();
                    if let Some(l) = rep.get("label").and_then(Value::as_str) {
                        item.insert(l.into(), json!(format!("Item {n}")));
                    }
                    for (opt, field) in rep
                        .get("with")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flatten()
                    {
                        if let Some(f) = field
                            .as_str()
                            .filter(|_| !options.contains_key(opt) && is_bool(opt))
                        {
                            item.insert(f.into(), json!(false));
                        }
                    }
                    Value::Object(item)
                })
                .collect();
            options.insert(option.into(), json!(items));
        }
    }

    /// Renders into a `bx` box, fitting the scene into `fit` (the box less the room for marks).
    #[allow(clippy::too_many_arguments)]
    fn render_in(
        &self,
        recipe: &Value,
        options: &Map<String, Value>,
        states: Vec<String>,
        size: &str,
        bx: (f64, f64),
        fit: (f64, f64),
        slot_parts: &[&str],
    ) -> miette::Result<Value> {
        // A highlighted slot part is shown occupied: its slot gets one fill of the first
        // accepted component, because an empty slot draws no part to mark.
        let slots = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.component)
            .and_then(|c| c.raw.get("slots")?.as_array())
            .into_iter()
            .flatten()
            .filter(|sl| {
                sl.get("part")
                    .and_then(Value::as_str)
                    .is_some_and(|p| slot_parts.contains(&p))
            })
            .filter_map(|sl| {
                let name = sl.get("name")?.as_str()?.to_string();
                let first = sl
                    .get("accepts")?
                    .as_array()?
                    .first()?
                    .as_str()?
                    .to_string();
                Some((
                    name,
                    vec![visual::SlotFill {
                        component: first,
                        ..Default::default()
                    }],
                ))
            })
            .collect();
        let req = RenderRequest {
            component: self.component.to_string(),
            size: size.to_string(),
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
            text_metrics: self.text_metrics.cloned(),
            width: None,
            slots,
        };
        let scene = visual::build_scene_cached(self.graph, recipe, &req, &self.scenes)
            .map_err(|e| miette::miette!(e))?;
        // Fit the scene into the block once, so renderers only apply this view.
        let scale = (fit.0 / scene.width)
            .min(fit.1 / scene.height)
            .min(MAX_SCALE);
        let mut render = json!({
            "view": {
                "scale": scale,
                "x": (bx.0 - scene.width * scale) / 2.0,
                "y": (bx.1 - scene.height * scale) / 2.0,
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
        });
        if self.svg {
            render["svg"] = json!(visual::scene_to_svg(&scene));
        }
        Ok(render)
    }

    /// Anatomy galleries for a recipe: a stack of items with several expanded when the component
    /// declares an `items` array and an `isMultiple` option, and the size x density x quiet
    /// board when it declares all three of those options.
    fn galleries(&self, recipe: &Value) -> miette::Result<Vec<Value>> {
        let Some(declared) = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.component)
            .and_then(|c| c.raw.get("options"))
            .and_then(Value::as_object)
        else {
            return Ok(Vec::new());
        };
        let values = |name: &str| -> Vec<Value> {
            declared
                .get(name)
                .and_then(|o| o.get("values"))
                .and_then(Value::as_array)
                .map(|vs| {
                    vs.iter()
                        .map(|v| v.get("value").unwrap_or(v).clone())
                        .collect()
                })
                .unwrap_or_default()
        };
        let is_type =
            |name: &str, ty: &str| declared.get(name).and_then(|o| s(o, "type")) == Some(ty);
        let mut out = Vec::new();
        if is_type("items", "array") && is_type("isMultiple", "boolean") {
            let items: Vec<Value> = ["One", "Two", "Three", "Four", "Five"]
                .iter()
                .enumerate()
                .map(|(i, n)| {
                    json!({
                        "label": format!("Item {}", n.to_lowercase()),
                        "content": "Content",
                        "isExpanded": matches!(i, 0 | 1 | 3),
                    })
                })
                .collect();
            let mut options = Map::new();
            options.insert("isMultiple".into(), json!(true));
            options.insert("items".into(), json!(items));
            let render = self.render_in(
                recipe,
                &options,
                Vec::new(),
                self.size,
                (SPECIMEN_W, SPECIMEN_H),
                (SPECIMEN_W - 32.0, SPECIMEN_H - 32.0),
                &[],
            )?;
            out.push(json!({
                "kind": "gallery", "id": "anatomy--specimen", "section": "anatomy",
                "title": "Multi-item specimen", "columns": 1,
                "caption": "Five items, three expanded by default (items[].isExpanded). isMultiple lets several items stay open at once: allow-multiple on swc-accordion, allowsMultipleExpanded in React Spectrum.",
                "cell": {"width": SPECIMEN_W, "height": SPECIMEN_H},
                "items": [gallery_item("Items one, two and four expanded", render)],
            }));
        }
        if is_type("size", "string")
            && is_type("density", "string")
            && is_type("isQuiet", "boolean")
        {
            let mut items = Vec::new();
            for size in values("size") {
                for density in values("density") {
                    for quiet in [false, true] {
                        let mut options = Map::new();
                        options.insert("size".into(), size.clone());
                        options.insert("density".into(), density.clone());
                        options.insert("isQuiet".into(), json!(quiet));
                        let render = self.render_in(
                            recipe,
                            &options,
                            Vec::new(),
                            size.as_str().unwrap_or(self.size),
                            (CELL_W, CELL_H),
                            (CELL_W - 16.0, CELL_H - 16.0),
                            &[],
                        )?;
                        let title = format!(
                            "{}, {}, {}",
                            self.labels.label("size", size.as_str().unwrap_or("")),
                            density.as_str().unwrap_or(""),
                            if quiet { "quiet" } else { "default" },
                        );
                        items.push(gallery_item(&title, render));
                    }
                }
            }
            // One scale for every cell, the smallest fit, so the variants are comparable.
            let scale_of = |i: &Value| i["render"]["view"]["scale"].as_f64().unwrap_or(1.0);
            let common = items.iter().map(scale_of).fold(f64::INFINITY, f64::min);
            for item in &mut items {
                let w = item["render"]["scene"]["width"].as_f64().unwrap_or(0.0);
                let h = item["render"]["scene"]["height"].as_f64().unwrap_or(0.0);
                item["render"]["view"] = json!({
                    "scale": common,
                    "x": (CELL_W - w * common) / 2.0,
                    "y": (CELL_H - h * common) / 2.0,
                });
            }
            out.push(json!({
                "kind": "gallery", "id": "anatomy--variants", "section": "anatomy",
                "title": format!("All {} variants", items.len()), "columns": 4,
                "caption": "Size x density x quiet, as the component declares them.",
                "cell": {"width": CELL_W, "height": CELL_H},
                "items": items,
            }));
        }
        Ok(out)
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
                // Every state the record mentions; a state any-of lists each of its members.
                let states: Vec<String> = scope
                    .get("options")
                    .and_then(Value::as_object)
                    .map(design_data_core::scope::mentioned_states)
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
                let entries =
                    composite_entries(self.graph, tok).unwrap_or_else(|| vec![(scale, value)]);
                if let Some(it) = items.iter_mut().find(|i| {
                    i.size == size
                        && i.states == states
                        && i.name == name
                        && i.concept == concept
                        && i.property == prop
                }) {
                    it.values.extend(entries);
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
                    values: Map::from_iter(entries),
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
        type Key = (String, String, bool, String);
        let declared = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.component)
            .and_then(|c| c.raw.get("options"))
            .and_then(Value::as_object);
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
            let pins = variant_pins(
                declared,
                scope
                    .and_then(|c| c.get("options"))
                    .and_then(Value::as_object),
            );
            let variant = if pins.is_empty() {
                String::new()
            } else {
                serde_json::to_string(&pins).unwrap_or_default()
            };
            let key = match s(raw, "context") {
                Some(context) => (page, context.trim().to_string(), false, variant),
                None => (page, property_title(property), true, String::new()),
            };
            if !groups.contains_key(&key) {
                order.push(key.clone());
            }
            groups.entry(key).or_default().push(raw);
        }
        order.sort_by_key(|(p, _, by_property, _)| {
            (
                PAGE_ORDER.iter().position(|x| x == p).unwrap_or(usize::MAX),
                *by_property,
            )
        });

        // The pin keys that vary among the variants of one context. Such a context is split
        // into a block per variant, and the recipe's `when` on those keys no longer picks the
        // scene's options: the variant's pins do.
        let mut varying: BTreeMap<(String, String), Vec<String>> = BTreeMap::new();
        for (page, context, _, variant) in groups.keys() {
            if variant.is_empty() {
                continue;
            }
            let pins: Map<String, Value> = serde_json::from_str(variant).unwrap_or_default();
            let keys = varying.entry((page.clone(), context.clone())).or_default();
            for (k, v) in &pins {
                if k == design_data_core::scope::ANY_OF {
                    for alt in v
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_object)
                    {
                        keys.extend(alt.keys().cloned());
                    }
                } else {
                    keys.push(k.clone());
                }
            }
        }

        let mut blocks = Vec::new();
        for (page, context, by_property, variant) in order {
            let recs = &groups[&(page.clone(), context.clone(), by_property, variant.clone())];
            let split = varying.get(&(page.clone(), context.clone()));
            let pins: Map<String, Value> = serde_json::from_str(&variant).unwrap_or_default();
            let title = variant_title(&context, &pins);
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
                    let skipped = v.is_array()
                        || k == "state"
                        || (by_property && k == "scale")
                        || (split.is_some() && is_boolean_option(declared, k));
                    if !skipped {
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
                        if split.is_some() {
                            // In the order the author wrote the pins: the first alternative of
                            // an any-of is the look the block shows, whatever the names sort to.
                            let authored: Map<String, Value> = recs
                                .first()
                                .and_then(|r| r.pointer("/scope/options"))
                                .and_then(Value::as_object)
                                .into_iter()
                                .flatten()
                                .filter(|(k, _)| pins.contains_key(k.as_str()))
                                .map(|(k, v)| (k.clone(), v.clone()))
                                .collect();
                            options.extend(variant_options(&authored));
                        } else {
                            for (k, v) in when_options(recipe, &context) {
                                options.entry(k).or_insert(v);
                            }
                        }
                    }
                    let pairs: Vec<(&str, &str)> =
                        hl.iter().map(|b| (b.0.as_str(), b.1.as_str())).collect();
                    // Presence now lives on the anatomy part (`presentWhen`).
                    let folded = design_data_core::visual::recipe_with_presence(
                        self.graph,
                        recipe,
                        self.component,
                    );
                    let (states, wanted) = required_visibility(&folded, &context, &pairs);
                    for (k, v) in wanted {
                        if !split.is_some_and(|keys| keys.contains(&k)) {
                            options.entry(k).or_insert(v);
                        }
                    }
                    let slot_parts: Vec<&str> = pairs
                        .iter()
                        .filter(|(p, _)| {
                            recipe
                                .pointer(&format!("/parts/{p}/kind"))
                                .and_then(Value::as_str)
                                == Some("slot")
                        })
                        .map(|(p, _)| *p)
                        .collect();
                    self.render(recipe, &options, states, &slot_parts)?
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
                    slug(&title),
                    if by_property { "--property" } else { "" }
                ),
                "page": page,
                "title": title,
                "titleSource": if by_property { "property" } else { "context" },
                "render": render,
                "records": records,
                "rows": out_rows,
                "notes": notes,
                "changes": changes,
                "badges": badges,
            }));
        }
        // Two variants whose titles read the same must still have distinct ids.
        let mut seen: BTreeMap<String, usize> = BTreeMap::new();
        for b in &mut blocks {
            let id = b["id"].as_str().unwrap_or_default().to_string();
            let n = seen.entry(id.clone()).or_default();
            *n += 1;
            if *n > 1 {
                b["id"] = json!(format!("{id}--{n}"));
            }
        }
        Ok(blocks)
    }
}

/// A gallery entry: the render without measurements and marks, which a small cell cannot carry.
fn gallery_item(title: &str, mut render: Value) -> Value {
    if let Some(scene) = render.get_mut("scene").and_then(Value::as_object_mut) {
        scene.remove("measurements");
    }
    json!({"title": title, "render": render})
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
    text_metrics: Option<&TextMetrics>,
    svg: bool,
) -> miette::Result<Value> {
    let component = graph.canonical_component(component).to_string();
    let lowered = graph
        .visual_recipe(&component)
        .map(|r| design_data_core::visual::with_context_selectors(&r.raw, graph, &component));
    let recipe = lowered.as_ref();
    let ctx = Ctx {
        graph,
        recipe,
        component: &component,
        size,
        labels: Labels::new(graph, &component, registry),
        scenes: Default::default(),
        text_metrics,
        svg,
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
    let mut template = template_sections();
    let gallery = match recipe {
        Some(r) => ctx.galleries(r)?,
        None => Vec::new(),
    };
    sections::fill(&mut template, graph, &component, changelog, gallery);
    let mut sheet = json!({
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
        "sections": template,
    });
    if graph.components.iter().any(|c| {
        c.name == component && c.raw.get("subcomponent").and_then(Value::as_bool) == Some(true)
    }) {
        sheet["subcomponent"] = true.into();
    }
    let hosts = graph.component_hosts(&component);
    if !hosts.is_empty() {
        sheet["usedIn"] = hosts.into();
    }
    Ok(sheet)
}

/// Lauryn Lesley's v1 spec template, in order: (key, title, hint). Every
/// section starts as a placeholder; later slices fill the ones data backs.
const TEMPLATE_SECTIONS: [(&str, &str, &str); 7] = [
    ("anatomy", "Anatomy", "Variants, API table and Tokens table. Manual until generated from component data."),
    ("usage", "Usage guidelines", "Do and don't, content rules, edge cases. Manual until generated from component data."),
    ("states", "States, interactions and responsive behavior", "State board, interaction flow and responsive behavior. Manual."),
    ("accessibility", "Accessibility", "Role, keyboard, focus order, screen readers, contrast. Manual until generated from component data."),
    ("decision-log", "Decision log", "Decisions with rationale and contacts. Manual until generated from the changelog."),
    ("how-to-use", "How to use", "Static instructions for reading this spec. Manual."),
    ("feedback", "Feedback", "Developer and design feedback. Manual."),
];

fn template_sections() -> Vec<Value> {
    TEMPLATE_SECTIONS
        .iter()
        .map(|(key, title, hint)| {
            json!({
                "key": key,
                "title": title,
                "blocks": [{
                    "kind": "placeholder",
                    "id": format!("{key}--placeholder"),
                    "section": key,
                    "title": title,
                    "hint": hint,
                }],
            })
        })
        .collect()
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
    text_metrics: Option<&TextMetrics>,
    svg: bool,
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
        let sheet = build_sheet(
            graph,
            registry,
            &component,
            size,
            changelog.as_ref(),
            text_metrics,
            svg,
        )?;
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
        let mut entry = json!({
            "component": component,
            "displayName": sheet["displayName"],
            "visual": sheet["visual"],
            "sheet": format!("{component}.json"),
            "pages": sheet["pages"].as_array().map_or(0, Vec::len),
            "blocks": blocks,
            "version": latest.and_then(|r| r.get("version")),
            "latestRelease": latest.map(|r| json!({"release": r["release"], "date": r["date"], "bump": r["bump"]})),
        });
        for key in ["subcomponent", "usedIn"] {
            if let Some(v) = sheet.get(key) {
                entry[key] = v.clone();
            }
        }
        index.push(entry);

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

#[allow(clippy::too_many_arguments)]
pub fn run(
    component: Option<String>,
    all: bool,
    size: String,
    changelog: Option<PathBuf>,
    changelog_dir: Option<PathBuf>,
    path: Option<PathBuf>,
    output: Option<PathBuf>,
    text_metrics: Option<PathBuf>,
    svg: bool,
) -> miette::Result<ExitCode> {
    let text_metrics = super::load_text_metrics(text_metrics.as_deref())?;
    let (graph, visuals_dir, _) = super::load_visual_env(path, None, true)?;
    let registry = visuals_dir
        .parent()
        .map(|p| p.join("registry"))
        .unwrap_or_default();
    if all {
        let out_dir = output.ok_or_else(|| miette::miette!("--all needs --output <DIR>"))?;
        return run_all(
            &graph,
            &registry,
            &size,
            changelog_dir.as_deref(),
            &out_dir,
            text_metrics.as_ref(),
            svg,
        );
    }
    let component = component.ok_or_else(|| miette::miette!("give a component or --all"))?;
    if !components_with_relationships(&graph)
        .contains(&graph.canonical_component(&component).to_string())
    {
        return Err(miette::miette!("no relationships for '{component}'"));
    }
    let changelog = changelog.as_deref().map(read_changelog).transpose()?;
    let sheet = build_sheet(
        &graph,
        &registry,
        &component,
        &size,
        changelog.as_ref(),
        text_metrics.as_ref(),
        svg,
    )?;
    let text = serde_json::to_string_pretty(&sheet).into_diagnostic()?;
    match output {
        Some(p) => write_text(&p, text)?,
        None => println!("{text}"),
    }
    Ok(ExitCode::SUCCESS)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn obj(v: Value) -> Map<String, Value> {
        v.as_object().cloned().unwrap_or_default()
    }

    fn declared() -> Map<String, Value> {
        obj(json!({
            "isSelected": {"type": "boolean"},
            "isEmphasized": {"type": "boolean"},
            "isDisabled": {"type": "boolean"},
            "variant": {"type": "string"},
        }))
    }

    fn pins(options: Value) -> Map<String, Value> {
        variant_pins(Some(&declared()), Some(&obj(options)))
    }

    #[test]
    fn pins_in_another_key_order_are_one_variant() {
        let a = pins(json!({"isSelected": true, "isEmphasized": true}));
        let b = pins(json!({"isEmphasized": true, "isSelected": true}));
        assert_eq!(Value::Object(a).to_string(), Value::Object(b).to_string());
        let x = pins(
            json!({"anyOf": [{"isSelected": true, "isDisabled": true}, {"isEmphasized": true}]}),
        );
        let y = pins(
            json!({"anyOf": [{"isEmphasized": true}, {"isDisabled": true, "isSelected": true}]}),
        );
        assert_eq!(Value::Object(x).to_string(), Value::Object(y).to_string());
    }

    #[test]
    fn false_pins_strings_and_undeclared_keys_do_not_split() {
        assert!(
            pins(json!({"isSelected": false, "variant": "a", "size": "m", "from": "top"}))
                .is_empty()
        );
        assert_eq!(
            pins(json!({"isSelected": true, "isDisabled": false})).len(),
            1
        );
    }

    #[test]
    fn an_any_of_alternative_reads_its_false_and_string_pins() {
        let p =
            pins(json!({"anyOf": [{"isSelected": true, "variant": "a"}, {"isDisabled": false}]}));
        assert_eq!(
            variant_title("Control", &p),
            "Control (not disabled or selected and a)"
        );
        let q = pins(
            json!({"isEmphasized": true, "anyOf": [{"isSelected": true}, {"isDisabled": true}]}),
        );
        assert_eq!(
            variant_title("Control (border)", &q),
            "Control (border, disabled or selected, emphasized)"
        );
    }
}
