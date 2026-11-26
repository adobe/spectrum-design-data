// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The group half of the reference runner: a contract with a `collection` block
//! (spec/behavior-contract.md, "Collections"). The group is one machine `Run`; each item is
//! another `Run` of the item contract, and a logical focus index says which item the arrows
//! are on. Items are addressed by index only. Whether the adapter moves DOM focus, scrolls or
//! types ahead is not modeled.

use std::collections::BTreeMap;

use serde_json::{json, Map, Value};

use super::{aria_state, holds, init_options, option, show, Machine, Run};
use crate::registry::RegistryData;

/// Intents a group with a `collection` resolves itself instead of running a transition.
pub(super) const NAVIGATION: &[&str] = &[
    "navigate-next",
    "navigate-previous",
    "navigate-first",
    "navigate-last",
];

pub(super) struct Group<'a> {
    col: &'a Value,
    item_m: &'a Machine,
    items: Vec<Run<'a>>,
    focus: usize,
}

/// A literal or a `{ "facet": id }` reference, read as the string the facet value or literal
/// stands for (`true` and `false` read as "true" and "false").
fn resolve(spec: Option<&Value>, facets: &BTreeMap<String, String>) -> Option<String> {
    match spec? {
        Value::String(s) => Some(s.clone()),
        Value::Bool(b) => Some(b.to_string()),
        Value::Object(o) => facets.get(o.get("facet")?.as_str()?).cloned(),
        _ => None,
    }
}

impl<'a> Group<'a> {
    pub(super) fn new(
        col: &'a Value,
        item_m: &'a Machine,
        registry: &'a RegistryData,
        caps: &'a std::collections::HashSet<String>,
        start: &Map<String, Value>,
    ) -> Result<Self, String> {
        let mut items = Vec::new();
        for (i, o) in start
            .get("items")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .enumerate()
        {
            let options = o
                .as_object()
                .cloned()
                .ok_or_else(|| format!("start item {i} is not an object of options"))?;
            if let Some(k) = options
                .keys()
                .find(|k| !item_m.state.contains(k) && registry.environment_property(k).is_none())
            {
                return Err(format!(
                    "start item {i} sets '{k}', which the item contract does not list in `state`"
                ));
            }
            items.push(Run {
                m: item_m,
                registry,
                caps,
                options: init_options(registry, options)?,
                interaction: item_m
                    .published
                    .iter()
                    .map(|p| (p.clone(), false))
                    .collect(),
                depth: 0,
                in_group: true,
                pending: Vec::new(),
                position: None,
                axis: None,
            });
        }
        let focus = start.get("focused").and_then(Value::as_u64).unwrap_or(0) as usize;
        if focus >= items.len().max(1) {
            return Err(format!(
                "starts focused on item {focus}, but there are {} items",
                items.len()
            ));
        }
        Ok(Group {
            col,
            item_m,
            items,
            focus,
        })
    }

    /// Whether the traversal `mirror` guard holds: the runner then swaps ArrowLeft and ArrowRight
    /// before it looks the key up in the bindings.
    pub(super) fn mirrors(&self, group_facets: &BTreeMap<String, String>) -> Result<bool, String> {
        match self.col.pointer("/traversal/mirror") {
            Some(g) => holds(g, group_facets),
            None => Ok(false),
        }
    }

    pub(super) fn item_machine(&self) -> &Machine {
        self.item_m
    }

    fn on_set(&self, opt: &str) -> Vec<usize> {
        (0..self.items.len())
            .filter(|i| option(&self.items[*i].options, opt) == Value::Bool(true))
            .collect()
    }

    /// An intent addressed to item `i`, with the group's `choose` applied to what it asked for.
    pub(super) fn item_step(
        &mut self,
        group_facets: &BTreeMap<String, String>,
        i: usize,
        intent: &str,
        via: Option<&str>,
    ) -> Result<Vec<Value>, String> {
        if i >= self.items.len() {
            return Err(format!(
                "addresses item {i}, but there are {} items",
                self.items.len()
            ));
        }
        let mut raised = self.items[i].step(intent, via)?;
        for (opt, emit) in std::mem::take(&mut self.items[i].pending) {
            let before = self.on_set(&opt);
            self.choose(group_facets, i, &opt);
            let after = self.on_set(&opt);
            if before != after {
                if let Some(name) = emit {
                    raised.push(json!({ name: { opt: after } }));
                }
            }
        }
        Ok(raised)
    }

    /// `do.choose` for item `i` and option `opt`, by the group's `choose` mode.
    fn choose(&mut self, group_facets: &BTreeMap<String, String>, i: usize, opt: &str) {
        let mode = resolve(self.col.pointer("/choose/mode"), group_facets);
        let allows_empty = resolve(self.col.pointer("/choose/allowsEmpty"), group_facets)
            .as_deref()
            == Some("true");
        let on = option(&self.items[i].options, opt) == Value::Bool(true);
        let set = |g: &mut Self, at: usize, v: bool| {
            g.items[at].options.insert(opt.to_string(), Value::Bool(v));
        };
        match mode.as_deref() {
            Some("single") => {
                if on && !allows_empty {
                    return;
                }
                for at in 0..self.items.len() {
                    set(self, at, !on && at == i);
                }
            }
            Some("multiple") => {
                if on && !allows_empty && self.on_set(opt).len() <= 1 {
                    return;
                }
                set(self, i, !on);
            }
            _ => {}
        }
    }

