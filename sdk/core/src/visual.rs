// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Component visual recipes → scene graph → SVG (draft; see
//! `packages/design-data-spec/spec/component-visuals.md`).
//!
//! The recipe is a renderer-neutral part tree whose visual properties are bound to
//! tokens. [`build_scene`] resolves those bindings against a [`TokenGraph`] for one
//! render request and lays the parts out; [`scene_to_svg`] is the first backend.

use std::collections::HashMap;
use std::fmt::Write as _;

use serde::Serialize;
use serde_json::Value;

use crate::graph::{name_ctx_score, TokenGraph};

/// Average glyph advance as a fraction of the font size (calibrated to Adobe Clean medium widths in the S2 Web Figma action button: "Label" is 25-41px across sizes).
const AVG_ADVANCE_EM: f64 = 0.46;
const RING_MARGIN: f64 = 8.0;

/// The props the solver reads, by part role: `root` (the root box), a part `kind`, or `placed`
/// (a part with a `placement`). `rp` checks every read against this table in debug builds, and
/// SPEC-083 warns about a recipe prop missing from it (through `reads_prop`, which both use),
/// so a recipe cannot bind a prop the renderer ignores. Add a prop here when the solver starts to
/// read it.
pub const READ_PROPS: &[(&str, &[&str])] = &[
    (
        "root",
        &[
            "direction",
            "align",
            "justify",
            "height",
            "paddingInlineStart",
            "paddingInlineEnd",
            "paddingBlockStart",
            "paddingBlockEnd",
            "gap",
            "cornerRadius",
            "cornerRadiusStartStart",
            "cornerRadiusStartEnd",
            "cornerRadiusEndEnd",
            "cornerRadiusEndStart",
            "fill",
            "stroke",
            "strokeWidth",
            "pressDifference",
            "pressWidthRatio",
            "pressMinPerspective",
            "pressMaxPerspective",
            "opacity",
        ],
    ),
    (
        "box",
        &[
            "color",
            "width",
            "height",
            "cornerRadius",
            "fill",
            "stroke",
            "strokeWidth",
            "justify",
            "direction",
            "align",
            "gap",
            "paddingInlineStart",
            "paddingInlineEnd",
            "paddingBlockStart",
            "paddingBlockEnd",
        ],
    ),
    ("icon", &["color", "width", "height", "rotation"]),
    ("progress", &["color", "width", "height", "trackColor"]),
    (
        "text",
        &[
            "color",
            "fontFamily",
            "fontSize",
            "fontWeight",
            "lineHeight",
        ],
    ),
    ("ring", &["stroke", "strokeWidth", "gapToParent"]),
    ("placed", &["color"]),
];

/// The props the solver reads for a part: its role is `root` for the root part, `placed` when
/// it has a `placement`, and otherwise its `kind` (default `box`). `None`: no such role.
pub fn read_props(role: &str) -> Option<&'static [&'static str]> {
    READ_PROPS.iter().find(|(r, _)| *r == role).map(|(_, p)| *p)
}

/// Whether the solver reads `name` on a part. A part nested in a flowed box is laid out as a
/// box unless it is an icon, so a `text` or `progress` part also reads the `box` props. The
/// `rp` assertion and SPEC-083 both ask this, so they cannot disagree.
pub fn reads_prop(part: &Value, is_root: bool, name: &str) -> bool {
    let role = part_role(part, is_root);
    let has = |r: &str| read_props(r).is_some_and(|p| p.contains(&name));
    has(role) || (matches!(role, "text" | "progress") && has("box"))
}

/// The role that selects a part's entry in `READ_PROPS`.
pub fn part_role(part: &Value, is_root: bool) -> &str {
    if is_root {
        "root"
    } else if part.get("placement").is_some() {
        "placed"
    } else {
        part.get("kind").and_then(Value::as_str).unwrap_or("box")
    }
}

/// One render request: which component, at which size, in which state and mode.
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(default)]
pub struct RenderRequest {
    pub component: String,
    pub size: String,
    pub states: Vec<String>,
    pub options: HashMap<String, Value>,
    /// Mode context, e.g. `colorScheme` → `light`, `scale` → `desktop`.
    pub mode: HashMap<String, String>,
    pub label: String,
    /// Replaces the icon of every part whose `icon` has `content: true`, or hides it.
    pub icon: Option<IconOverride>,
}

/// A request's `icon`: `{ "set", "name" }` or `"none"` (spec: component-visuals.md, Content icons).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IconOverride {
    None,
    Icon { set: String, name: String },
}

impl<'de> serde::Deserialize<'de> for IconOverride {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        use serde::de::Error;
        let v = Value::deserialize(d)?;
        if v.as_str() == Some("none") {
            return Ok(Self::None);
        }
        let field = |k: &str| v.get(k).and_then(Value::as_str).map(String::from);
        match (field("set"), field("name")) {
            (Some(set), Some(name)) => Ok(Self::Icon { set, name }),
            _ => Err(D::Error::custom(
                "icon must be \"none\" or an object with string set and name",
            )),
        }
    }
}

impl std::str::FromStr for IconOverride {
    type Err = String;
    /// `none` or `set:name`, the CLI spelling.
    fn from_str(s: &str) -> Result<Self, String> {
        if s == "none" {
            return Ok(Self::None);
        }
        match s.split_once(':') {
            Some((set, name)) if !set.is_empty() && !name.is_empty() => Ok(Self::Icon {
                set: set.into(),
                name: name.into(),
            }),
            _ => Err(format!("--icon expects 'none' or SET:NAME, got '{s}'")),
        }
    }
}

/// The label scenes and compiled recipes use for a token record.
pub fn token_label(rec: &crate::graph::TokenRecord) -> String {
    let Some(name) = rec.raw.get("name").and_then(Value::as_object) else {
        return rec.name.clone();
    };
    if let Some(k) = name.get("legacyKey").and_then(Value::as_str) {
        return k.to_string();
    }
    name.values()
        .filter_map(value_to_string)
        .collect::<Vec<_>>()
        .join("-")
}

/// The relationship record that bound a token: its stable `uuid` (unset for a record without
/// one), its trimmed `context` and the concrete `property`.
#[derive(Debug, Clone, Serialize)]
pub struct RelationshipRef {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uuid: Option<String>,
    pub context: String,
    pub property: String,
}

/// A token a resolved value came from, kept for overlays and debugging.
#[derive(Debug, Clone, Serialize)]
pub struct TokenRef {
    pub prop: String,
    pub token: String,
    pub value: String,
    pub chain: Vec<String>,
    /// Set when the value came through a relationship binding.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationship: Option<RelationshipRef>,
}

/// A dimension the layout used (height, width, padding, gap, radius, border, focus ring, press),
/// with the span it covers and the token it came from. Overlay backends draw dimension lines from these; recipes author none.
#[derive(Debug, Clone, Serialize)]
pub struct Measurement {
    /// `height`, `width`, `padding`, `gap`, `radius`, `border`, `focus-thickness`,
    /// `focus-gap` or `press`. A `width` or `height` span is the part's box, a `border` span is
    /// the stroke band along its top edge, `focus-thickness` and `focus-gap` are bands above the
    /// ring's target, and `press` is the pressed part's box (its value is the ratio).
    pub kind: String,
    /// Part the span belongs to.
    pub part: String,
    /// Recipe prop that carried the value (`paddingInlineStart`, `gap`, ...).
    pub prop: String,
    /// The measured span: a bar of this rect, or the corner square for a radius.
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub token: TokenRef,
}

#[derive(Debug, Clone, Serialize)]
pub struct SceneNode {
    pub part: String,
    pub kind: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub fill: Option<String>,
    pub stroke: Option<String>,
    pub stroke_width: f64,
    pub radius: f64,
    /// Per-corner radii `[top-left, top-right, bottom-right, bottom-left]` (left-to-right),
    /// set only when the corners differ.
    pub radii: Option<[f64; 4]>,
    pub text: Option<String>,
    pub font_size: f64,
    pub font_weight: Option<String>,
    /// Set only when the recipe binds `fontFamily`; unset keeps the default stack.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_family: Option<String>,
    pub color: Option<String>,
    /// The icon an `icon` node draws: the part's `icon` reference (`set` and `name`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<IconRef>,
    /// Clockwise rotation of an `icon` in degrees about its center; unset draws it upright.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation: Option<f64>,
    pub tokens: Vec<TokenRef>,
}

/// An icon in the `icons/` catalog: `set` (`ui`, `workflow`) and icon `name`. On a scene
/// node, `drawing` is the geometry the recipe compile chose (`viewBox` and `paths`, each a
/// `d` with an optional `fillRule`); unset when the catalog has no drawing for it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct IconRef {
    pub set: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drawing: Option<Value>,
}

impl IconRef {
    /// The `icon` reference of a recipe part, when it has a string `set` and `name`.
    pub fn of_part(part: &Value) -> Option<Self> {
        let icon = part.get("icon")?;
        Some(Self {
            set: icon.get("set")?.as_str()?.to_string(),
            name: icon.get("name")?.as_str()?.to_string(),
            drawing: None,
        })
    }
}

/// Size keys of size-keyed icon size tokens (`workflow-icon-medium` is `size: m`) as scale
/// indexes, the Spectrum t-shirt scale.
const SIZE_KEY_SCALE: &[(&str, u32)] = &[
    ("xs", 50),
    ("s", 75),
    ("m", 100),
    ("l", 200),
    ("xl", 300),
    ("xxl", 400),
];

/// The scale index a size token's `name` gives an icon drawing: its `scaleIndex`, else its
/// `size` key (`xs` 50, `s` 75, `m` 100, `l` 200, `xl` 300, `xxl` 400).
pub fn icon_scale_of_name(name: &Value) -> Option<u32> {
    if let Some(i) = name.get("scaleIndex") {
        return i
            .as_u64()
            .or_else(|| i.as_str().and_then(|s| s.parse().ok()))
            .and_then(|i| u32::try_from(i).ok());
    }
    let size = name.get("size")?.as_str()?;
    SIZE_KEY_SCALE
        .iter()
        .find(|(k, _)| *k == size)
        .map(|(_, i)| *i)
}

/// The scale index that picks the drawing of an `icon` node (spec: component-visuals.md,
/// Icons): the [`icon_scale_of_name`] of the token bound to its `width`, else its `height`;
/// else `size_index`, the recipe's `sizeScale` entry for the request's size; else 100.
/// `name_of` maps a scene token label to that token's `name` object. Returns the scale and
/// the token label it came from (`None` for the fallbacks).
pub fn icon_scale(
    node: &SceneNode,
    size_index: Option<u32>,
    name_of: impl Fn(&str) -> Option<Value>,
) -> (u32, Option<String>) {
    icon_scale_by(
        |prop| {
            node.tokens
                .iter()
                .find(|t| t.prop == prop)
                .map(|t| t.token.clone())
        },
        size_index,
        name_of,
    )
}

/// [`icon_scale`] over `token_of(prop)`, the token label bound to `width` or `height`.
fn icon_scale_by(
    token_of: impl Fn(&str) -> Option<String>,
    size_index: Option<u32>,
    name_of: impl Fn(&str) -> Option<Value>,
) -> (u32, Option<String>) {
    for prop in ["width", "height"] {
        let Some(token) = token_of(prop) else {
            continue;
        };
        if let Some(scale) = name_of(&token).as_ref().and_then(icon_scale_of_name) {
            return (scale, Some(token));
        }
    }
    (size_index.unwrap_or(100), None)
}

#[derive(Debug, Clone, Serialize)]
pub struct Scene {
    pub component: String,
    pub width: f64,
    pub height: f64,
    /// Uniform scale-down about the container center (the S2 pressed effect).
    pub press: Option<Press>,
    /// Opacity of the whole component (the iOS disabled dim); unset draws it opaque.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opacity: Option<f64>,
    pub nodes: Vec<SceneNode>,
    /// The container's solved gap and padding, bound to a token or not (left-to-right).
    pub layout: Layout,
    /// Token-bound dimensions of the layout; empty when none of them is token-bound.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub measurements: Vec<Measurement>,
    pub diagnostics: Vec<String>,
}

/// Solved container layout values, so a comparison can check literal (unbound) ones too.
#[derive(Debug, Clone, Serialize)]
pub struct Layout {
    /// Set only when two or more children flow, since a gap needs a neighbour.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gap: Option<f64>,
    /// `[top, right, bottom, left]`.
    pub padding: [f64; 4],
}

#[derive(Debug, Clone, Serialize)]
pub struct Press {
    /// Part the scale applies to; the whole scene when absent.
    pub part: Option<String>,
    /// Parts nested inside `part`, at any depth. They scale together with it.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub nested: Vec<String>,
    pub scale: f64,
    pub cx: f64,
    pub cy: f64,
}

#[derive(Debug, Clone)]
struct Resolved {
    value: String,
    token: String,
    /// Set when the value is a ratio of another measurement (`"height"`).
    relative_to: Option<String>,
    /// Alias hops after the bound token, ending at the token that holds the value.
    chain: Vec<String>,
    relationship: Option<RelationshipRef>,
}

/// A candidate token with the options and states its relationship pins.
type RankedCandidate<'g> = (
    &'g crate::graph::TokenRecord,
    (Option<Value>, Vec<String>, Option<RelationshipRef>),
);

impl Resolved {
    fn num(&self) -> Option<f64> {
        let s = self.value.trim();
        s.trim_end_matches("px")
            .trim()
            .parse()
            .ok()
            .filter(|n: &f64| n.is_finite())
    }
}

/// A candidate token with the component options its relationship pins (`None`: none) and the
/// states it pins (its `scope.options.state`; empty: use the token's own `name.state`).
type Candidate<'g> = (
    &'g crate::graph::TokenRecord,
    Option<Value>,
    Vec<String>,
    Option<RelationshipRef>,
);

/// A relationship's `$ref` with the component options and states it pins.
type PinnedRef = (String, Option<Value>, Vec<String>, RelationshipRef);

/// Memoized graph lookups used while compiling variants. A token selector's candidates do
/// not depend on the request, so variants of one recipe can reuse them.
#[derive(Default)]
struct Lookup {
    /// Selector (templates expanded) → keys into `TokenGraph::tokens`.
    tokens: std::cell::RefCell<HashMap<String, Vec<String>>>,
    /// Component, property, context → the `$ref` of each matching relationship and the
    /// component options its `scope.options` pins (see `RELATIONSHIP_RESERVED_OPTIONS`).
    relationships: std::cell::RefCell<HashMap<String, Vec<PinnedRef>>>,
    /// Component → its relationship-owned scoped values (see `scoped_values`).
    scoped: std::cell::RefCell<HashMap<String, std::rc::Rc<Vec<crate::graph::TokenRecord>>>>,
    /// Token label → its `name` object, built on first use (see `CompileCx::name_of`).
    names: std::cell::OnceCell<HashMap<String, Value>>,
    /// Component, property, trimmed context → indices into `TokenGraph::relationships`, in
    /// graph order, built on first use so `relationship_cands` does not scan them all.
    by_scope: std::cell::OnceCell<HashMap<(String, String, String), Vec<usize>>>,
}

impl Lookup {
    fn scoped(
        &self,
        graph: &TokenGraph,
        component: &str,
    ) -> std::rc::Rc<Vec<crate::graph::TokenRecord>> {
        self.scoped
            .borrow_mut()
            .entry(component.to_string())
            .or_insert_with(|| std::rc::Rc::new(scoped_values(graph, component)))
            .clone()
    }
}

/// One recipe resolved against the token graph for one component, size and mode: every
/// token and relationship binding is replaced by its ranked `candidates` (see
/// [`compile_recipe`]). [`solve`] lays it out for any request of that size and mode without
/// touching the graph.
#[derive(Debug, Clone)]
pub struct CompiledVariant {
    root: String,
    option_defaults: HashMap<String, Value>,
    parts: serde_json::Map<String, Value>,
    /// Icon geometry the parts' `drawing` keys name (see `CompileCx::attach_drawings`).
    drawings: serde_json::Map<String, Value>,
}

/// Compiled variants shared across renders of one graph, so a matrix of requests compiles
/// each recipe, size and mode once. Use one cache per graph; results are identical to
/// compiling every time.
#[derive(Default)]
pub struct SceneCache {
    variants: std::cell::RefCell<HashMap<String, std::rc::Rc<CompiledVariant>>>,
    lookup: Lookup,
}

/// Compile-time context: resolves selectors against the graph for one component, size and mode.
struct CompileCx<'a> {
    graph: &'a TokenGraph,
    lookup: &'a Lookup,
    req: &'a RenderRequest,
    size_index: String,
    /// Component-scoped values that live in relationship files (see `scoped_values`).
    scoped: &'a [crate::graph::TokenRecord],
}

/// Solve-time context: picks among compiled candidates for one request.
struct Ctx<'a> {
    req: &'a RenderRequest,
    option_defaults: &'a HashMap<String, Value>,
    diags: Vec<String>,
}

/// Boolean options that act as an interaction state while true. Shared by `active_states`
/// and `scoped_values`, so a relationship scoped by `isSelected: true` matches the same
/// requests as one scoped by `state: ["selected"]`.
pub(crate) const OPTION_STATES: &[(&str, &str)] =
    &[("isDisabled", "disabled"), ("isSelected", "selected")];

/// Relationship records that carry their own `value` (a component-scoped token such as a
/// switch track width), shaped as token records so they rank and resolve like tokens. The
/// relationship's `options` become name fields, so `size`, `scale` and `state` filter them;
/// a true boolean option in `OPTION_STATES` adds its state.
fn scoped_values(graph: &TokenGraph, component: &str) -> Vec<crate::graph::TokenRecord> {
    graph
        .relationships
        .iter()
        .filter(|r| {
            r.raw.get("value").is_some()
                && r.raw.get("$ref").is_none()
                && r.raw.pointer("/scope/component").and_then(Value::as_str) == Some(component)
        })
        .map(|r| {
            let scope = r.raw.get("scope");
            let mut name = serde_json::Map::new();
            if let Some(p) = scope.and_then(|s| s.get("property")) {
                name.insert("property".into(), p.clone());
            }
            if let Some(o) = scope
                .and_then(|s| s.get("options"))
                .and_then(Value::as_object)
            {
                name.extend(o.iter().map(|(k, v)| (k.clone(), v.clone())));
                let states = scope_states(o);
                if !states.is_empty() {
                    name.insert("state".into(), Value::Array(states));
                }
            }
            let key = r
                .raw
                .get("legacyKey")
                .and_then(Value::as_str)
                .or(r.uuid.as_deref())
                .unwrap_or_default();
            name.insert("legacyKey".into(), Value::String(key.into()));
            crate::graph::TokenRecord {
                name: key.into(),
                file: r.file.clone(),
                index: r.index,
                schema_url: None,
                uuid: r.uuid.clone(),
                alias_target: None,
                raw: serde_json::json!({ "name": name, "value": r.raw.get("value") }),
                layer: Default::default(),
            }
        })
        .collect()
}

/// Names of the `{name}` placeholders in a value's strings, in first-use order. A brace pair
/// whose content is not a plain identifier (letters and digits) is literal text.
pub(crate) fn template_names(v: &Value) -> Vec<String> {
    fn scan(s: &str, out: &mut Vec<String>) {
        let mut rest = s;
        while let Some(open) = rest.find('{') {
            let after = &rest[open + 1..];
            match after.find(['{', '}']) {
                Some(i) if after.as_bytes()[i] == b'}' => {
                    let name = &after[..i];
                    if !name.is_empty()
                        && name.chars().all(|c| c.is_ascii_alphanumeric())
                        && !out.iter().any(|n| n == name)
                    {
                        out.push(name.into());
                    }
                    rest = &after[i + 1..];
                }
                Some(i) => rest = &after[i..],
                None => break,
            }
        }
    }
    fn walk(v: &Value, out: &mut Vec<String>) {
        match v {
            Value::String(s) => scan(s, out),
            Value::Array(a) => a.iter().for_each(|x| walk(x, out)),
            Value::Object(m) => m.values().for_each(|x| walk(x, out)),
            _ => {}
        }
    }
    let mut out = Vec::new();
    walk(v, &mut out);
    out
}

