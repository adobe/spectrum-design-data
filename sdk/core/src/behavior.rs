// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Reference runner for behavior contract conformance vectors (proposal 022, "Running them").
//!
//! It executes a vector (start options, intent steps, expected facets and events) against the
//! contract's own state machine tables: no browser, no clock, fully deterministic. A platform
//! adapter runs the same vectors against a real implementation; this runner runs them against the
//! data model, so a contract and its vectors cannot disagree silently.
//!
//! Semantics, in one place:
//!
//! * Options are the state. A missing option reads as `false`; an environment property
//!   (`environment.json`, for example `direction`) starts at its registered initial value.
//! * A facet's value is the first `values` entry whose option match holds.
//! * An intent fires the first transition whose `on` matches, whose `via` (when set) equals the
//!   step's `via`, whose `needs` the runner has and whose `guard` holds. Guards and `not` values
//!   read the facets from before the step. Transitions come from the contract, then from the
//!   patterns it extends: the event intents (`focus`, `blur`, `press-*`, `pointer-*`) are
//!   transitions of the `interactive` pattern that `set` the interaction facets it publishes
//!   (`hovered`, `pressed`, `focusVisible`), and `raise: press` fires the `press` intent of the
//!   first part that declares one. Nothing about them is built in.
//! * A facet's `blocksInteraction` (facets registry) makes the listed events do nothing while the
//!   facet is `true`.
//! * An `input` step (`{ key, phase }`) is resolved through the platform's key bindings
//!   (`behaviors/bindings/<platform>.json`): the role of the contract's role-carrying part picks
//!   the entries, the key and `down`/`up` phase pick the event intents, which then run as steps
//!   `via` the keyboard. A key with no binding raises nothing, which is how "Enter does not
//!   toggle" passes.
//! * A group contract with a `collection` block runs its vectors over items: `start.items` (one
//!   option set per item) and `start.focused` give a machine `Run` per item and a logical focus
//!   index. `navigate-*` on the group moves the focus by index over items the traversal `skip`
//!   does not skip (wrapping when `wrap` is set) and, with `selectOnMove`, fires the item's
//!   `press` intent on arrival; a key step swaps ArrowLeft and ArrowRight first while the
//!   traversal `mirror` guard holds. An item's `do.choose` is applied by the group's `choose`
//!   mode and raises one group event listing the indices that are on (`behavior/group.rs`).
//! * `emit` lists the events a step raised (`{ name: { option: new value } }`), not a running
//!   total. An expected event matches exactly (same options and values). A vector may set
//!   `emitOptions: "listed"` to check only the options it lists: for a role key vector that runs on
//!   components that differ (a press that also toggles `isSelected` still matches `{ press: {} }`). A vector that needs a capability the run lacks is not applicable, neither pass nor fail.

use std::collections::{BTreeMap, HashSet};
use std::path::Path;

use serde_json::{json, Map, Value};

use crate::graph::{BehaviorPatternRecord, TokenGraph};
use crate::registry::RegistryData;
use crate::CoreError;

mod group;
use group::{Group, NAVIGATION};

const MAX_RAISE_DEPTH: usize = 8;

/// Event intents (`category: event` in the intents registry). What they do is pattern data; the
/// list only tells the runner that one with no transition is a no-op, and the spec sheet that it
/// is not a keyboard intent.
pub const INTERACTION_EVENTS: &[&str] = &[
    "focus",
    "blur",
    "press-start",
    "press-end",
    "press-cancel",
    "pointer-enter",
    "pointer-leave",
    "navigate-next",
    "navigate-previous",
    "navigate-first",
    "navigate-last",
    "move",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Status {
    Pass,
    Fail(Vec<String>),
    /// The run lacks these capabilities, so the vector neither passed nor failed.
    NotApplicable(Vec<String>),
}

#[derive(Debug, Clone)]
pub struct VectorResult {
    pub component: String,
    pub name: String,
    pub status: Status,
}

/// A contract flattened with the patterns it extends.
pub(crate) struct Machine {
    pub(crate) facets: Map<String, Value>,
    pub(crate) parts: Map<String, Value>,
    pub(crate) transitions: Vec<Value>,
    pub(crate) published: Vec<String>,
    /// The contract's own `semantics` (a pattern carries none).
    pub(crate) semantics: Map<String, Value>,
    /// The contract's own `state` list: the options a vector may start it with.
    pub(crate) state: Vec<String>,
    /// The contract's own `range` block (decision A658), read by `do.adjust`.
    pub(crate) range: Option<Value>,
    /// The contract's own `ranges`: one `range` block per axis (color-area `x` and `y`).
    pub(crate) ranges: Option<Value>,
}

fn extends(raw: &Value) -> Vec<String> {
    raw.get("extends")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|s| s.as_str().map(String::from))
        .collect()
}

pub(crate) fn flatten(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
) -> Result<Machine, String> {
    let mut chain: Vec<&Value> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let mut queue = extends(contract);
    while let Some(name) = queue.pop() {
        if !seen.insert(name.clone()) {
            continue;
        }
        let p = patterns
            .iter()
            .find(|p| p.pattern == name)
            .ok_or_else(|| format!("extends '{name}', which is not a pattern"))?;
        queue.extend(extends(&p.raw));
        chain.push(&p.raw);
    }
    let mut m = Machine {
        facets: Map::new(),
        parts: Map::new(),
        transitions: Vec::new(),
        published: Vec::new(),
        semantics: contract
            .get("semantics")
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default(),
        range: contract.get("range").cloned(),
        ranges: contract.get("ranges").cloned(),
        state: contract
            .get("state")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|s| s.as_str().map(String::from))
            .collect(),
    };
    let own = [contract];
    // Base first, so a derived pattern and then the contract override what they extend.
    for raw in chain.iter().rev().copied().chain(own) {
        for (key, into) in [("facets", &mut m.facets), ("parts", &mut m.parts)] {
            for (k, v) in raw
                .get(key)
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                into.insert(k.clone(), v.clone());
            }
        }
        m.published.extend(
            raw.get("publishes")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|s| s.as_str().map(String::from)),
        );
    }
    // The contract's own transitions win over a pattern's, so they come first.
    m.transitions.extend(
        contract
            .get("transitions")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
    );
    for raw in &chain {
        m.transitions.extend(
            raw.get("transitions")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default(),
        );
    }
    Ok(m)
}

fn option(options: &Map<String, Value>, name: &str) -> Value {
    options.get(name).cloned().unwrap_or(Value::Bool(false))
}

