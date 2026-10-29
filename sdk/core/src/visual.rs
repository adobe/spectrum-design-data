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
}

/// The label scenes and compiled recipes use for a token record.
pub fn token_label(rec: &crate::graph::TokenRecord) -> String {
    Ctx::token_label(rec)
}

/// A token a resolved value came from, kept for overlays and debugging.
#[derive(Debug, Clone, Serialize)]
pub struct TokenRef {
    pub prop: String,
    pub token: String,
    pub value: String,
    pub chain: Vec<String>,
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
    pub color: Option<String>,
    /// Built-in glyph an `icon` node draws (`checkmark`, `dash`); unset draws the placeholder.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub glyph: Option<String>,
    pub tokens: Vec<TokenRef>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Scene {
    pub component: String,
    pub width: f64,
    pub height: f64,
    /// Uniform scale-down about the container center (the S2 pressed effect).
    pub press: Option<Press>,
    pub nodes: Vec<SceneNode>,
    pub diagnostics: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Press {
    /// Part the scale applies to; the whole scene when absent.
    pub part: Option<String>,
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
}

impl Resolved {
    fn num(&self) -> Option<f64> {
        let s = self.value.trim();
        s.trim_end_matches("px").trim().parse().ok()
    }
}

struct Ctx<'a> {
    graph: &'a TokenGraph,
    req: &'a RenderRequest,
    size_index: String,
    option_defaults: HashMap<String, Value>,
    /// Component-scoped values that live in relationship files (see `scoped_values`).
    scoped: &'a [crate::graph::TokenRecord],
    diags: Vec<String>,
}

/// Relationship records that carry their own `value` (a component-scoped token such as a
/// switch track width), shaped as token records so they rank and resolve like tokens. The
/// relationship's `options` become name fields, so `size`, `scale` and `state` filter them.
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

fn value_to_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

impl<'a> Ctx<'a> {
    fn template(&self, s: &str) -> String {
        s.replace("{sizeIndex}", &self.size_index)
            .replace("{size}", &self.req.size)
    }

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
        self.when_score(part.get("visibleWhen")).is_some()
    }