/// Placeholders that are not a size template, so they name a component option.
pub(crate) fn option_template_names(v: &Value) -> Vec<String> {
    template_names(v)
        .into_iter()
        .filter(|n| n != "size" && n != "sizeIndex")
        .collect()
}

/// A copy of `v` with `{name}` replaced by `value` in every string.
pub(crate) fn substitute(v: &Value, name: &str, value: &str) -> Value {
    match v {
        Value::String(s) => Value::String(s.replace(&format!("{{{name}}}"), value)),
        Value::Array(a) => Value::Array(a.iter().map(|x| substitute(x, name, value)).collect()),
        Value::Object(m) => Value::Object(
            m.iter()
                .map(|(k, x)| (k.clone(), substitute(x, name, value)))
                .collect(),
        ),
        other => other.clone(),
    }
}

/// The string values an option declares, or empty when it is undeclared or has no `values`.
pub(crate) fn declared_option_values(component: &Value, option: &str) -> Vec<String> {
    component
        .get("options")
        .and_then(|o| o.get(option))
        .and_then(|o| o.get("values"))
        .and_then(Value::as_array)
        .map(|vals| {
            vals.iter()
                .filter_map(|v| v.get("value").unwrap_or(v).as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

fn value_to_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

impl<'a> CompileCx<'a> {
    fn template(&self, s: &str) -> String {
        s.replace("{sizeIndex}", &self.size_index)
            .replace("{size}", &self.req.size)
    }

    fn mode_ctx(&self) -> HashMap<String, String> {
        self.req.mode.clone()
    }

    fn matches_selector(&self, name: &Value, sel: &serde_json::Map<String, Value>) -> bool {
        sel.iter().all(|(k, want)| {
            let want = match want {
                Value::String(s) => Value::String(self.template(s)),
                o => o.clone(),
            };
            match name.get(k) {
                Some(Value::Array(a)) => a.contains(&want),
                Some(have) => {
                    *have == want
                        || (have.is_number()
                            && value_to_string(have) == want.as_str().map(String::from))
                }
                None => false,
            }
        })
    }

    /// Mode-compatible candidates, best fit first, each kept with its extra data. Candidates
    /// that contradict the mode context are dropped; ties prefer the fewest extra name fields.
    /// A relationship that pins the `size` option picks its token by that pin, and a lone
    /// candidate has nothing to choose from, so the token's own `size` name (a Base step above
    /// or below the component size) does not drop either.
    fn rank_by<'g>(&self, cands: Vec<RankedCandidate<'g>>) -> Vec<RankedCandidate<'g>> {
        let mut mctx = self.mode_ctx();
        mctx.insert("size".into(), self.req.size.clone());
        let lone = cands.len() == 1;
        let mut fit: Vec<_> = cands
            .into_iter()
            .filter(|(t, (pinned, _, _))| {
                mctx.iter().all(|(k, v)| {
                    let pins_size = pinned.as_ref().is_some_and(|p| p.get("size").is_some());
                    if k == "size" && (lone || pins_size) {
                        return true;
                    }
                    match t
                        .raw
                        .get("name")
                        .and_then(|n| n.get(k))
                        .and_then(Value::as_str)
                    {
                        Some(have) => have == v,
                        None => true,
                    }
                })
            })
            .collect();
        fit.sort_by(|(a, _), (b, _)| {
            let sa = name_ctx_score(&a.raw, &mctx);
            let sb = name_ctx_score(&b.raw, &mctx);
            let ea = a
                .raw
                .get("name")
                .and_then(Value::as_object)
                .map_or(0, |o| o.len());
            let eb = b
                .raw
                .get("name")
                .and_then(Value::as_object)
                .map_or(0, |o| o.len());
            sb.cmp(&sa).then(ea.cmp(&eb)).then(a.name.cmp(&b.name))
        });
        fit
    }

    fn terminal(&self, rec: &crate::graph::TokenRecord) -> Option<String> {
        let mctx = self.mode_ctx();
        let mut cur = rec;
        for _ in 0..16 {
            match &cur.alias_target {
                Some(t) => cur = self.graph.resolve_alias_in_context(t, &mctx)?,
                None => break,
            }
        }
        cur.raw.get("value").and_then(value_to_string)
    }

    fn alias_chain(&self, rec: &crate::graph::TokenRecord) -> Vec<String> {
        let mctx = self.mode_ctx();
        let mut cur = rec;
        let mut out = Vec::new();
        for _ in 0..16 {
            let Some(t) = &cur.alias_target else { break };
            let Some(next) = self.graph.resolve_alias_in_context(t, &mctx) else {
                break;
            };
            out.push(token_label(next));
            cur = next;
        }
        out
    }

    /// Tokens matching a selector, plus the selector with its `property` templated.
    fn token_cands(
        &self,
        sel: &Value,
    ) -> Option<(
        Vec<&'a crate::graph::TokenRecord>,
        serde_json::Map<String, Value>,
    )> {
        let mut sel_obj = sel.as_object()?.clone();
        if let Some(Value::String(p)) = sel_obj.get("property") {
            let p = self.template(p);
            sel_obj.insert("property".into(), Value::String(p));
        }
        let graph = self.graph;
        // The key holds the selector with every template expanded: its candidates depend on
        // the request size, but the selector reported in diagnostics keeps its templates.
        let mut keyed = sel_obj.clone();
        for v in keyed.values_mut() {
            if let Value::String(t) = v {
                *t = self.template(t);
            }
        }
        let key = Value::Object(keyed).to_string();
        if let Some(keys) = self.lookup.tokens.borrow().get(&key) {
            let cands = keys.iter().filter_map(|k| graph.tokens.get(k)).collect();
            return Some((cands, sel_obj));
        }
        let find = |sel: &serde_json::Map<String, Value>| -> Vec<String> {
            graph
                .tokens
                .iter()
                .filter(|(_, t)| {
                    t.raw
                        .get("name")
                        .is_some_and(|n| self.matches_selector(n, sel))
                })
                .map(|(k, _)| k.clone())
                .collect()
        };
        let mut keys = find(&sel_obj);
        // A bare `font-size-{n}` style property may also be encoded as property + scaleIndex.
        if keys.is_empty() {
            if let Some(Value::String(p)) = sel_obj.get("property") {
                if let Some((base, idx)) = p.rsplit_once('-') {
                    if let Ok(i) = idx.parse::<u64>() {
                        let mut alt = sel_obj.clone();
                        alt.insert("property".into(), Value::String(base.into()));
                        alt.insert("scaleIndex".into(), Value::from(i));
                        keys = find(&alt);
                    }
                }
            }
        }
        let cands = keys.iter().filter_map(|k| graph.tokens.get(k)).collect();
        self.lookup.tokens.borrow_mut().insert(key, keys);
        Some((cands, sel_obj))
    }

    /// Tokens bound to this component by a relationship, each with the component options its
    /// relationship pins, plus the templated property and trimmed context.
    fn relationship_cands(&self, rel: &Value) -> Option<(Vec<Candidate<'a>>, String, String)> {
        let property = self.template(rel.get("property")?.as_str()?);
        let context = rel.get("context")?.as_str()?.trim().to_string();
        let key = format!("{}\u{1f}{property}\u{1f}{context}", self.req.component);
        let cached = self.lookup.relationships.borrow().get(&key).cloned();
        let refs = cached.unwrap_or_else(|| {
            let declared: Vec<&str> = self
                .graph
                .components
                .iter()
                .find(|c| c.name == self.req.component)
                .and_then(|c| c.raw.get("options"))
                .and_then(Value::as_object)
                .map(|o| o.keys().map(String::as_str).collect())
                .unwrap_or_default();
            let by_scope = self.lookup.by_scope.get_or_init(|| {
                let mut index: HashMap<(String, String, String), Vec<usize>> = HashMap::new();
                for (i, r) in self.graph.relationships.iter().enumerate() {
                    let scope = r.raw.get("scope");
                    let s = |k: &str| scope.and_then(|s| s.get(k)).and_then(Value::as_str);
                    let c = r.raw.get("context").and_then(Value::as_str).map(str::trim);
                    if let (Some(comp), Some(p), Some(c)) = (s("component"), s("property"), c) {
                        index
                            .entry((comp.to_string(), p.to_string(), c.to_string()))
                            .or_default()
                            .push(i);
                    }
                }
                index
            });
            let mut refs = Vec::new();
            let scope_key = (
                self.req.component.clone(),
                property.clone(),
                context.clone(),
            );
            for &i in by_scope.get(&scope_key).into_iter().flatten() {
                let r = &self.graph.relationships[i];
                let scope = r.raw.get("scope");
                if let Some(rf) = r.raw.get("$ref").and_then(Value::as_str) {
                    refs.push((
                        rf.to_string(),
                        pinned_options(scope, &declared),
                        scope_state_ids(scope),
                        RelationshipRef {
                            uuid: r.uuid.clone(),
                            context: context.clone(),
                            property: property.clone(),
                        },
                    ));
                }
            }
            self.lookup
                .relationships
                .borrow_mut()
                .insert(key, refs.clone());
            refs
        });
        let mut cands = Vec::new();
        for (rf, options, states, rel) in &refs {
            if let Some(t) = self.graph.resolve_alias_key(rf) {
                cands.push((t, options.clone(), states.clone(), Some(rel.clone())));
            } else if let Some(t) = self.scoped.iter().find(|t| t.uuid.as_deref() == Some(rf)) {
                cands.push((t, options.clone(), states.clone(), Some(rel.clone())));
            }
        }
        Some((cands, property, context))
    }

    /// Replace a binding's `token`/`relationship` selector with its ranked `candidates`.
    /// A selector that uses `{option}` placeholders compiles once per declared value of that
    /// option, and each candidate pins that option, so the solver picks by the request.
    fn compile_source(&self, prop: &str, entry: &mut Value) {
        let Some(obj) = entry.as_object_mut() else {
            return;
        };
        let Some(selector) = obj
            .get("token")
            .or_else(|| obj.get("relationship"))
            .cloned()
        else {
            return;
        };
        let names = option_template_names(&selector);
        if names.is_empty() {
            let (list, miss) = self.source_candidates(prop, obj);
            obj.remove("token");
            obj.remove("relationship");
            obj.insert("candidates".into(), Value::Array(list));
            obj.insert("miss".into(), Value::String(miss));
            return;
        }
        let key = if obj.contains_key("token") {
            "token"
        } else {
            "relationship"
        };
        let component = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.req.component)
            .map(|c| &c.raw);
        // Every combination of the declared values of the options the selector names.
        let mut combos: Vec<Vec<(String, String)>> = vec![vec![]];
        for name in &names {
            let values = component
                .map(|c| declared_option_values(c, name))
                .unwrap_or_default();
            combos = combos
                .into_iter()
                .flat_map(|c| {
                    values.iter().map(move |v| {
                        let mut next = c.clone();
                        next.push((name.clone(), v.clone()));
                        next
                    })
                })
                .collect();
        }
        let mut list: Vec<Value> = Vec::new();
        for combo in combos {
            let mut one = obj.clone();
            let mut sel = selector.clone();
            for (name, value) in &combo {
                sel = substitute(&sel, name, value);
            }
            one.insert(key.into(), sel);
            for mut c in self.source_candidates(prop, &one).0 {
                let mut pins = c
                    .get("options")
                    .and_then(Value::as_object)
                    .cloned()
                    .unwrap_or_default();
                // A pin is a value or an array that matches when any element does.
                let clash = combo.iter().any(|(n, v)| {
                    pins.get(n).is_some_and(|p| match p {
                        Value::Array(any) => !any.iter().any(|a| a.as_str() == Some(v)),
                        one => one.as_str() != Some(v),
                    })
                });
                if clash {
                    continue;
                }
                for (n, v) in &combo {
                    pins.insert(n.clone(), Value::String(v.clone()));
                }
                c["options"] = Value::Object(pins);
                list.push(c);
            }
        }
        let miss = self.source_miss(prop, obj);
        obj.remove("token");
        obj.remove("relationship");
        obj.insert("candidates".into(), Value::Array(list));
        obj.insert("miss".into(), Value::String(miss));
    }

    /// The no-match message of a binding, with its option placeholders left in place.
    fn source_miss(&self, prop: &str, obj: &serde_json::Map<String, Value>) -> String {
        if let Some(Value::Object(sel)) = obj.get("token") {
            let mut sel = sel.clone();
            if let Some(Value::String(p)) = sel.get("property") {
                let p = self.template(p);
                sel.insert("property".into(), Value::String(p));
            }
            format!("{prop}: no token matches {}", Value::Object(sel))
        } else {
            let text = |k: &str| {
                obj.get("relationship")
                    .and_then(|r| r.get(k))
                    .and_then(Value::as_str)
                    .unwrap_or_default()
            };
            let property = self.template(text("property"));
            format!(
                "{prop}: no relationship '{property}' / '{}'",
                text("context").trim()
            )
        }
    }

    /// The ranked candidates of one binding's selector and the message for no match.
    fn source_candidates(
        &self,
        prop: &str,
        obj: &serde_json::Map<String, Value>,
    ) -> (Vec<Value>, String) {
        let cands: Option<(Vec<Candidate>, String)> = if let Some(sel) = obj.get("token") {
            self.token_cands(sel).map(|(c, sel_obj)| {
                (
                    c.into_iter().map(|t| (t, None, Vec::new(), None)).collect(),
                    format!("{prop}: no token matches {}", Value::Object(sel_obj)),
                )
            })
        } else if let Some(rel) = obj.get("relationship") {
            self.relationship_cands(rel)
                .map(|(c, p, ctx)| (c, format!("{prop}: no relationship '{p}' / '{ctx}'")))
        } else {
            return (Vec::new(), String::new());
        };
        let (cands, miss) = cands.unwrap_or_default();
        let list = self
            .rank_by(
                cands
                    .into_iter()
                    .map(|(t, o, s, r)| (t, (o, s, r)))
                    .collect(),
            )
            .into_iter()
            .map(|(t, (options, extra, rel))| {
                let states = if extra.is_empty() {
                    token_states(t)
                } else {
                    extra
                };
                let mut c = serde_json::json!({
                    "value": self.terminal(t),
                    "token": token_label(t),
                    "chain": self.alias_chain(t),
                    "states": states,
                });
                if let Some(o) = options {
                    c["options"] = o;
                }
                if let Some(r) = rel {
                    c["boundBy"] = serde_json::json!(r);
                }
                c
            })
            .collect();
        (list, miss)
    }

    /// Compile every binding of every part (`props` and a placement `inset`).
    fn compile_parts(
        &self,
        parts: &serde_json::Map<String, Value>,
    ) -> serde_json::Map<String, Value> {
        let mut out_parts = parts.clone();
        for part in out_parts.values_mut() {
            if let Some(inset) = part.get_mut("placement").and_then(|p| p.get_mut("inset")) {
                match inset {
                    Value::Array(entries) => entries
                        .iter_mut()
                        .for_each(|e| self.compile_source("inset", e)),
                    other => self.compile_source("inset", other),
                }
            }
            if let Some(props) = part.get_mut("props").and_then(Value::as_object_mut) {
                for (name, source) in props.iter_mut() {
                    match source {
                        Value::Array(entries) => entries
                            .iter_mut()
                            .for_each(|e| self.compile_source(name, e)),
                        other => self.compile_source(name, other),
                    }
                }
            }
        }
        out_parts
    }

    /// The token `name` object of a scene token label (graph tokens, then the component's
    /// relationship-scoped values, then a relationship `$ref`).
    fn name_of(&self, label: &str) -> Option<Value> {
        let names = self.lookup.names.get_or_init(|| {
            self.graph
                .tokens
                .values()
                .filter_map(|t| t.raw.get("name").map(|n| (token_label(t), n.clone())))
                .collect()
        });
        names
            .get(label)
            .cloned()
            .or_else(|| {
                self.scoped
                    .iter()
                    .find(|t| token_label(t) == label)
                    .and_then(|t| t.raw.get("name").cloned())
            })
            .or_else(|| {
                self.graph
                    .resolve_relationship_ref(label)
                    .and_then(|t| t.raw.get("name").cloned())
            })
    }

    /// Choose the drawing of every icon part (spec: component-visuals.md, Icons): the
    /// [`icon_scale`] rule over the size tokens the part binds for this size and mode with
    /// default states and options, then the nearest drawing ([`TokenGraph::icon`]). The
    /// geometry goes into `drawings` under `set:name@scale` (`set:name` for a single
    /// drawing) and the part gets that key as `drawing`, or a `drawingMiss` diagnostic.
    fn attach_drawings(
        &self,
        parts: &mut serde_json::Map<String, Value>,
        drawings: &mut serde_json::Map<String, Value>,
        defaults: &HashMap<String, Value>,
    ) {
        let req = RenderRequest {
            component: self.req.component.clone(),
            size: self.req.size.clone(),
            mode: self.req.mode.clone(),
            ..Default::default()
        };
        let size_index = self.size_index.parse().ok();
        for part in parts.values_mut() {
            let Some(icon) = IconRef::of_part(part) else {
                continue;
            };
            let mut cx = Ctx {
                req: &req,
                option_defaults: defaults,
                diags: Vec::new(),
            };
            let mut token_of = HashMap::new();
            for prop in ["width", "height"] {
                if let Some(r) = cx
                    .eval(part.get("props").and_then(|p| p.get(prop)))
                    .filter(|r| !r.token.is_empty())
                {
                    token_of.insert(prop, r.token);
                }
            }
            // No catalog loaded (plain `validate` without `--icons-path`): nothing to judge,
            // as SPEC-085. The part still draws the placeholder.
            if self.graph.icons.is_empty() {
                continue;
            }
            let (scale, _) = icon_scale_by(
                |prop| token_of.get(prop).cloned(),
                size_index,
                |l| self.name_of(l),
            );
            // A drawing the renderers cannot fit (bad viewBox, no paths) counts as missing.
            let Some(found) = self.graph.icon(&icon.set, &icon.name, scale).filter(|d| {
                d.get("viewBox")
                    .and_then(Value::as_str)
                    .and_then(|v| icon_fit(v, 0.0, 0.0, 1.0, 1.0))
                    .is_some()
                    && d.get("paths").and_then(Value::as_array).is_some()
            }) else {
                part["drawingMiss"] = Value::String(format!(
                    "icon {}:{} has no drawing for size '{}'; drawing a placeholder",
                    icon.set, icon.name, req.size
                ));
                continue;
            };
            let single = self
                .graph
                .icons
                .iter()
                .find(|s| s.set == icon.set)
                .and_then(|s| s.raw.get("icons")?.get(&icon.name))
                .is_some_and(|i| i.get("sizes").is_none());
            let key = if single {
                format!("{}:{}", icon.set, icon.name)
            } else {
                format!("{}:{}@{scale}", icon.set, icon.name)
            };
            drawings.entry(key.clone()).or_insert_with(|| {
                serde_json::json!({ "viewBox": found.get("viewBox"), "paths": found.get("paths") })
            });
            part["drawing"] = Value::String(key);
        }
    }
}

/// Whether `part` is an icon part whose `icon` has `content: true`, and `optional: true`.
fn is_content_icon(part: &Value) -> (bool, bool) {
    let flag = |k: &str| part.pointer(&format!("/icon/{k}")) == Some(&Value::Bool(true));
    (flag("content"), flag("optional"))
}

impl Ctx<'_> {
    /// An unset `label` option follows the request label: empty means icon-only.
    fn option(&self, name: &str) -> Value {
        // The request's size is the `size` option, so conditions can switch on it.
        if name == "size" {
            return Value::String(self.req.size.clone());
        }
        self.req
            .options
            .get(name)
            .or_else(|| self.option_defaults.get(name))
            .cloned()
            .unwrap_or_else(|| {
                if name == "label" {
                    Value::Bool(!self.req.label.is_empty())
                } else {
                    Value::Null
                }
            })
    }

    /// Number of satisfied conditions, or `None` if `when` is not satisfied.
    fn when_score(&self, when: Option<&Value>) -> Option<usize> {
        let Some(when) = when else { return Some(0) };
        let mut score = 0;
        if let Some(states) = when.get("states").and_then(Value::as_array) {
            for s in states {
                let s = s.as_str().unwrap_or_default();
                if !self.req.states.iter().any(|x| x == s) {
                    return None;
                }
                score += 1;
            }
        }
        if let Some(opts) = when.get("options").and_then(Value::as_object) {
            for (k, want) in opts {
                let have = self.option(k);
                let ok = match want {
                    Value::Array(any) => any.iter().any(|w| option_matches(&have, w)),
                    w => option_matches(&have, w),
                };
                if !ok {
                    return None;
                }
                score += 1;
            }
        }
        if let Some(modes) = when.get("modes").and_then(Value::as_object) {
            for (k, want) in modes {
                if self.req.mode.get(k).map(String::as_str) != want.as_str() {
                    return None;
                }
                score += 1;
            }
        }
        Some(score)
    }

    fn visible(&self, part: &Value) -> bool {
        // `icon: none` removes an optional content icon like a failed `visibleWhen`.
        if self.req.icon == Some(IconOverride::None) && is_content_icon(part) == (true, true) {
            return false;
        }
        self.when_score(part.get("visibleWhen")).is_some()
    }

    /// Interaction states plus option-derived ones, with `default` when idle.
    fn active_states(&self) -> Vec<String> {
        let mut active = self.req.states.clone();
        for (opt, state) in OPTION_STATES {
            if self.option(opt) == Value::Bool(true) {
                active.push((*state).into());
            }
        }
        if self.req.states.is_empty() {
            active.push("default".into());
        }
        active
    }

    fn eval(&mut self, source: Option<&Value>) -> Option<Resolved> {
        let source = source?;
        let chosen = match source {
            Value::Array(entries) => {
                let mut best: Option<((i64, usize), &Value)> = None;
                for e in entries {
                    if let Some(sc) = self.when_score(e.get("when")) {
                        let rank = (e.get("priority").and_then(Value::as_i64).unwrap_or(0), sc);
                        if best.is_none_or(|(b, _)| rank >= b) {
                            best = Some((rank, e));
                        }
                    }
                }
                best?.1
            }
            other => {
                self.when_score(other.get("when"))?;
                other
            }
        };
        let relative_to = chosen
            .get("relativeTo")
            .and_then(Value::as_str)
            .map(String::from);
        if let Some(v) = chosen.get("value") {
            return value_to_string(v).map(|value| Resolved {
                value,
                token: String::new(),
                relative_to,
                chain: Vec::new(),
                relationship: None,
            });
        }
        let mut out = self.resolve_candidates(chosen);
        if let Some(r) = out.as_mut() {
            r.relative_to = relative_to;
        }
        out
    }

    /// Choose among a binding's compiled candidates: keep the ones whose pinned options match
    /// the request (the most pinned options win; a candidate pinning none is the default),
    /// then prefer one whose states agree with the request. The state preference only
    /// narrows: if none agree, the best-ranked wins.
    fn resolve_candidates(&mut self, entry: &Value) -> Option<Resolved> {
        let cands = entry.get("candidates")?.as_array()?;
        let scored: Vec<(usize, &Value)> = cands
            .iter()
            .filter_map(|c| {
                let when = c
                    .get("options")
                    .map(|o| serde_json::json!({ "options": o }));
                self.when_score(when.as_ref()).map(|s| (s, c))
            })
            .collect();
        let best = scored.iter().map(|(s, _)| *s).max().unwrap_or(0);
        let active = self.active_states();
        let fit: Vec<&Value> = scored
            .into_iter()
            .filter(|(s, _)| *s == best)
            .map(|(_, c)| c)
            .collect();
        let chosen = fit
            .iter()
            .find(|c| {
                let st = c.get("states").and_then(Value::as_array);
                st.is_some_and(|st| {
                    !st.is_empty()
                        && st
                            .iter()
                            .all(|x| x.as_str().is_some_and(|x| active.iter().any(|a| a == x)))
                })
            })
            .or_else(|| fit.first());
        let Some(chosen) = chosen else {
            if let Some(miss) = entry
                .get("miss")
                .and_then(Value::as_str)
                .filter(|m| !m.is_empty())
            {
                self.diags.push(miss.to_string());
            }
            return None;
        };
        Some(Resolved {
            value: chosen.get("value").and_then(value_to_string)?,
            token: chosen
                .get("token")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            relative_to: None,
            chain: chosen
                .get("chain")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default(),
            relationship: chosen.get("boundBy").map(|r| RelationshipRef {
                uuid: r.get("uuid").and_then(Value::as_str).map(String::from),
                context: r
                    .get("context")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                property: r
                    .get("property")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
            }),
        })
    }
}