fn show(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn derive(
    m: &Machine,
    options: &Map<String, Value>,
    interaction: &BTreeMap<String, bool>,
) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    for (name, f) in &m.facets {
        let Some(values) = f.get("values").and_then(Value::as_object) else {
            continue;
        };
        let from: Vec<&str> = match f.get("from") {
            Some(Value::String(s)) => vec![s.as_str()],
            Some(Value::Array(a)) => a.iter().filter_map(Value::as_str).collect(),
            _ => vec![],
        };
        let hit = values
            .iter()
            .find(|(_, want)| match (want, from.as_slice()) {
                (Value::Object(o), _) => o.iter().all(|(k, v)| option(options, k) == *v),
                (Value::Array(any), [only]) => any.contains(&option(options, only)),
                (v, [only]) => option(options, only) == **v,
                _ => false,
            });
        let otherwise = f.get("otherwise").and_then(Value::as_str);
        if let Some(id) = hit.map(|(id, _)| id.as_str()).or(otherwise) {
            out.insert(name.clone(), id.to_string());
        }
    }
    for (name, on) in interaction {
        out.insert(name.clone(), on.to_string());
    }
    out
}

/// The accessibility attributes the contract's `semantics` expose in the current state: attribute
/// name to its value, `None` when absent. A facet entry (`map`) reads the facet's value; a `copy`
/// entry reads the option itself and is absent while the option is unset or `absentWhen` holds.
fn aria_state(
    m: &Machine,
    options: &Map<String, Value>,
    facets: &BTreeMap<String, String>,
) -> BTreeMap<String, Option<String>> {
    let mut out = BTreeMap::new();
    for entries in m.semantics.values().filter_map(Value::as_object) {
        for (key, sem) in entries {
            let Some(attr) = sem.get("ariaState").and_then(Value::as_str) else {
                continue;
            };
            let value = if sem.get("copy") == Some(&Value::Bool(true)) {
                let absent = sem
                    .get("absentWhen")
                    .and_then(Value::as_object)
                    .is_some_and(|w| w.iter().all(|(k, v)| options.get(k) == Some(v)));
                options.get(key).filter(|_| !absent).map(show)
            } else {
                facets
                    .get(key)
                    .and_then(|f| sem.pointer(&format!("/map/{f}")))
                    .and_then(Value::as_str)
                    .map(String::from)
            };
            out.insert(attr.to_string(), value);
        }
    }
    out
}

fn holds(guard: &Value, facets: &BTreeMap<String, String>) -> Result<bool, String> {
    if let Some(f) = guard.get("facet").and_then(Value::as_str) {
        let is = guard.get("is").and_then(Value::as_str).unwrap_or_default();
        let got = facets
            .get(f)
            .ok_or_else(|| format!("a guard reads facet '{f}', which has no value"))?;
        return Ok(got == is);
    }
    if let Some(all) = guard.get("all").and_then(Value::as_array) {
        for g in all {
            if !holds(g, facets)? {
                return Ok(false);
            }
        }
        return Ok(true);
    }
    if let Some(any) = guard.get("any").and_then(Value::as_array) {
        for g in any {
            if holds(g, facets)? {
                return Ok(true);
            }
        }
        return Ok(false);
    }
    if let Some(g) = guard.get("not") {
        return Ok(!holds(g, facets)?);
    }
    Err(format!("unreadable guard {guard}"))
}

struct Run<'a> {
    m: &'a Machine,
    registry: &'a RegistryData,
    caps: &'a HashSet<String>,
    options: Map<String, Value>,
    interaction: BTreeMap<String, bool>,
    depth: usize,
    /// An item of a group: `do.choose` is left to the group, which owns the siblings.
    in_group: bool,
    /// `(option, emit)` of each `do.choose` the group still has to apply.
    pending: Vec<(String, Option<String>)>,
    /// The logical position (0 to 1) of the `move` step being run.
    position: Option<f64>,
    /// The `axis` of the step being run: which block of `ranges` an `adjust` without its own
    /// `axis` addresses.
    axis: Option<String>,
}

/// A whole number stays whole (41, never 41.0), so a value compares and reads the same however a
/// vector or a platform wrote it. Applied recursively.
fn norm(v: &Value) -> Value {
    match v {
        Value::Number(n) => match n.as_f64() {
            Some(f) if f.fract() == 0.0 && f.abs() < 9e15 => json!(f as i64),
            _ => v.clone(),
        },
        Value::Array(a) => Value::Array(a.iter().map(norm).collect()),
        Value::Object(o) => Value::Object(o.iter().map(|(k, x)| (k.clone(), norm(x))).collect()),
        _ => v.clone(),
    }
}