    fn eval(&mut self, prop: &str, source: Option<&Value>) -> Option<Resolved> {
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
            });
        }
        let mut out = if let Some(sel) = chosen.get("token") {
            self.resolve_token(prop, sel)
        } else if let Some(rel) = chosen.get("relationship") {
            self.resolve_relationship(prop, rel)
        } else {
            None
        };
        if let Some(r) = out.as_mut() {
            r.relative_to = relative_to;
        }
        out
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
                Some(have) => *have == want,
                None => false,
            }
        })
    }

    /// Interaction states plus option-derived ones, with `default` when idle.
    fn active_states(&self) -> Vec<String> {
        let mut active = self.req.states.clone();
        if self.option("isDisabled") == Value::Bool(true) {
            active.push("disabled".into());
        }
        if self.option("isSelected") == Value::Bool(true) {
            active.push("selected".into());
        }
        if self.req.states.is_empty() {
            active.push("default".into());
        }
        active
    }

    /// Mode-compatible candidates, best fit first. Candidates that contradict the
    /// mode context are dropped; ties prefer the fewest extra name fields.
    fn rank<'g>(
        &self,
        cands: Vec<&'g crate::graph::TokenRecord>,
    ) -> Vec<&'g crate::graph::TokenRecord> {
        let mut mctx = self.mode_ctx();
        mctx.insert("size".into(), self.req.size.clone());
        let mut fit: Vec<_> = cands
            .into_iter()
            .filter(|t| {
                mctx.iter().all(|(k, v)| {
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
        fit.sort_by(|a, b| {
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

    /// Pick the best-ranked candidate, preferring ones whose `state` agrees with the
    /// request. The preference only narrows: if none agree, the best-ranked wins.
    fn pick<'g>(
        &self,
        cands: Vec<&'g crate::graph::TokenRecord>,
    ) -> Option<&'g crate::graph::TokenRecord> {
        let fit = self.rank(cands);
        let active = self.active_states();
        fit.iter()
            .copied()
            .find(|t| {
                let st = token_states(t);
                !st.is_empty() && st.iter().all(|x| active.contains(x))
            })
            .or_else(|| fit.first().copied())
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
            out.push(Self::token_label(next));
            cur = next;
        }
        out
    }

    fn token_label(rec: &crate::graph::TokenRecord) -> String {
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
        let find = |sel: &serde_json::Map<String, Value>| -> Vec<&'a crate::graph::TokenRecord> {
            graph
                .tokens
                .values()
                .filter(|t| {
                    t.raw
                        .get("name")
                        .is_some_and(|n| self.matches_selector(n, sel))
                })
                .collect()
        };
        let mut cands = find(&sel_obj);
        // A bare `font-size-{n}` style property may also be encoded as property + scaleIndex.
        if cands.is_empty() {
            if let Some(Value::String(p)) = sel_obj.get("property") {
                if let Some((base, idx)) = p.rsplit_once('-') {
                    if let Ok(i) = idx.parse::<u64>() {
                        let mut alt = sel_obj.clone();
                        alt.insert("property".into(), Value::String(base.into()));
                        alt.insert("scaleIndex".into(), Value::from(i));
                        cands = find(&alt);
                    }
                }
            }
        }
        Some((cands, sel_obj))
    }

    /// Tokens bound to this component by a relationship, plus its templated
    /// property and trimmed context.
    fn relationship_cands(
        &self,
        rel: &Value,
    ) -> Option<(Vec<&'a crate::graph::TokenRecord>, String, String)> {
        let property = self.template(rel.get("property")?.as_str()?);
        let context = rel.get("context")?.as_str()?.trim().to_string();
        let mut cands = Vec::new();
        for r in &self.graph.relationships {
            let scope = r.raw.get("scope");
            let comp = scope
                .and_then(|s| s.get("component"))
                .and_then(Value::as_str);
            let p = scope
                .and_then(|s| s.get("property"))
                .and_then(Value::as_str);
            let c = r.raw.get("context").and_then(Value::as_str).map(str::trim);
            if comp == Some(&self.req.component)
                && p == Some(property.as_str())
                && c == Some(context.as_str())
            {
                if let Some(rf) = r.raw.get("$ref").and_then(Value::as_str) {
                    if let Some(t) = self.graph.resolve_alias_key(rf) {
                        cands.push(t);
                    } else if let Some(t) =
                        self.scoped.iter().find(|t| t.uuid.as_deref() == Some(rf))
                    {
                        cands.push(t);
                    }
                }
            }
        }
        Some((cands, property, context))
    }

    fn resolve_token(&mut self, prop: &str, sel: &Value) -> Option<Resolved> {
        let (cands, sel_obj) = self.token_cands(sel)?;
        let Some(rec) = self.pick(cands) else {
            self.diags.push(format!(
                "{prop}: no token matches {}",
                Value::Object(sel_obj)
            ));
            return None;
        };
        let value = self.terminal(rec)?;
        Some(Resolved {
            value,
            token: Self::token_label(rec),
            relative_to: None,
            chain: self.alias_chain(rec),
        })
    }

    fn resolve_relationship(&mut self, prop: &str, rel: &Value) -> Option<Resolved> {
        let (cands, property, context) = self.relationship_cands(rel)?;
        let Some(rec) = self.pick(cands) else {
            self.diags.push(format!(
                "{prop}: no relationship '{property}' / '{context}'"
            ));
            return None;
        };
        let value = self.terminal(rec)?;
        Some(Resolved {
            value,
            token: Self::token_label(rec),
            relative_to: None,
            chain: self.alias_chain(rec),
        })
    }
}

/// A token's `name.state` as individual state ids. Legacy compound ids such as
/// `selected-key-focus` split into `selected` + `keyboard-focus`.
fn token_states(t: &crate::graph::TokenRecord) -> Vec<String> {
    let mut out = Vec::new();
    let raw = match t.raw.get("name").and_then(|n| n.get("state")) {
        Some(Value::String(s)) => vec![s.clone()],
        Some(Value::Array(a)) => a
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        _ => Vec::new(),
    };
    for s in raw {
        let rest = s.strip_prefix("selected-");
        if rest.is_some() {
            out.push("selected".to_string());
        }
        let r = rest.unwrap_or(&s);
        out.push(if r == "key-focus" {
            "keyboard-focus".into()
        } else {
            r.to_string()
        });
    }
    out
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
/// (`structural`) and the rest. `size` counts as used when the recipe has a `sizeScale`.
pub fn recipe_options(recipe: &Value) -> (Vec<String>, Vec<String>) {
    fn walk(v: &Value, in_visible: bool, used: &mut Vec<String>, structural: &mut Vec<String>) {
        match v {
            Value::Array(a) => a.iter().for_each(|x| walk(x, in_visible, used, structural)),
            Value::Object(o) => {
                for (k, x) in o {
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
    let option_defaults: serde_json::Map<String, Value> = graph
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
        .unwrap_or_default();

    let scoped = scoped_values(graph, component);
    let mut variants = serde_json::Map::new();
    for (size, idx) in scale {
        for mode in modes {
            let req = RenderRequest {
                component: component.into(),
                size: size.clone(),
                mode: mode.clone(),
                ..Default::default()
            };
            let cx = Ctx {
                graph,
                req: &req,
                size_index: value_to_string(idx).unwrap_or_default(),
                option_defaults: HashMap::new(),
                scoped: &scoped,
                diags: Vec::new(),
            };
            let mut out_parts = parts.clone();
            for part in out_parts.values_mut() {
                if let Some(inset) = part.get_mut("placement").and_then(|p| p.get_mut("inset")) {
                    match inset {
                        Value::Array(entries) => entries
                            .iter_mut()
                            .for_each(|e| compile_source(&cx, "inset", e)),
                        other => compile_source(&cx, "inset", other),
                    }
                }
                if let Some(props) = part.get_mut("props").and_then(Value::as_object_mut) {
                    for (name, source) in props.iter_mut() {
                        match source {
                            Value::Array(entries) => entries
                                .iter_mut()
                                .for_each(|e| compile_source(&cx, name, e)),
                            other => compile_source(&cx, name, other),
                        }
                    }
                }
            }
            let key = format!(
                "{size}|{}|{}",
                mode.get("colorScheme").map_or("", String::as_str),
                mode.get("scale").map_or("", String::as_str)
            );
            variants.insert(key, Value::Object(out_parts));
        }
    }
    Ok(serde_json::json!({
        "component": component,
        "root": recipe.get("root"),
        "sizeScale": recipe.get("sizeScale"),
        "optionDefaults": option_defaults,
        "variants": variants,
    }))
}

fn compile_source(cx: &Ctx, prop: &str, entry: &mut Value) {
    let Some(obj) = entry.as_object_mut() else {
        return;
    };
    let cands = if let Some(sel) = obj.get("token") {
        cx.token_cands(sel).map(|(c, sel_obj)| {
            (
                c,
                format!("{prop}: no token matches {}", Value::Object(sel_obj)),
            )
        })
    } else if let Some(rel) = obj.get("relationship") {
        cx.relationship_cands(rel)
            .map(|(c, p, ctx)| (c, format!("{prop}: no relationship '{p}' / '{ctx}'")))
    } else {
        return;
    };
    obj.remove("token");
    obj.remove("relationship");
    let (cands, miss) = cands.unwrap_or_default();
    let list: Vec<Value> = cx
        .rank(cands)
        .into_iter()
        .map(|t| {
            serde_json::json!({
                "value": cx.terminal(t),
                "token": Ctx::token_label(t),
                "chain": cx.alias_chain(t),
                "states": token_states(t),
            })
        })
        .collect();
    obj.insert("candidates".into(), Value::Array(list));
    obj.insert("miss".into(), Value::String(miss));
}

/// Resolve a recipe against the graph for one request and lay it out.
pub fn build_scene(
    graph: &TokenGraph,
    recipe: &Value,
    req: &RenderRequest,
) -> Result<Scene, String> {
    let size_index = recipe
        .get("sizeScale")
        .and_then(|s| s.get(&req.size))
        .and_then(value_to_string)
        .ok_or_else(|| format!("recipe has no sizeScale entry for size '{}'", req.size))?;
    let option_defaults = graph
        .components
        .iter()
        .find(|c| c.name == req.component)
        .and_then(|c| c.raw.get("options"))
        .and_then(Value::as_object)
        .map(|o| {
            o.iter()
                .filter_map(|(k, v)| v.get("default").map(|d| (k.clone(), d.clone())))
                .collect()
        })
        .unwrap_or_default();
    let scoped = scoped_values(graph, &req.component);
    let mut cx = Ctx {
        graph,
        req,
        size_index,
        option_defaults,
        scoped: &scoped,
        diags: Vec::new(),
    };

    let parts = recipe
        .get("parts")
        .and_then(Value::as_object)
        .ok_or("recipe has no parts")?;
    let root_id = recipe
        .get("root")
        .and_then(Value::as_str)
        .ok_or("recipe has no root")?;
    let root = parts.get(root_id).ok_or("root part not found")?;
    let rp = |cx: &mut Ctx, part: &Value, name: &str| -> Option<Resolved> {
        cx.eval(name, part.get("props").and_then(|p| p.get(name)))
    };

    let mut container_tokens = Vec::new();
    let track = |tokens: &mut Vec<TokenRef>, prop: &str, r: &Option<Resolved>| {
        if let Some(r) = r {
            if !r.token.is_empty() {
                tokens.push(TokenRef {
                    prop: prop.into(),
                    token: r.token.clone(),
                    value: r.value.clone(),
                    chain: r.chain.clone(),
                });
            }
        }
    };

    let height = rp(&mut cx, root, "height");
    let pad_s = rp(&mut cx, root, "paddingInlineStart");
    let pad_e = rp(&mut cx, root, "paddingInlineEnd");
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
        ("gap", &gap),
        ("cornerRadius", &radius),
        ("fill", &fill),
    ] {
        track(&mut container_tokens, n, r);
    }
    let h = height.as_ref().and_then(Resolved::num).unwrap_or(32.0);
    let pad_s = pad_s.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let pad_e = pad_e.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let gap = gap.as_ref().and_then(Resolved::num).unwrap_or(0.0);
    let press_diff = rp(&mut cx, root, "pressDifference");
    let press_ratio = rp(&mut cx, root, "pressWidthRatio");
    let press_min = rp(&mut cx, root, "pressMinPerspective");
    let press_max = rp(&mut cx, root, "pressMaxPerspective");
    for (n, r) in [
        ("pressDifference", &press_diff),
        ("pressWidthRatio", &press_ratio),
        ("pressMinPerspective", &press_min),
        ("pressMaxPerspective", &press_max),
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
        color: Option<String>,
        stroke: Option<String>,
        radius: Option<Resolved>,
        tokens: Vec<TokenRef>,
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
            color: color.map(|c| c.value),
            stroke: None,
            radius: None,
            tokens,
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
                c.font_size = fs.as_ref().and_then(Resolved::num).unwrap_or(14.0);
                c.font_weight = fw.map(|f| f.value);
                let text = req.label.clone();
                c.w = text_width(&text, c.font_size);
                c.h = c.font_size * 1.3;
                c.text = Some(text);
            }
            _ => {}
        }
        flow.push(c);
    }

    let inner: f64 =
        flow.iter().map(|c| c.w).sum::<f64>() + gap * flow.len().saturating_sub(1) as f64;
    let w = pad_s + inner + pad_e;

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
        color: None,
        glyph: None,
        tokens: container_tokens,
    }];

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
    let mut x = ox + pad_s;
    for c in flow {
        let (cx0, cy0, cw, ch) = (x, oy + (h - c.h) / 2.0, c.w, c.h);
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
            fill: None,
            stroke: c.stroke,
            stroke_width: 0.0,
            radius: 0.0,
            radii: None,
            text: c.text,
            font_size: c.font_size,
            font_weight: c.font_weight,
            color: c.color,
            glyph: None,
            tokens: c.tokens,
        };
        if c.kind == "box" {
            own.radius = px(&c.radius, ch);
        }
        nodes.push(own);
        x += cw + gap;

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
                // An icon inside a box is centered on both axes and draws its `glyph`.
                let color = rp(&mut cx, np, "color");
                track(&mut tokens, "width", &nw);
                track(&mut tokens, "height", &nh);
                track(&mut tokens, "color", &color);
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
                    color: color.map(|c| c.value),
                    glyph: np.get("glyph").and_then(Value::as_str).map(String::from),
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
                radius: px(&nradius, h2),
                radii: None,
                text: None,
                font_size: 0.0,
                font_weight: None,
                color: None,
                glyph: None,
                tokens,
            });
        }
    }

    for (id, part) in placed {
        let inset = cx
            .eval("inset", part.get("placement").and_then(|p| p.get("inset")))
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
            color: color.map(|c| c.value),
            glyph: None,
            tokens,
        });
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
            color: None,
            glyph: None,
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
            Some(Press {
                scale: p / (p - z),
                cx: target.x + target.w / 2.0,
                cy: target.y + target.h / 2.0,
                part,
            })
        }
        _ => None,
    };

    Ok(Scene {
        component: req.component.clone(),
        width: w + 2.0 * RING_MARGIN,
        height: h + 2.0 * RING_MARGIN,
        press,
        nodes,
        diagnostics: cx.diags,
    })
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