/// `scope.options` keys a relationship never pins as a component option: `state` is a token
/// state, `scale` and `colorScheme` are modes.
const RELATIONSHIP_RESERVED_OPTIONS: &[&str] = &["state", "scale", "colorScheme"];

/// State ids a relationship's `scope.options.state` pins, normalized like a token
/// `name.state` (so `key-focus` is `keyboard-focus`). They replace the token's own.
fn scope_state_ids(scope: Option<&Value>) -> Vec<String> {
    let state = scope
        .and_then(|s| s.get("options"))
        .and_then(|o| o.get("state"));
    name_states(state.map(|v| serde_json::json!({ "state": v })).as_ref())
}

/// The component options a relationship's `scope.options` pins, or `None` when it pins none.
/// Keys the component does not declare as options are ignored.
fn pinned_options(scope: Option<&Value>, declared: &[&str]) -> Option<Value> {
    let options = scope
        .and_then(|s| s.get("options"))
        .and_then(Value::as_object)?;
    let pinned: serde_json::Map<String, Value> = options
        .iter()
        .filter(|(k, _)| {
            !RELATIONSHIP_RESERVED_OPTIONS.contains(&k.as_str()) && declared.contains(&k.as_str())
        })
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    (!pinned.is_empty()).then_some(Value::Object(pinned))
}

/// A token's `name.state` as individual state ids. Legacy compound ids such as
/// `selected-key-focus` split into `selected` + `keyboard-focus`.
fn token_states(t: &crate::graph::TokenRecord) -> Vec<String> {
    name_states(t.raw.get("name"))
}

/// The state ids in a token `name` object (see `token_states`).
pub(crate) fn name_states(name: Option<&Value>) -> Vec<String> {
    let mut out = Vec::new();
    let raw = match name.and_then(|n| n.get("state")) {
        Some(Value::String(s)) => vec![s.clone()],
        Some(Value::Array(a)) => a
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        _ => Vec::new(),
    };
    for s in raw {
        out.extend(state_ids(&s));
    }
    out
}

/// One state name as state ids: `selected-key-focus` splits into `selected` and
/// `keyboard-focus`, and `focus` and `key-focus` are the same state as `keyboard-focus`.
/// Shared with the validation rules that compare state names across data.
pub(crate) fn state_ids(raw: &str) -> Vec<String> {
    let mut out = Vec::new();
    let rest = raw.strip_prefix("selected-");
    if rest.is_some() {
        out.push("selected".to_string());
    }
    let r = rest.unwrap_or(raw);
    out.push(if r == "key-focus" || r == "focus" {
        "keyboard-focus".into()
    } else {
        r.to_string()
    });
    out
}

/// The states a relationship `scope.options` selects: its `state` entries plus the state of
/// each true boolean option in `OPTION_STATES`.
pub(crate) fn scope_states(options: &serde_json::Map<String, Value>) -> Vec<Value> {
    let mut states: Vec<Value> = match options.get("state") {
        Some(Value::Array(a)) => a.clone(),
        Some(v @ Value::String(_)) => vec![v.clone()],
        _ => Vec::new(),
    };
    for (opt, state) in OPTION_STATES {
        let on = options.get(*opt) == Some(&Value::Bool(true));
        if on && !states.iter().any(|s| s.as_str() == Some(state)) {
            states.push(Value::String((*state).into()));
        }
    }
    states
}

/// A `px` value is the line box height; a bare number multiplies the font size. Unbound: 1.3.
fn line_height(lh: Option<&Resolved>, font_size: f64) -> f64 {
    match lh.and_then(|r| r.num().map(|n| (n, r.value.trim().ends_with("px")))) {
        Some((n, true)) => n,
        Some((n, false)) => n * font_size,
        None => font_size * 1.3,
    }
}

fn text_width(text: &str, font_size: f64) -> f64 {
    text.chars().count() as f64 * font_size * AVG_ADVANCE_EM
}

/// Whether an option value satisfies one wanted value. `true` also matches any
/// non-empty string, e.g. an icon name; an unset option matches `false`.
fn option_matches(have: &Value, want: &Value) -> bool {
    have == want
        || (have.is_null() && *want == Value::Bool(false))
        || (*want == Value::Bool(true) && have.as_str().is_some_and(|v| !v.is_empty()))
}

/// Option names a recipe reads, split into those that gate part visibility
/// (`structural`) and the rest. A `{option}` placeholder in a selector counts as read. `size` counts as used when the recipe has a `sizeScale`.
pub fn recipe_options(recipe: &Value) -> (Vec<String>, Vec<String>) {
    fn walk(v: &Value, in_visible: bool, used: &mut Vec<String>, structural: &mut Vec<String>) {
        match v {
            Value::Array(a) => a.iter().for_each(|x| walk(x, in_visible, used, structural)),
            Value::Object(o) => {
                for (k, x) in o {
                    if k == "token" || k == "relationship" {
                        for name in option_template_names(x) {
                            if !used.contains(&name) {
                                used.push(name);
                            }
                        }
                    }
                    if k == "options" {
                        if let Some(opts) = x.as_object() {
                            for name in opts.keys() {
                                if !used.contains(name) {
                                    used.push(name.clone());
                                }
                                if in_visible && !structural.contains(name) {
                                    structural.push(name.clone());
                                }
                            }
                        }
                    }
                    walk(x, in_visible || k == "visibleWhen", used, structural);
                }
            }
            _ => {}
        }
    }
    let (mut used, mut structural) = (Vec::new(), Vec::new());
    walk(recipe, false, &mut used, &mut structural);
    if recipe.get("sizeScale").is_some() && !used.iter().any(|u| u == "size") {
        used.push("size".into());
    }
    (used, structural)
}

/// [`recipe_options`] for a recipe bound to a component's data: it also counts the component
/// options pinned (`scope.options`) by the relationships the recipe binds, since a recipe
/// that moves its conditions into relationships no longer names those options itself.
pub fn recipe_options_in(
    graph: &TokenGraph,
    recipe: &Value,
    component: &str,
) -> (Vec<String>, Vec<String>) {
    let (mut used, structural) = recipe_options(recipe);
    let mut contexts: Vec<String> = Vec::new();
    fn walk(v: &Value, out: &mut Vec<String>) {
        match v {
            Value::Array(a) => a.iter().for_each(|x| walk(x, out)),
            Value::Object(o) => {
                if let Some(c) = o
                    .get("relationship")
                    .and_then(|r| r.get("context"))
                    .and_then(Value::as_str)
                {
                    out.push(c.trim().to_string());
                }
                o.values().for_each(|x| walk(x, out));
            }
            _ => {}
        }
    }
    walk(recipe, &mut contexts);
    let declared: Vec<&str> = graph
        .components
        .iter()
        .find(|c| c.name == component)
        .and_then(|c| c.raw.get("options"))
        .and_then(Value::as_object)
        .map(|o| o.keys().map(String::as_str).collect())
        .unwrap_or_default();
    for r in &graph.relationships {
        let comp = r.raw.pointer("/scope/component").and_then(Value::as_str);
        let ctx = r.raw.get("context").and_then(Value::as_str).map(str::trim);
        if comp != Some(component) || !ctx.is_some_and(|c| contexts.iter().any(|x| x == c)) {
            continue;
        }
        let Some(opts) = r.raw.pointer("/scope/options").and_then(Value::as_object) else {
            continue;
        };
        for key in opts.keys() {
            let reserved = RELATIONSHIP_RESERVED_OPTIONS.contains(&key.as_str());
            if !reserved && declared.contains(&key.as_str()) && !used.contains(key) {
                used.push(key.clone());
            }
        }
    }
    (used, structural)
}

/// A component's option defaults, from its component schema.
fn component_option_defaults(graph: &TokenGraph, component: &str) -> HashMap<String, Value> {
    graph
        .components
        .iter()
        .find(|c| c.name == component)
        .and_then(|c| c.raw.get("options"))
        .and_then(Value::as_object)
        .map(|o| {
            o.iter()
                .filter_map(|(k, v)| v.get("default").map(|d| (k.clone(), d.clone())))
                .collect()
        })
        .unwrap_or_default()
}

/// Pre-resolve every token and relationship binding in a recipe so a renderer needs
/// no token graph. Each binding becomes a `candidates` list (`{value, token, states}`,
/// best mode fit first) per `size|colorScheme|scale`; the renderer only applies the
/// request's state preference, which cannot change the order.
pub fn compile_recipe(
    graph: &TokenGraph,
    recipe: &Value,
    component: &str,
    modes: &[HashMap<String, String>],
) -> Result<Value, String> {
    let scale = recipe
        .get("sizeScale")
        .and_then(Value::as_object)
        .ok_or("recipe has no sizeScale")?;
    let parts = recipe
        .get("parts")
        .and_then(Value::as_object)
        .ok_or("recipe has no parts")?;
    let option_defaults = component_option_defaults(graph, component);

    let lookup = Lookup::default();
    let scoped = lookup.scoped(graph, component);
    let mut variants = serde_json::Map::new();
    let mut drawings = serde_json::Map::new();
    for (size, idx) in scale {
        for mode in modes {
            let req = RenderRequest {
                component: component.into(),
                size: size.clone(),
                mode: mode.clone(),
                ..Default::default()
            };
            let cx = CompileCx {
                graph,
                lookup: &lookup,
                req: &req,
                size_index: value_to_string(idx).unwrap_or_default(),
                scoped: &scoped,
            };
            let key = format!(
                "{size}|{}|{}",
                mode.get("colorScheme").map_or("", String::as_str),
                mode.get("scale").map_or("", String::as_str)
            );
            let mut compiled = cx.compile_parts(parts);
            cx.attach_drawings(&mut compiled, &mut drawings, &option_defaults);
            variants.insert(key, Value::Object(compiled));
        }
    }
    Ok(serde_json::json!({
        "component": component,
        "root": recipe.get("root"),
        "sizeScale": recipe.get("sizeScale"),
        "optionDefaults": option_defaults,
        "variants": variants,
        "drawings": drawings,
    }))
}

/// Compile a recipe for the component, size and mode of `req` (the only parts of the
/// request that need the token graph). `lookup` memoizes graph scans across variants.
fn compile_variant(
    graph: &TokenGraph,
    recipe: &Value,
    req: &RenderRequest,
    lookup: &Lookup,
) -> Result<CompiledVariant, String> {
    let size_index = recipe
        .get("sizeScale")
        .and_then(|s| s.get(&req.size))
        .and_then(value_to_string)
        .ok_or_else(|| format!("recipe has no sizeScale entry for size '{}'", req.size))?;
    let parts = recipe
        .get("parts")
        .and_then(Value::as_object)
        .ok_or("recipe has no parts")?;
    let root = recipe
        .get("root")
        .and_then(Value::as_str)
        .ok_or("recipe has no root")?;
    if !parts.contains_key(root) {
        return Err("root part not found".into());
    }
    let scoped = lookup.scoped(graph, &req.component);
    let cx = CompileCx {
        graph,
        lookup,
        req,
        size_index,
        scoped: &scoped,
    };
    let option_defaults = component_option_defaults(graph, &req.component);
    let mut compiled = cx.compile_parts(parts);
    if let Some(IconOverride::Icon { set, name }) = &req.icon {
        for icon in compiled
            .values_mut()
            .filter_map(|p| p.get_mut("icon"))
            .filter(|i| i["content"] == true)
        {
            icon["set"] = set.clone().into();
            icon["name"] = name.clone().into();
        }
    }
    let mut drawings = serde_json::Map::new();
    cx.attach_drawings(&mut compiled, &mut drawings, &option_defaults);
    Ok(CompiledVariant {
        root: root.into(),
        option_defaults,
        parts: compiled,
        drawings,
    })
}

impl SceneCache {
    /// The compiled variant for `req`'s component, size and mode, compiling it on first use.
    fn variant(
        &self,
        graph: &TokenGraph,
        recipe: &Value,
        req: &RenderRequest,
    ) -> Result<std::rc::Rc<CompiledVariant>, String> {
        use std::hash::{Hash, Hasher};
        let mut modes: Vec<_> = req.mode.iter().collect();
        modes.sort();
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        recipe.to_string().hash(&mut hasher);
        let key = format!(
            "{}\u{1f}{}\u{1f}{modes:?}\u{1f}{:?}\u{1f}{:016x}",
            req.component,
            req.size,
            req.icon,
            hasher.finish()
        );
        if let Some(v) = self.variants.borrow().get(&key) {
            return Ok(v.clone());
        }
        let v = std::rc::Rc::new(compile_variant(graph, recipe, req, &self.lookup)?);
        self.variants.borrow_mut().insert(key, v.clone());
        Ok(v)
    }
}

/// Resolve a recipe against the graph for one request and lay it out:
/// [`compile_variant`] then [`solve`].
pub fn build_scene(
    graph: &TokenGraph,
    recipe: &Value,
    req: &RenderRequest,
) -> Result<Scene, String> {
    build_scene_cached(graph, recipe, req, &SceneCache::default())
}

/// Like [`build_scene`], reusing compiled variants from `cache`. Use one cache per graph
/// when rendering many requests (a matrix); results are identical.
pub fn build_scene_cached(
    graph: &TokenGraph,
    recipe: &Value,
    req: &RenderRequest,
    cache: &SceneCache,
) -> Result<Scene, String> {
    solve(&*cache.variant(graph, recipe, req)?, req)
}

