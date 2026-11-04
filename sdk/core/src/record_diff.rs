// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Record-level diff between two dataset revisions.
//!
//! Extends the token diff in [`crate::diff`] (UUID identity, renames, deprecations; see
//! `spec/diff.md`) to the other record layers of a dataset: relationships (matched by uuid),
//! component options, option values, anatomy parts, states, document blocks, implementations,
//! lifecycle, and visual recipes. Formatting and key order never produce a change.
//!
//! The dataset directory is read as-is; callers that diff git revisions export each one into
//! a temporary directory first (`git archive`), so this module never touches a repository.

use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};
use std::path::Path;

use serde::Serialize;
use serde_json::{json, Value};

use crate::diff::{self, diff_properties, ChangeType, PropertyChange};
use crate::graph::TokenGraph;
use crate::CoreError;

/// Dataset layer a record lives in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Layer {
    Token,
    Relationship,
    Component,
    Visual,
}

/// What happened to a record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Change {
    Added,
    Removed,
    Updated,
    Renamed,
    Deprecated,
    Reverted,
}

/// One record-level change.
#[derive(Debug, Clone, Serialize)]
pub struct RecordChange {
    pub layer: Layer,
    /// Finer record type: `token`, `relationship`, `option`, `option-value`, `anatomy-part`,
    /// `state`, `slot`, `document-block`, `implementation`, `lifecycle`, `component`,
    /// `visual-recipe`, `visual-part`, `visual`.
    pub kind: &'static str,
    pub change: Change,
    /// Stable identity: the record uuid, or a component-relative path for component records.
    pub id: String,
    /// Owning component when the record names one (not set for global tokens).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component: Option<String>,
    /// Human-readable label.
    pub name: String,
    /// Relationship context (spec-sheet block title).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
    /// Scope of a relationship or inline token: `{property, options}`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<Value>,
    pub fields: Vec<PropertyChange>,
    /// The record as it was (removed, renamed) and as it is (added).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub after: Option<Value>,
}

/// A token whose own record is unchanged but whose alias-resolved value moved.
#[derive(Debug, Clone, Serialize)]
pub struct ResolvedChange {
    pub uuid: String,
    pub before: Value,
    pub after: Value,
    /// Tokens on the alias chain whose own record changed.
    pub via: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct DatasetDiff {
    pub changes: Vec<RecordChange>,
    pub resolved: Vec<ResolvedChange>,
}

/// A dataset revision read from a directory.
#[derive(Debug, Default)]
pub struct DatasetSnapshot {
    pub graph: TokenGraph,
    /// Every record in `relationships/*.json`: relationships and inline component tokens.
    pub relationships: Vec<Value>,
    pub components: BTreeMap<String, Value>,
    pub visuals: BTreeMap<String, Value>,
}

fn json_files(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut v: Vec<_> = walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(Result::ok)
        .map(|e| e.into_path())
        .filter(|p| p.extension().is_some_and(|e| e == "json"))
        .collect();
    v.sort();
    v
}

fn read(path: &Path) -> Result<Value, CoreError> {
    Ok(serde_json::from_str(&std::fs::read_to_string(path)?)?)
}

impl DatasetSnapshot {
    /// Load a dataset root (`tokens/`, `relationships/`, `components/`, `visuals/`); missing
    /// directories are empty, so early revisions without a layer still load.
    pub fn load(root: &Path) -> Result<Self, CoreError> {
        let tokens = root.join("tokens");
        let graph = if tokens.is_dir() {
            TokenGraph::from_json_dir(&tokens)?
        } else {
            TokenGraph::default()
        };
        let mut relationships = Vec::new();
        for p in json_files(&root.join("relationships")) {
            if let Value::Array(a) = read(&p)? {
                relationships.extend(a);
            }
        }
        let keyed = |dir: &str, key: &str| -> Result<BTreeMap<String, Value>, CoreError> {
            let mut m = BTreeMap::new();
            for p in json_files(&root.join(dir)) {
                let v = read(&p)?;
                let name = v.get(key).and_then(Value::as_str).map(str::to_string);
                if let Some(n) =
                    name.or_else(|| p.file_stem().and_then(|s| s.to_str()).map(str::to_string))
                {
                    m.insert(n, v);
                }
            }
            Ok(m)
        };
        Ok(Self {
            graph,
            relationships,
            components: keyed("components", "name")?,
            visuals: keyed("visuals", "component")?,
        })
    }