impl Run<'_> {
    /// The `range` block an `adjust` addresses: the contract's `range`, or one of its `ranges`
    /// by axis (the action's own `axis`, else the step's).
    fn block(&self, own: Option<&str>) -> Result<&Value, String> {
        let axis = match (own, self.axis.as_deref()) {
            (Some(a), Some(b)) if a != b => {
                return Err(format!(
                    "the action addresses axis '{a}', but the step names axis '{b}'"
                ))
            }
            (a, b) => a.or(b),
        };
        match (&self.m.range, &self.m.ranges, axis) {
            (Some(r), None, None) => Ok(r),
            (Some(_), None, Some(a)) => Err(format!(
                "axis '{a}', but the contract has a single `range`, not `ranges`"
            )),
            (None, Some(rs), Some(a)) => rs.get(a).ok_or_else(|| {
                let known: Vec<&str> = rs
                    .as_object()
                    .into_iter()
                    .flat_map(|o| o.keys().map(String::as_str))
                    .collect();
                format!(
                    "unknown axis '{a}' (the `ranges` have {})",
                    known.join(", ")
                )
            }),
            (None, Some(_), None) => {
                Err("the contract has `ranges`: the action or the step must name an `axis`".into())
            }
            (Some(_), Some(_), _) => Err("the contract has both `range` and `ranges`".into()),
            (None, None, _) => Err("`do.adjust`, but the contract has no `range`".into()),
        }
    }

    /// `do.adjust` on the contract's `range`: the option, its value now and its value after. The
    /// result is snapped to the step from the minimum (half away from the minimum, rounded to 10
    /// decimals against float noise), then clamped. `min` and `max` set the bound exactly.
    fn adjust(&self, a: &Value) -> Result<(String, Value, Value), String> {
        let r = self.block(a.get("axis").and_then(Value::as_str))?;
        let name = r
            .get("value")
            .and_then(Value::as_str)
            .ok_or("the `range` names no `value` option")?;
        // An unset option is None; one that is set but not a number is an error.
        let read = |name: &str| match self.options.get(name) {
            None | Some(Value::Null) => Ok(None),
            Some(v) => v
                .as_f64()
                .map(Some)
                .ok_or_else(|| format!("option '{name}' is {v}, which is not a number")),
        };
        // A key the block leaves out reads the default (rating has no `min`: 0); a key naming an
        // option that is unset means unbounded on that side (the step falls back to 1).
        let num = |k: &str, default: f64| match r.get(k).and_then(Value::as_str) {
            Some(o) => read(o),
            None => Ok(Some(default)),
        };
        let (min, max) = (num("min", 0.0)?, num("max", 100.0)?);
        let step = num("step", 1.0)?.unwrap_or(1.0);
        if step <= 0.0 || min.zip(max).is_some_and(|(a, b)| a > b) {
            return Err(format!(
                "the range is min {min:?}, max {max:?}, step {step}: the step must be above 0 and min at most max"
            ));
        }
        // The quotient is rounded to 9 decimals first, so an exact decimal half (0.35 / 0.1) is
        // not pushed below .5 by float noise. Snapping counts from the minimum, else from 0.
        // shortcut: values above 1e298 overflow and steps below 1e-10 never move; upgrade with a decimal type.
        let origin = min.unwrap_or(0.0);
        let snap = |x: f64| {
            let q = (((x - origin) / step) * 1e9).round() / 1e9;
            let s = ((origin + q.round() * step) * 1e10).round() / 1e10;
            let s = min.map_or(s, |m| s.max(m));
            max.map_or(s, |m| s.min(m))
        };
        let wrap = r.get("wrap").and_then(Value::as_bool) == Some(true);
        let bounds = min.zip(max);
        let span = bounds.map_or(0.0, |(a, b)| b - a);
        if wrap && (span <= 0.0 || ((span / step) * 1e9).round() % 1e9 != 0.0) {
            return Err(format!(
                "the range wraps, so it needs both bounds and its span {span} must be above 0 and a multiple of the step {step}"
            ));
        }
        let value = read(name)?;
        let now = value.unwrap_or(origin);
        let mut from_empty = false;
        // With a bound missing, set-min, set-max, a move and a page by a fraction change nothing.
        let next = match a.get("to").and_then(Value::as_str) {
            Some("min") => min.unwrap_or(now),
            Some("max") => max.unwrap_or(now),
            Some("position") => {
                let p = self
                    .position
                    .filter(|p| (0.0..=1.0).contains(p))
                    .ok_or("`move` needs a step `position` from 0 to 1")?;
                bounds.map_or(now, |(a, b)| snap(a + p * (b - a)))
            }
            _ => {
                let by = a.get("by").and_then(Value::as_f64).unwrap_or(0.0);
                let page = a.get("unit").and_then(Value::as_str) == Some("page");
                // A page is a fixed `page.size`, else a fraction of the span (both bounds needed).
                let size = if page {
                    match (r.pointer("/page/size").and_then(Value::as_f64), bounds) {
                        (Some(n), _) => Some(n),
                        (None, Some((lo, hi))) => {
                            let f = r
                                .pointer("/page/fraction")
                                .and_then(Value::as_f64)
                                .unwrap_or(0.1);
                            Some((((hi - lo) * f / step).round() * step).max(step))
                        }
                        _ => None,
                    }
                } else {
                    Some(step)
                };
                let Some(size) = size else {
                    return Ok((name.to_string(), norm(&json!(now)), norm(&json!(now))));
                };
                if wrap {
                    // A cycle: max is min again, so a step reduces into [min, max) and only
                    // `to: max` or a `move` to 1 reaches max.
                    let raw = ((now + by * size) * 1e10).round() / 1e10;
                    let lo = origin;
                    let x = lo + (raw - lo).rem_euclid(span);
                    if !x.is_finite() {
                        return Err(format!(
                            "the value {now} is too large to wrap (unsupported above 1e298)"
                        ));
                    }
                    let s = ((lo + (((x - lo) / step * 1e9).round() / 1e9).round() * step) * 1e10)
                        .round()
                        / 1e10;
                    if s >= lo + span {
                        s - span
                    } else {
                        s
                    }
                } else if value.is_none() && by != 0.0 && !page {
                    // An empty field (React Aria `safeNextStep`): up goes to the minimum, down
                    // to the maximum, 0 with no such bound; clamped to the bounds that exist,
                    // then snapped to the step, a snap past the maximum stepping back inside (the minimum is
                    // the lattice origin, so it never snaps below it).
                    from_empty = true;
                    let t = if by > 0.0 { min } else { max }.unwrap_or(0.0);
                    let t = min.map_or(t, |m| t.max(m));
                    let t = max.map_or(t, |m| t.min(m));
                    let q = (((t - origin) / step) * 1e9).round() / 1e9;
                    let mut s = origin + q.round() * step;
                    if max.is_some_and(|m| s > m + 1e-9) {
                        s -= step;
                    }
                    (s * 1e10).round() / 1e10
                } else {
                    snap(now + by * size)
                }
            }
        };
        let was = if from_empty { Value::Null } else { json!(now) };
        Ok((name.to_string(), norm(&was), norm(&json!(next))))
    }
}