/// Lay out a compiled variant for one request: choose candidates by state, option and
/// `when`, then place the parts. A pure function of its arguments; it needs no token graph.
/// `req` must have the size and mode the variant was compiled for.
pub fn solve(variant: &CompiledVariant, req: &RenderRequest) -> Result<Scene, String> {
    let parts = &variant.parts;
    let root_id = variant.root.as_str();
    let root = parts.get(root_id).ok_or("root part not found")?;
    let mut cx = Ctx {
        req,
        option_defaults: &variant.option_defaults,
        diags: Vec::new(),
    };
    let rp = |cx: &mut Ctx, part: &Value, name: &str| -> Option<Resolved> {
        debug_assert!(
            reads_prop(part, std::ptr::eq(part, root), name),
            "the solver reads prop '{name}' on a {} part, but READ_PROPS does not list it",
            part_role(part, std::ptr::eq(part, root))
        );
        cx.eval(part.get("props").and_then(|p| p.get(name)))
    };

    let mut container_tokens = Vec::new();
    let token_ref = |prop: &str, r: &Option<Resolved>| -> Option<TokenRef> {
        r.as_ref()
            .filter(|r| !r.token.is_empty())
            .map(|r| TokenRef {
                prop: prop.into(),
                token: r.token.clone(),
                value: r.value.clone(),
                chain: r.chain.clone(),
                relationship: r.relationship.clone(),
            })
    };
    let track = |tokens: &mut Vec<TokenRef>, prop: &str, r: &Option<Resolved>| {
        tokens.extend(token_ref(prop, r));
    };

    let height = rp(&mut cx, root, "height");
    let pad_s = rp(&mut cx, root, "paddingInlineStart");
    let pad_e = rp(&mut cx, root, "paddingInlineEnd");
    let pad_bs = rp(&mut cx, root, "paddingBlockStart");
    let pad_be = rp(&mut cx, root, "paddingBlockEnd");
    let gap = rp(&mut cx, root, "gap");
    let radius = rp(&mut cx, root, "cornerRadius");
    let fill = rp(&mut cx, root, "fill");
    let stroke = rp(&mut cx, root, "stroke");
    let stroke_w = rp(&mut cx, root, "strokeWidth");
    let corner_names = [
        "cornerRadiusStartStart",
        "cornerRadiusStartEnd",
        "cornerRadiusEndEnd",
        "cornerRadiusEndStart",
    ];
    let corners: Vec<Option<Resolved>> =
        corner_names.iter().map(|n| rp(&mut cx, root, n)).collect();
    for (n, r) in corner_names.iter().zip(&corners) {
        track(&mut container_tokens, n, r);
    }
    for (n, r) in [
        ("stroke", &stroke),
        ("strokeWidth", &stroke_w),
        ("height", &height),
        ("paddingInlineStart", &pad_s),
        ("paddingInlineEnd", &pad_e),
        ("paddingBlockStart", &pad_bs),
        ("paddingBlockEnd", &pad_be),
        ("gap", &gap),
        ("cornerRadius", &radius),
        ("fill", &fill),
    ] {
        track(&mut container_tokens, n, r);
    }
    let [m_height, m_pad_s, m_pad_e, m_pad_bs, m_pad_be, m_gap, m_radius] = [
        ("height", &height),
        ("paddingInlineStart", &pad_s),
        ("paddingInlineEnd", &pad_e),
        ("paddingBlockStart", &pad_bs),
        ("paddingBlockEnd", &pad_be),
        ("gap", &gap),
        ("cornerRadius", &radius),
    ]
    .map(|(n, r)| token_ref(n, r));
    let explicit_h = height.as_ref().and_then(Resolved::num);
    let block_padded = pad_bs.is_some() || pad_be.is_some();
    let pad_bs = pad_bs.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_be = pad_be.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_s = pad_s.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_e = pad_e.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let gap = gap.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let direction = rp(&mut cx, root, "direction");
    let align = rp(&mut cx, root, "align");
    let justify = rp(&mut cx, root, "justify");
    let column = layout_keyword(&mut cx, "direction", &direction, &["row", "column"]) == "column";
    let align = layout_keyword(&mut cx, "align", &align, &["start", "center", "end"]);
    let justify = layout_keyword(&mut cx, "justify", &justify, &["start", "center", "end"]);
    let press_diff = rp(&mut cx, root, "pressDifference");
    let press_ratio = rp(&mut cx, root, "pressWidthRatio");
    let press_min = rp(&mut cx, root, "pressMinPerspective");
    let press_max = rp(&mut cx, root, "pressMaxPerspective");
    let opacity = rp(&mut cx, root, "opacity");
    for (n, r) in [
        ("pressDifference", &press_diff),
        ("pressWidthRatio", &press_ratio),
        ("pressMinPerspective", &press_min),
        ("pressMaxPerspective", &press_max),
        ("opacity", &opacity),
    ] {
        track(&mut container_tokens, n, r);
    }

    // Flow children (placement-free) first to compute the intrinsic width.
    struct Child {
        id: String,
        kind: String,
        w: f64,
        h: f64,
        text: Option<String>,
        font_size: f64,
        font_weight: Option<String>,
        font_family: Option<String>,
        color: Option<String>,
        stroke: Option<String>,
        fill: Option<String>,
        stroke_width: f64,
        radius: Option<Resolved>,
        tokens: Vec<TokenRef>,
        row: Option<Row>,
    }
    // A flowed box with a bound `direction` lays its children out in a row. Items keep their
    // outer size (a text part includes its padding) and the offset of the node inside it.
    struct RowItem {
        node: SceneNode,
        ow: f64,
        oh: f64,
        ox: f64,
        oy: f64,
    }
    struct Row {
        items: Vec<RowItem>,
        align: String,
        gap: f64,
        pad_s: f64,
        pad_bs: f64,
        pad_be: f64,
    }
    let mut flow: Vec<Child> = Vec::new();
    let mut placed: Vec<(String, &Value)> = Vec::new();
    let child_ids: Vec<String> = root
        .get("children")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    for id in &child_ids {
        let Some(part) = parts.get(id) else { continue };
        if !cx.visible(part) {
            continue;
        }
        if part.get("placement").is_some() {
            placed.push((id.clone(), part));
            continue;
        }
        let kind = part.get("kind").and_then(Value::as_str).unwrap_or("box");
        let mut tokens = Vec::new();
        let color = rp(&mut cx, part, "color");
        track(&mut tokens, "color", &color);
        let mut c = Child {
            id: id.clone(),
            kind: kind.into(),
            w: 0.0,
            h: 0.0,
            text: None,
            font_size: 0.0,
            font_weight: None,
            font_family: None,
            color: color.map(|c| c.value),
            stroke: None,
            fill: None,
            stroke_width: 0.0,
            radius: None,
            tokens,
            row: None,
        };
        match kind {
            "box" => {
                let w = rp(&mut cx, part, "width");
                let bh = rp(&mut cx, part, "height");
                track(&mut c.tokens, "width", &w);
                track(&mut c.tokens, "height", &bh);
                c.w = w.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                c.h = bh.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                c.radius = rp(&mut cx, part, "cornerRadius");
                track(&mut c.tokens, "cornerRadius", &c.radius);
                // A flowed box paints itself and hosts its children, like a nested box.
                let bfill = rp(&mut cx, part, "fill");
                let bstroke = rp(&mut cx, part, "stroke");
                let bsw = rp(&mut cx, part, "strokeWidth");
                track(&mut c.tokens, "fill", &bfill);
                track(&mut c.tokens, "stroke", &bstroke);
                track(&mut c.tokens, "strokeWidth", &bsw);
                c.fill = bfill.map(|f| f.value);
                c.stroke = bstroke.map(|s| s.value);
                c.stroke_width = bsw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                let mut pads = [0.0; 4];
                for (i, n) in [
                    "paddingInlineStart",
                    "paddingInlineEnd",
                    "paddingBlockStart",
                    "paddingBlockEnd",
                ]
                .iter()
                .enumerate()
                {
                    let r = rp(&mut cx, part, n);
                    track(&mut c.tokens, n, &r);
                    pads[i] = r.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                }
                let rdir = rp(&mut cx, part, "direction");
                if rdir.is_none() {
                    if bh.is_none() {
                        c.h = pads[2] + pads[3];
                    }
                } else {
                    layout_keyword(&mut cx, "direction", &rdir, &["row"]);
                    let ralign = rp(&mut cx, part, "align");
                    let ralign =
                        layout_keyword(&mut cx, "align", &ralign, &["start", "center", "end"]);
                    let rgap = rp(&mut cx, part, "gap");
                    track(&mut c.tokens, "gap", &rgap);
                    let rgap = rgap.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                    let ids: Vec<String> = part
                        .get("children")
                        .and_then(Value::as_array)
                        .map(|a| {
                            a.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .unwrap_or_default();
                    let mut items: Vec<RowItem> = Vec::new();
                    for nid in ids {
                        let Some(np) = parts.get(&nid) else { continue };
                        if !cx.visible(np) {
                            continue;
                        }
                        let nkind = np.get("kind").and_then(Value::as_str).unwrap_or("box");
                        let mut tokens = Vec::new();
                        let mut node = SceneNode {
                            part: nid.clone(),
                            kind: nkind.into(),
                            x: 0.0,
                            y: 0.0,
                            w: 0.0,
                            h: 0.0,
                            fill: None,
                            stroke: None,
                            stroke_width: 0.0,
                            radius: 0.0,
                            radii: None,
                            text: None,
                            font_size: 0.0,
                            font_weight: None,
                            font_family: None,
                            color: None,
                            icon: None,
                            rotation: None,
                            tokens: Vec::new(),
                        };
                        let nw = rp(&mut cx, np, "width");
                        let nh = rp(&mut cx, np, "height");
                        let color = rp(&mut cx, np, "color");
                        track(&mut tokens, "width", &nw);
                        track(&mut tokens, "height", &nh);
                        track(&mut tokens, "color", &color);
                        node.color = color.map(|c| c.value);
                        let (ow, oh);
                        let (mut ox, mut oy) = (0.0, 0.0);
                        match nkind {
                            "icon" => {
                                node.w = nw.as_ref().and_then(Resolved::num).unwrap_or(16.0);
                                node.h = nh.as_ref().and_then(Resolved::num).unwrap_or(node.w);
                                let rot = rp(&mut cx, np, "rotation");
                                track(&mut tokens, "rotation", &rot);
                                node.rotation = rot.as_ref().and_then(Resolved::num);
                                (ow, oh) = (node.w, node.h);
                            }
                            "text" => {
                                let fs = rp(&mut cx, np, "fontSize");
                                let fw = rp(&mut cx, np, "fontWeight");
                                let ff = rp(&mut cx, np, "fontFamily");
                                let lh = rp(&mut cx, np, "lineHeight");
                                track(&mut tokens, "fontSize", &fs);
                                track(&mut tokens, "fontWeight", &fw);
                                track(&mut tokens, "fontFamily", &ff);
                                track(&mut tokens, "lineHeight", &lh);
                                let mut tp = [0.0; 4];
                                for (i, n) in [
                                    "paddingInlineStart",
                                    "paddingInlineEnd",
                                    "paddingBlockStart",
                                    "paddingBlockEnd",
                                ]
                                .iter()
                                .enumerate()
                                {
                                    let r = rp(&mut cx, np, n);
                                    track(&mut tokens, n, &r);
                                    tp[i] = r.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                }
                                node.font_family = ff.map(|f| f.value);
                                node.font_size =
                                    fs.as_ref().and_then(Resolved::num).unwrap_or(14.0);
                                node.font_weight = fw.map(|f| f.value);
                                node.text = Some(req.label.clone());
                                node.w = text_width(&req.label, node.font_size);
                                node.h = line_height(lh.as_ref(), node.font_size);
                                (ow, oh) = (node.w + tp[0] + tp[1], node.h + tp[2] + tp[3]);
                                (ox, oy) = (tp[0], tp[2]);
                            }
                            _ => {
                                let nfill = rp(&mut cx, np, "fill");
                                let nstroke = rp(&mut cx, np, "stroke");
                                let nsw = rp(&mut cx, np, "strokeWidth");
                                let nr = rp(&mut cx, np, "cornerRadius");
                                for (n, r) in [
                                    ("fill", &nfill),
                                    ("stroke", &nstroke),
                                    ("strokeWidth", &nsw),
                                    ("cornerRadius", &nr),
                                ] {
                                    track(&mut tokens, n, r);
                                }
                                node.w = nw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                node.h = nh.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                node.fill = nfill.map(|f| f.value);
                                node.stroke = nstroke.map(|s| s.value);
                                node.stroke_width =
                                    nsw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                node.radius = clamp_radius(
                                    nr.as_ref()
                                        .and_then(|r| {
                                            r.num().map(|v| match r.relative_to.as_deref() {
                                                Some("height") => v * node.h,
                                                _ => v,
                                            })
                                        })
                                        .unwrap_or(0.0),
                                    node.w,
                                    node.h,
                                );
                                (ow, oh) = (node.w, node.h);
                            }
                        }
                        node.tokens = tokens;
                        items.push(RowItem {
                            node,
                            ow,
                            oh,
                            ox,
                            oy,
                        });
                    }
                    let sum = items.iter().map(|i| i.ow).sum::<f64>()
                        + rgap * items.len().saturating_sub(1) as f64;
                    let tall = items.iter().map(|i| i.oh).fold(0.0, f64::max);
                    if w.is_none() {
                        c.w = pads[0] + sum + pads[1];
                    }
                    if bh.is_none() {
                        c.h = tall + pads[2] + pads[3];
                    }
                    c.row = Some(Row {
                        items,
                        align: ralign,
                        gap: rgap,
                        pad_s: pads[0],
                        pad_bs: pads[2],
                        pad_be: pads[3],
                    });
                }
            }
            "icon" | "progress" => {
                let w = rp(&mut cx, part, "width");
                let ih = rp(&mut cx, part, "height");
                track(&mut c.tokens, "width", &w);
                track(&mut c.tokens, "height", &ih);
                c.w = w.as_ref().and_then(Resolved::num).unwrap_or(16.0);
                c.h = ih.as_ref().and_then(Resolved::num).unwrap_or(c.w);
                if kind == "progress" {
                    let tc = rp(&mut cx, part, "trackColor");
                    track(&mut c.tokens, "trackColor", &tc);
                    c.stroke = tc.map(|t| t.value);
                }
            }
            "text" => {
                let fs = rp(&mut cx, part, "fontSize");
                let fw = rp(&mut cx, part, "fontWeight");
                track(&mut c.tokens, "fontSize", &fs);
                track(&mut c.tokens, "fontWeight", &fw);
                let ff = rp(&mut cx, part, "fontFamily");
                let lh = rp(&mut cx, part, "lineHeight");
                track(&mut c.tokens, "fontFamily", &ff);
                track(&mut c.tokens, "lineHeight", &lh);
                c.font_family = ff.map(|f| f.value);
                c.font_size = fs.as_ref().and_then(Resolved::num).unwrap_or(14.0);
                c.font_weight = fw.map(|f| f.value);
                let text = req.label.clone();
                c.w = text_width(&text, c.font_size);
                if let Some(r) = lh.as_ref().filter(|r| r.num().is_none()) {
                    cx.diags.push(format!(
                        "lineHeight '{}' is not a number or px value; using 1.3 x font size",
                        r.value
                    ));
                }
                c.h = line_height(lh.as_ref(), c.font_size);
                c.text = Some(text);
            }
            _ => {}
        }
        flow.push(c);
    }

    // As in Figma, an icon taller than the label line adds only the line height to the row,
    // so the icon overflows the content box evenly instead of growing the container.
    let line = flow
        .iter()
        .filter(|c| c.kind == "text")
        .map(|c| c.h)
        .fold(0.0, f64::max);
    let gaps = gap * flow.len().saturating_sub(1) as f64;
    let widest = flow.iter().map(|c| c.w).fold(0.0, f64::max);
    let tallest = flow
        .iter()
        .map(|c| {
            if c.kind == "icon" && line > 0.0 {
                c.h.min(line)
            } else {
                c.h
            }
        })
        .fold(0.0, f64::max);
    let sum_w = flow.iter().map(|c| c.w).sum::<f64>() + gaps;
    let sum_h = flow.iter().map(|c| c.h).sum::<f64>() + gaps;
    let w = pad_s + if column { widest } else { sum_w } + pad_e;
    // An unset `height` is the content plus the block padding: the tallest flowed child in a
    // row (only when the recipe binds block padding; otherwise the 32 default), or the
    // stacked children in a column.
    let h = explicit_h.unwrap_or(if column {
        sum_h + pad_bs + pad_be
    } else if block_padded {
        tallest + pad_bs + pad_be
    } else {
        32.0
    });

    let ox = RING_MARGIN;
    let oy = RING_MARGIN;
    let to_px = |r: &Resolved| {
        r.num().map(|v| match r.relative_to.as_deref() {
            Some("height") => v * h,
            _ => v,
        })
    };
    let root_radius = radius.as_ref().and_then(to_px).unwrap_or(0.0);
    // Logical corners resolve left-to-right: start-start is top-left.
    let [ss, se, ee, es] =
        [0, 1, 2, 3].map(|i| corners[i].as_ref().and_then(to_px).unwrap_or(root_radius));
    let radii = (corners.iter().any(Option::is_some) && !(ss == se && se == ee && ee == es))
        .then_some([ss, se, ee, es]);
    // Uniform corner props override `cornerRadius`; mixed corners keep it as the ring basis.
    let root_radius = if corners.iter().any(Option::is_some) && radii.is_none() {
        ss
    } else {
        root_radius
    };
    let root_radius = if radii.is_none() {
        clamp_radius(root_radius, w, h)
    } else {
        root_radius
    };
    let mut nodes = vec![SceneNode {
        part: root_id.into(),
        kind: "box".into(),
        x: ox,
        y: oy,
        w,
        h,
        fill: fill.map(|f| f.value),
        stroke: stroke.map(|s| s.value),
        stroke_width: stroke_w.as_ref().and_then(Resolved::num).unwrap_or(0.0),
        radius: root_radius,
        radii,
        text: None,
        font_size: 0.0,
        font_weight: None,
        font_family: None,
        color: None,
        icon: None,
        rotation: None,
        tokens: container_tokens,
    }];

    let mut measurements = Vec::new();
    {
        let mut add = |kind: &str, t: Option<TokenRef>, (x, y, w, h): (f64, f64, f64, f64)| {
            // A padding that resolves to 0 has no span to draw.
            if kind == "padding" && (w <= 0.0 || h <= 0.0) {
                return;
            }
            if let Some(token) = t {
                measurements.push(Measurement {
                    kind: kind.into(),
                    part: root_id.into(),
                    prop: token.prop.clone(),
                    x,
                    y,
                    w,
                    h,
                    token,
                });
            }
        };
        add("height", m_height, (ox, oy, w, h));
        add("padding", m_pad_s, (ox, oy, pad_s, h));
        add("padding", m_pad_e, (ox + w - pad_e, oy, pad_e, h));
        add("padding", m_pad_bs, (ox, oy, w, pad_bs));
        add("padding", m_pad_be, (ox, oy + h - pad_be, w, pad_be));
        add("radius", m_radius, (ox, oy, root_radius, root_radius));
    }

    let px = |r: &Option<Resolved>, basis: f64| -> f64 {
        r.as_ref()
            .and_then(|r| {
                r.num().map(|v| match r.relative_to.as_deref() {
                    Some("height") => v * basis,
                    _ => v,
                })
            })
            .unwrap_or(0.0)
    };
    let layout = Layout {
        gap: (flow.len() > 1).then_some(gap),
        padding: [pad_bs, pad_e, pad_be, pad_s],
    };
    let mut x = ox + pad_s;
    let mut y = oy
        + pad_bs
        + if column {
            axis_offset(&justify, h - pad_bs - pad_be - sum_h)
        } else {
            0.0
        };
    let mut gap_from: Option<f64> = None;
    for mut c in flow {
        // A column stretches a box that has no width of its own across its inner width.
        let cw = if column && c.kind == "box" && c.w == 0.0 {
            w - pad_s - pad_e
        } else {
            c.w
        };
        let (cx0, cy0) = if column {
            (x + axis_offset(&align, w - pad_s - pad_e - cw), y)
        } else {
            (
                x,
                oy + pad_bs + axis_offset(&align, h - pad_bs - pad_be - c.h),
            )
        };
        let ch = c.h;
        if let Some(from) = gap_from {
            if let Some(token) = m_gap.clone() {
                let span = if column {
                    (cx0, from, cw, gap)
                } else {
                    (from, cy0, gap, ch)
                };
                measurements.push(Measurement {
                    kind: "gap".into(),
                    part: c.id.clone(),
                    prop: token.prop.clone(),
                    x: span.0,
                    y: span.1,
                    w: span.2,
                    h: span.3,
                    token,
                });
            }
        }
        gap_from = Some(if column { cy0 + ch } else { cx0 + cw });
        let row = c.row.take();
        let nested_ids: Vec<String> = parts
            .get(&c.id)
            .and_then(|p| p.get("children"))
            .and_then(Value::as_array)
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();
        let mut own = SceneNode {
            part: c.id.clone(),
            kind: c.kind.clone(),
            x: cx0,
            y: cy0,
            w: cw,
            h: ch,
            fill: c.fill,
            stroke: c.stroke,
            stroke_width: c.stroke_width,
            radius: 0.0,
            radii: None,
            text: c.text,
            font_size: c.font_size,
            font_weight: c.font_weight,
            font_family: c.font_family,
            color: c.color,
            icon: None,
            rotation: None,
            tokens: c.tokens,
        };
        if c.kind == "box" {
            own.radius = clamp_radius(px(&c.radius, ch), cw, ch);
        }
        nodes.push(own);
        if column {
            y += ch + gap;
        } else {
            x += cw + gap;
        }
        if let Some(row) = row {
            let inner_h = ch - row.pad_bs - row.pad_be;
            let mut rx = cx0 + row.pad_s;
            for mut it in row.items {
                it.node.x = rx + it.ox;
                it.node.y = cy0 + row.pad_bs + axis_offset(&row.align, inner_h - it.oh) + it.oy;
                rx += it.ow + row.gap;
                nodes.push(it.node);
            }
            continue;
        }

        // A box's children sit inside it: centered across, and at the start, center or end
        // along the inline axis. The inset equals the cross-axis gap, so a part shorter than
        // the box is centered and one as tall as the box fills it.
        for nid in nested_ids {
            let Some(np) = parts.get(&nid) else { continue };
            if !cx.visible(np) {
                continue;
            }
            let mut tokens = Vec::new();
            let nw = rp(&mut cx, np, "width");
            let nh = rp(&mut cx, np, "height");
            if np.get("kind").and_then(Value::as_str) == Some("icon") {
                // An icon inside a box is centered on both axes.
                let color = rp(&mut cx, np, "color");
                let rot = rp(&mut cx, np, "rotation");
                track(&mut tokens, "width", &nw);
                track(&mut tokens, "height", &nh);
                track(&mut tokens, "color", &color);
                track(&mut tokens, "rotation", &rot);
                let w2 = nw.as_ref().and_then(Resolved::num).unwrap_or(cw);
                let h2 = nh.as_ref().and_then(Resolved::num).unwrap_or(w2);
                nodes.push(SceneNode {
                    part: nid,
                    kind: "icon".into(),
                    x: cx0 + (cw - w2) / 2.0,
                    y: cy0 + (ch - h2) / 2.0,
                    w: w2,
                    h: h2,
                    fill: None,
                    stroke: None,
                    stroke_width: 0.0,
                    radius: 0.0,
                    radii: None,
                    text: None,
                    font_size: 0.0,
                    font_weight: None,
                    font_family: None,
                    color: color.map(|c| c.value),
                    icon: None,
                    rotation: rot.as_ref().and_then(Resolved::num),
                    tokens,
                });
                continue;
            }
            let nfill = rp(&mut cx, np, "fill");
            let nstroke = rp(&mut cx, np, "stroke");
            let nsw = rp(&mut cx, np, "strokeWidth");
            let nradius = rp(&mut cx, np, "cornerRadius");
            let justify = rp(&mut cx, np, "justify");
            for (n, r) in [
                ("width", &nw),
                ("height", &nh),
                ("fill", &nfill),
                ("stroke", &nstroke),
                ("strokeWidth", &nsw),
                ("cornerRadius", &nradius),
                ("justify", &justify),
            ] {
                track(&mut tokens, n, r);
            }
            let w2 = nw.as_ref().and_then(Resolved::num).unwrap_or(cw);
            let h2 = nh.as_ref().and_then(Resolved::num).unwrap_or(ch);
            let inset = (ch - h2) / 2.0;
            let nx = match justify.as_ref().map(|j| j.value.as_str()) {
                Some("end") => cx0 + cw - w2 - inset,
                Some("center") => cx0 + (cw - w2) / 2.0,
                _ => cx0 + inset,
            };
            nodes.push(SceneNode {
                part: nid,
                kind: "box".into(),
                x: nx,
                y: cy0 + inset,
                w: w2,
                h: h2,
                fill: nfill.map(|f| f.value),
                stroke: nstroke.map(|s| s.value),
                stroke_width: nsw.as_ref().and_then(Resolved::num).unwrap_or(0.0),
                radius: clamp_radius(px(&nradius, h2), w2, h2),
                radii: None,
                text: None,
                font_size: 0.0,
                font_weight: None,
                font_family: None,
                color: None,
                icon: None,
                rotation: None,
                tokens,
            });
        }
    }

    for (id, part) in placed {
        let inset = cx
            .eval(part.get("placement").and_then(|p| p.get("inset")))
            .and_then(|r| r.num())
            .unwrap_or(0.0);
        let size = 6.0;
        let color = rp(&mut cx, part, "color");
        let mut tokens = Vec::new();
        track(&mut tokens, "color", &color);
        nodes.push(SceneNode {
            part: id,
            kind: "icon".into(),
            x: ox + w - inset - size,
            y: oy + h - inset - size,
            w: size,
            h: size,
            fill: None,
            stroke: None,
            stroke_width: 0.0,
            radius: 0.0,
            radii: None,
            text: None,
            font_size: 0.0,
            font_weight: None,
            font_family: None,
            color: color.map(|c| c.value),
            icon: None,
            rotation: None,
            tokens,
        });
    }

    // Token-bound sizes of the laid-out parts. The root's height, padding, gap and radius are
    // measured above; its width is content-sized, so only its border is added here.
    for (i, n) in nodes.iter().enumerate() {
        for t in &n.tokens {
            let (kind, span) = match (t.prop.as_str(), i) {
                ("width", 1..) => ("width", (n.x, n.y, n.w, n.h)),
                ("height", 1..) => ("height", (n.x, n.y, n.w, n.h)),
                ("cornerRadius", 1..) => ("radius", (n.x, n.y, n.radius, n.radius)),
                ("strokeWidth", _) => ("border", (n.x, n.y, n.w, n.stroke_width)),
                (
                    "paddingInlineStart" | "paddingInlineEnd" | "paddingBlockStart"
                    | "paddingBlockEnd",
                    1..,
                ) => {
                    let Some(v) = t
                        .value
                        .trim()
                        .trim_end_matches("px")
                        .trim()
                        .parse::<f64>()
                        .ok()
                    else {
                        continue;
                    };
                    // A text part's padding lies outside its node; a box's lies inside it.
                    let out = n.kind == "text";
                    let (x, y, w, h) = (n.x, n.y, n.w, n.h);
                    let span = match (t.prop.as_str(), out) {
                        ("paddingInlineStart", true) => (x - v, y, v, h),
                        ("paddingInlineStart", false) => (x, y, v, h),
                        ("paddingInlineEnd", true) => (x + w, y, v, h),
                        ("paddingInlineEnd", false) => (x + w - v, y, v, h),
                        ("paddingBlockStart", true) => (x, y - v, w, v),
                        ("paddingBlockStart", false) => (x, y, w, v),
                        (_, true) => (x, y + h, w, v),
                        (_, false) => (x, y + h - v, w, v),
                    };
                    ("padding", span)
                }
                _ => continue,
            };
            if span.2 <= 0.0 || span.3 <= 0.0 {
                continue;
            }
            measurements.push(Measurement {
                kind: kind.into(),
                part: n.part.clone(),
                prop: t.prop.clone(),
                x: span.0,
                y: span.1,
                w: span.2,
                h: span.3,
                token: t.clone(),
            });
        }
    }

    // Rings wrap the root, or the part named by `around`, outside its box.
    for (id, part) in parts {
        if part.get("kind").and_then(Value::as_str) != Some("ring") || !cx.visible(part) {
            continue;
        }
        let stroke = rp(&mut cx, part, "stroke");
        let sw = rp(&mut cx, part, "strokeWidth");
        let gp = rp(&mut cx, part, "gapToParent");
        let mut tokens = Vec::new();
        track(&mut tokens, "stroke", &stroke);
        track(&mut tokens, "strokeWidth", &sw);
        track(&mut tokens, "gapToParent", &gp);
        let sw_n = sw.as_ref().and_then(Resolved::num).unwrap_or(2.0);
        let off = gp.as_ref().and_then(Resolved::num).unwrap_or(2.0) + sw_n / 2.0;
        let target = part
            .get("around")
            .and_then(Value::as_str)
            .and_then(|t| nodes.iter().find(|n| n.part == t))
            .unwrap_or(&nodes[0]);
        let (tx, ty, tw, th, r0) = (target.x, target.y, target.w, target.h, target.radius);
        let gap_n = gp.as_ref().and_then(Resolved::num).unwrap_or(2.0);
        for (kind, r, span) in [
            ("focus-thickness", &sw, (tx, ty - gap_n - sw_n, tw, sw_n)),
            ("focus-gap", &gp, (tx, ty - gap_n, tw, gap_n)),
        ] {
            if let Some(token) = token_ref(
                if kind == "focus-gap" {
                    "gapToParent"
                } else {
                    "strokeWidth"
                },
                r,
            ) {
                measurements.push(Measurement {
                    kind: kind.into(),
                    part: id.clone(),
                    prop: token.prop.clone(),
                    x: span.0,
                    y: span.1,
                    w: span.2,
                    h: span.3,
                    token,
                });
            }
        }
        nodes.push(SceneNode {
            part: id.clone(),
            kind: "ring".into(),
            x: tx - off,
            y: ty - off,
            w: tw + 2.0 * off,
            h: th + 2.0 * off,
            fill: None,
            stroke: stroke.map(|s| s.value),
            stroke_width: sw_n,
            radius: r0 + off,
            radii: None,
            text: None,
            font_size: 0.0,
            font_weight: None,
            font_family: None,
            color: None,
            icon: None,
            rotation: None,
            tokens,
        });
    }

    // Pressed scale-down: CSS `perspective(p) translateZ(z)` scales by p / (p - z), where
    // p = clamp(width * ratio, min, max).
    let press = match (
        press_diff.as_ref().and_then(Resolved::num),
        press_ratio.as_ref().and_then(Resolved::num),
    ) {
        (Some(z), Some(ratio)) => {
            let lo = press_min.as_ref().and_then(Resolved::num).unwrap_or(0.0);
            let hi = press_max
                .as_ref()
                .and_then(Resolved::num)
                .unwrap_or(f64::MAX);
            let part = root
                .get("pressTarget")
                .and_then(Value::as_str)
                .map(String::from);
            let target = part
                .as_deref()
                .and_then(|t| nodes.iter().find(|n| n.part == t))
                .unwrap_or(&nodes[0]);
            let p = (target.w * ratio).max(lo).min(hi);
            let mut nested = Vec::new();
            if let Some(t) = part.as_deref() {
                collect_nested(parts, t, &mut nested);
            }
            if let Some(token) = token_ref("pressWidthRatio", &press_ratio) {
                measurements.push(Measurement {
                    kind: "press".into(),
                    part: target.part.clone(),
                    prop: token.prop.clone(),
                    x: target.x,
                    y: target.y,
                    w: target.w,
                    h: target.h,
                    token,
                });
            }
            Some(Press {
                nested,
                scale: p / (p - z),
                cx: target.x + target.w / 2.0,
                cy: target.y + target.h / 2.0,
                part,
            })
        }
        _ => None,
    };

    if req.icon == Some(IconOverride::None)
        && cx.option("isLabelHidden") == Value::Bool(true)
        && parts.values().any(|p| {
            is_content_icon(p) == (true, true) && cx.when_score(p.get("visibleWhen")).is_some()
        })
    {
        cx.diags
            .push("icon none with isLabelHidden leaves the component with nothing to draw".into());
    }

    // Every icon node names the icon its part references and carries its compiled drawing.
    for n in nodes.iter_mut().filter(|n| n.kind == "icon") {
        let Some(part) = parts.get(&n.part) else {
            continue;
        };
        if req.icon == Some(IconOverride::None) && is_content_icon(part) == (true, false) {
            cx.diags.push(format!(
                "icon none is not allowed on part '{}' (its icon is not optional); keeping the recipe's icon",
                n.part
            ));
        }
        n.icon = IconRef::of_part(part).map(|mut icon| {
            icon.drawing = part
                .get("drawing")
                .and_then(Value::as_str)
                .and_then(|k| variant.drawings.get(k))
                .cloned();
            icon
        });
        if let Some(miss) = part.get("drawingMiss").and_then(Value::as_str) {
            cx.diags.push(miss.to_string());
        }
    }

    Ok(Scene {
        component: req.component.clone(),
        width: w + 2.0 * RING_MARGIN,
        height: h + 2.0 * RING_MARGIN,
        press,
        measurements,
        opacity: opacity.as_ref().and_then(Resolved::num),
        nodes,
        layout,
        diagnostics: cx.diags,
    })
}

/// A root layout keyword (`direction`, `align`, `justify`): the first allowed value is the
/// default when unbound, `center` for `align` and `justify`. Any other value is a diagnostic.
fn layout_keyword(cx: &mut Ctx, name: &str, r: &Option<Resolved>, allowed: &[&str]) -> String {
    let default = if name == "direction" {
        allowed[0]
    } else {
        "center"
    };
    match r.as_ref().map(|r| r.value.trim()) {
        None => default.into(),
        Some(v) if allowed.contains(&v) => v.into(),
        Some(v) => {
            cx.diags
                .push(format!("{name} '{v}' is not one of {}", allowed.join(", ")));
            default.into()
        }
    }
}

/// Offset of a box inside `free` space along an axis for `start`, `center` or `end`.
fn axis_offset(mode: &str, free: f64) -> f64 {
    match mode {
        "start" => 0.0,
        "end" => free,
        _ => free / 2.0,
    }
}

/// A corner radius cannot exceed half the box's width or height, like CSS `border-radius`:
/// an oversized radius draws a pill, not an ellipse.
fn clamp_radius(r: f64, w: f64, h: f64) -> f64 {
    r.min(w / 2.0).min(h / 2.0)
}

/// Closed outline of a rect with independent corner radii `[tl, tr, br, bl]`.
fn rounded_path(x: f64, y: f64, w: f64, h: f64, r: [f64; 4]) -> String {
    let [tl, tr, br, bl] = r;
    format!(
        "M{} {}H{}A{tr} {tr} 0 0 1 {} {}V{}A{br} {br} 0 0 1 {} {}H{}A{bl} {bl} 0 0 1 {} {}V{}A{tl} {tl} 0 0 1 {} {}Z",
        x + tl,
        y,
        x + w - tr,
        x + w,
        y + tr,
        y + h - br,
        x + w - br,
        y + h,
        x + bl,
        x,
        y + h - bl,
        y + tl,
        x + tl,
        y
    )
}

const DEFAULT_FONT_STACK: &str =
    "adobe-clean-spectrum-vf, Adobe Clean, 'Source Sans 3', sans-serif";

const GENERIC_FAMILIES: &[&str] = &[
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
];

/// One family of a bound list. Quoted unless it is a generic keyword: an unquoted name with a
/// token that is not a CSS identifier (`Source Sans 3`) invalidates the whole declaration.
fn css_family_name(f: &str) -> String {
    let f = f.trim_matches(|c| c == '\'' || c == '"').trim();
    if GENERIC_FAMILIES.contains(&f) {
        f.to_string()
    } else {
        format!("'{}'", f.replace('\\', "\\\\").replace('\'', "\\'"))
    }
}

/// A bound family leads the default stack, so a family the browser lacks (an iOS-only one
/// such as SF Pro) falls through to it instead of the browser's serif default.
fn css_font_family(f: Option<&str>) -> String {
    let bound: Vec<String> = f
        .unwrap_or("")
        .split(',')
        .map(str::trim)
        .filter(|f| !f.is_empty())
        .map(css_family_name)
        .collect();
    if bound.is_empty() {
        DEFAULT_FONT_STACK.into()
    } else {
        format!("{}, {DEFAULT_FONT_STACK}", bound.join(", "))
    }
}

/// SVG needs numeric weights; tokens carry names such as `medium`.
pub(crate) fn css_font_weight(w: Option<&str>) -> String {
    match w.unwrap_or("400") {
        "thin" => "100",
        "extra-light" | "ultra-light" => "200",
        "light" => "300",
        "regular" | "normal" => "400",
        "medium" => "500",
        "semi-bold" | "semibold" => "600",
        "bold" => "700",
        "extra-bold" | "ultra-bold" => "800",
        "black" | "heavy" => "900",
        other => other,
    }
    .to_string()
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('"', "&quot;")
}

/// Collect the parts nested inside `id` (its recipe `children`, at any depth).
fn collect_nested(parts: &serde_json::Map<String, Value>, id: &str, out: &mut Vec<String>) {
    let kids = parts
        .get(id)
        .and_then(|p| p.get("children"))
        .and_then(Value::as_array);
    for kid in kids.into_iter().flatten().filter_map(Value::as_str) {
        if !out.iter().any(|o| o == kid) {
            out.push(kid.to_string());
            collect_nested(parts, kid, out);
        }
    }
}

/// Uniform scale `k` and offset `(tx, ty)` that fit an icon `viewBox` (`min-x min-y width
/// height`) into the box `x, y, w, h`, centered, for `translate(tx ty) scale(k)`. `None`
/// when the viewBox is not four numbers with a positive width and height.
pub fn icon_fit(view_box: &str, x: f64, y: f64, w: f64, h: f64) -> Option<(f64, f64, f64)> {
    let v: Vec<f64> = view_box
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|t| !t.is_empty())
        .map(str::parse)
        .collect::<Result<_, _>>()
        .ok()?;
    let [vx, vy, vw, vh] = v[..] else {
        return None;
    };
    if !(vw > 0.0 && vh > 0.0) {
        return None;
    }
    let k = (w / vw).min(h / vh);
    Some((
        k,
        x + (w - vw * k) / 2.0 - vx * k,
        y + (h - vh * k) / 2.0 - vy * k,
    ))
}

/// An icon node's drawing: a group that carries the part attributes and its rotation about
/// the box center, an unfilled rect of the part box (so the group measures as the box),
/// and the paths fitted into the box and filled with the node color. `None` without a
/// drawable `icon.drawing`.
fn icon_svg(n: &SceneNode, attrs: &str) -> Option<String> {
    let drawing = n.icon.as_ref()?.drawing.as_ref()?;
    let (k, tx, ty) = icon_fit(drawing.get("viewBox")?.as_str()?, n.x, n.y, n.w, n.h)?;
    let color = esc(n.color.as_deref().unwrap_or("currentColor"));
    let rot = n.rotation.filter(|r| *r != 0.0).map_or(String::new(), |r| {
        format!(
            " transform=\"rotate({r} {} {})\"",
            n.x + n.w / 2.0,
            n.y + n.h / 2.0
        )
    });
    let mut s = format!(
        "<g {attrs}{rot}><rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"none\"/><g transform=\"translate({tx} {ty}) scale({k})\">",
        n.x, n.y, n.w, n.h
    );
    for p in drawing.get("paths")?.as_array()? {
        let d = p.get("d").and_then(Value::as_str).unwrap_or_default();
        let rule = p
            .get("fillRule")
            .and_then(Value::as_str)
            .map_or(String::new(), |r| format!(" fill-rule=\"{}\"", esc(r)));
        let _ = write!(s, "<path d=\"{}\" fill=\"{color}\"{rule}/>", esc(d));
    }
    s.push_str("</g></g>");
    Some(s)
}

/// A plus sized to the part box, drawn for an icon with no drawing.
fn placeholder_svg(n: &SceneNode, attrs: &str) -> String {
    let (cx, cy) = (n.x + n.w / 2.0, n.y + n.h / 2.0);
    let r = n.w.min(n.h) * 0.35;
    format!(
        "<path {attrs} d=\"M{} {}H{}M{} {}V{}\" stroke=\"{}\" stroke-width=\"{}\" stroke-linecap=\"round\" fill=\"none\"/>",
        cx - r,
        cy,
        cx + r,
        cx,
        cy - r,
        cy + r,
        esc(n.color.as_deref().unwrap_or("currentColor")),
        (n.w / 10.0).max(1.0)
    )
}

/// Serialize a scene as SVG. Parts carry `data-part`; token bindings are `data-tokens`.
pub fn scene_to_svg(scene: &Scene) -> String {
    let mut s = String::new();
    let _ = write!(
        s,
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">",
        w = scene.width,
        h = scene.height
    );
    if let Some(o) = scene.opacity {
        let _ = write!(s, "<g opacity=\"{o}\">");
    }
    let press_open = |p: &Press| {
        format!(
            "<g transform=\"translate({} {}) scale({}) translate({} {})\">",
            p.cx, p.cy, p.scale, -p.cx, -p.cy
        )
    };
    if let Some(p) = scene.press.as_ref().filter(|p| p.part.is_none()) {
        s.push_str(&press_open(p));
    }
    // The scaled group wraps the target node and the nodes nested in it, which follow it.
    let press_span = scene.press.as_ref().and_then(|p| {
        let start = scene
            .nodes
            .iter()
            .position(|n| Some(n.part.as_str()) == p.part.as_deref())?;
        let len = scene.nodes[start + 1..]
            .iter()
            .take_while(|n| p.nested.contains(&n.part))
            .count();
        Some((start, start + len, p))
    });
    for (i, n) in scene.nodes.iter().enumerate() {
        let pressed = press_span.filter(|(start, _, _)| *start == i);
        if let Some((_, _, p)) = pressed {
            s.push_str(&press_open(p));
        }
        let toks = n
            .tokens
            .iter()
            .map(|t| format!("{}={}", t.prop, t.token))
            .collect::<Vec<_>>()
            .join(";");
        let attrs = format!(
            "data-part=\"{}\" data-tokens=\"{}\"",
            esc(&n.part),
            esc(&toks)
        );
        match n.kind.as_str() {
            "box" => {
                if let Some(r) = n.radii {
                    let _ = write!(
                        s,
                        "<path {attrs} d=\"{}\" fill=\"{}\"/>",
                        rounded_path(n.x, n.y, n.w, n.h, r),
                        esc(n.fill.as_deref().unwrap_or("none"))
                    );
                } else {
                    let _ = write!(
                        s,
                        "<rect {attrs} x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"{}\"/>",
                        n.x,
                        n.y,
                        n.w,
                        n.h,
                        n.radius,
                        esc(n.fill.as_deref().unwrap_or("none"))
                    );
                }
                if let (Some(c), true) = (n.stroke.as_deref(), n.stroke_width > 0.0) {
                    let i = n.stroke_width / 2.0;
                    if let Some(r) = n.radii {
                        let _ = write!(
                            s,
                            "<path d=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\"/>",
                            rounded_path(
                                n.x + i,
                                n.y + i,
                                n.w - n.stroke_width,
                                n.h - n.stroke_width,
                                r.map(|v| (v - i).max(0.0))
                            ),
                            esc(c),
                            n.stroke_width
                        );
                    } else {
                        let _ = write!(
                            s,
                            "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\"/>",
                            n.x + i,
                            n.y + i,
                            n.w - n.stroke_width,
                            n.h - n.stroke_width,
                            (n.radius - i).max(0.0),
                            esc(c),
                            n.stroke_width
                        );
                    }
                }
            }
            "ring" => {
                let _ = write!(
                    s,
                    "<rect {attrs} x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\"/>",
                    n.x,
                    n.y,
                    n.w,
                    n.h,
                    n.radius,
                    esc(n.stroke.as_deref().unwrap_or("none")),
                    n.stroke_width
                );
            }
            "text" => {
                let _ = write!(
                    s,
                    "<text {attrs} x=\"{}\" y=\"{}\" font-family=\"{}\" font-size=\"{}\" font-weight=\"{}\" dominant-baseline=\"central\" fill=\"{}\">{}</text>",
                    n.x,
                    n.y + n.h / 2.0,
                    esc(&css_font_family(n.font_family.as_deref())),
                    n.font_size,
                    esc(&css_font_weight(n.font_weight.as_deref())),
                    esc(n.color.as_deref().unwrap_or("currentColor")),
                    esc(n.text.as_deref().unwrap_or(""))
                );
            }
            "progress" => {
                let (cx, cy) = (n.x + n.w / 2.0, n.y + n.h / 2.0);
                let r = n.w.min(n.h) / 2.0 - n.w.min(n.h) / 18.0;
                let sw = (n.w.min(n.h) / 9.0).max(1.0);
                let _ = write!(
                    s,
                    "<g {attrs} fill=\"none\" stroke-width=\"{sw}\"><circle cx=\"{cx}\" cy=\"{cy}\" r=\"{r}\" stroke=\"{}\"/><path d=\"M{} {}A{r} {r} 0 0 1 {} {}\" stroke=\"{}\" stroke-linecap=\"round\"/></g>",
                    esc(n.stroke.as_deref().unwrap_or("none")),
                    cx,
                    cy - r,
                    cx + r,
                    cy,
                    esc(n.color.as_deref().unwrap_or("currentColor"))
                );
            }
            "icon" => {
                s.push_str(&icon_svg(n, &attrs).unwrap_or_else(|| placeholder_svg(n, &attrs)));
            }
            _ => {}
        }
        if press_span.is_some_and(|(_, end, _)| end == i) {
            s.push_str("</g>");
        }
    }
    if scene.press.as_ref().is_some_and(|p| p.part.is_none()) {
        s.push_str("</g>");
    }
    if scene.opacity.is_some() {
        s.push_str("</g>");
    }
    s.push_str("</svg>");
    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
    }

    fn load() -> (TokenGraph, Value) {
        let r = root();
        let g = TokenGraph::from_json_dir_with_catalogs(
            &r.join("tokens"),
            Some(&r.join("mode-sets")),
            Some(&r.join("components")),
        )
        .expect("graph")
        .with_relationships(
            TokenGraph::load_spec_relationships(&r.join("relationships")).expect("rels"),
        )
        .with_icons(TokenGraph::load_spec_icons(&r.join("icons")).expect("icons"));
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(r.join("visuals/action-button.json")).unwrap(),
        )
        .unwrap();
        (g, recipe)
    }

    fn req(states: &[&str]) -> RenderRequest {
        RenderRequest {
            component: "action-button".into(),
            size: "m".into(),
            states: states.iter().map(|s| s.to_string()).collect(),
            mode: [("colorScheme", "light"), ("scale", "desktop")]
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            label: "Action".into(),
            ..Default::default()
        }
    }

    fn stack(props: Value) -> Value {
        let lit = |v: Value| serde_json::json!({ "value": v });
        let mut p = serde_json::json!({
            "height": lit("100".into()),
            "paddingInlineStart": lit("10".into()),
            "paddingInlineEnd": lit("10".into()),
            "gap": lit("4".into()),
        });
        for (k, v) in props.as_object().unwrap() {
            p[k] = lit(v.clone());
        }
        let box_ = |w: &str, h: &str| {
            serde_json::json!({ "kind": "box", "props": {
                "width": lit(w.into()), "height": lit(h.into()) } })
        };
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["a", "b"], "props": p },
                "a": box_("20", "10"), "b": box_("40", "30")
            }
        })
    }

    #[test]
    fn root_layout_props_are_read() {
        let (g, _) = load();
        let place = |props: Value| {
            let scene = build_scene(&g, &stack(props), &req(&[])).unwrap();
            assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
            let o = &scene.nodes[0];
            let at = |id: &str| {
                let n = scene.nodes.iter().find(|n| n.part == id).unwrap();
                (n.x - o.x, n.y - o.y)
            };
            (o.w, o.h, at("a"), at("b"))
        };
        // Default: a row, centered across.
        let (w, h, a, b) = place(serde_json::json!({}));
        assert_eq!((w, h, a, b), (84.0, 100.0, (10.0, 45.0), (34.0, 35.0)));
        // A row aligned to the end.
        let (_, _, a, b) = place(serde_json::json!({ "align": "end" }));
        assert_eq!((a.1, b.1), (90.0, 70.0));
        // A column: as wide as the widest child, children stacked with the gap.
        let col = serde_json::json!({ "direction": "column" });
        let (w, h, a, b) = place(col);
        assert_eq!((w, h, a, b), (60.0, 100.0, (20.0, 28.0), (10.0, 42.0)));
        // A column pushed to the end and aligned to the start.
        let (_, _, a, b) =
            place(serde_json::json!({ "direction": "column", "justify": "end", "align": "start" }));
        assert_eq!((a, b), ((10.0, 56.0), (10.0, 70.0)));
        // An unknown value is a diagnostic and keeps the default.
        let scene = build_scene(
            &g,
            &stack(serde_json::json!({ "direction": "diagonal" })),
            &req(&[]),
        )
        .unwrap();
        assert_eq!(scene.diagnostics.len(), 1);
        assert_eq!(scene.nodes[0].w, 84.0);
    }

    #[test]
    fn a_row_box_lays_out_icon_and_text_and_a_column_stretches_a_plain_box() {
        let (g, _) = load();
        let lit = |v: Value| serde_json::json!({ "value": v });
        let recipe = serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["row", "bar"],
                    "props": { "direction": lit("column".into()), "align": lit("start".into()) } },
                "row": { "kind": "box", "children": ["i", "t"], "props": {
                    "direction": lit("row".into()), "gap": lit("4".into()),
                    "paddingInlineStart": lit("6".into()), "paddingInlineEnd": lit("6".into()),
                    "paddingBlockStart": lit("2".into()), "paddingBlockEnd": lit("2".into()) } },
                "i": { "kind": "icon", "icon": { "set": "ui", "name": "chevron" }, "props": {
                    "width": lit("10".into()), "rotation": lit(90.into()) } },
                "t": { "kind": "text", "props": { "fontSize": lit("10".into()),
                    "lineHeight": lit("20px".into()), "paddingInlineStart": lit("3".into()) } },
                "bar": { "kind": "box", "props": { "height": lit("1".into()) } }
            }
        });
        let scene = build_scene(&g, &recipe, &req(&[])).unwrap();
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
        let n = |id: &str| scene.nodes.iter().find(|n| n.part == id).unwrap();
        let (r, row, i, t, bar) = (n("r"), n("row"), n("i"), n("t"), n("bar"));
        let text_w = text_width("Action", 10.0);
        // 6 + icon 10 + gap 4 + (3 + text) + 6 wide, 2 + 20 + 2 high.
        assert_eq!((row.w, row.h), (29.0 + text_w, 24.0));
        assert_eq!((r.w, r.h), (row.w, 25.0));
        assert_eq!(
            (i.x - row.x, i.y - row.y, i.rotation),
            (6.0, 7.0, Some(90.0))
        );
        assert_eq!((t.x - row.x, t.y - row.y), (23.0, 2.0));
        assert_eq!((bar.w, bar.y - row.y), (row.w, 24.0));
    }

    #[test]
    fn action_button_default_geometry() {
        let (g, recipe) = load();
        let scene = build_scene(&g, &recipe, &req(&[])).unwrap();
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
        let c = &scene.nodes[0];
        assert_eq!(c.h, 32.0);
        let icon = scene.nodes.iter().find(|n| n.part == "icon").unwrap();
        assert_eq!(icon.x - c.x, 12.0, "horizontal padding");
        let label = scene.nodes.iter().find(|n| n.part == "label").unwrap();
        assert_eq!(label.x - (icon.x + icon.w), 6.0, "gap");
        assert!(
            c.fill.as_deref().unwrap().starts_with("rgb(233"),
            "{:?}",
            c.fill
        );
        assert!(scene.nodes.iter().all(|n| n.kind != "ring"));
    }

    #[test]
    fn button_fill_content_color_per_color_scheme() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/button.json")).unwrap(),
        )
        .unwrap();
        // Accent and negative content stays white in both schemes; primary flips with gray-25.
        for (variant, scheme, want) in [
            ("accent", "light", "rgb(255, 255, 255)"),
            ("accent", "dark", "rgb(255, 255, 255)"),
            ("negative", "dark", "rgb(255, 255, 255)"),
            ("accent", "wireframe", "rgb(255, 255, 255)"),
            ("negative", "wireframe", "rgb(255, 255, 255)"),
            ("primary", "light", "rgb(255, 255, 255)"),
            ("primary", "dark", "rgb(17, 17, 17)"),
            ("primary", "wireframe", "rgb(254, 254, 255)"),
        ] {
            let mut r = req(&[]);
            r.component = "button".into();
            r.mode.insert("colorScheme".into(), scheme.into());
            r.options.insert("variant".into(), variant.into());
            r.options.insert("style".into(), "fill".into());
            let scene = build_scene(&g, &recipe, &r).unwrap();
            for part in ["icon", "label"] {
                let n = scene.nodes.iter().find(|n| n.part == part).unwrap();
                assert_eq!(n.color.as_deref(), Some(want), "{variant} {scheme} {part}");
            }
        }
    }

    #[test]
    fn measurements_record_each_dimension_with_its_token() {
        let (g, recipe) = load();
        let scene = build_scene(&g, &recipe, &req(&[])).unwrap();
        let c = &scene.nodes[0];
        let find = |prop: &str| {
            scene
                .measurements
                .iter()
                .find(|m| m.prop == prop)
                .unwrap_or_else(|| panic!("no measurement for {prop}"))
        };
        let height = find("height");
        assert_eq!(
            (height.kind.as_str(), height.h, height.w),
            ("height", c.h, c.w)
        );
        assert!(height.token.token.starts_with("component-height"));
        let pad = find("paddingInlineStart");
        assert_eq!((pad.kind.as_str(), pad.x, pad.w), ("padding", c.x, 12.0));
        let gap = find("gap");
        let icon = scene.nodes.iter().find(|n| n.part == "icon").unwrap();
        assert_eq!(
            (gap.kind.as_str(), gap.x, gap.w),
            ("gap", icon.x + icon.w, 6.0)
        );
        assert!(!gap.token.token.is_empty());
        assert_eq!(find("cornerRadius").kind, "radius");
    }

    #[test]
    fn nested_parts_border_focus_ring_and_press_are_measured_with_their_tokens() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/switch.json")).unwrap(),
        )
        .unwrap();
        let mut r = req(&["keyboard-focus", "down"]);
        r.component = "switch".into();
        r.size = "m".into();
        let scene = build_scene(&g, &recipe, &r).unwrap();
        let find = |kind: &str, part: &str| {
            scene
                .measurements
                .iter()
                .find(|m| m.kind == kind && m.part == part)
                .unwrap_or_else(|| panic!("no {kind} measurement on {part}"))
        };
        let track = scene.nodes.iter().find(|n| n.part == "track").unwrap();
        let width = find("width", "track");
        assert_eq!((width.x, width.w, width.h), (track.x, track.w, track.h));
        assert!(width.token.relationship.is_some());
        assert_eq!(find("height", "track").h, track.h);
        let ring = find("focus-thickness", "focus-indicator");
        let gap = find("focus-gap", "focus-indicator");
        assert_eq!(ring.token.prop, "strokeWidth");
        assert_eq!(gap.token.prop, "gapToParent");
        assert!(
            (ring.y + ring.h - gap.y).abs() < 0.001,
            "the gap band sits just inside the thickness band"
        );
        let press = scene
            .measurements
            .iter()
            .find(|m| m.kind == "press")
            .unwrap();
        assert_eq!(press.token.prop, "pressWidthRatio");
        assert!(press.token.relationship.is_some());
    }

    #[test]
    fn token_refs_carry_the_relationship_that_bound_them() {
        let (g, recipe) = load();
        let scene = build_scene(&g, &recipe, &req(&[])).unwrap();
        let height = scene
            .measurements
            .iter()
            .find(|m| m.prop == "height")
            .unwrap();
        let rel = height.token.relationship.as_ref().expect("relationship");
        assert_eq!(rel.context, "Height");
        assert_eq!(rel.property, "component-height-100");
        assert!(rel.uuid.is_some(), "every relationship has a uuid");
        let container = &scene.nodes[0];
        assert!(container
            .tokens
            .iter()
            .any(|t| t.prop == "gap" && t.relationship.is_some()));
    }

    #[test]
    fn relationship_gap_follows_the_requested_size() {
        let (g, recipe) = load();
        let gap = |size: &str| {
            let mut r = req(&[]);
            r.size = size.into();
            let scene = build_scene(&g, &recipe, &r).unwrap();
            assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
            let icon = scene.nodes.iter().find(|n| n.part == "icon").unwrap();
            let label = scene.nodes.iter().find(|n| n.part == "label").unwrap();
            label.x - (icon.x + icon.w)
        };
        let (s, m, xl) = (gap("s"), gap("m"), gap("xl"));
        assert!(
            s < xl,
            "small gap {s} must not resolve to the xl token {xl}"
        );
        assert!(s <= m && m <= xl, "gap grows with size: {s} {m} {xl}");
    }

    #[test]
    fn switch_handle_sits_centered_at_the_start_or_end_of_the_track() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/switch.json")).unwrap(),
        )
        .unwrap();
        let scene = |selected: bool, states: &[&str]| {
            let mut r = req(states);
            r.component = "switch".into();
            r.size = "m".into();
            if selected {
                r.options.insert("isSelected".into(), Value::Bool(true));
            }
            build_scene(&g, &recipe, &r).unwrap()
        };
        let part = |s: &Scene, p: &str| s.nodes.iter().find(|n| n.part == p).cloned().unwrap();
        let off = scene(false, &[]);
        assert!(off.diagnostics.is_empty(), "{:?}", off.diagnostics);
        let (track, handle) = (part(&off, "track"), part(&off, "handle"));
        assert_eq!((track.w, track.h, handle.w), (26.0, 16.0, 8.0));
        assert_eq!(handle.x - track.x, 4.0, "inset equals the cross-axis gap");
        assert_eq!(handle.y - track.y, 4.0, "centered across the track");
        assert_eq!(track.radius, 8.0, "pill");

        let on = scene(true, &[]);
        let (track, handle) = (part(&on, "track"), part(&on, "handle"));
        assert_eq!(handle.w, 10.0, "selected handle is larger");
        assert_eq!(track.x + track.w - (handle.x + handle.w), 3.0);
        assert_eq!(handle.y - track.y, 3.0);

        let focus = scene(false, &["keyboard-focus"]);
        let ring = part(&focus, "focus-indicator");
        assert!(ring.x < part(&focus, "track").x, "ring wraps the track");
        let down = scene(false, &["down"]);
        assert_eq!(down.press.unwrap().part.as_deref(), Some("handle"));
    }

    #[test]
    fn checkbox_box_marks_and_colors_follow_the_options() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/checkbox.json")).unwrap(),
        )
        .unwrap();
        let scene = |size: &str, opts: &[&str], states: &[&str]| {
            let mut r = req(states);
            r.component = "checkbox".into();
            r.size = size.into();
            r.label = "Label".into();
            for o in opts {
                r.options.insert((*o).into(), Value::Bool(true));
            }
            build_scene(&g, &recipe, &r).unwrap()
        };
        let part = |s: &Scene, p: &str| s.nodes.iter().find(|n| n.part == p).cloned();

        let off = scene("m", &[], &[]);
        assert!(off.diagnostics.is_empty(), "{:?}", off.diagnostics);
        let b = part(&off, "box").unwrap();
        assert!(part(&off, "control").is_none(), "control is not anatomy");
        assert_eq!((b.w, b.h, b.radius, b.stroke_width), (16.0, 16.0, 4.0, 2.0));
        assert_eq!(b.fill.as_deref(), Some("rgb(255, 255, 255)"));
        assert_eq!(b.stroke.as_deref(), Some("rgb(41, 41, 41)"));
        assert!(part(&off, "checkmark").is_none() && part(&off, "dash").is_none());
        let label = part(&off, "label").unwrap();
        assert_eq!(label.x - (b.x + b.w), 6.0, "control to label gap");

        let on = scene("m", &["isSelected"], &[]);
        assert!(on.diagnostics.is_empty(), "{:?}", on.diagnostics);
        let (b, mark) = (part(&on, "box").unwrap(), part(&on, "checkmark").unwrap());
        assert_eq!(
            (b.stroke_width, b.fill.as_deref()),
            (0.0, Some("rgb(41, 41, 41)"))
        );
        assert_eq!(
            (
                mark.w,
                mark.icon
                    .as_ref()
                    .map(|i| (i.set.as_str(), i.name.as_str()))
            ),
            (10.0, Some(("ui", "checkmark")))
        );
        assert_eq!(mark.x + mark.w / 2.0, b.x + b.w / 2.0, "mark is centered");
        assert_eq!(mark.color.as_deref(), Some("rgb(255, 255, 255)"));

        let both = scene("m", &["isSelected", "isIndeterminate"], &[]);
        assert!(
            part(&both, "checkmark").is_none(),
            "indeterminate wins over selected"
        );
        let dash = part(&both, "dash").unwrap();
        assert_eq!(
            (dash.w, dash.h, dash.icon.as_ref().map(|i| i.name.as_str())),
            (10.0, 10.0, Some("dash"))
        );

        let accent = scene("m", &["isSelected", "isEmphasized"], &[]);
        assert_eq!(
            part(&accent, "box").unwrap().fill.as_deref(),
            Some("rgb(59, 99, 251)")
        );
        let error = scene("m", &["isSelected", "isError", "isEmphasized"], &[]);
        assert_eq!(
            part(&error, "box").unwrap().fill.as_deref(),
            Some("rgb(215, 50, 32)")
        );
        let disabled = scene("m", &["isSelected", "isDisabled", "isError"], &[]);
        assert_eq!(
            part(&disabled, "box").unwrap().fill.as_deref(),
            Some("rgb(198, 198, 198)")
        );

        for (size, control, mark) in [("s", 14.0, 8.0), ("l", 18.0, 10.0), ("xl", 20.0, 12.0)] {
            let s = scene(size, &["isSelected"], &[]);
            assert_eq!(part(&s, "box").unwrap().w, control, "{size} box");
            assert_eq!(part(&s, "checkmark").unwrap().w, mark, "{size} checkmark");
        }

        let focus = scene("m", &[], &["keyboard-focus"]);
        assert!(part(&focus, "focus-indicator").unwrap().x < part(&focus, "box").unwrap().x);
    }

    #[test]
    fn checkbox_press_scales_the_box_with_its_mark() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/checkbox.json")).unwrap(),
        )
        .unwrap();
        let mut r = req(&["down"]);
        r.component = "checkbox".into();
        r.size = "m".into();
        r.label = "Label".into();
        r.options.insert("isSelected".into(), Value::Bool(true));
        let scene = build_scene(&g, &recipe, &r).unwrap();
        let press = scene.press.as_ref().unwrap();
        assert_eq!(press.part.as_deref(), Some("box"));
        assert_eq!(press.nested, ["checkmark", "dash"]);

        let svg = scene_to_svg(&scene);
        let (open, close) = (svg.find("<g transform").unwrap(), svg.find("</g>").unwrap());
        let inside = &svg[open..close];
        for part in ["box", "checkmark"] {
            assert!(inside.contains(&format!("data-part=\"{part}\"")), "{part}");
        }
        assert!(
            !inside.contains("data-part=\"label\""),
            "the label does not scale"
        );
    }

    #[test]
    fn relationship_options_pick_the_default_or_the_most_specific_override() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/badge.json")).unwrap(),
        )
        .unwrap();
        let label_color = |variant: &str, style: &str| {
            let mut r = req(&[]);
            r.component = "badge".into();
            r.label = "Label".into();
            r.options
                .insert("variant".into(), Value::String(variant.into()));
            r.options
                .insert("style".into(), Value::String(style.into()));
            let scene = build_scene(&g, &recipe, &r).unwrap();
            assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
            let label = scene.nodes.iter().find(|n| n.part == "label").unwrap();
            label
                .tokens
                .iter()
                .find(|t| t.prop == "color")
                .unwrap()
                .token
                .clone()
        };
        let white = "color-transparent-static-white-1000";
        let black = "color-transparent-static-black-1000";
        let gray = "color-gray-1000-light";
        assert_eq!(
            label_color("accent", "bold"),
            white,
            "no override: the default"
        );
        assert_eq!(
            label_color("fuchsia", "outline"),
            white,
            "default for most outlines"
        );
        assert_eq!(label_color("celery", "bold"), black, "light variant, bold");
        assert_eq!(
            label_color("yellow", "outline"),
            black,
            "light variant, outline"
        );
        assert_eq!(
            label_color("accent", "subtle"),
            gray,
            "subtle overrides the default"
        );
        assert_eq!(
            label_color("celery", "subtle"),
            gray,
            "style, not variant, wins"
        );
        assert_eq!(
            label_color("notice", "outline"),
            gray,
            "two pinned options beat the default"
        );
    }

    #[test]
    fn badge_fixed_edge_squares_corners_and_maps_weight() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/badge.json")).unwrap(),
        )
        .unwrap();
        let mut r = req(&[]);
        r.component = "badge".into();
        let plain = build_scene(&g, &recipe, &r).unwrap();
        assert!(plain.diagnostics.is_empty(), "{:?}", plain.diagnostics);
        assert!(plain.nodes[0].radii.is_none());
        assert!(scene_to_svg(&plain).contains("font-weight=\"500\""));

        r.options.insert("fixed".into(), "left".into());
        let fixed = build_scene(&g, &recipe, &r).unwrap();
        let [tl, tr, br, bl] = fixed.nodes[0].radii.expect("per-corner radii");
        assert_eq!((tl, bl), (0.0, 0.0));
        assert!(tr > 0.0 && tr == br);
        assert!(scene_to_svg(&fixed).contains("<path data-part=\"container\""));

        r.label = String::new();
        let icon_only = build_scene(&g, &recipe, &r).unwrap();
        assert!(icon_only.nodes.iter().all(|n| n.part != "label"));
    }

    #[test]
    fn action_button_focus_and_hover() {
        let (g, recipe) = load();
        let hover = build_scene(&g, &recipe, &req(&["hover"])).unwrap();
        let default = build_scene(&g, &recipe, &req(&[])).unwrap();
        assert_ne!(hover.nodes[0].fill, default.nodes[0].fill);
        let focus = build_scene(&g, &recipe, &req(&["keyboard-focus"])).unwrap();
        assert!(focus.nodes.iter().any(|n| n.kind == "ring"));
        assert!(scene_to_svg(&focus).contains("data-part=\"focus-indicator\""));
    }

    #[test]
    fn disabled_resolves_relationship_colors() {
        let (g, recipe) = load();
        let mut r = req(&[]);
        r.options.insert("isDisabled".into(), Value::Bool(true));
        let scene = build_scene(&g, &recipe, &r).unwrap();
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
        let label = |sc: &Scene| {
            sc.nodes
                .iter()
                .find(|n| n.part == "label")
                .unwrap()
                .color
                .clone()
        };
        let normal = build_scene(&g, &recipe, &req(&[])).unwrap();
        assert_ne!(label(&scene), label(&normal));
    }

    fn with(opts: &[(&str, Value)]) -> RenderRequest {
        let mut r = req(&[]);
        for (k, v) in opts {
            r.options.insert(k.to_string(), v.clone());
        }
        r
    }

    fn part<'a>(s: &'a Scene, id: &str) -> Option<&'a SceneNode> {
        s.nodes.iter().find(|n| n.part == id)
    }

    #[test]
    fn option_conditions_accept_an_array_of_values() {
        let (g, _) = load();
        let recipe = serde_json::json!({
            "specVersion": "1.0.0-draft",
            "component": "action-button",
            "root": "box",
            "sizeScale": { "m": 100 },
            "parts": { "box": { "kind": "box", "props": {
                "width": { "value": 40 },
                "height": { "value": 20 },
                "fill": [
                    { "value": "red" },
                    { "when": { "options": { "variant": ["a", "b"] } }, "value": "blue" },
                    { "when": { "options": { "variant": "b", "flag": true } }, "value": "green" }
                ]
            } } }
        });
        let fill = |opts: &[(&str, Value)]| {
            let scene = build_scene(&g, &recipe, &with(opts)).unwrap();
            scene.nodes[0].fill.clone()
        };
        let v = |s: &str| Value::String(s.into());
        assert_eq!(fill(&[]).as_deref(), Some("red"));
        assert_eq!(fill(&[("variant", v("a"))]).as_deref(), Some("blue"));
        assert_eq!(fill(&[("variant", v("b"))]).as_deref(), Some("blue"));
        assert_eq!(fill(&[("variant", v("c"))]).as_deref(), Some("red"));
        // An array is one condition, so a two-condition entry still outranks it.
        assert_eq!(
            fill(&[("variant", v("b")), ("flag", Value::Bool(true))]).as_deref(),
            Some("green")
        );
    }

    /// A box with a 10 high label (font size 10 x 1.3 = 13) and the given root props.
    fn padded_box(props: Value) -> Scene {
        let (g, _) = load();
        let mut root = serde_json::json!({ "width": { "value": 40 } });
        root.as_object_mut()
            .unwrap()
            .extend(props.as_object().unwrap().clone());
        let recipe = serde_json::json!({
            "specVersion": "1.0.0-draft",
            "component": "action-button",
            "root": "box",
            "sizeScale": { "m": 100 },
            "parts": {
                "box": { "kind": "box", "children": ["label"], "props": root },
                "label": { "kind": "text", "props": { "fontSize": { "value": 10 } } }
            }
        });
        build_scene(&g, &recipe, &req(&[])).unwrap()
    }

    fn label_scene(label_props: Value) -> Scene {
        let (g, _) = load();
        let recipe = serde_json::json!({
            "specVersion": "1.0.0-draft",
            "component": "action-button",
            "root": "box",
            "sizeScale": { "m": 100 },
            "parts": {
                "box": { "kind": "box", "children": ["label"], "props": { "width": { "value": 40 } } },
                "label": { "kind": "text", "props": label_props }
            }
        });
        build_scene(&g, &recipe, &req(&[])).unwrap()
    }

    #[test]
    fn reads_prop_applies_the_box_fallback_only_to_text_and_progress() {
        let text = serde_json::json!({ "kind": "text" });
        let placed = serde_json::json!({ "kind": "box", "placement": {} });
        let ring = serde_json::json!({ "kind": "ring" });
        assert!(reads_prop(&text, false, "fontSize") && reads_prop(&text, false, "fill"));
        assert!(!reads_prop(&text, false, "opacity"));
        assert!(reads_prop(&placed, false, "color") && !reads_prop(&placed, false, "fill"));
        assert!(!reads_prop(&ring, false, "fill"));
        assert!(!reads_prop(&text, true, "fontSize"));
    }

    #[test]
    fn every_part_kind_has_a_read_props_entry() {
        for kind in ["box", "text", "icon", "ring", "progress"] {
            assert!(read_props(kind).is_some(), "no READ_PROPS entry for {kind}");
        }
        assert!(read_props("root").is_some() && read_props("placed").is_some());
    }

    #[test]
    fn button_icon_size_follows_the_workflow_icon_tokens() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/button.json")).unwrap(),
        )
        .unwrap();
        // workflow-icon-small/medium/large/extra-large (desktop), as in Figma and S2.
        for (size, want) in [("s", 16.0), ("m", 18.0), ("l", 20.0), ("xl", 22.0)] {
            let mut r = req(&[]);
            r.component = "button".into();
            r.size = size.into();
            let scene = build_scene(&g, &recipe, &r).unwrap();
            let icon = scene.nodes.iter().find(|n| n.part == "icon").unwrap();
            assert_eq!((icon.w, icon.h), (want, want), "{size}");
        }
    }

    #[test]
    fn text_height_follows_line_height_and_defaults_to_1_3() {
        let h = |lh: Value| {
            let mut p = serde_json::json!({ "fontSize": { "value": 10 } });
            if !lh.is_null() {
                p["lineHeight"] = lh;
            }
            part(&label_scene(p), "label").unwrap().h
        };
        assert!((h(Value::Null) - 13.0).abs() < 1e-9);
        assert!((h(serde_json::json!({ "value": "20.5px" })) - 20.5).abs() < 1e-9);
        assert!((h(serde_json::json!({ "value": "1.5" })) - 15.0).abs() < 1e-9);
        assert!((h(serde_json::json!({ "value": "128%" })) - 13.0).abs() < 1e-9);
        assert!((h(serde_json::json!({ "value": "inf" })) - 13.0).abs() < 1e-9);
    }

    #[test]
    fn an_unparsable_line_height_is_a_diagnostic() {
        let diags = |lh: Value| {
            let p = serde_json::json!({ "fontSize": { "value": 10 }, "lineHeight": lh });
            label_scene(p).diagnostics
        };
        assert!(diags(serde_json::json!({ "value": "1.5" })).is_empty());
        for bad in ["128%", "1.2em"] {
            let d = diags(serde_json::json!({ "value": bad }));
            assert_eq!(d.len(), 1, "{bad}: {d:?}");
            assert!(d[0].contains(bad), "{d:?}");
        }
    }

    #[test]
    fn button_label_line_height_follows_the_font_size_tokens() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/button.json")).unwrap(),
        )
        .unwrap();
        // line-height-font-size-75..300 (desktop), as in Figma and S2; 1.3 x 18 would be 23.4 at XL.
        for (size, want) in [("s", 16.0), ("m", 18.0), ("l", 20.0), ("xl", 22.0)] {
            let mut r = req(&[]);
            r.component = "button".into();
            r.size = size.into();
            let scene = build_scene(&g, &recipe, &r).unwrap();
            let label = scene.nodes.iter().find(|n| n.part == "label").unwrap();
            assert_eq!(label.h, want, "{size}");
        }
    }

    #[test]
    fn an_icon_taller_than_the_label_line_adds_only_the_line_height() {
        let (g, _) = load();
        let height = |icon: &str| {
            let recipe = serde_json::json!({
                "specVersion": "1.0.0-draft",
                "component": "action-button",
                "root": "box",
                "sizeScale": { "m": 100 },
                "parts": {
                    "box": { "kind": "box", "children": ["icon", "label"], "props": {
                        "paddingBlockStart": { "value": 5 },
                        "paddingBlockEnd": { "value": 5 } } },
                    "icon": { "kind": "icon", "props": { "width": { "value": icon }, "height": { "value": icon } } },
                    "label": { "kind": "text", "props": { "fontSize": { "value": 10 } } }
                }
            });
            let scene = build_scene(&g, &recipe, &req(&[])).unwrap();
            let box_h = scene.nodes[0].h;
            let icon = part(&scene, "icon").unwrap();
            (box_h, icon.h, icon.y - scene.nodes[0].y)
        };
        // The label line is 13 high: a 10 icon does not matter, a 30 icon is clipped to 13.
        assert_eq!(height("10"), (23.0, 10.0, 6.5));
        // The 30 icon overflows the 13 line by 8.5 on each side.
        assert_eq!(height("30"), (23.0, 30.0, -3.5));
    }

    #[test]
    fn font_family_leads_the_default_stack_only_when_bound() {
        let svg = |p: Value| scene_to_svg(&label_scene(p));
        let unbound = svg(serde_json::json!({ "fontSize": { "value": 10 } }));
        assert!(unbound.contains("font-family=\"adobe-clean-spectrum-vf,"));
        let bound = svg(serde_json::json!({
            "fontSize": { "value": 10 },
            "fontFamily": { "value": "SF Pro" }
        }));
        assert!(
            bound.contains("font-family=\"'SF Pro', adobe-clean-spectrum-vf,"),
            "{bound}"
        );
    }

    /// An unquoted family is valid CSS only as a sequence of identifiers (no word may start
    /// with a digit); a quoted one is always valid.
    fn family_list_is_valid_css(list: &str) -> bool {
        list.split(',').map(str::trim).all(|f| {
            f.starts_with('\'')
                || (!f.is_empty()
                    && f.split(' ').all(|w| {
                        let w = w.strip_prefix('-').unwrap_or(w);
                        w.chars()
                            .next()
                            .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
                            && w.chars()
                                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
                    }))
        })
    }

    #[test]
    fn emitted_font_family_is_valid_css() {
        for bound in [
            None,
            Some("SF Pro"),
            Some("Adobe Clean Spectrum VF"),
            Some("Source Sans 3"),
            Some("Helvetica Neue 2, monospace"),
            Some("O'Neil 7"),
        ] {
            let list = css_font_family(bound);
            assert!(family_list_is_valid_css(&list), "{bound:?} -> {list}");
        }
        assert!(css_font_family(None).contains("'Source Sans 3'"));
        assert_eq!(
            css_font_family(Some("Source Sans 3, monospace")),
            format!("'Source Sans 3', monospace, {DEFAULT_FONT_STACK}")
        );
        assert!(!family_list_is_valid_css("Adobe Clean, Source Sans 3"));
    }

    #[test]
    fn root_opacity_dims_the_whole_component_in_one_group() {
        let dim = padded_box(serde_json::json!({ "opacity": { "value": "0.6" } }));
        assert_eq!(dim.opacity, Some(0.6));
        let svg = scene_to_svg(&dim);
        assert!(
            svg.contains("viewBox") && svg.contains("<g opacity=\"0.6\">"),
            "{svg}"
        );
        assert!(svg.ends_with("</g></svg>"), "{svg}");
        let plain = padded_box(serde_json::json!({}));
        assert_eq!(plain.opacity, None);
        assert!(!scene_to_svg(&plain).contains("opacity"));
        assert!(serde_json::to_value(&plain)
            .unwrap()
            .get("opacity")
            .is_none());
    }

    #[test]
    fn block_padding_adds_to_the_content_height() {
        let both = padded_box(serde_json::json!({
            "paddingBlockStart": { "value": 5 },
            "paddingBlockEnd": { "value": 7 }
        }));
        assert!((both.nodes[0].h - 25.0).abs() < 1e-9, "{}", both.nodes[0].h);
        let start = padded_box(serde_json::json!({ "paddingBlockStart": { "value": 5 } }));
        assert!(
            (start.nodes[0].h - 18.0).abs() < 1e-9,
            "{}",
            start.nodes[0].h
        );
        // The label is centered between the paddings: 5 above, 7 below.
        let label = part(&both, "label").unwrap();
        assert!(
            (label.y - both.nodes[0].y - 5.0).abs() < 1e-9,
            "{}",
            label.y
        );
    }

    #[test]
    fn an_explicit_height_wins_over_block_padding() {
        let s = padded_box(serde_json::json!({
            "height": { "value": 50 },
            "paddingBlockStart": { "value": 5 },
            "paddingBlockEnd": { "value": 7 }
        }));
        assert_eq!(s.nodes[0].h, 50.0);
    }

    #[test]
    fn no_block_padding_keeps_the_default_height() {
        assert_eq!(padded_box(serde_json::json!({})).nodes[0].h, 32.0);
    }

    #[test]
    fn an_oversized_radius_is_clamped_to_half_the_smaller_side() {
        // The root box is as wide as its label (27.6 for font size 10), so the width limit is 13.8.
        let node = |h: u32, r: u32| {
            let s = padded_box(serde_json::json!({
                "height": { "value": h },
                "cornerRadius": { "value": r }
            }));
            (s.nodes[0].clone(), scene_to_svg(&s))
        };
        // Past half the height: a pill. rx is the clamped value and an SVG rect with no `ry`
        // uses `rx`, so rx equals ry.
        let (n, svg) = node(20, 30);
        assert_eq!(n.radius, 10.0);
        assert!(svg.contains("rx=\"10\"") && !svg.contains("ry="), "{svg}");
        // Taller than wide: the width limits it.
        let (n, _) = node(60, 30);
        assert!((n.radius - n.w / 2.0).abs() < 1e-9, "{}", n.radius);
        // Within bounds: unchanged.
        assert_eq!(node(20, 6).0.radius, 6.0);
        assert_eq!(node(20, 10).0.radius, 10.0);
    }

    #[test]
    fn disabled_overrides_selected_emphasized_and_quiet() {
        let (g, recipe) = load();
        let t = Value::Bool(true);
        let sel = build_scene(
            &g,
            &recipe,
            &with(&[
                ("isDisabled", t.clone()),
                ("isSelected", t.clone()),
                ("isEmphasized", t.clone()),
            ]),
        )
        .unwrap();
        assert_eq!(sel.nodes[0].fill.as_deref(), Some("rgb(233, 233, 233)"));
        let quiet = build_scene(
            &g,
            &recipe,
            &with(&[("isDisabled", t.clone()), ("isQuiet", t)]),
        )
        .unwrap();
        assert_eq!(quiet.nodes[0].fill.as_deref(), Some("transparent"));
    }

    #[test]
    fn pending_swaps_content_for_progress() {
        let (g, recipe) = load();
        let s = build_scene(&g, &recipe, &with(&[("isPending", Value::Bool(true))])).unwrap();
        assert!(part(&s, "label").is_none() && part(&s, "icon").is_none());
        assert!(part(&s, "progress").is_some());
        assert_eq!(s.nodes[0].w, 42.0);
    }

    #[test]
    fn icon_only_is_square() {
        let (g, recipe) = load();
        let s = build_scene(&g, &recipe, &with(&[("hideLabel", Value::Bool(true))])).unwrap();
        assert_eq!(s.nodes[0].w, s.nodes[0].h);
    }

    #[test]
    fn compiled_recipe_has_ranked_candidates_and_no_bindings() {
        let (g, recipe) = load();
        let mode = HashMap::from([
            ("colorScheme".to_string(), "light".to_string()),
            ("scale".to_string(), "desktop".to_string()),
        ]);
        let c = compile_recipe(&g, &recipe, "action-button", &[mode]).unwrap();
        let v = &c["variants"]["m|light|desktop"];
        let text = v.to_string();
        assert!(!text.contains("\"token\":{") && !text.contains("\"relationship\""));
        let fill = &v["container"]["props"]["fill"];
        assert!(fill
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["candidates"].as_array().is_some_and(|c| !c.is_empty())));
        let (used, structural) = recipe_options(&recipe);
        assert!(used.contains(&"isPending".to_string()));
        assert!(structural.contains(&"isPending".to_string()));
    }

    #[test]
    fn a_selector_placeholder_counts_as_a_used_option() {
        let recipe = serde_json::json!({"parts": {"box": {"props": {"fill": [
            {"token": {"property": "background-color", "variant": "{style}"}},
            {"relationship": {"context": "Fill {tone}"}, "when": {"options": {"isDisabled": true}}}
        ]}}}});
        let (used, structural) = recipe_options(&recipe);
        assert!(used.contains(&"style".to_string()), "{used:?}");
        assert!(used.contains(&"tone".to_string()), "{used:?}");
        assert!(used.contains(&"isDisabled".to_string()), "{used:?}");
        assert!(!used.contains(&"size".to_string()), "{used:?}");
        assert!(structural.is_empty(), "{structural:?}");
    }

    fn templated_graph() -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(crate::graph::ComponentRecord {
            name: "gadget".into(),
            file: PathBuf::from("components/gadget.json"),
            raw: serde_json::json!({"name": "gadget", "options": {
                "style": {"type": "string", "default": "accent",
                    "values": [{"value": "accent"}, {"value": "primary"}]}}}),
            layer: crate::graph::Layer::Foundation,
        });
        for (variant, color) in [("accent", "#ff0000"), ("primary", "#00ff00")] {
            let t = crate::graph::TokenRecord {
                name: variant.into(),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: Some(variant.into()),
                alias_target: None,
                raw: serde_json::json!({"value": color, "name": {
                    "component": "gadget", "variant": variant,
                    "property": "background-color"}}),
                layer: Default::default(),
            };
            g.tokens.insert(variant.into(), t);
        }
        g
    }

    #[test]
    fn option_placeholder_in_a_selector_follows_the_request() {
        let g = templated_graph();
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {"box": {"kind": "box", "props": {
                "fill": {"token": {"component": "gadget", "variant": "{style}",
                    "property": "background-color"}}}}}
        });
        let fill = |style: Option<&str>| {
            let mut r = RenderRequest {
                component: "gadget".into(),
                size: "m".into(),
                ..Default::default()
            };
            if let Some(s) = style {
                r.options.insert("style".into(), Value::String(s.into()));
            }
            let scene = build_scene(&g, &recipe, &r).unwrap();
            assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
            scene.nodes[0].fill.clone()
        };
        assert_eq!(fill(Some("accent")).as_deref(), Some("#ff0000"));
        assert_eq!(fill(Some("primary")).as_deref(), Some("#00ff00"));
        assert_eq!(fill(None).as_deref(), Some("#ff0000"), "the option default");

        let c = compile_recipe(&g, &recipe, "gadget", &[HashMap::new()]).unwrap();
        let fill = &c["variants"]["m||"]["box"]["props"]["fill"];
        let pins: Vec<_> = fill["candidates"]
            .as_array()
            .unwrap()
            .iter()
            .map(|c| c["options"]["style"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(pins, ["accent", "primary"]);
    }

    #[test]
    fn placeholder_names_skip_literal_braces() {
        let v = serde_json::json!({"a": "{size}-{style}", "b": ["{a b}", "x{{y}", "{}"]});
        assert_eq!(template_names(&v), ["size", "style", "y"]);
        assert_eq!(option_template_names(&v), ["style", "y"]);
    }

    #[test]
    fn option_placeholder_keeps_a_relationship_array_pin() {
        let mut g = templated_graph();
        let rel = |property: &str, pin: Value| crate::graph::RelationshipRecord {
            file: PathBuf::from("relationships/gadget.json"),
            index: 0,
            uuid: None,
            raw: serde_json::json!({"$ref": "accent", "context": "Fill",
                "scope": {"component": "gadget", "property": property,
                    "options": {"style": pin}}}),
        };
        g.relationships = vec![
            rel("fill-accent", serde_json::json!(["accent", "primary"])),
            rel("fill-primary", serde_json::json!("primary")),
        ];
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {"box": {"kind": "box", "props": {
                "fill": {"relationship": {"property": "fill-{style}", "context": "Fill"}}}}}
        });
        let c = compile_recipe(&g, &recipe, "gadget", &[HashMap::new()]).unwrap();
        let fill = &c["variants"]["m||"]["box"]["props"]["fill"];
        let pins: Vec<_> = fill["candidates"]
            .as_array()
            .unwrap()
            .iter()
            .map(|c| c["options"]["style"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(pins, ["accent", "primary"]);
        assert_eq!(
            fill["miss"],
            "fill: no relationship 'fill-{style}' / 'Fill'"
        );
    }

    /// A `gadget` with mark-size tokens keyed by scale index (75) and size (`l`), a `ui`
    /// icon `mark` drawn at 75, 200 and 300 (viewBox width = scale / 10), and a single
    /// `workflow` drawing.
    fn icon_graph() -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(crate::graph::ComponentRecord {
            name: "gadget".into(),
            file: PathBuf::from("components/gadget.json"),
            raw: serde_json::json!({"name": "gadget"}),
            layer: crate::graph::Layer::Foundation,
        });
        for (key, name, value) in [
            (
                "mark-75",
                serde_json::json!({"property": "mark-size", "scaleIndex": 75}),
                "12px",
            ),
            (
                "mark-l",
                serde_json::json!({"property": "mark-size", "size": "l"}),
                "20px",
            ),
        ] {
            g.tokens.insert(
                key.into(),
                crate::graph::TokenRecord {
                    name: key.into(),
                    file: PathBuf::from("tokens.json"),
                    index: 0,
                    schema_url: None,
                    uuid: Some(key.into()),
                    alias_target: None,
                    raw: serde_json::json!({"value": value, "name": name}),
                    layer: Default::default(),
                },
            );
        }
        let drawing = |w: u32| serde_json::json!({"viewBox": format!("0 0 {w} {w}"), "paths": [{"d": format!("M0 0H{w}")}]});
        let set = |set: &str, icons: Value| {
            TokenGraph::icon_set_from_str(
                &serde_json::json!({"set": set, "icons": icons}).to_string(),
                PathBuf::from(format!("icons/{set}.json")),
            )
            .unwrap()
            .unwrap()
        };
        g.with_icons(vec![
            set(
                "ui",
                serde_json::json!({
                    "mark": {"sizes": {"75": drawing(7), "200": drawing(20), "300": drawing(30)}},
                    "broken": {"sizes": {"100":
                        {"viewBox": "0 0 0 10", "paths": [{"d": "M0 0"}]}}}
                }),
            ),
            set("workflow", serde_json::json!({"add": drawing(2)})),
        ])
    }

    /// Render `gadget` at size `m` (sizeScale `scale`) with one icon part inside a box.
    fn icon_scene(icon: Value, props: Value, scale: u32) -> (Scene, Value) {
        let g = icon_graph();
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": scale},
            "parts": {
                "box": {"kind": "box", "children": ["holder"]},
                "holder": {"kind": "box", "children": ["mark"],
                    "props": {"width": {"value": 60}, "height": {"value": 60}}},
                "mark": {"kind": "icon", "icon": icon, "props": props}
            }
        });
        let req = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            ..Default::default()
        };
        let compiled = compile_recipe(&g, &recipe, "gadget", &[HashMap::new()]).unwrap();
        (build_scene(&g, &recipe, &req).unwrap(), compiled)
    }

    fn drawn(scene: &Scene) -> (Option<String>, Vec<String>) {
        let n = scene.nodes.iter().find(|n| n.part == "mark").unwrap();
        let view_box = n
            .icon
            .as_ref()
            .and_then(|i| i.drawing.as_ref())
            .map(|d| d["viewBox"].as_str().unwrap().to_string());
        (view_box, scene.diagnostics.clone())
    }

    /// The `mark` icon part of the gadget recipe, rendered with a request `icon`.
    fn override_scene(icon: Value, request: Option<IconOverride>) -> Scene {
        let g = icon_graph();
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {
                "box": {"kind": "box", "children": ["mark"]},
                "mark": {"kind": "icon", "icon": icon,
                    "props": {"width": {"value": 10}, "height": {"value": 10}}}
            }
        });
        let req = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            icon: request,
            ..Default::default()
        };
        build_scene(&g, &recipe, &req).unwrap()
    }

    fn pick(set: &str, name: &str) -> Option<IconOverride> {
        Some(IconOverride::Icon {
            set: set.into(),
            name: name.into(),
        })
    }

    #[test]
    fn a_request_icon_replaces_a_content_icon() {
        let icon = serde_json::json!({"set": "ui", "name": "mark", "content": true});
        let scene = override_scene(icon, pick("workflow", "add"));
        assert_eq!(drawn(&scene), (Some("0 0 2 2".into()), vec![]));
        let n = scene.nodes.iter().find(|n| n.part == "mark").unwrap();
        assert_eq!(n.icon.as_ref().unwrap().name, "add");
    }

    #[test]
    fn a_request_icon_leaves_a_part_without_content_alone() {
        let icon = serde_json::json!({"set": "ui", "name": "mark"});
        let scene = override_scene(icon, pick("workflow", "add"));
        assert_eq!(drawn(&scene), (Some("0 0 7 7".into()), vec![]));
    }

    #[test]
    fn icon_none_removes_an_optional_content_icon() {
        let icon =
            serde_json::json!({"set": "ui", "name": "mark", "content": true, "optional": true});
        let scene = override_scene(icon, Some(IconOverride::None));
        assert!(scene.nodes.iter().all(|n| n.part != "mark"));
        assert!(scene.diagnostics.is_empty());
    }

    #[test]
    fn icon_none_on_a_required_content_icon_keeps_it_with_a_diagnostic() {
        let icon = serde_json::json!({"set": "ui", "name": "mark", "content": true});
        let scene = override_scene(icon, Some(IconOverride::None));
        let (view_box, diags) = drawn(&scene);
        assert_eq!(view_box.as_deref(), Some("0 0 7 7"));
        assert_eq!(diags.len(), 1);
        assert!(diags[0].contains("'mark'") && diags[0].contains("not optional"));
    }

    #[test]
    fn icon_none_with_a_hidden_label_warns_only_when_the_icon_would_draw() {
        let icon =
            serde_json::json!({"set": "ui", "name": "mark", "content": true, "optional": true});
        let g = icon_graph();
        let recipe = |visible: bool| {
            serde_json::json!({
                "component": "gadget", "root": "box", "sizeScale": {"m": 100},
                "parts": {
                    "box": {"kind": "box", "children": ["mark"]},
                    "mark": {"kind": "icon", "icon": icon,
                        "visibleWhen": {"options": {"shown": visible}},
                        "props": {"width": {"value": 10}, "height": {"value": 10}}}
                }
            })
        };
        let req = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            icon: Some(IconOverride::None),
            options: HashMap::from([
                ("isLabelHidden".into(), true.into()),
                ("shown".into(), true.into()),
            ]),
            ..Default::default()
        };
        let warned = |visible| {
            !build_scene(&g, &recipe(visible), &req)
                .unwrap()
                .diagnostics
                .is_empty()
        };
        assert!(warned(true));
        assert!(!warned(false));
    }

    #[test]
    fn an_unknown_request_icon_draws_the_placeholder_with_a_diagnostic() {
        let icon = serde_json::json!({"set": "ui", "name": "mark", "content": true});
        let scene = override_scene(icon, pick("workflow", "nope"));
        assert_eq!(
            drawn(&scene),
            (
                None,
                vec![
                    "icon workflow:nope has no drawing for size 'm'; drawing a placeholder".into()
                ]
            )
        );
    }

    #[test]
    fn icon_override_parses_the_cli_and_json_spellings() {
        assert_eq!("none".parse(), Ok(IconOverride::None));
        assert_eq!(
            "workflow:edit".parse(),
            Ok(pick("workflow", "edit").unwrap())
        );
        assert!("edit".parse::<IconOverride>().is_err());
        let j = |v: Value| serde_json::from_value::<IconOverride>(v).ok();
        assert_eq!(j(serde_json::json!("none")), Some(IconOverride::None));
        assert_eq!(
            j(serde_json::json!({"set": "a", "name": "b"})),
            pick("a", "b")
        );
        assert_eq!(j(serde_json::json!("other")), None);
    }

    #[test]
    fn a_scale_keyed_size_token_picks_the_ui_drawing() {
        let width = serde_json::json!({"width":
            {"token": {"property": "mark-size", "scaleIndex": 75}}});
        let (scene, compiled) =
            icon_scene(serde_json::json!({"set": "ui", "name": "mark"}), width, 300);
        assert_eq!(drawn(&scene), (Some("0 0 7 7".into()), vec![]));
        assert_eq!(compiled["variants"]["m||"]["mark"]["drawing"], "ui:mark@75");
        assert_eq!(compiled["drawings"]["ui:mark@75"]["viewBox"], "0 0 7 7");
    }

    #[test]
    fn a_size_keyed_size_token_picks_by_its_size_key() {
        let width = serde_json::json!({"width":
            {"token": {"property": "mark-size", "size": "l"}}});
        let (scene, compiled) =
            icon_scene(serde_json::json!({"set": "ui", "name": "mark"}), width, 75);
        assert_eq!(
            drawn(&scene).0.as_deref(),
            Some("0 0 20 20"),
            "l is scale 200"
        );
        assert_eq!(
            compiled["variants"]["m||"]["mark"]["drawing"],
            "ui:mark@200"
        );
    }

    #[test]
    fn without_a_size_token_the_size_scale_picks_the_nearest_drawing() {
        let ui = serde_json::json!({"set": "ui", "name": "mark"});
        let (scene, _) = icon_scene(ui.clone(), serde_json::json!({}), 100);
        assert_eq!(
            drawn(&scene).0.as_deref(),
            Some("0 0 7 7"),
            "100 is nearest 75"
        );
        let (scene, compiled) = icon_scene(ui, serde_json::json!({}), 250);
        assert_eq!(
            drawn(&scene).0.as_deref(),
            Some("0 0 30 30"),
            "a tie takes the larger"
        );
        assert_eq!(
            compiled["variants"]["m||"]["mark"]["drawing"],
            "ui:mark@250"
        );
    }

    #[test]
    fn a_workflow_icon_has_one_drawing_whatever_the_scale() {
        let wf = serde_json::json!({"set": "workflow", "name": "add"});
        let (scene, compiled) = icon_scene(wf, serde_json::json!({}), 300);
        assert_eq!(drawn(&scene), (Some("0 0 2 2".into()), vec![]));
        assert_eq!(
            compiled["variants"]["m||"]["mark"]["drawing"],
            "workflow:add"
        );
    }

    #[test]
    fn a_missing_icon_draws_the_placeholder_with_a_diagnostic() {
        let (scene, compiled) = icon_scene(
            serde_json::json!({"set": "ui", "name": "nope"}),
            serde_json::json!({}),
            100,
        );
        let msg = "icon ui:nope has no drawing for size 'm'; drawing a placeholder";
        assert_eq!(drawn(&scene), (None, vec![msg.to_string()]));
        assert_eq!(compiled["variants"]["m||"]["mark"]["drawingMiss"], msg);
        assert!(scene_to_svg(&scene).contains("<path data-part=\"mark\" data-tokens=\"\" d=\"M"));
    }

    #[test]
    fn without_an_icon_catalog_the_placeholder_has_no_diagnostic() {
        let mut g = icon_graph();
        g.icons.clear();
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {
                "box": {"kind": "box", "children": ["mark"]},
                "mark": {"kind": "icon", "icon": {"set": "workflow", "name": "add"}}
            }
        });
        let req = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            ..Default::default()
        };
        let scene = build_scene(&g, &recipe, &req).unwrap();
        assert_eq!(drawn(&scene), (None, vec![]));
        assert!(scene_to_svg(&scene).contains("<path data-part=\"mark\" data-tokens=\"\" d=\"M"));
    }

    #[test]
    fn an_unfittable_drawing_is_a_miss_with_a_diagnostic() {
        let (scene, compiled) = icon_scene(
            serde_json::json!({"set": "ui", "name": "broken"}),
            serde_json::json!({}),
            100,
        );
        let msg = "icon ui:broken has no drawing for size 'm'; drawing a placeholder";
        assert_eq!(drawn(&scene), (None, vec![msg.to_string()]));
        assert_eq!(compiled["variants"]["m||"]["mark"]["drawingMiss"], msg);
    }

    #[test]
    fn a_state_never_changes_the_drawing() {
        // The hover width is a size-keyed `l` token (scale 200), but the drawing is chosen
        // from the default state's binding (scale 75) and only the box grows.
        let width = serde_json::json!({"width": [
            {"token": {"property": "mark-size", "scaleIndex": 75}},
            {"when": {"states": ["hover"]}, "token": {"property": "mark-size", "size": "l"}}
        ]});
        let g = icon_graph();
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 300},
            "parts": {
                "box": {"kind": "box", "children": ["holder"]},
                "holder": {"kind": "box", "children": ["mark"],
                    "props": {"width": {"value": 60}, "height": {"value": 60}}},
                "mark": {"kind": "icon", "icon": {"set": "ui", "name": "mark"}, "props": width}
            }
        });
        for (states, w) in [(vec![], 12.0), (vec!["hover".to_string()], 20.0)] {
            let req = RenderRequest {
                component: "gadget".into(),
                size: "m".into(),
                states,
                ..Default::default()
            };
            let scene = build_scene(&g, &recipe, &req).unwrap();
            assert_eq!(drawn(&scene).0.as_deref(), Some("0 0 7 7"));
            assert_eq!(scene.nodes.iter().find(|n| n.part == "mark").unwrap().w, w);
        }
    }

    #[test]
    fn an_icon_fits_its_box_uniformly_and_centered() {
        // A 20x10 viewBox in a 40x40 box scales by 2 and centers vertically.
        assert_eq!(
            icon_fit("0 0 20 10", 10.0, 10.0, 40.0, 40.0),
            Some((2.0, 10.0, 20.0))
        );
        // The viewBox origin is shifted onto the box.
        assert_eq!(
            icon_fit("5,5 10 10", 0.0, 0.0, 20.0, 20.0),
            Some((2.0, -10.0, -10.0))
        );
        assert_eq!(icon_fit("0 0 0 10", 0.0, 0.0, 20.0, 20.0), None);
        assert_eq!(icon_fit("0 0 10", 0.0, 0.0, 20.0, 20.0), None);
    }

    #[test]
    fn an_icon_rotates_about_its_box_center_in_the_part_color() {
        let props = serde_json::json!({
            "width": {"value": 40}, "rotation": {"value": 90}, "color": {"value": "red"}
        });
        let (scene, _) = icon_scene(serde_json::json!({"set": "ui", "name": "mark"}), props, 300);
        let n = scene.nodes.iter().find(|n| n.part == "mark").unwrap();
        let (cx, cy) = (n.x + 20.0, n.y + 20.0);
        let svg = scene_to_svg(&scene);
        let want = format!(
            "<g data-part=\"mark\" data-tokens=\"\" transform=\"rotate(90 {cx} {cy})\"><rect x=\"{}\" y=\"{}\" width=\"40\" height=\"40\" fill=\"none\"/><g transform=\"translate({} {}) scale({})\"><path d=\"M0 0H30\" fill=\"red\"/></g></g>",
            n.x, n.y, n.x, n.y, 40.0 / 30.0
        );
        assert!(svg.contains(&want), "{svg}");
    }
}