    /// uuid → record for every record that can be an alias target.
    fn by_uuid(&self) -> HashMap<&str, &Value> {
        let mut m = HashMap::new();
        for t in self.graph.tokens.values() {
            if let Some(u) = t.raw.get("uuid").and_then(Value::as_str) {
                m.insert(u, &t.raw);
            }
        }
        for r in &self.relationships {
            if let Some(u) = r.get("uuid").and_then(Value::as_str) {
                m.insert(u, r);
            }
        }
        m
    }
}

// ── Entry point ─────────────────────────────────────────────────────────────

/// Diff two dataset revisions record by record.
pub fn diff_datasets(old: &DatasetSnapshot, new: &DatasetSnapshot) -> DatasetDiff {
    let mut out = DatasetDiff::default();
    out.changes.extend(token_changes(old, new));
    out.changes
        .extend(relationship_changes(&old.relationships, &new.relationships));
    out.changes
        .extend(component_changes(&old.components, &new.components));
    out.changes
        .extend(visual_changes(&old.visuals, &new.visuals));
    out.resolved = resolved_changes(old, new);
    out
}

// ── Tokens ──────────────────────────────────────────────────────────────────

fn token_changes(old: &DatasetSnapshot, new: &DatasetSnapshot) -> Vec<RecordChange> {
    let r = diff::semantic_diff(&old.graph, &new.graph);
    let tok = |name: &str, uuid: &Option<String>, change, fields| RecordChange {
        layer: Layer::Token,
        kind: "token",
        change,
        id: uuid.clone().unwrap_or_else(|| name.to_string()),
        component: None,
        name: name.to_string(),
        context: None,
        scope: None,
        fields,
        before: None,
        after: None,
    };
    let mut v: Vec<RecordChange> = Vec::new();
    let mut start = 0;
    // The graph diff returns each group in hash order; sort each by name and id.
    let mut settle = |v: &mut Vec<RecordChange>| {
        v[start..].sort_by(|a, b| (&a.name, &a.id).cmp(&(&b.name, &b.id)));
        start = v.len();
    };
    for t in &r.renamed {
        let mut c = tok(
            &t.new_name,
            &t.uuid,
            Change::Renamed,
            t.property_changes.clone(),
        );
        c.before = Some(json!(t.old_name));
        v.push(c);
    }
    settle(&mut v);
    for t in &r.deprecated {
        v.push(tok(&t.name, &t.uuid, Change::Deprecated, vec![]));
    }
    settle(&mut v);
    for t in &r.reverted {
        v.push(tok(&t.name, &t.uuid, Change::Reverted, vec![]));
    }
    settle(&mut v);
    for t in &r.added {
        v.push(tok(&t.name, &t.uuid, Change::Added, vec![]));
    }
    settle(&mut v);
    for t in &r.deleted {
        v.push(tok(&t.name, &t.uuid, Change::Removed, vec![]));
    }
    settle(&mut v);
    for t in &r.updated {
        v.push(tok(
            &t.name,
            &t.uuid,
            Change::Updated,
            t.property_changes.clone(),
        ));
    }
    settle(&mut v);
    v
}

/// Terminal value of a token, following `$ref` aliases by uuid.
fn terminal<'a>(id: &'a str, map: &HashMap<&'a str, &'a Value>) -> (Option<Value>, Vec<&'a str>) {
    let mut chain = vec![id];
    let mut cur = id;
    loop {
        let Some(rec) = map.get(cur) else {
            return (None, chain);
        };
        match rec.get("$ref").and_then(Value::as_str) {
            Some(next) if !chain.contains(&next) => {
                chain.push(next);
                cur = next;
            }
            Some(_) => return (None, chain),
            None => {
                let v = rec.get("value").or_else(|| rec.get("sets"));
                return (v.cloned(), chain);
            }
        }
    }
}

fn own_source(rec: &Value) -> (Option<&Value>, Option<&Value>, Option<&Value>) {
    (rec.get("value"), rec.get("$ref"), rec.get("sets"))
}