impl Run<'_> {
    fn facets(&self) -> BTreeMap<String, String> {
        derive(self.m, &self.options, &self.interaction)
    }

    /// Apply one intent; returns the events it raised. `raise` nests a step, so depth is bounded.
    fn step(&mut self, intent: &str, via: Option<&str>) -> Result<Vec<Value>, String> {
        if self.depth >= MAX_RAISE_DEPTH {
            return Err(format!(
                "intent '{intent}' raises intents more than {MAX_RAISE_DEPTH} deep (a `raise` cycle?)"
            ));
        }
        self.depth += 1;
        let out = self.step_once(intent, via);
        self.depth -= 1;
        out
    }

    fn step_once(&mut self, intent: &str, via: Option<&str>) -> Result<Vec<Value>, String> {
        let before = self.facets();
        for (name, value) in &before {
            if value == "true"
                && self
                    .registry
                    .facet(name)
                    .is_some_and(|f| f.blocks_interaction.contains(intent))
            {
                return Ok(vec![]);
            }
        }
        let mut raised = Vec::new();
        let mut handled = INTERACTION_EVENTS.contains(&intent);
        for t in &self.m.transitions {
            if t.get("on").and_then(Value::as_str) != Some(intent) {
                continue;
            }
            handled = true;
            if t.get("via")
                .and_then(Value::as_str)
                .is_some_and(|v| Some(v) != via)
            {
                continue;
            }
            let needs_ok = t
                .get("needs")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .all(|c| self.caps.contains(c));
            if !needs_ok {
                continue;
            }
            if let Some(g) = t.get("guard") {
                if !holds(g, &before)? {
                    continue;
                }
            }
            let mut changed = Map::new();
            if let Some(o) = t.pointer("/do/toggle").and_then(Value::as_str) {
                let now = option(&self.options, o) != Value::Bool(true);
                changed.insert(o.to_string(), Value::Bool(now));
            }
            for (o, v) in t
                .pointer("/do/set")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                let v = match v.get("not") {
                    Some(g) => Value::Bool(!holds(g, &before)?),
                    None => v.clone(),
                };
                changed.insert(o.clone(), v);
            }
            let mut choose_emit = None;
            if let Some(o) = t.pointer("/do/choose").and_then(Value::as_str) {
                if self.in_group {
                    let emit = t.get("emit").and_then(Value::as_str).map(String::from);
                    self.pending.push((o.to_string(), emit));
                    choose_emit = Some(());
                } else {
                    let now = option(&self.options, o) != Value::Bool(true);
                    changed.insert(o.to_string(), Value::Bool(now));
                }
            }
            let mut ranged = false;
            if let Some(a) = t.pointer("/do/adjust") {
                let (o, was, now) = self.adjust(a)?;
                ranged = true;
                if was != now {
                    changed.insert(o, now);
                }
            }
            let mut options_changed = Map::new();
            for (o, v) in changed {
                if self.m.published.contains(&o) {
                    self.interaction.insert(o, v == Value::Bool(true));
                } else {
                    self.options.insert(o.clone(), v.clone());
                    options_changed.insert(o, v);
                }
            }
            if t.pointer("/do/raise").and_then(Value::as_str) == Some("press") {
                let press = self
                    .m
                    .parts
                    .values()
                    .find_map(|p| p.get("press").and_then(Value::as_str))
                    .map(String::from);
                let press = press.ok_or("`raise: press` but no part declares `press`")?;
                raised.extend(self.step(&press, None)?);
            }
            if let Some(name) = t
                .get("emit")
                .and_then(Value::as_str)
                .filter(|_| choose_emit.is_none() && !(ranged && options_changed.is_empty()))
            {
                raised.push(json!({ name: options_changed }));
            }
            break;
        }
        if !handled {
            let handles = self.m.parts.values().any(|p| {
                p.get("handles")
                    .and_then(Value::as_array)
                    .is_some_and(|a| a.iter().any(|i| i.as_str() == Some(intent)))
            });
            if !handles {
                return Err(format!("the contract does not handle intent '{intent}'"));
            }
        }
        Ok(raised)
    }
}

/// `want` (a list of `{ name: { option: value } }`) matches `got` when both list the same events in
/// order. With `listed`, each wanted option need only have the raised value and extra raised
/// options are not checked; otherwise the options must be equal.
fn emits_match(want: &Value, got: &[Value], listed: bool) -> bool {
    let want = &norm(want);
    if !listed {
        return *want == Value::Array(got.to_vec());
    }
    let Some(want) = want.as_array().filter(|w| w.len() == got.len()) else {
        return false;
    };
    want.iter().zip(got).all(|(w, g)| {
        let (Some(w), Some(g)) = (w.as_object(), g.as_object()) else {
            return false;
        };
        w.len() == 1
            && w.iter().all(|(name, opts)| {
                match (opts.as_object(), g.get(name).and_then(Value::as_object)) {
                    (Some(o), Some(r)) => o.iter().all(|(k, v)| r.get(k) == Some(v)),
                    _ => false,
                }
            })
    })
}

/// The event intents `bindings` raise for `key` in `phase` on `role`.
fn binding_intents(bindings: &Value, role: &str, key: &str, phase: &str) -> Vec<String> {
    let entries = bindings
        .get("roles")
        .and_then(|r| r.get(role))
        .and_then(|r| r.get("keyboard"))
        .and_then(Value::as_array);
    let mut out = Vec::new();
    for e in entries.into_iter().flatten() {
        if e.get("key").and_then(Value::as_str) != Some(key) {
            continue;
        }
        match e.get(phase) {
            Some(Value::String(i)) => out.push(i.clone()),
            Some(Value::Array(a)) => {
                out.extend(a.iter().filter_map(|i| i.as_str().map(String::from)))
            }
            _ => {}
        }
    }
    out
}

/// Environment properties (`direction`) come from the registry: a run starts at the default,
/// and a start value the registry does not list is a failure, not a silent no-match.
fn init_options(
    registry: &RegistryData,
    mut options: Map<String, Value>,
) -> Result<Map<String, Value>, String> {
    for v in options.values_mut() {
        *v = norm(v);
    }
    for (name, env) in registry.environment_properties() {
        match options.get(name).and_then(Value::as_str) {
            None => {
                options.insert(name.clone(), json!(env.initial));
            }
            Some(x) if !env.values.contains(x) => {
                return Err(format!(
                    "starts environment property '{name}' at '{x}', which the environment registry does not list"
                ));
            }
            Some(_) => {}
        }
    }
    Ok(options)
}

/// An intent on the group: a collection resolves `navigate-*` itself, else the group machine runs.
fn dispatch(
    run: &mut Run,
    group: &mut Option<Group>,
    intent: &str,
    via: Option<&str>,
) -> Result<Vec<Value>, String> {
    match group {
        Some(g) if NAVIGATION.contains(&intent) => g.navigate(&run.facets(), run.registry, intent),
        _ => run.step(intent, via),
    }
}

