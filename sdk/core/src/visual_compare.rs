// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Compare rendered scenes with values measured on a real platform component (draft).
//!
//! Pure data: scenes are the JSON that `design-data render --format scene` writes, and the
//! measured values are a JSON document an adapter produces (format
//! [`MEASURED_FORMAT`], documented in `docs/visual-comparison.md`). No images and no platform
//! capture happen here. Numbers decide the verdict; each difference also carries the labels
//! and title of the gap bead it would become (see the `design-data-gap-tracking` convention).

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

use crate::visual::css_font_weight;

/// The `format` value of a measured-values document.
pub const MEASURED_FORMAT: &str = "design-data-measured/1";
/// The `format` value of a comparison report.
pub const REPORT_FORMAT: &str = "design-data-comparison/1";

const R2_CAUSE: &str = "r2-text-width-estimate";

/// Largest difference that still counts as equal. Sizes are in the scene's unit (CSS px on
/// the web, pt on iOS); colours are the largest channel difference on a 0-255 scale, with
/// alpha scaled to 0-255.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Tolerances {
    /// width, height, padding, corner radius
    pub size: f64,
    pub font_size: f64,
    pub font_weight: f64,
    pub color: f64,
}

impl Default for Tolerances {
    fn default() -> Self {
        Self {
            size: 1.0,
            font_size: 0.5,
            font_weight: 0.0,
            color: 3.0,
        }
    }
}

impl Tolerances {
    /// Set one tolerance by its JSON name (`size`, `fontSize`, `fontWeight`, `color`).
    pub fn set(&mut self, key: &str, value: f64) -> Result<(), String> {
        if !(value.is_finite() && value >= 0.0) {
            return Err(format!(
                "tolerance '{key}' must be a number >= 0, got {value}"
            ));
        }
        match key {
            "size" => self.size = value,
            "fontSize" => self.font_size = value,
            "fontWeight" => self.font_weight = value,
            "color" => self.color = value,
            _ => {
                return Err(format!(
                    "unknown tolerance '{key}' (size, fontSize, fontWeight, color)"
                ))
            }
        }
        Ok(())
    }
}

/// A measured-values document: what an adapter read off the platform component.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct MeasuredFile {
    pub format: String,
    /// Free-form provenance: `platform`, `adapter`, a commit or app version, a date. The
    /// report copies it; `platform` also names the platform in gap titles.
    pub source: Map<String, Value>,
    /// Overrides the defaults; CLI flags override these.
    pub tolerances: Option<Tolerances>,
    pub states: Vec<MeasuredState>,
}

/// Measurements for one state; `id` is the id the batch render gave that state.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct MeasuredState {
    pub id: String,
    /// Recipe part name → property → value.
    pub parts: BTreeMap<String, BTreeMap<String, Value>>,
}