/// Tokens whose own `value`/`$ref` is untouched but whose resolved value changed.
fn resolved_changes(old: &DatasetSnapshot, new: &DatasetSnapshot) -> Vec<ResolvedChange> {
    let (om, nm) = (old.by_uuid(), new.by_uuid());
    let mut ids: Vec<&str> = nm.keys().copied().filter(|k| om.contains_key(k)).collect();
    ids.sort_unstable();
    let changed_own = |id: &str| match (om.get(id), nm.get(id)) {
        (Some(o), Some(n)) => own_source(o) != own_source(n),
        _ => false,
    };
    let mut out = Vec::new();
    for id in ids {
        if changed_own(id) {
            continue;
        }
        let (ov, oc) = terminal(id, &om);
        let (nv, nc) = terminal(id, &nm);
        let (Some(ov), Some(nv)) = (ov, nv) else {
            continue;
        };
        if ov == nv {
            continue;
        }
        let mut via: Vec<String> = oc
            .iter()
            .chain(nc.iter())
            .filter(|c| **c != id && changed_own(c))
            .map(|c| c.to_string())
            .collect();
        via.sort();
        via.dedup();
        out.push(ResolvedChange {
            uuid: id.to_string(),
            before: ov,
            after: nv,
            via,
        });
    }
    out
}

// ── Relationships ───────────────────────────────────────────────────────────

fn scope_label(rec: &Value) -> String {
    let scope = rec.get("scope");
    let prop = scope
        .and_then(|s| s.get("property"))
        .and_then(Value::as_str)
        .unwrap_or("?");
    let mut q: Vec<String> = scope
        .and_then(|s| s.get("options"))
        .and_then(Value::as_object)
        .map(|o| {
            o.iter()
                .map(|(k, v)| format!("{k}={}", v.as_str().unwrap_or("?")))
                .collect()
        })
        .unwrap_or_default();
    q.sort();
    if q.is_empty() {
        prop.to_string()
    } else {
        format!("{prop}[{}]", q.join(","))
    }
}

fn is_inline_token(rec: &Value) -> bool {
    rec.get("$schema").is_some() || rec.get("value").is_some()
}

fn rel_change(rec: &Value, change: Change, fields: Vec<PropertyChange>) -> RecordChange {
    let token = is_inline_token(rec);
    RecordChange {
        layer: if token {
            Layer::Token
        } else {
            Layer::Relationship
        },
        kind: if token { "token" } else { "relationship" },
        change,
        id: rec
            .get("uuid")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| {
                format!(
                    "{}#{}",
                    scope_label(rec),
                    rec.get("context").and_then(Value::as_str).unwrap_or("")
                )
            }),
        component: rec
            .get("scope")
            .and_then(|s| s.get("component"))
            .and_then(Value::as_str)
            .map(str::to_string),
        name: scope_label(rec),
        context: rec
            .get("context")
            .and_then(Value::as_str)
            .map(|s| s.trim().to_string()),
        scope: rec
            .get("scope")
            .map(|s| json!({"property": s.get("property"), "options": s.get("options")})),
        fields,
        before: None,
        after: None,
    }
}

fn content_key(rec: &Value) -> String {
    format!(
        "{}#{}#{}",
        rec.get("scope").map(|s| s.to_string()).unwrap_or_default(),
        rec.get("context").and_then(Value::as_str).unwrap_or(""),
        rec.get("$ref")
            .map(|v| v.to_string())
            .or_else(|| rec.get("value").map(|v| v.to_string()))
            .unwrap_or_default()
    )
}

fn scope_context_key(rec: &Value) -> String {
    format!(
        "{}#{}",
        rec.get("scope").map(|s| s.to_string()).unwrap_or_default(),
        rec.get("context").and_then(Value::as_str).unwrap_or("")
    )
}