fn run_vector(
    m: &Machine,
    registry: &RegistryData,
    caps: &HashSet<String>,
    bindings: Option<&Value>,
    collection: Option<&Value>,
    item: Option<&Result<Machine, String>>,
    v: &Value,
) -> Result<Vec<String>, String> {
    let steps = v
        .get("steps")
        .and_then(Value::as_array)
        .ok_or("has no steps")?;
    let listed = v.get("emitOptions").and_then(Value::as_str) == Some("listed");
    let mut start = v
        .get("start")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let mut group = match (start.get("items"), collection) {
        (None, _) => None,
        (Some(_), Some(col)) => {
            let item_m = item
                .ok_or("the contract has a `collection`, but no item contract")?
                .as_ref()
                .map_err(Clone::clone)?;
            Some(Group::new(col, item_m, registry, caps, &start)?)
        }
        (Some(_), None) => {
            return Err("start lists `items`, but the contract has no `collection`".into())
        }
    };
    start.remove("items");
    start.remove("focused");
    let options = init_options(registry, start)?;
    let mut run = Run {
        m,
        registry,
        caps,
        options,
        interaction: m.published.iter().map(|p| (p.clone(), false)).collect(),
        depth: 0,
        in_group: false,
        pending: Vec::new(),
        position: None,
        axis: None,
    };
    let mut failures = Vec::new();
    let expects = v.get("expect").and_then(Value::as_array);
    if group.is_none() {
        for e in expects.into_iter().flatten() {
            if let Some(k) = ["items", "focused", "itemAria"]
                .into_iter()
                .find(|k| e.get(k).is_some())
            {
                return Err(format!(
                    "expects `{k}`, but the vector starts no `items`, so there is no group to check"
                ));
            }
        }
    }
    for (i, s) in steps.iter().enumerate() {
        let n = i + 1;
        run.position = s.get("position").and_then(Value::as_f64);
        run.axis = s.get("axis").and_then(Value::as_str).map(String::from);
        let raised = if let Some(input) = s.get("input") {
            let field = |f: &str| input.get(f).and_then(Value::as_str).unwrap_or_default();
            let bindings = bindings.ok_or_else(|| {
                format!("step {n} is an `input` step, but the run has no key bindings")
            })?;
            let at = input
                .get("item")
                .and_then(Value::as_u64)
                .map(|a| a as usize);
            let role = match (at, &group) {
                (Some(_), None) => {
                    return Err(format!(
                        "step {n} addresses an item, but the vector has no `items`"
                    ))
                }
                (Some(_), Some(g)) => part_role(&g.item_machine().parts),
                (None, _) => part_role(&m.parts),
            }
            .ok_or_else(|| format!("step {n} is an `input` step, but no part has a role"))?;
            if bindings.get("roles").and_then(|r| r.get(role)).is_none() {
                return Err(format!(
                    "step {n} is an `input` step, but the key bindings have no entry for role '{role}' (a mistyped role, or a role with no binding)"
                ));
            }
            let mut key = field("key");
            let swap = match (&group, m.range.as_ref().and_then(|r| r.get("mirror"))) {
                (Some(g), _) => g.mirrors(&run.facets()),
                (None, Some(guard)) => holds(guard, &run.facets()),
                _ => Ok(false),
            }
            .map_err(|e| format!("step {n}: {e}"))?;
            key = match (swap, key) {
                (true, "ArrowLeft") => "ArrowRight",
                (true, "ArrowRight") => "ArrowLeft",
                (_, k) => k,
            };
            let mut raised = Vec::new();
            for i in binding_intents(bindings, role, key, field("phase")) {
                let out = match (at, group.as_mut()) {
                    (Some(at), Some(g)) => g.item_step(&run.facets(), at, &i, Some("keyboard")),
                    _ => dispatch(&mut run, &mut group, &i, Some("keyboard")),
                };
                raised.extend(out.map_err(|e| format!("step {n}: {e}"))?);
            }
            raised
        } else if let Some(at) = s.get("item").and_then(Value::as_u64) {
            let g = group.as_mut().ok_or_else(|| {
                format!("step {n} addresses an item, but the vector has no `items`")
            })?;
            let intent = s
                .get("intent")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("step {n} has no intent"))?;
            g.item_step(
                &run.facets(),
                at as usize,
                intent,
                s.get("via").and_then(Value::as_str),
            )
            .map_err(|e| format!("step {n}: {e}"))?
        } else {
            let intent = s
                .get("intent")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("step {n} has no intent"))?;
            dispatch(
                &mut run,
                &mut group,
                intent,
                s.get("via").and_then(Value::as_str),
            )
            .map_err(|e| format!("step {n}: {e}"))?
        };
        let facets = run.facets();
        for e in expects
            .into_iter()
            .flatten()
            .filter(|e| e.get("after").and_then(Value::as_u64) == Some(n as u64))
        {
            for (f, want) in e
                .get("facets")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                match facets.get(f) {
                    None => failures.push(format!("after step {n}: facet '{f}' has no value")),
                    Some(got) if *got != show(want) => failures.push(format!(
                        "after step {n}: facet '{f}' want {} got {got}",
                        show(want)
                    )),
                    _ => {}
                }
            }
            let aria = aria_state(m, &run.options, &facets);
            for (attr, want) in e
                .get("aria")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                let want = want.as_str();
                match aria.get(attr) {
                    None => failures.push(format!(
                        "after step {n}: the contract's semantics expose no attribute '{attr}'"
                    )),
                    Some(got) if got.as_deref() != want => failures.push(format!(
                        "after step {n}: '{attr}' want {} got {}",
                        want.unwrap_or("absent"),
                        got.as_deref().unwrap_or("absent")
                    )),
                    _ => {}
                }
            }
            if let Some(g) = &group {
                g.check(n, e, &mut failures);
            }
            if let Some(want) = e.get("emit") {
                if !emits_match(want, &raised, listed) {
                    failures.push(format!(
                        "after step {n}: emit want {want} got {}",
                        Value::Array(raised.clone())
                    ));
                }
            }
        }
    }
    for e in expects.into_iter().flatten() {
        let after = e.get("after").and_then(Value::as_u64).unwrap_or(0);
        if after == 0 || after as usize > steps.len() {
            failures.push(format!(
                "expects after step {after}, but has {} steps",
                steps.len()
            ));
        }
    }
    Ok(failures)
}

/// Run `vectors` against `contract`. `capabilities` are the ones the run has: a vector that needs
/// another is reported not applicable. `bindings` is the platform's key bindings file, which an
/// `input` step needs.
pub fn run_vectors(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
    vectors: &[Value],
    registry: &RegistryData,
    capabilities: &HashSet<String>,
    bindings: Option<&Value>,
) -> Vec<VectorResult> {
    run_vectors_with(
        contract,
        patterns,
        vectors,
        registry,
        capabilities,
        bindings,
        &[],
    )
}

/// The item machine of a contract's `collection`, `None` without one.
fn item_of(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
    contracts: &[Value],
) -> Option<Result<Machine, String>> {
    contract.get("collection").map(|c| match c.get("item") {
        Some(Value::String(n)) => contracts
            .iter()
            .find(|x| x.get("component").and_then(Value::as_str) == Some(n))
            .ok_or_else(|| format!("the collection item '{n}' has no behavior contract"))
            .and_then(|x| flatten(x, patterns)),
        Some(inline @ Value::Object(_)) => flatten(inline, patterns),
        _ => Err("the `collection` has no `item`".to_string()),
    })
}

