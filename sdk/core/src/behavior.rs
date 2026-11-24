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
//! * Options are the state. A missing option reads as `false`.
//! * A facet's value is the first `values` entry whose option match holds.
//! * Event intents (`focus`, `blur`, `press-*`, `pointer-*`) move the interaction facets a pattern
//!   publishes (`hovered`, `pressed`, `focusVisible`). `press-end` then raises the `press` intent
//!   of the first part that declares one. A facet's `blocksInteraction` (facets registry) makes
//!   the listed events do nothing while the facet is `true`.
//! * Any other intent fires the first transition whose `on` matches, whose `needs` the runner has
//!   and whose `guard` holds. Guards and `not` values read the facets from before the step.
//! * `emit` lists the events a step raised (`{ name: { option: new value } }`), not a running
//!   total. A vector that needs a capability the run lacks is not applicable, neither pass nor fail.

use std::collections::{BTreeMap, HashSet};
use std::path::Path;

use serde_json::{json, Map, Value};

use crate::graph::{BehaviorPatternRecord, TokenGraph};
use crate::registry::RegistryData;
use crate::CoreError;

/// Event intents the runner gives built-in meaning to (`category: event` in the intents registry).
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
struct Machine {
    facets: Map<String, Value>,
    parts: Map<String, Value>,
    transitions: Vec<Value>,
    published: Vec<String>,
}

fn extends(raw: &Value) -> Vec<String> {
    raw.get("extends")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|s| s.as_str().map(String::from))
        .collect()
}

fn flatten(contract: &Value, patterns: &[BehaviorPatternRecord]) -> Result<Machine, String> {
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
    };
    let own = [contract];
    for raw in chain.iter().copied().chain(own) {
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
                (v, [only]) => option(options, only) == **v,
                _ => false,
            });
        if let Some((id, _)) = hit {
            out.insert(name.clone(), id.clone());
        }
    }
    for (name, on) in interaction {
        out.insert(name.clone(), on.to_string());
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
}

impl Run<'_> {
    fn facets(&self) -> BTreeMap<String, String> {
        derive(self.m, &self.options, &self.interaction)
    }

    fn set_interaction(&mut self, facet: &str, on: bool, needs: Option<&str>) {
        if self.m.published.iter().any(|p| p == facet) {
            let usable = needs.is_none_or(|c| self.caps.contains(c));
            self.interaction.insert(facet.to_string(), on && usable);
        }
    }

    /// Apply one intent; returns the events it raised.
    fn step(&mut self, intent: &str, via: Option<&str>) -> Result<Vec<Value>, String> {
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
        let event = INTERACTION_EVENTS.contains(&intent);
        match intent {
            "focus" => {
                self.set_interaction("focusVisible", via == Some("keyboard"), Some("keyboard"))
            }
            "blur" => self.set_interaction("focusVisible", false, None),
            "press-start" => self.set_interaction("pressed", true, None),
            "press-cancel" => self.set_interaction("pressed", false, None),
            "pointer-enter" => self.set_interaction("hovered", true, Some("pointer-hover")),
            "pointer-leave" => self.set_interaction("hovered", false, None),
            _ => {}
        }
        let mut raised = Vec::new();
        if intent == "press-end" {
            self.set_interaction("pressed", false, None);
            let press = self
                .m
                .parts
                .values()
                .find_map(|p| p.get("press").and_then(Value::as_str))
                .map(String::from);
            if let Some(press) = press {
                raised.extend(self.step(&press, None)?);
            }
        }
        let mut handled = event;
        for t in &self.m.transitions {
            if t.get("on").and_then(Value::as_str) != Some(intent) {
                continue;
            }
            handled = true;
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
            for (o, v) in &changed {
                self.options.insert(o.clone(), v.clone());
            }
            if let Some(name) = t.get("emit").and_then(Value::as_str) {
                raised.push(json!({ name: changed }));
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

fn run_vector(
    m: &Machine,
    registry: &RegistryData,
    caps: &HashSet<String>,
    v: &Value,
) -> Result<Vec<String>, String> {
    let steps = v
        .get("steps")
        .and_then(Value::as_array)
        .ok_or("has no steps")?;
    let mut run = Run {
        m,
        registry,
        caps,
        options: v
            .get("start")
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default(),
        interaction: m.published.iter().map(|p| (p.clone(), false)).collect(),
    };
    let mut failures = Vec::new();
    let expects = v.get("expect").and_then(Value::as_array);
    for (i, s) in steps.iter().enumerate() {
        let n = i + 1;
        let intent = s
            .get("intent")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("step {n} has no intent"))?;
        let raised = run
            .step(intent, s.get("via").and_then(Value::as_str))
            .map_err(|e| format!("step {n}: {e}"))?;
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
            if let Some(want) = e.get("emit") {
                if *want != Value::Array(raised.clone()) {
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
/// another is reported not applicable.
pub fn run_vectors(
    contract: &Value,
    patterns: &[BehaviorPatternRecord],
    vectors: &[Value],
    registry: &RegistryData,
    capabilities: &HashSet<String>,
) -> Vec<VectorResult> {
    let component = contract
        .get("component")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let machine = flatten(contract, patterns);
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
                    Ok(m) => match run_vector(m, registry, capabilities, v) {
                        Ok(f) if f.is_empty() => Status::Pass,
                        Ok(f) => Status::Fail(f),
                        Err(e) => Status::Fail(vec![e]),
                    },
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

/// Run every conformance suite in `suites_dir` (`<component>.json`: `{ component, vectors }`)
/// against the contract of the same component in `behaviors_dir` (patterns in its `patterns/`).
/// `only` limits the run to one component. A suite with no contract fails.
pub fn run_dir(
    behaviors_dir: &Path,
    suites_dir: &Path,
    only: Option<&str>,
    capabilities: &HashSet<String>,
) -> Result<Vec<VectorResult>, CoreError> {
    let contracts = TokenGraph::load_spec_behaviors(behaviors_dir)?;
    let pattern_dir = behaviors_dir.join("patterns");
    let patterns = if pattern_dir.is_dir() {
        TokenGraph::load_spec_behavior_patterns(&pattern_dir)?
    } else {
        Vec::new()
    };
    let registry = RegistryData::embedded();
    let mut out = Vec::new();
    for path in crate::discovery::discover_json_files(suites_dir)? {
        let text = std::fs::read_to_string(&path)?;
        let suite: Value = serde_json::from_str(&text)
            .map_err(|e| CoreError::ParseError(format!("{}: invalid JSON: {e}", path.display())))?;
        let Some(component) = suite.get("component").and_then(Value::as_str) else {
            continue;
        };
        if only.is_some_and(|o| o != component) {
            continue;
        }
        let vectors = suite
            .get("vectors")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        match contracts.iter().find(|c| c.component == component) {
            Some(c) => out.extend(run_vectors(
                &c.raw,
                &patterns,
                &vectors,
                registry,
                capabilities,
            )),
            None => out.push(VectorResult {
                component: component.to_string(),
                name: "(suite)".into(),
                status: Status::Fail(vec![format!(
                    "no contract for '{component}' in {}",
                    behaviors_dir.display()
                )]),
            }),
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

pub fn accessibility_view(contract: &Value) -> AccessibilityView {
    let parts: Vec<&Value> = contract
        .get("parts")
        .and_then(Value::as_object)
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
    for t in contract
        .get("transitions")
        .and_then(Value::as_array)
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
    let decl = contract
        .raw
        .pointer(&format!("/facets/{facet}"))
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