/// Pair records by uuid, then by scope + context + target (records written before they had a
/// uuid), then re-bound relationships: same scope and context, different target token.
fn relationship_changes(old: &[Value], new: &[Value]) -> Vec<RecordChange> {
    let mut pairs: Vec<(&Value, &Value)> = Vec::new();
    let mut rebound: Vec<(&Value, &Value)> = Vec::new();

    fn pass<'a>(
        olds: Vec<&'a Value>,
        news: Vec<&'a Value>,
        key: impl Fn(&Value) -> Option<String>,
        out: &mut Vec<(&'a Value, &'a Value)>,
    ) -> (Vec<&'a Value>, Vec<&'a Value>) {
        // Records keep their position in the file: ties pair first-with-first, and the
        // leftovers stay in file order so later passes pair the same way on every run.
        let mut idx: HashMap<String, VecDeque<usize>> = HashMap::new();
        for (i, n) in news.iter().enumerate() {
            if let Some(k) = key(n) {
                idx.entry(k).or_default().push_back(i);
            }
        }
        let mut taken = vec![false; news.len()];
        let mut rest_old = Vec::new();
        for o in olds {
            match key(o)
                .and_then(|k| idx.get_mut(&k))
                .and_then(|v| v.pop_front())
            {
                Some(i) => {
                    taken[i] = true;
                    out.push((o, news[i]));
                }
                None => rest_old.push(o),
            }
        }
        let rest_new = news
            .into_iter()
            .enumerate()
            .filter(|(i, _)| !taken[*i])
            .map(|(_, n)| n)
            .collect();
        (rest_old, rest_new)
    }

    let uuid = |r: &Value| r.get("uuid").and_then(Value::as_str).map(str::to_string);
    let (o, n) = pass(old.iter().collect(), new.iter().collect(), uuid, &mut pairs);
    let (o, n) = pass(o, n, |r| Some(content_key(r)), &mut pairs);
    // Inline tokens never re-bind; only relationships do.
    pass(
        o.into_iter().filter(|r| !is_inline_token(r)).collect(),
        n.into_iter().filter(|r| !is_inline_token(r)).collect(),
        |r| Some(scope_context_key(r)),
        &mut rebound,
    );

    let mut out = Vec::new();
    for (o, n) in pairs.iter().chain(rebound.iter()) {
        // A uuid assigned to a record that had none establishes identity; it is not a change.
        let mut fields = diff_properties(o, n);
        fields.retain(|f| !(f.path == "uuid" && f.change_type == ChangeType::Added));
        if !fields.is_empty() {
            out.push(rel_change(n, Change::Updated, fields));
        }
    }
    let paired_old: HashSet<*const Value> = pairs
        .iter()
        .chain(rebound.iter())
        .map(|(o, _)| *o as *const _)
        .collect();
    let paired_new: HashSet<*const Value> = pairs
        .iter()
        .chain(rebound.iter())
        .map(|(_, n)| *n as *const _)
        .collect();
    for r in old
        .iter()
        .filter(|r| !paired_old.contains(&(*r as *const _)))
    {
        let mut c = rel_change(r, Change::Removed, vec![]);
        c.before = Some(r.clone());
        out.push(c);
    }
    for r in new
        .iter()
        .filter(|r| !paired_new.contains(&(*r as *const _)))
    {
        let mut c = rel_change(r, Change::Added, vec![]);
        c.after = Some(r.clone());
        out.push(c);
    }
    out
}

// ── Components ──────────────────────────────────────────────────────────────

fn comp_change(
    comp: &str,
    kind: &'static str,
    change: Change,
    path: String,
    name: String,
    fields: Vec<PropertyChange>,
) -> RecordChange {
    RecordChange {
        layer: Layer::Component,
        kind,
        change,
        id: format!("{comp}/{path}"),
        component: Some(comp.to_string()),
        name,
        context: None,
        scope: None,
        fields,
        before: None,
        after: None,
    }
}

fn wrap(key: &str, v: Option<&Value>) -> Value {
    match v {
        Some(v) => json!({ key: v }),
        None => json!({}),
    }
}