/// [`run_vectors`] for a contract whose `collection` names an item component: `contracts` are the
/// contracts that name can be found in (an inline `item` needs none).
pub fn run_vectors_with(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
    vectors: &[Value],
    registry: &RegistryData,
    capabilities: &HashSet<String>,
    bindings: Option<&Value>,
    contracts: &[Value],
) -> Vec<VectorResult> {
    let component = contract
        .get("component")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let machine = flatten(contract, patterns);
    let collection = contract.get("collection");
    let item = item_of(contract, patterns, contracts);
    vectors
        .iter()
        .map(|v| {
            let name = v
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or("(unnamed)")
                .to_string();
            let missing: Vec<String> = v
                .get("needs")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .filter(|c| !capabilities.contains(*c))
                .map(String::from)
                .collect();
            let status = if !missing.is_empty() {
                Status::NotApplicable(missing)
            } else {
                match &machine {
                    Err(e) => Status::Fail(vec![e.clone()]),
                    Ok(m) => {
                        match run_vector(
                            m,
                            registry,
                            capabilities,
                            bindings,
                            collection,
                            item.as_ref(),
                            v,
                        ) {
                            Ok(f) if f.is_empty() => Status::Pass,
                            Ok(f) => Status::Fail(f),
                            Err(e) => Status::Fail(vec![e]),
                        }
                    }
                }
            };
            VectorResult {
                component: component.clone(),
                name,
                status,
            }
        })
        .collect()
}

fn part_role(parts: &Map<String, Value>) -> Option<&str> {
    parts
        .values()
        .find_map(|p| p.get("role").and_then(Value::as_str))
}

/// What a component suite must hold true of its contract, independent of the vectors: the
/// contract's `state` list and every part's `role`, `focus`, `press` and `handles`. A vector
/// cannot see these (focus mode is not an intent, an unused option is not a facet, and an unbound
/// role only drops key vectors), so a suite pins them in `pins`:
/// `{ "state": [...], "wcag": [...], "parts": { "<part>": { "role", "focus", "press", "handles" } } }`.
/// A contract that extends patterns is compared after flattening. The runner also fails a contract
/// whose facets derive from, or whose transitions change, an option its `state` does not list.
/// Returns what is wrong; empty means conformant.
pub fn check_contract(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
    pins: Option<&Value>,
) -> Vec<String> {
    let m = match flatten(contract, patterns) {
        Ok(m) => m,
        Err(e) => return vec![e],
    };
    let state: Vec<&str> = contract
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    let mut out = Vec::new();
    for (name, f) in &m.facets {
        let from: Vec<&str> = match f.get("from") {
            Some(Value::String(s)) => vec![s.as_str()],
            Some(Value::Array(a)) => a.iter().filter_map(Value::as_str).collect(),
            _ => vec![],
        };
        for s in from.iter().filter(|s| !state.contains(*s)) {
            out.push(format!(
                "facet '{name}' derives from '{s}', which `state` does not list"
            ));
        }
    }
    for t in &m.transitions {
        let set = t
            .pointer("/do/set")
            .and_then(Value::as_object)
            .into_iter()
            .flat_map(|o| o.keys().map(String::as_str));
        let toggle = t.pointer("/do/toggle").and_then(Value::as_str);
        let choose = t.pointer("/do/choose").and_then(Value::as_str);
        for o in set.chain(toggle).chain(choose) {
            if !m.published.iter().any(|p| p == o) && !state.contains(&o) {
                out.push(format!(
                    "a transition changes '{o}', which `state` does not list"
                ));
            }
        }
    }
    if m.range.is_some() && m.ranges.is_some() {
        out.push("the contract has both `range` and `ranges`".into());
    }
    let blocks = m.range.iter().map(|r| ("range".to_string(), r)).chain(
        m.ranges
            .as_ref()
            .and_then(Value::as_object)
            .into_iter()
            .flatten()
            .map(|(a, r)| (format!("ranges.{a}"), r)),
    );
    for (at, r) in blocks {
        if at != "range" && r.get("mirror").is_some() {
            out.push(format!(
                "`{at}` has a `mirror`, which only a single `range` takes"
            ));
        }
        for k in ["value", "min", "max", "step"] {
            if let Some(o) = r.get(k).and_then(Value::as_str) {
                if !state.contains(&o) {
                    out.push(format!(
                        "`{at}.{k}` names '{o}', which `state` does not list"
                    ));
                }
            }
        }
    }
    let Some(pins) = pins else {
        if !m.parts.is_empty() || !state.is_empty() {
            out.push(
                "the suite has no `pins`: it must pin the contract's `state` and parts".into(),
            );
        }
        return out;
    };
    let mut want: Vec<&str> = pins
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    let mut have = state.clone();
    want.sort_unstable();
    have.sort_unstable();
    if want != have {
        out.push(format!("`state` is {have:?}, the suite pins {want:?}"));
    }
    if pins.get("wcag") != contract.get("wcag") {
        out.push("`wcag` differs from the suite's pinned `wcag`".into());
    }
    let pinned = pins.get("parts").and_then(Value::as_object);
    for name in pinned.iter().flat_map(|p| p.keys()) {
        if !m.parts.contains_key(name) {
            out.push(format!(
                "the suite pins part '{name}', which the contract lacks"
            ));
        }
    }
    for (name, part) in &m.parts {
        let Some(pin) = pinned.and_then(|p| p.get(name)) else {
            out.push(format!("part '{name}' is not pinned by the suite"));
            continue;
        };
        for k in ["role", "focus", "press", "handles"] {
            if part.get(k) != pin.get(k) {
                out.push(format!(
                    "part '{name}' `{k}` is {}, the suite pins {}",
                    part.get(k).map_or("unset".into(), Value::to_string),
                    pin.get(k).map_or("unset".into(), Value::to_string)
                ));
            }
        }
    }
    out
}

fn capabilities_of(file: &Value, caps: &HashSet<String>) -> HashSet<String> {
    let has: HashSet<&str> = file
        .get("capabilities")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    caps.iter()
        .filter(|c| has.contains(c.as_str()))
        .cloned()
        .collect()
}

fn read_json(path: &Path) -> Result<Value, CoreError> {
    let text = std::fs::read_to_string(path)?;
    serde_json::from_str(&text)
        .map_err(|e| CoreError::ParseError(format!("{}: invalid JSON: {e}", path.display())))
}

fn suite_failure(component: &str, why: String) -> VectorResult {
    VectorResult {
        component: component.to_string(),
        name: "(suite)".into(),
        status: Status::Fail(vec![why]),
    }
}

