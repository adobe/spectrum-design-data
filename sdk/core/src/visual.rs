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
use crate::text_metrics::TextMetrics;

const RING_MARGIN: f64 = 8.0;

/// The largest floating-part size or offset the engine draws, in px; a larger one is skipped
/// with a diagnostic so a bad value cannot make a huge canvas.
pub const MAX_FLOATING: f64 = 2_000.0;

/// The largest shadow `blur` a renderer draws, in px; a larger one is clamped with a diagnostic.
pub const MAX_SHADOW_BLUR: f64 = 100.0;

/// The largest shadow `x`, `y` or `spread` the engine draws, in px; a layer past it is skipped
/// with a diagnostic, so SVG and PNG size the canvas the same way.
pub const MAX_SHADOW_REACH: f64 = 1_000.0;

/// The most columns a `grid` root lays out; a larger `columns` is clamped with a diagnostic.
pub const MAX_GRID_COLUMNS: u64 = 100;

/// The most copies one `repeat` draws; entries past it are dropped with a diagnostic, so a huge
/// collection cannot make a huge scene.
pub const MAX_REPEAT_COPIES: usize = 2_000;

/// The deepest a `repeat` may nest inside a repeated copy; a deeper one is not drawn and the
/// scene says so.
pub const MAX_REPEAT_DEPTH: u32 = 6;

thread_local! {
    /// How many repeated copies are being solved inside one another.
    static REPEAT_DEPTH: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
}

/// Keeps [`REPEAT_DEPTH`] one deeper for as long as it lives, also when the solve fails.
struct DepthGuard;

impl DepthGuard {
    fn enter() -> Self {
        REPEAT_DEPTH.set(REPEAT_DEPTH.get() + 1);
        DepthGuard
    }
}

impl Drop for DepthGuard {
    fn drop(&mut self) {
        REPEAT_DEPTH.set(REPEAT_DEPTH.get() - 1);
    }
}

/// The most repeated copies and subtrees one scene solves in all, however they nest: the per
/// repeat limit multiplies when repeats nest, so a scene has its own budget.
pub const MAX_SCENE_COPIES: usize = 5_000;

thread_local! {
    /// Copies and subtrees the scene being solved may still draw.
    static SCENE_BUDGET: std::cell::Cell<usize> = const { std::cell::Cell::new(MAX_SCENE_COPIES) };
    /// How many `solve` calls are running inside one another (a nested component is one).
    static SOLVE_NEST: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
}

/// Starts a scene's budget at the outermost `solve`; a nested recipe shares its host's.
struct SceneGuard;

impl SceneGuard {
    fn enter() -> Self {
        if SOLVE_NEST.get() == 0 {
            SCENE_BUDGET.set(MAX_SCENE_COPIES);
        }
        SOLVE_NEST.set(SOLVE_NEST.get() + 1);
        SceneGuard
    }
}

impl Drop for SceneGuard {
    fn drop(&mut self) {
        SOLVE_NEST.set(SOLVE_NEST.get() - 1);
    }
}

/// Take `items.len()` from the scene's budget; items past it are dropped with a diagnostic.
fn take_budget<'a>(cx: &mut Ctx, id: &str, mut items: Vec<&'a Value>) -> Vec<&'a Value> {
    let left = SCENE_BUDGET.get();
    if items.len() > left {
        cx.diags.push(format!(
            "repeat: '{id}' has {} copies past the scene's limit of {MAX_SCENE_COPIES}; they are not drawn",
            items.len() - left
        ));
        items.truncate(left);
    }
    SCENE_BUDGET.set(left - items.len());
    items
}

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
            "width",
            "minWidth",
            "height",
            "minHeight",
            "paddingInlineStart",
            "paddingInlineEnd",
            "paddingBlockStart",
            "paddingBlockEnd",
            "gap",
            "columns",
            "columnGap",
            "rowGap",
            "cornerRadius",
            "cornerRadiusStartStart",
            "cornerRadiusStartEnd",
            "cornerRadiusEndEnd",
            "cornerRadiusEndStart",
            "fill",
            "stroke",
            "strokeWidth",
            "strokeOpacity",
            "strokeOver",
            "innerStroke",
            "innerStrokeWidth",
            "innerStrokeOpacity",
            "patternFill",
            "patternSize",
            "pressDifference",
            "pressWidthRatio",
            "pressMinPerspective",
            "pressMaxPerspective",
            "opacity",
            "shadow",
        ],
    ),
    (
        "box",
        &[
            "color",
            "width",
            "height",
            "grow",
            "shadow",
            "cornerRadius",
            "fill",
            "stroke",
            "strokeWidth",
            "strokeOpacity",
            "patternFill",
            "patternSize",
            "justify",
            "direction",
            "align",
            "gap",
            "columns",
            "columnGap",
            "rowGap",
            "paddingInlineStart",
            "paddingInlineEnd",
            "paddingBlockStart",
            "paddingBlockEnd",
        ],
    ),
    ("icon", &["color", "width", "height", "rotation"]),
    (
        "progress",
        &[
            "color",
            "width",
            "height",
            "trackColor",
            "strokeWidth",
            "sweep",
        ],
    ),
    (
        "text",
        &[
            "color",
            "typeStyle",
            "fontFamily",
            "fontSize",
            "fontWeight",
            "lineHeight",
            "grow",
            "overflow",
            "textDecoration",
            "underlineThickness",
            "underlineOffset",
        ],
    ),
    (
        "ring",
        &["stroke", "strokeWidth", "strokeOpacity", "gapToParent"],
    ),
    ("placed", &["color"]),
    (
        "floating",
        &[
            "width",
            "height",
            "cornerRadius",
            "fill",
            "stroke",
            "strokeWidth",
            "strokeOpacity",
            "shadow",
        ],
    ),
    ("component", &[]),
    ("slot", &["width", "height", "direction", "align", "gap"]),
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
    // A floating part with children is solved as the root of its own scene (spec: Floating parts).
    let subtree = role == "floating" && part.get("children").is_some();
    has(role) || (matches!(role, "text" | "progress") && has("box")) || (subtree && has("root"))
}

/// The role that selects a part's entry in `READ_PROPS`.
pub fn part_role(part: &Value, is_root: bool) -> &str {
    if is_root {
        "root"
    } else if part.get("floating").is_some() {
        "floating"
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
    /// Demo width in px: replaces the root's `width` (the root's `minWidth` still applies).
    pub width: Option<f64>,
    /// Replaces the icon of every part whose `icon` has `content: true`, or hides it.
    pub icon: Option<IconOverride>,
    /// Replaces the default text-measurement table (the `textMetrics` request field).
    #[serde(rename = "textMetrics")]
    pub text_metrics: Option<TextMetrics>,
    /// Components that fill the component's slots (`slots` request field), by slot name.
    pub slots: HashMap<String, Vec<SlotFill>>,
}

/// One fill of a slot: a component and the options it is drawn with (spec: component-visuals.md,
/// Slot parts).
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(default)]
pub struct SlotFill {
    pub component: String,
    pub options: HashMap<String, Value>,
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
/// Sort key of a token among same-selector candidates: mode-context score, then the number of
/// name fields (fewer is the more specific selector match). Equal keys are a true tie.
fn rank_key(raw: &Value, ctx: &std::collections::HashMap<String, String>) -> (usize, usize) {
    let fields = raw
        .get("name")
        .and_then(Value::as_object)
        .map_or(0, |o| o.len());
    (name_ctx_score(raw, ctx), fields)
}

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
    /// Alpha of `stroke` (0 to 1), set when the recipe binds `strokeOpacity`; unset is opaque.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stroke_opacity: Option<f64>,
    /// Fraction of a `progress` ring the arc covers (0 to 1); unset draws the fixed spinner arc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sweep: Option<f64>,
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
    /// A line under a `text` node, set when the recipe binds `textDecoration` to `underline`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub underline: Option<Underline>,
    /// A checkerboard drawn over `fill`, set when the recipe binds `patternFill` and `patternSize`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<Pattern>,
    /// A linear gradient drawn instead of `fill`, which then holds its first stop's color for a
    /// consumer that draws solid fills only.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gradient: Option<Gradient>,
    /// Drop shadows drawn under the node, outside its box, first layer on top (CSS order).
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub shadow: Vec<Shadow>,
    /// Set when the part has a `path`: the box is drawn as this shape instead of a rounded
    /// rectangle (fill, pattern, stroke and shadow follow the shape; `radius` is ignored).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<PathShape>,
    pub tokens: Vec<TokenRef>,
}

/// A closed vector shape in a node's own pixel space (origin at the node's top-left corner):
/// SVG path data of absolute or relative `M L H V C S Q T Z` commands, already scaled from the
/// recipe's `viewBox` to the node's box, every subpath closed. Both renderers draw this string.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PathShape {
    pub d: String,
    /// Fill with the even-odd rule instead of non-zero.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub even_odd: bool,
}

/// The longest `path.d` the engine reads, in bytes.
pub const MAX_PATH_BYTES: usize = 4096;
/// The most numbers a `path.d` may hold.
pub const MAX_PATH_NUMBERS: usize = 1024;
/// The largest coordinate magnitude a `path.d` may hold, in its own units.
pub const MAX_PATH_COORD: f64 = 1.0e6;
/// The largest coordinate magnitude after scaling to the part's box, in px.
pub const MAX_PATH_SCALED: f64 = 100_000.0;
/// The largest path part box, in px squared: a path costs a blur and a distance grid per pixel.
pub const MAX_PATH_AREA: f64 = 250_000.0;

/// Scale path data by `(sx, sy)` (relative commands scale the same way) and close every
/// subpath, so a stroke and a fill see the same shape. Arcs are refused: a non-uniform scale
/// does not map an arc to an arc.
pub fn scale_path(d: &str, sx: f64, sy: f64) -> Result<String, String> {
    if d.len() > MAX_PATH_BYTES {
        return Err(format!("path data is longer than {MAX_PATH_BYTES} bytes"));
    }
    if !(sx.is_finite() && sy.is_finite() && sx > 0.0 && sy > 0.0) {
        return Err("path scale is not a positive finite number".into());
    }
    let b = d.as_bytes();
    let (mut i, mut out, mut open, mut started, mut count) = (0, String::new(), false, false, 0);
    // The current point and subpath start, in scaled units, to turn a relative `m` that follows
    // an implied close into an absolute `M`.
    let (mut cur, mut start_pt) = ([0.0f64; 2], [0.0f64; 2]);
    let skip = |i: &mut usize| {
        while *i < b.len() && (b[*i].is_ascii_whitespace() || b[*i] == b',') {
            *i += 1;
        }
    };
    let at_num = |i: usize| {
        b.get(i)
            .is_some_and(|c| c.is_ascii_digit() || matches!(c, b'.' | b'-' | b'+'))
    };
    loop {
        skip(&mut i);
        let Some(&c) = b.get(i) else { break };
        if !c.is_ascii_alphabetic() {
            return Err(format!("expected a command at offset {i}"));
        }
        let up = c.to_ascii_uppercase();
        let arity = match up {
            b'M' | b'L' | b'T' => 2,
            b'H' | b'V' => 1,
            b'C' => 6,
            b'S' | b'Q' => 4,
            b'Z' => 0,
            b'A' => return Err("arc commands are not supported; use C or Q".into()),
            _ => return Err(format!("unknown path command '{}'", c as char)),
        };
        i += 1;
        if up == b'Z' {
            if open {
                out.push('Z');
                open = false;
            }
            cur = start_pt;
            continue;
        }
        if !started && up != b'M' {
            return Err("path data must start with a move".into());
        }
        started = true;
        let mut first = true;
        loop {
            skip(&mut i);
            if !at_num(i) {
                if first {
                    return Err(format!(
                        "command '{}' needs numbers at offset {i}",
                        c as char
                    ));
                }
                break;
            }
            let mut vals = Vec::with_capacity(arity);
            for k in 0..arity {
                skip(&mut i);
                let start = i;
                if matches!(b.get(i), Some(b'-' | b'+')) {
                    i += 1;
                }
                let digits = |i: &mut usize| {
                    let from = *i;
                    while b.get(*i).is_some_and(u8::is_ascii_digit) {
                        *i += 1;
                    }
                    *i - from
                };
                let mut n = digits(&mut i);
                if b.get(i) == Some(&b'.') {
                    i += 1;
                    n += digits(&mut i);
                }
                if n == 0 {
                    return Err(format!("expected a number at offset {start}"));
                }
                if matches!(b.get(i), Some(b'e' | b'E')) {
                    let save = i;
                    i += 1;
                    if matches!(b.get(i), Some(b'-' | b'+')) {
                        i += 1;
                    }
                    if digits(&mut i) == 0 {
                        i = save;
                    }
                }
                let v: f64 = d[start..i]
                    .parse()
                    .ok()
                    .filter(|v: &f64| v.is_finite() && v.abs() <= MAX_PATH_COORD)
                    .ok_or_else(|| {
                        format!("number at offset {start} is not within {MAX_PATH_COORD}")
                    })?;
                count += 1;
                if count > MAX_PATH_NUMBERS {
                    return Err(format!(
                        "path data has more than {MAX_PATH_NUMBERS} numbers"
                    ));
                }
                let scale = match (up, k % 2) {
                    (b'V', _) | (_, 1) => sy,
                    _ => sx,
                };
                let scaled = v * scale;
                if !scaled.is_finite() || scaled.abs() > MAX_PATH_SCALED {
                    return Err(format!(
                        "number at offset {start} scales to beyond {MAX_PATH_SCALED}"
                    ));
                }
                vals.push(((scaled * 1e4).round() / 1e4) + 0.0);
            }
            let rel = c.is_ascii_lowercase();
            let base = if rel { cur } else { [0.0, 0.0] };
            let end = match up {
                b'H' => [base[0] + vals[0], cur[1]],
                b'V' => [cur[0], base[1] + vals[0]],
                b'C' => [base[0] + vals[4], base[1] + vals[5]],
                b'S' | b'Q' => [base[0] + vals[2], base[1] + vals[3]],
                _ => [base[0] + vals[0], base[1] + vals[1]],
            };
            if up == b'M' && first {
                if open {
                    // Closing returns to the subpath start, so a relative move is made absolute
                    // from the point it was written relative to.
                    out.push('Z');
                    out.push('M');
                    out.push_str(&format!("{} {}", end[0] + 0.0, end[1] + 0.0));
                } else {
                    out.push(c as char);
                    out.push_str(
                        &vals
                            .iter()
                            .map(f64::to_string)
                            .collect::<Vec<_>>()
                            .join(" "),
                    );
                }
                start_pt = end;
            } else {
                let letter = if up == b'M' {
                    if rel {
                        'l'
                    } else {
                        'L'
                    }
                } else {
                    c as char
                };
                out.push(letter);
                out.push_str(
                    &vals
                        .iter()
                        .map(f64::to_string)
                        .collect::<Vec<_>>()
                        .join(" "),
                );
            }
            cur = end;
            open = true;
            first = false;
        }
    }
    if open {
        out.push('Z');
    }
    if out.is_empty() {
        return Err("path data is empty".into());
    }
    Ok(out)
}

/// The shape a part's `path` source draws in a `w` x `h` box: its `d` scaled from `viewBox`
/// (default: the box itself) to the box. `fillRule` is `nonzero` (default) or `evenodd`.
pub fn path_shape(spec: &Value, w: f64, h: f64) -> Result<PathShape, String> {
    let d = spec
        .get("d")
        .and_then(Value::as_str)
        .ok_or("path needs a string `d`")?;
    let (vw, vh) = match spec.get("viewBox") {
        None => (w, h),
        Some(v) => match v
            .as_array()
            .map(|a| a.iter().map(Value::as_f64).collect::<Vec<_>>())
            .as_deref()
        {
            Some([Some(vw), Some(vh)])
                if *vw > 0.0 && *vh > 0.0 && vw.is_finite() && vh.is_finite() =>
            {
                (*vw, *vh)
            }
            _ => return Err("path viewBox must be [width, height], both positive".into()),
        },
    };
    let even_odd = match spec.get("fillRule").and_then(Value::as_str) {
        None | Some("nonzero") => false,
        Some("evenodd") => true,
        Some(o) => return Err(format!("path fillRule '{o}' is not nonzero or evenodd")),
    };
    if !(w.is_finite() && h.is_finite() && w > 0.0 && h > 0.0) {
        return Err("a path part needs a positive width and height".into());
    }
    if w * h > MAX_PATH_AREA {
        return Err(format!("a path part is at most {MAX_PATH_AREA} px squared"));
    }
    Ok(PathShape {
        d: scale_path(d, w / vw, h / vh)?,
        even_odd,
    })
}

/// One drop shadow layer: the box offset by (`x`, `y`) and grown by `spread` on every side,
/// blurred by a Gaussian of standard deviation `blur / 2` (`blur` is the Figma radius and the
/// CSS blur radius), filled with `color`. It is not drawn inside the node's own box.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Shadow {
    pub x: f64,
    pub y: f64,
    pub blur: f64,
    pub spread: f64,
    pub color: String,
}

/// A linear gradient across a box. `from` and `to` are the ends of the gradient line in the
/// box's own unit space (`[0, 0]` is its top-left corner, `[1, 1]` the bottom-right), as Figma
/// handles give them; the gradient is drawn in pixels between those points. Stops are in
/// ascending `offset` order.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Gradient {
    pub from: [f64; 2],
    pub to: [f64; 2],
    pub stops: Vec<GradientStop>,
}

/// One color stop: a CSS color at an `offset` (0 to 1) along the gradient line. `token` names
/// the token the color was bound to; it is empty for a literal or an option value.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct GradientStop {
    pub color: String,
    pub offset: f64,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub token: String,
}

/// Alternating squares of `size` in `fill` and `alt`, starting with `fill` at the top-left of
/// the node, clipped to its rounded box.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Pattern {
    pub alt: String,
    pub size: f64,
}

/// An underline: `thickness` of the line and `offset`, the gap between the baseline and the
/// top of the line. The baseline is taken 0.35 x `font_size` below the centre of the text's
/// line box, so SVG and PNG agree whatever the font.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct Underline {
    pub thickness: f64,
    pub offset: f64,
}

impl Underline {
    /// The line as `(x, y, width, height)` under a text node.
    pub fn rect(&self, n: &SceneNode) -> (f64, f64, f64, f64) {
        let baseline = n.y + n.h / 2.0 + 0.35 * n.font_size;
        (n.x, baseline + self.offset, n.w, self.thickness)
    }
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
    /// Set when the source is a `gradient`; `value` then holds its first stop's color.
    gradient: Option<Gradient>,
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
    /// Legacy name → token keys, built on first use so unpacking a composite's inner aliases
    /// does not scan every token per alias (see `CompileCx::type_style_axes`).
    legacy_keys: std::cell::OnceCell<crate::cascade::LegacyKeys>,
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

impl CompiledVariant {
    /// Rebuild a variant from a [`compile_recipe`] output (the `compiled[name]` entry of the
    /// site's `data.json`) and a `size|colorScheme|scale` key, with no token graph. Its
    /// `drawings` are narrowed to the ones the variant's parts name.
    pub fn from_compiled(compiled: &Value, key: &str) -> Result<Self, String> {
        let parts = compiled["variants"]
            .get(key)
            .and_then(Value::as_object)
            .cloned()
            .ok_or_else(|| format!("no compiled variant '{key}'"))?;
        let root = compiled["root"]
            .as_str()
            .ok_or("compiled recipe has no root")?;
        if !parts.contains_key(root) {
            return Err("root part not found".into());
        }
        let all = compiled["drawings"].as_object();
        let used = |k: &str| {
            all.and_then(|a| a.get(k))
                .map(|d| (k.to_string(), d.clone()))
        };
        let drawings = parts
            .values()
            .flat_map(|p| {
                let choices = p["iconChoices"].as_object().into_iter().flatten();
                choices.map(|(_, k)| k).chain(p.get("drawing"))
            })
            .filter_map(|k| used(k.as_str()?))
            .collect();
        Ok(Self {
            root: root.into(),
            option_defaults: compiled["optionDefaults"]
                .as_object()
                .map(|o| o.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
                .unwrap_or_default(),
            parts,
            drawings,
        })
    }

    /// The variant as one JSON document, `{root, optionDefaults, parts, drawings}`.
    pub fn to_value(&self) -> Value {
        serde_json::json!({
            "root": self.root,
            "optionDefaults": self.option_defaults,
            "parts": self.parts,
            "drawings": self.drawings,
        })
    }

    /// Read a variant written by [`CompiledVariant::to_value`].
    pub fn from_value(v: &Value) -> Result<Self, String> {
        let wrap = serde_json::json!({
            "root": v["root"],
            "optionDefaults": v["optionDefaults"],
            "variants": { "": v["parts"] },
            "drawings": v["drawings"],
        });
        Self::from_compiled(&wrap, "")
    }
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
    /// Canonical names of the recipes being compiled, outermost first and ending with this
    /// one: a `component` part may not name one of them (cycle) or nest past `MAX_NEST_DEPTH`.
    stack: &'a [String],
}

/// How many levels of `component` parts a recipe may nest (host, nested, nested in nested).
pub const MAX_NEST_DEPTH: usize = 2;

/// The component a recipe `component` part draws: the `component` of the host's anatomy part
/// of the same name (spec/anatomy-format.md, Another component as a part).
pub(crate) fn part_component<'a>(graph: &'a TokenGraph, host: &str, part: &str) -> Option<&'a str> {
    [graph.canonical_component(host), host]
        .into_iter()
        .find_map(|name| {
            graph
                .components
                .iter()
                .find(|c| c.name == name)?
                .raw
                .get("anatomy")?
                .as_array()?
                .iter()
                .find(|p| p.get("name").and_then(Value::as_str) == Some(part))?
                .get("component")?
                .as_str()
        })
}

/// Solve-time context: picks among compiled candidates for one request.
struct Ctx<'a> {
    req: &'a RenderRequest,
    option_defaults: &'a HashMap<String, Value>,
    /// Where the copy being solved sits among a container's repeated copies (`first`,
    /// `middle`, `last`, `only`); `None` outside a repeated copy.
    position: Option<&'static str>,
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
    let of_component = |r: &crate::graph::RelationshipRecord| {
        r.raw.pointer("/scope/component").and_then(Value::as_str) == Some(component)
    };
    // Values another component owns but this one's relationships point at (accordion widths
    // are `field` widths).
    let referenced: std::collections::HashSet<&str> = graph
        .relationships
        .iter()
        .filter(|r| of_component(r))
        .filter_map(|r| r.raw.get("$ref").and_then(Value::as_str))
        .collect();
    graph
        .relationships
        .iter()
        .filter(|r| {
            // A scoped token is a record with a `value`, or an alias (a `$ref` and no `context`:
            // a record with a `context` links a part to a token instead).
            let token = if r.raw.get("$ref").is_some() {
                r.raw.get("context").is_none() && r.raw.get("value").is_none()
            } else {
                r.raw.get("value").is_some()
            };
            token && (of_component(r) || r.uuid.as_deref().is_some_and(|u| referenced.contains(u)))
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
                alias_target: r.raw.get("$ref").and_then(Value::as_str).map(String::from),
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

/// Replace a compiled `typeStyle` prop with the font props it supplies. Each of `fontFamily`,
/// `fontSize`, `fontWeight` and `lineHeight` the part does not bind itself gets a copy of the
/// `typeStyle` entries whose candidates carry that axis's unpacked value (token: the composite,
/// chain: the inner token). A prop the part binds always wins for its axis; this is recipe-level
/// precedence, not a token cascade. A candidate whose composite does not resolve is dropped, and
/// the first expanded axis reports why (the rest stay silent, so it shows once).
fn expand_type_style(props: &mut serde_json::Map<String, Value>) {
    let Some(source) = props.remove("typeStyle") else {
        return;
    };
    let mut first = true;
    for axis in ["fontFamily", "fontSize", "fontWeight", "lineHeight"] {
        if props.contains_key(axis) {
            continue;
        }
        let mut one = |entry: &Value| -> Value {
            let mut entry = entry.clone();
            let mut miss: Option<String> = None;
            let list: Vec<Value> = entry["candidates"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(|c| {
                    let a = &c["style"][axis];
                    let whole = c["style"]["miss"].as_str();
                    let reason = whole.or_else(|| a["miss"].as_str());
                    if let (Some(v), None) = (a.get("value"), reason) {
                        let mut c = c.clone();
                        c["value"] = v.clone();
                        c["chain"] = a["token"]
                            .as_str()
                            .map_or(serde_json::json!([]), |t| serde_json::json!([t]));
                        c.as_object_mut().map(|o| o.remove("style"));
                        return Some(c);
                    }
                    // A composite-wide miss shows once, on the first axis expanded.
                    let silent = whole.is_some() && !first;
                    miss.get_or_insert(if silent {
                        String::new()
                    } else {
                        reason
                            .unwrap_or("typeStyle: composite has no such axis")
                            .to_string()
                    });
                    None
                })
                .collect();
            entry["candidates"] = Value::Array(list);
            if let Some(m) = miss {
                entry["miss"] = Value::String(m);
            }
            entry
        };
        let expanded = match &source {
            Value::Array(entries) => Value::Array(entries.iter().map(&mut one).collect()),
            other => one(other),
        };
        first = false;
        props.insert(axis.into(), expanded);
    }
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
            let (sa, ea) = rank_key(&a.raw, &mctx);
            let (sb, eb) = rank_key(&b.raw, &mctx);
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
        // A selector with no `context` names a record by its structured identity; `context`
        // then holds that identity for the cache key and the miss message.
        let by_context = rel.get("context").and_then(Value::as_str);
        let context = match by_context {
            Some(c) => c.trim().to_string(),
            None => {
                let mut ident = rel.as_object()?.clone();
                ident.remove("property");
                Value::Object(ident).to_string()
            }
        };
        let position = crate::scope::selector_position(rel);
        let scale = self.req.mode.get("scale").cloned().unwrap_or_default();
        let key = format!(
            "{}\u{1f}{property}\u{1f}{context}\u{1f}{position}\u{1f}{scale}",
            self.req.component
        );
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
            let mut matched: Vec<usize> = if by_context.is_some() {
                by_scope.get(&scope_key).cloned().unwrap_or_default()
            } else {
                let mut sel = rel.clone();
                sel["property"] = Value::String(property.clone());
                let comp = self.req.component.as_str();
                (0..self.graph.relationships.len())
                    .filter(|&i| {
                        let r = &self.graph.relationships[i].raw;
                        r.pointer("/scope/component").and_then(Value::as_str) == Some(comp)
                            && crate::scope::selector_matches(&sel, r)
                    })
                    .collect()
            };
            // A record pinned to the stroke position the selector asks for replaces an unpinned
            // record with the same other pins; a record pinned to the other position is not
            // a candidate.
            matched.retain(|&i| crate::scope::position_fits(rel, &self.graph.relationships[i].raw));
            // A record pinned to the other scale is not a candidate at this one.
            // shortcut: only a plain string scale is a pin; an array or anyOf scale still applies
            // at every scale, upgrade when a recipe needs it.
            matched.retain(|&i| {
                self.graph.relationships[i]
                    .raw
                    .pointer("/scope/options/scale")
                    .and_then(Value::as_str)
                    .is_none_or(|s| scale.is_empty() || s == scale)
            });
            let other_pins = |raw: &Value| {
                let mut o = raw
                    .pointer("/scope/options")
                    .and_then(Value::as_object)
                    .cloned()
                    .unwrap_or_default();
                o.remove("position");
                o
            };
            let pinned: Vec<_> = matched
                .iter()
                .map(|&i| &self.graph.relationships[i].raw)
                .filter(|r| crate::scope::stroke_position(r).is_some())
                .map(other_pins)
                .collect();
            matched.retain(|&i| {
                let raw = &self.graph.relationships[i].raw;
                crate::scope::stroke_position(raw).is_some() || !pinned.contains(&other_pins(raw))
            });
            for i in matched {
                let r = &self.graph.relationships[i];
                let scope = r.raw.get("scope");
                if let Some(rf) = r.raw.get("$ref").and_then(Value::as_str) {
                    // A record with an any-of is one candidate per alternative, so the solver
                    // and the compiled format only ever see plain pins and states.
                    for (options, states) in scope_variants(scope, &declared) {
                        refs.push((
                            rf.to_string(),
                            options,
                            states,
                            RelationshipRef {
                                uuid: r.uuid.clone(),
                                context: r
                                    .raw
                                    .get("context")
                                    .and_then(Value::as_str)
                                    .map_or_else(|| context.clone(), |c| c.trim().to_string()),
                                property: property.clone(),
                            },
                        ));
                    }
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
            // A concept id (a palette color set) picks its member for the request's mode.
            let target = self
                .graph
                .resolve_alias_in_context(rf, &self.mode_ctx())
                .or_else(|| self.graph.resolve_alias_key(rf));
            if let Some(t) = target {
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
            let ident = match obj.get("relationship").and_then(Value::as_object) {
                Some(r) if !r.contains_key("context") => {
                    let mut r = r.clone();
                    r.remove("property");
                    Value::Object(r).to_string()
                }
                _ => text("context").trim().to_string(),
            };
            format!("{prop}: no relationship '{property}' / '{ident}'")
        }
    }

    /// The precedence of each interaction state in `states`, highest first. A state the
    /// component declares uses its declared `precedence`, else the registry default; it is an
    /// interaction state when declared `trigger: interaction` or, undeclared, when the
    /// registry gives it a precedence. Prop states carry none.
    fn interaction_precedence(&self, states: &[String]) -> Vec<u32> {
        let declared = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.req.component)
            .and_then(|c| c.raw.get("states"))
            .and_then(Value::as_array);
        let registry = crate::registry::RegistryData::embedded();
        let mut out: Vec<u32> = states
            .iter()
            .filter_map(|id| {
                let decl = declared.and_then(|d| {
                    d.iter().find(|s| {
                        s.get("name")
                            .and_then(Value::as_str)
                            .is_some_and(|n| state_ids(n).contains(id))
                    })
                });
                let default = registry.state_precedence(id);
                let trigger = decl.and_then(|d| d.get("trigger").and_then(Value::as_str));
                if trigger == Some("prop") || (trigger.is_none() && default.is_none()) {
                    return None;
                }
                let declared = decl.and_then(|d| d.get("precedence").and_then(Value::as_u64));
                Some(declared.map_or(default.unwrap_or(0), |p| p as u32))
            })
            .collect();
        out.sort_unstable_by(|a, b| b.cmp(a));
        out
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
        let mut rank_ctx = self.mode_ctx();
        rank_ctx.insert("size".into(), self.req.size.clone());
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
                let precedence = self.interaction_precedence(&states);
                let (score, fields) = rank_key(&t.raw, &rank_ctx);
                let mut c = serde_json::json!({
                    "value": self.terminal(t),
                    "token": token_label(t),
                    "chain": self.alias_chain(t),
                    "states": states,
                    "rank": [score, fields],
                });
                if !precedence.is_empty() {
                    c["precedence"] = serde_json::json!(precedence);
                }
                if let Some(o) = options {
                    c["options"] = o;
                }
                if let Some(r) = rel {
                    c["boundBy"] = serde_json::json!(r);
                }
                if prop == "typeStyle" {
                    c["style"] = self.type_style_axes(t);
                }
                c
            })
            .collect();
        (list, miss)
    }

    /// A `typeStyle` candidate's composite unpacked for the request's mode: per axis the
    /// terminal `value` and the inner token's legacy name, or `{"miss": ...}` when the token is
    /// not a composite or the axis alias does not resolve. Consumed by [`expand_type_style`].
    fn type_style_axes(&self, t: &crate::graph::TokenRecord) -> Value {
        let label = token_label(t);
        let keys = self
            .lookup
            .legacy_keys
            .get_or_init(|| crate::cascade::legacy_keys(self.graph));
        let Some(u) = crate::typography::unpack_in(self.graph, t, &self.mode_ctx(), Some(keys))
        else {
            return serde_json::json!({
                "miss": format!("typeStyle: '{label}' is not a typography composite")
            });
        };
        let mut out = serde_json::Map::new();
        for (axis, sub) in [
            ("fontFamily", u.font_family),
            ("fontSize", u.font_size),
            ("fontWeight", u.font_weight),
            ("lineHeight", u.line_height),
        ] {
            let Some(sub) = sub else { continue };
            let entry = match sub.value {
                Some(v) => serde_json::json!({ "value": v, "token": sub.token }),
                None => serde_json::json!({ "miss": format!(
                    "typeStyle: {label}.{axis} '{{{}}}' not found",
                    sub.token.unwrap_or_default()
                )}),
            };
            out.insert(axis.into(), entry);
        }
        Value::Object(out)
    }

    /// Compile the sources of a `gradient` value source's stops, which bind colors and offsets
    /// like any other prop.
    fn compile_gradient(&self, entry: &mut Value) {
        if let Some(layers) = entry.get_mut("shadow").and_then(Value::as_array_mut) {
            for layer in layers {
                for key in ["x", "y", "blur", "spread", "color"] {
                    if let Some(source) = layer.get_mut(key) {
                        self.compile_source("shadow", source);
                    }
                }
            }
        }
        let Some(stops) = entry
            .get_mut("gradient")
            .and_then(|g| g.get_mut("stops"))
            .and_then(Value::as_array_mut)
        else {
            return;
        };
        for stop in stops {
            for key in ["color", "offset"] {
                if let Some(source) = stop.get_mut(key) {
                    self.compile_source("gradient", source);
                }
            }
        }
    }

    /// Compile every binding of every part (`props` and a placement `inset`), and embed the
    /// compiled recipe of every `component` part (see `compile_nested`).
    fn compile_parts(
        &self,
        parts: &serde_json::Map<String, Value>,
    ) -> Result<serde_json::Map<String, Value>, String> {
        let mut out_parts = parts.clone();
        let comp = self
            .graph
            .components
            .iter()
            .find(|c| c.name == self.req.component);
        for (id, part) in out_parts.iter_mut() {
            // The compiled form names the repeated part and option itself, so the solver and
            // the published engine never read component data.
            if let Some(rep) = part.get_mut("repeat").and_then(Value::as_object_mut) {
                let slot = rep.remove("slot");
                let slot = slot.as_ref().and_then(Value::as_str);
                let (p, o) = comp
                    .zip(slot)
                    .and_then(|(c, s)| collection_slot(&c.raw, s))
                    .ok_or_else(|| {
                        format!(
                            "part '{id}' repeats slot {slot:?}, which '{}' does not declare as a collection slot",
                            self.req.component
                        )
                    })?;
                rep.insert("part".into(), p.into());
                rep.insert("option".into(), o.into());
            }
            if part.get("kind").and_then(Value::as_str) == Some("component") {
                let name = part_component(self.graph, &self.req.component, id)
                    .ok_or_else(|| {
                        format!(
                            "component part '{id}' has no anatomy part '{id}' with a `component` in '{}'",
                            self.req.component
                        )
                    })?
                    .to_string();
                // The compiled part keeps carrying the component so readers of the compiled
                // form (the solver, the slim WASM engine) are unchanged.
                part["component"] = Value::String(name.clone());
                let (nested, size) = self.compile_nested(id, &name, part)?;
                part["nested"] = nested;
                part["nestedSize"] = Value::String(size);
            }
            if part.get("kind").and_then(Value::as_str) == Some("slot") {
                self.compile_slot(id, comp.map(|c| &c.raw), part)?;
            }
            if let Some(inset) = part.get_mut("placement").and_then(|p| p.get_mut("inset")) {
                match inset {
                    Value::Array(entries) => entries
                        .iter_mut()
                        .for_each(|e| self.compile_source("inset", e)),
                    other => self.compile_source("inset", other),
                }
            }
            for key in ["offset", "crossOffset"] {
                if let Some(src) = part.get_mut("floating").and_then(|f| f.get_mut(key)) {
                    self.compile_source(key, src);
                }
            }
            if let Some(props) = part.get_mut("props").and_then(Value::as_object_mut) {
                for (name, source) in props.iter_mut() {
                    match source {
                        Value::Array(entries) => entries.iter_mut().for_each(|e| {
                            self.compile_source(name, e);
                            self.compile_gradient(e);
                        }),
                        other => {
                            self.compile_source(name, other);
                            self.compile_gradient(other);
                        }
                    }
                }
                expand_type_style(props);
            }
        }
        Ok(out_parts)
    }

    /// Embed what a `slot` part needs to draw any request fill without reading component data:
    /// the slot's name, `acceptsOnly` and `max`, and for each accepted component its compiled
    /// recipe at the size `sizeMap` chose and the part's `with` options (a nested solve ignores an
    /// option its component does not declare).
    /// The slot is the one of the host whose `part` is this recipe part.
    fn compile_slot(&self, id: &str, host: Option<&Value>, part: &mut Value) -> Result<(), String> {
        let slot = host
            .and_then(|h| h.get("slots")?.as_array())
            .and_then(|a| {
                a.iter().find(|s| {
                    s.get("part").and_then(Value::as_str) == Some(id)
                        && s.get("collection").is_none()
                })
            })
            .ok_or_else(|| {
                format!(
                    "slot part '{id}' is not the part of a slot of '{}'",
                    self.req.component
                )
            })?
            .clone();
        let mut fills = serde_json::Map::new();
        for name in slot
            .get("accepts")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            let (nested, size) = self.compile_nested(id, name, part)?;
            let with = part.get("with").cloned().unwrap_or_default();
            fills.insert(
                name.to_string(),
                serde_json::json!({ "nested": nested, "nestedSize": size, "with": with }),
            );
        }
        part["slot"] = slot["name"].clone();
        part["acceptsOnly"] =
            Value::Bool(slot.get("acceptsOnly").and_then(Value::as_bool) == Some(true));
        if let Some(max) = slot.get("max") {
            part["max"] = max.clone();
        }
        part["fills"] = Value::Object(fills);
        part.as_object_mut().map(|o| o.remove("with"));
        Ok(())
    }

    /// The compiled variant of a `component` part's recipe, for this host size and mode, and
    /// the nested size `sizeMap` chose. The recipe resolves through the platform alias.
    fn compile_nested(
        &self,
        id: &str,
        name: &str,
        part: &Value,
    ) -> Result<(Value, String), String> {
        let canonical = self.graph.canonical_component(name).to_string();
        if self.stack.contains(&canonical) {
            return Err(format!(
                "component part '{id}' nests '{canonical}' inside itself ({})",
                self.stack.join(" > ")
            ));
        }
        if self.stack.len() > MAX_NEST_DEPTH {
            return Err(format!(
                "component part '{id}' nests '{canonical}' more than {MAX_NEST_DEPTH} levels deep ({})",
                self.stack.join(" > ")
            ));
        }
        let recipe = self
            .graph
            .visual_recipe(name)
            .ok_or_else(|| format!("component part '{id}': '{name}' has no visual recipe"))?;
        let size = part
            .pointer(&format!("/sizeMap/{}", self.req.size))
            .and_then(Value::as_str)
            .ok_or_else(|| {
                format!(
                    "component part '{id}' has no sizeMap entry for size '{}'",
                    self.req.size
                )
            })?
            .to_string();
        let req = RenderRequest {
            component: canonical,
            size: size.clone(),
            mode: self.req.mode.clone(),
            ..Default::default()
        };
        let nested = compile_variant(self.graph, &recipe.raw, &req, self.lookup, self.stack)?;
        Ok((nested.to_value(), size))
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
            // Compile time: there is no repeated copy, so no position.
            let mut cx = Ctx {
                req: &req,
                option_defaults: defaults,
                position: None,
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
            // A content icon also gets every catalog icon's drawing at this scale, so `solve`
            // can apply a request `icon` without the catalog: `iconChoices` maps `set:name`
            // to a `drawings` key. An icon missing from it is unknown or has no usable drawing.
            if is_content_icon(part).0 {
                let mut choices = serde_json::Map::new();
                for set in &self.graph.icons {
                    let names = set.raw.get("icons").and_then(Value::as_object);
                    for name in names.into_iter().flat_map(|m| m.keys()) {
                        if let Some(key) = self.attach_drawing(drawings, &set.set, name, scale) {
                            choices.insert(format!("{}:{name}", set.set), Value::String(key));
                        }
                    }
                }
                part["iconChoices"] = Value::Object(choices);
            }
            let Some(key) = self.attach_drawing(drawings, &icon.set, &icon.name, scale) else {
                part["drawingMiss"] = Value::String(drawing_miss(&icon.set, &icon.name, &req.size));
                continue;
            };
            part["drawing"] = Value::String(key);
        }
    }

    /// Add the drawing of icon `set:name` nearest `scale` to `drawings` and return its key
    /// (`set:name@scale`, `set:name` for a single drawing); `None` when the catalog has no
    /// usable drawing. A drawing the renderers cannot fit (bad viewBox, no paths) counts as missing.
    fn attach_drawing(
        &self,
        drawings: &mut serde_json::Map<String, Value>,
        set: &str,
        name: &str,
        scale: u32,
    ) -> Option<String> {
        let found = self.graph.icon(set, name, scale).filter(|d| {
            d.get("viewBox")
                .and_then(Value::as_str)
                .and_then(|v| icon_fit(v, 0.0, 0.0, 1.0, 1.0))
                .is_some()
                && d.get("paths").and_then(Value::as_array).is_some()
        })?;
        let single = self
            .graph
            .icons
            .iter()
            .find(|s| s.set == set)
            .and_then(|s| s.raw.get("icons")?.get(name))
            .is_some_and(|i| i.get("sizes").is_none());
        let key = if single {
            format!("{set}:{name}")
        } else {
            format!("{set}:{name}@{scale}")
        };
        drawings.entry(key.clone()).or_insert_with(
            || serde_json::json!({ "viewBox": found.get("viewBox"), "paths": found.get("paths") }),
        );
        Some(key)
    }
}

fn drawing_miss(set: &str, name: &str, size: &str) -> String {
    format!("icon {set}:{name} has no drawing for size '{size}'; drawing a placeholder")
}

/// The icon an `icon` part draws for `req`: its reference, the `drawings` key of its geometry
/// and a diagnostic for a missing drawing. A request icon replaces a content icon (it changes
/// nothing about layout, so only these three differ): its drawing comes from the part's
/// `iconChoices`, and an icon not in them is unknown or has no usable drawing, which is a
/// miss only when the variant was compiled with a catalog (a part with `iconChoices`).
fn part_icon<'a>(
    part: &'a Value,
    req: &RenderRequest,
) -> (Option<IconRef>, Option<&'a str>, Option<String>) {
    let Some(IconOverride::Icon { set, name }) =
        req.icon.as_ref().filter(|_| is_content_icon(part).0)
    else {
        let key = part.get("drawing").and_then(Value::as_str);
        let miss = part.get("drawingMiss").and_then(Value::as_str);
        return (IconRef::of_part(part), key, miss.map(String::from));
    };
    let icon = IconRef {
        set: set.clone(),
        name: name.clone(),
        drawing: None,
    };
    let Some(choices) = part.get("iconChoices") else {
        return (Some(icon), None, None);
    };
    match choices.get(format!("{set}:{name}")).and_then(Value::as_str) {
        Some(key) => (Some(icon), Some(key), None),
        None => (Some(icon), None, Some(drawing_miss(set, name, &req.size))),
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
        // A relationship's `scope.itemPosition` is compiled as this pin: the drawn copy's place.
        if name == "itemPosition" {
            return self
                .position
                .map_or(Value::Null, |p| Value::String(p.into()));
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
        if let Some(want) = when.get("position") {
            let ok = self.position.is_some_and(|p| match want {
                Value::Array(any) => any.iter().any(|w| w.as_str() == Some(p)),
                w => w.as_str() == Some(p),
            });
            if !ok {
                return None;
            }
            score += 1;
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
        let mut active: Vec<String> = self.req.states.iter().flat_map(|s| state_ids(s)).collect();
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

    /// `(value - min) / (max - min)` of the numeric options a `fraction` names, clamped to 0..1.
    fn fraction(&self, spec: &Value) -> f64 {
        let num = |key: &str, default: f64| {
            spec.get(key)
                .and_then(Value::as_str)
                .and_then(|n| self.option(n).as_f64())
                .unwrap_or(default)
        };
        let (value, min, max) = (num("value", 0.0), num("min", 0.0), num("max", 1.0));
        if max > min {
            ((value - min) / (max - min)).clamp(0.0, 1.0)
        } else {
            0.0
        }
    }

    /// The gradient a `gradient` value source describes. Every stop must resolve to a color
    /// and an offset; otherwise the whole gradient is dropped with a diagnostic, so a part
    /// never draws a gradient with a missing stop.
    fn gradient(&mut self, spec: &Value) -> Option<Gradient> {
        let end = |key: &str, default: [f64; 2]| -> [f64; 2] {
            match spec.get(key).and_then(Value::as_array).map(Vec::as_slice) {
                Some([x, y]) => [
                    x.as_f64().unwrap_or(default[0]),
                    y.as_f64().unwrap_or(default[1]),
                ],
                _ => default,
            }
        };
        if let Some(ramp) = spec.get("ramp") {
            let stops = self.ramp_stops(ramp)?;
            return Some(Gradient {
                from: end("from", [0.0, 0.0]),
                to: end("to", [1.0, 1.0]),
                stops,
            });
        }
        let mut stops = Vec::new();
        for (i, stop) in spec.get("stops")?.as_array()?.iter().enumerate() {
            let color = self.eval(stop.get("color"));
            let offset = self
                .eval(stop.get("offset"))
                .and_then(|r| r.num())
                .filter(|o| (0.0..=1.0).contains(o));
            match (color, offset) {
                (Some(c), Some(offset)) => stops.push(GradientStop {
                    color: c.value,
                    offset,
                    token: c.token,
                }),
                _ => {
                    self.diags.push(format!(
                        "gradient stop {} needs a color and an offset from 0 to 1 that both resolve; drawing the plain fill",
                        i + 1
                    ));
                    return None;
                }
            }
        }
        if stops.len() < 2 {
            self.diags
                .push("a gradient needs at least two stops; drawing the plain fill".into());
            return None;
        }
        // Offsets must not decrease along the line.
        if stops.windows(2).any(|w| w[1].offset < w[0].offset) {
            self.diags
                .push("gradient stop offsets must not decrease; drawing the plain fill".into());
            return None;
        }
        Some(Gradient {
            from: end("from", [0.0, 0.0]),
            to: end("to", [1.0, 1.0]),
            stops,
        })
    }

    /// The stops of a `ramp` (see [`crate::ramp`]): a slider track, or with `z` one layer of a
    /// color area. `color` is a string option (an unset one draws red with a diagnostic);
    /// `channel`, `space` and `z` are options or literals. Anything that does not resolve
    /// drops the gradient with a diagnostic, so the part draws its plain fill.
    fn ramp_stops(&mut self, ramp: &Value) -> Option<Vec<GradientStop>> {
        let text = |cx: &Self, key: &str| -> Option<String> {
            let src = ramp.get(key)?;
            let v = match src.get("option").and_then(Value::as_str) {
                Some(name) => cx.option(name),
                None => src.get("value").cloned().unwrap_or(Value::Null),
            };
            v.as_str().map(|s| s.trim().to_ascii_lowercase())
        };
        let color = match ramp.pointer("/color/option").and_then(Value::as_str) {
            Some(name) => match self.option(name) {
                Value::Null => None,
                Value::String(s) => match crate::ramp::Color::parse(&s) {
                    Some(c) => Some(c),
                    None => {
                        self.diags.push(format!(
                            "ramp color option '{name}' value {s:?} is not a hex, rgb(), hsl() or hsb() color; drawing the default color"
                        ));
                        None
                    }
                },
                v => {
                    self.diags.push(format!(
                        "ramp color option '{name}' value {v} is not a color string; drawing the default color"
                    ));
                    None
                }
            },
            None => None,
        };
        let color = color.unwrap_or_else(|| {
            if ramp.pointer("/color/option").is_some() {
                self.diags.push(
                    "ramp color is unset or invalid; drawing the ramp for hsl(0, 100%, 50%)".into(),
                );
            }
            crate::ramp::Color {
                space: crate::ramp::Space::Hsl,
                c: [0.0, 100.0, 50.0],
                a: 1.0,
            }
        });
        let space = match text(self, "space") {
            None if ramp.get("space").is_some() => {
                self.diags
                    .push("ramp space does not resolve; using the color's own".into());
                None
            }
            None => None,
            Some(s) => match crate::ramp::Space::parse(&s) {
                Some(sp) => Some(sp),
                None => {
                    self.diags.push(format!(
                        "ramp space {s:?} is not hsl, hsb or rgb; drawing the plain fill"
                    ));
                    return None;
                }
            },
        };
        let Some(channel) = text(self, "channel") else {
            self.diags
                .push("ramp channel does not resolve to a name; drawing the plain fill".into());
            return None;
        };
        let stops = if ramp.get("z").is_some() {
            let Some(z) = text(self, "z") else {
                self.diags
                    .push("ramp z does not resolve to a name; drawing the plain fill".into());
                return None;
            };
            crate::ramp::area_layer(color, space, &channel, &z)
        } else {
            crate::ramp::track(color, &channel, space)
        };
        match stops {
            Ok(stops) => Some(
                stops
                    .into_iter()
                    .map(|(offset, color)| GradientStop {
                        color,
                        offset,
                        token: String::new(),
                    })
                    .collect(),
            ),
            Err(why) => {
                self.diags
                    .push(format!("ramp: {why}; drawing the plain fill"));
                None
            }
        }
    }

    /// A text part's copy: its `text.option` when that string option is set, else its
    /// `text.fraction` as a percentage, else the request label.
    fn text_of(&self, part: &Value, label: &str) -> String {
        let Some(text) = part.get("text") else {
            return label.to_string();
        };
        if let Some(Value::String(s)) = text
            .get("option")
            .and_then(Value::as_str)
            .map(|n| self.option(n))
        {
            if !s.is_empty() {
                return s;
            }
        }
        match text.get("fraction") {
            Some(f) => format!("{}%", (self.fraction(f) * 100.0).round()),
            None => label.to_string(),
        }
    }

    /// The entry of a (possibly conditional) source whose `when` holds and ranks highest.
    fn choose<'a>(&self, source: &'a Value) -> Option<&'a Value> {
        match source {
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
                Some(best?.1)
            }
            other => {
                self.when_score(other.get("when"))?;
                Some(other)
            }
        }
    }

    /// The drop shadows a `shadow` source describes. A layer whose `x`, `y`, `blur` or `color`
    /// does not resolve (or whose `blur` or `spread` is not a number, `blur` not below 0) is
    /// dropped with a diagnostic; `spread` defaults to 0.
    fn shadows(&mut self, source: Option<&Value>) -> (Vec<Shadow>, Vec<TokenRef>) {
        let layers = source
            .and_then(|s| self.choose(s))
            .and_then(|c| c.get("shadow"))
            .and_then(Value::as_array);
        let (mut out, mut tokens) = (Vec::new(), Vec::new());
        for (i, layer) in layers.into_iter().flatten().enumerate() {
            let mut num = |key: &str, default: Option<f64>| {
                let r = self.eval(layer.get(key));
                let n = r.as_ref().and_then(Resolved::num).or(default);
                (n, r)
            };
            let (x, rx) = num("x", None);
            let (y, ry) = num("y", None);
            let (blur, rb) = num("blur", None);
            let (spread, rs) = num("spread", Some(0.0));
            let color = self.eval(layer.get("color"));
            let blur = blur.filter(|b| *b >= 0.0).map(|b| {
                if b > MAX_SHADOW_BLUR {
                    self.diags.push(format!(
                        "shadow layer {} blur {b} is above {MAX_SHADOW_BLUR}; drawing {MAX_SHADOW_BLUR}",
                        i + 1
                    ));
                }
                b.min(MAX_SHADOW_BLUR)
            });
            let color = color.filter(|c| css_color_alpha(&c.value).is_some());
            match (x, y, blur, spread, color.as_ref()) {
                (Some(x), Some(y), Some(_), Some(spread), Some(_))
                    if ![x, y, spread]
                        .iter()
                        .all(|v| v.is_finite() && v.abs() <= MAX_SHADOW_REACH) =>
                {
                    self.diags.push(format!(
                        "shadow layer {} x, y or spread is beyond {MAX_SHADOW_REACH}px; skipping it",
                        i + 1
                    ));
                }
                (Some(x), Some(y), Some(blur), Some(spread), Some(c)) => {
                    out.push(Shadow {
                        x,
                        y,
                        blur,
                        spread,
                        color: c.value.clone(),
                    });
                    let n = out.len();
                    for (name, r) in [
                        ("x", rx),
                        ("y", ry),
                        ("blur", rb),
                        ("spread", rs),
                        ("color", color),
                    ] {
                        let Some(r) = r.filter(|r| !r.token.is_empty()) else {
                            continue;
                        };
                        tokens.push(TokenRef {
                            prop: format!("shadow{n}.{name}"),
                            token: r.token,
                            value: r.value,
                            chain: r.chain,
                            relationship: r.relationship,
                        });
                    }
                }
                _ => self.diags.push(format!(
                    "shadow layer {} needs x, y, a blur of 0 or more and a color (hex, rgb(), rgba() or transparent) that resolve (and a numeric spread); skipping it",
                    i + 1
                )),
            }
        }
        (out, tokens)
    }

    fn eval(&mut self, source: Option<&Value>) -> Option<Resolved> {
        let source = source?;
        let chosen = self.choose(source)?;
        let relative_to = chosen
            .get("relativeTo")
            .and_then(Value::as_str)
            .map(String::from);
        if let Some(spec) = chosen.get("fraction") {
            return Some(Resolved {
                value: self.fraction(spec).to_string(),
                token: String::new(),
                relative_to: Some("parent".into()),
                chain: Vec::new(),
                relationship: None,
                gradient: None,
            });
        }
        if let Some(spec) = chosen.get("gradient") {
            let g = self.gradient(spec)?;
            return Some(Resolved {
                value: g.stops[0].color.clone(),
                token: String::new(),
                relative_to,
                chain: Vec::new(),
                relationship: None,
                gradient: Some(g),
            });
        }
        if let Some(name) = chosen.get("option").and_then(Value::as_str) {
            // `solve_root` already dropped a value that is not a drawable color.
            return match self.option(name) {
                Value::String(s) if !s.trim().is_empty() => Some(Resolved {
                    value: s,
                    token: String::new(),
                    relative_to,
                    chain: Vec::new(),
                    relationship: None,
                    gradient: None,
                }),
                _ => None,
            };
        }
        if let Some(name) = chosen.get("dimension").and_then(Value::as_str) {
            let v = self.option(name);
            return match v.as_f64().filter(|n| *n > 0.0) {
                Some(n) => Some(Resolved {
                    value: n.to_string(),
                    token: String::new(),
                    relative_to,
                    chain: Vec::new(),
                    relationship: None,
                    gradient: None,
                }),
                None => {
                    if !v.is_null() {
                        self.diags.push(format!(
                            "option '{name}' value {v} is not a positive number of pixels; drawing the unset size"
                        ));
                    }
                    None
                }
            };
        }
        if let Some(v) = chosen.get("value") {
            let literal = match v {
                Value::Bool(b) => Some(b.to_string()),
                v => value_to_string(v),
            };
            return literal.map(|value| Resolved {
                value,
                token: String::new(),
                relative_to,
                chain: Vec::new(),
                relationship: None,
                gradient: None,
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
        // Per property (state-model.md, Precedence and resolution algorithm): among the
        // candidates whose states are all active, most matched states first, then the highest
        // interaction precedences, then source order. `disabled` drops interaction states.
        let disabled = active.iter().any(|a| a == "disabled");
        let precedence = |c: &Value| -> Vec<u64> {
            c.get("precedence")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(Value::as_u64).collect())
                .unwrap_or_default()
        };
        let mut best: Option<(&Value, usize, Vec<u64>)> = None;
        for c in &fit {
            let Some(st) = c
                .get("states")
                .and_then(Value::as_array)
                .filter(|st| !st.is_empty())
            else {
                continue;
            };
            let all_active = st
                .iter()
                .all(|x| x.as_str().is_some_and(|x| active.iter().any(|a| a == x)));
            let prec = precedence(c);
            if !all_active || (disabled && !prec.is_empty()) {
                continue;
            }
            if best
                .as_ref()
                .is_none_or(|(_, n, p)| (st.len(), &prec) > (*n, p))
            {
                best = Some((c, st.len(), prec));
            }
        }
        // Nothing matched: the default, never an interaction candidate while disabled.
        let chosen = best.map(|(c, _, _)| c).or_else(|| {
            let no_states = |c: &Value| {
                c.get("states")
                    .and_then(Value::as_array)
                    .is_none_or(|s| s.is_empty())
            };
            fit.iter()
                .find(|c| no_states(c))
                .or_else(|| fit.iter().find(|c| disabled && precedence(c).is_empty()))
                .or_else(|| fit.first())
                .copied()
        });
        if let Some(c) = chosen {
            // Candidates tied with the chosen one that name a different token are ambiguous.
            let has_states = |c: &Value| {
                c.get("states")
                    .and_then(Value::as_array)
                    .is_some_and(|s| !s.is_empty())
            };
            let tied = |o: &&Value| {
                o.get("rank") == c.get("rank")
                    && has_states(o) == has_states(c)
                    && (!has_states(c)
                        || (o.get("states").and_then(Value::as_array).map(Vec::len)
                            == c.get("states").and_then(Value::as_array).map(Vec::len)
                            && precedence(o) == precedence(c)))
            };
            // A record pinned to a state that is not active takes no part in the render, so it
            // cannot tie with the chosen candidate.
            let applies = |o: &&Value| {
                std::ptr::eq(*o, c)
                    || o.get("states").and_then(Value::as_array).is_none_or(|st| {
                        st.iter()
                            .all(|x| x.as_str().is_some_and(|x| active.iter().any(|a| a == x)))
                    })
            };
            let mut tokens: Vec<&str> = fit
                .iter()
                .filter(|o| applies(o) && tied(o))
                .filter_map(|o| o.get("token").and_then(Value::as_str))
                .collect();
            tokens.sort_unstable();
            tokens.dedup();
            if tokens.len() > 1 {
                let what = entry
                    .get("miss")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                self.diags.push(format!(
                    "{} is ambiguous: {} candidates remain after narrowing",
                    what.replacen(": no ", ": ", 1),
                    tokens.len()
                ));
            }
        }
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
            gradient: None,
        })
    }
}

/// `scope.options` keys a relationship never pins as a component option: `state` is a token
/// state, `scale` and `colorScheme` are modes.
const RELATIONSHIP_RESERVED_OPTIONS: &[&str] = &["state", "scale", "colorScheme"];

/// The candidates a relationship's scope stands for, as `(component option pins, state ids)`.
/// A record without an any-of (proposal 017) is one candidate. The pins keep only options the
/// component declares and leave out `state`, `scale`, `colorScheme` and `anyOf`; the states are
/// normalized like a token `name.state` (so `key-focus` is `keyboard-focus`) and replace the
/// token's own.
fn scope_variants(scope: Option<&Value>, declared: &[&str]) -> Vec<(Option<Value>, Vec<String>)> {
    let options = scope
        .and_then(|s| s.get("options"))
        .and_then(Value::as_object);
    let none = serde_json::Map::new();
    let options = match options {
        Some(o) => o,
        None if scope.is_some_and(|s| s.get("itemPosition").is_some()) => &none,
        None => return vec![(None, Vec::new())],
    };
    crate::scope::variants(options)
        .into_iter()
        .map(|v| {
            let mut pinned: serde_json::Map<String, Value> = v
                .options
                .into_iter()
                .filter(|(k, _)| {
                    !RELATIONSHIP_RESERVED_OPTIONS.contains(&k.as_str())
                        && declared.contains(&k.as_str())
                })
                .collect();
            if let Some(p) = scope.and_then(|s| s.get("itemPosition")) {
                pinned.insert("itemPosition".into(), p.clone());
            }
            let states = v.states.iter().flat_map(|s| state_ids(s)).collect();
            (
                (!pinned.is_empty()).then_some(Value::Object(pinned)),
                states,
            )
        })
        .collect()
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
/// `keyboard-focus`, and `focus`, `key-focus` and `focus-visible` are the same state as
/// `keyboard-focus`; `active` and `pressed` are `down`.
/// Shared with the validation rules that compare state names across data.
pub(crate) fn state_ids(raw: &str) -> Vec<String> {
    let mut out = Vec::new();
    let rest = raw.strip_prefix("selected-");
    if rest.is_some() {
        out.push("selected".to_string());
    }
    let r = rest.unwrap_or(raw);
    out.push(match r {
        "key-focus" | "focus" | "focus-visible" => "keyboard-focus".into(),
        "active" | "pressed" => "down".into(),
        _ => r.to_string(),
    });
    out
}

/// The states a relationship `scope.options` selects: its `state` entries plus the state of
/// each true boolean option in `OPTION_STATES`. Pass the options of one variant
/// (`crate::scope::variants`), whose states are plain strings: an any-of is several records.
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

#[inline(never)]
fn text_width(req: &RenderRequest, text: &str, font_size: f64, weight: Option<&str>) -> f64 {
    // Digits and a point only, so "inf", "nan" and "+700" fall back to 400.
    let weight = Some(css_font_weight(weight))
        .filter(|w| w.bytes().all(|b| b.is_ascii_digit() || b == b'.'))
        .and_then(|w| w.parse().ok())
        .unwrap_or(400.0);
    req.text_metrics
        .as_ref()
        .unwrap_or_else(|| TextMetrics::default_table())
        .width(text, font_size, weight)
}

/// Break `text` into lines no wider than `avail`, greedily. A line ends after a space or a
/// hyphen; trailing spaces do not count toward a line's width. A word wider than `avail`
/// cannot be broken: it takes a line of its own and is returned as the second value.
fn break_lines(
    text: &str,
    avail: f64,
    measure: &dyn Fn(&str) -> f64,
) -> (Vec<String>, Option<String>) {
    let fits = |s: &str| measure(s.trim_end()) <= avail + 1e-6;
    let (mut lines, mut line, mut wide) = (Vec::new(), String::new(), None);
    for piece in text.split_inclusive([' ', '-']) {
        if !line.is_empty() && !fits(&format!("{line}{piece}")) {
            lines.push(line.trim_end().to_string());
            line.clear();
        }
        if line.is_empty() && !fits(piece) && wide.is_none() {
            wide = Some(piece.trim_end().to_string());
        }
        line.push_str(piece);
    }
    lines.push(line.trim_end().to_string());
    (lines, wide)
}

/// The longest prefix of `text` that fits `avail` with "..." after it (just "..." when none).
fn truncate_line(text: &str, avail: f64, measure: &dyn Fn(&str) -> f64) -> String {
    let n = text.chars().count();
    let cut = |k: usize| format!("{}...", text.chars().take(k).collect::<String>().trim_end());
    let keep = (0..n).rev().find(|&k| measure(&cut(k)) <= avail + 1e-6);
    cut(keep.unwrap_or(0))
}

/// Whether an option value satisfies one wanted value. `true` also matches any
/// non-empty string, e.g. an icon name; an unset option matches `false`.
/// The alpha (0 to 1) of a CSS color a request can carry in an option read by an `option` value
/// source: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` or `rgba()` (comma or space
/// separated, optional `/ alpha`) and `transparent`. `None`: not one of those.
fn css_color_alpha(s: &str) -> Option<f64> {
    let s = s.trim().to_ascii_lowercase();
    if s == "transparent" {
        return Some(0.0);
    }
    if let Some(hex) = s.strip_prefix('#') {
        if !hex.chars().all(|c| c.is_ascii_hexdigit()) {
            return None;
        }
        let digit = |i: usize| (hex.as_bytes()[i] as char).to_digit(16).map(f64::from);
        return match hex.len() {
            3 | 6 => Some(1.0),
            4 => Some(digit(3)? * 17.0 / 255.0),
            8 => Some((digit(6)? * 16.0 + digit(7)?) / 255.0),
            _ => None,
        };
    }
    let body = s
        .strip_prefix("rgba(")
        .or_else(|| s.strip_prefix("rgb("))?
        .strip_suffix(')')?;
    let parts: Vec<&str> = body
        .split(|c: char| c == ',' || c == '/' || c.is_whitespace())
        .filter(|p| !p.is_empty())
        .collect();
    if parts.len() != 3 && parts.len() != 4 {
        return None;
    }
    let num = |p: &str| p.strip_suffix('%').unwrap_or(p).parse::<f64>().ok();
    parts.iter().map(|p| num(p)).collect::<Option<Vec<_>>>()?;
    match parts.get(3) {
        None => Some(1.0),
        Some(p) => {
            let a = num(p)?;
            Some((if p.ends_with('%') { a / 100.0 } else { a }).clamp(0.0, 1.0))
        }
    }
}

/// Split `s` at the commas outside parentheses.
fn split_top_level(s: &str) -> Vec<&str> {
    let (mut out, mut depth, mut start) = (Vec::new(), 0i32, 0);
    for (i, c) in s.char_indices() {
        match c {
            '(' => depth += 1,
            ')' => depth -= 1,
            ',' if depth == 0 => {
                out.push(s[start..i].trim());
                start = i + 1;
            }
            _ => {}
        }
    }
    out.push(s[start..].trim());
    out
}

/// A CSS `linear-gradient(...)` a request can carry in an option read by an `option` value
/// source, drawn over a `w` by `h` box. Reads an angle in `deg` or a `to` side or corner
/// (default `180deg`), then two or more `<color> [<percentage>]` stops. A stop with no
/// position is spread evenly between its neighbours. `None`: not that form, a stop color that
/// is not a solid color, a position outside 0 through 100%, or positions that decrease.
fn parse_css_linear_gradient(s: &str, w: f64, h: f64) -> Option<Gradient> {
    let s = s.trim();
    let body = s
        .get(..16)
        .filter(|p| p.eq_ignore_ascii_case("linear-gradient("))
        .and_then(|_| s[16..].strip_suffix(')'))?;
    let mut parts = split_top_level(body);
    let first = parts.first()?.to_ascii_lowercase();
    // The direction as a unit vector `(dx, dy)` with y down, 0deg pointing up.
    let dir = if let Some(side) = first.strip_prefix("to ") {
        let mut sides: Vec<&str> = side.split_whitespace().collect();
        sides.sort_unstable();
        let (dx, dy) = match sides.as_slice() {
            ["top"] => (0.0, -1.0),
            ["right"] => (1.0, 0.0),
            ["bottom"] => (0.0, 1.0),
            ["left"] => (-1.0, 0.0),
            // A corner: the line is square to the diagonal through the other two corners.
            ["right", "top"] => (h, -w),
            ["bottom", "right"] => (h, w),
            ["bottom", "left"] => (-h, w),
            ["left", "top"] => (-h, -w),
            _ => return None,
        };
        let n = dx.hypot(dy);
        parts.remove(0);
        (dx / n, dy / n)
    } else if let Some(deg) = first.strip_suffix("deg") {
        let a = deg.trim().parse::<f64>().ok()?.to_radians();
        parts.remove(0);
        (a.sin(), -a.cos())
    } else {
        (0.0, 1.0)
    };
    if parts.len() < 2 {
        return None;
    }
    let mut stops: Vec<(String, Option<f64>)> = Vec::new();
    for p in &parts {
        // The position is the last word when it ends in `%`; the rest is the color.
        let (color, pos) = match p.rsplit_once(char::is_whitespace) {
            Some((c, last)) if last.ends_with('%') => (
                c.trim(),
                Some(last.trim_end_matches('%').parse::<f64>().ok()? / 100.0),
            ),
            _ => (*p, None),
        };
        css_color_alpha(color)?;
        if pos.is_some_and(|v| !(0.0..=1.0).contains(&v)) {
            return None;
        }
        stops.push((color.to_string(), pos));
    }
    // The first and last stops default to the ends; the rest spread between their neighbours.
    let last = stops.len() - 1;
    stops[0].1.get_or_insert(0.0);
    stops[last].1.get_or_insert(1.0);
    let mut i = 0;
    while i < stops.len() {
        if stops[i].1.is_some() {
            i += 1;
            continue;
        }
        let lo = stops[i - 1].1?;
        let j = (i..stops.len()).find(|&j| stops[j].1.is_some())?;
        let hi = stops[j].1?;
        for (k, stop) in stops.iter_mut().enumerate().take(j).skip(i) {
            stop.1 = Some(lo + (hi - lo) * (k - i + 1) as f64 / (j - i + 1) as f64);
        }
        i = j;
    }
    if stops
        .windows(2)
        .any(|p| p[1].1.unwrap_or(0.0) < p[0].1.unwrap_or(0.0))
    {
        return None;
    }
    // The gradient line runs through the center, as long as the box's extent along `dir`.
    let half = (w * dir.0.abs() + h * dir.1.abs()) / 2.0;
    // Rounded to a millionth, so a 90deg line is [0, 0.5] and not 0.49999999999999994.
    let round = |v: f64| (v * 1e6).round() / 1e6;
    let unit = |sign: f64| {
        [
            round(0.5 + sign * dir.0 * half / w.max(f64::EPSILON)),
            round(0.5 + sign * dir.1 * half / h.max(f64::EPSILON)),
        ]
    };
    Some(Gradient {
        from: unit(-1.0),
        to: unit(1.0),
        stops: stops
            .into_iter()
            .map(|(color, pos)| GradientStop {
                color,
                offset: pos.unwrap_or(0.0),
                token: String::new(),
            })
            .collect(),
    })
}

/// Names of the options the parts' props read through an `option` value source.
fn option_source_names(parts: &serde_json::Map<String, Value>) -> Vec<String> {
    fn walk(v: &Value, out: &mut Vec<String>) {
        match v {
            Value::Array(a) => a.iter().for_each(|x| walk(x, out)),
            Value::Object(o) => {
                if let Some(n) = o.get("option").and_then(Value::as_str) {
                    if !out.iter().any(|x| x == n) {
                        out.push(n.to_string());
                    }
                }
                // A ramp reads its own options (a color string, a channel name), not solid colors.
                o.iter()
                    .filter(|(k, _)| k.as_str() != "ramp")
                    .for_each(|(_, x)| walk(x, out));
            }
            _ => {}
        }
    }
    let mut out = Vec::new();
    for part in parts.values() {
        if let Some(props) = part.get("props") {
            walk(props, &mut out);
        }
    }
    out
}

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
                    // A `fraction` reads the options it names; a text part's `text.option` too.
                    let named: Vec<&str> = match (k.as_str(), x) {
                        ("fraction", Value::Object(f)) => {
                            f.values().filter_map(Value::as_str).collect()
                        }
                        ("text", t) => t
                            .get("option")
                            .and_then(Value::as_str)
                            .into_iter()
                            .collect(),
                        ("option" | "dimension", Value::String(name)) => vec![name.as_str()],
                        _ => Vec::new(),
                    };
                    for name in named {
                        if !used.iter().any(|u| u == name) {
                            used.push(name.to_string());
                        }
                    }
                    if k == "with" {
                        // A `component` part binds a nested option to a host option.
                        let hosts = x.as_object().into_iter().flat_map(|w| w.values());
                        for name in hosts.filter_map(|v| v.get("option")?.as_str()) {
                            if !used.iter().any(|u| u == name) {
                                used.push(name.to_string());
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
/// that moves its conditions into relationships no longer names those options itself. A part's
/// anatomy `presentWhen` counts as its recipe condition.
pub fn recipe_options_in(
    graph: &TokenGraph,
    recipe: &Value,
    component: &str,
) -> (Vec<String>, Vec<String>) {
    let (mut used, structural) = recipe_options(&recipe_with_presence(graph, recipe, component));
    // The array option a container repeats a child over counts as read.
    let comp = graph.components.iter().find(|c| c.name == component);
    for part in recipe
        .get("parts")
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|p| p.values())
    {
        let slot = part.pointer("/repeat/slot").and_then(Value::as_str);
        if let Some((_, option)) = comp.zip(slot).and_then(|(c, s)| collection_slot(&c.raw, s)) {
            if !used.iter().any(|u| u == option) {
                used.push(option.to_string());
            }
        }
    }
    let mut selectors: Vec<Value> = Vec::new();
    fn walk(v: &Value, out: &mut Vec<Value>) {
        match v {
            Value::Array(a) => a.iter().for_each(|x| walk(x, out)),
            Value::Object(o) => {
                if let Some(r) = o.get("relationship").filter(|r| r.is_object()) {
                    out.push(r.clone());
                }
                o.values().for_each(|x| walk(x, out));
            }
            _ => {}
        }
    }
    walk(recipe, &mut selectors);
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
        if comp != Some(component)
            || !selectors
                .iter()
                .any(|s| crate::scope::selector_identity_matches(s, &r.raw))
        {
            continue;
        }
        let Some(opts) = r.raw.pointer("/scope/options").and_then(Value::as_object) else {
            continue;
        };
        for key in crate::scope::option_names(opts) {
            let reserved = RELATIONSHIP_RESERVED_OPTIONS.contains(&key.as_str());
            if !reserved && declared.contains(&key.as_str()) && !used.contains(&key) {
                used.push(key);
            }
        }
    }
    (used, structural)
}

/// Whether a selector `property`, which may hold `{size}` style templates, can name `prop`.
fn property_fits(template: &str, prop: &str) -> bool {
    template
        .find('{')
        .map_or(template == prop, |i| prop.starts_with(&template[..i]))
}

/// A copy of `recipe` with each structured relationship selector (no `context`) rewritten to
/// the `context` of the first record it names, so a tool that groups bindings by context
/// label reads both forms. A selector that names no record is left as it is.
pub fn with_context_selectors(recipe: &Value, graph: &TokenGraph, component: &str) -> Value {
    fn walk(v: &mut Value, graph: &TokenGraph, component: &str) {
        match v {
            Value::Array(a) => a.iter_mut().for_each(|x| walk(x, graph, component)),
            Value::Object(o) => {
                if let Some(Value::Object(sel)) = o.get_mut("relationship") {
                    if !sel.contains_key("context") {
                        let probe = Value::Object(sel.clone());
                        let template = sel.get("property").and_then(Value::as_str).unwrap_or("");
                        let ctx = graph.relationships.iter().find_map(|r| {
                            let prop = r.raw.pointer("/scope/property").and_then(Value::as_str)?;
                            let ok = r.raw.pointer("/scope/component").and_then(Value::as_str)
                                == Some(component)
                                && property_fits(template, prop)
                                && crate::scope::selector_identity_matches(&probe, &r.raw);
                            ok.then(|| r.raw.get("context").and_then(Value::as_str))?
                        });
                        if let Some(c) = ctx {
                            let property = sel.get("property").cloned().unwrap_or_default();
                            let position = sel.get("position").cloned();
                            *sel = serde_json::Map::from_iter([
                                ("property".to_string(), property),
                                ("context".to_string(), Value::String(c.trim().to_string())),
                            ]);
                            if let Some(p) = position {
                                sel.insert("position".into(), p);
                            }
                        }
                    }
                }
                o.values_mut().for_each(|x| walk(x, graph, component));
            }
            _ => {}
        }
    }
    let mut out = recipe.clone();
    walk(&mut out, graph, component);
    out
}

/// The repeated part and the array option of a component's `collection` slot named `slot`:
/// what a container's recipe `repeat.slot` stands for. `None` when the component has no such
/// slot, or it declares no `collection` and `part`.
pub fn collection_slot<'a>(component: &'a Value, slot: &str) -> Option<(&'a str, &'a str)> {
    let s = component
        .get("slots")?
        .as_array()?
        .iter()
        .find(|s| s.get("name").and_then(Value::as_str) == Some(slot))?;
    Some((s.get("part")?.as_str()?, s.get("collection")?.as_str()?))
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

/// The recipe's parts with each anatomy part's `presentWhen` folded into the part's
/// `visibleWhen`: presence is read from the anatomy, and the recipe keeps only `position`
/// (spec/anatomy-format.md, `presentWhen`).
fn parts_with_presence(
    graph: &TokenGraph,
    component: &str,
    parts: &serde_json::Map<String, Value>,
) -> serde_json::Map<String, Value> {
    let anatomy = [graph.canonical_component(component), component]
        .into_iter()
        .find_map(|name| graph.components.iter().find(|c| c.name == name))
        .and_then(|c| c.raw.get("anatomy")?.as_array());
    let mut parts = parts.clone();
    for (name, part) in parts.iter_mut() {
        let when = anatomy
            .and_then(|a| {
                a.iter()
                    .find(|p| p.get("name").and_then(Value::as_str) == Some(name))
            })
            .and_then(|p| p.get("presentWhen")?.as_object());
        let (Some(when), Some(part)) = (when, part.as_object_mut()) else {
            continue;
        };
        let visible = part
            .entry("visibleWhen")
            .or_insert_with(|| Value::Object(Default::default()));
        if let Some(visible) = visible.as_object_mut() {
            visible.extend(when.iter().map(|(k, v)| (k.clone(), v.clone())));
        }
    }
    parts
}

/// `recipe` with each part's anatomy `presentWhen` folded into its `visibleWhen`, so a reader
/// of a recipe's conditions sees presence as well.
pub fn recipe_with_presence(graph: &TokenGraph, recipe: &Value, component: &str) -> Value {
    let mut folded = recipe.clone();
    if let Some(parts) = recipe.get("parts").and_then(Value::as_object) {
        folded["parts"] = Value::Object(parts_with_presence(graph, component, parts));
    }
    folded
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
    let parts = &parts_with_presence(graph, component, parts);
    let option_defaults = component_option_defaults(graph, component);

    let lookup = Lookup::default();
    let scoped = lookup.scoped(graph, component);
    let stack = [graph.canonical_component(component).to_string()];
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
                stack: &stack,
            };
            let key = format!(
                "{size}|{}|{}",
                mode.get("colorScheme").map_or("", String::as_str),
                mode.get("scale").map_or("", String::as_str)
            );
            let mut compiled = cx.compile_parts(parts)?;
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
/// `ancestors` are the recipes this one is nested in (empty for a top-level render).
fn compile_variant(
    graph: &TokenGraph,
    recipe: &Value,
    req: &RenderRequest,
    lookup: &Lookup,
    ancestors: &[String],
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
    let parts = &parts_with_presence(graph, &req.component, parts);
    let root = recipe
        .get("root")
        .and_then(Value::as_str)
        .ok_or("recipe has no root")?;
    if !parts.contains_key(root) {
        return Err("root part not found".into());
    }
    let scoped = lookup.scoped(graph, &req.component);
    let stack: Vec<String> = ancestors
        .iter()
        .cloned()
        .chain([graph.canonical_component(&req.component).to_string()])
        .collect();
    let cx = CompileCx {
        graph,
        lookup,
        req,
        size_index,
        scoped: &scoped,
        stack: &stack,
    };
    let option_defaults = component_option_defaults(graph, &req.component);
    let mut compiled = cx.compile_parts(parts)?;
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
            "{}\u{1f}{}\u{1f}{modes:?}\u{1f}{:016x}",
            req.component,
            req.size,
            hasher.finish()
        );
        if let Some(v) = self.variants.borrow().get(&key) {
            return Ok(v.clone());
        }
        let v = std::rc::Rc::new(compile_variant(graph, recipe, req, &self.lookup, &[])?);
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

/// `req`, or a copy at the component's default `size` when the request is for `m`, the tools'
/// implicit default, and the recipe's `sizeScale` has no `m`, as a component with a numeric size
/// (an avatar's 500) does not. Any other size the recipe lacks stays an error.
fn with_default_size<'a>(
    graph: &TokenGraph,
    recipe: &Value,
    req: &'a RenderRequest,
) -> std::borrow::Cow<'a, RenderRequest> {
    let scale = recipe.get("sizeScale");
    if req.size != "m" || scale.is_none_or(|s| s.get(&req.size).is_some()) {
        return std::borrow::Cow::Borrowed(req);
    }
    let default = graph
        .components
        .iter()
        .find(|c| c.name == req.component)
        .and_then(|c| c.raw.pointer("/options/size/default"))
        .and_then(value_to_string)
        .filter(|d| scale.is_some_and(|s| s.get(d).is_some()));
    match default {
        Some(size) => std::borrow::Cow::Owned(RenderRequest {
            size,
            ..req.clone()
        }),
        None => std::borrow::Cow::Borrowed(req),
    }
}

/// Like [`build_scene`], reusing compiled variants from `cache`. Use one cache per graph
/// when rendering many requests (a matrix); results are identical.
pub fn build_scene_cached(
    graph: &TokenGraph,
    recipe: &Value,
    req: &RenderRequest,
    cache: &SceneCache,
) -> Result<Scene, String> {
    let req = with_default_size(graph, recipe, req);
    solve(&*cache.variant(graph, recipe, &req)?, &req)
}

/// Lay out a compiled variant for one request: choose candidates by state, option and
/// `when`, then place the parts. A pure function of its arguments; it needs no token graph.
/// `req` must have the size and mode the variant was compiled for. A container whose
/// `repeat` names a child draws that child once per entry (see [`solve_copies`]).
pub fn solve(variant: &CompiledVariant, req: &RenderRequest) -> Result<Scene, String> {
    let _scene = SceneGuard::enter();
    let mut scene = solve_root(variant, &variant.root, req, None)?;
    scene.diagnostics.extend(unmatched_slot_keys(variant, req));
    Ok(scene)
}

/// One warning per request `slots` key that is no slot name of the recipe's slot parts. A key
/// that is a part id (`options` for slot `default`) is called out: the request keys by name.
fn unmatched_slot_keys(variant: &CompiledVariant, req: &RenderRequest) -> Vec<String> {
    let mut slots: Vec<(&str, &str)> = variant
        .parts
        .iter()
        .filter(|(_, p)| p.get("kind").and_then(Value::as_str) == Some("slot"))
        .filter_map(|(id, p)| Some((p.get("slot")?.as_str()?, id.as_str())))
        .collect();
    slots.sort_unstable();
    let mut keys: Vec<&String> = req
        .slots
        .keys()
        .filter(|k| !slots.iter().any(|(n, _)| n == k))
        .collect();
    keys.sort_unstable();
    let list = if slots.is_empty() {
        "none".to_string()
    } else {
        slots
            .iter()
            .map(|(n, id)| format!("{n} (part '{id}')"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    keys.into_iter()
        .map(|k| {
            let c = &req.component;
            match slots.iter().find(|(_, id)| id == k) {
                Some((n, _)) => format!(
                    "slots: request key '{k}' is the part id of slot '{n}'; use the slot name. Slots with a part: {list}"
                ),
                None => format!(
                    "slots: request key '{k}' is not a slot of '{c}'; slots with a part: {list}"
                ),
            }
        })
        .collect()
}

/// [`solve`] with `root_id` as the root: a repeated part is solved as the root of its own
/// copy (see [`solve_copies`]).
fn solve_root(
    variant: &CompiledVariant,
    root_id: &str,
    req: &RenderRequest,
    position: Option<&'static str>,
) -> Result<Scene, String> {
    let parts = &variant.parts;
    let root = parts.get(root_id).ok_or("root part not found")?;
    // An option an `option` value source reads must be a solid color. A value that is not one
    // is dropped with a diagnostic, and a fully transparent one is dropped quietly, so the part
    // draws its unset look (React Spectrum draws the empty slash for alpha 0).
    let mut diags = Vec::new();
    let mut dropped = Vec::new();
    for name in option_source_names(parts) {
        let Some(v) = req.options.get(&name).filter(|v| !v.is_null()) else {
            continue;
        };
        match v.as_str().map(|s| (s, css_color_alpha(s))) {
            Some((_, Some(a))) if a <= 0.0 => dropped.push(name),
            Some((_, Some(_))) => {}
            Some((s, None)) if s.trim().is_empty() => dropped.push(name),
            Some((s, None)) if parse_css_linear_gradient(s, 1.0, 1.0).is_some() => {}
            _ => {
                diags.push(format!(
                    "option '{name}' value {v} is not a solid color (hex, rgb(), rgba() or transparent) or a linear-gradient() of them; images are not drawn. Drawing the unset look"
                ));
                dropped.push(name);
            }
        }
    }
    let cleaned;
    let req = if dropped.is_empty() {
        req
    } else {
        cleaned = {
            let mut r = req.clone();
            for n in &dropped {
                r.options.remove(n);
            }
            r
        };
        &cleaned
    };
    let mut cx = Ctx {
        req,
        option_defaults: &variant.option_defaults,
        position,
        diags,
    };
    if req.options.contains_key("icon") {
        cx.diags.push(
            "option 'icon' is not drawn and was ignored; use the request's icon field ({set, name} or \"none\")"
                .into(),
        );
    }
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

    let underline_of = |cx: &mut Ctx, part: &Value, tokens: &mut Vec<TokenRef>| {
        let td = rp(cx, part, "textDecoration");
        track(tokens, "textDecoration", &td);
        match td.as_ref().map(|r| r.value.trim()) {
            Some("underline") => {
                let thickness = rp(cx, part, "underlineThickness");
                let offset = rp(cx, part, "underlineOffset");
                track(tokens, "underlineThickness", &thickness);
                track(tokens, "underlineOffset", &offset);
                let mut size_of = |name: &str, r: &Option<Resolved>| match r {
                    None => 1.0,
                    Some(r) => r.num().unwrap_or_else(|| {
                        cx.diags.push(format!(
                            "{name} '{}' is not a number or px value; using 1",
                            r.value
                        ));
                        1.0
                    }),
                };
                Some(Underline {
                    thickness: size_of("underlineThickness", &thickness),
                    offset: size_of("underlineOffset", &offset),
                })
            }
            Some("none") | None => None,
            Some(v) => {
                cx.diags.push(format!(
                    "textDecoration '{v}' is not one of underline, none"
                ));
                None
            }
        }
    };

    let pattern_of = |cx: &mut Ctx, part: &Value, tokens: &mut Vec<TokenRef>| {
        let alt = rp(cx, part, "patternFill");
        let size = rp(cx, part, "patternSize");
        track(tokens, "patternFill", &alt);
        track(tokens, "patternSize", &size);
        match (alt, size.as_ref().and_then(Resolved::num)) {
            (Some(a), Some(size)) if size > 0.0 => Some(Pattern { alt: a.value, size }),
            (None, None) => None,
            _ => {
                cx.diags.push(
                    "patternFill and patternSize must both resolve; drawing the plain fill".into(),
                );
                None
            }
        }
    };

    let height = rp(&mut cx, root, "height");
    let min_height = rp(&mut cx, root, "minHeight");
    let root_width = rp(&mut cx, root, "width");
    let min_width = rp(&mut cx, root, "minWidth");
    let pad_s = rp(&mut cx, root, "paddingInlineStart");
    let pad_e = rp(&mut cx, root, "paddingInlineEnd");
    let pad_bs = rp(&mut cx, root, "paddingBlockStart");
    let pad_be = rp(&mut cx, root, "paddingBlockEnd");
    let gap = rp(&mut cx, root, "gap");
    let radius = rp(&mut cx, root, "cornerRadius");
    let fill = rp(&mut cx, root, "fill");
    let stroke = rp(&mut cx, root, "stroke");
    let stroke_w = rp(&mut cx, root, "strokeWidth");
    let stroke_o = rp(&mut cx, root, "strokeOpacity");
    let stroke_over = rp(&mut cx, root, "strokeOver").is_some_and(|r| r.value.trim() == "true");
    let inner_stroke = rp(&mut cx, root, "innerStroke");
    let inner_w = rp(&mut cx, root, "innerStrokeWidth");
    let inner_o = rp(&mut cx, root, "innerStrokeOpacity");
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
        ("strokeOpacity", &stroke_o),
        ("innerStroke", &inner_stroke),
        ("innerStrokeWidth", &inner_w),
        ("innerStrokeOpacity", &inner_o),
        ("width", &root_width),
        ("minWidth", &min_width),
        ("height", &height),
        ("height", &min_height),
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
    let [m_width, m_min_width, m_height, m_min_height, m_pad_s, m_pad_e, m_pad_bs, m_pad_be, m_gap, m_radius] =
        [
            ("width", &root_width),
            ("minWidth", &min_width),
            ("height", &height),
            ("height", &min_height),
            ("paddingInlineStart", &pad_s),
            ("paddingInlineEnd", &pad_e),
            ("paddingBlockStart", &pad_bs),
            ("paddingBlockEnd", &pad_be),
            ("gap", &gap),
            ("cornerRadius", &radius),
        ]
        .map(|(n, r)| token_ref(n, r));
    let min_h = min_height.as_ref().and_then(Resolved::num);
    let explicit_h = height
        .as_ref()
        .and_then(Resolved::num)
        .map(|h| h.max(min_h.unwrap_or(0.0)));
    let fixed_w = req
        .width
        .filter(|w| w.is_finite() && *w > 0.0)
        .or_else(|| root_width.as_ref().and_then(Resolved::num));
    let min_w = min_width
        .as_ref()
        .and_then(|r| {
            let v = r.num()?;
            if r.relative_to.as_deref() != Some("height") {
                return Some(v);
            }
            let basis = min_h.or(explicit_h);
            if basis.is_none() {
                cx.diags.push(
                    "minWidth is relative to the height, but the root has no height or minHeight; minWidth is ignored"
                        .to_string(),
                );
            }
            basis.map(|h| v * h)
        })
        .unwrap_or(0.0);
    let block_padded = pad_bs.is_some() || pad_be.is_some();
    let pad_bs = pad_bs.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_be = pad_be.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_s = pad_s.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_e = pad_e.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let host = Host {
        defer_width: false,
        width: fixed_w.map(|w| w.max(min_w) - pad_s - pad_e),
        height: explicit_h.map(|h| h - pad_bs - pad_be),
        // A ratio of the height (a pill is 0.5) needs the root's height; without one the
        // nested root cannot inherit it.
        corner_radius: radius.as_ref().and_then(|r| {
            let v = r.num()?;
            match r.relative_to.as_deref() {
                Some("height") => explicit_h.map(|h| v * h),
                _ => Some(v),
            }
        }),
    };
    let gap = gap.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let direction = rp(&mut cx, root, "direction");
    let align = rp(&mut cx, root, "align");
    let justify = rp(&mut cx, root, "justify");
    let direction = layout_keyword(
        &mut cx,
        "direction",
        &direction,
        &["row", "column", "stack", "grid"],
    );
    let (column, stack, grid) = (
        direction == "column",
        direction == "stack",
        direction == "grid",
    );
    let grid_props = grid.then(|| {
        let cols = rp(&mut cx, root, "columns");
        let col_gap = rp(&mut cx, root, "columnGap");
        let row_gap = rp(&mut cx, root, "rowGap");
        for (n, r) in [("columnGap", &col_gap), ("rowGap", &row_gap)] {
            track(&mut container_tokens, n, r);
        }
        (cols, col_gap, row_gap)
    });
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
    #[derive(Default)]
    struct Child {
        id: String,
        kind: String,
        w: f64,
        h: f64,
        text: Option<String>,
        font_size: f64,
        font_weight: Option<String>,
        font_family: Option<String>,
        underline: Option<Underline>,
        pattern: Option<Pattern>,
        gradient: Option<Gradient>,
        color: Option<String>,
        stroke: Option<String>,
        fill: Option<String>,
        stroke_width: f64,
        stroke_opacity: Option<f64>,
        sweep: Option<f64>,
        radius: Option<Resolved>,
        tokens: Vec<TokenRef>,
        row: Option<Row>,
        auto_w: bool,
        grow: f64,
        // `wrap` or `truncate` when the text part sets `overflow`; `lines` then holds the
        // broken lines and `line_h` is one line's height (`h` is all lines).
        overflow: Option<&'static str>,
        line_h: f64,
        lines: Vec<String>,
        // A `component` part's solved recipe.
        nested: Option<Nested>,
        // A `component` part that inherits a width the root does not fix: solved again once
        // the root's width is known.
        refill: bool,
    }
    // A flowed box with a bound `direction` lays its children out in a row. Items keep their
    // outer size (a text part includes its padding) and the offset of the node inside it.
    struct RowItem {
        node: SceneNode,
        ow: f64,
        oh: f64,
        ox: f64,
        oy: f64,
        grow: f64,
        // A `component` row item, or the component parts a row box groups (`group`).
        nested: Option<Nested>,
        group: Vec<Nested>,
        group_gap: f64,
        group_align: String,
        group_col: bool,
    }
    struct Row {
        items: Vec<RowItem>,
        align: String,
        gap: f64,
        pad_s: f64,
        pad_e: f64,
        pad_bs: f64,
        pad_be: f64,
    }
    let mut copy_opacity: Option<f64> = None;
    let mut flow: Vec<Child> = Vec::new();
    let mut nested_out: Vec<SceneNode> = Vec::new();
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
        if let Some(rep) = root
            .get("repeat")
            .filter(|r| r.get("part").and_then(Value::as_str) == Some(id))
        {
            // Copies fill the inner width of a fixed-width column; a hugging column makes
            // them as wide as the widest (or the minWidth); a row keeps their own widths.
            let inner = fixed_w.map(|w| w.max(min_w) - pad_s - pad_e);
            let copies = solve_copies(
                &mut cx,
                variant,
                id,
                rep,
                column,
                inner,
                min_w - pad_s - pad_e,
            )?;
            for n in copies {
                flow.push(Child {
                    id: n.nodes[0].part.clone(),
                    kind: "component".into(),
                    w: n.w,
                    h: n.h,
                    nested: Some(n),
                    ..Default::default()
                });
            }
            continue;
        }
        if !cx.visible(part) {
            continue;
        }
        if part.get("placement").is_some() {
            placed.push((id.clone(), part));
            continue;
        }
        let kind = part.get("kind").and_then(Value::as_str).unwrap_or("box");
        // A box that is a grid or repeats a child lays out as the root of its own scene.
        if kind == "box"
            && (part.get("repeat").is_some()
                || rp(&mut cx, part, "direction").is_some_and(|d| d.value.trim() == "grid"))
        {
            if let Some(n) = solve_subtree(&mut cx, variant, id, position)? {
                flow.push(Child {
                    id: id.clone(),
                    kind: "component".into(),
                    w: n.w,
                    h: n.h,
                    nested: Some(n),
                    ..Default::default()
                });
            }
            continue;
        }
        if kind == "slot" {
            if let Some(n) = slot_nested(&mut cx, id, part, (&rp, &track)) {
                flow.push(Child {
                    id: id.clone(),
                    kind: "component".into(),
                    w: n.w,
                    h: n.h,
                    nested: Some(n),
                    ..Default::default()
                });
            }
            continue;
        }
        let mut tokens = Vec::new();
        let color = (kind != "component")
            .then(|| rp(&mut cx, part, "color"))
            .flatten();
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
            underline: None,
            pattern: None,
            gradient: None,
            color: color.map(|c| c.value),
            stroke: None,
            fill: None,
            stroke_width: 0.0,
            stroke_opacity: None,
            sweep: None,
            radius: None,
            tokens,
            row: None,
            auto_w: false,
            grow: 0.0,
            overflow: None,
            line_h: 0.0,
            lines: Vec::new(),
            nested: None,
            refill: false,
        };
        match kind {
            "component" => {
                c.refill = host.width.is_none() && inherits(part, "width");
                let defer = Host {
                    defer_width: c.refill,
                    ..host
                };
                let Some(n) =
                    solve_component(&mut cx, id, part, if c.refill { &defer } else { &host })
                else {
                    continue;
                };
                (c.w, c.h) = (if c.refill { 0.0 } else { n.w }, n.h);
                c.nested = Some(n);
            }
            "box" => {
                let w = rp(&mut cx, part, "width");
                let bh = rp(&mut cx, part, "height");
                track(&mut c.tokens, "width", &w);
                track(&mut c.tokens, "height", &bh);
                c.w = w.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                c.auto_w = w.is_none();
                let g = rp(&mut cx, part, "grow");
                c.grow = grow_share(&g);
                c.h = bh.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                c.radius = rp(&mut cx, part, "cornerRadius");
                track(&mut c.tokens, "cornerRadius", &c.radius);
                // A flowed box paints itself and hosts its children, like a nested box.
                let bfill = rp(&mut cx, part, "fill");
                let bstroke = rp(&mut cx, part, "stroke");
                let bsw = rp(&mut cx, part, "strokeWidth");
                let bso = rp(&mut cx, part, "strokeOpacity");
                track(&mut c.tokens, "strokeOpacity", &bso);
                c.stroke_opacity = bso.as_ref().and_then(Resolved::num);
                track(&mut c.tokens, "fill", &bfill);
                track(&mut c.tokens, "stroke", &bstroke);
                track(&mut c.tokens, "strokeWidth", &bsw);
                c.gradient = bfill.as_ref().and_then(|f| f.gradient.clone());
                c.fill = bfill.map(|f| f.value);
                c.stroke = bstroke.map(|s| s.value);
                c.stroke_width = bsw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                c.pattern = pattern_of(&mut cx, part, &mut c.tokens);
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
                        if nkind == "slot" {
                            let group = solve_slot(&mut cx, &nid, np);
                            let mut tokens = Vec::new();
                            let nw = rp(&mut cx, np, "width");
                            let nh = rp(&mut cx, np, "height");
                            track(&mut tokens, "width", &nw);
                            track(&mut tokens, "height", &nh);
                            let mut node = blank_node(&nid, "box");
                            let (mut group_gap, mut group_align) = (0.0, String::new());
                            let mut group_col = false;
                            if group.is_empty() {
                                // The empty-slot placeholder is a recipe literal (spec:
                                // component-visuals.md, Slot parts); no placeholder, no node.
                                let Some(ph) = np.get("placeholder") else {
                                    continue;
                                };
                                let side =
                                    |k: &str| ph.get(k).and_then(Value::as_f64).unwrap_or(0.0);
                                (node.w, node.h) = (side("width"), side("height"));
                            } else {
                                let g = group_layout(
                                    &mut cx,
                                    np,
                                    &group,
                                    &nw,
                                    &nh,
                                    &mut tokens,
                                    (&rp, &track),
                                );
                                (node.w, node.h) = (g.w, g.h);
                                (group_gap, group_align, group_col) = (g.gap, g.align, g.col);
                            }
                            node.tokens = tokens;
                            items.push(RowItem {
                                ow: node.w,
                                oh: node.h,
                                node,
                                ox: 0.0,
                                oy: 0.0,
                                grow: 0.0,
                                nested: None,
                                group,
                                group_gap,
                                group_align,
                                group_col,
                            });
                            continue;
                        }
                        let nkind = np.get("kind").and_then(Value::as_str).unwrap_or("box");
                        if nkind == "component" {
                            if let Some(n) = solve_component(&mut cx, &nid, np, &Host::default()) {
                                let mut node = blank_node(&nid, nkind);
                                (node.w, node.h) = (n.w, n.h);
                                items.push(RowItem {
                                    ow: n.w,
                                    oh: n.h,
                                    node,
                                    ox: 0.0,
                                    oy: 0.0,
                                    grow: 0.0,
                                    nested: Some(n),
                                    group: Vec::new(),
                                    group_gap: 0.0,
                                    group_align: String::new(),
                                    group_col: false,
                                });
                            }
                            continue;
                        }
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
                            sweep: None,
                            radius: 0.0,
                            radii: None,
                            text: None,
                            font_size: 0.0,
                            font_weight: None,
                            font_family: None,
                            color: None,
                            icon: None,
                            rotation: None,
                            underline: None,
                            pattern: None,
                            gradient: None,
                            shadow: Vec::new(),
                            path: None,
                            stroke_opacity: None,
                            tokens: Vec::new(),
                        };
                        let nw = rp(&mut cx, np, "width");
                        let nh = rp(&mut cx, np, "height");
                        let color = rp(&mut cx, np, "color");
                        track(&mut tokens, "width", &nw);
                        track(&mut tokens, "height", &nh);
                        track(&mut tokens, "color", &color);
                        node.color = color.map(|c| c.value);
                        let (mut ow, mut oh);
                        let (mut ox, mut oy) = (0.0, 0.0);
                        let mut group: Vec<Nested> = Vec::new();
                        let (mut group_gap, mut group_align) = (0.0, String::new());
                        let mut group_col2 = false;
                        let grow = if matches!(nkind, "text" | "box") {
                            grow_share(&rp(&mut cx, np, "grow"))
                        } else {
                            0.0
                        };
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
                                node.underline = underline_of(&mut cx, np, &mut tokens);
                                let copy = cx.text_of(np, &req.label);
                                node.text = Some(copy.clone());
                                node.w = text_width(
                                    req,
                                    &copy,
                                    node.font_size,
                                    node.font_weight.as_deref(),
                                );
                                node.h = line_height(lh.as_ref(), node.font_size);
                                (ow, oh) = (node.w + tp[0] + tp[1], node.h + tp[2] + tp[3]);
                                (ox, oy) = (tp[0], tp[2]);
                            }
                            _ => {
                                let nfill = rp(&mut cx, np, "fill");
                                let nstroke = rp(&mut cx, np, "stroke");
                                let nsw = rp(&mut cx, np, "strokeWidth");
                                let nso = rp(&mut cx, np, "strokeOpacity");
                                node.stroke_opacity = nso.as_ref().and_then(Resolved::num);
                                let nr = rp(&mut cx, np, "cornerRadius");
                                for (n, r) in [
                                    ("fill", &nfill),
                                    ("stroke", &nstroke),
                                    ("strokeWidth", &nsw),
                                    ("strokeOpacity", &nso),
                                    ("cornerRadius", &nr),
                                ] {
                                    track(&mut tokens, n, r);
                                }
                                node.w = nw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                node.h = nh.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                node.gradient = nfill.as_ref().and_then(|f| f.gradient.clone());
                                node.fill = nfill.map(|f| f.value);
                                node.stroke = nstroke.map(|s| s.value);
                                node.stroke_width =
                                    nsw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                                node.pattern = pattern_of(&mut cx, np, &mut tokens);
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
                                // A row box that holds component parts lays them out in a row
                                // and is dropped when none of them shows.
                                let comps: Vec<String> = np
                                    .get("children")
                                    .and_then(Value::as_array)
                                    .into_iter()
                                    .flatten()
                                    .filter_map(Value::as_str)
                                    .filter(|c| {
                                        parts
                                            .get(*c)
                                            .and_then(|p| p.get("kind"))
                                            .and_then(Value::as_str)
                                            == Some("component")
                                    })
                                    .map(String::from)
                                    .collect();
                                if !comps.is_empty() {
                                    for cid in &comps {
                                        let cp = &parts[cid];
                                        if !cx.visible(cp) {
                                            continue;
                                        }
                                        group.extend(solve_component(
                                            &mut cx,
                                            cid,
                                            cp,
                                            &Host::default(),
                                        ));
                                    }
                                    if group.is_empty() {
                                        continue;
                                    }
                                    let g = group_layout(
                                        &mut cx,
                                        np,
                                        &group,
                                        &nw,
                                        &nh,
                                        &mut tokens,
                                        (&rp, &track),
                                    );
                                    (group_gap, group_align, group_col2) = (g.gap, g.align, g.col);
                                    (node.w, node.h) = (g.w, g.h);
                                    (ow, oh) = (node.w, node.h);
                                }
                            }
                        }
                        node.tokens = tokens;
                        items.push(RowItem {
                            node,
                            ow,
                            oh,
                            ox,
                            oy,
                            grow,
                            nested: None,
                            group,
                            group_gap,
                            group_align,
                            group_col: group_col2,
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
                        pad_e: pads[1],
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
                    let psw = rp(&mut cx, part, "strokeWidth");
                    track(&mut c.tokens, "strokeWidth", &psw);
                    c.stroke_width = psw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
                    c.sweep = rp(&mut cx, part, "sweep").as_ref().and_then(Resolved::num);
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
                c.underline = underline_of(&mut cx, part, &mut c.tokens);
                let text = cx.text_of(part, &req.label);
                c.w = text_width(req, &text, c.font_size, c.font_weight.as_deref());
                if let Some(r) = lh.as_ref().filter(|r| r.num().is_none()) {
                    cx.diags.push(format!(
                        "lineHeight '{}' is not a number or px value; using 1.3 x font size",
                        r.value
                    ));
                }
                c.h = line_height(lh.as_ref(), c.font_size);
                c.line_h = c.h;
                c.text = Some(text);
                c.grow = grow_share(&rp(&mut cx, part, "grow"));
                let ov = rp(&mut cx, part, "overflow");
                c.overflow = match ov.as_ref().map(|r| r.value.trim()) {
                    None => None,
                    Some("wrap") => Some("wrap"),
                    Some("truncate") => Some("truncate"),
                    Some(v) => {
                        cx.diags
                            .push(format!("overflow '{v}' is not one of wrap, truncate"));
                        None
                    }
                };
            }
            _ => {}
        }
        flow.push(c);
    }

    // A text part with `overflow` breaks (or truncates) against the width the root leaves it:
    // the fixed width minus the inline padding, the gaps and the other parts. Several such
    // parts share what is left equally. With no fixed width the text hugs and never breaks.
    let gaps = if stack {
        0.0
    } else {
        gap * flow.len().saturating_sub(1) as f64
    };
    let mut word_overflow = false;
    let mut fixed_over = false;
    let n_wrap = flow.iter().filter(|c| c.overflow.is_some()).count();
    if let (Some(fw), true) = (fixed_w, n_wrap > 0) {
        let inner = fw.max(min_w) - pad_s - pad_e;
        let raw = if column || stack || grid {
            inner
        } else {
            let others: f64 = flow
                .iter()
                .filter(|c| c.overflow.is_none())
                .map(|c| c.w)
                .sum();
            (inner - gaps - others) / n_wrap as f64
        };
        // Padding, gaps and the other parts can leave nothing: every word then overflows.
        fixed_over = raw < -1e-6;
        let avail = raw.max(0.0);
        for c in flow.iter_mut().filter(|c| c.overflow.is_some()) {
            let text = c.text.clone().unwrap_or_default();
            let (fs, fwt) = (c.font_size, c.font_weight.clone());
            let measure = |s: &str| text_width(req, s, fs, fwt.as_deref());
            if c.overflow == Some("truncate") {
                if c.w > avail + 1e-6 {
                    let cut = truncate_line(&text, avail, &measure);
                    c.w = measure(&cut);
                    c.text = Some(cut);
                }
                continue;
            }
            let (lines, wide) = break_lines(&text, avail, &measure);
            if let Some(word) = wide {
                word_overflow = true;
                cx.diags.push(format!(
                    "the word '{word}' is wider than the available width ({avail:.1}); it overflows its line"
                ));
            }
            if lines.len() > 1 {
                c.w = lines.iter().map(|l| measure(l)).fold(0.0, f64::max);
                c.h = c.line_h * lines.len() as f64;
                c.lines = lines;
            }
        }
    }

    // As in Figma, an icon taller than the label line adds only the line height to the row,
    // so the icon overflows the content box evenly instead of growing the container. The
    // line is one line's height: a label that wraps does not make the icon any shorter.
    let line = flow
        .iter()
        .filter(|c| c.kind == "text")
        .map(|c| c.line_h)
        .fold(0.0, f64::max);
    let widest = flow.iter().map(|c| c.w).fold(0.0, f64::max);
    let tall = |first_line: bool| {
        flow.iter()
            .map(|c| {
                if c.kind == "icon" && line > 0.0 {
                    c.h.min(line)
                } else if first_line && c.kind == "text" {
                    c.line_h
                } else {
                    c.h
                }
            })
            .fold(0.0, f64::max)
    };
    let (tallest, tallest_one_line) = (tall(false), tall(true));
    let multi_line = flow.iter().any(|c| !c.lines.is_empty());
    let grid_dims = grid_props.map(|(cols, col_gap, row_gap)| {
        let sizes: Vec<(f64, f64)> = flow.iter().map(|c| (c.w, c.h)).collect();
        grid_tracks(&mut cx, &sizes, (&cols, &col_gap, &row_gap), gap)
    });
    let sum_w = match &grid_dims {
        Some(g) => g.w,
        None => flow.iter().map(|c| c.w).sum::<f64>() + gaps,
    };
    let sum_h = flow.iter().map(|c| c.h).sum::<f64>() + gaps;
    let content_w = pad_s + if column || stack { widest } else { sum_w } + pad_e;
    let w = fixed_w.unwrap_or(content_w).max(min_w);
    if w < content_w - 1e-6 && (!word_overflow || fixed_over) {
        cx.diags.push(format!(
            "width {w} is narrower than the content ({content_w}); the content overflows"
        ));
    }
    for c in flow.iter_mut().filter(|c| c.refill) {
        let Some(part) = parts.get(&c.id) else {
            continue;
        };
        let again = Host {
            width: Some(w - pad_s - pad_e),
            ..host
        };
        if let Some(n) = solve_component(&mut cx, &c.id, part, &again) {
            (c.w, c.h) = (n.w, n.h);
            c.nested = Some(n);
        }
    }
    // A row with a `minHeight` and no block padding of its own pads each side by
    // `(minHeight - one line) / 2`, the single-line padding, so a label that wraps grows the
    // container and keeps that padding.
    let (pad_bs, pad_be) = match min_h {
        Some(m) if explicit_h.is_none() && !column && !stack && !grid && !block_padded => {
            let p = ((m - tallest_one_line) / 2.0).max(0.0);
            (p, p)
        }
        _ => (pad_bs, pad_be),
    };
    // An unset `height` is the content plus the block padding: the stacked children in a
    // column, the tallest flowed child in a row. `minHeight` is the floor.
    let h = explicit_h.unwrap_or_else(|| {
        let content = if column {
            sum_h + pad_bs + pad_be
        } else if let Some(g) = &grid_dims {
            g.h + pad_bs + pad_be
        } else {
            tallest + pad_bs + pad_be
        };
        match min_h {
            Some(m) if content <= m + 1e-6 => m,
            _ => content,
        }
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
    let root_pattern = pattern_of(&mut cx, root, &mut container_tokens);
    let root_gradient = fill.as_ref().and_then(|f| f.gradient.clone());
    let mut nodes = vec![SceneNode {
        part: root_id.into(),
        kind: "box".into(),
        x: ox,
        y: oy,
        w,
        h,
        fill: fill.map(|f| f.value),
        stroke: stroke.clone().filter(|_| !stroke_over).map(|s| s.value),
        stroke_width: stroke_w.as_ref().and_then(Resolved::num).unwrap_or(0.0),
        stroke_opacity: stroke_o.as_ref().and_then(Resolved::num),
        sweep: None,
        radius: root_radius,
        radii,
        text: None,
        font_size: 0.0,
        font_weight: None,
        font_family: None,
        color: None,
        icon: None,
        rotation: None,
        underline: None,
        pattern: root_pattern,
        gradient: root_gradient,
        shadow: Vec::new(),
        path: None,
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
        add("width", m_width, (ox, oy, w, h));
        add("width", m_min_width, (ox, oy, w, h));
        add("height", m_height, (ox, oy, w, h));
        add("height", m_min_height, (ox, oy, w, h));
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
        gap: (flow.len() > 1 && !stack && !grid).then_some(gap),
        padding: [pad_bs, pad_e, pad_be, pad_s],
    };
    let mut y = oy
        + pad_bs
        + if column {
            axis_offset(&justify, h - pad_bs - pad_be - sum_h)
        } else {
            0.0
        };
    let mut gap_from: Option<f64> = None;
    let total_grow: f64 = if column || stack || grid {
        0.0
    } else {
        flow.iter().map(|c| c.grow).sum()
    };
    let free_w = (w - sum_w - pad_s - pad_e).max(0.0);
    // A row with no growing part justifies its content in the space a minWidth or width leaves.
    let mut x = ox
        + pad_s
        + if column || stack || total_grow > 0.0 || grid {
            0.0
        } else {
            axis_offset(&justify, free_w)
        };
    for (index, mut c) in flow.into_iter().enumerate() {
        let cell = grid_dims
            .as_ref()
            .map(|g| (g, index / g.cols, index % g.cols));
        // A column stretches a box that has no width of its own across its inner width; a grid
        // cell, across its column.
        let cw = if let Some((g, _, col)) = cell.filter(|_| c.kind == "box" && c.auto_w) {
            g.col_w[col]
        } else if (column || stack) && c.kind == "box" && c.auto_w {
            w - pad_s - pad_e
        } else {
            c.w
        };
        // A growing part of a row takes its share of the space the row has left. A text part
        // keeps its own width (the text stays at the start of the grown space).
        let extra = if total_grow > 0.0 {
            free_w * c.grow / total_grow
        } else {
            0.0
        };
        let adv = cw + extra;
        let cw = if c.kind == "box" { adv } else { cw };
        let (cx0, cy0) = if let Some((g, row, col)) = cell {
            // A grid cell holds its content in the cell: `justify` across the column, `align`
            // down the row.
            (
                ox + pad_s + g.col_x[col] + axis_offset(&justify, g.col_w[col] - cw),
                oy + pad_bs + g.row_y[row] + axis_offset(&align, g.row_h[row] - c.h),
            )
        } else if stack {
            // Siblings overlay: each sits in the inner box, `justify` across and `align` down.
            (
                ox + pad_s + axis_offset(&justify, w - pad_s - pad_e - cw),
                oy + pad_bs + axis_offset(&align, h - pad_bs - pad_be - c.h),
            )
        } else if column {
            (x + axis_offset(&align, w - pad_s - pad_e - cw), y)
        } else {
            (
                x,
                oy + pad_bs
                    + if multi_line && align == "center" && c.kind != "text" {
                        // Beside a wrapped label a part centres on the first line.
                        (line - c.h) / 2.0
                    } else {
                        axis_offset(&align, h - pad_bs - pad_be - c.h)
                    },
            )
        };
        let ch = c.h;
        if let Some(from) = gap_from.filter(|_| !stack && !grid) {
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
        gap_from = Some(if column { cy0 + ch } else { cx0 + adv });
        if let Some(mut n) = c.nested.take() {
            copy_opacity = copy_opacity.or(n.opacity);
            measurements.extend(
                std::mem::take(&mut n.measurements)
                    .into_iter()
                    .map(|mut m| {
                        m.x += cx0;
                        m.y += cy0;
                        m
                    }),
            );
            // A stack draws in declaration order, so a nested recipe joins the nodes now.
            place_nested(
                if stack { &mut nodes } else { &mut nested_out },
                n,
                cx0,
                cy0,
            );
            if column {
                y += ch + gap;
            } else {
                x += adv + gap;
            }
            continue;
        }
        let row = c.row.take();
        let lines = std::mem::take(&mut c.lines);
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
            stroke_opacity: c.stroke_opacity,
            sweep: c.sweep,
            radius: 0.0,
            radii: None,
            text: c.text,
            font_size: c.font_size,
            font_weight: c.font_weight,
            font_family: c.font_family,
            underline: c.underline,
            pattern: c.pattern,
            gradient: c.gradient,
            shadow: Vec::new(),
            path: None,
            color: c.color,
            icon: None,
            rotation: None,
            tokens: c.tokens,
        };
        if c.kind == "box" {
            own.radius = clamp_radius(px(&c.radius, ch), cw, ch);
        }
        if lines.is_empty() {
            nodes.push(own);
        } else {
            for (i, l) in lines.into_iter().enumerate() {
                let mut n = own.clone();
                n.w = text_width(req, &l, n.font_size, n.font_weight.as_deref());
                n.h = c.line_h;
                n.y = cy0 + i as f64 * c.line_h;
                n.text = Some(l);
                nodes.push(n);
            }
        }
        if column {
            y += ch + gap;
        } else {
            x += adv + gap;
        }
        if let Some(row) = row {
            let inner_h = ch - row.pad_bs - row.pad_be;
            let mut rx = cx0 + row.pad_s;
            let used = row.items.iter().map(|i| i.ow).sum::<f64>()
                + row.gap * row.items.len().saturating_sub(1) as f64;
            let free = (cw - row.pad_s - row.pad_e - used).max(0.0);
            let shares: f64 = row.items.iter().map(|i| i.grow).sum();
            for mut it in row.items {
                if shares > 0.0 && it.grow > 0.0 {
                    let extra = free * it.grow / shares;
                    it.ow += extra;
                    if it.node.kind == "box" {
                        it.node.w += extra;
                    }
                }
                it.node.x = rx + it.ox;
                it.node.y = cy0 + row.pad_bs + axis_offset(&row.align, inner_h - it.oh) + it.oy;
                rx += it.ow + row.gap;
                if let Some(n) = it.nested {
                    place_nested(&mut nested_out, n, it.node.x, it.node.y);
                    continue;
                }
                let (gx, gy, gh, gw) = (it.node.x, it.node.y, it.node.h, it.node.w);
                nodes.push(it.node);
                let mut gx = gx;
                let mut gy2 = gy;
                for n in it.group {
                    if it.group_col {
                        let (h, x) = (n.h, gx + axis_offset(&it.group_align, gw - n.w));
                        place_nested(&mut nested_out, n, x, gy2);
                        gy2 += h + it.group_gap;
                    } else {
                        let (w, y) = (n.w, gy + axis_offset(&it.group_align, gh - n.h));
                        place_nested(&mut nested_out, n, gx, y);
                        gx += w + it.group_gap;
                    }
                }
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
            if let Some(k) = np
                .get("kind")
                .and_then(Value::as_str)
                .filter(|k| matches!(*k, "component" | "slot"))
            {
                let place = if k == "slot" {
                    "a row box"
                } else {
                    "the root's flow or a row box"
                };
                cx.diags.push(format!(
                    "{k} part '{nid}' is only laid out in {place}; it is not drawn"
                ));
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
                    sweep: None,
                    radius: 0.0,
                    radii: None,
                    text: None,
                    font_size: 0.0,
                    font_weight: None,
                    font_family: None,
                    color: color.map(|c| c.value),
                    icon: None,
                    rotation: rot.as_ref().and_then(Resolved::num),
                    underline: None,
                    pattern: None,
                    gradient: None,
                    shadow: Vec::new(),
                    path: None,
                    stroke_opacity: None,
                    tokens,
                });
                continue;
            }
            let nfill = rp(&mut cx, np, "fill");
            let nstroke = rp(&mut cx, np, "stroke");
            let nsw = rp(&mut cx, np, "strokeWidth");
            let nso = rp(&mut cx, np, "strokeOpacity");
            let nradius = rp(&mut cx, np, "cornerRadius");
            let justify = rp(&mut cx, np, "justify");
            for (n, r) in [
                ("width", &nw),
                ("height", &nh),
                ("fill", &nfill),
                ("stroke", &nstroke),
                ("strokeWidth", &nsw),
                ("strokeOpacity", &nso),
                ("cornerRadius", &nradius),
                ("justify", &justify),
            ] {
                track(&mut tokens, n, r);
            }
            let of_parent = |r: &Option<Resolved>, whole: f64| {
                r.as_ref().and_then(|r| {
                    r.num().map(|v| {
                        if r.relative_to.as_deref() == Some("parent") {
                            v * whole
                        } else {
                            v
                        }
                    })
                })
            };
            let w2 = of_parent(&nw, cw).unwrap_or(cw);
            let h2 = of_parent(&nh, ch).unwrap_or(ch);
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
                fill: nfill.as_ref().map(|f| f.value.clone()),
                stroke: nstroke.map(|s| s.value),
                stroke_width: nsw.as_ref().and_then(Resolved::num).unwrap_or(0.0),
                stroke_opacity: nso.as_ref().and_then(Resolved::num),
                sweep: None,
                radius: clamp_radius(px(&nradius, h2), w2, h2),
                radii: None,
                text: None,
                font_size: 0.0,
                font_weight: None,
                font_family: None,
                color: None,
                icon: None,
                rotation: None,
                underline: None,
                pattern: None,
                gradient: nfill.as_ref().and_then(|f| f.gradient.clone()),
                shadow: Vec::new(),
                path: None,
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
            sweep: None,
            radius: 0.0,
            radii: None,
            text: None,
            font_size: 0.0,
            font_weight: None,
            font_family: None,
            color: color.map(|c| c.value),
            icon: None,
            rotation: None,
            underline: None,
            pattern: None,
            gradient: None,
            shadow: Vec::new(),
            path: None,
            stroke_opacity: None,
            tokens,
        });
    }

    // Floating parts sit outside the root: a leaf box beside one side of the root, never a
    // layout input. They are solved after the root, so the root's box is final.
    let mut floating: Vec<(&String, &Value)> = parts
        .iter()
        .filter(|(id, p)| {
            p.get("floating").is_some()
                && id.as_str() != root_id
                && parts
                    .get(root_id)
                    .is_some_and(|r| r.get("floating").is_none())
        })
        .collect();
    floating.sort_by(|a, b| a.0.cmp(b.0));
    let mut floating_ids: Vec<String> = Vec::new();
    for (id, part) in floating {
        if !cx.visible(part) {
            continue;
        }
        let spec = &part["floating"];
        let finite = |r: Option<Resolved>| r.and_then(|r| r.num()).filter(|v| v.is_finite());
        let offset = finite(cx.eval(spec.get("offset")));
        let cross = finite(cx.eval(spec.get("crossOffset")));
        for (key, v) in [("offset", offset), ("crossOffset", cross)] {
            if spec.get(key).is_some() && v.is_none() {
                cx.diags.push(format!(
                    "floating part '{id}': {key} does not resolve to a finite number; using 0"
                ));
            }
        }
        let hosts_children = part
            .get("children")
            .and_then(Value::as_array)
            .is_some_and(|c| !c.is_empty());
        // A floating part with children is a subtree: solved as the root of its own scene (as a
        // repeated copy is), sized by its own layout, then moved to the anchor.
        let mut sub = None;
        let mut comp = None;
        let axes: [Option<Value>; 2] = ["x", "y"].map(|k| {
            let src = spec.pointer(&format!("/position/{k}"))?;
            cx.choose(src).cloned()
        });
        let is_component = part.get("kind").and_then(Value::as_str) == Some("component");
        let (fw, fh) = if is_component {
            match solve_component(&mut cx, id, part, &host) {
                Some(n) => {
                    comp = Some(n);
                    (None, None)
                }
                None => {
                    cx.diags.push(format!(
                        "floating part '{id}': the nested component could not be laid out; skipping it"
                    ));
                    continue;
                }
            }
        } else if hosts_children {
            match solve_root(variant, id, req, cx.position) {
                Ok(sc) if !sc.nodes.is_empty() => {
                    cx.diags.extend(
                        sc.diagnostics
                            .iter()
                            .map(|d| format!("floating part '{id}': {d}")),
                    );
                    sub = Some(sc);
                    (None, None)
                }
                _ => {
                    cx.diags.push(format!(
                        "floating part '{id}' could not be laid out; skipping it"
                    ));
                    continue;
                }
            }
        } else {
            (rp(&mut cx, part, "width"), rp(&mut cx, part, "height"))
        };
        let is_len = |i: usize| {
            axes[i]
                .as_ref()
                .and_then(|a| a.get("length"))
                .and_then(Value::as_bool)
                == Some(true)
        };
        let size = match (&sub, &comp) {
            (Some(sc), _) => Some((sc.nodes[0].w, sc.nodes[0].h)),
            (_, Some(n)) => Some((n.w, n.h)),
            _ => fw
                .as_ref()
                .and_then(Resolved::num)
                .or(is_len(0).then_some(1.0))
                .zip(
                    fh.as_ref()
                        .and_then(Resolved::num)
                        .or(is_len(1).then_some(1.0)),
                ),
        };
        let Some((fw_n, fh_n)) = size else {
            cx.diags.push(format!(
                "floating part '{id}' needs a width and a height that resolve; skipping it"
            ));
            continue;
        };
        let sane = |v: f64| v.is_finite() && v.abs() <= MAX_FLOATING;
        let (offset, cross) = (offset.unwrap_or(0.0), cross.unwrap_or(0.0));
        // A nested component may be zero wide (a field label with no text): it draws nothing.
        let wide = fw_n > 0.0 || (comp.is_some() && fw_n == 0.0);
        if !(sane(fw_n) && sane(fh_n) && wide && fh_n > 0.0 && sane(offset) && sane(cross)) {
            cx.diags.push(format!(
                "floating part '{id}' needs a positive width and height and an offset within {MAX_FLOATING}px; skipping it"
            ));
            continue;
        }
        let align = spec
            .get("align")
            .and_then(Value::as_str)
            .unwrap_or("center");
        let (mut fw_n, mut fh_n) = (fw_n, fh_n);
        let positioned = if let Some(pos) = spec.get("position") {
            let of = pos.get("of").and_then(Value::as_str).unwrap_or(root_id);
            let Some(b) = nodes.iter().find(|n| n.part == of) else {
                cx.diags.push(format!(
                    "floating part '{id}': position.of '{of}' is not a drawn part; skipping it"
                ));
                continue;
            };
            let parent = (b.x, b.y, b.w, b.h);
            let x = place_axis(
                &mut cx,
                id,
                "x",
                axes[0].as_ref(),
                (parent.0, parent.2),
                fw_n,
                align,
            );
            let y = place_axis(
                &mut cx,
                id,
                "y",
                axes[1].as_ref(),
                (parent.1, parent.3),
                fh_n,
                align,
            );
            let (Some((px, pw)), Some((py, ph))) = (x, y) else {
                continue;
            };
            fw_n = pw;
            fh_n = ph;
            Some((px, py))
        } else {
            None
        };
        if !(sane(fw_n) && sane(fh_n) && fw_n > 0.0 && fh_n > 0.0) && positioned.is_some() {
            cx.diags.push(format!(
                "floating part '{id}' needs a positive width and height; skipping it"
            ));
            continue;
        }
        let side = spec.get("side").and_then(Value::as_str).unwrap_or("top");
        let (rx, ry, rw, rh) = (nodes[0].x, nodes[0].y, nodes[0].w, nodes[0].h);
        let along = |start: f64, len: f64, own: f64| match align {
            "start" => start,
            "end" => start + len - own,
            _ => start + (len - own) / 2.0,
        };
        let (fx, fy) = if let Some(p) = positioned {
            p
        } else {
            match side {
                "bottom" => (along(rx, rw, fw_n) + cross, ry + rh + offset),
                "start" => (rx - offset - fw_n, along(ry, rh, fh_n) + cross),
                "end" => (rx + rw + offset, along(ry, rh, fh_n) + cross),
                _ => (along(rx, rw, fw_n) + cross, ry - offset - fh_n),
            }
        };
        if let Some(mut n) = comp {
            floating_ids.extend(n.nodes.iter().map(|x| x.part.clone()));
            measurements.extend(
                std::mem::take(&mut n.measurements)
                    .into_iter()
                    .map(|mut m| {
                        m.x += fx;
                        m.y += fy;
                        m
                    }),
            );
            place_nested(&mut nodes, n, fx, fy);
            continue;
        }
        if let Some(sc) = sub {
            let (ox, oy) = (sc.nodes[0].x, sc.nodes[0].y);
            let (mx, my) = (fx - ox, fy - oy);
            for mut n in sc.nodes {
                n.x += mx;
                n.y += my;
                floating_ids.push(n.part.clone());
                nodes.push(n);
            }
            measurements.extend(sc.measurements.into_iter().map(|mut m| {
                m.x += mx;
                m.y += my;
                m
            }));
            continue;
        }
        let fill = rp(&mut cx, part, "fill");
        let stroke = rp(&mut cx, part, "stroke");
        let sw = rp(&mut cx, part, "strokeWidth");
        let so = rp(&mut cx, part, "strokeOpacity");
        let radius = rp(&mut cx, part, "cornerRadius");
        let mut node = blank_node(id, "box");
        for (n, r) in [
            ("width", &fw),
            ("height", &fh),
            ("fill", &fill),
            ("stroke", &stroke),
            ("strokeWidth", &sw),
            ("strokeOpacity", &so),
            ("cornerRadius", &radius),
        ] {
            track(&mut node.tokens, n, r);
        }
        (node.x, node.y, node.w, node.h) = (fx, fy, fw_n, fh_n);
        node.gradient = fill.as_ref().and_then(|f| f.gradient.clone());
        node.fill = fill.map(|f| f.value);
        node.stroke = stroke.map(|s| s.value);
        node.stroke_width = sw.as_ref().and_then(Resolved::num).unwrap_or(0.0);
        node.stroke_opacity = so.as_ref().and_then(Resolved::num);
        node.radius = clamp_radius(
            radius
                .as_ref()
                .and_then(|r| {
                    r.num().map(|v| match r.relative_to.as_deref() {
                        Some("height") => v * fh_n,
                        _ => v,
                    })
                })
                .unwrap_or(0.0),
            fw_n,
            fh_n,
        );
        floating_ids.push(id.clone());
        nodes.push(node);
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
        let so = rp(&mut cx, part, "strokeOpacity");
        let gp = rp(&mut cx, part, "gapToParent");
        let mut tokens = Vec::new();
        track(&mut tokens, "stroke", &stroke);
        track(&mut tokens, "strokeWidth", &sw);
        track(&mut tokens, "strokeOpacity", &so);
        track(&mut tokens, "gapToParent", &gp);
        let sw_n = sw.as_ref().and_then(Resolved::num).unwrap_or(2.0);
        // An `inside` ring sits within the part's box, its gap measured inward.
        let sign = if part.get("inside") == Some(&Value::Bool(true)) {
            -1.0
        } else {
            1.0
        };
        let off = sign * (gp.as_ref().and_then(Resolved::num).unwrap_or(2.0) + sw_n / 2.0);
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
            stroke_opacity: so.as_ref().and_then(Resolved::num),
            sweep: None,
            radius: (r0 + off).max(0.0),
            radii: None,
            text: None,
            font_size: 0.0,
            font_weight: None,
            font_family: None,
            color: None,
            icon: None,
            rotation: None,
            underline: None,
            pattern: None,
            gradient: None,
            shadow: Vec::new(),
            path: None,
            tokens,
        });
    }

    // Pressed scale-down: CSS `perspective(p) translateZ(z)` scales by p / (p - z), where
    // p = clamp(width * ratio, min, max).
    let mut press = match (
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
        && !nodes
            .iter()
            .any(|n| n.kind == "text" && n.text.as_deref().is_some_and(|t| !t.is_empty()))
        && parts.values().any(|p| {
            is_content_icon(p) == (true, true) && cx.when_score(p.get("visibleWhen")).is_some()
        })
    {
        cx.diags
            .push("icon none with no label text leaves the component with no icon or label".into());
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
        let (icon, key, miss) = part_icon(part, req);
        n.icon = icon.map(|mut icon| {
            icon.drawing = key.and_then(|k| variant.drawings.get(k)).cloned();
            icon
        });
        cx.diags.extend(miss);
    }

    nodes.extend(nested_out);
    for n in nodes.iter_mut().filter(|n| n.kind == "box") {
        let Some(source) = parts
            .get(&n.part)
            .and_then(|p| p.get("props")?.get("shadow"))
        else {
            continue;
        };
        let (layers, tokens) = cx.shadows(Some(source));
        let (w, h) = (n.w, n.h);
        n.shadow = layers
            .into_iter()
            .filter(|l| {
                let ok = w + 2.0 * l.spread > 0.0 && h + 2.0 * l.spread > 0.0;
                if !ok {
                    cx.diags.push(format!(
                        "shadow spread {} leaves nothing of part '{}'; skipping the layer",
                        l.spread, n.part
                    ));
                }
                ok
            })
            .collect();
        n.tokens.extend(tokens);
    }
    for n in nodes.iter_mut().filter(|n| n.kind == "box") {
        let Some(spec) = parts.get(&n.part).and_then(|p| p.get("path")) else {
            continue;
        };
        match path_shape(spec, n.w, n.h) {
            Ok(shape) => n.path = Some(shape),
            Err(e) => cx
                .diags
                .push(format!("part '{}': {e}; drawing the plain box", n.part)),
        }
    }
    // `strokeOver`: the root's border is drawn after everything else, as a ring node, so it
    // lies over the children. Same band as the box stroke: inside the box.
    if stroke_over && radii.is_some() {
        cx.diags
            .push("strokeOver draws one corner radius; the root's corners differ".into());
    }
    if let (true, Some(c)) = (stroke_over, stroke.as_ref()) {
        let (sw, i) = (nodes[0].stroke_width, nodes[0].stroke_width / 2.0);
        if sw > 0.0 {
            let mut border = blank_node(&format!("{root_id}.border"), "ring");
            border.x = ox + i;
            border.y = oy + i;
            border.w = w - sw;
            border.h = h - sw;
            border.radius = (nodes[0].radius - i).max(0.0);
            border.stroke = Some(c.value.clone());
            border.stroke_width = sw;
            border.stroke_opacity = nodes[0].stroke_opacity;
            nodes.push(border);
        }
    }

    // `innerStroke`: a second border just inside the first, drawn over the children as a ring
    // node `<root>.inner-border`. It starts where the outer stroke ends.
    if let Some(c) = inner_stroke.as_ref() {
        let outer = nodes[0].stroke_width;
        let sw = inner_w.as_ref().and_then(Resolved::num).unwrap_or(0.0);
        if radii.is_some() {
            cx.diags
                .push("innerStroke draws one corner radius; the root's corners differ".into());
        }
        if sw > 0.0 && w - 2.0 * outer - sw > 0.0 && h - 2.0 * outer - sw > 0.0 {
            let mut band = blank_node(&format!("{root_id}.inner-border"), "ring");
            band.x = ox + outer + sw / 2.0;
            band.y = oy + outer + sw / 2.0;
            band.w = w - 2.0 * outer - sw;
            band.h = h - 2.0 * outer - sw;
            band.radius = (nodes[0].radius - outer - sw / 2.0).max(0.0);
            band.stroke = Some(c.value.clone());
            band.stroke_width = sw;
            band.stroke_opacity = inner_o.as_ref().and_then(Resolved::num);
            nodes.push(band);
        }
    }

    // A box whose fill came from an option holding a CSS `linear-gradient()`: it is laid out
    // now, so the gradient line fits the box's own width and height.
    for n in nodes
        .iter_mut()
        .filter(|n| n.kind == "box" && n.gradient.is_none())
    {
        if let Some(g) = n
            .fill
            .as_deref()
            .and_then(|f| parse_css_linear_gradient(f, n.w, n.h))
        {
            n.fill = Some(g.stops[0].color.clone());
            n.gradient = Some(g);
        }
    }
    // The tokens a gradient's stop colors were bound to, for overlays and the SVG's data-tokens.
    for n in nodes.iter_mut() {
        let Some(g) = &n.gradient else { continue };
        for (i, stop) in g.stops.iter().enumerate() {
            let prop = format!("fill.stop{}", i + 1);
            if !stop.token.is_empty() && !n.tokens.iter().any(|t| t.prop == prop) {
                n.tokens.push(TokenRef {
                    prop,
                    token: stop.token.clone(),
                    value: stop.color.clone(),
                    chain: Vec::new(),
                    relationship: None,
                });
            }
        }
    }

    // The canvas is the root plus its ring margin, grown to hold every floating part and every
    // drop shadow; an origin shift keeps the top-left at 0, so a recipe with neither is unchanged.
    let (x0, y0, x1, y1) = scene_extent(
        &nodes,
        &floating_ids,
        (
            ox - RING_MARGIN,
            oy - RING_MARGIN,
            w + 2.0 * RING_MARGIN,
            h + 2.0 * RING_MARGIN,
        ),
    );
    let (dx, dy) = (-x0, -y0);
    if dx != 0.0 || dy != 0.0 {
        for n in nodes.iter_mut() {
            n.x += dx;
            n.y += dy;
        }
        for m in measurements.iter_mut() {
            m.x += dx;
            m.y += dy;
        }
        if let Some(p) = press.as_mut() {
            p.cx += dx;
            p.cy += dy;
        }
    }

    Ok(Scene {
        component: req.component.clone(),
        width: x1 - x0,
        height: y1 - y0,
        press,
        measurements,
        opacity: opacity.as_ref().and_then(Resolved::num).or(copy_opacity),
        nodes,
        layout,
        diagnostics: cx.diags,
    })
}

/// A number read from a position source: `{ "option": name }` (a numeric option) or
/// `{ "value": n }`. `None` when it is absent, unset or not a finite number.
fn position_number(cx: &Ctx, src: Option<&Value>) -> Option<f64> {
    let src = src?;
    let n = match src.get("option").and_then(Value::as_str) {
        Some(name) => cx.option(name).as_f64(),
        None => src.get("value").and_then(Value::as_f64),
    };
    n.filter(|n| n.is_finite())
}

/// The fraction `(value - min) / (max - min)` of a position source, clamped to 0..=1 (with a
/// diagnostic when it had to be), and flipped by `invert`. An unset value, a NaN or infinite
/// number and an empty range give a diagnostic and 0.
fn position_fraction(
    cx: &mut Ctx,
    id: &str,
    axis: &str,
    key: &str,
    axis_spec: &Value,
    src: &Value,
) -> f64 {
    let lo = position_number(cx, axis_spec.get("min")).unwrap_or(0.0);
    let hi = position_number(cx, axis_spec.get("max")).unwrap_or(1.0);
    let raw = position_number(cx, Some(src));
    let unset = src
        .get("option")
        .and_then(Value::as_str)
        .is_some_and(|n| cx.option(n).is_null());
    let f = match raw {
        _ if unset => 0.0,
        Some(v) if hi > lo && (hi - lo).is_finite() => (v - lo) / (hi - lo),
        _ => {
            cx.diags.push(format!(
                "floating part '{id}': position.{axis}.{key} does not resolve to a number inside a non-empty min..max range; using 0"
            ));
            0.0
        }
    };
    let clamped = if f.is_finite() {
        f.clamp(0.0, 1.0)
    } else {
        0.0
    };
    if clamped != f {
        cx.diags.push(format!(
            "floating part '{id}': position.{axis}.{key} is outside min..max; clamping to {clamped}"
        ));
    }
    if axis_spec.get("invert").and_then(Value::as_bool) == Some(true) {
        1.0 - clamped
    } else {
        clamped
    }
}

/// One axis of a `floating.position`: `(start, length)` of the part along `parent`
/// `(start, length)`. A point axis centres (or `align`s) the part's `own` size on the fraction
/// of the parent; a `length` axis spans from the `from` fraction (default 0) to the value's,
/// and is `None` when empty. No spec: the part is centred on the parent.
fn place_axis(
    cx: &mut Ctx,
    id: &str,
    axis: &str,
    spec: Option<&Value>,
    parent: (f64, f64),
    own: f64,
    align: &str,
) -> Option<(f64, f64)> {
    let Some(spec) = spec else {
        return Some((parent.0 + (parent.1 - own) / 2.0, own));
    };
    let f = position_fraction(
        cx,
        id,
        axis,
        "value",
        spec,
        spec.get("value").unwrap_or(&Value::Null),
    );
    if spec.get("length").and_then(Value::as_bool) == Some(true) {
        let from = match spec.get("from") {
            Some(src) => position_fraction(cx, id, axis, "from", spec, src),
            None if spec.get("invert").and_then(Value::as_bool) == Some(true) => 1.0,
            None => 0.0,
        };
        let (a, b) = (from.min(f), from.max(f));
        return (b > a).then_some((parent.0 + a * parent.1, (b - a) * parent.1));
    }
    let c = parent.0 + f * parent.1;
    let start = match align {
        "start" => c,
        "end" => c - own,
        _ => c - own / 2.0,
    };
    Some((start, own))
}

/// The bounding box `(x0, y0, x1, y1)` of `base` (`x, y, w, h`), every floating part in
/// `floating` (with half its stroke) and every drop shadow of every node (the
/// shadow box grown by three standard deviations, the blur the renderers draw).
fn scene_extent(
    nodes: &[SceneNode],
    floating: &[String],
    base: (f64, f64, f64, f64),
) -> (f64, f64, f64, f64) {
    let mut e = (base.0, base.1, base.0 + base.2, base.1 + base.3);
    let mut grow = |x0: f64, y0: f64, x1: f64, y1: f64| {
        if [x0, y0, x1, y1].iter().all(|v| v.is_finite()) {
            e = (e.0.min(x0), e.1.min(y0), e.2.max(x1), e.3.max(y1));
        }
    };
    for n in nodes {
        if floating.contains(&n.part) {
            let half = n.stroke_width / 2.0;
            grow(n.x - half, n.y - half, n.x + n.w + half, n.y + n.h + half);
        }
        for s in &n.shadow {
            let pad = 1.5 * s.blur + s.spread;
            let cap = |v: f64| v.clamp(-MAX_FLOATING, MAX_FLOATING);
            grow(
                cap(n.x + s.x - pad),
                cap(n.y + s.y - pad),
                cap(n.x + n.w + s.x + pad),
                cap(n.y + n.h + s.y + pad),
            );
        }
    }
    e
}

/// The host root's box a `component` part can `inherit` from: its inner size (outer size
/// less padding) and corner radius, where the root fixes them.
#[derive(Default)]
struct Host {
    /// The width is not known yet: this is the first pass, which leaves the nested root's own
    /// width and reports nothing; the second pass reports.
    defer_width: bool,
    width: Option<f64>,
    height: Option<f64>,
    corner_radius: Option<f64>,
}

/// A `component` part solved on its own: its root size and its nodes, relative to the root's
/// top-left corner. The root node keeps the part's id; inner ones are `<id>.<part>`.
#[derive(Default)]
struct Nested {
    w: f64,
    h: f64,
    nodes: Vec<SceneNode>,
    /// A repeated part's first copy keeps its measurements (see [`solve_copies`]).
    measurements: Vec<Measurement>,
    opacity: Option<f64>,
}

/// Solve a `component` part's embedded recipe (see `CompileCx::compile_nested`). The nested
/// request has its own component and size, the host's mode and text metrics, no states (the
/// host's hover, down and focus do not reach it) and no icon override; `with`
/// options (and its `label`, the nested text) are literals or `{ "option": name }`, read from the host request.
fn inherits(part: &Value, name: &str) -> bool {
    part.get("inherit")
        .and_then(Value::as_array)
        .is_some_and(|a| a.iter().any(|v| v.as_str() == Some(name)))
}

/// The ids of every floating part and of the parts below it, with their `.border` rings.
fn floating_subtree_ids(parts: &serde_json::Map<String, Value>) -> Vec<String> {
    let mut ids: Vec<String> = parts
        .iter()
        .filter(|(_, p)| p.get("floating").is_some())
        .map(|(id, _)| id.clone())
        .collect();
    let mut i = 0;
    while i < ids.len() {
        let kids = parts[&ids[i]]
            .get("children")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str);
        let new: Vec<String> = kids
            .filter(|k| !ids.iter().any(|x| x == k))
            .map(String::from)
            .collect();
        ids.extend(new);
        i += 1;
    }
    let rings: Vec<String> = ids
        .iter()
        .flat_map(|id| [format!("{id}.border"), format!("{id}.inner-border")])
        .collect();
    ids.extend(rings);
    ids
}

fn solve_component(cx: &mut Ctx, id: &str, part: &Value, host: &Host) -> Option<Nested> {
    let mut nested = part.get("nested")?.clone();
    for name in part
        .get("inherit")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
    {
        let value = match name {
            "width" if host.defer_width => continue,
            "width" => host.width,
            "height" => host.height,
            _ => host.corner_radius,
        };
        let Some(value) = value else {
            if !host.defer_width {
                cx.diags.push(format!(
                    "component part '{id}': cannot inherit {name}, the host root has none here"
                ));
            }
            continue;
        };
        let root = nested["root"].as_str().unwrap_or_default().to_string();
        nested["parts"][&root]["props"][name] = serde_json::json!({ "value": value });
    }
    let variant = match CompiledVariant::from_value(&nested) {
        Ok(v) => v,
        Err(e) => {
            cx.diags.push(format!("component part '{id}': {e}"));
            return None;
        }
    };
    let mut options = HashMap::new();
    let mut label = String::new();
    for (name, v) in part
        .get("with")
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
    {
        let v = match v.get("option").and_then(Value::as_str) {
            Some(host) => {
                let have = cx.option(host);
                match v.get("map").and_then(Value::as_object) {
                    None => have,
                    Some(_) if have.is_null() => have,
                    Some(map) => {
                        let key = have
                            .as_str()
                            .map_or_else(|| have.to_string(), str::to_string);
                        match map.get(&key) {
                            Some(mapped) => mapped.clone(),
                            None => {
                                cx.diags.push(format!(
                                    "component part '{id}': option '{host}' value '{key}' has no entry in the `with` map for '{name}'; the nested default is used"
                                ));
                                Value::Null
                            }
                        }
                    }
                }
            }
            None => v.clone(),
        };
        if name == "label" {
            if let Some(s) = v.as_str() {
                label = s.to_string();
            }
        } else if !v.is_null() {
            options.insert(name.clone(), v);
        }
    }
    let req = RenderRequest {
        component: part.get("component")?.as_str()?.to_string(),
        size: part.get("nestedSize")?.as_str()?.to_string(),
        options,
        label,
        mode: cx.req.mode.clone(),
        text_metrics: cx.req.text_metrics.clone(),
        ..Default::default()
    };
    let mut scene = match solve(&variant, &req) {
        Ok(s) => s,
        Err(e) => {
            cx.diags.push(format!("component part '{id}': {e}"));
            return None;
        }
    };
    cx.diags
        .extend(scene.diagnostics.iter().map(|d| format!("{id}: {d}")));
    // A floating part sits outside its root, which a nested recipe has no room for.
    let hidden = floating_subtree_ids(&variant.parts);
    let drawn = scene.nodes.len();
    scene.nodes.retain(|n| !hidden.contains(&n.part));
    if scene.nodes.len() != drawn {
        cx.diags.push(format!(
            "component part '{id}': floating parts of the nested recipe are not drawn"
        ));
    }
    let root = scene.nodes.first()?;
    let (ox, oy, w, h) = (root.x, root.y, root.w, root.h);
    let nodes = scene
        .nodes
        .into_iter()
        .enumerate()
        .map(|(i, mut n)| {
            n.x -= ox;
            n.y -= oy;
            if i == 0 {
                n.part = id.to_string();
            } else {
                n.part = format!("{id}.{}", n.part);
            }
            n
        })
        .collect();
    Some(Nested {
        w,
        h,
        nodes,
        ..Default::default()
    })
}

type RpFn<'a> = &'a dyn Fn(&mut Ctx, &Value, &str) -> Option<Resolved>;
type TrackFn<'a> = &'a dyn Fn(&mut Vec<TokenRef>, &str, &Option<Resolved>);

struct GroupLayout {
    w: f64,
    h: f64,
    gap: f64,
    align: String,
    col: bool,
}

/// Size a slot part's (or component group's) fills along its `direction` (`row` or `column`).
fn group_layout(
    cx: &mut Ctx,
    np: &Value,
    group: &[Nested],
    nw: &Option<Resolved>,
    nh: &Option<Resolved>,
    tokens: &mut Vec<TokenRef>,
    (rp, track): (RpFn, TrackFn),
) -> GroupLayout {
    let gdir = rp(cx, np, "direction");
    let col = layout_keyword(cx, "direction", &gdir, &["row", "column"]) == "column";
    let galign = rp(cx, np, "align");
    let align = layout_keyword(cx, "align", &galign, &["start", "center", "end"]);
    let ggap = rp(cx, np, "gap");
    track(tokens, "gap", &ggap);
    let gap = ggap.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let gaps = gap * group.len().saturating_sub(1) as f64;
    let (sw, sh) = if col {
        (
            group.iter().map(|n| n.w).fold(0.0, f64::max),
            group.iter().map(|n| n.h).sum::<f64>() + gaps,
        )
    } else {
        (
            group.iter().map(|n| n.w).sum::<f64>() + gaps,
            group.iter().map(|n| n.h).fold(0.0, f64::max),
        )
    };
    GroupLayout {
        w: nw.as_ref().and_then(Resolved::num).unwrap_or(sw),
        h: nh.as_ref().and_then(Resolved::num).unwrap_or(sh),
        gap,
        align,
        col,
    }
}

/// A slot part directly under the root: the slot box and its placed fills as one nested block.
fn slot_nested(cx: &mut Ctx, id: &str, np: &Value, f: (RpFn, TrackFn)) -> Option<Nested> {
    let (rp, track) = f;
    let group = solve_slot(cx, id, np);
    let mut tokens = Vec::new();
    let nw = rp(cx, np, "width");
    let nh = rp(cx, np, "height");
    track(&mut tokens, "width", &nw);
    track(&mut tokens, "height", &nh);
    let mut node = blank_node(id, "box");
    let mut out = Nested::default();
    if group.is_empty() {
        let ph = np.get("placeholder")?;
        let side = |k: &str| ph.get(k).and_then(Value::as_f64).unwrap_or(0.0);
        (node.w, node.h) = (side("width"), side("height"));
    } else {
        let g = group_layout(cx, np, &group, &nw, &nh, &mut tokens, (rp, track));
        (node.w, node.h) = (g.w, g.h);
        let (mut x, mut y) = (0.0, 0.0);
        for n in group {
            if g.col {
                let (h, dx) = (n.h, axis_offset(&g.align, g.w - n.w));
                place_nested(&mut out.nodes, n, dx, y);
                y += h + g.gap;
            } else {
                let (w, dy) = (n.w, axis_offset(&g.align, g.h - n.h));
                place_nested(&mut out.nodes, n, x, dy);
                x += w + g.gap;
            }
        }
    }
    node.tokens = tokens;
    (out.w, out.h) = (node.w, node.h);
    out.nodes.insert(0, node);
    Some(out)
}

/// Solve a `slot` part: one nested component per request fill of its slot, in order, as
/// `<id>-<n>`. A fill the slot does not accept (not in `accepts`, or not in `accepts` at all
/// when `acceptsOnly`) or that is not drawable (no embedded recipe), and a fill past `max`, is
/// dropped with a scene diagnostic; the render does not fail. The part's `with` options are
/// the defaults of every fill and a fill's own `options` win.
fn solve_slot(cx: &mut Ctx, id: &str, part: &Value) -> Vec<Nested> {
    let slot = part.get("slot").and_then(Value::as_str).unwrap_or(id);
    let max = part.get("max").and_then(Value::as_u64);
    let strict = part.get("acceptsOnly").and_then(Value::as_bool) == Some(true);
    let fills = cx
        .req
        .slots
        .get(slot)
        .map(Vec::as_slice)
        .unwrap_or_default();
    let mut out: Vec<Nested> = Vec::new();
    for fill in fills {
        let Some(recipe) = part.pointer(&format!("/fills/{}", fill.component)) else {
            let why = if strict {
                "the slot accepts only the components it lists"
            } else {
                "only the components the slot lists are drawn"
            };
            cx.diags.push(format!(
                "slot '{slot}': fill '{}' is not drawn: {why}",
                fill.component
            ));
            continue;
        };
        if max.is_some_and(|m| out.len() as u64 >= m) {
            cx.diags.push(format!(
                "slot '{slot}': fill '{}' is past the slot's max of {}; it is not drawn",
                fill.component,
                max.unwrap_or_default()
            ));
            continue;
        }
        let mut with = recipe
            .get("with")
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default();
        // shortcut: a fill option whose value is an object with an `option` key is read as a
        // host binding by `solve_component`; no component option has such a value.
        with.extend(fill.options.iter().map(|(k, v)| (k.clone(), v.clone())));
        let synth = serde_json::json!({
            "kind": "component",
            "component": fill.component,
            "nested": recipe["nested"],
            "nestedSize": recipe["nestedSize"],
            "with": with,
        });
        out.extend(solve_component(
            cx,
            &format!("{id}-{}", out.len() + 1),
            &synth,
            &Host::default(),
        ));
    }
    out
}

/// Solve the part a container's `repeat` names, once per entry of the array option, each copy
/// as the root of its own request: the container's size, mode, states and options reach every
/// copy, and an entry's fields override them. Copies come back relative to their top-left
/// corner. One copy (a single entry, or none) keeps its plain ids; with several, the root is
/// `<id>-<n>` and an inner part `<id>-<n>.<part>`. Only the first copy keeps its measurements,
/// and the container takes its opacity. `inner` is the width a fixed-width column leaves a
/// copy; `min_inner` is the floor for a hugging column.
fn solve_copies(
    cx: &mut Ctx,
    variant: &CompiledVariant,
    id: &str,
    rep: &Value,
    column: bool,
    inner: Option<f64>,
    min_inner: f64,
) -> Result<Vec<Nested>, String> {
    if REPEAT_DEPTH.get() >= MAX_REPEAT_DEPTH {
        cx.diags.push(format!(
            "repeat: '{id}' is nested more than {MAX_REPEAT_DEPTH} repeats deep; it is not drawn"
        ));
        return Ok(Vec::new());
    }
    let req = cx.req;
    let option = rep.get("option").and_then(Value::as_str);
    let entries = option
        .and_then(|o| req.options.get(o))
        .and_then(Value::as_array);
    let mut items: Vec<&Value> = entries
        .map(|a| a.iter().filter(|i| i.is_object()).collect())
        .unwrap_or_default();
    if let Some(a) = entries.filter(|a| a.len() > items.len()) {
        cx.diags.push(format!(
            "repeat: {} entries that are not objects were skipped",
            a.len() - items.len()
        ));
    }
    if items.len() > MAX_REPEAT_COPIES {
        cx.diags.push(format!(
            "repeat: {} entries are past the limit of {MAX_REPEAT_COPIES}; they are not drawn",
            items.len() - MAX_REPEAT_COPIES
        ));
        items.truncate(MAX_REPEAT_COPIES);
    }
    // Every copy starts from this request without the collection itself: a copy is one entry,
    // and a copy that carried the whole array made every nested repeat quadratic.
    let mut base = req.clone();
    if let Some(o) = option {
        base.options.remove(o);
    }
    let none = Value::Null;
    if items.is_empty() {
        // A repeat inside a copy draws nothing for an entry with no children (a tree leaf); the
        // outermost one draws one copy with the request's own options.
        if REPEAT_DEPTH.get() > 0 {
            return Ok(Vec::new());
        }
        items.push(&none);
    }
    let _depth = DepthGuard::enter();
    let copy_req = |item: &Value, width: Option<f64>| {
        let mut r = base.clone();
        r.width = width;
        if let Some(l) = rep
            .get("label")
            .and_then(Value::as_str)
            .and_then(|f| item.get(f))
            .and_then(Value::as_str)
        {
            r.label = l.to_string();
        }
        for (opt, field) in rep
            .get("with")
            .and_then(Value::as_object)
            .into_iter()
            .flatten()
        {
            if let Some(v) = field.as_str().and_then(|f| item.get(f)) {
                r.options.insert(opt.clone(), v.clone());
            }
        }
        r
    };
    let position = |n: usize, of: usize| {
        Some(match (n, of) {
            (_, 1) => "only",
            (0, _) => "first",
            (n, of) if n + 1 == of => "last",
            _ => "middle",
        })
    };
    // The repeated part's own `visibleWhen` is checked per copy, with the position the copy
    // would have among all the entries. A copy that fails is not drawn and takes no number.
    let total = items.len();
    let items: Vec<&Value> = items
        .iter()
        .enumerate()
        .filter(|(n, i)| {
            let r = copy_req(i, None);
            let copy_cx = Ctx {
                req: &r,
                option_defaults: cx.option_defaults,
                position: position(*n, total),
                diags: Vec::new(),
            };
            variant.parts.get(id).is_none_or(|p| copy_cx.visible(p))
        })
        .map(|(_, i)| *i)
        .collect();
    if items.is_empty() {
        return Ok(Vec::new());
    }
    let items = take_budget(cx, id, items);
    if items.is_empty() {
        return Ok(Vec::new());
    }
    let solve_all = |width: Option<f64>| {
        items
            .iter()
            .enumerate()
            .map(|(n, i)| solve_root(variant, id, &copy_req(i, width), position(n, items.len())))
            .collect::<Result<Vec<_>, _>>()
    };
    let mut scenes = solve_all(if column { inner } else { None })?;
    if column && inner.is_none() {
        let root_w = |s: &Scene| s.nodes.first().map_or(0.0, |n| n.w);
        let target = scenes.iter().map(root_w).fold(min_inner, f64::max);
        if scenes.iter().any(|s| root_w(s) != target) {
            scenes = solve_all(Some(target))?;
        }
    }
    let single = scenes.len() == 1;
    let mut out = Vec::new();
    for (i, mut s) in scenes.into_iter().enumerate() {
        let Some(root) = s.nodes.first() else {
            continue;
        };
        let (ox, oy, w, h) = (root.x, root.y, root.w, root.h);
        // The copy's `strokeOver` border is the root's own ring (`<id>.border`).
        let name = |p: &str| match (single, p == id, p == format!("{id}.border")) {
            (true, _, _) => p.to_string(),
            (false, true, _) => format!("{id}-{}", i + 1),
            (false, _, true) => format!("{id}-{}.border", i + 1),
            _ => format!("{id}-{}.{p}", i + 1),
        };
        let nodes = std::mem::take(&mut s.nodes)
            .into_iter()
            .map(|mut n| {
                n.part = name(&n.part);
                n.x -= ox;
                n.y -= oy;
                n
            })
            .collect();
        let measurements = if i == 0 {
            std::mem::take(&mut s.measurements)
                .into_iter()
                .map(|mut m| {
                    m.part = name(&m.part);
                    m.x -= ox;
                    m.y -= oy;
                    m
                })
                .collect()
        } else {
            Vec::new()
        };
        cx.diags.extend(s.diagnostics.drain(..).map(|d| {
            if single {
                d
            } else {
                format!("{id}-{}: {d}", i + 1)
            }
        }));
        out.push(Nested {
            w,
            h,
            nodes,
            measurements,
            opacity: s.opacity,
        });
    }
    Ok(out)
}

struct GridTracks {
    cols: usize,
    col_w: Vec<f64>,
    row_h: Vec<f64>,
    col_x: Vec<f64>,
    row_y: Vec<f64>,
    w: f64,
    h: f64,
}

/// A grid root's tracks: `columns` (a whole number from 1 through [`MAX_GRID_COLUMNS`]; any
/// other value is clamped with a diagnostic) cells per row, filled row-major. A column is as
/// wide as its widest cell and a row as tall as its tallest. `column_gap` and `row_gap` fall
/// back to `gap`.
fn grid_tracks(
    cx: &mut Ctx,
    cells: &[(f64, f64)],
    (cols, col_gap, row_gap): (&Option<Resolved>, &Option<Resolved>, &Option<Resolved>),
    gap: f64,
) -> GridTracks {
    let max = MAX_GRID_COLUMNS as f64;
    let n = match cols.as_ref().and_then(Resolved::num) {
        Some(v) if v.fract() == 0.0 && (1.0..=max).contains(&v) => v as usize,
        Some(v) if v >= 1.0 => {
            cx.diags.push(format!(
                "columns {v} is not a whole number up to {MAX_GRID_COLUMNS}; using {}",
                v.floor().min(max)
            ));
            v.floor().min(max) as usize
        }
        _ => {
            cx.diags.push(format!(
                "columns {} is not a number of at least 1; using 1",
                cols.as_ref()
                    .map_or("is not set".into(), |c| format!("'{}'", c.value))
            ));
            1
        }
    };
    let mut gap_of = |name: &str, r: &Option<Resolved>| match r.as_ref().and_then(Resolved::num) {
        Some(v) if v >= 0.0 => v,
        Some(v) => {
            cx.diags.push(format!("{name} {v} is negative; using 0"));
            0.0
        }
        None => gap,
    };
    let (col_gap, row_gap) = (gap_of("columnGap", col_gap), gap_of("rowGap", row_gap));
    if cells.is_empty() {
        cx.diags.push("grid has no cells".into());
    }
    let used = n.min(cells.len());
    let rows = cells.len().div_ceil(n);
    let mut col_w = vec![0.0f64; used];
    let mut row_h = vec![0.0f64; rows];
    for (i, (w, h)) in cells.iter().enumerate() {
        col_w[i % n] = col_w[i % n].max(*w);
        row_h[i / n] = row_h[i / n].max(*h);
    }
    let starts = |sizes: &[f64], gap: f64| -> Vec<f64> {
        sizes
            .iter()
            .scan(0.0, |at, s| {
                let start = *at;
                *at += s + gap;
                Some(start)
            })
            .collect()
    };
    let extent = |sizes: &[f64], gap: f64| {
        sizes.iter().sum::<f64>() + gap * sizes.len().saturating_sub(1) as f64
    };
    GridTracks {
        cols: n,
        col_x: starts(&col_w, col_gap),
        row_y: starts(&row_h, row_gap),
        w: extent(&col_w, col_gap),
        h: extent(&row_h, row_gap),
        col_w,
        row_h,
    }
}

/// Solve a flowed box that is a grid or repeats a child as the root of its own scene (the
/// request, states and options are the host's), and return it as one block with its own ids.
fn solve_subtree(
    cx: &mut Ctx,
    variant: &CompiledVariant,
    id: &str,
    position: Option<&'static str>,
) -> Result<Option<Nested>, String> {
    if REPEAT_DEPTH.get() >= MAX_REPEAT_DEPTH {
        cx.diags.push(format!(
            "part '{id}' is nested more than {MAX_REPEAT_DEPTH} grids or repeats deep; it is not drawn"
        ));
        return Ok(None);
    }
    let left = SCENE_BUDGET.get();
    if left == 0 {
        cx.diags.push(format!(
            "part '{id}' is past the scene's limit of {MAX_SCENE_COPIES} copies; it is not drawn"
        ));
        return Ok(None);
    }
    SCENE_BUDGET.set(left - 1);
    let _depth = DepthGuard::enter();
    let mut req = cx.req.clone();
    req.width = None;
    let mut s = solve_root(variant, id, &req, position)?;
    cx.diags.extend(s.diagnostics.drain(..));
    let Some(root) = s.nodes.first() else {
        return Ok(None);
    };
    let (ox, oy, w, h) = (root.x, root.y, root.w, root.h);
    let nodes = std::mem::take(&mut s.nodes)
        .into_iter()
        .map(|mut n| {
            n.x -= ox;
            n.y -= oy;
            n
        })
        .collect();
    let measurements = std::mem::take(&mut s.measurements)
        .into_iter()
        .map(|mut m| {
            m.x -= ox;
            m.y -= oy;
            m
        })
        .collect();
    Ok(Some(Nested {
        w,
        h,
        nodes,
        measurements,
        opacity: s.opacity,
    }))
}

/// Append a nested part's nodes with its top-left corner at `(x, y)`.
fn place_nested(out: &mut Vec<SceneNode>, n: Nested, x: f64, y: f64) {
    out.extend(n.nodes.into_iter().map(|mut node| {
        node.x += x;
        node.y += y;
        node
    }));
}

/// A node with no geometry or paint, for parts that only host other nodes.
fn blank_node(part: &str, kind: &str) -> SceneNode {
    SceneNode {
        part: part.into(),
        kind: kind.into(),
        x: 0.0,
        y: 0.0,
        w: 0.0,
        h: 0.0,
        fill: None,
        stroke: None,
        stroke_width: 0.0,
        sweep: None,
        radius: 0.0,
        radii: None,
        text: None,
        font_size: 0.0,
        font_weight: None,
        font_family: None,
        color: None,
        icon: None,
        rotation: None,
        underline: None,
        pattern: None,
        gradient: None,
        shadow: Vec::new(),
        path: None,
        stroke_opacity: None,
        tokens: Vec::new(),
    }
}

/// A part's `grow`: `true` is one share of the row's free space, a positive number is that many
/// shares, anything else (or unset) does not grow.
fn grow_share(r: &Option<Resolved>) -> f64 {
    match r.as_ref().map(|r| r.value.trim()) {
        Some("true") => 1.0,
        Some(v) => v
            .parse()
            .ok()
            .filter(|n: &f64| n.is_finite() && *n > 0.0)
            .unwrap_or(0.0),
        None => 0.0,
    }
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
    "'Adobe Clean Spectrum VF', adobe-clean-spectrum-vf, 'Adobe Clean', 'Source Sans 3', sans-serif";

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

/// The node's drop shadows, last layer first so the first is on top: each is a blurred rect of
/// the shadow's color, masked so nothing lands inside the node's own box. Ids hash the whole
/// definition, so SVGs inlined in one page share an id only when they are identical.
fn write_shadows(s: &mut String, n: &SceneNode) {
    for sh in n.shadow.iter().rev() {
        let sigma = sh.blur / 2.0;
        let (x, y) = (n.x + sh.x - sh.spread, n.y + sh.y - sh.spread);
        let (w, h) = (n.w + 2.0 * sh.spread, n.h + 2.0 * sh.spread);
        if w <= 0.0 || h <= 0.0 {
            continue;
        }
        let pad = (3.0 * sigma).ceil();
        let region = format!(
            "x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\"",
            x - pad,
            y - pad,
            w + 2.0 * pad,
            h + 2.0 * pad
        );
        let key = format!("{sh:?}|{}|{}|{}|{}|{}", n.x, n.y, n.w, n.h, n.radius)
            .bytes()
            .fold(0xcbf2_9ce4_8422_2325u64, |h, b| {
                (h ^ u64::from(b)).wrapping_mul(0x0100_0000_01b3)
            });
        let (fid, mid) = (
            format!("shadow-{key:016x}"),
            format!("shadow-mask-{key:016x}"),
        );
        let hole = match n.radii {
            Some(r) => format!(
                "<path d=\"{}\" fill=\"#000\"/>",
                rounded_path(n.x, n.y, n.w, n.h, r)
            ),
            None => format!(
                "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"#000\"/>",
                n.x, n.y, n.w, n.h, n.radius
            ),
        };
        let blur = if sigma > 0.0 {
            format!(
                "<filter id=\"{fid}\" filterUnits=\"userSpaceOnUse\" {region}><feGaussianBlur stdDeviation=\"{sigma}\"/></filter>"
            )
        } else {
            String::new()
        };
        let _ = write!(
            s,
            "<defs>{blur}<mask id=\"{mid}\" maskUnits=\"userSpaceOnUse\" {region}><rect {region} fill=\"#fff\"/>{hole}</mask></defs>"
        );
        let filter = if sigma > 0.0 {
            format!(" filter=\"url(#{fid})\"")
        } else {
            String::new()
        };
        let common = format!(
            "data-part=\"{}\" data-shadow=\"true\" fill=\"{}\"{filter}",
            esc(&n.part),
            esc(&sh.color)
        );
        let shape = match n.radii {
            Some(r) => format!(
                "<path {common} d=\"{}\"/>",
                rounded_path(x, y, w, h, r.map(|v| (v + sh.spread).max(0.0)))
            ),
            None => format!(
                "<rect {common} x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"{}\"/>",
                (n.radius + sh.spread).max(0.0)
            ),
        };
        let _ = write!(s, "<g mask=\"url(#{mid})\">{shape}</g>");
    }
}

/// A box drawn as its `path`: drop shadows (spread is not applied to a shape), fill, checker
/// pattern and a stroke centered on the outline with round joins. The path is in the node's
/// own pixel space, so a `translate` places it and leaves the stroke width alone.
fn write_path_box(s: &mut String, n: &SceneNode, attrs: &str, so: &str) {
    let Some(p) = &n.path else { return };
    let tf = format!("transform=\"translate({} {})\"", n.x, n.y);
    let rule = if p.even_odd {
        " fill-rule=\"evenodd\""
    } else {
        ""
    };
    let d = esc(&p.d);
    let hash = |key: String| {
        key.bytes().fold(0xcbf2_9ce4_8422_2325u64, |h, b| {
            (h ^ u64::from(b)).wrapping_mul(0x0100_0000_01b3)
        })
    };
    for sh in n.shadow.iter().rev() {
        let sigma = sh.blur / 2.0;
        let pad = (3.0 * sigma).ceil();
        // The shadow element is translated, and a userSpaceOnUse filter region is in the
        // element's own (translated) space, so the region is the box in local coordinates.
        let region = format!(
            "x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\"",
            -pad,
            -pad,
            n.w + 2.0 * pad,
            n.h + 2.0 * pad
        );
        // The hole is the node's own shape, at the node, so it needs the whole box in its region.
        let mask_region = format!(
            "x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\"",
            n.x.min(n.x + sh.x) - pad,
            n.y.min(n.y + sh.y) - pad,
            n.w + sh.x.abs() + 2.0 * pad,
            n.h + sh.y.abs() + 2.0 * pad
        );
        let key = hash(format!("{sh:?}|{}|{}|{}|{}|{p:?}", n.x, n.y, n.w, n.h));
        let (fid, mid) = (
            format!("shadow-{key:016x}"),
            format!("shadow-mask-{key:016x}"),
        );
        let blur = if sigma > 0.0 {
            format!("<filter id=\"{fid}\" filterUnits=\"userSpaceOnUse\" {region}><feGaussianBlur stdDeviation=\"{sigma}\"/></filter>")
        } else {
            String::new()
        };
        let filter = if sigma > 0.0 {
            format!(" filter=\"url(#{fid})\"")
        } else {
            String::new()
        };
        let _ = write!(
            s,
            "<defs>{blur}<mask id=\"{mid}\" maskUnits=\"userSpaceOnUse\" {mask_region}><rect {mask_region} fill=\"#fff\"/><path {tf} d=\"{d}\" fill=\"#000\"{rule}/></mask></defs><g mask=\"url(#{mid})\"><path data-part=\"{}\" data-shadow=\"true\" transform=\"translate({} {})\" d=\"{d}\" fill=\"{}\"{rule}{filter}/></g>",
            esc(&n.part),
            n.x + sh.x,
            n.y + sh.y,
            esc(&sh.color)
        );
    }
    let _ = write!(
        s,
        "<path {attrs} {tf} d=\"{d}\" fill=\"{}\"{rule}/>",
        esc(n.fill.as_deref().unwrap_or("none"))
    );
    if let Some(pt) = &n.pattern {
        let key: String = hash(format!("{}|{}|{p:?}", pt.alt, pt.size)).to_string();
        let (id, z) = (format!("pattern-{key}"), pt.size * 2.0);
        let _ = write!(
            s,
            "<defs><pattern id=\"{id}\" width=\"{z}\" height=\"{z}\" patternUnits=\"userSpaceOnUse\"><rect x=\"{sz}\" width=\"{sz}\" height=\"{sz}\" fill=\"{alt}\"/><rect y=\"{sz}\" width=\"{sz}\" height=\"{sz}\" fill=\"{alt}\"/></pattern></defs><path {tf} d=\"{d}\" fill=\"url(#{id})\"{rule}/>",
            sz = pt.size,
            alt = esc(&pt.alt)
        );
    }
    if let (Some(c), true) = (n.stroke.as_deref(), n.stroke_width > 0.0) {
        let _ = write!(
            s,
            "<path {tf} d=\"{d}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\" stroke-linejoin=\"round\"{so}/>",
            esc(c),
            n.stroke_width
        );
    }
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
        let so = n
            .stroke_opacity
            .map(|o| format!(" stroke-opacity=\"{o}\""))
            .unwrap_or_default();
        match n.kind.as_str() {
            "box" if n.path.is_some() => write_path_box(&mut s, n, &attrs, &so),
            "box" => {
                write_shadows(&mut s, n);
                let mut layers = vec![(attrs.clone(), n.fill.clone())];
                if let Some(g) = &n.gradient {
                    // The ends are in the box's unit space; the gradient is drawn in user space,
                    // so its bands stay square to the line on a box that is not square.
                    let (x1, y1) = (n.x + g.from[0] * n.w, n.y + g.from[1] * n.h);
                    let (x2, y2) = (n.x + g.to[0] * n.w, n.y + g.to[1] * n.h);
                    // The id names the whole definition (an FNV-1a hash of it and its box), so
                    // SVGs inlined in one page share an id only when the definitions are identical.
                    let key = format!("{g:?}|{x1}|{y1}|{x2}|{y2}")
                        .bytes()
                        .fold(0xcbf2_9ce4_8422_2325u64, |h, b| {
                            (h ^ u64::from(b)).wrapping_mul(0x0100_0000_01b3)
                        });
                    let id = format!("gradient-{key:016x}");
                    let _ = write!(
                        s,
                        "<defs><linearGradient id=\"{id}\" gradientUnits=\"userSpaceOnUse\" x1=\"{x1}\" y1=\"{y1}\" x2=\"{x2}\" y2=\"{y2}\">"
                    );
                    for stop in &g.stops {
                        let _ = write!(
                            s,
                            "<stop offset=\"{}\" stop-color=\"{}\"/>",
                            stop.offset,
                            esc(&stop.color)
                        );
                    }
                    s.push_str("</linearGradient></defs>");
                    layers[0].1 = Some(format!("url(#{id})"));
                }
                if let Some(p) = &n.pattern {
                    // The id names the whole definition, so SVGs inlined in one page can share an id only
                    // when the definitions are identical.
                    let key: String = format!("{}|{}|{}|{}", p.alt, p.size, n.x, n.y)
                        .chars()
                        .map(|c| match c.is_ascii_alphanumeric() {
                            true => c.to_string(),
                            false => format!("_{:x}_", c as u32),
                        })
                        .collect();
                    let (id, z) = (format!("pattern-{key}"), p.size * 2.0);
                    let _ = write!(
                        s,
                        "<defs><pattern id=\"{id}\" x=\"{}\" y=\"{}\" width=\"{z}\" height=\"{z}\" patternUnits=\"userSpaceOnUse\"><rect x=\"{sz}\" width=\"{sz}\" height=\"{sz}\" fill=\"{alt}\"/><rect y=\"{sz}\" width=\"{sz}\" height=\"{sz}\" fill=\"{alt}\"/></pattern></defs>",
                        n.x,
                        n.y,
                        sz = p.size,
                        alt = esc(&p.alt)
                    );
                    layers.push((String::new(), Some(format!("url(#{id})"))));
                }
                for (attrs, fill) in &layers {
                    if let Some(r) = n.radii {
                        let _ = write!(
                            s,
                            "<path {attrs} d=\"{}\" fill=\"{}\"/>",
                            rounded_path(n.x, n.y, n.w, n.h, r),
                            esc(fill.as_deref().unwrap_or("none"))
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
                            esc(fill.as_deref().unwrap_or("none"))
                        );
                    }
                }
                if let (Some(c), true) = (n.stroke.as_deref(), n.stroke_width > 0.0) {
                    let i = n.stroke_width / 2.0;
                    if let Some(r) = n.radii {
                        let _ = write!(
                            s,
                            "<path d=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\"{so}/>",
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
                            "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\"{so}/>",
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
                    "<rect {attrs} x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\"{so}/>",
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
                if let Some(u) = n.underline {
                    let (x, y, w, h) = u.rect(n);
                    let _ = write!(
                        s,
                        "<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" fill=\"{}\"/>",
                        esc(n.color.as_deref().unwrap_or("currentColor"))
                    );
                }
            }
            "progress" => {
                let (cx, cy, r, sw) = progress_geometry(n);
                let sweep = n.sweep.unwrap_or(0.25);
                let end = sweep * std::f64::consts::TAU;
                let round = |v: f64| (v * 1e6).round() / 1e6;
                let color = esc(n.color.as_deref().unwrap_or("currentColor"));
                let arc = if sweep >= 1.0 {
                    format!("<circle cx=\"{cx}\" cy=\"{cy}\" r=\"{r}\" stroke=\"{color}\"/>")
                } else if sweep > 0.0 {
                    format!(
                        "<path d=\"M{} {}A{r} {r} 0 {} 1 {} {}\" stroke=\"{color}\" stroke-linecap=\"round\"/>",
                        cx,
                        cy - r,
                        u8::from(sweep > 0.5),
                        if n.sweep.is_some() { round(cx + r * end.sin()) } else { cx + r },
                        if n.sweep.is_some() { round(cy - r * end.cos()) } else { cy }
                    )
                } else {
                    String::new()
                };
                let _ = write!(
                    s,
                    "<g {attrs} fill=\"none\" stroke-width=\"{sw}\"><circle cx=\"{cx}\" cy=\"{cy}\" r=\"{r}\" stroke=\"{}\"/>{arc}</g>",
                    esc(n.stroke.as_deref().unwrap_or("none"))
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

/// Center, ring radius and stroke width of a `progress` node. A bound `strokeWidth` is the
/// thickness; otherwise a ninth of the diameter. The ring sits inside the box, so its radius is
/// half the diameter less half the stroke.
pub fn progress_geometry(n: &SceneNode) -> (f64, f64, f64, f64) {
    let side = n.w.min(n.h);
    let sw = if n.stroke_width > 0.0 {
        n.stroke_width
    } else {
        (side / 9.0).max(1.0)
    };
    (n.x + n.w / 2.0, n.y + n.h / 2.0, side / 2.0 - sw / 2.0, sw)
}

/// Layout revision of this solver. Bump it, and `packages/design-data/dataset.json`, in the
/// same change whenever a solver or layout-semantics change alters how existing recipes render
/// (a changed `recipe-snapshots.json`). A data-only snapshot change (same geometry and resolved
/// values) does not bump it.
pub const LAYOUT_REVISION: u32 = 6;

/// Warn when the dataset's `layoutRevision` (`dataset.json`; absent is 0) differs from
/// [`LAYOUT_REVISION`]. `None` when they match or `root` holds no recipes.
pub fn layout_revision_warning(root: &std::path::Path) -> Option<String> {
    if !root.join("visuals").is_dir() {
        return None;
    }
    let data = std::fs::read_to_string(root.join("dataset.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v.get("layoutRevision")?.as_u64())
        .unwrap_or(0);
    let engine = u64::from(LAYOUT_REVISION);
    match data.cmp(&engine) {
        std::cmp::Ordering::Equal => None,
        std::cmp::Ordering::Less => Some(format!(
            "this data targets layout revision {data}, this renderer is revision {engine}: \
             recipes can lay out differently. Use a newer data release, or an older CLI."
        )),
        std::cmp::Ordering::Greater => Some(format!(
            "this data targets layout revision {data}, this renderer is revision {engine}: \
             upgrade the CLI."
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_revision_matches_the_data() {
        let root =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data");
        assert_eq!(layout_revision_warning(&root), None);
    }

    #[test]
    fn layout_revision_warns_on_missing_and_newer() {
        let dir = std::env::temp_dir().join(format!("ddrev-{}", std::process::id()));
        std::fs::create_dir_all(dir.join("visuals")).unwrap();
        let old = layout_revision_warning(&dir).unwrap();
        assert!(old.contains("revision 0"), "{old}");
        std::fs::write(dir.join("dataset.json"), r#"{"layoutRevision": 99}"#).unwrap();
        assert!(layout_revision_warning(&dir)
            .unwrap()
            .contains("upgrade the CLI"));
        std::fs::remove_dir_all(&dir).unwrap();
        assert_eq!(layout_revision_warning(&dir), None);
    }
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

    /// The token a binding with these `(token, states, precedence)` candidates resolves to
    /// under `active` states, in the order given (the order `rank_by` would leave them in).
    fn winner(cands: &[(&str, &[&str], &[u32])], active: &[&str]) -> String {
        let list: Vec<Value> = cands
            .iter()
            .map(|(t, st, pr)| {
                serde_json::json!({ "value": "v", "token": t, "states": st, "precedence": pr })
            })
            .collect();
        let r = req(active);
        let defaults = HashMap::new();
        let mut cx = Ctx {
            req: &r,
            option_defaults: &defaults,
            position: None,
            diags: Vec::new(),
        };
        cx.resolve_candidates(&serde_json::json!({ "candidates": list }))
            .map(|r| r.token)
            .unwrap_or_default()
    }

    #[test]
    fn an_item_position_pin_picks_the_copys_record_and_beats_an_unpinned_one() {
        let list = serde_json::json!([
            { "value": "base", "token": "base" },
            { "value": "first", "token": "first", "options": { "itemPosition": "first" } },
            { "value": "last", "token": "last", "options": { "itemPosition": "last" } },
        ]);
        let pick = |position: Option<&'static str>| {
            let r = req(&[]);
            let defaults = HashMap::new();
            let mut cx = Ctx {
                req: &r,
                option_defaults: &defaults,
                position,
                diags: Vec::new(),
            };
            cx.resolve_candidates(&serde_json::json!({ "candidates": list }))
                .map(|r| r.token)
                .unwrap_or_default()
        };
        assert_eq!(pick(Some("first")), "first");
        assert_eq!(pick(Some("last")), "last");
        assert_eq!(pick(Some("only")), "base");
        assert_eq!(pick(Some("middle")), "base");
        assert_eq!(pick(None), "base");
    }

    #[test]
    fn scope_item_position_compiles_to_a_pin() {
        let scope = serde_json::json!({ "itemPosition": "last" });
        let v = scope_variants(Some(&scope), &[]);
        assert_eq!(
            v,
            [(Some(serde_json::json!({ "itemPosition": "last" })), vec![])]
        );
        let scope = serde_json::json!({ "itemPosition": "first", "options": { "size": "m" } });
        let v = scope_variants(Some(&scope), &["size"]);
        assert_eq!(
            v[0].0,
            Some(serde_json::json!({ "size": "m", "itemPosition": "first" }))
        );
    }

    #[test]
    fn tied_candidates_with_different_tokens_report_a_diagnostic() {
        let diags = |tokens: &[&str]| {
            let list: Vec<Value> = tokens
                .iter()
                .map(|t| {
                    // `x:` tokens rank one name field fewer, so they are the specific match.
                    let fields = if t.starts_with("x:") { 3 } else { 4 };
                    serde_json::json!({ "value": "v", "token": t, "rank": [0, fields] })
                })
                .collect();
            let r = req(&[]);
            let defaults = HashMap::new();
            let mut cx = Ctx {
                req: &r,
                option_defaults: &defaults,
                position: None,
                diags: Vec::new(),
            };
            let entry = serde_json::json!({
                "candidates": list,
                "miss": "fill: no relationship 'color' / 'Dot'"
            });
            cx.resolve_candidates(&entry);
            cx.diags
        };
        assert_eq!(
            diags(&["a", "b"]),
            ["fill: relationship 'color' / 'Dot' is ambiguous: 2 candidates remain after narrowing"]
        );
        assert!(diags(&["a", "a"]).is_empty());
        // A candidate with fewer name fields wins the tie-break, so nothing is ambiguous.
        assert!(diags(&["x:row", "track"]).is_empty());
        assert!(diags(&["a"]).is_empty());
    }

    #[test]
    fn inactive_state_records_do_not_tie_with_the_chosen_candidate() {
        let diags = |active: &[&str]| {
            let list = serde_json::json!([
                { "value": "a", "token": "a", "states": ["focus-+-hover"], "precedence": [50] },
                { "value": "b", "token": "b", "states": ["focus-+-not-hover"], "precedence": [50] },
                { "value": "c", "token": "c", "states": ["hover"], "precedence": [50] },
                { "value": "d", "token": "d", "states": ["down"], "precedence": [50] },
            ]);
            let r = req(active);
            let defaults = HashMap::new();
            let mut cx = Ctx {
                req: &r,
                option_defaults: &defaults,
                position: None,
                diags: Vec::new(),
            };
            cx.resolve_candidates(&serde_json::json!({ "candidates": list, "miss": "x: no y" }));
            cx.diags
        };
        // Nothing active: the fallback candidate ties only with active ones, so no diagnostic.
        assert!(diags(&[]).is_empty());
        // One active state wins alone.
        assert!(diags(&["hover"]).is_empty());
        // Two active states with equal precedence still tie and report.
        assert_eq!(
            diags(&["hover", "down"]),
            ["x: y is ambiguous: 2 candidates remain after narrowing"]
        );
    }

    #[test]
    fn nothing_active_falls_back_to_the_default_record() {
        let list = serde_json::json!([
            { "value": "a", "token": "a", "states": ["hover"], "precedence": [50] },
            { "value": "d", "token": "d" },
        ]);
        let r = req(&[]);
        let defaults = HashMap::new();
        let mut cx = Ctx {
            req: &r,
            option_defaults: &defaults,
            position: None,
            diags: Vec::new(),
        };
        let got = cx
            .resolve_candidates(&serde_json::json!({ "candidates": list, "miss": "x: no y" }))
            .unwrap();
        assert_eq!(got.token, "d");
        assert!(cx.diags.is_empty(), "{:?}", cx.diags);
    }

    #[test]
    fn a_scale_pinned_relationship_applies_only_at_its_scale() {
        let g = any_of_graph(
            serde_json::json!({"scale": "desktop"}),
            serde_json::json!({"scale": "mobile"}),
        );
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {"box": {"kind": "box", "props": {
                "fill": {"relationship": {"property": "color", "context": "Control"}}}}}
        });
        let fill = |scale: &str| {
            let r = RenderRequest {
                component: "gadget".into(),
                size: "m".into(),
                mode: HashMap::from([("scale".to_string(), scale.to_string())]),
                ..Default::default()
            };
            let scene = build_scene(&g, &recipe, &r).unwrap();
            assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
            scene.nodes[0].fill.clone().unwrap()
        };
        assert_eq!(fill("desktop"), "#111111");
        assert_eq!(fill("mobile"), "#0000ff");
        // No scale in the request: both records are kept, so they tie.
        let r = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            ..Default::default()
        };
        let scene = build_scene(&g, &recipe, &r).unwrap();
        assert!(scene.diagnostics.iter().any(|d| d.contains("ambiguous")));
    }

    #[test]
    fn combined_states_resolve_by_precedence_not_candidate_order() {
        let fill: &[(&str, &[&str], &[u32])] = &[
            ("x:10 hover", &["hover"], &[50]),
            ("x:9 focus", &["keyboard-focus"], &[60]),
            ("x:8 down", &["down"], &[70]),
            ("x:1 default", &[], &[]),
        ];
        assert_eq!(winner(fill, &["down", "keyboard-focus"]), "x:8 down");
        assert_eq!(winner(fill, &["hover", "keyboard-focus"]), "x:9 focus");
        assert_eq!(winner(fill, &["down", "hover"]), "x:8 down");
        assert_eq!(
            winner(fill, &["hover", "keyboard-focus", "down"]),
            "x:8 down"
        );
        // A state that binds nothing for this property leaves it to the others (a label).
        let label: &[(&str, &[&str], &[u32])] = &[
            ("l:2 hover", &["hover"], &[50]),
            ("l:1 down", &["down"], &[70]),
        ];
        assert_eq!(winner(label, &["keyboard-focus", "hover"]), "l:2 hover");
        // Aliases normalize: `focus` is keyboard-focus, `pressed` is down.
        assert_eq!(winner(fill, &["focus", "pressed"]), "x:8 down");
    }

    #[test]
    fn more_matched_states_beat_higher_precedence() {
        let fill: &[(&str, &[&str], &[u32])] = &[
            ("down", &["down"], &[70]),
            ("selected", &["selected"], &[]),
            ("selected+hover", &["selected", "hover"], &[50]),
            ("selected+down", &["selected", "down"], &[70]),
        ];
        assert_eq!(winner(fill, &["selected", "down"]), "selected+down");
        assert_eq!(winner(fill, &["selected", "hover"]), "selected+hover");
        assert_eq!(winner(fill, &["selected", "keyboard-focus"]), "selected");
        assert_eq!(winner(fill, &["down"]), "down");
    }

    #[test]
    fn disabled_suppresses_interaction_states_and_ties_keep_source_order() {
        let fill: &[(&str, &[&str], &[u32])] = &[
            ("hover", &["hover"], &[50]),
            ("disabled", &["disabled"], &[]),
        ];
        assert_eq!(winner(fill, &["disabled", "hover"]), "disabled");
        // No disabled candidate: the default wins over a hover that ranks first.
        let no_disabled: &[(&str, &[&str], &[u32])] =
            &[("hover", &["hover"], &[50]), ("default", &[], &[])];
        assert_eq!(winner(no_disabled, &["disabled", "hover"]), "default");
        // A prop-state candidate that is not active ranks first: still the default.
        let prop_first: &[(&str, &[&str], &[u32])] =
            &[("selected", &["selected"], &[]), ("default", &[], &[])];
        assert_eq!(winner(prop_first, &["disabled", "hover"]), "default");
        let tie: &[(&str, &[&str], &[u32])] =
            &[("a", &["hover"], &[50]), ("b", &["keyboard-focus"], &[50])];
        assert_eq!(winner(tie, &["hover", "keyboard-focus"]), "a");
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

    fn lit(v: Value) -> Value {
        serde_json::json!({ "value": v })
    }

    /// A row root (padding 10, gap 4) of boxes `a` (w 20), `b` (w 40) and `c` (w 10).
    fn width_recipe(root: Value, grow_a: Value, grow_c: Value) -> Value {
        let mut p = serde_json::json!({
            "height": lit(30.into()),
            "paddingInlineStart": lit(10.into()),
            "paddingInlineEnd": lit(10.into()),
            "gap": lit(4.into()),
        });
        for (k, v) in root.as_object().unwrap() {
            p[k] = lit(v.clone());
        }
        let child = |w: u32, g: Value| {
            let mut props = serde_json::json!({ "width": lit(w.into()), "height": lit(10.into()) });
            if !g.is_null() {
                props["grow"] = lit(g);
            }
            serde_json::json!({ "kind": "box", "props": props })
        };
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["a", "b", "c"], "props": p },
                "a": child(20, grow_a), "b": child(40, Value::Null), "c": child(10, grow_c)
            }
        })
    }

    fn solve_width(recipe: &Value, width: Option<f64>) -> Scene {
        let (g, _) = load();
        let mut r = req(&[]);
        r.width = width;
        build_scene(&g, recipe, &r).unwrap()
    }

    /// A root box and a flowed child box that bind `patternFill` and `patternSize`.
    fn pattern_recipe(alt: Value, size: Value) -> Value {
        let p = |w: u32| {
            let mut props = serde_json::json!({
                "width": lit(w.into()), "height": lit(w.into()), "fill": lit("#ffffff".into())
            });
            if !alt.is_null() {
                props["patternFill"] = lit(alt.clone());
            }
            if !size.is_null() {
                props["patternSize"] = lit(size.clone());
            }
            props
        };
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["c"], "props": p(40) },
                "c": { "kind": "box", "props": p(16) }
            }
        })
    }

    fn shadow_recipe(shadow: Value) -> Value {
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "props": {
                "width": lit(40.into()), "height": lit(20.into()), "fill": lit("#ffffff".into()),
                "shadow": shadow
            } } }
        })
    }

    fn layer(x: i32, y: i32, blur: i32, color: &str) -> Value {
        serde_json::json!({ "x": lit(x.into()), "y": lit(y.into()), "blur": lit(blur.into()),
            "color": lit(color.into()) })
    }

    #[test]
    fn a_shadow_source_draws_layers_under_the_box_without_moving_layout() {
        let plain = solve_width(&shadow_recipe(Value::Null), None);
        let shadow = serde_json::json!({ "shadow": [
            layer(0, 3, 8, "rgba(0, 0, 0, 0.15)"),
            { "x": lit(1.into()), "y": lit(2.into()), "blur": lit(0.into()),
              "spread": lit(2.into()), "color": lit("#000000".into()) }
        ] });
        let scene = solve_width(&shadow_recipe(shadow), None);
        let n = &scene.nodes[0];
        assert_eq!(n.shadow.len(), 2);
        assert_eq!(n.shadow[0].color, "rgba(0, 0, 0, 0.15)");
        assert_eq!((n.shadow[1].spread, n.shadow[1].blur), (2.0, 0.0));
        // Layout is unchanged (same box size); only the canvas grows, and the origin shifts.
        assert_eq!((n.w, n.h), (plain.nodes[0].w, plain.nodes[0].h));
        assert_eq!(
            (n.x, n.y, scene.width, scene.height),
            (12.0, 9.0, 64.0, 44.0)
        );
        let svg = scene_to_svg(&scene);
        assert!(
            svg.contains("<feGaussianBlur stdDeviation=\"4\"/>"),
            "{svg}"
        );
        assert_eq!(svg.matches("data-shadow=\"true\"").count(), 2, "{svg}");
        // The blur-0 layer draws no filter; the box fill comes after every shadow.
        assert_eq!(svg.matches("<filter ").count(), 1, "{svg}");
        assert!(
            svg.rfind("data-shadow").unwrap() < svg.find("fill=\"#ffffff\"").unwrap(),
            "{svg}"
        );
        assert_eq!(
            svg,
            scene_to_svg(&solve_width(
                &shadow_recipe(serde_json::json!({ "shadow": [
            layer(0, 3, 8, "rgba(0, 0, 0, 0.15)"),
            { "x": lit(1.into()), "y": lit(2.into()), "blur": lit(0.into()),
              "spread": lit(2.into()), "color": lit("#000000".into()) }
        ] })),
                None
            ))
        );
    }

    #[test]
    fn shadow_layers_bind_the_drop_shadow_tokens() {
        let tok = |prop: &str| {
            serde_json::json!({ "token": {
            "structure": "drop-shadow", "property": prop, "scaleIndex": "100" } })
        };
        let src = serde_json::json!({ "shadow": [
            { "x": tok("x"), "y": tok("y"), "blur": tok("blur"), "color": tok("color") }
        ] });
        let scene = solve_width(&shadow_recipe(src), None);
        let n = &scene.nodes[0];
        assert_eq!(n.shadow.len(), 1, "{:?}", scene.diagnostics);
        assert_eq!(
            (n.shadow[0].x, n.shadow[0].y, n.shadow[0].blur),
            (0.0, 1.0, 6.0)
        );
        assert!(
            n.shadow[0].color.starts_with("rgba(0, 0, 0,"),
            "{}",
            n.shadow[0].color
        );
        assert!(
            n.tokens.iter().any(|t| t.prop == "shadow1.blur"),
            "{:?}",
            n.tokens
        );
    }

    #[test]
    fn a_shadow_layer_that_does_not_resolve_is_skipped_with_a_diagnostic() {
        let bad = serde_json::json!({ "x": lit(0.into()), "y": lit(1.into()),
            "blur": lit((-2).into()), "color": lit("#000000".into()) });
        let src = serde_json::json!({ "shadow": [bad, layer(0, 1, 2, "#000000")] });
        let scene = solve_width(&shadow_recipe(src), None);
        assert_eq!(scene.nodes[0].shadow.len(), 1);
        assert!(
            scene
                .diagnostics
                .iter()
                .any(|d| d.contains("shadow layer 1")),
            "{:?}",
            scene.diagnostics
        );
    }

    #[test]
    fn a_huge_blur_is_clamped_and_a_bad_color_or_spread_is_skipped() {
        let src = serde_json::json!({ "shadow": [
            layer(0, 1, 1_000_000_000, "#000000"),
            layer(0, 1, 2, "notacolor"),
            { "x": lit(0.into()), "y": lit(1.into()), "blur": lit(2.into()),
              "spread": lit((-100).into()), "color": lit("#000000".into()) }
        ] });
        let scene = solve_width(&shadow_recipe(src), None);
        assert_eq!(scene.nodes[0].shadow.len(), 1);
        assert_eq!(scene.nodes[0].shadow[0].blur, MAX_SHADOW_BLUR);
        let d = scene.diagnostics.join("|");
        assert!(d.contains("above 100"), "{d}");
        assert!(d.contains("shadow layer 2"), "{d}");
        assert!(d.contains("shadow spread -100"), "{d}");
        assert!(!scene_to_svg(&scene).contains("notacolor"));
    }

    #[test]
    fn a_box_with_pattern_props_draws_a_checkerboard() {
        let scene = solve_width(&pattern_recipe("#000000".into(), 4.into()), None);
        for part in ["r", "c"] {
            let n = scene.nodes.iter().find(|n| n.part == part).unwrap();
            let p = n
                .pattern
                .as_ref()
                .unwrap_or_else(|| panic!("{part} has no pattern"));
            assert_eq!((p.alt.as_str(), p.size), ("#000000", 4.0));
        }
        let svg = scene_to_svg(&scene);
        assert_eq!(svg.matches("<pattern ").count(), 2);
        let ids: std::collections::HashSet<_> = svg
            .split("<pattern id=\"")
            .skip(1)
            .map(|t| &t[..t.find('"').unwrap()])
            .collect();
        assert_eq!(ids.len(), 2, "two different boxes need two ids: {svg}");
        assert!(svg.contains("fill=\"url(#pattern-"), "{svg}");
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
    }

    fn gradient_recipe(fill: Value) -> Value {
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "children": ["c"], "props": {
                "width": { "value": 40 }, "height": { "value": 40 }, "fill": fill
            } }, "c": { "kind": "box", "props": {
                "width": { "value": 16 }, "height": { "value": 16 }, "fill": fill
            } } }
        })
    }

    fn literal_stops() -> Value {
        serde_json::json!({ "gradient": { "from": [0.0, 0.0], "to": [1.0, 1.0], "stops": [
            { "color": { "value": "#ff0000" }, "offset": { "value": 0 } },
            { "color": { "value": "#0000ff" }, "offset": { "value": 0.5 } },
            { "color": { "value": "#00ff00" }, "offset": { "value": 1 } }
        ] } })
    }

    #[test]
    fn a_gradient_source_draws_a_linear_gradient_with_a_solid_fallback() {
        let scene = solve_width(&gradient_recipe(literal_stops()), None);
        for part in ["r", "c"] {
            let n = scene.nodes.iter().find(|n| n.part == part).unwrap();
            let g = n
                .gradient
                .as_ref()
                .unwrap_or_else(|| panic!("{part}: no gradient"));
            assert_eq!((g.from, g.to), ([0.0, 0.0], [1.0, 1.0]));
            assert_eq!(
                g.stops
                    .iter()
                    .map(|s| (s.color.as_str(), s.offset))
                    .collect::<Vec<_>>(),
                [("#ff0000", 0.0), ("#0000ff", 0.5), ("#00ff00", 1.0)]
            );
            assert_eq!(n.fill.as_deref(), Some("#ff0000"));
        }
        let svg = scene_to_svg(&scene);
        assert_eq!(svg.matches("<linearGradient ").count(), 2, "{svg}");
        assert!(svg.contains("fill=\"url(#gradient-"), "{svg}");
        assert!(
            svg.contains("<stop offset=\"0.5\" stop-color=\"#0000ff\"/>"),
            "{svg}"
        );
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
    }

    #[test]
    fn a_gradient_with_a_stop_that_does_not_resolve_is_dropped() {
        let bad = serde_json::json!({ "gradient": { "stops": [
            { "color": { "value": "#ff0000" }, "offset": { "value": 0 } },
            { "color": { "option": "unset" }, "offset": { "value": 1 } }
        ] } });
        let scene = solve_width(&gradient_recipe(bad), None);
        assert!(scene.nodes.iter().all(|n| n.gradient.is_none()));
        assert!(
            scene
                .diagnostics
                .iter()
                .any(|d| d.contains("gradient stop 2")),
            "{:?}",
            scene.diagnostics
        );
        let down = serde_json::json!({ "gradient": { "stops": [
            { "color": { "value": "#ff0000" }, "offset": { "value": 0.8 } },
            { "color": { "value": "#0000ff" }, "offset": { "value": 0.2 } }
        ] } });
        let scene = solve_width(&gradient_recipe(down), None);
        assert!(scene.nodes.iter().all(|n| n.gradient.is_none()));
        assert!(scene
            .diagnostics
            .iter()
            .any(|d| d.contains("must not decrease")));
    }

    #[test]
    fn a_css_gradient_in_an_option_fits_the_box() {
        let (g, _) = load();
        let recipe = gradient_recipe(serde_json::json!({ "option": "preview" }));
        let mut r = req(&[]);
        r.options.insert(
            "preview".into(),
            "linear-gradient(90deg, rgb(255, 0, 0), #00f 50%, #0f0)".into(),
        );
        let scene = build_scene(&g, &recipe, &r).unwrap();
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
        let n = &scene.nodes[0];
        let gr = n.gradient.as_ref().expect("gradient");
        let close = |a: [f64; 2], b: [f64; 2]| a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-9);
        assert!(
            close(gr.from, [0.0, 0.5]) && close(gr.to, [1.0, 0.5]),
            "{gr:?}"
        );
        assert_eq!(
            gr.stops.iter().map(|s| s.offset).collect::<Vec<_>>(),
            [0.0, 0.5, 1.0]
        );
        assert_eq!(n.fill.as_deref(), Some("rgb(255, 0, 0)"));
        r.options
            .insert("preview".into(), "linear-gradient(red, nope)".into());
        let scene = build_scene(&g, &recipe, &r).unwrap();
        assert!(scene.nodes.iter().all(|n| n.gradient.is_none()));
        assert!(scene
            .diagnostics
            .iter()
            .any(|d| d.contains("not a solid color")));
    }

    #[test]
    fn css_linear_gradients_parse_angles_corners_and_missing_positions() {
        let close = |a: [f64; 2], b: [f64; 2]| a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-9);
        let p = |s: &str, w: f64, h: f64| parse_css_linear_gradient(s, w, h);
        // Default direction is to the bottom; positions spread evenly.
        let g = p("linear-gradient(#000, #111, #222, #333)", 10.0, 10.0).unwrap();
        assert!(close(g.from, [0.5, 0.0]) && close(g.to, [0.5, 1.0]));
        let offs: Vec<f64> = g.stops.iter().map(|s| s.offset).collect();
        assert!(offs
            .iter()
            .zip([0.0, 1.0 / 3.0, 2.0 / 3.0, 1.0])
            .all(|(a, b)| (a - b).abs() < 1e-9));
        // A 90deg line across a wide box runs the full width.
        let g = p("linear-gradient(90deg, #000, #fff)", 20.0, 10.0).unwrap();
        assert!(close(g.from, [0.0, 0.5]) && close(g.to, [1.0, 0.5]));
        // Corner keywords run corner to corner on a square.
        let g = p("linear-gradient(to bottom right, #000, #fff)", 10.0, 10.0).unwrap();
        assert!((g.from[0]).abs() < 1e-9 && (g.from[1]).abs() < 1e-9);
        assert!((g.to[0] - 1.0).abs() < 1e-9 && (g.to[1] - 1.0).abs() < 1e-9);
        // Not drawable: one stop, a bad color, positions that go back, no function.
        for bad in [
            "linear-gradient(#000)",
            "linear-gradient(#000, nope)",
            "linear-gradient(#000 80%, #fff 20%)",
            "radial-gradient(#000, #fff)",
            "#000",
        ] {
            assert!(p(bad, 10.0, 10.0).is_none(), "{bad}");
        }
    }

    #[test]
    fn an_angled_css_gradient_on_a_wide_box_runs_at_that_angle_in_pixels() {
        let g =
            parse_css_linear_gradient("linear-gradient(45deg, #000, #fff)", 20.0, 10.0).unwrap();
        // In pixels the line is 45deg, whatever the box's shape: equal and opposite components.
        let (dx, dy) = ((g.to[0] - g.from[0]) * 20.0, (g.to[1] - g.from[1]) * 10.0);
        assert!((dx + dy).abs() < 1e-3 && (dx - 15.0).abs() < 1e-3, "{g:?}");
        // The line is as long as the box is along that direction: (20 + 10) * sin(45deg).
        assert!((dx.hypot(dy) - 30.0 * 45f64.to_radians().sin()).abs() < 1e-3);
        // The SVG draws it in user space, so the bands are not skewed with the box.
        let mut scene = solve_width(&gradient_recipe(literal_stops()), None);
        scene.nodes[0].gradient = Some(g);
        scene.nodes[0].w = 20.0;
        scene.nodes[0].h = 10.0;
        let svg = scene_to_svg(&scene);
        assert!(svg.contains("gradientUnits=\"userSpaceOnUse\""), "{svg}");
    }

    #[test]
    fn a_dimension_source_reads_a_numeric_option() {
        let (g, _) = load();
        let recipe = serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "props": {
                "width": { "dimension": "extent" }, "height": { "dimension": "extent" }
            } } }
        });
        let at = |v: Value| {
            let mut r = req(&[]);
            r.options.insert("extent".into(), v);
            let s = build_scene(&g, &recipe, &r).unwrap();
            (s.nodes[0].w, s.nodes[0].h, s.diagnostics)
        };
        assert_eq!(at(32.into()), (32.0, 32.0, vec![]));
        let (w, _, diags) = at("big".into());
        assert_eq!(w, 0.0);
        assert!(
            diags.iter().any(|d| d.contains("positive number")),
            "{diags:?}"
        );
    }

    #[test]
    fn pattern_ids_differ_for_fractional_sizes_and_origins() {
        let base = solve_width(&pattern_recipe("#000000".into(), 4.into()), None);
        let id = |size: f64, x: f64| {
            let mut scene = base.clone();
            let n = &mut scene.nodes[0];
            n.x = x;
            n.y = 8.0;
            n.pattern.as_mut().unwrap().size = size;
            let svg = scene_to_svg(&scene);
            svg.split("<pattern id=\"")
                .nth(1)
                .unwrap()
                .split('"')
                .next()
                .unwrap()
                .to_string()
        };
        assert_ne!(id(8.5, 8.0), id(8.0, 5.8));
        assert_ne!(id(8.0, 15.0), id(8.01, 5.0));
        assert_eq!(id(8.5, 8.0), id(8.5, 8.0));
    }

    #[test]
    fn a_pattern_needs_both_props() {
        for (alt, size) in [("#000000".into(), Value::Null), (Value::Null, 4.into())] {
            let scene = solve_width(&pattern_recipe(alt, size), None);
            assert!(scene.nodes.iter().all(|n| n.pattern.is_none()));
            assert!(scene
                .diagnostics
                .iter()
                .any(|d| d.contains("patternFill and patternSize")));
        }
        let scene = solve_width(&pattern_recipe(Value::Null, Value::Null), None);
        assert!(scene.diagnostics.is_empty());
    }

    #[test]
    fn scoped_values_add_only_the_values_a_relationship_references() {
        let rel = |i: usize, raw: Value| crate::graph::RelationshipRecord {
            file: PathBuf::from("r.json"),
            index: i,
            uuid: raw.get("uuid").and_then(Value::as_str).map(String::from),
            raw,
        };
        let value = |comp: &str, uuid: &str| {
            serde_json::json!({ "scope": { "component": comp, "property": "width" },
                "value": "1px", "uuid": uuid })
        };
        let g = TokenGraph::default().with_relationships(vec![
            rel(0, value("a", "own")),
            rel(1, value("b", "shared")),
            rel(2, value("b", "unreferenced")),
            rel(
                3,
                serde_json::json!({ "scope": { "component": "a", "property": "width" },
                    "context": "Width", "$ref": "shared", "uuid": "link" }),
            ),
        ]);
        let ids = |c: &str| {
            let mut v: Vec<_> = scoped_values(&g, c)
                .into_iter()
                .filter_map(|t| t.uuid)
                .collect();
            v.sort();
            v
        };
        assert_eq!(ids("a"), ["own", "shared"]);
        assert_eq!(ids("b"), ["shared", "unreferenced"]);
        assert!(ids("c").is_empty());
    }

    #[test]
    fn the_root_width_follows_width_min_width_and_the_request() {
        let none = Value::Null;
        let w = |root: Value, req: Option<f64>| {
            let s = solve_width(&width_recipe(root, none.clone(), none.clone()), req);
            (s.nodes[0].w, s.diagnostics)
        };
        // Hug: padding + children + gaps.
        assert_eq!(w(serde_json::json!({}), None), (98.0, vec![]));
        // minWidth wider than the content wins; narrower than the content does nothing.
        assert_eq!(w(serde_json::json!({ "minWidth": 120 }), None).0, 120.0);
        assert_eq!(w(serde_json::json!({ "minWidth": 50 }), None).0, 98.0);
        // A wider width is the outer width, padding inside it.
        assert_eq!(
            w(serde_json::json!({ "width": 150 }), None),
            (150.0, vec![])
        );
        // A narrower width does not clip: it reports the overflow.
        let (narrow, d) = w(serde_json::json!({ "width": 60 }), None);
        assert_eq!(narrow, 60.0);
        assert_eq!(d.len(), 1, "{d:?}");
        assert!(d[0].contains("overflows"), "{d:?}");
        // minWidth lifts a too-narrow width back over the content: no overflow.
        assert_eq!(
            w(serde_json::json!({ "width": 60, "minWidth": 100 }), None),
            (100.0, vec![])
        );
        // The request width overrides the recipe width but not minWidth.
        assert_eq!(w(serde_json::json!({ "width": 150 }), Some(200.0)).0, 200.0);
        assert_eq!(w(serde_json::json!({}), Some(200.0)).0, 200.0);
        assert_eq!(
            w(
                serde_json::json!({ "width": 150, "minWidth": 110 }),
                Some(80.0)
            )
            .0,
            110.0
        );
        // A request width that is not a positive number is ignored.
        assert_eq!(w(serde_json::json!({ "width": 150 }), Some(0.0)).0, 150.0);
    }

    #[test]
    fn a_min_width_relative_to_height_needs_a_root_height() {
        let recipe = |height: Option<u32>| {
            let mut r = width_recipe(serde_json::json!({}), Value::Null, Value::Null);
            let p = &mut r["parts"]["r"]["props"];
            p["minWidth"] = serde_json::json!({ "value": 5, "relativeTo": "height" });
            match height {
                Some(h) => p["height"] = lit(h.into()),
                None => {
                    p.as_object_mut().unwrap().remove("height");
                }
            }
            r
        };
        // With a height: 5 x 30 = 150, wider than the 98 content.
        let s = solve_width(&recipe(Some(30)), None);
        assert_eq!((s.nodes[0].w, s.diagnostics.len()), (150.0, 0));
        // Without one: ignored, the root hugs, and the scene says why.
        let s = solve_width(&recipe(None), None);
        assert_eq!(s.nodes[0].w, 98.0);
        assert_eq!(s.diagnostics.len(), 1, "{:?}", s.diagnostics);
        assert!(s.diagnostics[0].contains("minWidth is relative to the height"));
    }

    #[test]
    fn a_fraction_sizes_a_nested_box_and_fills_a_text_part_as_a_percentage() {
        let frac = serde_json::json!({ "value": "value", "min": "minValue", "max": "maxValue" });
        let recipe = serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["t", "track"], "props": {
                    "direction": lit("column".into()), "width": lit(100.into()) } },
                "t": { "kind": "text", "text": { "option": "valueLabel", "fraction": frac } },
                "track": { "kind": "box", "children": ["fill"], "props": {
                    "height": lit(10.into()) } },
                "fill": { "kind": "box", "props": {
                    "width": { "fraction": frac }, "justify": lit("end".into()) } }
            }
        });
        let (read, _) = recipe_options(&recipe);
        for name in ["value", "minValue", "maxValue", "valueLabel"] {
            assert!(read.iter().any(|r| r == name), "{name} is read: {read:?}");
        }
        let at = |opts: &[(&str, Value)]| {
            let (g, _) = load();
            let mut r = req(&[]);
            r.options = opts
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect();
            let s = build_scene(&g, &recipe, &r).unwrap();
            (
                part(&s, "fill").unwrap().w,
                part(&s, "t").unwrap().text.clone().unwrap(),
            )
        };
        let n = |v: f64| serde_json::json!(v);
        // min 0, max 1 by default.
        assert_eq!(at(&[("value", n(0.25))]), (25.0, "25%".into()));
        // A range, and a value past it, clamped.
        let range = [("minValue", n(10.0)), ("maxValue", n(20.0))];
        assert_eq!(
            at(&[range[0].clone(), range[1].clone(), ("value", n(15.0))]).0,
            50.0
        );
        assert_eq!(
            at(&[range[0].clone(), range[1].clone(), ("value", n(99.0))]),
            (100.0, "100%".into())
        );
        // No value: empty, and a set valueLabel replaces the percentage.
        assert_eq!(at(&[]), (0.0, "0%".into()));
        assert_eq!(
            at(&[("value", n(0.5)), ("valueLabel", "Half".into())]),
            (50.0, "Half".into())
        );
    }

    #[test]
    fn a_progress_sweep_draws_an_arc_of_a_fraction_and_unset_keeps_the_spinner_frame() {
        let frac = serde_json::json!({ "value": "value" });
        let recipe = serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "children": ["p"] }, "p": { "kind": "progress", "props": {
                "width": lit(32.into()), "height": lit(32.into()),
                "strokeWidth": lit(3.into()),
                "color": lit("#0000ff".into()), "trackColor": lit("#cccccc".into()),
                "sweep": [{ "when": { "options": { "isIndeterminate": false } }, "fraction": frac }]
            } } }
        });
        let (read, _) = recipe_options(&recipe);
        assert!(read.iter().any(|r| r == "value"), "{read:?}");
        let svg = |opts: &[(&str, Value)]| {
            let (g, _) = load();
            let mut r = req(&[]);
            r.options = opts
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect();
            let s = build_scene(&g, &recipe, &r).unwrap();
            (part(&s, "p").unwrap().sweep, scene_to_svg(&s))
        };
        let n = |v: f64| serde_json::json!(v);
        // Radius is (32 - 3) / 2 = 14.5: the ring sits inside the box.
        let (sweep, s) = svg(&[("value", n(0.5))]);
        assert_eq!(sweep, Some(0.5));
        assert!(
            s.contains("r=\"14.5\"") && s.contains("stroke-width=\"3\""),
            "{s}"
        );
        // Half: from the top to the bottom, clockwise, small-arc flag 0.
        assert!(s.contains("M24 9.5A14.5 14.5 0 0 1 24 38.5"), "{s}");
        // Three quarters takes the large arc.
        assert!(svg(&[("value", n(0.75))]).1.contains("0 1 1 9.5 24"));
        // Nothing at 0, a full ring at 1, and past the range is clamped.
        assert!(!svg(&[]).1.contains("<path"));
        assert_eq!(svg(&[("value", n(2.0))]).0, Some(1.0));
        assert!(!svg(&[("value", n(1.0))]).1.contains("<path"));
        // Indeterminate matches no entry: the fixed quarter-arc frame.
        let (sweep, s) = svg(&[("isIndeterminate", true.into()), ("value", n(0.9))]);
        assert_eq!(sweep, None);
        assert!(s.contains("M24 9.5A14.5 14.5 0 0 1 38.5 24"), "{s}");
    }

    #[test]
    fn growing_parts_split_the_space_left_after_fixed_parts_gaps_and_padding() {
        let at = |s: &Scene, id: &str| {
            let n = part(s, id).unwrap();
            (n.x - 8.0, n.w)
        };
        // Free: 200 - 20 padding - (20 + 40 + 10) - 8 gaps = 102, split 51 / 51.
        let s = solve_width(
            &width_recipe(
                serde_json::json!({ "width": 200 }),
                true.into(),
                true.into(),
            ),
            None,
        );
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        assert_eq!(at(&s, "a"), (10.0, 71.0));
        assert_eq!(at(&s, "b"), (85.0, 40.0));
        assert_eq!(at(&s, "c"), (129.0, 61.0));
        // A number is a share: 2 : 1 of 102.
        let s = solve_width(
            &width_recipe(serde_json::json!({}), 2.into(), 1.into()),
            Some(200.0),
        );
        assert_eq!(at(&s, "a").1, 88.0);
        assert_eq!(at(&s, "c").1, 44.0);
        // A hugging root has no free space: nothing grows.
        let s = solve_width(
            &width_recipe(serde_json::json!({}), true.into(), true.into()),
            None,
        );
        assert_eq!(
            (at(&s, "a").1, at(&s, "c").1, s.nodes[0].w),
            (20.0, 10.0, 98.0)
        );
        // A row that is too narrow never shrinks a part.
        let s = solve_width(
            &width_recipe(serde_json::json!({ "width": 60 }), true.into(), true.into()),
            None,
        );
        assert_eq!((at(&s, "a").1, at(&s, "c").1), (20.0, 10.0));
        assert_eq!(s.diagnostics.len(), 1);
    }

    #[test]
    fn a_row_centres_its_content_in_a_min_width_wider_than_the_content() {
        let (g, _) = load();
        let recipe = serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["i"], "props": {
                    "minWidth": lit(100.into()), "height": lit(20.into()),
                    "paddingInlineStart": lit(10.into()), "paddingInlineEnd": lit(10.into()) } },
                "i": { "kind": "box", "props": { "width": lit(16.into()), "height": lit(16.into()) } }
            }
        });
        let s = build_scene(&g, &recipe, &req(&[])).unwrap();
        let i = part(&s, "i").unwrap();
        assert_eq!(i.x, 8.0 + (100.0 - 16.0) / 2.0);
    }

    #[test]
    fn a_row_justifies_end_and_start_and_a_growing_child_takes_the_free_space() {
        let (g, _) = load();
        let scene = |justify: Option<&str>, grow: bool| {
            let mut root = serde_json::json!({
                "minWidth": lit(100.into()), "height": lit(20.into()),
                "paddingInlineStart": lit(10.into()), "paddingInlineEnd": lit(10.into()) });
            if let Some(j) = justify {
                root["justify"] = lit(j.into());
            }
            let mut i = serde_json::json!({ "width": lit(16.into()), "height": lit(16.into()) });
            if grow {
                i["grow"] = lit(true.into());
            }
            let recipe = serde_json::json!({
                "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
                "parts": {
                    "r": { "kind": "box", "children": ["i"], "props": root },
                    "i": { "kind": "box", "props": i }
                }
            });
            let s = build_scene(&g, &recipe, &req(&[])).unwrap();
            part(&s, "i").unwrap().clone()
        };
        assert_eq!(scene(Some("start"), false).x, 8.0 + 10.0);
        assert_eq!(scene(Some("end"), false).x, 8.0 + 100.0 - 10.0 - 16.0);
        let grown = scene(None, true);
        assert_eq!((grown.x, grown.w), (8.0 + 10.0, 80.0));
    }

    #[test]
    fn a_growing_text_keeps_its_width_and_the_next_part_moves_to_the_row_end() {
        let (g, _) = load();
        let recipe = |grow: bool| {
            let mut t = serde_json::json!({ "fontSize": lit(14.into()) });
            if grow {
                t["grow"] = lit(true.into());
            }
            serde_json::json!({
                "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
                "parts": {
                    "r": { "kind": "box", "children": ["t", "i"], "props": {
                        "width": lit(300.into()), "height": lit(20.into()), "justify": lit("start".into()),
                        "paddingInlineStart": lit(10.into()), "paddingInlineEnd": lit(10.into()) } },
                    "t": { "kind": "text", "props": t },
                    "i": { "kind": "box", "props": { "width": lit(16.into()), "height": lit(16.into()) } }
                }
            })
        };
        let s = |grow| build_scene(&g, &recipe(grow), &req(&[])).unwrap();
        let (fixed, grown) = (s(false), s(true));
        let (t, ti) = (part(&grown, "t").unwrap(), part(&grown, "i").unwrap());
        assert_eq!(t.x, part(&fixed, "t").unwrap().x);
        assert_eq!(t.w, part(&fixed, "t").unwrap().w);
        assert_eq!(ti.x + ti.w, 8.0 + 300.0 - 10.0);
    }

    // One unit per character, so a line of n characters is n px wide.
    fn unit(s: &str) -> f64 {
        s.chars().count() as f64
    }

    #[test]
    fn the_breaker_fills_lines_greedily_after_spaces_and_hyphens() {
        let b = |t: &str, w: f64| break_lines(t, w, &unit);
        assert_eq!(b("", 5.0), (vec!["".to_string()], None));
        assert_eq!(b("Word", 10.0).0, ["Word"]);
        assert_eq!(b("one two three", 7.0).0, ["one two", "three"]);
        assert_eq!(b("one two three", 3.0).0, ["one", "two", "three"]);
        // Trailing spaces never count toward a line.
        assert_eq!(b("one two  ", 7.0).0, ["one two"]);
        assert_eq!(b("a well-known fact", 9.0).0, ["a well-", "known", "fact"]);
        // A word wider than the width keeps its own line, overflows and is reported.
        let (lines, wide) = b("tiny enormous", 5.0);
        assert_eq!(
            (lines, wide),
            (
                vec!["tiny".into(), "enormous".into()],
                Some("enormous".into())
            )
        );
        // Characters outside the table measure through the measurer (the table's fallback).
        assert_eq!(b("日本 語", 2.0).0, ["日本", "語"]);
    }

    #[test]
    fn truncating_cuts_the_text_to_fit_with_an_ellipsis() {
        assert_eq!(truncate_line("abcdefgh", 6.0, &unit), "abc...");
        assert_eq!(truncate_line("abc defgh", 7.0, &unit), "abc...");
        assert_eq!(truncate_line("abcdefgh", 2.0, &unit), "...");
    }

    fn wrap_recipe(overflow: Option<&str>) -> Value {
        let lit = |v: Value| serde_json::json!({ "value": v });
        let mut label = serde_json::json!({ "fontSize": lit(10.into()),
            "lineHeight": lit("12px".into()) });
        if let Some(o) = overflow {
            label["overflow"] = lit(o.into());
        }
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": ["i", "t"], "props": {
                    "minHeight": lit(20.into()), "gap": lit(4.into()),
                    "paddingInlineStart": lit(6.into()), "paddingInlineEnd": lit(6.into()) } },
                "i": { "kind": "icon", "icon": { "set": "ui", "name": "chevron" },
                    "props": { "width": lit(8.into()) } },
                "t": { "kind": "text", "props": label }
            }
        })
    }

    fn wrap_scene(overflow: Option<&str>, width: Option<f64>, label: &str) -> Scene {
        let (g, _) = load();
        let mut r = req(&[]);
        r.width = width;
        r.label = label.into();
        build_scene(&g, &wrap_recipe(overflow), &r).unwrap()
    }

    #[test]
    fn a_text_part_wraps_only_with_overflow_and_a_width() {
        let label = "alpha beta gamma delta";
        let hug = wrap_scene(Some("wrap"), None, label);
        assert_eq!(hug.nodes.iter().filter(|n| n.kind == "text").count(), 1);
        // Without `overflow` a narrow width overflows (a diagnostic) and the text stays whole.
        let plain = wrap_scene(None, Some(60.0), label);
        assert_eq!(plain.nodes.iter().filter(|n| n.kind == "text").count(), 1);
        assert_eq!(plain.diagnostics.len(), 1);
        let one = hug.nodes.iter().find(|n| n.kind == "text").unwrap().w;
        let s = wrap_scene(Some("wrap"), Some(one * 0.6), label);
        let lines: Vec<&SceneNode> = s.nodes.iter().filter(|n| n.kind == "text").collect();
        assert!(lines.len() >= 2, "{lines:?}");
        assert!(lines.iter().all(|n| n.part == "t" && n.h == 12.0));
        for (i, n) in lines.iter().enumerate() {
            assert_eq!(n.x, lines[0].x);
            assert_eq!(n.y, lines[0].y + 12.0 * i as f64);
        }
        let joined: Vec<&str> = lines.iter().map(|n| n.text.as_deref().unwrap()).collect();
        assert_eq!(joined.join(" "), label);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        // The container grows by a line each; the single-line height is the minimum (20).
        assert_eq!(hug.nodes[0].h, 20.0);
        assert_eq!(s.nodes[0].h, 20.0 + 12.0 * (lines.len() - 1) as f64);
        assert_eq!(s.nodes[0].w, one * 0.6);
        // The padding above the first line stays (20 - 12) / 2, and the icon sits centred on
        // the first line, as for a single line.
        assert_eq!(lines[0].y, s.nodes[0].y + 4.0);
        let icon = s.nodes.iter().find(|n| n.kind == "icon").unwrap();
        let one_line_icon = hug.nodes.iter().find(|n| n.kind == "icon").unwrap();
        assert_eq!(icon.y - s.nodes[0].y, one_line_icon.y - hug.nodes[0].y);
    }

    #[test]
    fn a_word_wider_than_the_width_overflows_with_a_diagnostic() {
        let s = wrap_scene(Some("wrap"), Some(40.0), "extraordinarily long");
        assert_eq!(s.diagnostics.len(), 1, "{:?}", s.diagnostics);
        assert!(s.diagnostics[0].contains("extraordinarily"));
    }

    #[test]
    fn padding_that_leaves_no_width_reports_both_diagnostics() {
        let s = wrap_scene(Some("wrap"), Some(10.0), "alpha beta");
        assert_eq!(s.diagnostics.len(), 2, "{:?}", s.diagnostics);
        assert!(s.diagnostics[0].contains("alpha") && s.diagnostics[0].contains("0.0"));
    }

    #[test]
    fn truncate_keeps_one_line() {
        let s = wrap_scene(Some("truncate"), Some(60.0), "alpha beta gamma delta");
        let t: Vec<&SceneNode> = s.nodes.iter().filter(|n| n.kind == "text").collect();
        assert_eq!(t.len(), 1);
        assert!(t[0].text.as_deref().unwrap().ends_with("..."));
        assert_eq!(s.nodes[0].h, 20.0);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
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
        let text_w = text_width(&req(&[]), "Action", 10.0, None);
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
        assert!(height.token.token.starts_with("base-height"));
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
    fn structured_and_context_selectors_render_the_same() {
        let (g, _) = load();
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/switch.json")).unwrap(),
        )
        .unwrap();
        let lowered = with_context_selectors(&recipe, &g, "switch");
        let text = lowered.to_string();
        assert!(text.contains("\"context\":\"Spacing (control to label)\""));
        assert!(
            !text.contains("contextRole"),
            "every selector names a record"
        );
        let mut r = req(&[]);
        r.component = "switch".into();
        r.options.insert("isSelected".into(), Value::Bool(true));
        let a = build_scene(&g, &recipe, &r).unwrap();
        let b = build_scene(&g, &lowered, &r).unwrap();
        assert!(a.diagnostics.is_empty(), "{:?}", a.diagnostics);
        assert_eq!(
            serde_json::to_string(&a).unwrap(),
            serde_json::to_string(&b).unwrap()
        );
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
    fn badge_maps_weight_and_hides_label_when_icon_only() {
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

    /// A container with `props` whose repeated `item` is a padded box around a label.
    fn collection(props: Value, items: Value) -> Scene {
        collection_with(props, serde_json::json!({}), items)
    }

    fn collection_with(props: Value, item_props: Value, items: Value) -> Scene {
        let mut all = serde_json::json!({
            "paddingInlineStart": { "value": 5 }, "paddingInlineEnd": { "value": 5 }
        });
        all.as_object_mut()
            .unwrap()
            .extend(item_props.as_object().unwrap().clone());
        collection_part(
            props,
            serde_json::json!({ "props": all }),
            serde_json::json!({}),
            serde_json::json!({}),
            |_| {},
            items,
        )
    }

    /// `item` is merged into the item part, `label_props` into the label's props and
    /// `repeat` into the container's `repeat`.
    fn collection_part(
        props: Value,
        item: Value,
        label_props: Value,
        repeat: Value,
        tweak: impl FnOnce(&mut RenderRequest),
        items: Value,
    ) -> Scene {
        let (mut g, _) = load();
        let comp = g
            .components
            .iter_mut()
            .find(|c| c.name == "action-button")
            .unwrap();
        comp.raw["slots"] =
            serde_json::json!([{ "name": "default", "part": "item", "collection": "items" }]);
        let merge = |mut base: Value, extra: Value| {
            base.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            base
        };
        let recipe = serde_json::json!({
            "specVersion": "1.0.0-draft",
            "component": "action-button",
            "root": "container",
            "sizeScale": { "m": 100 },
            "parts": {
                "container": { "kind": "box", "children": ["item"], "props": props,
                    "repeat": merge(serde_json::json!({ "slot": "default", "label": "label" }), repeat) },
                "item": merge(serde_json::json!({ "kind": "box", "children": ["label"] }), item),
                "label": { "kind": "text", "props": merge(serde_json::json!({ "fontSize": { "value": 10 } }), label_props) }
            }
        });
        let mut r = req(&[]);
        r.options.insert("items".into(), items);
        tweak(&mut r);
        build_scene(&g, &recipe, &r).unwrap()
    }

    fn drawn_items(s: &Scene) -> Vec<&str> {
        s.nodes
            .iter()
            .map(|n| n.part.as_str())
            .filter(|p| p.starts_with("item") && !p.contains('.'))
            .collect()
    }

    fn accordion_items(items: Value) -> Scene {
        let (g, _) = load();
        let g = g.with_visuals(TokenGraph::load_spec_visuals(&root().join("visuals")).unwrap());
        let recipe: Value = serde_json::from_str(
            &std::fs::read_to_string(root().join("visuals/accordion.json")).unwrap(),
        )
        .unwrap();
        let mut r = req(&[]);
        r.component = "accordion".into();
        r.label = "Title".into();
        r.options.insert("items".into(), items);
        build_scene(&g, &recipe, &r).unwrap()
    }

    #[test]
    fn visible_when_on_the_repeated_part_is_checked_per_copy_and_skipped_copies_take_no_number() {
        let hide_last = |n: usize| {
            let entries: Vec<Value> = (0..n)
                .map(|i| serde_json::json!({ "label": format!("{i}") }))
                .collect();
            collection_part(
                serde_json::json!({ "direction": { "value": "column" } }),
                serde_json::json!({ "visibleWhen": { "position": ["first", "middle"] } }),
                serde_json::json!({}),
                serde_json::json!({}),
                |_| {},
                Value::Array(entries),
            )
        };
        assert_eq!(drawn_items(&hide_last(3)), ["item-1", "item-2"]);
        // A single copy is `only`, not `first`, so nothing is drawn; the container still is.
        let s = hide_last(1);
        assert!(drawn_items(&s).is_empty() && part(&s, "container").is_some());
        // An option condition on the item reads the copy's own options (`with`).
        let s = collection_part(
            serde_json::json!({ "direction": { "value": "column" } }),
            serde_json::json!({ "visibleWhen": { "options": { "shown": true } } }),
            serde_json::json!({}),
            serde_json::json!({ "with": { "shown": "show" } }),
            |_| {},
            serde_json::json!([{ "show": false }, { "show": true }, { "show": true }]),
        );
        assert_eq!(drawn_items(&s), ["item-1", "item-2"]);
    }

    #[test]
    fn position_on_a_part_inside_the_item() {
        let color = |n: usize, id: &str| {
            let entries: Vec<Value> = (0..n)
                .map(|_| serde_json::json!({ "label": "x" }))
                .collect();
            let s = collection_part(
                serde_json::json!({ "direction": { "value": "column" } }),
                serde_json::json!({}),
                serde_json::json!({ "color": [
                    { "value": "base" },
                    { "when": { "position": "last" }, "value": "last" }
                ] }),
                serde_json::json!({}),
                |_| {},
                Value::Array(entries),
            );
            part(&s, id).unwrap().color.clone().unwrap()
        };
        assert_eq!(color(3, "item-1.label"), "base");
        assert_eq!(color(3, "item-3.label"), "last");
        assert_eq!(color(1, "label"), "base");
    }

    #[test]
    fn a_matched_position_counts_as_one_condition_against_options_and_states() {
        let fill = |states: &[&str], flag: bool| {
            let s = collection_part(
                serde_json::json!({ "direction": { "value": "column" } }),
                serde_json::json!({ "props": { "fill": [
                    { "value": "base" },
                    { "when": { "options": { "flag": true } }, "value": "opt" },
                    { "when": { "states": ["hover"] }, "value": "state" },
                    { "when": { "position": "first" }, "value": "pos" },
                    { "when": { "position": "first", "options": { "flag": true } }, "value": "pos+opt" },
                    { "when": { "position": "first", "options": { "flag": true }, "states": ["hover"] }, "value": "all" }
                ] } }),
                serde_json::json!({}),
                serde_json::json!({}),
                |r| {
                    r.states = states.iter().map(|s| s.to_string()).collect();
                    r.options.insert("flag".into(), Value::Bool(flag));
                },
                serde_json::json!([{}, {}]),
            );
            (
                part(&s, "item-1").unwrap().fill.clone().unwrap(),
                part(&s, "item-2").unwrap().fill.clone().unwrap(),
            )
        };
        assert_eq!(fill(&[], false), ("pos".into(), "base".into()));
        assert_eq!(fill(&[], true), ("pos+opt".into(), "opt".into()));
        assert_eq!(fill(&["hover"], true).0, "all");
        assert_eq!(fill(&["hover"], false).1, "state");
    }

    #[test]
    fn a_position_condition_outside_a_repeated_copy_never_matches() {
        let (g, _) = load();
        let recipe = serde_json::json!({
            "specVersion": "1.0.0-draft", "component": "action-button", "root": "box",
            "sizeScale": { "m": 100 },
            "parts": { "box": { "kind": "box", "props": {
                "width": { "value": 10 }, "height": { "value": 10 },
                "fill": [
                    { "value": "base" },
                    { "when": { "position": ["first", "middle", "last", "only"] }, "value": "pos" }
                ]
            } } }
        });
        let s = build_scene(&g, &recipe, &req(&[])).unwrap();
        assert_eq!(s.nodes[0].fill.as_deref(), Some("base"));
    }

    #[test]
    fn copies_keep_the_nested_divider_the_stroke_over_border_measurements_and_opacity() {
        let s = accordion_items(serde_json::json!([
            { "label": "A", "isExpanded": true },
            { "label": "B" },
            { "label": "C" }
        ]));
        for n in 1..=3 {
            let item = part(&s, &format!("accordion-item-{n}")).unwrap();
            let divider = part(&s, &format!("accordion-item-{n}.divider")).unwrap();
            assert_eq!(divider.w, item.w, "copy {n}'s divider fills the item");
        }
        assert!(s
            .measurements
            .iter()
            .any(|m| m.part.starts_with("accordion-item-1")));
        assert!(!s
            .measurements
            .iter()
            .any(|m| m.part.starts_with("accordion-item-2")));

        let s = collection_part(
            serde_json::json!({ "direction": { "value": "column" }, "opacity": { "value": 0.8 } }),
            serde_json::json!({ "props": {
                "stroke": { "value": "red" }, "strokeWidth": { "value": 1 },
                "strokeOver": { "value": true }, "opacity": { "value": 0.4 }
            } }),
            serde_json::json!({}),
            serde_json::json!({}),
            |_| {},
            three(),
        );
        assert!((1..=3).all(|n| part(&s, &format!("item-{n}.border")).is_some()));
        assert_eq!(s.opacity, Some(0.8));
        let s = collection_part(
            serde_json::json!({ "direction": { "value": "column" } }),
            serde_json::json!({ "props": { "opacity": { "value": 0.4 } } }),
            serde_json::json!({}),
            serde_json::json!({}),
            |_| {},
            three(),
        );
        assert_eq!(s.opacity, Some(0.4));
    }

    #[test]
    fn an_entry_with_unknown_fields_draws_with_its_known_ones() {
        let s = collection(
            serde_json::json!({}),
            serde_json::json!([{ "label": "A", "bogus": 1, "nested": { "x": 1 } }, { "other": true }]),
        );
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        assert_eq!(part(&s, "item-1.label").unwrap().text.as_deref(), Some("A"));
        assert_eq!(
            part(&s, "item-2.label").unwrap().text.as_deref(),
            Some("Action")
        );
    }

    #[test]
    fn repeat_skips_entries_that_are_not_objects_and_labels_each_copy() {
        let s = collection(
            serde_json::json!({}),
            serde_json::json!(["A", { "label": "B" }]),
        );
        assert!(part(&s, "item").is_some() && part(&s, "item-1").is_none());
        assert_eq!(part(&s, "label").unwrap().text.as_deref(), Some("B"));
        assert!(s.diagnostics.iter().any(|d| d.contains("skipped")));
        let s = collection(serde_json::json!({}), serde_json::json!(["A", "B"]));
        assert!(part(&s, "item").is_some());
        let s = collection(serde_json::json!({}), three());
        assert_eq!(
            part(&s, "item-2.label").unwrap().text.as_deref(),
            Some("A much longer label")
        );
    }

    #[test]
    fn repeat_naming_a_slot_without_a_collection_fails_to_compile() {
        let (g, _) = load();
        let recipe = serde_json::json!({
            "specVersion": "1.0.0-draft", "component": "action-button", "root": "container",
            "sizeScale": { "m": 100 },
            "parts": {
                "container": { "kind": "box", "children": ["item"], "repeat": { "slot": "ghost" } },
                "item": { "kind": "box" }
            }
        });
        assert!(build_scene(&g, &recipe, &req(&[]))
            .unwrap_err()
            .contains("collection slot"));
    }

    #[test]
    fn position_conditions_pick_first_middle_last_and_only() {
        let fills = |n: usize| -> Vec<String> {
            let entries: Vec<Value> = (0..n)
                .map(|i| serde_json::json!({ "label": format!("{i}") }))
                .collect();
            let s = collection_with(
                serde_json::json!({ "direction": { "value": "column" } }),
                serde_json::json!({ "fill": [
                    { "value": "gray" },
                    { "when": { "position": ["first", "middle"] }, "value": "notlast" },
                    { "when": { "position": "first" }, "value": "first" },
                    { "when": { "position": ["only"] }, "value": "only" },
                    { "when": { "position": ["last"] }, "value": "last" }
                ] }),
                Value::Array(entries),
            );
            s.nodes
                .iter()
                .filter(|n| {
                    n.part == "item" || (n.part.starts_with("item-") && !n.part.contains('.'))
                })
                .map(|n| n.fill.clone().unwrap_or_default())
                .collect()
        };
        assert_eq!(fills(0), ["only"]);
        assert_eq!(fills(1), ["only"]);
        assert_eq!(fills(2), ["first", "last"]);
        assert_eq!(fills(3), ["first", "notlast", "last"]);
    }

    fn three() -> Value {
        serde_json::json!([{ "label": "A" }, { "label": "A much longer label" }, { "label": "B" }])
    }

    #[test]
    fn a_fixed_width_column_container_makes_its_copies_fill_its_inner_width() {
        let s = collection(
            serde_json::json!({
                "direction": { "value": "column" }, "width": { "value": 200 },
                "paddingInlineStart": { "value": 10 }, "paddingInlineEnd": { "value": 10 },
                "gap": { "value": 4 }
            }),
            three(),
        );
        let item = |n: usize| part(&s, &format!("item-{n}")).unwrap();
        assert_eq!(part(&s, "container").unwrap().w, 200.0);
        assert!((1..=3).all(|n| item(n).w == 180.0 && item(n).x == RING_MARGIN + 10.0));
        assert_eq!(item(2).y, item(1).y + item(1).h + 4.0);
        assert!(part(&s, "item-2.label").is_some());
    }

    #[test]
    fn a_hugging_column_container_makes_its_copies_as_wide_as_the_widest() {
        let s = collection(
            serde_json::json!({ "direction": { "value": "column" } }),
            three(),
        );
        let item = |n: usize| part(&s, &format!("item-{n}")).unwrap();
        let label = part(&s, "item-2.label").unwrap();
        assert_eq!(item(2).w, label.w + 10.0);
        assert!(item(1).w == item(2).w && item(3).w == item(2).w);
        assert_eq!(part(&s, "container").unwrap().w, item(2).w);
    }

    #[test]
    fn a_row_container_sums_its_copies_and_a_single_copy_keeps_plain_ids() {
        let s = collection(
            serde_json::json!({ "direction": { "value": "row" }, "gap": { "value": 3 } }),
            three(),
        );
        let item = |n: usize| part(&s, &format!("item-{n}")).unwrap();
        assert_eq!(item(2).x, item(1).x + item(1).w + 3.0);
        assert_eq!(
            part(&s, "container").unwrap().w,
            item(1).w + item(2).w + item(3).w + 6.0
        );
        for items in [
            serde_json::json!([]),
            serde_json::json!([{ "label": "Only" }]),
        ] {
            let s = collection(serde_json::json!({}), items);
            assert!(part(&s, "item").is_some() && part(&s, "label").is_some());
            assert!(part(&s, "item-1").is_none());
        }
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
        for kind in ["box", "text", "icon", "ring", "progress", "component"] {
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
    fn odd_font_weights_measure_as_400() {
        let r = req(&[]);
        let regular = text_width(&r, "Test", 14.0, Some("400"));
        for w in ["inf", "nan", "+700", "0x2bc", "1e3", ""] {
            assert_eq!(text_width(&r, "Test", 14.0, Some(w)), regular, "{w:?}");
        }
        assert!(text_width(&r, "Test", 14.0, Some("700")) > regular);
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
        assert!(
            unbound.contains("font-family=\"'Adobe Clean Spectrum VF', adobe-clean-spectrum-vf,")
        );
        let bound = svg(serde_json::json!({
            "fontSize": { "value": 10 },
            "fontFamily": { "value": "SF Pro" }
        }));
        assert!(
            bound.contains("font-family=\"'SF Pro', 'Adobe Clean Spectrum VF',"),
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
    fn no_block_padding_hugs_the_content() {
        let s = padded_box(serde_json::json!({}));
        assert_eq!(s.nodes[0].h, part(&s, "label").unwrap().h);
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
        let (used, structural) = recipe_options_in(&g, &recipe, "action-button");
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

    /// A `gadget` whose `color` relationships bind a plain token and a checked token.
    fn any_of_graph(plain_scope: Value, checked_scope: Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(crate::graph::ComponentRecord {
            name: "gadget".into(),
            file: PathBuf::from("components/gadget.json"),
            raw: serde_json::json!({"name": "gadget", "options": {
                "isSelected": {"type": "boolean", "default": false},
                "isIndeterminate": {"type": "boolean", "default": false}}}),
            layer: crate::graph::Layer::Foundation,
        });
        for (key, color) in [("plain", "#111111"), ("checked", "#0000ff")] {
            g.tokens.insert(
                key.into(),
                crate::graph::TokenRecord {
                    name: key.into(),
                    file: PathBuf::from("tokens.json"),
                    index: 0,
                    schema_url: None,
                    uuid: Some(key.into()),
                    alias_target: None,
                    raw: serde_json::json!({"value": color,
                        "name": {"property": "color", "variant": key}}),
                    layer: Default::default(),
                },
            );
        }
        let rel = |index: usize, rf: &str, options: Value| crate::graph::RelationshipRecord {
            file: PathBuf::from("relationships/gadget.json"),
            index,
            uuid: Some(format!("rel-{index}")),
            raw: serde_json::json!({"$ref": rf, "context": "Control",
                "scope": {"component": "gadget", "property": "color", "options": options}}),
        };
        g.relationships = vec![
            rel(0, "plain", plain_scope),
            rel(1, "checked", checked_scope),
        ];
        g
    }

    fn any_of_fill(g: &TokenGraph, options: &[(&str, bool)], states: &[&str]) -> String {
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {"box": {"kind": "box", "props": {
                "fill": {"relationship": {"property": "color", "context": "Control"}}}}}
        });
        let mut r = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            states: states.iter().map(|s| s.to_string()).collect(),
            ..Default::default()
        };
        for (k, v) in options {
            r.options.insert((*k).into(), Value::Bool(*v));
        }
        let scene = build_scene(g, &recipe, &r).unwrap();
        assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
        scene.nodes[0].fill.clone().unwrap()
    }

    #[test]
    fn an_option_any_of_applies_for_each_alternative() {
        let g = any_of_graph(
            serde_json::json!({}),
            serde_json::json!({"anyOf": [{"isSelected": true}, {"isIndeterminate": true}]}),
        );
        let fill = |o: &[(&str, bool)]| any_of_fill(&g, o, &[]);
        assert_eq!(fill(&[]), "#111111");
        assert_eq!(fill(&[("isSelected", true)]), "#0000ff");
        assert_eq!(fill(&[("isIndeterminate", true)]), "#0000ff");
        assert_eq!(
            fill(&[("isSelected", true), ("isIndeterminate", true)]),
            "#0000ff",
            "both alternatives match and share a token, so there is no tie"
        );

        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {"box": {"kind": "box", "props": {
                "fill": {"relationship": {"property": "color", "context": "Control"}}}}}
        });
        let c = compile_recipe(&g, &recipe, "gadget", &[HashMap::new()]).unwrap();
        let cands = c["variants"]["m||"]["box"]["props"]["fill"]["candidates"]
            .as_array()
            .unwrap();
        assert_eq!(
            cands.len(),
            3,
            "the any-of compiles to one candidate per alternative"
        );
        assert!(cands
            .iter()
            .all(|c| c.get("anyOf").is_none() && c["options"].get("anyOf").is_none()));
    }

    #[test]
    fn a_state_any_of_applies_for_each_member() {
        let g = any_of_graph(
            serde_json::json!({"state": ["default"]}),
            serde_json::json!({"state": [{"anyOf": ["hover", "down"]}]}),
        );
        let fill = |states: &[&str]| any_of_fill(&g, &[], states);
        assert_eq!(fill(&[]), "#111111");
        assert_eq!(fill(&["hover"]), "#0000ff");
        assert_eq!(fill(&["down"]), "#0000ff");
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

    #[test]
    fn options_icon_is_reported_as_ignored() {
        let g = icon_graph();
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {"box": {"kind": "box"}}
        });
        let mut req = RenderRequest {
            component: "gadget".into(),
            size: "m".into(),
            ..Default::default()
        };
        assert!(build_scene(&g, &recipe, &req)
            .unwrap()
            .diagnostics
            .is_empty());
        req.options.insert("icon".into(), serde_json::json!("edit"));
        let d = build_scene(&g, &recipe, &req).unwrap().diagnostics;
        assert!(
            d.iter().any(|m| m.contains("option 'icon' is not drawn")),
            "{d:?}"
        );
    }

    fn pick(set: &str, name: &str) -> Option<IconOverride> {
        Some(IconOverride::Icon {
            set: set.into(),
            name: name.into(),
        })
    }

    #[test]
    fn a_variant_rebuilt_without_the_graph_solves_like_build_scene() {
        let g = icon_graph();
        let icon =
            serde_json::json!({"set": "ui", "name": "mark", "content": true, "optional": true});
        let recipe = serde_json::json!({
            "component": "gadget", "root": "box", "sizeScale": {"m": 100},
            "parts": {
                "box": {"kind": "box", "children": ["mark"]},
                "mark": {"kind": "icon", "icon": icon,
                    "props": {"width": {"value": 10}, "height": {"value": 10}}}
            }
        });
        let modes = [HashMap::new()];
        let compiled = compile_recipe(&g, &recipe, "gadget", &modes).unwrap();
        let whole = CompiledVariant::from_compiled(&compiled, "m||").unwrap();
        let single = CompiledVariant::from_value(&whole.to_value()).unwrap();
        let requests = [
            None,
            pick("workflow", "add"),
            pick("ui", "nope"),
            Some(IconOverride::None),
        ];
        for icon in requests {
            let req = RenderRequest {
                component: "gadget".into(),
                size: "m".into(),
                icon,
                ..Default::default()
            };
            let want = serde_json::to_value(build_scene(&g, &recipe, &req).unwrap()).unwrap();
            for v in [&whole, &single] {
                let got = serde_json::to_value(solve(v, &req).unwrap()).unwrap();
                assert_eq!(got, want, "{:?}", req.icon);
            }
        }
        assert!(CompiledVariant::from_compiled(&compiled, "xl||").is_err());
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
        assert!(scene
            .diagnostics
            .iter()
            .all(|d| !d.contains("not optional")));
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
                    "box": {"kind": "box", "children": ["mark", "label"]},
                    "label": {"kind": "text"},
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
            options: HashMap::from([("shown".into(), true.into())]),
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
        let labelled = RenderRequest {
            label: "Go".into(),
            ..req
        };
        assert!(build_scene(&g, &recipe(true), &labelled)
            .unwrap()
            .diagnostics
            .is_empty());
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

    /// The graph with an anatomy part per `component` part of `recipe` on `host`, as the data
    /// carries it (a test recipe keeps `component` inline for readability; the engine ignores it).
    fn link_nested(mut g: TokenGraph, host: &str, recipe: &Value) -> TokenGraph {
        let linked: Vec<(String, String)> = recipe["parts"]
            .as_object()
            .into_iter()
            .flatten()
            .filter(|(_, p)| p["kind"] == "component")
            .filter_map(|(id, p)| Some((id.clone(), p["component"].as_str()?.to_string())))
            .collect();
        if let Some(c) = g.components.iter_mut().find(|c| c.name == host) {
            let anatomy = c.raw["anatomy"].as_array_mut().unwrap();
            for (id, component) in linked {
                anatomy.retain(|p| p["name"] != id.as_str());
                anatomy.push(serde_json::json!({ "name": id, "component": component }));
            }
        }
        g
    }

    fn nest_graph(replace: &[(&str, Value)]) -> TokenGraph {
        let (g, _) = load();
        let mut visuals = TokenGraph::load_spec_visuals(&root().join("visuals")).expect("visuals");
        let mut g = g;
        for (name, raw) in replace {
            let v = visuals.iter_mut().find(|v| v.component == *name).unwrap();
            v.raw = raw.clone();
            g = link_nested(g, name, raw);
        }
        g.with_visuals(visuals)
    }

    fn comp(component: &str, with: Value) -> Value {
        let map: serde_json::Map<String, Value> = ["s", "m", "l", "xl"]
            .iter()
            .map(|k| (k.to_string(), Value::String(k.to_string())))
            .collect();
        serde_json::json!({ "kind": "component", "component": component,
            "sizeMap": map, "with": with })
    }

    fn lit_props(pairs: &[(&str, f64)]) -> Value {
        Value::Object(
            pairs
                .iter()
                .map(|(k, v)| (k.to_string(), serde_json::json!({ "value": v })))
                .collect(),
        )
    }

    fn host(parts: Value) -> Value {
        serde_json::json!({ "component": "accordion", "root": "r",
            "sizeScale": { "s": 100, "m": 200, "l": 300, "xl": 400 }, "parts": parts })
    }

    fn nest_scene(
        g: &TokenGraph,
        recipe: &Value,
        size: &str,
        states: &[&str],
        opts: &[(&str, Value)],
    ) -> Result<Scene, String> {
        let g = &link_nested(g.clone(), "accordion", recipe);
        let mut r = req(states);
        r.component = "accordion".into();
        r.size = size.into();
        r.options = opts
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect();
        build_scene(g, recipe, &r)
    }

    fn row_host() -> Value {
        host(serde_json::json!({
            "r": { "kind": "box", "children": ["a", "b"], "props": lit_props(&[
                ("paddingInlineStart", 6.0), ("paddingInlineEnd", 6.0), ("gap", 4.0)]) },
            "a": comp("action-button", serde_json::json!({ "hideLabel": true })),
            "b": comp("switch", serde_json::json!({ "hideLabel": true,
                "isSelected": { "option": "isSelected" } }))
        }))
    }

    #[test]
    fn a_nested_recipe_sizes_the_host_flow_and_names_its_parts() {
        let g = nest_graph(&[]);
        let s = nest_scene(&g, &row_host(), "m", &[], &[]).unwrap();
        let n = |id: &str| part(&s, id).unwrap_or_else(|| panic!("no node {id}"));
        // Icon-only action button at M is 32 square; the switch (no label) is 26 wide.
        let (a, b) = (n("a"), n("b"));
        assert_eq!((a.w, a.h, b.w), (32.0, 32.0, 26.0));
        assert_eq!((a.x, b.x), (8.0 + 6.0, 8.0 + 6.0 + 32.0 + 4.0));
        assert_eq!(s.nodes[0].w, 6.0 + 32.0 + 4.0 + 26.0 + 6.0);
        // The nested root keeps the host id; inner parts are namespaced and sit inside it.
        let icon = n("a.icon");
        assert!(icon.x >= a.x && icon.x + icon.w <= a.x + a.w);
        let track = n("b.track");
        assert!(track.x == b.x && track.y >= b.y);
        assert!(s
            .nodes
            .iter()
            .all(|n| n.part != "icon" && n.part != "track"));
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    }

    fn slot_host(slot: Value) -> Value {
        host(serde_json::json!({
            "r": { "kind": "box", "children": ["row"] },
            "row": { "kind": "box", "children": ["actions"], "props": lit_props(&[
                ("paddingInlineStart", 6.0), ("paddingInlineEnd", 6.0)]) },
            "actions": slot
        }))
        .tap_row()
    }

    trait TapRow {
        fn tap_row(self) -> Value;
    }
    impl TapRow for Value {
        fn tap_row(mut self) -> Value {
            self["parts"]["row"]["props"]["direction"] = serde_json::json!({ "value": "row" });
            self
        }
    }

    fn actions_slot(extra: Value) -> Value {
        let mut s = serde_json::json!({
            "kind": "slot",
            "sizeMap": { "s": "s", "m": "m", "l": "l", "xl": "xl" },
            "with": { "hideLabel": true },
            "props": lit_props(&[("gap", 4.0)])
        });
        for (k, v) in extra.as_object().unwrap() {
            s[k] = v.clone();
        }
        s
    }

    fn fills(list: &[(&str, Value)]) -> HashMap<String, Vec<SlotFill>> {
        HashMap::from([(
            "actions".to_string(),
            list.iter()
                .map(|(c, o)| SlotFill {
                    component: c.to_string(),
                    options: o
                        .as_object()
                        .cloned()
                        .unwrap_or_default()
                        .into_iter()
                        .collect(),
                })
                .collect(),
        )])
    }

    fn slot_scene(recipe: &Value, slots: HashMap<String, Vec<SlotFill>>) -> Scene {
        let g = nest_graph(&[]);
        let g = &link_nested(g, "accordion", recipe);
        let mut r = req(&[]);
        r.component = "accordion".into();
        r.slots = slots;
        build_scene(g, recipe, &r).unwrap()
    }

    #[test]
    fn a_request_slot_key_that_matches_no_slot_warns() {
        let r = slot_host(actions_slot(serde_json::json!({})));
        let warns = |key: &str| {
            let f = fills(&[("action-button", Value::Null)])
                .remove("actions")
                .unwrap();
            slot_scene(&r, HashMap::from([(key.to_string(), f)])).diagnostics
        };
        assert!(warns("actions").iter().all(|d| !d.starts_with("slots:")));
        let unknown = warns("nope");
        assert!(unknown.iter().any(|d| d.contains(
            "slots: request key 'nope' is not a slot of 'accordion'; slots with a part: actions (part 'actions')"
        )), "{unknown:?}");
        // A slot named apart from its part: the part id is not a key.
        let v = CompiledVariant {
            root: "r".into(),
            option_defaults: HashMap::new(),
            parts: serde_json::json!({ "actions": { "kind": "slot", "slot": "default" } })
                .as_object()
                .unwrap()
                .clone(),
            drawings: Default::default(),
        };
        let mut q = req(&[]);
        q.component = "accordion".into();
        q.slots = fills(&[("action-button", Value::Null)]);
        let d = unmatched_slot_keys(&v, &q);
        assert_eq!(d.len(), 1, "{d:?}");
        assert!(
            d[0].contains("part id of slot 'default'") && d[0].contains("default (part 'actions')"),
            "{d:?}"
        );
    }

    #[test]
    fn a_slot_part_draws_each_fill_in_a_row_as_a_nested_component() {
        let r = slot_host(actions_slot(serde_json::json!({})));
        let s = slot_scene(
            &r,
            fills(&[("action-button", Value::Null), ("switch", Value::Null)]),
        );
        let n = |id: &str| {
            part(&s, id).unwrap_or_else(|| {
                panic!(
                    "no node {id}: {:?}",
                    s.nodes.iter().map(|n| &n.part).collect::<Vec<_>>()
                )
            })
        };
        let (a, b, slot) = (n("actions-1"), n("actions-2"), n("actions"));
        assert_eq!((a.w, a.h, b.w), (32.0, 32.0, 26.0));
        assert_eq!(b.x, a.x + a.w + 4.0, "the part's own gap separates fills");
        assert_eq!((slot.w, slot.h), (32.0 + 4.0 + 26.0, 32.0));
        assert!(n("actions-1.icon").x >= a.x && part(&s, "actions-2.track").is_some());
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    }

    #[test]
    fn a_column_slot_stacks_fills_with_gap_and_cross_axis_align() {
        let col = |align: &str| {
            let mut s = actions_slot(serde_json::json!({}));
            s["props"]["direction"] = serde_json::json!({ "value": "column" });
            s["props"]["align"] = serde_json::json!({ "value": align });
            let sc = slot_scene(
                &slot_host(s),
                fills(&[("action-button", Value::Null), ("switch", Value::Null)]),
            );
            assert!(sc.diagnostics.is_empty(), "{:?}", sc.diagnostics);
            sc
        };
        let sc = col("end");
        let (slot, a, b) = (
            part(&sc, "actions").unwrap(),
            part(&sc, "actions-1").unwrap(),
            part(&sc, "actions-2").unwrap(),
        );
        assert_eq!((slot.w, slot.h), (32.0, 32.0 + 4.0 + b.h));
        assert_eq!(b.y, a.y + a.h + 4.0, "stacked with the gap");
        assert_eq!(b.x, slot.x + slot.w - b.w, "align end on the cross axis");
        assert_eq!(a.x, slot.x);
        let start = col("start");
        assert_eq!(
            part(&start, "actions-2").unwrap().x,
            part(&start, "actions").unwrap().x
        );
    }

    #[test]
    fn a_root_slot_sizes_itself_and_the_root() {
        let run = |slot: Value, f: HashMap<String, Vec<SlotFill>>| {
            let mut root = serde_json::json!({ "kind": "box", "children": ["sib", "actions"],
                "props": lit_props(&[("gap", 10.0), ("paddingBlockStart", 8.0),
                    ("paddingBlockEnd", 8.0)]) });
            root["props"]["direction"] = serde_json::json!({ "value": "column" });
            let r = host(serde_json::json!({ "r": root, "actions": slot,
                "sib": { "kind": "box", "props": lit_props(&[("width", 50.0), ("height", 20.0)]) } }));
            slot_scene(&r, f)
        };
        let mut s = actions_slot(serde_json::json!({}));
        s["props"]["direction"] = serde_json::json!({ "value": "column" });
        let sc = run(
            s,
            fills(&[("action-button", Value::Null), ("switch", Value::Null)]),
        );
        let (root, slot) = (part(&sc, "r").unwrap(), part(&sc, "actions").unwrap());
        assert_eq!((slot.y - root.y, slot.w, slot.h), (38.0, 32.0, 68.0));
        assert_eq!(root.h, 8.0 + 20.0 + 10.0 + 68.0 + 8.0);
        let mut e = actions_slot(serde_json::json!({
            "placeholder": { "width": 20, "height": 10, "reason": "x" }
        }));
        e["props"]["direction"] = serde_json::json!({ "value": "column" });
        let sc = run(e, HashMap::new());
        let (root, slot) = (part(&sc, "r").unwrap(), part(&sc, "actions").unwrap());
        assert_eq!((slot.y - root.y, slot.w, slot.h), (38.0, 20.0, 10.0));
        assert_eq!(root.h, 8.0 + 20.0 + 10.0 + 10.0 + 8.0);
    }

    #[test]
    fn a_slot_directly_under_the_root_flows_in_a_row_or_column_root() {
        let run = |root_dir: &str, slot_dir: &str| {
            let mut s = actions_slot(serde_json::json!({}));
            s["props"]["direction"] = serde_json::json!({ "value": slot_dir });
            let mut root = serde_json::json!({ "kind": "box", "children": ["actions"],
                "props": lit_props(&[("gap", 10.0)]) });
            root["props"]["direction"] = serde_json::json!({ "value": root_dir });
            let r = host(serde_json::json!({ "r": root, "actions": s }));
            slot_scene(
                &r,
                fills(&[("action-button", Value::Null), ("switch", Value::Null)]),
            )
        };
        let sc = run("column", "column");
        assert!(sc.diagnostics.is_empty(), "{:?}", sc.diagnostics);
        let (slot, a, b) = (
            part(&sc, "actions").unwrap(),
            part(&sc, "actions-1").unwrap(),
            part(&sc, "actions-2").unwrap(),
        );
        assert_eq!(slot.h, 32.0 + 4.0 + b.h);
        assert_eq!(b.y, a.y + a.h + 4.0);
        let sc = run("row", "row");
        let (a, b) = (
            part(&sc, "actions-1").unwrap(),
            part(&sc, "actions-2").unwrap(),
        );
        assert_eq!(b.x, a.x + a.w + 4.0);
    }

    #[test]
    fn a_column_slot_is_one_flex_child_among_sibling_parts() {
        let mut s = actions_slot(serde_json::json!({}));
        s["props"]["direction"] = serde_json::json!({ "value": "column" });
        let mut r = slot_host(s);
        r["parts"]["row"]["children"] = serde_json::json!(["sib", "actions"]);
        r["parts"]["row"]["props"]["gap"] = serde_json::json!({ "value": 10 });
        r["parts"]["sib"] = serde_json::json!({ "kind": "box", "props": lit_props(&[
            ("width", 12.0), ("height", 20.0)]) });
        let sc = slot_scene(
            &r,
            fills(&[("action-button", Value::Null), ("switch", Value::Null)]),
        );
        let (sib, slot) = (part(&sc, "sib").unwrap(), part(&sc, "actions").unwrap());
        assert_eq!((sib.w, sib.h), (12.0, 20.0));
        assert_eq!(slot.x, sib.x + 12.0 + 10.0, "the group is one row item");
        assert_eq!(slot.w, 32.0);
        let (a, b) = (
            part(&sc, "actions-1").unwrap(),
            part(&sc, "actions-2").unwrap(),
        );
        assert_eq!((a.x, b.y), (slot.x, a.y + a.h + 4.0));
    }

    #[test]
    fn fills_carry_their_label_in_a_column_slot() {
        let mut s = actions_slot(serde_json::json!({}));
        s["props"]["direction"] = serde_json::json!({ "value": "column" });
        s["with"] = serde_json::json!({});
        let sc = slot_scene(
            &slot_host(s),
            fills(&[
                ("switch", serde_json::json!({ "label": "One" })),
                ("switch", serde_json::json!({ "label": "Two" })),
            ]),
        );
        let texts: Vec<_> = sc.nodes.iter().filter_map(|n| n.text.as_deref()).collect();
        assert_eq!(texts, ["One", "Two"], "{:?}", sc.diagnostics);
        let (a, b) = (
            part(&sc, "actions-1").unwrap(),
            part(&sc, "actions-2").unwrap(),
        );
        assert!(b.y > a.y);
    }

    #[test]
    fn an_empty_column_slot_still_draws_its_placeholder() {
        let mut s = actions_slot(serde_json::json!({
            "placeholder": { "width": 20, "height": 10, "reason": "x" }
        }));
        s["props"]["direction"] = serde_json::json!({ "value": "column" });
        let sc = slot_scene(&slot_host(s), HashMap::new());
        let n = part(&sc, "actions").unwrap();
        assert_eq!((n.w, n.h), (20.0, 10.0));
    }

    #[test]
    fn an_empty_slot_draws_nothing_or_its_placeholder_literal() {
        let none = slot_scene(
            &slot_host(actions_slot(serde_json::json!({}))),
            HashMap::new(),
        );
        assert!(part(&none, "actions").is_none() && none.diagnostics.is_empty());
        let ph =
            serde_json::json!({ "placeholder": { "width": 172, "height": 44, "reason": "x" } });
        let s = slot_scene(&slot_host(actions_slot(ph)), HashMap::new());
        let n = part(&s, "actions").expect("placeholder");
        assert_eq!((n.w, n.h), (172.0, 44.0));
    }

    #[test]
    fn fills_past_max_or_outside_accepts_are_diagnostics_not_failures() {
        let r = slot_host(actions_slot(serde_json::json!({})));
        // accordion's actions slot: accepts action-button and switch, acceptsOnly, max 2.
        let s = slot_scene(
            &r,
            fills(&[
                ("switch", Value::Null),
                ("button", Value::Null),
                ("switch", Value::Null),
                ("action-button", Value::Null),
            ]),
        );
        let drawn: Vec<_> = s
            .nodes
            .iter()
            .filter(|n| n.part.starts_with("actions-") && !n.part.contains('.'))
            .map(|n| n.part.as_str())
            .collect();
        assert_eq!(drawn, ["actions-1", "actions-2"]);
        assert!(
            s.diagnostics
                .iter()
                .any(|d| d.contains("'button'") && d.contains("accepts only")),
            "{:?}",
            s.diagnostics
        );
        assert!(
            s.diagnostics
                .iter()
                .any(|d| d.contains("past the slot's max of 2")),
            "{:?}",
            s.diagnostics
        );
    }

    #[test]
    fn a_fills_options_win_over_the_parts_with_and_with_skips_undeclared_options() {
        let colors = |with: Value, opts: Value| {
            let r = slot_host(actions_slot(serde_json::json!({ "with": with })));
            let s = slot_scene(&r, fills(&[("switch", opts)]));
            assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
            format!(
                "{:?}",
                s.nodes
                    .iter()
                    .map(|n| (&n.color, &n.fill))
                    .collect::<Vec<_>>()
            )
        };
        let off = colors(serde_json::json!({ "isDisabled": false }), Value::Null);
        let with_on = colors(serde_json::json!({ "isDisabled": true }), Value::Null);
        let fill_on = colors(
            serde_json::json!({ "isDisabled": false }),
            serde_json::json!({ "isDisabled": true }),
        );
        assert_ne!(off, with_on);
        assert_eq!(with_on, fill_on, "the fill's own option wins");
        // `hasHoldIcon` is an option of action-button only: the switch ignores it.
        assert_eq!(
            off,
            colors(
                serde_json::json!({ "isDisabled": false, "hasHoldIcon": true }),
                Value::Null
            )
        );
    }

    #[test]
    fn a_with_label_sets_the_nested_text_from_a_literal_or_a_host_option() {
        let g = nest_graph(&[]);
        let text = |with: Value, opts: &[(&str, Value)]| {
            let r = host(serde_json::json!({
                "r": { "kind": "box", "children": ["b"] },
                "b": comp("action-button", with)
            }));
            let s = nest_scene(&g, &r, "m", &[], opts).unwrap();
            assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
            part(&s, "b.label").and_then(|n| n.text.clone())
        };
        assert_eq!(
            text(serde_json::json!({ "label": "One" }), &[]).as_deref(),
            Some("One")
        );
        let by_option = serde_json::json!({ "label": { "option": "title" } });
        assert_eq!(
            text(by_option, &[("title", Value::String("Two".into()))]).as_deref(),
            Some("Two")
        );
    }

    #[test]
    fn a_with_map_picks_the_nested_value_from_the_host_option() {
        let g = nest_graph(&[]);
        let map = serde_json::json!({ "true": "negative", "false": "neutral" });
        let r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["h"] },
            "h": comp("help-text", serde_json::json!({
                "text": "Hi", "variant": { "option": "isError", "map": map } }))
        }));
        let colors = |opts: &[(&str, Value)]| {
            let s = nest_scene(&g, &r, "m", &[], opts).unwrap();
            (
                s.nodes
                    .iter()
                    .map(|n| format!("{:?}", n.color))
                    .collect::<Vec<_>>(),
                s.diagnostics,
            )
        };
        let (err, d1) = colors(&[("isError", Value::Bool(true))]);
        let (ok, d2) = colors(&[("isError", Value::Bool(false))]);
        let (unset, d3) = colors(&[]);
        assert_ne!(err, ok, "the mapped variant must change the nested colors");
        assert_eq!(ok, unset);
        assert!(
            d1.is_empty() && d2.is_empty() && d3.is_empty(),
            "{d1:?}{d2:?}{d3:?}"
        );
        // A host value with no key keeps the nested default and says so.
        let mut partial = r.clone();
        partial["parts"]["h"]["with"]["variant"]["map"] = serde_json::json!({ "true": "negative" });
        let s = nest_scene(&g, &partial, "m", &[], &[("isError", Value::Bool(false))]).unwrap();
        assert!(s
            .diagnostics
            .iter()
            .any(|d| d.contains("has no entry in the `with` map")));
        assert_eq!(
            s.nodes
                .iter()
                .map(|n| format!("{:?}", n.color))
                .collect::<Vec<_>>(),
            ok
        );
    }

    #[test]
    fn a_nested_root_can_inherit_the_host_roots_inner_size_and_radius() {
        let g = nest_graph(&[]);
        let mut r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["a"], "props": lit_props(&[
                ("width", 100.0), ("height", 40.0), ("cornerRadius", 5.0),
                ("paddingInlineStart", 6.0), ("paddingInlineEnd", 6.0)]) },
            "a": comp("action-button", serde_json::json!({ "hideLabel": true }))
        }));
        let own = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert_eq!(part(&own, "a").unwrap().w, 32.0);
        r["parts"]["a"]["inherit"] = serde_json::json!(["width", "height", "cornerRadius"]);
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        let a = part(&s, "a").unwrap();
        assert_eq!((a.w, a.h), (88.0, 40.0));
        assert_eq!(a.radius, 5.0);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        // A host that does not fix a value reports it and the nested recipe keeps its own.
        let mut hug = r.clone();
        hug["parts"]["r"]["props"]
            .as_object_mut()
            .unwrap()
            .remove("height");
        let s = nest_scene(&g, &hug, "m", &[], &[]).unwrap();
        assert_eq!(part(&s, "a").unwrap().h, 32.0);
        assert!(s
            .diagnostics
            .iter()
            .any(|d| d.contains("cannot inherit height")));
    }

    #[test]
    fn an_inherited_width_fills_a_hugging_host_after_its_other_parts() {
        let g = nest_graph(&[]);
        let mut r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["a", "b"], "props": lit_props(&[
                ("paddingInlineStart", 6.0), ("paddingInlineEnd", 6.0),
                ("height", 50.0), ("cornerRadius", 5.0)]) },
            "a": comp("switch", serde_json::json!({ "hideLabel": true })),
            "b": comp("action-button", serde_json::json!({ "hideLabel": true }))
        }));
        r["parts"]["r"]["props"]["direction"] = serde_json::json!({ "value": "column" });
        let own = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert_eq!(part(&own, "a").unwrap().w, 26.0);
        r["parts"]["a"]["inherit"] = serde_json::json!(["width", "height", "cornerRadius"]);
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        // The root hugs the button (32) plus padding; the switch, which no longer counts
        // toward that width, fills it. The fixed height and radius still reach it, and
        // nothing is reported.
        assert_eq!(s.nodes[0].w, 6.0 + 32.0 + 6.0);
        let a = part(&s, "a").unwrap();
        assert_eq!((a.w, a.h, a.radius), (32.0, 50.0, 5.0));
        assert!(
            !s.diagnostics.iter().any(|d| d.contains("cannot inherit")),
            "{:?}",
            s.diagnostics
        );
        // A value the host really lacks is reported once.
        r["parts"]["r"]["props"]
            .as_object_mut()
            .unwrap()
            .remove("cornerRadius");
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        let n = s
            .diagnostics
            .iter()
            .filter(|d| d.contains("cannot inherit"))
            .count();
        assert_eq!(n, 1, "{:?}", s.diagnostics);
    }

    #[test]
    fn stroke_over_draws_the_root_border_last_as_a_ring() {
        let g = nest_graph(&[]);
        let mut r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["a"], "props": lit_props(&[
                ("width", 100.0), ("height", 40.0), ("cornerRadius", 5.0),
                ("strokeWidth", 2.0)]) },
            "a": comp("action-button", serde_json::json!({ "hideLabel": true }))
        }));
        r["parts"]["r"]["props"]["stroke"] = serde_json::json!({ "value": "#ff0000" });
        let plain = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert_eq!(plain.nodes[0].stroke.as_deref(), Some("#ff0000"));
        assert!(plain.nodes.iter().all(|n| n.kind != "ring"));
        r["parts"]["r"]["props"]["strokeOver"] = serde_json::json!({ "value": true });
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert_eq!(s.nodes[0].stroke, None);
        assert_eq!(s.nodes[0].stroke_width, 2.0);
        let border = s.nodes.last().unwrap();
        assert_eq!(
            (border.kind.as_str(), border.part.as_str()),
            ("ring", "r.border")
        );
        assert_eq!(
            (border.x, border.y, border.w, border.h, border.radius),
            (9.0, 9.0, 98.0, 38.0, 4.0)
        );
        assert_eq!(border.stroke.as_deref(), Some("#ff0000"));
    }

    #[test]
    fn a_stack_overlays_its_children_in_declaration_order() {
        let g = nest_graph(&[]);
        let mut r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["a", "c", "b"],
                "props": lit_props(&[("gap", 9.0)]) },
            "a": { "kind": "box", "props": lit_props(&[("width", 60.0), ("height", 20.0)]) },
            "c": comp("action-button", serde_json::json!({ "hideLabel": true })),
            "b": { "kind": "box", "props": lit_props(&[("width", 30.0), ("height", 30.0)]) }
        }));
        r["parts"]["a"]["props"]["fill"] = serde_json::json!({ "value": "#111111" });
        r["parts"]["b"]["props"]["fill"] = serde_json::json!({ "value": "#222222" });
        let flow = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        r["parts"]["r"]["props"]["direction"] = serde_json::json!({ "value": "stack" });
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        // The root is as big as its biggest child, not the sum, and no gap is measured.
        assert!(flow.nodes[0].w > s.nodes[0].w + 30.0);
        assert!(s.nodes[0].w >= 60.0 && s.nodes[0].h >= 30.0);
        assert!(s.measurements.iter().all(|m| m.kind != "gap"));
        assert_eq!(s.layout.gap, None);
        // Siblings centre on one another, and the nested recipe sits between them.
        let (a, b) = (part(&s, "a").unwrap(), part(&s, "b").unwrap());
        assert_eq!(a.x + a.w / 2.0, b.x + b.w / 2.0);
        assert_eq!(a.y + a.h / 2.0, b.y + b.h / 2.0);
        let order: Vec<usize> = ["a", "c", "b"]
            .iter()
            .map(|id| s.nodes.iter().position(|n| n.part == *id).unwrap())
            .collect();
        assert!(order[0] < order[1] && order[1] < order[2], "{order:?}");
        // A box with no width fills the inner width, as in a column.
        r["parts"]["a"]["props"]
            .as_object_mut()
            .unwrap()
            .remove("width");
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert_eq!(part(&s, "a").unwrap().w, s.nodes[0].w);
    }

    #[test]
    fn inner_stroke_draws_a_second_ring_inside_the_outer_stroke() {
        let g = nest_graph(&[]);
        let mut r = host(serde_json::json!({
            "r": { "kind": "box", "children": [], "props": lit_props(&[
                ("width", 100.0), ("height", 40.0), ("cornerRadius", 5.0),
                ("strokeWidth", 2.0), ("innerStrokeWidth", 3.0)]) }
        }));
        for (prop, v) in [("stroke", "#ff0000"), ("innerStroke", "#0000ff")] {
            r["parts"]["r"]["props"][prop] = serde_json::json!({ "value": v });
        }
        for over in [false, true] {
            r["parts"]["r"]["props"]["strokeOver"] = serde_json::json!({ "value": over });
            let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
            let band = s.nodes.last().unwrap();
            assert_eq!(
                (band.kind.as_str(), band.part.as_str()),
                ("ring", "r.inner-border")
            );
            assert_eq!(
                (band.x, band.y, band.w, band.h, band.radius),
                (11.5, 11.5, 93.0, 33.0, 1.5)
            );
            assert_eq!(band.stroke.as_deref(), Some("#0000ff"));
            assert_eq!(band.stroke_width, 3.0);
        }
        // No inner width draws nothing.
        r["parts"]["r"]["props"]["innerStrokeWidth"] = serde_json::json!({ "value": 0.0 });
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert!(s.nodes.iter().all(|n| n.part != "r.inner-border"));
    }

    #[test]
    fn sizemap_picks_the_nested_size() {
        let g = nest_graph(&[]);
        let mut r = row_host();
        r["parts"]["a"]["sizeMap"]["s"] = "xl".into();
        let s = nest_scene(&g, &r, "s", &[], &[]).unwrap();
        assert_eq!(part(&s, "a").unwrap().h, 48.0);
        let l = nest_scene(&g, &r, "l", &[], &[]).unwrap();
        assert_eq!(part(&l, "a").unwrap().h, 40.0);
    }

    #[test]
    fn with_options_are_literals_or_host_options() {
        let g = nest_graph(&[]);
        let handle_x = |o: &[(&str, Value)]| {
            let s = nest_scene(&g, &row_host(), "m", &[], o).unwrap();
            part(&s, "b.handle").unwrap().x - part(&s, "b").unwrap().x
        };
        // The switch handle moves to the end only when the host's isSelected reaches it.
        assert!(handle_x(&[("isSelected", true.into())]) > handle_x(&[]) + 8.0);
        // The literal hideLabel dropped the label part's width.
        let s = nest_scene(&g, &row_host(), "m", &[], &[]).unwrap();
        assert_eq!(part(&s, "b").unwrap().w, 26.0);
    }

    #[test]
    fn host_states_do_not_reach_a_nested_part() {
        let g = nest_graph(&[]);
        let plain = nest_scene(&g, &row_host(), "m", &[], &[]).unwrap();
        let hover = nest_scene(&g, &row_host(), "m", &["hover", "down"], &[]).unwrap();
        for id in ["a", "b", "a.icon", "b.track", "b.handle"] {
            assert_eq!(
                part(&plain, id).unwrap().fill,
                part(&hover, id).unwrap().fill,
                "{id}"
            );
        }
        assert!(hover.press.is_none());
    }

    #[test]
    fn a_row_box_groups_component_parts_and_drops_out_when_none_shows() {
        let g = nest_graph(&[]);
        let mut a = comp("action-button", serde_json::json!({ "hideLabel": true }));
        let mut b = comp("switch", serde_json::json!({ "hideLabel": true }));
        a["visibleWhen"] = serde_json::json!({ "options": { "isOpen": true } });
        b["visibleWhen"] = serde_json::json!({ "options": { "isQuiet": true } });
        let mut group_props = lit_props(&[("gap", 8.0)]);
        group_props["direction"] = serde_json::json!({ "value": "row" });
        let r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["h"], "props": lit_props(&[]) },
            "h": { "kind": "box", "children": ["g"], "props": {
                "direction": { "value": "row" } } },
            "g": { "kind": "box", "children": ["a", "b"], "props": group_props },
            "a": a, "b": b
        }));
        let s = nest_scene(
            &g,
            &r,
            "m",
            &[],
            &[("isOpen", true.into()), ("isQuiet", true.into())],
        )
        .unwrap();
        let group = part(&s, "g").unwrap();
        assert_eq!((group.w, group.h), (32.0 + 8.0 + 26.0, 32.0));
        let (pa, pb) = (part(&s, "a").unwrap(), part(&s, "b").unwrap());
        assert_eq!((pa.x, pb.x), (group.x, group.x + 40.0));
        let one = nest_scene(&g, &r, "m", &[], &[("isOpen", true.into())]).unwrap();
        assert_eq!(part(&one, "g").unwrap().w, 32.0);
        let none = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert!(part(&none, "g").is_none() && part(&none, "a").is_none());
    }

    #[test]
    fn a_component_group_stacks_in_a_column() {
        let g = nest_graph(&[]);
        let a = comp("action-button", serde_json::json!({ "hideLabel": true }));
        let b = comp("switch", serde_json::json!({ "hideLabel": true }));
        let mut group_props = lit_props(&[("gap", 8.0)]);
        group_props["direction"] = serde_json::json!({ "value": "column" });
        let r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["h"], "props": lit_props(&[]) },
            "h": { "kind": "box", "children": ["g"], "props": {
                "direction": { "value": "row" } } },
            "g": { "kind": "box", "children": ["a", "b"], "props": group_props },
            "a": a, "b": b
        }));
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        let group = part(&s, "g").unwrap();
        assert_eq!((group.w, group.h), (32.0, 32.0 + 8.0 + 32.0));
        let (pa, pb) = (part(&s, "a").unwrap(), part(&s, "b").unwrap());
        assert_eq!(pb.y, pa.y + pa.h + 8.0);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    }

    #[test]
    fn a_nested_recipe_that_nests_itself_is_rejected() {
        let direct = nest_graph(&[(
            "switch",
            serde_json::json!({ "component": "switch", "root": "r",
                "sizeScale": { "s": 75, "m": 100, "l": 200, "xl": 300 },
                "parts": { "r": { "kind": "box", "children": ["x"] },
                    "x": comp("switch", serde_json::json!({})) } }),
        )]);
        let err = nest_scene(&direct, &row_host(), "m", &[], &[]).unwrap_err();
        assert!(err.contains("inside itself"), "{err}");
        // A cycle through another recipe: accordion > action-button > switch > action-button.
        let mut ab = serde_json::json!({ "component": "action-button", "root": "r",
            "sizeScale": { "s": 75, "m": 100, "l": 200, "xl": 300 },
            "parts": { "r": { "kind": "box", "children": ["x"] },
                "x": comp("switch", serde_json::json!({})) } });
        ab["sizeScale"]["xs"] = 50.into();
        let sw = serde_json::json!({ "component": "switch", "root": "r",
            "sizeScale": { "s": 75, "m": 100, "l": 200, "xl": 300 },
            "parts": { "r": { "kind": "box", "children": ["x"] },
                "x": comp("action-button", serde_json::json!({})) } });
        let g = nest_graph(&[("action-button", ab), ("switch", sw)]);
        let err = nest_scene(&g, &row_host(), "m", &[], &[]).unwrap_err();
        assert!(err.contains("inside itself"), "{err}");
    }

    #[test]
    fn nesting_is_limited_to_two_levels() {
        let level = |component: &str, child: &str| {
            serde_json::json!({ "component": component, "root": "r",
                "sizeScale": { "s": 75, "m": 100, "l": 200, "xl": 300 },
                "parts": { "r": { "kind": "box", "children": ["x"] },
                    "x": comp(child, serde_json::json!({})) } })
        };
        let host_of = |child: &str| {
            host(serde_json::json!({
                "r": { "kind": "box", "children": ["x"] },
                "x": comp(child, serde_json::json!({}))
            }))
        };
        // accordion > action-button > switch is two levels of nesting: allowed.
        let two = nest_graph(&[("action-button", level("action-button", "switch"))]);
        assert!(nest_scene(&two, &host_of("action-button"), "m", &[], &[]).is_ok());
        // One more (switch > badge) is not.
        let three = nest_graph(&[
            ("action-button", level("action-button", "switch")),
            ("switch", level("switch", "badge")),
        ]);
        let err = nest_scene(&three, &host_of("action-button"), "m", &[], &[]).unwrap_err();
        assert!(err.contains("levels deep"), "{err}");
    }

    #[test]
    fn a_missing_component_or_size_is_a_compile_error() {
        let g = nest_graph(&[]);
        let mut r = row_host();
        r["parts"]["a"]["component"] = "no-such-component".into();
        let err = nest_scene(&g, &r, "m", &[], &[]).unwrap_err();
        assert!(err.contains("no visual recipe"), "{err}");
        let mut r = row_host();
        r["parts"]["a"]["sizeMap"]
            .as_object_mut()
            .unwrap()
            .remove("m");
        let err = nest_scene(&g, &r, "m", &[], &[]).unwrap_err();
        assert!(err.contains("no sizeMap entry"), "{err}");
        // The component comes from the host's anatomy part: a part with none cannot be drawn.
        let mut g = nest_graph(&[]);
        let anatomy = g
            .components
            .iter_mut()
            .find(|c| c.name == "accordion")
            .unwrap()
            .raw["anatomy"]
            .as_array_mut()
            .unwrap();
        anatomy.retain(|p| p["name"] != "a");
        anatomy.push(serde_json::json!({ "name": "a" }));
        let r = row_host();
        let g2 = link_nested(g.clone(), "accordion", &r);
        assert!(nest_scene(&g2, &r, "m", &[], &[]).is_ok());
        let err = build_scene(&g, &r, &{
            let mut q = req(&[]);
            q.component = "accordion".into();
            q.size = "m".into();
            q
        })
        .unwrap_err();
        assert!(
            err.contains("has no anatomy part 'a' with a `component`"),
            "{err}"
        );
    }

    #[test]
    fn a_component_part_outside_a_row_is_reported_not_drawn() {
        let g = nest_graph(&[]);
        let r = host(serde_json::json!({
            "r": { "kind": "box", "children": ["b"], "props": lit_props(&[]) },
            "b": { "kind": "box", "children": ["a"], "props": lit_props(&[("height", 40.0)]) },
            "a": comp("action-button", serde_json::json!({ "hideLabel": true }))
        }));
        let s = nest_scene(&g, &r, "m", &[], &[]).unwrap();
        assert!(part(&s, "a").is_none());
        assert!(s.diagnostics.iter().any(|d| d.contains("not drawn")));
    }

    #[test]
    fn recipe_options_counts_a_host_option_a_component_part_reads() {
        let (used, structural) = recipe_options(&row_host());
        assert!(used.contains(&"isSelected".to_string()) && structural.is_empty());
    }

    fn floating_recipe(floating: Value, props: Value) -> Value {
        let mut tip = serde_json::json!({
            "kind": "box", "floating": floating,
            "visibleWhen": { "options": { "isOpen": true } },
            "props": { "width": lit(10.into()), "height": lit(6.into()), "fill": lit("#ff0000".into()) }
        });
        tip["props"]
            .as_object_mut()
            .unwrap()
            .extend(props.as_object().unwrap().clone());
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "props": {
                "width": lit(40.into()), "height": lit(20.into()), "fill": lit("#ffffff".into())
            } }, "tip": tip }
        })
    }

    fn open_scene(recipe: &Value) -> Scene {
        let (g, _) = load();
        let mut r = req(&[]);
        r.options.insert("isOpen".into(), Value::Bool(true));
        build_scene(&g, recipe, &r).unwrap()
    }

    fn tip_at(floating: Value) -> (f64, f64, Scene) {
        let s = open_scene(&floating_recipe(floating, serde_json::json!({})));
        let t = s.nodes.iter().find(|n| n.part == "tip").expect("tip drawn");
        (t.x - s.nodes[0].x, t.y - s.nodes[0].y, s)
    }

    #[test]
    fn a_floating_part_sits_beside_its_side_relative_to_the_root() {
        // Root is 40x20, tip 10x6; positions are relative to the root's top-left.
        let f = |side: &str, align: &str, off: i32, cross: i32| {
            let (x, y, _) = tip_at(serde_json::json!({ "side": side, "align": align,
                "offset": lit(off.into()), "crossOffset": lit(cross.into()) }));
            (x, y)
        };
        assert_eq!(f("top", "center", 2, 0), (15.0, -8.0));
        assert_eq!(f("top", "start", 2, 0), (0.0, -8.0));
        assert_eq!(f("top", "end", 2, 0), (30.0, -8.0));
        assert_eq!(f("bottom", "center", 2, 0), (15.0, 22.0));
        assert_eq!(f("start", "center", 2, 0), (-12.0, 7.0));
        assert_eq!(f("end", "start", 2, 0), (42.0, 0.0));
        assert_eq!(f("end", "end", 2, 0), (42.0, 14.0));
        // A negative offset overlaps the root; crossOffset moves along the edge.
        assert_eq!(f("top", "center", -2, 3), (18.0, -4.0));
        assert_eq!(f("bottom", "start", 0, -3), (-3.0, 20.0));
    }

    #[test]
    fn a_floating_part_is_drawn_only_when_its_condition_holds_and_never_moves_layout() {
        let recipe = floating_recipe(
            serde_json::json!({ "side": "top", "offset": lit(2.into()) }),
            serde_json::json!({}),
        );
        let (g, _) = load();
        let closed = build_scene(&g, &recipe, &req(&[])).unwrap();
        assert!(closed.nodes.iter().all(|n| n.part != "tip"));
        let open = open_scene(&recipe);
        let (c, o) = (&closed.nodes[0], &open.nodes[0]);
        assert_eq!((c.w, c.h), (o.w, o.h));
        assert_eq!((closed.width, closed.height), (56.0, 36.0));
        // The tip pokes 8 above the root top (offset 2 + height 6), 2 above the 8px margin:
        // the canvas grows by 0 there, and the root is where it was.
        assert_eq!((o.x, o.y), (8.0, 8.0));
        assert_eq!((open.width, open.height), (56.0, 36.0));
    }

    #[test]
    fn the_scene_grows_and_shifts_to_hold_a_floating_part() {
        let (x, y, s) = tip_at(serde_json::json!({ "side": "top", "offset": lit(10.into()) }));
        assert_eq!((x, y), (15.0, -16.0));
        // 16 above the root and 8 of margin: the top is 8 above the old canvas.
        assert_eq!((s.nodes[0].x, s.nodes[0].y), (8.0, 16.0));
        assert_eq!((s.width, s.height), (56.0, 44.0));
        let (_, _, s) = tip_at(serde_json::json!({ "side": "start", "offset": lit(20.into()) }));
        assert_eq!((s.nodes[0].x, s.nodes[0].y), (30.0, 8.0));
        assert_eq!((s.width, s.height), (78.0, 36.0));
        assert!(scene_to_svg(&s).contains("viewBox=\"0 0 78 36\""));
        let (_, _, s) = tip_at(serde_json::json!({ "side": "bottom", "offset": lit(10.into()) }));
        assert_eq!((s.width, s.height), (56.0, 44.0));
    }

    #[test]
    fn a_bad_floating_part_is_skipped_with_a_diagnostic_and_never_panics() {
        let bad = [
            serde_json::json!({ "width": lit(0.into()) }),
            serde_json::json!({ "width": lit((-4).into()) }),
            serde_json::json!({ "height": lit(1e300.into()) }),
            serde_json::json!({ "width": lit("NaN".into()) }),
            serde_json::json!({ "height": lit("inf".into()) }),
            serde_json::json!({ "width": {"token": {"property": "nope"}} }),
        ];
        for props in bad {
            let s = open_scene(&floating_recipe(
                serde_json::json!({ "side": "top" }),
                props.clone(),
            ));
            assert!(s.nodes.iter().all(|n| n.part != "tip"), "{props}");
            assert!(
                s.diagnostics
                    .iter()
                    .any(|d| d.contains("floating part 'tip'")),
                "{props}: {:?}",
                s.diagnostics
            );
            assert_eq!((s.width, s.height), (56.0, 36.0));
        }
        for off in [
            serde_json::json!(1e300),
            serde_json::json!(-1e300),
            serde_json::json!("NaN"),
        ] {
            let s = open_scene(&floating_recipe(
                serde_json::json!({ "side": "top", "offset": lit(off.clone()), "crossOffset": lit(off.clone()) }),
                serde_json::json!({}),
            ));
            assert!(
                s.width.is_finite() && s.height.is_finite() && s.width < 3.0 * MAX_FLOATING,
                "{off}"
            );
        }
    }

    #[test]
    fn the_scene_grows_to_hold_a_large_shadow_and_shifts_its_origin() {
        let scene = solve_width(
            &shadow_recipe(
                serde_json::json!({ "shadow": [layer(0, 6, 16, "rgba(0, 0, 0, 0.3)")] }),
            ),
            None,
        );
        // 40x20 root at (8, 8); the shadow reaches 1.5 * 16 = 24 on each side, 6 lower.
        // Left -16, right 72, top -10, bottom 58.
        assert_eq!((scene.width, scene.height), (88.0, 68.0));
        let n = &scene.nodes[0];
        assert_eq!((n.x, n.y, n.w, n.h), (24.0, 18.0, 40.0, 20.0));
        assert!(scene_to_svg(&scene).contains("viewBox=\"0 0 88 68\""));
        // A shadow inside the margin changes nothing; a huge offset is capped.
        let small = solve_width(
            &shadow_recipe(serde_json::json!({ "shadow": [layer(0, 1, 2, "#000000")] })),
            None,
        );
        assert_eq!(
            (small.width, small.height, small.nodes[0].x),
            (56.0, 36.0, 8.0)
        );
        let huge = solve_width(
            &shadow_recipe(
                serde_json::json!({ "shadow": [layer(0, 1_000_000_000, 8, "#000000")] }),
            ),
            None,
        );
        assert!(huge.height <= 3.0 * MAX_FLOATING, "{}", huge.height);
    }

    #[cfg(feature = "raster")]
    #[test]
    fn png_draws_the_whole_shadow_and_the_floating_part() {
        let opts = crate::raster::RasterOptions {
            scale: 1.0,
            background: None,
        };
        let px = |img: &crate::raster::Image, x: u32, y: u32| {
            let i = ((y * img.width + x) * 4) as usize;
            img.rgba[i..i + 4].to_vec()
        };
        let scene = solve_width(
            &shadow_recipe(serde_json::json!({ "shadow": [layer(0, 6, 16, "#000000")] })),
            None,
        );
        let (img, _) = crate::raster::rasterize(&scene, &[], &opts).unwrap();
        assert_eq!((img.width, img.height), (88, 68));
        // Below the root (bottom at y 38) the shadow is still visible at y 50, beyond the old 8px margin.
        assert!(px(&img, 44, 50)[3] > 0);
        assert_eq!(px(&img, 44, 28), vec![255, 255, 255, 255]);
        let tip = open_scene(&floating_recipe(
            serde_json::json!({ "side": "top", "offset": lit(10.into()) }),
            serde_json::json!({}),
        ));
        let (img, _) = crate::raster::rasterize(&tip, &[], &opts).unwrap();
        assert_eq!((img.width, img.height), (56, 44));
        // The tip is 10x6 at (23, 0); the root starts at y 16.
        assert_eq!(px(&img, 28, 3), vec![255, 0, 0, 255]);
        assert_eq!(px(&img, 28, 9)[3], 0);
        assert_eq!(px(&img, 28, 20), vec![255, 255, 255, 255]);
    }

    // --- floating subtrees and path shapes ---

    const TEARDROP: &str =
        "M10 0C15.5 0 20 4.5 20 10C20 15 14 20 10 24C6 20 0 15 0 10C0 4.5 4.5 0 10 0Z";
    const TIP: &str = "M0 0L10 0L6 5Q5 6.5 4 5Z";

    /// A 40x20 root with a loupe-like floating teardrop (20x24, stack) over a checkerboard child.
    fn loupe_recipe(floating: Value) -> Value {
        let teardrop = |extra: Value| {
            let mut p = serde_json::json!({ "kind": "box",
                "path": { "d": TEARDROP, "viewBox": [20, 24] },
                "props": { "width": lit(20.into()), "height": lit(24.into()) } });
            p["props"]
                .as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            p
        };
        let mut loupe = teardrop(serde_json::json!({
            "direction": lit("stack".into()),
            "fill": lit("#0000ff".into()),
            "shadow": { "shadow": [layer(0, 2, 4, "#000000")] }
        }));
        loupe["floating"] = floating;
        loupe["children"] = serde_json::json!(["chk"]);
        loupe["visibleWhen"] = serde_json::json!({ "options": { "isOpen": true } });
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "props": {
                "width": lit(40.into()), "height": lit(20.into()), "fill": lit("#ffffff".into())
            } },
            "loupe": loupe,
            "chk": teardrop(serde_json::json!({
                "fill": lit("#ffffff".into()), "patternFill": lit("#cccccc".into()),
                "patternSize": lit(4.into()) })) }
        })
    }

    fn node_of<'a>(s: &'a Scene, part: &str) -> &'a SceneNode {
        s.nodes
            .iter()
            .find(|n| n.part == part)
            .unwrap_or_else(|| panic!("no node {part}"))
    }

    #[test]
    fn a_floating_part_hosts_children_laid_out_at_its_anchor() {
        let s = open_scene(&loupe_recipe(serde_json::json!({
            "side": "top", "align": "center", "offset": lit(2.into()) })));
        let (root, loupe, chk) = (node_of(&s, "r"), node_of(&s, "loupe"), node_of(&s, "chk"));
        // 20x24 above a 40x20 root, 2 apart, centered: (10, -26) from the root's top-left.
        assert_eq!((loupe.x - root.x, loupe.y - root.y), (10.0, -26.0));
        assert_eq!((loupe.w, loupe.h), (20.0, 24.0));
        // The child fills the stack at the same corner and has a checker pattern.
        assert_eq!((chk.x, chk.y, chk.w, chk.h), (loupe.x, loupe.y, 20.0, 24.0));
        assert_eq!(chk.pattern.as_ref().map(|p| p.size), Some(4.0));
        assert!(loupe.path.is_some() && chk.path.is_some());
        // The root keeps its size, and a closed loupe leaves the scene as it was.
        let (g, _) = load();
        let closed = build_scene(
            &g,
            &loupe_recipe(serde_json::json!({ "side": "top" })),
            &req(&[]),
        )
        .unwrap();
        assert!(closed
            .nodes
            .iter()
            .all(|n| n.part != "loupe" && n.part != "chk"));
        assert_eq!((closed.nodes[0].w, closed.nodes[0].h), (root.w, root.h));
        assert_eq!((closed.width, closed.height), (56.0, 36.0));
    }

    #[test]
    fn the_scene_grows_to_hold_a_floating_subtree_and_its_shadow() {
        let s = open_scene(&loupe_recipe(serde_json::json!({
            "side": "top", "offset": lit(2.into()) })));
        // The subtree reaches 26 above the root; the 8px margin leaves 18 of growth, so the root
        // moves down to y 26 and the canvas is 26 + 20 + 8 tall. The shadow (blur 4, y 2) reaches
        // 3 sigma = 6 beyond the loupe, 2 below: the loupe's top edge is at 0, so it grows by 4.
        let root = node_of(&s, "r");
        assert_eq!((root.x, root.y), (8.0, 30.0));
        assert_eq!((s.width, s.height), (56.0, 58.0));
        assert_eq!(node_of(&s, "loupe").y, 4.0);
        // The same recipe with the loupe at the bottom grows the other way.
        let b = open_scene(&loupe_recipe(serde_json::json!({
            "side": "bottom", "offset": lit(2.into()) })));
        assert_eq!((node_of(&b, "r").x, node_of(&b, "r").y), (8.0, 8.0));
        assert_eq!(b.height, 8.0 + 20.0 + 2.0 + 24.0 + 2.0 + 6.0);
    }

    #[test]
    fn a_second_floating_part_is_not_solved_again_inside_a_floating_subtree() {
        let mut recipe = loupe_recipe(serde_json::json!({ "side": "top" }));
        recipe["parts"]["tip"] = serde_json::json!({ "kind": "box", "floating": { "side": "bottom" },
            "props": lit_props(&[("width", 4.0), ("height", 4.0)]) });
        let s = open_scene(&recipe);
        for id in ["loupe", "chk", "tip"] {
            assert_eq!(s.nodes.iter().filter(|n| n.part == id).count(), 1, "{id}");
        }
        // The tip is anchored to the root (below it), not to the loupe.
        let (root, tip) = (node_of(&s, "r"), node_of(&s, "tip"));
        assert_eq!((tip.x - root.x, tip.y - root.y), (18.0, 20.0));
    }

    #[test]
    fn a_floating_part_of_a_nested_recipe_is_dropped_with_a_diagnostic() {
        let sizes = serde_json::json!({ "s": 100, "m": 100, "l": 100, "xl": 100 });
        let nested = serde_json::json!({ "component": "action-button", "root": "n", "sizeScale": sizes,
            "parts": { "n": { "kind": "box", "children": ["k"], "props": lit_props(&[("width", 10.0), ("height", 10.0)]) },
                       "k": { "kind": "box", "props": lit_props(&[("width", 2.0), ("height", 2.0)]) },
                       "f": { "kind": "box", "floating": { "side": "top" },
                              "children": ["fk"],
                              "props": lit_props(&[("width", 4.0), ("height", 4.0)]) },
                       "fk": { "kind": "box", "props": lit_props(&[("width", 2.0), ("height", 2.0)]) } } });
        let g = nest_graph(&[("action-button", nested)]);
        let s = nest_scene(&g, &row_host(), "m", &[], &[]).unwrap();
        let names: Vec<&String> = s.nodes.iter().map(|n| &n.part).collect();
        assert!(names.contains(&&"a.k".to_string()), "{names:?}");
        assert!(
            !names
                .iter()
                .any(|n| n.ends_with(".f") || n.ends_with(".fk")),
            "{names:?}"
        );
        assert!(
            s.diagnostics
                .iter()
                .any(|d| d.contains("floating parts of the nested recipe are not drawn")),
            "{:?}",
            s.diagnostics
        );
    }

    #[test]
    fn an_unresolved_floating_offset_is_reported_and_taken_as_zero() {
        for key in ["offset", "crossOffset"] {
            let (x, y, s) = tip_at(serde_json::json!({ "side": "top", key: lit("NaN".into()) }));
            assert_eq!((x, y), (15.0, -6.0), "{key}");
            assert!(
                s.diagnostics
                    .iter()
                    .any(|d| d.contains(key) && d.contains("does not resolve")),
                "{key}: {:?}",
                s.diagnostics
            );
        }
    }

    #[test]
    fn a_huge_shadow_offset_or_spread_is_skipped_so_the_canvas_stays_small() {
        for key in ["x", "y", "spread"] {
            let mut l = layer(0, 0, 4, "#000000");
            l[key] = lit(1e300.into());
            let s = solve_width(&shadow_recipe(serde_json::json!({ "shadow": [l] })), None);
            assert!(s.nodes[0].shadow.is_empty(), "{key}");
            assert!(
                s.width < 200.0 && s.height < 200.0,
                "{key}: {}x{}",
                s.width,
                s.height
            );
            assert!(s.diagnostics.iter().any(|d| d.contains("beyond")), "{key}");
            // Both renderers see the same small canvas.
            let (img, _) = crate::raster::rasterize(
                &s,
                &[],
                &crate::raster::RasterOptions {
                    scale: 1.0,
                    background: None,
                },
            )
            .unwrap();
            assert_eq!(img.width as f64, s.width.ceil());
            assert!(scene_to_svg(&s).contains(&format!("width=\"{}\"", s.width)));
        }
    }

    #[test]
    fn scale_path_scales_closes_and_refuses_bad_data() {
        assert_eq!(
            scale_path("M0 0L10 0L5 10", 2.0, 3.0).unwrap(),
            "M0 0L20 0L10 30Z"
        );
        // Relative commands scale the same way; H and V use one axis; a second pair after M is a line.
        assert_eq!(
            scale_path("m1 1 2 2h3v4z", 2.0, 10.0).unwrap(),
            "m2 10l4 20h6v40Z"
        );
        // Each subpath is closed, so a stroke and a fill see one shape.
        assert_eq!(
            scale_path("M0 0L1 0M5 5L6 5", 1.0, 1.0).unwrap(),
            "M0 0L1 0ZM5 5L6 5Z"
        );
        for bad in [
            "",
            "   ",
            "L1 1",
            "M",
            "M1",
            "M1 2L",
            "M1 2 A5 5 0 0 1 9 9",
            "M1 2X3",
            "M NaN 2",
            "Minf 0",
            "M1e999 0",
            "M1e300 0",
            "M0 0L-- 1",
            "M 0 0 L 1 1 $",
            "M0,0,,,L",
            "5 5",
        ] {
            assert!(scale_path(bad, 1.0, 1.0).is_err(), "{bad:?}");
        }
        assert!(scale_path("M0 0", f64::NAN, 1.0).is_err());
        assert!(scale_path("M0 0", 0.0, 1.0).is_err());
        let long = format!("M0 0{}", "L1 1".repeat(2000));
        assert!(scale_path(&long, 1.0, 1.0).is_err());
        let wide = format!("M0 0{}", "L1 1".repeat(MAX_PATH_BYTES));
        assert!(scale_path(&wide, 1.0, 1.0).is_err());
        // Just inside the limits.
        let ok = format!("M0 0{}", "L1 1".repeat(500));
        assert!(scale_path(&ok, 1.0, 1.0).is_ok());
    }

    #[test]
    fn path_shape_reads_view_box_and_fill_rule() {
        let p = path_shape(&serde_json::json!({ "d": "M0 0L10 0L10 10", "viewBox": [10, 10], "fillRule": "evenodd" }), 20.0, 40.0).unwrap();
        assert_eq!((p.d.as_str(), p.even_odd), ("M0 0L20 0L20 40Z", true));
        assert!(
            !path_shape(&serde_json::json!({ "d": "M0 0L1 1" }), 5.0, 5.0)
                .unwrap()
                .even_odd
        );
        for bad in [
            serde_json::json!({}),
            serde_json::json!({ "d": 5 }),
            serde_json::json!({ "d": "M0 0L1 1", "viewBox": [0, 10] }),
            serde_json::json!({ "d": "M0 0L1 1", "viewBox": [1] }),
            serde_json::json!({ "d": "M0 0L1 1", "viewBox": "x" }),
            serde_json::json!({ "d": "M0 0L1 1", "fillRule": "x" }),
        ] {
            assert!(path_shape(&bad, 5.0, 5.0).is_err(), "{bad}");
        }
        assert!(path_shape(&serde_json::json!({ "d": "M0 0L1 1" }), 0.0, 5.0).is_err());
        assert!(path_shape(&serde_json::json!({ "d": "M0 0L1 1" }), f64::INFINITY, 5.0).is_err());
    }

    #[test]
    fn a_bad_path_draws_the_plain_box_with_a_diagnostic() {
        let mut recipe = loupe_recipe(serde_json::json!({ "side": "top" }));
        recipe["parts"]["loupe"]["path"]["d"] = "M0 0 A1 1 0 0 1 2 2".into();
        let s = open_scene(&recipe);
        assert!(node_of(&s, "loupe").path.is_none());
        assert!(s
            .diagnostics
            .iter()
            .any(|d| d.contains("part 'loupe'") && d.contains("arc")));
    }

    #[test]
    fn svg_draws_the_path_with_its_shadow_pattern_and_stroke() {
        let mut recipe = loupe_recipe(serde_json::json!({ "side": "top" }));
        recipe["parts"]["loupe"]["props"]["stroke"] = lit("#00ff00".into());
        recipe["parts"]["loupe"]["props"]["strokeWidth"] = lit(2.into());
        let s = open_scene(&recipe);
        let svg = scene_to_svg(&s);
        let l = node_of(&s, "loupe");
        let tf = format!("translate({} {})", l.x, l.y);
        let d = &l.path.as_ref().unwrap().d;
        assert!(
            svg.contains(&format!("transform=\"{tf}\" d=\"{d}\" fill=\"#0000ff\"")),
            "{svg}"
        );
        assert!(svg.contains("stroke=\"#00ff00\" stroke-width=\"2\" stroke-linejoin=\"round\""));
        assert!(svg.contains("data-shadow=\"true\"") && svg.contains("<pattern"));
        // The box is not drawn as a rect for a path part.
        assert!(!svg.contains("data-part=\"loupe\" x="));
    }

    #[test]
    fn png_draws_the_teardrop_its_checker_and_a_shadow_outside_it() {
        let opts = crate::raster::RasterOptions {
            scale: 1.0,
            background: None,
        };
        let s = open_scene(&loupe_recipe(
            serde_json::json!({ "side": "top", "offset": lit(2.into()) }),
        ));
        let (img, _) = crate::raster::rasterize(&s, &[], &opts).unwrap();
        let px = |x: f64, y: f64| {
            let i = ((y as u32 * img.width + x as u32) * 4) as usize;
            img.rgba[i..i + 4].to_vec()
        };
        let l = node_of(&s, "loupe");
        // Inside the round top the checker (cells of 4, top-left cell is the plain fill) alternates.
        let at = |dx: f64, dy: f64| px(l.x + dx, l.y + dy);
        assert_eq!(at(10.5, 10.5), vec![255, 255, 255, 255]);
        assert_eq!(at(10.5, 6.5), vec![204, 204, 204, 255]);
        // The corner of the box is outside the teardrop: only the blurred shadow (or nothing).
        assert!(at(0.5, 0.5)[3] < 20, "{:?}", at(0.5, 0.5));
        // The point at the bottom is narrow: the bottom corners are empty too.
        assert!(at(1.5, 23.5)[3] < 20);
    }

    #[test]
    fn a_tooltip_like_recipe_draws_a_bubble_with_text_and_a_path_tip() {
        let text = serde_json::json!({ "kind": "text", "props": {
            "fontSize": lit(10.into()), "color": lit("#ffffff".into()) } });
        let recipe = serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "props": lit_props(&[("width", 40.0), ("height", 20.0)]) },
                "bubble": { "kind": "box", "floating": { "side": "top", "offset": lit(5.into()) },
                    "children": ["label"],
                    "props": { "fill": lit("#222222".into()), "cornerRadius": lit(4.into()),
                        "paddingInlineStart": lit(6.into()), "paddingInlineEnd": lit(6.into()),
                        "paddingBlockStart": lit(4.into()), "paddingBlockEnd": lit(4.into()) } },
                "label": text,
                "tip": { "kind": "box", "floating": { "side": "top", "offset": lit(0.into()) },
                    "path": { "d": TIP, "viewBox": [10, 6] },
                    "props": { "width": lit(10.into()), "height": lit(6.into()), "fill": lit("#222222".into()) } }
            }
        });
        let (g, _) = load();
        let mut r = req(&[]);
        r.label = "Hi".into();
        let s = build_scene(&g, &recipe, &r).unwrap();
        let (root, bubble, label, tip) = (
            node_of(&s, "r"),
            node_of(&s, "bubble"),
            node_of(&s, "label"),
            node_of(&s, "tip"),
        );
        // The bubble is centered over the root, 5 above it, and holds the text inside its padding.
        assert!((bubble.x - root.x - (root.w - bubble.w) / 2.0).abs() < 1e-9);
        assert_eq!(bubble.y + bubble.h + 5.0, root.y);
        assert!(label.x >= bubble.x + 6.0 && label.x + label.w <= bubble.x + bubble.w - 6.0 + 0.01);
        assert_eq!(label.text.as_deref(), Some("Hi"));
        // The tip is a path, centered on the root and touching it.
        assert!(tip.path.is_some());
        assert_eq!((tip.x - root.x, tip.y + tip.h - root.y), (15.0, 0.0));
        assert!(
            s.nodes.iter().all(|n| n.x >= 0.0 && n.y >= 0.0),
            "nothing is cut off"
        );
    }

    #[test]
    fn the_svg_shadow_filter_region_is_local_to_the_translated_shadow_element() {
        // The loupe sits away from the origin; its filter region must still cover the blurred shadow.
        let s = open_scene(&loupe_recipe(
            serde_json::json!({ "side": "top", "offset": lit(2.into()) }),
        ));
        let l = node_of(&s, "loupe");
        assert!(l.x > 0.0 && l.y > 0.0);
        let svg = scene_to_svg(&s);
        // blur 4 reaches 3 sigma = 6 on every side of the 20x24 shape, in the element's own space.
        assert!(
            svg.contains(
                "filterUnits=\"userSpaceOnUse\" x=\"-6\" y=\"-6\" width=\"32\" height=\"36\""
            ),
            "{svg}"
        );
        assert!(svg.contains(&format!(
            "data-shadow=\"true\" transform=\"translate({} {})\"",
            l.x,
            l.y + 2.0
        )));
    }

    #[test]
    fn scale_path_keeps_a_relative_move_after_an_unclosed_subpath_where_it_was() {
        // The second subpath starts at (10, 8) + (3, 3), not at the first one's start.
        assert_eq!(
            scale_path("M2 2L10 2L10 8 m 3 3 l 5 0 l 0 5", 1.0, 1.0).unwrap(),
            "M2 2L10 2L10 8ZM13 11l5 0l0 5Z"
        );
        assert_eq!(
            scale_path(
                "m2 2 l8 0 l0 6 m 3 3 h5 v-1 c1 1 2 2 3 3 m1 1 l1 1",
                2.0,
                1.0
            )
            .unwrap(),
            "m4 2l16 0l0 6ZM26 11h10v-1c2 1 4 2 6 3ZM44 14l2 1Z"
        );
        // After an explicit close the point is the subpath start, so `m` stays relative.
        assert_eq!(
            scale_path("M0 0L4 0Z m 1 1 L2 2", 1.0, 1.0).unwrap(),
            "M0 0L4 0Zm1 1L2 2Z"
        );
    }

    #[test]
    fn a_path_is_refused_when_its_scaled_coordinates_or_box_are_too_big() {
        let d = serde_json::json!({ "d": "M0 0L1 1", "viewBox": [1e-9, 1e-9] });
        assert!(path_shape(&d, 5.0, 5.0)
            .unwrap_err()
            .contains("scales to beyond"));
        let d = serde_json::json!({ "d": "M0 0L1 1" });
        assert!(path_shape(&d, 500.0, 500.0).is_ok());
        assert!(path_shape(&d, 501.0, 500.0)
            .unwrap_err()
            .contains("at most"));
    }

    #[test]
    fn a_floating_offset_beyond_the_cap_is_skipped_so_svg_and_png_stay_drawable() {
        let (_, _, s) = tip_at(serde_json::json!({ "side": "top", "offset": lit(2000.into()) }));
        assert!(s.nodes.iter().any(|n| n.part == "tip"));
        assert!(s.height < 2100.0);
        let (g, _) = load();
        let mut r = req(&[]);
        r.options.insert("isOpen".into(), Value::Bool(true));
        let s = build_scene(
            &g,
            &floating_recipe(
                serde_json::json!({ "side": "top", "offset": lit(2001.into()) }),
                serde_json::json!({}),
            ),
            &r,
        )
        .unwrap();
        assert!(s.nodes.iter().all(|n| n.part != "tip"));
        assert!(s
            .diagnostics
            .iter()
            .any(|d| d.contains("floating part 'tip'")));
    }

    // --- floating position at a fraction ---

    /// A 100x20 track at (8, 8) with a 10x10 red handle and a 4px blue fill, both placed from
    /// `x` (and `y`) axes over the option `value` (0..200 unless `axis` overrides it).
    fn slider_recipe(handle_pos: Value, fill_pos: Value, align: &str) -> Value {
        let mut handle = serde_json::json!({
            "kind": "box",
            "floating": { "position": handle_pos, "align": align },
            "props": { "width": lit(10.into()), "height": lit(10.into()), "fill": lit("#ff0000".into()) }
        });
        handle["floating"]["position"]["of"] = "track".into();
        let mut fill = serde_json::json!({
            "kind": "box", "floating": { "position": fill_pos },
            "props": { "height": lit(4.into()), "fill": lit("#0000ff".into()) }
        });
        fill["floating"]["position"]["of"] = "track".into();
        let mut recipe = serde_json::json!({
            "component": "action-button", "root": "track", "sizeScale": { "m": 100 },
            "parts": { "track": { "kind": "box", "props": {
                "width": lit(100.into()), "height": lit(20.into()), "fill": lit("#ffffff".into())
            } }, "handle": handle, "fill": fill }
        });
        if fill_pos.as_object().is_some_and(|o| o.is_empty()) {
            recipe["parts"].as_object_mut().unwrap().remove("fill");
        }
        recipe
    }

    fn axis(extra: Value) -> Value {
        let mut a = serde_json::json!({ "value": {"option": "value"},
            "min": {"value": 0}, "max": {"value": 200} });
        a.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        a
    }

    fn at(recipe: &Value, value: Value) -> Scene {
        let (g, _) = load();
        let mut r = req(&[]);
        r.options.insert("value".into(), value);
        build_scene(&g, recipe, &r).unwrap()
    }

    /// The box of `part` relative to the track's top-left.
    fn rel(s: &Scene, part: &str) -> (f64, f64, f64, f64) {
        let t = &s.nodes[0];
        let n = s
            .nodes
            .iter()
            .find(|n| n.part == part)
            .unwrap_or_else(|| panic!("{part} not drawn: {:?}", s.diagnostics));
        (n.x - t.x, n.y - t.y, n.w, n.h)
    }

    fn handle_x(align: &str, value: Value, extra: Value) -> f64 {
        let r = slider_recipe(
            serde_json::json!({ "x": axis(extra) }),
            serde_json::json!({}),
            align,
        );
        rel(&at(&r, value), "handle").0
    }

    #[test]
    fn a_handle_is_centred_on_its_fraction_of_the_track() {
        // 50 of 0..200 is 0.25 of 100px: centre 25, so a 10px handle starts at 20, centred on y.
        let r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({}),
            "center",
        );
        assert_eq!(rel(&at(&r, 50.into()), "handle"), (20.0, 5.0, 10.0, 10.0));
        assert_eq!(handle_x("start", 50.into(), serde_json::json!({})), 25.0);
        assert_eq!(handle_x("end", 50.into(), serde_json::json!({})), 15.0);
        // Inverted: 0.75 of the track.
        assert_eq!(
            handle_x("center", 50.into(), serde_json::json!({ "invert": true })),
            70.0
        );
        // The handle's size does not change the track.
        assert_eq!(rel(&at(&r, 50.into()), "track").2, 100.0);
    }

    #[test]
    fn the_fraction_is_clamped_and_overhang_grows_the_scene() {
        let ends = |v: Value| handle_x("center", v, serde_json::json!({}));
        assert_eq!(ends(0.into()), -5.0);
        assert_eq!(ends(200.into()), 95.0);
        let r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({}),
            "center",
        );
        let s = at(&r, 200.into());
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        // Value 400 clamps to the end with a diagnostic.
        let s = at(&r, 400.into());
        assert_eq!(rel(&s, "handle").0, 95.0);
        assert!(
            s.diagnostics.iter().any(|d| d.contains("clamping")),
            "{:?}",
            s.diagnostics
        );
        assert_eq!(rel(&at(&r, (-20).into()), "handle").0, -5.0);
        // The 5px overhang is inside the 8px ring margin: the scene is the track plus the margin.
        assert_eq!((s.width, s.height), (116.0, 36.0));
        // A 30px handle overhangs the margin, so the scene and nodes shift.
        let mut big = r.clone();
        big["parts"]["handle"]["props"]["width"] = lit(30.into());
        let s = at(&big, 0.into());
        // The handle starts 15px left of the track, 7px past the canvas: everything shifts by 7.
        assert_eq!((s.width, s.nodes[0].x), (123.0, 15.0));
    }

    #[test]
    fn a_bad_value_draws_at_zero_with_a_diagnostic_and_never_panics() {
        let r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({}),
            "center",
        );
        for v in ["abc".into(), serde_json::json!([1])] {
            let s = at(&r, v.clone());
            assert_eq!(rel(&s, "handle").0, -5.0, "{v}");
            assert!(
                s.diagnostics.iter().any(|d| d.contains("position.x.value")),
                "{v}"
            );
        }
        let empty = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({ "max": {"value": 0} })) }),
            serde_json::json!({}),
            "center",
        );
        let s = at(&empty, 50.into());
        assert_eq!(rel(&s, "handle").0, -5.0);
        assert!(s.diagnostics.iter().any(|d| d.contains("non-empty")));
        let gone = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})), "of": "nope" }),
            serde_json::json!({}),
            "center",
        );
        let mut gone = gone;
        gone["parts"]["handle"]["floating"]["position"]["of"] = "nope".into();
        let s = at(&gone, 50.into());
        assert!(s.nodes.iter().all(|n| n.part != "handle"));
        assert!(s
            .diagnostics
            .iter()
            .any(|d| d.contains("position.of 'nope'")));
    }

    #[test]
    fn a_fill_is_as_long_as_its_fraction_and_a_range_starts_at_from() {
        let r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({ "x": axis(serde_json::json!({ "length": true })) }),
            "center",
        );
        // 0.25 of 100px, from the track's start, centred on y.
        assert_eq!(rel(&at(&r, 50.into()), "fill"), (0.0, 8.0, 25.0, 4.0));
        // Inverted: the fill grows from the end.
        let inv = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({ "x": axis(serde_json::json!({ "length": true, "invert": true })) }),
            "center",
        );
        assert_eq!(rel(&at(&inv, 50.into()), "fill"), (75.0, 8.0, 25.0, 4.0));
        // Range: from 0.1 to 0.25; from above the value swaps the ends.
        let range = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({ "x": axis(serde_json::json!({ "length": true, "from": {"value": 20} })) }),
            "center",
        );
        assert_eq!(rel(&at(&range, 50.into()), "fill"), (10.0, 8.0, 15.0, 4.0));
        assert_eq!(rel(&at(&range, 10.into()), "fill"), (5.0, 8.0, 5.0, 4.0));
        // An empty span draws nothing and is not an error.
        let s = at(&range, 20.into());
        assert!(s.nodes.iter().all(|n| n.part != "fill") && s.diagnostics.is_empty());
    }

    #[test]
    fn a_two_dimensional_position_sets_x_and_y() {
        let both = serde_json::json!({
            "x": axis(serde_json::json!({})),
            "y": { "value": {"value": 0.25}, "invert": true }
        });
        let r = slider_recipe(both, serde_json::json!({}), "center");
        // x: 0.25 * 100 - 5; y: inverted 0.25 is 0.75 of 20 = 15, minus 5.
        assert_eq!(rel(&at(&r, 50.into()), "handle"), (20.0, 10.0, 10.0, 10.0));
    }

    #[cfg(feature = "raster")]
    #[test]
    fn png_draws_the_handle_and_fill_at_their_fraction() {
        let opts = crate::raster::RasterOptions {
            scale: 1.0,
            background: None,
        };
        let r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({ "x": axis(serde_json::json!({ "length": true })) }),
            "center",
        );
        let s = at(&r, 100.into());
        let (img, _) = crate::raster::rasterize(&s, &[], &opts).unwrap();
        let px = |x: u32, y: u32| {
            let i = ((y * img.width + x) * 4) as usize;
            img.rgba[i..i + 4].to_vec()
        };
        // Track at (8, 8); the handle spans x 53..63, y 13..23; the fill 8..58 at y 16..20.
        assert_eq!(px(58, 14), vec![255, 0, 0, 255]);
        assert_eq!(px(30, 18), vec![0, 0, 255, 255]);
        assert_eq!(px(70, 18), vec![255, 255, 255, 255]);
        assert_eq!(px(30, 10), vec![255, 255, 255, 255]);
    }

    #[test]
    fn a_floating_leaf_reads_a_corner_radius_relative_to_its_height() {
        let mut r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({}),
            "center",
        );
        r["parts"]["handle"]["props"]["cornerRadius"] =
            serde_json::json!({ "value": 0.5, "relativeTo": "height" });
        let s = at(&r, serde_json::json!(100));
        let handle = s.nodes.iter().find(|n| n.part == "handle").unwrap();
        assert_eq!(handle.radius, 5.0);
    }

    #[test]
    fn an_unset_value_draws_at_the_start_without_a_diagnostic() {
        let r = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({})) }),
            serde_json::json!({ "x": axis(serde_json::json!({ "length": true })) }),
            "center",
        );
        let (g, _) = load();
        let s = build_scene(&g, &r, &req(&[])).unwrap();
        assert_eq!(rel(&s, "handle").0, -5.0);
        assert!(s.nodes.iter().all(|n| n.part != "fill"));
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        // Inverted, the start is the far end.
        let inv = slider_recipe(
            serde_json::json!({ "x": axis(serde_json::json!({ "invert": true })) }),
            serde_json::json!({}),
            "center",
        );
        assert_eq!(
            rel(&build_scene(&g, &inv, &req(&[])).unwrap(), "handle").0,
            95.0
        );
    }

    #[test]
    fn a_range_too_wide_to_subtract_is_diagnosed_and_draws_at_zero() {
        let wide = axis(serde_json::json!({ "min": {"value": -1e308}, "max": {"value": 1e308} }));
        let r = slider_recipe(
            serde_json::json!({ "x": wide }),
            serde_json::json!({}),
            "center",
        );
        let s = at(&r, serde_json::json!(1e300));
        assert_eq!(rel(&s, "handle").0, -5.0);
        assert!(
            s.diagnostics.iter().any(|d| d.contains("non-empty")),
            "{:?}",
            s.diagnostics
        );
    }

    #[test]
    fn an_option_picks_the_axis_and_its_direction() {
        let h = serde_json::json!([
            { "when": { "options": { "orientation": "horizontal" } }, "value": {"option": "value"},
              "min": {"value": 0}, "max": {"value": 200} },
        ]);
        let v = serde_json::json!([
            { "when": { "options": { "orientation": "vertical" } }, "value": {"option": "value"},
              "min": {"value": 0}, "max": {"value": 200}, "invert": true },
        ]);
        let r = slider_recipe(
            serde_json::json!({ "x": h, "y": v }),
            serde_json::json!({}),
            "center",
        );
        let (g, _) = load();
        let draw = |o: &str| {
            let mut q = req(&[]);
            q.options.insert("value".into(), 50.into());
            q.options.insert("orientation".into(), o.into());
            build_scene(&g, &r, &q).unwrap()
        };
        // Horizontal: x from the value, y centred on the 20px track.
        assert_eq!(rel(&draw("horizontal"), "handle"), (20.0, 5.0, 10.0, 10.0));
        // Vertical: x centred on the 100px track, y inverted 0.25 -> 0.75 of 20, minus 5.
        assert_eq!(rel(&draw("vertical"), "handle"), (45.0, 10.0, 10.0, 10.0));
    }

    #[test]
    fn a_nested_component_is_positioned_at_its_fraction() {
        let recipe = host(serde_json::json!({
            "r": { "kind": "box", "props": lit_props(&[("width", 100.0), ("height", 20.0)]) },
            "h": {
                "kind": "component", "component": "switch", "sizeMap": { "m": "m" },
                "with": { "hideLabel": true },
                "floating": { "position": { "x": axis(serde_json::json!({})) } }
            }
        }));
        let g = nest_graph(&[]);
        let s = nest_scene(&g, &recipe, "m", &[], &[("value", 100.into())]).unwrap();
        let (r, h) = (part(&s, "r").unwrap(), part(&s, "h").unwrap());
        // 100 of 0..200 is the middle of the track; the nested root is centred on it and on y.
        assert_eq!(h.x - r.x, 50.0 - h.w / 2.0);
        assert_eq!(h.y - r.y, (20.0 - h.h) / 2.0);
        // Its inner parts moved with it.
        let track = part(&s, "h.track").unwrap();
        assert!(track.x >= h.x && track.x + track.w <= h.x + h.w + 0.01);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        let s = nest_scene(&g, &recipe, "m", &[], &[("value", 0.into())]).unwrap();
        let (r, h) = (part(&s, "r").unwrap(), part(&s, "h").unwrap());
        assert_eq!(h.x - r.x, -h.w / 2.0);
    }

    /// A 100x20 root with a checkerboard (white and black 10px squares) and a child, the same
    /// size, whose fill is `fill`.
    fn ramp_recipe(fill: Value) -> Value {
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": { "r": { "kind": "box", "children": ["c"], "props": {
                "width": lit(100.into()), "height": lit(20.into()), "fill": lit("#ffffff".into()),
                "patternFill": lit("#000000".into()), "patternSize": lit(10.into())
            } }, "c": { "kind": "box", "props": {
                "width": lit(100.into()), "height": lit(20.into()), "fill": fill
            } } }
        })
    }

    fn ramp_fill(ramp: Value, from: [f64; 2], to: [f64; 2]) -> Value {
        serde_json::json!({ "gradient": { "from": from, "to": to, "ramp": ramp } })
    }

    fn ramp_scene(recipe: &Value, opts: &[(&str, Value)]) -> Scene {
        let (g, _) = load();
        let mut r = req(&[]);
        for (k, v) in opts {
            r.options.insert((*k).into(), v.clone());
        }
        build_scene(&g, recipe, &r).unwrap()
    }

    fn ramp_stops(s: &Scene, part: &str) -> Vec<(f64, String)> {
        let g = s
            .nodes
            .iter()
            .find(|n| n.part == part)
            .and_then(|n| n.gradient.as_ref())
            .unwrap_or_else(|| panic!("no gradient on {part}: {:?}", s.diagnostics));
        g.stops
            .iter()
            .map(|s| (s.offset, s.color.clone()))
            .collect()
    }

    #[cfg(feature = "raster")]
    fn pixels(s: &Scene) -> impl Fn(f64, f64) -> [u8; 4] {
        let opts = crate::raster::RasterOptions {
            scale: 1.0,
            background: None,
        };
        let (img, _) = crate::raster::rasterize(s, &[], &opts).unwrap();
        move |x: f64, y: f64| {
            let i = ((y as u32 * img.width + x as u32) * 4) as usize;
            [
                img.rgba[i],
                img.rgba[i + 1],
                img.rgba[i + 2],
                img.rgba[i + 3],
            ]
        }
    }

    #[cfg(feature = "raster")]
    fn near(got: [u8; 4], want: [f64; 3]) {
        for i in 0..3 {
            assert!(
                (f64::from(got[i]) - want[i]).abs() <= 2.0,
                "{got:?} vs {want:?}"
            );
        }
    }

    fn hue_ramp() -> Value {
        serde_json::json!({
            "color": { "option": "color" }, "channel": { "value": "hue" }
        })
    }

    #[test]
    fn a_hue_ramp_has_the_stops_react_spectrum_computes() {
        let r = ramp_recipe(ramp_fill(hue_ramp(), [0.0, 0.0], [1.0, 0.0]));
        let s = ramp_scene(&r, &[("color", "hsl(0, 100%, 50%)".into())]);
        let stops = ramp_stops(&s, "c");
        let colors: Vec<&str> = stops.iter().map(|s| s.1.as_str()).collect();
        assert_eq!(
            colors,
            ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"]
        );
        let offsets: Vec<f64> = stops.iter().map(|s| s.0).collect();
        assert_eq!(
            offsets,
            [0.0, 1.0 / 6.0, 2.0 / 6.0, 0.5, 4.0 / 6.0, 5.0 / 6.0, 1.0]
        );
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        let svg = scene_to_svg(&s);
        assert_eq!(svg.matches("<stop ").count(), 7, "{svg}");
    }

    #[test]
    fn the_channel_and_space_come_from_options_and_the_color_keeps_its_other_channels() {
        let ramp = serde_json::json!({
            "color": { "option": "color" }, "channel": { "option": "channel" },
            "space": { "option": "space" }
        });
        let r = ramp_recipe(ramp_fill(ramp, [0.0, 0.0], [1.0, 0.0]));
        let at = |color: &str, channel: &str, space: Option<&str>| {
            let mut o = vec![("color", color.into()), ("channel", channel.into())];
            if let Some(sp) = space {
                o.push(("space", sp.into()));
            }
            ramp_stops(&ramp_scene(&r, &o), "c")
                .into_iter()
                .map(|s| s.1)
                .collect::<Vec<_>>()
        };
        // lightness: three stops, the middle at 50%
        assert_eq!(
            at("hsl(0, 100%, 20%)", "lightness", None),
            ["#000000", "#ff0000", "#ffffff"]
        );
        // saturation: grey to full at the color's hue and lightness
        assert_eq!(
            at("hsl(0, 30%, 50%)", "saturation", None),
            ["#808080", "#ff0000"]
        );
        // brightness is hsb: a hex color converts into it
        assert_eq!(at("#ff0000", "brightness", None), ["#000000", "#ff0000"]);
        // hue is the full-saturation rainbow whatever the color's saturation (a grey too)
        assert_eq!(
            at("hsb(0, 50%, 100%)", "hue", None)[..3],
            ["#ff0000", "#ffff00", "#00ff00"]
        );
        assert_eq!(at("#808080", "hue", None)[1], "#ffff00");
        // a translucent color gives an opaque track, except for alpha
        assert_eq!(
            at("rgba(0, 0, 255, 0.5)", "red", None),
            ["#0000ff", "#ff00ff"]
        );
        // red, green and blue vary one channel
        assert_eq!(at("rgb(10, 20, 30)", "green", None), ["#0a001e", "#0aff1e"]);
        // an hsl color forced into rgb space
        assert_eq!(
            at("hsl(0, 100%, 50%)", "blue", Some("rgb")),
            ["#ff0000", "#ff00ff"]
        );
        // alpha keeps the color and ramps from clear to its own alpha
        assert_eq!(
            at("#336699", "alpha", None),
            ["rgba(51, 102, 153, 0)", "#336699"]
        );
    }

    #[cfg(feature = "raster")]
    #[test]
    fn png_blends_a_hue_ramp_between_its_stops() {
        let r = ramp_recipe(ramp_fill(hue_ramp(), [0.0, 0.0], [1.0, 0.0]));
        let s = ramp_scene(&r, &[("color", "hsl(0, 100%, 50%)".into())]);
        let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
        let px = pixels(&s);
        let at = |t: f64| px(c.x + (t * 100.0).floor(), c.y + 5.0);
        // x = 50.5 of 100: offset 0.505, 3% into the cyan to blue segment: green 255 * 0.97.
        near(at(0.50), [0.0, 255.0 * (1.0 - 0.03), 255.0]);
        // x = 8.5: offset 0.085 in the red to yellow segment: green 255 * 0.085 / (1/6).
        near(at(0.08), [255.0, 255.0 * 0.085 / (1.0 / 6.0), 0.0]);
        near(
            at(0.99),
            [255.0, 0.0, 255.0 * (1.0 - (0.995 - 5.0 / 6.0) * 6.0)],
        );
    }

    #[cfg(feature = "raster")]
    #[test]
    fn an_alpha_ramp_shows_the_checkerboard_through_its_start() {
        let ramp = serde_json::json!({
            "color": { "option": "color" }, "channel": { "value": "alpha" }
        });
        let r = ramp_recipe(ramp_fill(ramp, [0.0, 0.0], [1.0, 0.0]));
        let s = ramp_scene(&r, &[("color", "#336699".into())]);
        let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
        let px = pixels(&s);
        // x = 95.5, offset 0.955: the square (9, 0) is the pattern's second color (black),
        // the square (9, 1) at y 10..20 is white.
        let a = 0.955;
        let over = |back: f64| {
            [
                51.0 * a + back * (1.0 - a),
                102.0 * a + back * (1.0 - a),
                153.0 * a + back * (1.0 - a),
            ]
        };
        near(px(c.x + 95.0, c.y + 5.0), over(0.0));
        near(px(c.x + 95.0, c.y + 15.0), over(255.0));
        // the start is almost clear: the first square is the pattern's own fill, white
        near(px(c.x, c.y + 5.0), [254.0, 254.0, 254.0]);
        near(
            px(c.x + 10.0, c.y + 5.0),
            [51.0 * 0.105, 102.0 * 0.105, 153.0 * 0.105],
        );
    }

    #[cfg(feature = "raster")]
    #[test]
    fn a_vertical_track_starts_at_the_bottom_and_rtl_at_the_right() {
        let ramp = serde_json::json!({
            "color": { "option": "color" }, "channel": { "value": "red" }
        });
        let (g, _) = load();
        let mut rq = req(&[]);
        rq.options.insert("color".into(), "rgb(0, 0, 0)".into());
        for (from, to, probe_min, probe_max) in [
            ([0.0, 1.0], [0.0, 0.0], (50.0, 19.0), (50.0, 0.0)),
            ([1.0, 0.0], [0.0, 0.0], (99.0, 10.0), (0.0, 10.0)),
        ] {
            let r = ramp_recipe(ramp_fill(ramp.clone(), from, to));
            let s = build_scene(&g, &r, &rq).unwrap();
            let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
            let px = pixels(&s);
            let lo = px(c.x + probe_min.0, c.y + probe_min.1);
            let hi = px(c.x + probe_max.0, c.y + probe_max.1);
            assert!(lo[0] < 20, "{lo:?}");
            assert!(hi[0] > 235, "{hi:?}");
        }
    }

    /// A 100x100 hsl color area: the base (z = hue) as the root fill, the saturation layer
    /// (left to right) and the lightness layer (bottom to top) floating over it.
    fn area_recipe() -> Value {
        let layer = |channel: &str, to: [f64; 2], from: [f64; 2]| {
            let fill = ramp_fill(
                serde_json::json!({
                    "color": { "option": "color" }, "channel": { "value": channel },
                    "z": { "value": "hue" }
                }),
                from,
                to,
            );
            serde_json::json!({
                "kind": "box",
                "floating": { "position": {
                    "x": { "value": { "value": 1 }, "length": true },
                    "y": { "value": { "value": 1 }, "length": true } } },
                "props": { "fill": fill }
            })
        };
        let base = ramp_fill(
            serde_json::json!({
                "color": { "option": "color" }, "channel": { "value": "hue" },
                "z": { "value": "hue" }
            }),
            [0.0, 0.0],
            [1.0, 0.0],
        );
        serde_json::json!({
            "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
            "parts": {
                "r": { "kind": "box", "children": [], "props": {
                    "width": lit(100.into()), "height": lit(100.into()), "fill": base } },
                "a-sat": layer("saturation", [1.0, 0.0], [0.0, 0.0]),
                "b-light": layer("lightness", [0.0, 0.0], [0.0, 1.0])
            }
        })
    }

    #[test]
    fn a_color_area_stacks_its_layers_with_the_stops_react_spectrum_computes() {
        let s = ramp_scene(&area_recipe(), &[("color", "hsl(120, 80%, 30%)".into())]);
        let col =
            |part: &str| -> Vec<String> { ramp_stops(&s, part).into_iter().map(|s| s.1).collect() };
        assert_eq!(col("r"), ["#00ff00", "#00ff00"]);
        assert_eq!(col("a-sat"), ["#808080", "rgba(128, 128, 128, 0)"]);
        assert_eq!(
            col("b-light"),
            [
                "#000000",
                "rgba(0, 0, 0, 0)",
                "rgba(255, 255, 255, 0)",
                "#ffffff"
            ]
        );
        let offs: Vec<f64> = ramp_stops(&s, "b-light").iter().map(|s| s.0).collect();
        assert_eq!(offs, [0.0, 0.5, 0.5, 1.0]);
        // the lightness layer is drawn after (over) the saturation layer
        let order: Vec<&str> = s.nodes.iter().map(|n| n.part.as_str()).collect();
        assert_eq!(order, ["r", "a-sat", "b-light"]);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    }

    #[cfg(feature = "raster")]
    #[test]
    fn png_composites_a_color_area_like_css_stacked_gradients() {
        let s = ramp_scene(&area_recipe(), &[("color", "hsl(120, 80%, 30%)".into())]);
        let r = s.nodes.iter().find(|n| n.part == "r").unwrap();
        let px = pixels(&s);
        for (x, y) in [(80.0, 75.0), (10.0, 75.0), (50.0, 20.0), (90.0, 90.0)] {
            // saturation grey fades out to the right over the green base, then black fades out
            // up to the middle and white fades in above it (to top: 0 at the bottom).
            let (tx, ty) = ((x + 0.5) / 100.0, (100.0 - y - 0.5) / 100.0);
            let a1 = 1.0 - tx;
            let c1 = [128.0 * a1, 128.0 * a1 + 255.0 * (1.0 - a1), 128.0 * a1];
            let want: [f64; 3] = if ty < 0.5 {
                let a2 = 1.0 - ty / 0.5;
                c1.map(|v| v * (1.0 - a2))
            } else {
                let a2 = (ty - 0.5) / 0.5;
                c1.map(|v| v * (1.0 - a2) + 255.0 * a2)
            };
            near(px(r.x + x, r.y + y), want);
        }
    }

    #[test]
    fn a_bad_ramp_never_panics_and_says_what_it_drew() {
        let at = |ramp: Value, opts: &[(&str, Value)]| {
            let r = ramp_recipe(ramp_fill(ramp, [0.0, 0.0], [1.0, 0.0]));
            ramp_scene(&r, opts)
        };
        // an unset color draws the hue ramp of red, with a diagnostic
        let s = at(hue_ramp(), &[]);
        assert_eq!(ramp_stops(&s, "c")[1].1, "#ffff00");
        assert!(
            s.diagnostics.iter().any(|d| d.contains("unset or invalid")),
            "{:?}",
            s.diagnostics
        );
        // an unreadable color and a non-string color too
        for bad in [
            Value::from("blue-ish"),
            Value::from(7),
            Value::from("hsl(NaN, 1%, 1%)"),
        ] {
            let s = at(hue_ramp(), &[("color", bad)]);
            assert_eq!(ramp_stops(&s, "c").len(), 7);
            assert!(
                s.diagnostics.iter().any(|d| d.contains("default color")),
                "{:?}",
                s.diagnostics
            );
        }
        // an unknown channel, a channel the space lacks, an unknown space and an rgb area
        // draw the plain fill (no gradient)
        let cases = [
            serde_json::json!({ "color": {"option": "color"}, "channel": {"value": "chroma"} }),
            serde_json::json!({ "color": {"option": "color"}, "channel": {"value": "hue"},
                "space": {"value": "rgb"} }),
            serde_json::json!({ "color": {"option": "color"}, "channel": {"value": "hue"},
                "space": {"value": "lab"} }),
            serde_json::json!({ "color": {"option": "color"}, "channel": {"option": "missing"} }),
            serde_json::json!({ "color": {"option": "color"}, "channel": {"value": "red"},
                "z": {"value": "blue"}, "space": {"value": "rgb"} }),
        ];
        for ramp in cases {
            let s = at(ramp.clone(), &[("color", "#336699".into())]);
            let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
            assert!(c.gradient.is_none(), "{ramp}");
            assert!(
                s.diagnostics.iter().any(|d| d.contains("plain fill")),
                "{ramp}: {:?}",
                s.diagnostics
            );
        }
    }

    #[test]
    fn a_nested_component_floats_by_side_and_may_be_zero_wide() {
        let recipe = host(serde_json::json!({
            "r": { "kind": "box", "props": lit_props(&[("width", 100.0), ("height", 20.0)]) },
            "h": {
                "kind": "component", "component": "switch", "sizeMap": { "m": "m" },
                "with": { "hideLabel": true },
                "floating": { "side": "top", "align": "start",
                    "offset": { "value": 4 } }
            },
            "l": {
                "kind": "component", "component": "field-label", "sizeMap": { "m": "m" },
                "floating": { "side": "top", "align": "start" }
            }
        }));
        let g = nest_graph(&[]);
        let s = nest_scene(&g, &recipe, "m", &[], &[]).unwrap();
        let (r, h) = (part(&s, "r").unwrap(), part(&s, "h").unwrap());
        // Above the root by the 4px offset, its start edge on the root's.
        assert_eq!(h.y + h.h + 4.0, r.y);
        assert_eq!(h.x, r.x);
        // A field label with no text is zero wide: kept, not skipped, and no diagnostic.
        let l = part(&s, "l").expect("zero-wide nested label is kept");
        assert_eq!(l.w, 0.0);
        assert!(l.h > 0.0);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    }

    // --- grid and nested repeat ---

    fn cell(w: f64, h: f64, fill: &str) -> Value {
        let mut props = lit_props(&[("width", w), ("height", h)]);
        props["fill"] = serde_json::json!({ "value": fill });
        serde_json::json!({ "kind": "box", "props": props })
    }

    /// A grid root over `cells` (`a`, `b`, ...) with these props merged over `direction: grid`.
    fn grid_recipe(cells: &[(f64, f64)], props: Value) -> Value {
        let ids: Vec<String> = (0..cells.len()).map(|i| format!("c{i}")).collect();
        let mut root_props = serde_json::json!({ "direction": { "value": "grid" } });
        root_props
            .as_object_mut()
            .unwrap()
            .extend(props.as_object().unwrap().clone());
        let mut parts = serde_json::Map::new();
        parts.insert(
            "r".into(),
            serde_json::json!({ "kind": "box", "children": ids, "props": root_props }),
        );
        for (i, (w, h)) in cells.iter().enumerate() {
            parts.insert(format!("c{i}"), cell(*w, *h, "#ff0000"));
        }
        host(Value::Object(parts))
    }

    fn grid_scene(cells: &[(f64, f64)], props: Value) -> Scene {
        nest_scene(&nest_graph(&[]), &grid_recipe(cells, props), "m", &[], &[]).unwrap()
    }

    fn lit_num(v: f64) -> Value {
        serde_json::json!({ "value": v })
    }

    #[test]
    fn a_grid_fills_cells_row_major_with_the_column_count_and_gaps() {
        let s = grid_scene(
            &[(20.0, 10.0); 7],
            serde_json::json!({ "columns": lit_num(3.0), "gap": lit_num(4.0) }),
        );
        let at = |i: usize| {
            let n = part(&s, &format!("c{i}")).unwrap();
            (n.x, n.y)
        };
        // The root starts at the 8px ring margin; a cell is 20x10 with a 4px gap each way.
        assert_eq!(at(0), (8.0, 8.0));
        assert_eq!(at(1), (32.0, 8.0));
        assert_eq!(at(2), (56.0, 8.0));
        assert_eq!(
            at(3),
            (8.0, 22.0),
            "the fourth cell wraps to the second row"
        );
        assert_eq!(at(6), (8.0, 36.0), "the last row is short");
        let root = &s.nodes[0];
        assert_eq!((root.w, root.h), (68.0, 38.0));
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        // The gap token is not measured between cells of a grid.
        assert!(s.measurements.iter().all(|m| m.kind != "gap"));
    }

    #[test]
    fn grid_column_gap_and_row_gap_override_gap() {
        let s = grid_scene(
            &[(20.0, 10.0); 4],
            serde_json::json!({ "columns": lit_num(2.0), "gap": lit_num(4.0),
                "columnGap": lit_num(10.0), "rowGap": lit_num(0.0) }),
        );
        let at = |i: usize| {
            let n = part(&s, &format!("c{i}")).unwrap();
            (n.x, n.y)
        };
        assert_eq!(at(1), (38.0, 8.0));
        assert_eq!(at(2), (8.0, 18.0));
        assert_eq!((s.nodes[0].w, s.nodes[0].h), (50.0, 20.0));
    }

    #[test]
    fn grid_columns_take_the_widest_cell_and_rows_the_tallest_and_cells_align() {
        let cells = [(30.0, 10.0), (10.0, 20.0), (10.0, 10.0), (20.0, 10.0)];
        let at = |props: Value| {
            let s = grid_scene(&cells, props);
            let n = |i: usize| {
                let n = part(&s, &format!("c{i}")).unwrap();
                (n.x, n.y)
            };
            (n(0), n(1), n(2), n(3), (s.nodes[0].w, s.nodes[0].h))
        };
        let base = |extra: Value| {
            let mut p = serde_json::json!({ "columns": lit_num(2.0), "gap": lit_num(2.0) });
            p.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            p
        };
        let (a, b, c, d, root) = at(base(serde_json::json!({
            "justify": { "value": "start" }, "align": { "value": "start" } })));
        // Column 0 is 30 wide, column 1 is 20 wide; row 0 is 20 tall, row 1 is 10 tall.
        assert_eq!(root, (52.0, 32.0));
        assert_eq!((a, b), ((8.0, 8.0), (40.0, 8.0)));
        assert_eq!((c, d), ((8.0, 30.0), (40.0, 30.0)));
        let (a, b, c, d, _) = at(base(serde_json::json!({
            "justify": { "value": "end" }, "align": { "value": "end" } })));
        assert_eq!(
            (a, b),
            ((8.0, 18.0), (50.0, 8.0)),
            "end: right and bottom of the cell"
        );
        assert_eq!((c, d), ((28.0, 30.0), (40.0, 30.0)));
        let (a, b, ..) = at(base(serde_json::json!({
            "justify": { "value": "center" }, "align": { "value": "center" } })));
        assert_eq!((a, b), ((8.0, 13.0), (45.0, 8.0)));
    }

    #[test]
    fn a_grid_is_drawn_by_svg_and_png_at_the_same_cells() {
        let s = grid_scene(
            &[(20.0, 10.0); 4],
            serde_json::json!({ "columns": lit_num(2.0), "gap": lit_num(4.0) }),
        );
        let svg = scene_to_svg(&s);
        for i in 0..4 {
            assert!(svg.contains(&format!("data-part=\"c{i}\"")));
        }
        assert!(
            svg.contains("x=\"32\" y=\"22\" width=\"20\" height=\"10\""),
            "{svg}"
        );
        #[cfg(feature = "raster")]
        {
            let opts = crate::raster::RasterOptions {
                scale: 1.0,
                background: None,
            };
            let (img, _) = crate::raster::rasterize(&s, &[], &opts).unwrap();
            let px = |x: u32, y: u32| {
                let i = ((y * img.width + x) * 4) as usize;
                img.rgba[i..i + 4].to_vec()
            };
            assert_eq!(
                px(42, 27),
                vec![255, 0, 0, 255],
                "the cell at column 1, row 1"
            );
            assert_eq!(px(28, 27)[3], 0, "the gap between columns is empty");
            assert_eq!(px(42, 20)[3], 0, "the gap between rows is empty");
        }
    }

    #[test]
    fn a_grid_clamps_a_bad_column_count_with_a_diagnostic() {
        let run = |cols: Option<Value>| {
            let mut p = serde_json::json!({});
            if let Some(c) = cols {
                p["columns"] = c;
            }
            let s = grid_scene(&[(10.0, 10.0); 4], p);
            (s.nodes[0].w, s.diagnostics.join("|"))
        };
        for bad in [0.0, -3.0, f64::NAN] {
            let (w, d) = run(Some(serde_json::json!({ "value": bad.to_string() })));
            assert_eq!(w, 10.0, "{bad}: one column");
            assert!(d.contains("columns"), "{bad}: {d}");
        }
        let (w, d) = run(None);
        assert_eq!(w, 10.0);
        assert!(d.contains("columns"), "{d}");
        let (w, d) = run(Some(serde_json::json!({ "value": 2.5 })));
        assert_eq!(w, 20.0, "2.5 floors to 2");
        assert!(d.contains("whole number"), "{d}");
        let (w, d) = run(Some(lit_num(1.0e9)));
        assert_eq!(
            w, 40.0,
            "four cells in one row, clamped to the cells there are"
        );
        assert!(d.contains("up to 100"), "{d}");
    }

    #[test]
    fn a_grid_with_no_cells_is_empty_with_a_diagnostic() {
        let s = grid_scene(&[], serde_json::json!({ "columns": lit_num(3.0) }));
        assert_eq!((s.nodes[0].w, s.nodes[0].h), (0.0, 0.0));
        assert!(s.diagnostics.iter().any(|d| d.contains("no cells")));
    }

    #[test]
    fn a_grid_of_a_huge_column_and_cell_count_is_clamped_and_fast() {
        let t = std::time::Instant::now();
        let entries: Vec<Value> = (0..1_000_000)
            .map(|_| serde_json::json!({ "label": "x" }))
            .collect();
        let s = collection_part(
            serde_json::json!({ "direction": { "value": "grid" }, "columns": lit_num(1.0e9) }),
            serde_json::json!({ "props": lit_props(&[("width", 4.0), ("height", 4.0)]) }),
            serde_json::json!({}),
            serde_json::json!({}),
            |_| {},
            Value::Array(entries),
        );
        let copies = s
            .nodes
            .iter()
            .filter(|n| n.part.starts_with("item-") && !n.part.contains('.'))
            .count();
        assert_eq!(copies, MAX_REPEAT_COPIES);
        assert_eq!(s.nodes[0].w, 4.0 * MAX_GRID_COLUMNS as f64);
        assert!(s.diagnostics.iter().any(|d| d.contains("past the limit")));
        assert!(s.diagnostics.iter().any(|d| d.contains("up to 100")));
        assert!(t.elapsed().as_secs() < 20, "{:?}", t.elapsed());
    }

    /// A tree: `tree` repeats `level1` (entries of `items`), whose `children` entries repeat
    /// `level2`, whose `children` repeat `level3`. Each level indents by its own padding.
    fn tree_scene(items: Value) -> Scene {
        let (mut g, _) = load();
        let comp = g
            .components
            .iter_mut()
            .find(|c| c.name == "action-button")
            .unwrap();
        comp.raw["slots"] = serde_json::json!([
            { "name": "default", "part": "level1", "collection": "items" },
            { "name": "second", "part": "level2", "collection": "second" },
            { "name": "third", "part": "level3", "collection": "third" }
        ]);
        let level = |kids: &[&str], indent: f64, repeat: Value| {
            let mut p = serde_json::json!({
                "kind": "box", "children": kids,
                "props": { "direction": { "value": "column" },
                    "align": { "value": "start" },
                    "paddingInlineStart": { "value": indent } },
            });
            if !repeat.is_null() {
                p["repeat"] = repeat;
            }
            p
        };
        let recipe = serde_json::json!({
            "component": "action-button", "root": "tree", "sizeScale": { "m": 100 },
            "parts": {
                "tree": level(&["level1"], 0.0, serde_json::json!(
                    { "slot": "default", "with": { "second": "children" } })),
                "level1": level(&["row1", "level2"], 0.0, serde_json::json!(
                    { "slot": "second", "with": { "third": "children" } })),
                "level2": level(&["row2", "level3"], 10.0, serde_json::json!(
                    { "slot": "third" })),
                "level3": level(&["row3"], 20.0, Value::Null),
                "row1": cell(30.0, 10.0, "#00ff00"),
                "row2": cell(30.0, 10.0, "#00ff00"),
                "row3": cell(30.0, 10.0, "#00ff00")
            }
        });
        let mut r = req(&[]);
        r.options.insert("items".into(), items);
        build_scene(&g, &recipe, &r).unwrap()
    }

    #[test]
    fn a_repeat_inside_a_repeat_draws_each_level_indented() {
        let s = tree_scene(serde_json::json!([
            { "children": [ { "children": [ {}, {} ] } ] },
            {}
        ]));
        let at = |id: &str| {
            let n = part(&s, id).unwrap_or_else(|| {
                panic!(
                    "no {id}: {:?}",
                    s.nodes.iter().map(|n| &n.part).collect::<Vec<_>>()
                )
            });
            (n.x, n.y)
        };
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        // Each level indents by its own padding: 0, then 10, then 10 + 20.
        assert_eq!(at("level1-1.row1"), (8.0, 8.0));
        assert_eq!(at("level1-1.row2"), (18.0, 18.0));
        assert_eq!(at("level1-1.level3-1.row3"), (38.0, 28.0));
        assert_eq!(at("level1-1.level3-2.row3"), (38.0, 38.0));
        // A leaf entry has no children, so it draws no phantom copy of the level below.
        assert_eq!(at("level1-2.row1"), (8.0, 48.0));
        assert!(part(&s, "level1-2.row2").is_none());
    }

    /// A recipe with `depth` levels, each repeating the next over `children`.
    fn deep_tree(depth: usize) -> (TokenGraph, Value) {
        let (mut g, _) = load();
        let comp = g
            .components
            .iter_mut()
            .find(|c| c.name == "action-button")
            .unwrap();
        let slots: Vec<Value> = (0..=depth)
            .map(|i| {
                serde_json::json!({ "name": format!("s{i}"), "part": format!("l{}", i + 1),
                "collection": format!("o{i}") })
            })
            .collect();
        comp.raw["slots"] = Value::Array(slots);
        let mut parts = serde_json::Map::new();
        for i in 0..depth {
            parts.insert(
                format!("l{i}"),
                serde_json::json!({
                "kind": "box", "children": [format!("l{}", i + 1)],
                "repeat": { "slot": format!("s{i}"), "with": { format!("o{}", i + 1): "c" } } }),
            );
        }
        parts.insert(format!("l{depth}"), cell(4.0, 4.0, "#ff0000"));
        let recipe = serde_json::json!({ "component": "action-button", "root": "l0",
            "sizeScale": { "m": 100 }, "parts": parts });
        (g, recipe)
    }

    #[test]
    fn a_repeat_nested_too_deep_stops_with_a_diagnostic() {
        let t = std::time::Instant::now();
        for depth in [
            MAX_REPEAT_DEPTH as usize,
            MAX_REPEAT_DEPTH as usize + 1,
            1000,
        ] {
            let (g, recipe) = deep_tree(depth);
            let mut entry = serde_json::json!({});
            // The data is as deep as JSON parsing allows (128); the recipe is the deep part.
            for _ in 0..depth.min(100) {
                entry = serde_json::json!({ "c": [entry] });
            }
            let mut r = req(&[]);
            r.options.insert("o0".into(), serde_json::json!([entry]));
            let s = build_scene(&g, &recipe, &r).unwrap();
            let capped = s.diagnostics.iter().any(|d| d.contains("repeats deep"));
            assert_eq!(
                capped,
                depth > MAX_REPEAT_DEPTH as usize,
                "depth {depth}: {:?}",
                s.diagnostics
            );
        }
        assert!(t.elapsed().as_secs() < 20, "{:?}", t.elapsed());
    }

    /// A grid of `months` month grids, each a 7-column grid of `days` day cells.
    fn months_scene(months: usize, days: usize) -> Scene {
        let (mut g, _) = load();
        let comp = g
            .components
            .iter_mut()
            .find(|c| c.name == "action-button")
            .unwrap();
        comp.raw["slots"] = serde_json::json!([
            { "name": "default", "part": "month", "collection": "months" },
            { "name": "days", "part": "day", "collection": "days" }
        ]);
        let recipe = serde_json::json!({
            "component": "action-button", "root": "cal", "sizeScale": { "m": 100 },
            "parts": {
                "cal": { "kind": "box", "children": ["month"],
                    "props": { "direction": { "value": "grid" }, "columns": lit_num(2.0),
                        "gap": lit_num(2.0) },
                    "repeat": { "slot": "default", "with": { "days": "days" } } },
                "month": { "kind": "box", "children": ["day"],
                    "props": { "direction": { "value": "grid" }, "columns": lit_num(7.0) },
                    "repeat": { "slot": "days" } },
                "day": cell(4.0, 4.0, "#ff0000")
            }
        });
        let day_entries: Vec<Value> = (0..days).map(|_| serde_json::json!({})).collect();
        let entries: Vec<Value> = (0..months)
            .map(|_| serde_json::json!({ "days": day_entries }))
            .collect();
        let mut r = req(&[]);
        r.options.insert("months".into(), Value::Array(entries));
        build_scene(&g, &recipe, &r).unwrap()
    }

    #[test]
    fn nested_repeats_share_one_scene_budget_and_stay_fast() {
        let t = std::time::Instant::now();
        let small = months_scene(10, 10);
        assert_eq!(
            small.nodes.len(),
            1 + 10 * (1 + 10),
            "{}",
            small.nodes.len()
        );
        let small_time = t.elapsed();
        let t = std::time::Instant::now();
        // 100 months of 100 days is 10,100 copies: past the budget, so it is cut and says so.
        let big = months_scene(100, 100);
        let big_time = t.elapsed();
        assert!(
            big.diagnostics.iter().any(|d| d.contains("scene's limit")),
            "{:?}",
            big.diagnostics.first()
        );
        assert!(
            big.nodes.len() <= 1 + 2 * MAX_SCENE_COPIES,
            "{}",
            big.nodes.len()
        );
        // 70 months of 70 days stays under the budget; time grows with the copies, not their square.
        let t = std::time::Instant::now();
        let mid = months_scene(70, 70);
        assert_eq!(mid.nodes.len(), 1 + 70 * 71);
        assert!(t.elapsed().as_secs() < 5, "{:?}", t.elapsed());
        assert!(big_time.as_secs() < 5, "{big_time:?}");
    }

    /// A column root of grids and repeating boxes, built from `parts` and these `slots`.
    fn subtree_scene(parts: Value, slots: Value, opts: &[(&str, Value)]) -> Scene {
        let (mut g, _) = load();
        let comp = g
            .components
            .iter_mut()
            .find(|c| c.name == "action-button")
            .unwrap();
        comp.raw["slots"] = slots;
        let recipe = serde_json::json!({ "component": "action-button", "root": "root",
            "sizeScale": { "m": 100 }, "parts": parts });
        let mut r = req(&[]);
        for (k, v) in opts {
            r.options.insert(k.to_string(), v.clone());
        }
        build_scene(&g, &recipe, &r).unwrap()
    }

    fn pos_of(s: &Scene, id: &str) -> (f64, f64) {
        let n = part(s, id).unwrap_or_else(|| {
            panic!(
                "no {id}: {:?}",
                s.nodes.iter().map(|n| &n.part).collect::<Vec<_>>()
            )
        });
        (n.x, n.y)
    }

    #[test]
    fn a_calendar_is_a_title_a_weekday_grid_and_a_day_grid_in_one_tree() {
        let mut parts = serde_json::json!({
            "root": { "kind": "box", "children": ["title", "weekdays", "days"],
                "props": { "direction": { "value": "column" }, "align": { "value": "start" },
                    "gap": lit_num(4.0) } },
            "title": cell(70.0, 8.0, "#0000ff"),
            "weekdays": { "kind": "box", "children": (0..7).map(|i| format!("wd{i}")).collect::<Vec<_>>(),
                "props": { "direction": { "value": "grid" }, "columns": lit_num(7.0),
                    "gap": lit_num(2.0), "justify": { "value": "start" } } },
            "days": { "kind": "box", "children": ["day"],
                "props": { "direction": { "value": "grid" }, "columns": lit_num(7.0),
                    "gap": lit_num(2.0) },
                "repeat": { "slot": "days" } },
            "day": cell(10.0, 10.0, "#ff0000")
        });
        for i in 0..7 {
            parts[format!("wd{i}")] = cell(10.0, 6.0, "#00ff00");
        }
        let days: Vec<Value> = (0..10).map(|_| serde_json::json!({})).collect();
        let s = subtree_scene(
            parts,
            serde_json::json!([{ "name": "days", "part": "day", "collection": "days" }]),
            &[("days", Value::Array(days))],
        );
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        assert_eq!(pos_of(&s, "title"), (8.0, 8.0));
        assert_eq!(pos_of(&s, "wd0"), (8.0, 20.0));
        assert_eq!(pos_of(&s, "wd6"), (8.0 + 6.0 * 12.0, 20.0));
        assert_eq!(pos_of(&s, "day-1"), (8.0, 30.0));
        assert_eq!(pos_of(&s, "day-3"), (32.0, 30.0));
        assert_eq!(
            pos_of(&s, "day-8"),
            (8.0, 42.0),
            "the eighth day wraps to the second row"
        );
        let root = &s.nodes[0];
        assert_eq!((root.w, root.h), (82.0, 8.0 + 4.0 + 6.0 + 4.0 + 22.0));
    }

    #[test]
    fn a_table_header_row_and_body_are_two_repeats_in_one_tree() {
        let parts = serde_json::json!({
            "root": { "kind": "box", "children": ["head", "body"],
                "props": { "direction": { "value": "column" }, "align": { "value": "start" },
                    "gap": lit_num(4.0) } },
            "head": { "kind": "box", "children": ["hcell"],
                "props": { "direction": { "value": "grid" }, "columns": lit_num(3.0),
                    "gap": lit_num(2.0) },
                "repeat": { "slot": "headers" } },
            "body": { "kind": "box", "children": ["cell"],
                "props": { "direction": { "value": "grid" }, "columns": lit_num(3.0),
                    "gap": lit_num(2.0) },
                "repeat": { "slot": "cells" } },
            "hcell": cell(20.0, 8.0, "#0000ff"),
            "cell": cell(20.0, 10.0, "#ff0000")
        });
        let objs = |n: usize| Value::Array((0..n).map(|_| serde_json::json!({})).collect());
        let s = subtree_scene(
            parts,
            serde_json::json!([
                { "name": "headers", "part": "hcell", "collection": "headers" },
                { "name": "cells", "part": "cell", "collection": "cells" }
            ]),
            &[("headers", objs(3)), ("cells", objs(6))],
        );
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        assert_eq!(pos_of(&s, "hcell-1"), (8.0, 8.0));
        assert_eq!(pos_of(&s, "hcell-3"), (52.0, 8.0));
        assert_eq!(pos_of(&s, "cell-1"), (8.0, 20.0));
        assert_eq!(pos_of(&s, "cell-2"), (30.0, 20.0));
        assert_eq!(pos_of(&s, "cell-4"), (8.0, 32.0));
    }

    #[test]
    fn grid_boxes_nested_too_deep_stop_with_a_diagnostic() {
        let t = std::time::Instant::now();
        for depth in [
            MAX_REPEAT_DEPTH as usize,
            MAX_REPEAT_DEPTH as usize + 1,
            50,
            1000,
        ] {
            let mut parts = serde_json::Map::new();
            parts.insert(
                "root".into(),
                serde_json::json!({ "kind": "box", "children": ["g0"] }),
            );
            for i in 0..depth {
                let kids = if i + 1 < depth {
                    vec![format!("g{}", i + 1)]
                } else {
                    vec!["leaf".to_string()]
                };
                parts.insert(
                    format!("g{i}"),
                    serde_json::json!({ "kind": "box", "children": kids,
                    "props": { "direction": { "value": "grid" }, "columns": lit_num(1.0) } }),
                );
            }
            parts.insert("leaf".into(), cell(4.0, 4.0, "#ff0000"));
            let s = subtree_scene(Value::Object(parts), serde_json::json!([]), &[]);
            let capped = s.diagnostics.iter().any(|d| d.contains("deep"));
            assert_eq!(capped, depth > MAX_REPEAT_DEPTH as usize, "depth {depth}");
        }
        assert!(t.elapsed().as_secs() < 20);
    }
}