fn str_of(v: &Value, k: &str) -> String {
    match v.get(k) {
        Some(Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
        None => String::new(),
    }
}

/// Diff two keyed lists (`name`, `value`, ...); a removed and an added record that are equal
/// apart from their key are one rename.
#[allow(clippy::too_many_arguments)]
fn keyed_list(
    comp: &str,
    kind: &'static str,
    prefix: &str,
    old: &[Value],
    new: &[Value],
    key: impl Fn(&Value) -> String,
    rename_field: Option<&str>,
    out: &mut Vec<RecordChange>,
) {
    let om: BTreeMap<String, &Value> = old.iter().map(|v| (key(v), v)).collect();
    let nm: BTreeMap<String, &Value> = new.iter().map(|v| (key(v), v)).collect();
    let mut removed: Vec<&String> = om.keys().filter(|k| !nm.contains_key(*k)).collect();
    let mut added: Vec<&String> = nm.keys().filter(|k| !om.contains_key(*k)).collect();
    if let Some(f) = rename_field {
        let strip = |v: &Value| {
            let mut v = v.clone();
            if let Some(o) = v.as_object_mut() {
                o.remove(f);
            }
            v
        };
        for r in removed.clone() {
            let rs = strip(om[r]);
            if let Some(pos) = added.iter().position(|a| strip(nm[*a]) == rs) {
                let a = added.remove(pos);
                removed.retain(|x| *x != r);
                let mut c = comp_change(
                    comp,
                    kind,
                    Change::Renamed,
                    format!("{prefix}/{a}"),
                    a.clone(),
                    vec![],
                );
                c.before = Some(json!(r));
                out.push(c);
            }
        }
    }
    for r in removed {
        let mut c = comp_change(
            comp,
            kind,
            Change::Removed,
            format!("{prefix}/{r}"),
            r.clone(),
            vec![],
        );
        c.before = Some(om[r].clone());
        out.push(c);
    }
    for a in added {
        let mut c = comp_change(
            comp,
            kind,
            Change::Added,
            format!("{prefix}/{a}"),
            a.clone(),
            vec![],
        );
        c.after = Some(nm[a].clone());
        out.push(c);
    }
    for (k, o) in &om {
        if let Some(n) = nm.get(k) {
            let f = diff_properties(o, n);
            if !f.is_empty() {
                out.push(comp_change(
                    comp,
                    kind,
                    Change::Updated,
                    format!("{prefix}/{k}"),
                    k.clone(),
                    f,
                ));
            }
        }
    }
}

fn arr(v: Option<&Value>) -> &[Value] {
    v.and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
}

fn impl_key(v: &Value) -> String {
    format!(
        "{}:{}",
        str_of(v, "platform"),
        ["package", "importPath", "componentName"]
            .iter()
            .map(|k| str_of(v, k))
            .find(|s| !s.is_empty())
            .unwrap_or_default()
    )
}

fn document_blocks(comp: &str, old: &[Value], new: &[Value], out: &mut Vec<RecordChange>) {
    // Identical blocks cancel; the rest pair by type in order (an edit), else add/remove.
    let mut rest_new: Vec<&Value> = new.iter().collect();
    let mut rest_old = Vec::new();
    for o in old {
        match rest_new.iter().position(|n| *n == o) {
            Some(i) => {
                rest_new.remove(i);
            }
            None => rest_old.push(o),
        }
    }
    let label = |v: &Value| {
        let c = str_of(v, "content");
        format!(
            "{}: {}",
            str_of(v, "type"),
            c.chars().take(48).collect::<String>()
        )
    };
    let mut n = 0;
    for o in rest_old {
        let t = str_of(o, "type");
        match rest_new.iter().position(|b| str_of(b, "type") == t) {
            Some(i) => {
                let b = rest_new.remove(i);
                out.push(comp_change(
                    comp,
                    "document-block",
                    Change::Updated,
                    format!("documentBlocks/{n}"),
                    label(b),
                    diff_properties(o, b),
                ));
            }
            None => {
                let mut c = comp_change(
                    comp,
                    "document-block",
                    Change::Removed,
                    format!("documentBlocks/{n}"),
                    label(o),
                    vec![],
                );
                c.before = Some(o.clone());
                out.push(c);
            }
        }
        n += 1;
    }
    for b in rest_new {
        let mut c = comp_change(
            comp,
            "document-block",
            Change::Added,
            format!("documentBlocks/{n}"),
            label(b),
            vec![],
        );
        c.after = Some(b.clone());
        out.push(c);
        n += 1;
    }
}

fn options(comp: &str, old: Option<&Value>, new: Option<&Value>, out: &mut Vec<RecordChange>) {
    let om = old.and_then(Value::as_object);
    let nm = new.and_then(Value::as_object);
    let empty = serde_json::Map::new();
    let (om, nm) = (om.unwrap_or(&empty), nm.unwrap_or(&empty));
    let mut removed: Vec<&String> = om.keys().filter(|k| !nm.contains_key(*k)).collect();
    let mut added: Vec<&String> = nm.keys().filter(|k| !om.contains_key(*k)).collect();
    for r in removed.clone() {
        if let Some(pos) = added.iter().position(|a| nm[*a] == om[r]) {
            let a = added.remove(pos);
            removed.retain(|x| *x != r);
            let mut c = comp_change(
                comp,
                "option",
                Change::Renamed,
                format!("options/{a}"),
                a.clone(),
                vec![],
            );
            c.before = Some(json!(r));
            out.push(c);
        }
    }
    for r in removed {
        let mut c = comp_change(
            comp,
            "option",
            Change::Removed,
            format!("options/{r}"),
            r.clone(),
            vec![],
        );
        c.before = Some(om[r].clone());
        out.push(c);
    }
    for a in added {
        let mut c = comp_change(
            comp,
            "option",
            Change::Added,
            format!("options/{a}"),
            a.clone(),
            vec![],
        );
        c.after = Some(nm[a].clone());
        out.push(c);
    }
    for (k, o) in om {
        let Some(n) = nm.get(k) else { continue };
        let strip = |v: &Value| {
            let mut v = v.clone();
            if let Some(m) = v.as_object_mut() {
                m.remove("values");
            }
            v
        };
        let f = diff_properties(&strip(o), &strip(n));
        if !f.is_empty() {
            out.push(comp_change(
                comp,
                "option",
                Change::Updated,
                format!("options/{k}"),
                k.clone(),
                f,
            ));
        }
        keyed_list(
            comp,
            "option-value",
            &format!("options/{k}/values"),
            arr(o.get("values")),
            arr(n.get("values")),
            |v| str_of(v, "value"),
            None,
            out,
        );
    }
}

fn component_changes(
    old: &BTreeMap<String, Value>,
    new: &BTreeMap<String, Value>,
) -> Vec<RecordChange> {
    let mut out = Vec::new();
    for name in old
        .keys()
        .chain(new.keys())
        .collect::<std::collections::BTreeSet<_>>()
    {
        match (old.get(name), new.get(name)) {
            (None, Some(n)) => {
                let mut c = comp_change(
                    name,
                    "component",
                    Change::Added,
                    String::new(),
                    name.clone(),
                    vec![],
                );
                c.after = Some(n.clone());
                out.push(c);
            }
            (Some(o), None) => {
                let mut c = comp_change(
                    name,
                    "component",
                    Change::Removed,
                    String::new(),
                    name.clone(),
                    vec![],
                );
                c.before = Some(o.clone());
                out.push(c);
            }
            (Some(o), Some(n)) => diff_component(name, o, n, &mut out),
            (None, None) => {}
        }
    }
    out
}

const STRUCTURED: [&str; 6] = [
    "options",
    "anatomy",
    "states",
    "slots",
    "documentBlocks",
    "implementations",
];

fn diff_component(c: &str, o: &Value, n: &Value, out: &mut Vec<RecordChange>) {
    options(c, o.get("options"), n.get("options"), out);
    let by_name = |v: &Value| str_of(v, "name");
    keyed_list(
        c,
        "anatomy-part",
        "anatomy",
        arr(o.get("anatomy")),
        arr(n.get("anatomy")),
        by_name,
        Some("name"),
        out,
    );
    keyed_list(
        c,
        "state",
        "states",
        arr(o.get("states")),
        arr(n.get("states")),
        by_name,
        Some("name"),
        out,
    );
    keyed_list(
        c,
        "slot",
        "slots",
        arr(o.get("slots")),
        arr(n.get("slots")),
        by_name,
        Some("name"),
        out,
    );
    keyed_list(
        c,
        "implementation",
        "implementations",
        arr(o.get("implementations")),
        arr(n.get("implementations")),
        impl_key,
        None,
        out,
    );
    document_blocks(
        c,
        arr(o.get("documentBlocks")),
        arr(n.get("documentBlocks")),
        out,
    );
    let (Some(om), Some(nm)) = (o.as_object(), n.as_object()) else {
        return;
    };
    for k in om
        .keys()
        .chain(nm.keys())
        .collect::<std::collections::BTreeSet<_>>()
    {
        if STRUCTURED.contains(&k.as_str()) {
            continue;
        }
        let f = diff_properties(&wrap(k, om.get(k)), &wrap(k, nm.get(k)));
        if f.is_empty() {
            continue;
        }
        let kind = if k == "lifecycle" {
            "lifecycle"
        } else {
            "component"
        };
        out.push(comp_change(
            c,
            kind,
            Change::Updated,
            k.clone(),
            k.clone(),
            f,
        ));
    }
}

// ── Visual recipes ──────────────────────────────────────────────────────────

fn visual_changes(
    old: &BTreeMap<String, Value>,
    new: &BTreeMap<String, Value>,
) -> Vec<RecordChange> {
    let mk = |comp: &str, kind, change, path: String, name: String, fields| RecordChange {
        layer: Layer::Visual,
        ..comp_change(comp, kind, change, path, name, fields)
    };
    let mut out = Vec::new();
    for name in old
        .keys()
        .chain(new.keys())
        .collect::<std::collections::BTreeSet<_>>()
    {
        match (old.get(name), new.get(name)) {
            (None, Some(n)) => {
                let mut c = mk(
                    name,
                    "visual-recipe",
                    Change::Added,
                    "visual".into(),
                    name.clone(),
                    vec![],
                );
                c.after = Some(
                    json!({ "parts": n.get("parts").and_then(Value::as_object).map(|p| p.keys().collect::<Vec<_>>()) }),
                );
                out.push(c);
            }
            (Some(_), None) => out.push(mk(
                name,
                "visual-recipe",
                Change::Removed,
                "visual".into(),
                name.clone(),
                vec![],
            )),
            (Some(o), Some(n)) => {
                let empty = serde_json::Map::new();
                let op = o.get("parts").and_then(Value::as_object).unwrap_or(&empty);
                let np = n.get("parts").and_then(Value::as_object).unwrap_or(&empty);
                for k in op
                    .keys()
                    .chain(np.keys())
                    .collect::<std::collections::BTreeSet<_>>()
                {
                    let path = format!("visual/parts/{k}");
                    match (op.get(k), np.get(k)) {
                        (None, Some(_)) => out.push(mk(
                            name,
                            "visual-part",
                            Change::Added,
                            path,
                            k.clone(),
                            vec![],
                        )),
                        (Some(_), None) => out.push(mk(
                            name,
                            "visual-part",
                            Change::Removed,
                            path,
                            k.clone(),
                            vec![],
                        )),
                        (Some(a), Some(b)) => {
                            let f = diff_properties(a, b);
                            if !f.is_empty() {
                                out.push(mk(
                                    name,
                                    "visual-part",
                                    Change::Updated,
                                    path,
                                    k.clone(),
                                    f,
                                ));
                            }
                        }
                        _ => {}
                    }
                }
                let (Some(om), Some(nm)) = (o.as_object(), n.as_object()) else {
                    continue;
                };
                for k in om
                    .keys()
                    .chain(nm.keys())
                    .collect::<std::collections::BTreeSet<_>>()
                {
                    if k == "parts" {
                        continue;
                    }
                    let f = diff_properties(&wrap(k, om.get(k)), &wrap(k, nm.get(k)));
                    if !f.is_empty() {
                        out.push(mk(
                            name,
                            "visual",
                            Change::Updated,
                            format!("visual/{k}"),
                            k.clone(),
                            f,
                        ));
                    }
                }
            }
            (None, None) => {}
        }
    }
    out
}

impl PropertyChange {
    /// True when this change only removed an option `default`, which is not breaking.
    pub fn is_default_removal(&self) -> bool {
        self.change_type == ChangeType::Deleted && self.path.ends_with("default")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(
        rels: Vec<Value>,
        comps: Vec<(&str, Value)>,
        visuals: Vec<(&str, Value)>,
    ) -> DatasetSnapshot {
        DatasetSnapshot {
            graph: TokenGraph::default(),
            relationships: rels,
            components: comps.into_iter().map(|(k, v)| (k.into(), v)).collect(),
            visuals: visuals.into_iter().map(|(k, v)| (k.into(), v)).collect(),
        }
    }

    fn rel(uuid: &str, r: &str) -> Value {
        json!({"scope": {"component": "c", "property": "p"}, "context": "Height", "$ref": r, "uuid": uuid})
    }

    #[test]
    fn key_order_and_formatting_make_no_changes() {
        let a = snap(
            vec![
                json!({"uuid": "1", "scope": {"component": "c", "property": "p"}, "context": "X", "$ref": "t"}),
            ],
            vec![],
            vec![],
        );
        let b = snap(
            vec![
                json!({"$ref": "t", "context": "X", "scope": {"property": "p", "component": "c"}, "uuid": "1"}),
            ],
            vec![],
            vec![],
        );
        assert!(diff_datasets(&a, &b).changes.is_empty());
    }

    #[test]
    fn relationship_rebinding_is_an_update_not_remove_and_add() {
        let d = diff_datasets(
            &snap(vec![rel("1", "old")], vec![], vec![]),
            &snap(vec![rel("2", "new")], vec![], vec![]),
        );
        assert_eq!(d.changes.len(), 1);
        assert_eq!(d.changes[0].change, Change::Updated);
        assert_eq!(d.changes[0].fields[0].path, "$ref");
        let d = diff_datasets(
            &snap(vec![rel("1", "t")], vec![], vec![]),
            &snap(vec![], vec![], vec![]),
        );
        assert_eq!(d.changes[0].change, Change::Removed);
    }

    #[test]
    fn duplicate_records_pair_in_file_order() {
        let r = |t: &str| json!({"scope": {"component": "c", "property": "p"}, "context": "X", "$ref": t});
        let old = vec![r("a"), r("a"), r("b")];
        let new = vec![r("c"), r("d"), r("e")];
        let first = diff_datasets(
            &snap(old.clone(), vec![], vec![]),
            &snap(new.clone(), vec![], vec![]),
        );
        for _ in 0..20 {
            let again = diff_datasets(
                &snap(old.clone(), vec![], vec![]),
                &snap(new.clone(), vec![], vec![]),
            );
            assert_eq!(
                serde_json::to_string(&again.changes).unwrap(),
                serde_json::to_string(&first.changes).unwrap()
            );
        }
    }

    #[test]
    fn assigning_a_uuid_to_a_relationship_is_not_a_change() {
        let mut old = rel("1", "t");
        old.as_object_mut().unwrap().remove("uuid");
        let d = diff_datasets(
            &snap(vec![old], vec![], vec![]),
            &snap(vec![rel("1", "t")], vec![], vec![]),
        );
        assert!(d.changes.is_empty());
    }

    #[test]
    fn component_records() {
        let o = json!({"name": "c", "options": {"size": {"values": [{"value": "s"}, {"value": "m"}]}, "old": {"type": "boolean"}},
            "anatomy": [{"name": "icon"}], "states": [{"name": "hover"}], "documentBlocks": [{"type": "purpose", "content": "a"}]});
        let n = json!({"name": "c", "options": {"size": {"values": [{"value": "s"}]}, "renamed": {"type": "boolean"}},
            "anatomy": [{"name": "glyph"}], "states": [], "documentBlocks": [{"type": "purpose", "content": "b"}]});
        let d = diff_datasets(
            &snap(vec![], vec![("c", o)], vec![]),
            &snap(vec![], vec![("c", n)], vec![]),
        );
        let got: Vec<_> = d.changes.iter().map(|c| (c.kind, c.change)).collect();
        for want in [
            ("option-value", Change::Removed),
            ("option", Change::Renamed),
            ("anatomy-part", Change::Renamed),
            ("state", Change::Removed),
            ("document-block", Change::Updated),
        ] {
            assert!(got.contains(&want), "{want:?} in {got:?}");
        }
    }

    #[test]
    fn visual_recipe_introduced() {
        let d = diff_datasets(
            &snap(vec![], vec![], vec![]),
            &snap(vec![], vec![], vec![("c", json!({"parts": {"a": {}}}))]),
        );
        assert_eq!(
            (d.changes[0].kind, d.changes[0].change),
            ("visual-recipe", Change::Added)
        );
    }
}