/// Run every conformance suite in `suites_dir` against the contracts in `behaviors_dir`
/// (patterns in its `patterns/`, platform key bindings in its `bindings/<platform>.json`).
/// A component suite (`<component>.json`: `{ component, vectors }`) runs against the contract of
/// that component; a suite with no contract fails. A bindings suite (`{ platform, role, vectors }`)
/// runs against every contract whose role-carrying part has that role, with that platform's
/// bindings; it has only the capabilities the platform file lists, so a platform with no keyboard
/// makes key vectors not applicable. `only` limits the run to one component; `platform` to one
/// platform (its capabilities then limit component suites too) and fails when it has no file.
pub fn run_dir(
    behaviors_dir: &Path,
    suites_dir: &Path,
    only: Option<&str>,
    platform: Option<&str>,
    capabilities: &HashSet<String>,
) -> Result<Vec<VectorResult>, CoreError> {
    let contracts = TokenGraph::load_spec_behaviors(behaviors_dir)?;
    let pattern_dir = behaviors_dir.join("patterns");
    let patterns = if pattern_dir.is_dir() {
        TokenGraph::load_spec_behavior_patterns(&pattern_dir)?
    } else {
        Vec::new()
    };
    let mut bindings: BTreeMap<String, Value> = BTreeMap::new();
    let bindings_dir = behaviors_dir.join("bindings");
    if bindings_dir.is_dir() {
        for path in crate::discovery::discover_json_files(&bindings_dir)? {
            let file = read_json(&path)?;
            if let Some(id) = file.get("platform").and_then(Value::as_str) {
                bindings.insert(id.to_string(), file.clone());
            }
        }
    }
    if let Some(p) = platform {
        if !bindings.contains_key(p) {
            return Err(CoreError::ParseError(format!(
                "no key bindings file for platform '{p}' in {}",
                bindings_dir.display()
            )));
        }
    }
    let registry = RegistryData::embedded();
    let component_caps = match platform.and_then(|p| bindings.get(p)) {
        Some(file) => capabilities_of(file, capabilities),
        None => capabilities.clone(),
    };
    let raws: Vec<Value> = contracts.iter().map(|c| c.raw.clone()).collect();
    let mut out = Vec::new();
    for path in crate::discovery::discover_json_files(suites_dir)? {
        let suite = read_json(&path)?;
        let vectors = suite
            .get("vectors")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        if let Some(component) = suite.get("component").and_then(Value::as_str) {
            if only.is_some_and(|o| o != component) {
                continue;
            }
            match contracts.iter().find(|c| c.component == component) {
                Some(c) => {
                    out.extend(run_vectors_with(
                        &c.raw,
                        &patterns,
                        &vectors,
                        registry,
                        &component_caps,
                        platform.and_then(|p| bindings.get(p)),
                        &raws,
                    ));
                    // Reported only when it fails, so a conformant suite's vector count is its own.
                    let issues = check_contract(&c.raw, &patterns, suite.get("pins"));
                    if !issues.is_empty() {
                        out.push(VectorResult {
                            component: component.to_string(),
                            name: "(pins)".into(),
                            status: Status::Fail(issues),
                        });
                    }
                }
                None => out.push(suite_failure(
                    component,
                    format!(
                        "no contract for '{component}' in {}",
                        behaviors_dir.display()
                    ),
                )),
            }
        } else if let (Some(plat), Some(role)) = (
            suite.get("platform").and_then(Value::as_str),
            suite.get("role").and_then(Value::as_str),
        ) {
            if platform.is_some_and(|p| p != plat) {
                continue;
            }
            let label = format!("{plat}/{role}");
            let Some(file) = bindings.get(plat) else {
                out.push(suite_failure(
                    &label,
                    format!("no key bindings file for platform '{plat}'"),
                ));
                continue;
            };
            let has_keyboard = capabilities_of(file, capabilities).contains("keyboard");
            // A platform with no keyboard binds no keys: its key vectors are not applicable.
            if has_keyboard && file.get("roles").and_then(|r| r.get(role)).is_none() {
                out.push(suite_failure(
                    &label,
                    format!("the '{plat}' key bindings have no entry for role '{role}', so its key vectors would prove nothing"),
                ));
                continue;
            }
            let caps = capabilities_of(file, capabilities);
            let on_items = suite.get("item").and_then(Value::as_bool) == Some(true);
            let mut matched = false;
            for c in &contracts {
                // An `item` suite is for the role of the collection's item part, not the group's.
                let carries = if on_items {
                    item_of(&c.raw, &patterns, &raws)
                        .and_then(Result::ok)
                        .is_some_and(|m| part_role(&m.parts) == Some(role))
                } else {
                    flatten(&c.raw, &patterns).is_ok_and(|m| part_role(&m.parts) == Some(role))
                };
                if !carries || only.is_some_and(|o| o != c.component) {
                    continue;
                }
                matched = true;
                out.extend(run_vectors_with(
                    &c.raw,
                    &patterns,
                    &vectors,
                    registry,
                    &caps,
                    Some(file),
                    &raws,
                ));
            }
            if !matched && only.is_none() {
                out.push(suite_failure(
                    &label,
                    format!("no contract has a part with role '{role}'"),
                ));
            }
        }
    }
    Ok(out)
}

/// Every capability in the registry: a reference run with a pointer and a keyboard.
pub fn all_capabilities() -> HashSet<String> {
    RegistryData::embedded().capabilities().clone()
}

/// What a contract says about the fields the `accessibility` block carries, for a consumer that
/// derives them from the contract (the Figma spec sheet). A field is `None` when the contract
/// cannot answer it exactly (several roles, no part, no `focus`), so the caller keeps its
/// existing source instead of guessing.
#[derive(Debug, Clone, PartialEq)]
pub struct AccessibilityView {
    /// The role of the only part that has one.
    pub role: Option<String>,
    /// `tab-stop` on any part is `true`; every part `none` is `false`; `roving` is not derivable.
    pub focusable: Option<bool>,
    /// Non-event intents the contract acts on: transitions' `on`, then each part's `press` and
    /// `handles`, first occurrence kept.
    pub keyboard_intents: Vec<String>,
    /// The contract's own `wcag` list.
    pub wcag: Vec<Value>,
}

pub fn accessibility_view(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
) -> AccessibilityView {
    // A contract that extends an unknown pattern is SPEC-118's to flag; its own fields still answer.
    let m = flatten(contract, patterns).ok();
    let own_parts = contract.get("parts").and_then(Value::as_object);
    let own_transitions = contract.get("transitions").and_then(Value::as_array);
    let parts: Vec<&Value> = m
        .as_ref()
        .map(|m| &m.parts)
        .or(own_parts)
        .map(|p| p.values().collect())
        .unwrap_or_default();
    let roles: Vec<&str> = parts
        .iter()
        .filter_map(|p| p.get("role").and_then(Value::as_str))
        .collect();
    let focus: Vec<&str> = parts
        .iter()
        .filter_map(|p| p.get("focus").and_then(Value::as_str))
        .collect();
    let focusable = if focus.contains(&"tab-stop") {
        Some(true)
    } else if !focus.is_empty() && focus.iter().all(|f| *f == "none") {
        Some(false)
    } else {
        None
    };
    let mut keyboard_intents: Vec<String> = Vec::new();
    let mut add = |i: &str| {
        if !INTERACTION_EVENTS.contains(&i) && !keyboard_intents.iter().any(|k| k == i) {
            keyboard_intents.push(i.to_string());
        }
    };
    for t in m
        .as_ref()
        .map(|m| m.transitions.as_slice())
        .or(own_transitions.map(Vec::as_slice))
        .into_iter()
        .flatten()
    {
        t.get("on").and_then(Value::as_str).map(&mut add);
    }
    for p in &parts {
        p.get("press").and_then(Value::as_str).map(&mut add);
        for i in p
            .get("handles")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            add(i);
        }
    }
    AccessibilityView {
        role: (roles.len() == 1).then(|| roles[0].to_string()),
        focusable,
        keyboard_intents,
        wcag: contract
            .get("wcag")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
    }
}