/// The labels and title of the gap bead a difference would become. A suggestion: triage
/// confirms or changes it.
#[derive(Debug, Clone, Serialize)]
pub struct GapSuggestion {
    pub title: String,
    pub labels: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Difference {
    pub part: String,
    pub property: String,
    /// The design-data value (scene).
    pub expected: Value,
    /// The platform value (measured).
    pub measured: Value,
    /// `measured - expected` for numbers; the channel distance for colours.
    pub delta: f64,
    pub tolerance: f64,
    /// `px`, `channel` or `weight`.
    pub unit: &'static str,
    /// Token the scene value came from, when it is token-bound.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    /// Set when the difference may come from the renderer, not the data.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub possible_cause: Option<&'static str>,
    /// The scene value is a literal, not bound to a token (padding read from the solved layout).
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub unbound: bool,
    pub gap: GapSuggestion,
}

/// A measured value that could not be compared.
#[derive(Debug, Clone, Serialize)]
pub struct Skipped {
    pub part: String,
    pub property: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StateReport {
    pub id: String,
    pub component: String,
    pub compared: usize,
    pub differences: Vec<Difference>,
    pub skipped: Vec<Skipped>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub format: &'static str,
    pub source: Map<String, Value>,
    pub tolerances: Tolerances,
    pub states: Vec<StateReport>,
    /// Measured state ids with no scene.
    pub states_without_scene: Vec<String>,
    /// Scene ids with no measured state.
    pub scenes_without_measurement: Vec<String>,
    pub summary: Summary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub states: usize,
    pub compared: usize,
    pub differences: usize,
    pub skipped: usize,
}

impl Report {
    /// True when nothing differs and every measured state found its scene.
    pub fn is_clean(&self) -> bool {
        self.summary.differences == 0 && self.states_without_scene.is_empty()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct Rgba {
    r: f64,
    g: f64,
    b: f64,
    a: f64,
}

impl Rgba {
    const CLEAR: Rgba = Rgba {
        r: 0.0,
        g: 0.0,
        b: 0.0,
        a: 0.0,
    };

    /// Largest channel difference on a 0-255 scale; alpha counts as `a * 255`.
    fn distance(self, o: Rgba) -> f64 {
        [
            self.r - o.r,
            self.g - o.g,
            self.b - o.b,
            (self.a - o.a) * 255.0,
        ]
        .into_iter()
        .map(f64::abs)
        .fold(0.0, f64::max)
    }
}

/// `rgb()`/`rgba()` (comma or space syntax), `#rgb`, `#rrggbb`, `#rrggbbaa`, `transparent`
/// and `none`.
fn parse_color(s: &str) -> Option<Rgba> {
    let s = s.trim().to_ascii_lowercase();
    if s == "transparent" || s == "none" {
        return Some(Rgba::CLEAR);
    }
    if let Some(hex) = s.strip_prefix('#') {
        let digit = |i: usize, n: usize| u8::from_str_radix(hex.get(i..i + n)?, 16).ok();
        let (r, g, b, a) = match hex.len() {
            3 => (digit(0, 1)? * 17, digit(1, 1)? * 17, digit(2, 1)? * 17, 255),
            6 => (digit(0, 2)?, digit(2, 2)?, digit(4, 2)?, 255),
            8 => (digit(0, 2)?, digit(2, 2)?, digit(4, 2)?, digit(6, 2)?),
            _ => return None,
        };
        return Some(Rgba {
            r: r.into(),
            g: g.into(),
            b: b.into(),
            a: f64::from(a) / 255.0,
        });
    }
    let inner = s
        .strip_prefix("rgba(")
        .or_else(|| s.strip_prefix("rgb("))?
        .strip_suffix(')')?;
    let parts: Vec<&str> = inner
        .split(|c: char| c == ',' || c == '/' || c.is_whitespace())
        .filter(|p| !p.is_empty())
        .collect();
    if parts.len() != 3 && parts.len() != 4 {
        return None;
    }
    let channel = |p: &str| -> Option<f64> {
        match p.strip_suffix('%') {
            Some(pct) => pct.parse::<f64>().ok().map(|v| v * 2.55),
            None => p.parse().ok(),
        }
    };
    let alpha = match parts.get(3) {
        Some(p) => match p.strip_suffix('%') {
            Some(pct) => pct.parse::<f64>().ok()? / 100.0,
            None => p.parse().ok()?,
        },
        None => 1.0,
    };
    Some(Rgba {
        r: channel(parts[0])?,
        g: channel(parts[1])?,
        b: channel(parts[2])?,
        a: alpha,
    })
}

fn number(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().trim_end_matches("px").trim().parse().ok(),
        _ => None,
    }
    .filter(|n| n.is_finite())
}

fn weight(v: &Value) -> Option<f64> {
    match v {
        Value::String(s) => css_font_weight(Some(s)).parse().ok(),
        other => number(other),
    }
}

/// How one measured property reads from a scene.
enum Kind {
    Size,
    FontSize,
    FontWeight,
    Color,
}

const CORNERS: [(&str, &str); 4] = [
    ("cornerRadiusTopLeft", "cornerRadiusStartStart"),
    ("cornerRadiusTopRight", "cornerRadiusStartEnd"),
    ("cornerRadiusBottomRight", "cornerRadiusEndEnd"),
    ("cornerRadiusBottomLeft", "cornerRadiusEndStart"),
];

const PADDING: [(&str, &str); 4] = [
    ("paddingTop", "paddingBlockStart"),
    ("paddingRight", "paddingInlineEnd"),
    ("paddingBottom", "paddingBlockEnd"),
    ("paddingLeft", "paddingInlineStart"),
];

fn kind_of(property: &str) -> Option<Kind> {
    Some(match property {
        "width" | "height" | "cornerRadius" | "gap" | "borderWidth" | "strokeWidth" => Kind::Size,
        p if CORNERS.iter().any(|(k, _)| *k == p) => Kind::Size,
        p if PADDING.iter().any(|(k, _)| *k == p) => Kind::Size,
        "fontSize" => Kind::FontSize,
        "fontWeight" => Kind::FontWeight,
        "fill" | "color" | "stroke" => Kind::Color,
        _ => return None,
    })
}

fn node_of<'a>(scene: &'a Value, part: &str) -> Option<&'a Value> {
    scene
        .get("nodes")?
        .as_array()?
        .iter()
        .find(|n| n.get("part").and_then(Value::as_str) == Some(part))
}

fn token_of(node: &Value, prop: &str) -> Option<String> {
    node.get("tokens")?
        .as_array()?
        .iter()
        .find(|t| t.get("prop").and_then(Value::as_str) == Some(prop))
        .and_then(|t| t.get("token")?.as_str())
        .map(str::to_string)
}

/// The scene's value for one part property, as a JSON value, with the token it came from.
/// The flag is true for a padding read from the solved layout because no token binds it.
/// `Err` is the reason the scene has no such value.
fn expected(
    scene: &Value,
    node: &Value,
    part: &str,
    property: &str,
) -> Result<(Value, Option<String>, bool), String> {
    let field = |k: &str| node.get(k).filter(|v| !v.is_null()).cloned();
    let missing = || format!("scene part '{part}' has no {property}");
    let is_root = scene.pointer("/nodes/0/part").and_then(Value::as_str) == Some(part);
    let bound = |r: Option<(Value, Option<String>)>| r.map(|(v, t)| (v, t, false));
    match property {
        "width" => bound(field("w").map(|v| (v, token_of(node, "width")))),
        "height" => bound(field("h").map(|v| (v, token_of(node, "height")))),
        "cornerRadius" => bound(field("radius").map(|v| (v, token_of(node, "cornerRadius")))),
        "borderWidth" | "strokeWidth" => {
            bound(field("stroke_width").map(|v| (v, token_of(node, "strokeWidth"))))
        }
        "stroke" => {
            // The renderer draws a stroke only with a positive width.
            let drawn = node
                .get("stroke_width")
                .and_then(Value::as_f64)
                .is_some_and(|w| w > 0.0);
            Some((
                field("stroke").filter(|_| drawn).unwrap_or(json!("none")),
                token_of(node, "stroke"),
                false,
            ))
        }
        "gap" => {
            return match scene.pointer("/layout/gap").filter(|_| is_root) {
                Some(g) => Ok((g.clone(), token_of(node, "gap"), false)),
                None => Err(format!(
                    "scene has no gap on '{part}' (not the container, or fewer than two children)"
                )),
            }
        }
        "fontSize" => bound(
            field("font_size")
                .filter(|v| v.as_f64().is_some_and(|n| n > 0.0))
                .map(|v| (v, token_of(node, "fontSize"))),
        ),
        "fontWeight" => bound(field("font_weight").map(|v| (v, token_of(node, "fontWeight")))),
        "fill" => Some((
            field("fill").unwrap_or(json!("none")),
            token_of(node, "fill"),
            false,
        )),
        "color" => bound(field("color").map(|v| (v, token_of(node, "color")))),
        p if CORNERS.iter().any(|(k, _)| *k == p) => {
            let i = CORNERS.iter().position(|(k, _)| *k == p).unwrap();
            let radius = node
                .pointer(&format!("/radii/{i}"))
                .cloned()
                .or_else(|| field("radius"));
            bound(radius.map(|v| (v, token_of(node, CORNERS[i].1))))
        }
        p => {
            let (i, prop) = PADDING
                .iter()
                .enumerate()
                .find(|(_, (k, _))| *k == p)
                .map(|(i, (_, r))| (i, *r))
                .ok_or_else(|| format!("unsupported property '{p}'"))?;
            let m = scene
                .get("measurements")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .find(|m| {
                    m.get("part").and_then(Value::as_str) == Some(part)
                        && m.get("prop").and_then(Value::as_str) == Some(prop)
                });
            if let Some(m) = m {
                let span = if prop.contains("Inline") { "w" } else { "h" };
                return Ok((
                    m.get(span).cloned().unwrap_or(Value::Null),
                    m.pointer("/token/token")
                        .and_then(Value::as_str)
                        .map(str::to_string),
                    false,
                ));
            }
            return match scene
                .pointer(&format!("/layout/padding/{i}"))
                .filter(|_| is_root)
            {
                // A token that resolves to 0 has no measurement but still binds the padding.
                Some(v) => {
                    let token = token_of(node, prop);
                    let unbound = token.is_none();
                    Ok((v.clone(), token, unbound))
                }
                None => Err(format!("scene has no solved {prop} on '{part}'")),
            };
        }
    }
    .ok_or_else(missing)
}

fn compare_state(
    id: &str,
    scene: &Value,
    measured: &MeasuredState,
    tol: &Tolerances,
    platform: &str,
) -> StateReport {
    let component = scene
        .get("component")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let mut out = StateReport {
        id: id.to_string(),
        component: component.clone(),
        compared: 0,
        differences: Vec::new(),
        skipped: Vec::new(),
    };
    for (part, props) in &measured.parts {
        let skip = |out: &mut StateReport, property: &str, reason: String| {
            out.skipped.push(Skipped {
                part: part.clone(),
                property: property.to_string(),
                reason,
            });
        };
        let Some(node) = node_of(scene, part) else {
            for p in props.keys() {
                skip(&mut out, p, format!("scene has no part '{part}'"));
            }
            continue;
        };
        let is_text = node.get("kind").and_then(Value::as_str) == Some("text");
        for (property, value) in props {
            let Some(kind) = kind_of(property) else {
                skip(&mut out, property, "unsupported property".into());
                continue;
            };
            let (exp, token, unbound) = match expected(scene, node, part, property) {
                Ok(e) => e,
                Err(reason) => {
                    skip(&mut out, property, reason);
                    continue;
                }
            };
            let (delta, tolerance, unit) = match kind {
                Kind::Size | Kind::FontSize | Kind::FontWeight => {
                    let (m, e) = match kind {
                        Kind::FontWeight => (weight(value), weight(&exp)),
                        _ => (number(value), number(&exp)),
                    };
                    let (Some(m), Some(e)) = (m, e) else {
                        skip(
                            &mut out,
                            property,
                            format!("not a number: {value} vs {exp}"),
                        );
                        continue;
                    };
                    match kind {
                        Kind::Size => (m - e, tol.size, "px"),
                        Kind::FontSize => (m - e, tol.font_size, "px"),
                        _ => (m - e, tol.font_weight, "weight"),
                    }
                }
                Kind::Color => {
                    let (m, e) = (
                        value.as_str().and_then(parse_color),
                        exp.as_str().and_then(parse_color),
                    );
                    let (Some(m), Some(e)) = (m, e) else {
                        skip(
                            &mut out,
                            property,
                            format!("unparseable colour: {value} vs {exp}"),
                        );
                        continue;
                    };
                    (m.distance(e), tol.color, "channel")
                }
            };
            out.compared += 1;
            if delta.abs() <= tolerance {
                continue;
            }
            let possible_cause = (is_text && property == "width").then_some(R2_CAUSE);
            out.differences.push(Difference {
                part: part.clone(),
                property: property.clone(),
                expected: exp,
                measured: value.clone(),
                delta,
                tolerance,
                unit,
                token,
                possible_cause,
                unbound,
                gap: GapSuggestion {
                    title: String::new(),
                    labels: Vec::new(),
                },
            });
        }
    }
    // The container grows with the label, so a width that differs when the label width does
    // may be the same estimate.
    if out
        .differences
        .iter()
        .any(|d| d.possible_cause == Some(R2_CAUSE))
    {
        for d in out.differences.iter_mut().filter(|d| d.property == "width") {
            d.possible_cause = Some(R2_CAUSE);
        }
    }
    for d in &mut out.differences {
        d.gap = gap_for(&component, platform, d);
    }
    out
}

fn show(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n
            .as_f64()
            .map(|f| format!("{}", (f * 100.0).round() / 100.0))
            .unwrap_or_default(),
        other => other.to_string(),
    }
}