/// SVG needs numeric weights; tokens carry names such as `medium`.
fn css_font_weight(w: Option<&str>) -> String {
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

/// Serialize a scene as SVG. Parts carry `data-part`; token bindings are `data-tokens`.
pub fn scene_to_svg(scene: &Scene) -> String {
    let mut s = String::new();
    let _ = write!(
        s,
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">",
        w = scene.width,
        h = scene.height
    );
    let press_open = |p: &Press| {
        format!(
            "<g transform=\"translate({} {}) scale({}) translate({} {})\">",
            p.cx, p.cy, p.scale, -p.cx, -p.cy
        )
    };
    if let Some(p) = scene.press.as_ref().filter(|p| p.part.is_none()) {
        s.push_str(&press_open(p));
    }
    for n in &scene.nodes {
        let pressed = scene
            .press
            .as_ref()
            .filter(|p| p.part.as_deref() == Some(n.part.as_str()));
        if let Some(p) = pressed {
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
                    "<text {attrs} x=\"{}\" y=\"{}\" font-family=\"adobe-clean-spectrum-vf, Adobe Clean, Source Sans 3, sans-serif\" font-size=\"{}\" font-weight=\"{}\" dominant-baseline=\"central\" fill=\"{}\">{}</text>",
                    n.x,
                    n.y + n.h / 2.0,
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
            "icon" if matches!(n.glyph.as_deref(), Some("checkmark" | "dash")) => {
                let color = esc(n.color.as_deref().unwrap_or("currentColor"));
                if n.glyph.as_deref() == Some("dash") {
                    let _ = write!(
                        s,
                        "<rect {attrs} x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\" fill=\"{color}\"/>",
                        n.x,
                        n.y,
                        n.w,
                        n.h,
                        n.h / 2.0
                    );
                } else {
                    let sw = (n.w * 0.16).max(1.0);
                    let _ = write!(
                        s,
                        "<path {attrs} d=\"M{} {}L{} {}L{} {}\" stroke=\"{color}\" stroke-width=\"{sw}\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>",
                        n.x + n.w * 0.1,
                        n.y + n.h * 0.55,
                        n.x + n.w * 0.38,
                        n.y + n.h * 0.82,
                        n.x + n.w * 0.9,
                        n.y + n.h * 0.2
                    );
                }
            }
            "icon" => {
                // Built-in placeholder glyph (a plus) sized to the part box.
                let (cx, cy) = (n.x + n.w / 2.0, n.y + n.h / 2.0);
                let r = n.w.min(n.h) * 0.35;
                let _ = write!(
                    s,
                    "<path {attrs} d=\"M{} {}H{}M{} {}V{}\" stroke=\"{}\" stroke-width=\"{}\" stroke-linecap=\"round\" fill=\"none\"/>",
                    cx - r,
                    cy,
                    cx + r,
                    cx,
                    cy - r,
                    cy + r,
                    esc(n.color.as_deref().unwrap_or("currentColor")),
                    (n.w / 10.0).max(1.0)
                );
            }
            _ => {}
        }
        if pressed.is_some() {
            s.push_str("</g>");
        }
    }
    if scene.press.as_ref().is_some_and(|p| p.part.is_none()) {
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
        );
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
        let (control, b) = (part(&off, "control").unwrap(), part(&off, "box").unwrap());
        assert_eq!(
            (control.w, control.h, b.radius, b.stroke_width),
            (16.0, 16.0, 4.0, 2.0)
        );
        assert_eq!(b.fill.as_deref(), Some("rgb(255, 255, 255)"));
        assert_eq!(b.stroke.as_deref(), Some("rgb(41, 41, 41)"));
        assert!(part(&off, "checkmark").is_none() && part(&off, "dash").is_none());
        let label = part(&off, "label").unwrap();
        assert_eq!(
            label.x - (control.x + control.w),
            6.0,
            "control to label gap"
        );

        let on = scene("m", &["isSelected"], &[]);
        assert!(on.diagnostics.is_empty(), "{:?}", on.diagnostics);
        let (b, mark) = (part(&on, "box").unwrap(), part(&on, "checkmark").unwrap());
        assert_eq!(
            (b.stroke_width, b.fill.as_deref()),
            (0.0, Some("rgb(41, 41, 41)"))
        );
        assert_eq!((mark.w, mark.glyph.as_deref()), (10.0, Some("checkmark")));
        assert_eq!(mark.x + mark.w / 2.0, b.x + b.w / 2.0, "mark is centered");
        assert_eq!(mark.color.as_deref(), Some("rgb(255, 255, 255)"));

        let both = scene("m", &["isSelected", "isIndeterminate"], &[]);
        assert!(
            part(&both, "checkmark").is_none(),
            "indeterminate wins over selected"
        );
        let dash = part(&both, "dash").unwrap();
        assert_eq!(
            (dash.w, dash.h, dash.glyph.as_deref()),
            (7.5, 1.25, Some("dash"))
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
            assert_eq!(part(&s, "control").unwrap().w, control, "{size} control");
            assert_eq!(part(&s, "checkmark").unwrap().w, mark, "{size} checkmark");
        }

        let focus = scene("m", &[], &["keyboard-focus"]);
        assert!(part(&focus, "focus-indicator").unwrap().x < part(&focus, "box").unwrap().x);
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
        assert!(scene_to_svg(&focus).contains("data-part=\"focus-ring\""));
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
            .any(|e| !e["candidates"].as_array().unwrap().is_empty()));
        let (used, structural) = recipe_options(&recipe);
        assert!(used.contains(&"isPending".to_string()));
        assert!(structural.contains(&"isPending".to_string()));
    }
}