    fn skipped(&self, i: usize) -> Result<bool, String> {
        match self.col.pointer("/traversal/skip") {
            Some(g) => holds(g, &self.items[i].facets()),
            None => Ok(false),
        }
    }

    /// A `navigate-*` intent: move the logical focus by index, over items the `skip` guard does
    /// not skip, then select on move when the traversal says so.
    pub(super) fn navigate(
        &mut self,
        group_facets: &BTreeMap<String, String>,
        registry: &RegistryData,
        intent: &str,
    ) -> Result<Vec<Value>, String> {
        // A collection with no `traversal` declares no navigation: `navigate-*` does nothing.
        if self.col.get("traversal").is_none() {
            return Ok(vec![]);
        }
        if group_facets.iter().any(|(name, value)| {
            value == "true"
                && registry
                    .facet(name)
                    .is_some_and(|f| f.blocks_interaction.contains(intent))
        }) {
            return Ok(vec![]);
        }
        let n = self.items.len() as i64;
        let wrap = self.col.pointer("/traversal/wrap") == Some(&Value::Bool(true));
        let flag =
            |k: &str| self.col.pointer(&format!("/traversal/{k}")) == Some(&Value::Bool(true));
        let mut target = None;
        match intent {
            "navigate-next" | "navigate-previous" => {
                let dir: i64 = if intent == "navigate-next" { 1 } else { -1 };
                for k in 1..n {
                    let at = self.focus as i64 + dir * k;
                    let at = if wrap {
                        at.rem_euclid(n)
                    } else if (0..n).contains(&at) {
                        at
                    } else {
                        break;
                    };
                    if !self.skipped(at as usize)? {
                        target = Some(at as usize);
                        break;
                    }
                }
            }
            "navigate-first" | "navigate-last" => {
                let first = intent == "navigate-first";
                if flag(if first { "first" } else { "last" }) {
                    let order: Vec<usize> = if first {
                        (0..n as usize).collect()
                    } else {
                        (0..n as usize).rev().collect()
                    };
                    for at in order {
                        if !self.skipped(at)? {
                            target = Some(at);
                            break;
                        }
                    }
                }
            }
            _ => {}
        }
        let Some(at) = target.filter(|t| *t != self.focus) else {
            return Ok(vec![]);
        };
        self.focus = at;
        if resolve(self.col.pointer("/traversal/selectOnMove"), group_facets).as_deref()
            == Some("true")
        {
            let press = self
                .item_m
                .parts
                .values()
                .find_map(|p| p.get("press").and_then(Value::as_str))
                .map(String::from)
                .ok_or("`selectOnMove` but no part of the item declares `press`")?;
            return self.item_step(group_facets, at, &press, Some("keyboard"));
        }
        Ok(vec![])
    }

    /// Check `expect.items` and `expect.focused` of one expectation.
    pub(super) fn check(&self, n: usize, e: &Value, failures: &mut Vec<String>) {
        if let Some(want) = e.get("focused").and_then(Value::as_u64) {
            if want as usize != self.focus {
                failures.push(format!(
                    "after step {n}: focused item want {want} got {}",
                    self.focus
                ));
            }
        }
        for (i, want) in e
            .get("items")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .enumerate()
        {
            let Some(want) = want.as_object() else {
                continue;
            };
            let Some(item) = self.items.get(i) else {
                failures.push(format!(
                    "after step {n}: expects item {i}, which does not exist"
                ));
                continue;
            };
            let facets = item.facets();
            for (f, want) in want {
                match facets.get(f) {
                    None => {
                        failures.push(format!("after step {n}: item {i} facet '{f}' has no value"))
                    }
                    Some(got) if *got != show(want) => failures.push(format!(
                        "after step {n}: item {i} facet '{f}' want {} got {got}",
                        show(want)
                    )),
                    _ => {}
                }
            }
        }
        for (i, want) in e
            .get("itemAria")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .enumerate()
        {
            let Some(want) = want.as_object() else {
                continue;
            };
            let Some(item) = self.items.get(i) else {
                failures.push(format!(
                    "after step {n}: expects item {i}, which does not exist"
                ));
                continue;
            };
            let aria = aria_state(self.item_m, &item.options, &item.facets());
            for (attr, want) in want {
                let want = want.as_str();
                match aria.get(attr) {
                    None => failures.push(format!(
                        "after step {n}: item {i}'s semantics expose no attribute '{attr}'"
                    )),
                    Some(got) if got.as_deref() != want => failures.push(format!(
                        "after step {n}: item {i} '{attr}' want {} got {}",
                        want.unwrap_or("absent"),
                        got.as_deref().unwrap_or("absent")
                    )),
                    _ => {}
                }
            }
        }
    }
}