/// What a recipe `when` clause `facets: { <facet>: <value> }` means for `component`: the option
/// values and interaction states that select that facet value, so the recipe compiler can fold a
/// facet condition into the `options` and `states` it already solves. `Err` says why the facet
/// value cannot be selected (no contract, not declared, unknown value, or overlapping values).
///
/// shortcut: a facet condition counts as one satisfied condition per option it derives from, not
/// one, so it can outrank a hand-written `options` condition; revisit at the first migration.
pub fn facet_match(
    graph: &TokenGraph,
    component: &str,
    facet: &str,
    value: &str,
) -> Result<(Map<String, Value>, Vec<String>), String> {
    let canonical = graph.canonical_component(component);
    let contract = graph
        .behaviors
        .iter()
        .find(|b| b.component == component || b.component == canonical)
        .ok_or_else(|| format!("'{component}' has no behavior contract"))?;
    let registry = RegistryData::embedded();
    let entry = registry
        .facet(facet)
        .ok_or_else(|| format!("facet '{facet}' is not in the facets registry"))?;
    if !entry.values.contains(value) {
        return Err(format!("facet '{facet}' has no value '{value}'"));
    }
    if entry.interaction {
        let patterns = &graph.behavior_patterns;
        let published = flatten(&contract.raw, patterns)
            .map_err(|e| format!("contract of '{component}' {e}"))?
            .published
            .iter()
            .any(|p| p == facet);
        if !published {
            return Err(format!(
                "the contract of '{component}' extends no pattern that publishes '{facet}'"
            ));
        }
        return match (value, &entry.state_name) {
            ("true", Some(state)) => Ok((Map::new(), vec![state.clone()])),
            _ => Err(format!(
                "interaction facet '{facet}' can only be selected as 'true': a recipe cannot test for a state's absence"
            )),
        };
    }
    let decl = flatten(&contract.raw, &graph.behavior_patterns)
        .map_err(|e| format!("contract of '{component}' {e}"))?
        .facets
        .remove(facet)
        .ok_or_else(|| format!("the contract of '{component}' does not declare facet '{facet}'"))?;
    let values = decl
        .get("values")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("facet '{facet}' has no values"))?;
    let from: Vec<&str> = match decl.get("from") {
        Some(Value::String(s)) => vec![s.as_str()],
        Some(Value::Array(a)) => a.iter().filter_map(Value::as_str).collect(),
        _ => vec![],
    };
    if decl.get("otherwise").is_some() || values.values().any(Value::is_array) {
        return Err(format!(
            "facet '{facet}' uses an any-of list or `otherwise`, so options alone cannot select it"
        ));
    }
    let spec = |v: &Value| -> Map<String, Value> {
        match (v, from.as_slice()) {
            (Value::Object(o), _) => o.clone(),
            (v, [only]) => Map::from_iter([(only.to_string(), v.clone())]),
            _ => Map::new(),
        }
    };
    let wanted = values.get(value).map(spec).ok_or_else(|| {
        format!("the contract of '{component}' gives facet '{facet}' no value '{value}'")
    })?;
    // First match wins: a value after another can be selected by options alone only if no
    // earlier value can hold at the same time.
    for (earlier, v) in values {
        if earlier == value {
            break;
        }
        let other = spec(v);
        let apart = other
            .iter()
            .any(|(k, x)| wanted.get(k).is_some_and(|w| w != x));
        if !apart {
            return Err(format!(
                "facet '{facet}' value '{value}' overlaps the earlier value '{earlier}', so options alone cannot select it"
            ));
        }
    }
    Ok((wanted, vec![]))
}

/// Fold every `facets` clause of a recipe `when` / `visibleWhen` under `node` into `options` and
/// `states` (see [`facet_match`]). A clause that cannot be resolved gets an option no request
/// carries, so it never matches; SPEC-122 reports it. A recipe with no `facets` clause is not
/// touched.
pub fn expand_facets(graph: &TokenGraph, component: &str, node: &mut Value) {
    match node {
        Value::Object(map) => {
            for key in ["when", "visibleWhen"] {
                if let Some(cond) = map.get_mut(key).and_then(Value::as_object_mut) {
                    if let Some(Value::Object(facets)) = cond.remove("facets") {
                        for (facet, want) in facets {
                            let resolved = want
                                .as_str()
                                .ok_or_else(|| format!("facet '{facet}' wants a string value"))
                                .and_then(|w| facet_match(graph, component, &facet, w));
                            match resolved {
                                Ok((options, states)) => {
                                    let opts = cond
                                        .entry("options")
                                        .or_insert_with(|| Value::Object(Map::new()))
                                        .as_object_mut()
                                        .expect("options is an object");
                                    for (k, v) in options {
                                        if opts.get(&k).is_some_and(|have| *have != v) {
                                            opts.insert(
                                                format!("facet:{facet}"),
                                                Value::Bool(true),
                                            );
                                        } else {
                                            opts.insert(k, v);
                                        }
                                    }
                                    for s in states {
                                        let list = cond
                                            .entry("states")
                                            .or_insert_with(|| Value::Array(vec![]))
                                            .as_array_mut()
                                            .expect("states is an array");
                                        if !list.iter().any(|x| x.as_str() == Some(&s)) {
                                            list.push(Value::String(s));
                                        }
                                    }
                                }
                                Err(_) => {
                                    let opts = cond
                                        .entry("options")
                                        .or_insert_with(|| Value::Object(Map::new()))
                                        .as_object_mut()
                                        .expect("options is an object");
                                    opts.insert(format!("facet:{facet}"), Value::Bool(true));
                                }
                            }
                        }
                    }
                }
            }
            for v in map.values_mut() {
                expand_facets(graph, component, v);
            }
        }
        Value::Array(items) => {
            for v in items {
                expand_facets(graph, component, v);
            }
        }
        _ => {}
    }
}