fn gap_for(component: &str, platform: &str, d: &Difference) -> GapSuggestion {
    let r2 = d.possible_cause.is_some();
    let layer = if r2 {
        "renderer"
    } else if d.token.is_some() {
        "token"
    } else {
        "recipe"
    };
    let disp = if r2 { "fix-renderer" } else { "needs-design" };
    GapSuggestion {
        title: format!(
            "{component}: {} {} is {} in design-data, {} on {platform}",
            d.part,
            d.property,
            show(&d.expected),
            show(&d.measured)
        ),
        labels: vec![
            format!("comp:{component}"),
            format!("layer:{layer}"),
            "kind:source-conflict".into(),
            format!("disp:{disp}"),
            "needs-decision".into(),
        ],
    }
}

/// Compare `measured` with `scenes` (id → scene JSON). `tolerances` overrides the file's.
pub fn compare(
    scenes: &BTreeMap<String, Value>,
    measured: &MeasuredFile,
    tolerances: Option<Tolerances>,
) -> Result<Report, String> {
    if measured.format != MEASURED_FORMAT {
        return Err(format!(
            "measured file format must be '{MEASURED_FORMAT}', got '{}'",
            measured.format
        ));
    }
    let tol = tolerances.or(measured.tolerances).unwrap_or_default();
    let platform = measured
        .source
        .get("platform")
        .and_then(Value::as_str)
        .unwrap_or("the platform");
    let mut states = Vec::new();
    let mut without_scene = Vec::new();
    for m in &measured.states {
        match scenes.get(&m.id) {
            Some(scene) => states.push(compare_state(&m.id, scene, m, &tol, platform)),
            None => without_scene.push(m.id.clone()),
        }
    }
    let summary = Summary {
        states: states.len(),
        compared: states.iter().map(|s| s.compared).sum(),
        differences: states.iter().map(|s| s.differences.len()).sum(),
        skipped: states.iter().map(|s| s.skipped.len()).sum(),
    };
    Ok(Report {
        format: REPORT_FORMAT,
        source: measured.source.clone(),
        tolerances: tol,
        scenes_without_measurement: scenes
            .keys()
            .filter(|k| !measured.states.iter().any(|m| &m.id == *k))
            .cloned()
            .collect(),
        states,
        states_without_scene: without_scene,
        summary,
    })
}

/// A Markdown report: a summary, one table per state, and the gap-bead candidates.
pub fn to_markdown(r: &Report) -> String {
    let mut s = String::from("# Design-data vs platform comparison\n\n");
    if let Some(p) = r.source.get("platform").and_then(Value::as_str) {
        s += &format!("Platform: {p}\n\n");
    }
    s += &format!(
        "{} state(s), {} value(s) compared, **{} difference(s)**, {} skipped. \
         Tolerances: size ±{}, font size ±{}, font weight ±{}, colour ±{} (of 255).\n\n",
        r.summary.states,
        r.summary.compared,
        r.summary.differences,
        r.summary.skipped,
        r.tolerances.size,
        r.tolerances.font_size,
        r.tolerances.font_weight,
        r.tolerances.color,
    );
    for (title, ids) in [
        ("Measured states with no scene", &r.states_without_scene),
        ("Scenes with no measurement", &r.scenes_without_measurement),
    ] {
        if !ids.is_empty() {
            s += &format!("{title}: {}\n\n", ids.join(", "));
        }
    }
    let mut gaps = Vec::new();
    for st in &r.states {
        if st.differences.is_empty() && st.skipped.is_empty() {
            continue;
        }
        s += &format!("## {} (`{}`)\n\n", st.id, st.component);
        if !st.differences.is_empty() {
            s += "| Part | Property | Design data | Measured | Delta | Token | Note |\n|---|---|---|---|---|---|---|\n";
            for d in &st.differences {
                let note = if d.possible_cause.is_some() {
                    "possibly caused by the R2 text-width estimate"
                } else if d.unbound {
                    "unbound: the scene value is not token-bound"
                } else {
                    ""
                };
                s += &format!(
                    "| {} | {} | {} | {} | {} | {} | {note} |\n",
                    d.part,
                    d.property,
                    show(&d.expected),
                    show(&d.measured),
                    format_args!("{} {}", show(&json!(d.delta)), d.unit),
                    d.token.as_deref().unwrap_or(""),
                );
                gaps.push(&d.gap);
            }
            s += "\n";
        }
        if !st.skipped.is_empty() {
            s += "Skipped:\n\n";
            for k in &st.skipped {
                s += &format!("- {}.{}: {}\n", k.part, k.property, k.reason);
            }
            s += "\n";
        }
    }
    if !gaps.is_empty() {
        s += "## Gap bead candidates\n\nSuggested only; triage confirms the labels.\n\n";
        for g in gaps {
            s += &format!("- {} — `{}`\n", g.title, g.labels.join(" "));
        }
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scene() -> Value {
        json!({
            "component": "button",
            "nodes": [
                {"part": "container", "kind": "box", "w": 95.0, "h": 39.0, "radius": 19.5,
                 "radii": [19.5, 19.5, 4.0, 0.0], "stroke": "rgb(0, 0, 0)", "stroke_width": 2.0,
                 "fill": "rgb(59, 99, 251)", "font_size": 0.0, "font_weight": null, "color": null,
                 "tokens": [{"prop": "fill", "token": "button-accent-background-color-default"},
                            {"prop": "gap", "token": "button-gap"},
                            {"prop": "strokeWidth", "token": "button-border-width"},
                            {"prop": "cornerRadiusEndEnd", "token": "button-corner-radius-end-end"}]},
                {"part": "label", "kind": "text", "w": 47.0, "h": 23.0, "radius": 0.0,
                 "fill": null, "font_size": 18.0, "font_weight": "600", "color": "rgb(255, 255, 255)",
                 "tokens": []}
            ],
            "layout": {"gap": 8.0, "padding": [4.0, 14.0, 4.0, 14.0]},
            "measurements": [
                {"kind": "padding", "part": "container", "prop": "paddingInlineStart",
                 "x": 0.0, "y": 0.0, "w": 14.0, "h": 39.0,
                 "token": {"prop": "paddingInlineStart", "token": "button-md-h-padding"}}
            ]
        })
    }

    fn measured(parts: Value) -> MeasuredFile {
        serde_json::from_value(json!({
            "format": MEASURED_FORMAT,
            "source": {"platform": "react-spectrum-s2"},
            "states": [{"id": "s1", "parts": parts}]
        }))
        .unwrap()
    }

    fn run(parts: Value, tol: Option<Tolerances>) -> Report {
        let scenes = BTreeMap::from([("s1".to_string(), scene())]);
        compare(&scenes, &measured(parts), tol).unwrap()
    }

    #[test]
    fn values_within_tolerance_are_clean() {
        let r = run(
            json!({
                "container": {"width": 95.8, "height": 39, "cornerRadius": 20, "fill": "rgb(60, 100, 250)", "paddingLeft": 14},
                "label": {"fontSize": 18, "fontWeight": 600, "color": "#fff"}
            }),
            None,
        );
        assert!(r.is_clean(), "{r:#?}");
        assert_eq!(r.summary.compared, 8);
    }

    #[test]
    fn sizes_beyond_tolerance_differ_and_tolerances_are_configurable() {
        let parts = json!({"container": {"height": 41}});
        let r = run(parts.clone(), None);
        let d = &r.states[0].differences[0];
        assert_eq!((d.property.as_str(), d.delta), ("height", 2.0));
        assert_eq!(d.gap.labels[0], "comp:button");
        assert_eq!(d.gap.labels[1], "layer:recipe");
        let mut loose = Tolerances::default();
        loose.set("size", 2.0).unwrap();
        assert!(run(parts, Some(loose)).is_clean());
        assert!(Tolerances::default().set("nope", 1.0).is_err());
        assert!(Tolerances::default().set("size", -1.0).is_err());
    }

    #[test]
    fn colour_and_weight_differences_and_token_layer() {
        let r = run(
            json!({"container": {"fill": "rgb(0, 0, 0)"}, "label": {"fontWeight": "bold"}}),
            None,
        );
        let diffs = &r.states[0].differences;
        let fill = diffs.iter().find(|d| d.property == "fill").unwrap();
        assert_eq!(fill.unit, "channel");
        assert_eq!(
            fill.token.as_deref(),
            Some("button-accent-background-color-default")
        );
        assert!(fill.gap.labels.contains(&"layer:token".to_string()));
        let w = diffs.iter().find(|d| d.property == "fontWeight").unwrap();
        assert_eq!(w.delta, 100.0);
    }

    #[test]
    fn label_and_container_width_differences_are_flagged_as_possible_r2() {
        let r = run(
            json!({"label": {"width": 41.4}, "container": {"width": 90}}),
            None,
        );
        let diffs = &r.states[0].differences;
        assert_eq!(diffs.len(), 2);
        assert!(diffs.iter().all(|d| d.possible_cause == Some(R2_CAUSE)));
        assert!(diffs[0].gap.labels.contains(&"layer:renderer".to_string()));
        assert!(to_markdown(&r).contains("R2 text-width estimate"));
        // A container width alone is not flagged.
        let alone = run(json!({"container": {"width": 90}}), None);
        assert_eq!(alone.states[0].differences[0].possible_cause, None);
    }

    #[test]
    fn unmatched_things_are_reported_not_compared() {
        let r = run(
            json!({"ghost": {"width": 1}, "label": {"gap": 8, "paddingTop": 4}, "container": {"nope": 1}}),
            None,
        );
        assert!(r.is_clean());
        assert_eq!(r.summary.compared, 0);
        assert_eq!(r.summary.skipped, 4);
        let md = to_markdown(&r);
        assert!(md.contains("scene has no part 'ghost'"), "{md}");

        let scenes = BTreeMap::from([("other".to_string(), scene())]);
        let r = compare(&scenes, &measured(json!({})), None).unwrap();
        assert_eq!(r.states_without_scene, ["s1"]);
        assert_eq!(r.scenes_without_measurement, ["other"]);
        assert!(!r.is_clean());
    }

    #[test]
    fn wrong_format_is_rejected() {
        let mut m = measured(json!({}));
        m.format = "nope".into();
        assert!(compare(&BTreeMap::new(), &m, None).is_err());
    }

    #[test]
    fn colour_parsing() {
        let c = |s| parse_color(s).unwrap();
        assert_eq!(c("#fff"), c("rgb(255 255 255)"));
        assert_eq!(c("rgba(0, 0, 0, 0.5)"), c("rgb(0 0 0 / 50%)"));
        assert_eq!(c("#00000080").a, 128.0 / 255.0);
        assert_eq!(c("none"), Rgba::CLEAR);
        assert!(parse_color("currentColor").is_none());
        assert_eq!(c("rgb(0,0,0)").distance(c("rgba(0,0,0,0.5)")), 127.5);
    }

    fn diff<'a>(r: &'a Report, property: &str) -> &'a Difference {
        r.states[0]
            .differences
            .iter()
            .find(|d| d.property == property)
            .unwrap_or_else(|| panic!("no difference for {property}: {r:#?}"))
    }

    #[test]
    fn gap_is_compared_with_the_container_gap_and_its_token() {
        let r = run(json!({"container": {"gap": 8}}), None);
        assert!(r.is_clean());
        assert_eq!(r.summary.compared, 1);
        let r = run(json!({"container": {"gap": 6}}), None);
        let d = diff(&r, "gap");
        assert_eq!((d.delta, d.token.as_deref()), (-2.0, Some("button-gap")));
    }

    #[test]
    fn gap_is_skipped_without_two_children_or_off_the_container() {
        let mut s = scene();
        s["layout"] = json!({"padding": [0, 0, 0, 0]});
        let scenes = BTreeMap::from([("s1".to_string(), s)]);
        let r = compare(&scenes, &measured(json!({"container": {"gap": 8}})), None).unwrap();
        assert_eq!((r.summary.compared, r.summary.skipped), (0, 1));
    }

    #[test]
    fn border_width_and_stroke_are_compared() {
        let r = run(
            json!({"container": {"borderWidth": 0, "stroke": "rgb(0, 0, 0)"}}),
            None,
        );
        assert_eq!(r.summary.compared, 2);
        let d = diff(&r, "borderWidth");
        assert_eq!(
            (d.delta, d.token.as_deref()),
            (-2.0, Some("button-border-width"))
        );
        assert!(run(json!({"container": {"strokeWidth": 2}}), None).is_clean());
        let r = run(json!({"container": {"stroke": "none"}}), None);
        assert_eq!(diff(&r, "stroke").unit, "channel");
        // A stroke colour without a width is not drawn, so it is compared as none.
        let mut s = scene();
        s["nodes"][0]["stroke_width"] = json!(0.0);
        let scenes = BTreeMap::from([("s1".to_string(), s)]);
        let m = measured(json!({"container": {"stroke": "none"}}));
        assert!(compare(&scenes, &m, None).unwrap().is_clean());
    }

    #[test]
    fn per_corner_radii_use_radii_or_fall_back_to_the_uniform_radius() {
        let r = run(
            json!({"container": {
                "cornerRadiusTopLeft": 19.5, "cornerRadiusTopRight": 19.5,
                "cornerRadiusBottomRight": 8, "cornerRadiusBottomLeft": 0
            }}),
            None,
        );
        assert_eq!(r.summary.compared, 4);
        let d = diff(&r, "cornerRadiusBottomRight");
        assert_eq!(
            (d.expected.clone(), d.delta, d.token.as_deref()),
            (json!(4.0), 4.0, Some("button-corner-radius-end-end"))
        );
        assert_eq!(r.summary.differences, 1);

        let mut s = scene();
        s["nodes"][0]["radii"] = Value::Null;
        let scenes = BTreeMap::from([("s1".to_string(), s)]);
        let m = measured(json!({"container": {"cornerRadiusBottomLeft": 19.5}}));
        assert!(compare(&scenes, &m, None).unwrap().is_clean());
    }

    #[test]
    fn unbound_padding_is_compared_from_the_solved_layout_and_labelled() {
        // paddingLeft is token-bound in the scene; paddingTop is a literal.
        let r = run(
            json!({"container": {"paddingLeft": 14, "paddingTop": 6}}),
            None,
        );
        assert_eq!(r.summary.compared, 2);
        let d = diff(&r, "paddingTop");
        assert!(d.unbound && d.token.is_none());
        assert_eq!((d.expected.clone(), d.delta), (json!(4.0), 2.0));
        assert!(to_markdown(&r).contains("unbound"));
        // A token-bound padding that resolves to 0 has no measurement but keeps its token.
        let mut s = scene();
        s["layout"]["padding"] = json!([0, 14, 4, 14]);
        s["nodes"][0]["tokens"]
            .as_array_mut()
            .unwrap()
            .push(json!({"prop": "paddingBlockStart", "token": "button-zero-pad"}));
        let scenes = BTreeMap::from([("s1".to_string(), s)]);
        let m = measured(json!({"container": {"paddingTop": 3}}));
        let r = compare(&scenes, &m, None).unwrap();
        let d = diff(&r, "paddingTop");
        assert!(!d.unbound);
        assert_eq!(d.token.as_deref(), Some("button-zero-pad"));
        // A zero literal padding is still checked.
        let mut s = scene();
        s["layout"]["padding"] = json!([0, 0, 0, 14]);
        let scenes = BTreeMap::from([("s1".to_string(), s)]);
        let r = compare(
            &scenes,
            &measured(json!({"container": {"paddingRight": 0}})),
            None,
        )
        .unwrap();
        assert_eq!((r.summary.compared, r.is_clean()), (1, true));
    }
}
