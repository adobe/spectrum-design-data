// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data platform impact`: which data changes between two releases hit a platform.
//!
//! Reads the per-component `changelog/<component>.json` files of the `--to` release (each holds
//! the whole history, so `--from` only filters on the `release` field) and keeps the entries
//! that touch what the platform binds: the relationship `{property, context}` and token
//! selectors, option and state names and nested components of its own recipes, and the uuids of
//! relationships its manifest overrides or removes.
//!
//! Not covered yet: the manifest's token `overrides[].target`, and foundation recipe changes
//! for a component the platform did not replace.

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use serde_json::{Map, Value};

use crate::graph::{Layer, TokenGraph};

/// What the platform binds, with where each binding is written.
#[derive(Debug, Default)]
pub struct Bindings {
    /// Components with a platform recipe, and components those recipes nest.
    pub components: BTreeSet<String>,
    pub relationships: Vec<RelBinding>,
    pub tokens: Vec<TokBinding>,
    /// Option and state names each component's recipes read.
    pub names: BTreeMap<String, BTreeSet<String>>,
    /// Foundation relationships the manifest overrides or removes by uuid.
    pub uuids: BTreeSet<String>,
}

#[derive(Debug)]
pub struct RelBinding {
    pub component: String,
    pub property: String,
    pub context: String,
    pub at: String,
}

#[derive(Debug)]
pub struct TokBinding {
    pub component: String,
    pub selector: Map<String, Value>,
    pub at: String,
}

/// Collect the bindings of every platform-owned recipe in `graph` (manifest applied) and the
/// relationship overrides in `manifest`.
pub fn collect_bindings(graph: &TokenGraph, manifest: &Value) -> Bindings {
    let mut b = Bindings::default();
    for v in graph.visuals.iter().filter(|v| v.layer == Layer::Platform) {
        b.components.insert(v.component.clone());
        let file = v.file.display().to_string();
        walk(&v.component, &v.raw, &file, "", &mut b);
    }
    for e in manifest
        .pointer("/extensions/relationships")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if matches!(
            e.get("op").and_then(Value::as_str),
            Some("override" | "remove")
        ) {
            if let Some(u) = e.get("uuid").and_then(Value::as_str) {
                b.uuids.insert(u.to_string());
            }
        }
    }
    b
}

fn walk(component: &str, value: &Value, file: &str, path: &str, b: &mut Bindings) {
    match value {
        Value::Object(map) => {
            for (key, v) in map {
                // A relationship or token selector is the value of a `relationship` or `token`
                // key; the binding is the node that holds it.
                let at = format!("{file}#{path}");
                match (key.as_str(), v) {
                    ("relationship", Value::Object(r)) => {
                        let text = |k: &str| r.get(k).and_then(Value::as_str).unwrap_or_default();
                        b.relationships.push(RelBinding {
                            component: component.to_string(),
                            property: text("property").to_string(),
                            context: text("context").trim().to_string(),
                            at: at.clone(),
                        });
                    }
                    ("token", Value::Object(t)) => b.tokens.push(TokBinding {
                        component: component.to_string(),
                        selector: t.clone(),
                        at: at.clone(),
                    }),
                    ("option", Value::String(name)) => add_name(b, component, name),
                    ("when", Value::Object(w)) => {
                        for name in w
                            .get("options")
                            .and_then(Value::as_object)
                            .into_iter()
                            .flat_map(Map::keys)
                        {
                            add_name(b, component, name);
                        }
                        for s in w
                            .get("states")
                            .and_then(Value::as_array)
                            .into_iter()
                            .flatten()
                            .filter_map(Value::as_str)
                        {
                            add_name(b, component, s);
                        }
                    }
                    ("component", Value::String(nested)) if map.get("kind").is_some() => {
                        b.components.insert(nested.clone());
                    }
                    _ => {}
                }
                walk(component, v, file, &format!("{path}/{key}"), b);
            }
        }
        Value::Array(items) => {
            for (i, v) in items.iter().enumerate() {
                walk(component, v, file, &format!("{path}/{i}"), b);
            }
        }
        Value::String(s) => {
            for name in crate::visual::template_names(&Value::String(s.clone())) {
                add_name(b, component, &name);
            }
        }
        _ => {}
    }
}

fn add_name(b: &mut Bindings, component: &str, name: &str) {
    b.names
        .entry(component.to_string())
        .or_default()
        .insert(name.to_string());
}

/// How an entry affects the platform.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Class {
    /// A binding names something that is gone or renamed.
    Breaks,
    /// A binding still resolves, to a different token or value.
    Changes,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct Finding {
    pub class: Class,
    pub component: String,
    /// The earliest data release that carries this change.
    pub release: String,
    pub message: String,
    /// Every place the platform writes a binding this change touches (`file#/json/pointer`).
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub bindings: Vec<String>,
    /// The pull request or commit that made the change.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    /// How many changelog entries collapse into this finding.
    pub entries: usize,
}

#[derive(Debug, serde::Serialize)]
pub struct Report {
    pub from: String,
    pub to: String,
    pub findings: Vec<Finding>,
    /// Releases between `from` and `to` that changed a component the platform uses.
    pub releases: Vec<String>,
    /// Components the platform uses that have no changelog in the `--to` data.
    pub no_changelog: Vec<String>,
    /// Plain-language limits of this report.
    pub notes: Vec<String>,
}

/// A `{name}` placeholder in `pattern` matches any run of characters. Both sides are trimmed.
fn glob(pattern: &str, value: &str) -> bool {
    let (pattern, value) = (pattern.trim(), value.trim());
    let mut literals: Vec<&str> = Vec::new();
    let mut rest = pattern;
    while let Some(open) = rest.find('{') {
        literals.push(&rest[..open]);
        match rest[open..].find('}') {
            Some(close) => rest = &rest[open + close + 1..],
            None => {
                rest = "";
                break;
            }
        }
    }
    literals.push(rest);
    if literals.len() == 1 {
        return pattern == value;
    }
    let first = literals[0];
    let last = literals[literals.len() - 1];
    if !value.starts_with(first) || !value.ends_with(last) || value.len() < first.len() + last.len()
    {
        return false;
    }
    let mut at = first.len();
    let end = value.len() - last.len();
    for lit in &literals[1..literals.len() - 1] {
        match value[at..end].find(lit) {
            Some(i) => at += i + lit.len(),
            None => return false,
        }
    }
    true
}

fn str_list(v: Option<&Value>) -> Vec<&str> {
    v.and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect()
}

fn field<'a>(entry: &'a Value, path: &str) -> Option<&'a Value> {
    entry
        .get("fields")?
        .as_array()?
        .iter()
        .find(|f| f.get("path").and_then(Value::as_str) == Some(path))
}

fn property_of(entry: &Value) -> String {
    entry
        .pointer("/scope/property")
        .and_then(Value::as_str)
        .map(String::from)
        .unwrap_or_else(|| {
            let name = entry.get("name").and_then(Value::as_str).unwrap_or("");
            name.split('[').next().unwrap_or(name).to_string()
        })
}

fn show(v: Option<&Value>) -> String {
    match v {
        Some(Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
        None => "none".into(),
    }
}

/// The name fields of a changelog entry's `name`, e.g. `size=m,structure=base` from
/// `corner-radius[size=m,structure=base]`, as they are after the change and before it
/// (a `name.<field>` entry in `fields` says what the field was).
fn name_fields(entry: &Value) -> (BTreeMap<String, String>, BTreeMap<String, String>) {
    let name = entry.get("name").and_then(Value::as_str).unwrap_or("");
    let mut after = BTreeMap::new();
    if let Some((_, rest)) = name.split_once('[') {
        for pair in rest.trim_end_matches(']').split(',') {
            if let Some((k, v)) = pair.split_once('=') {
                after.insert(k.to_string(), v.to_string());
            }
        }
    }
    let mut before = after.clone();
    for f in entry
        .get("fields")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let Some(key) = f
            .get("path")
            .and_then(Value::as_str)
            .and_then(|p| p.strip_prefix("name."))
        else {
            continue;
        };
        match f.get("before") {
            Some(Value::String(v)) => before.insert(key.to_string(), v.clone()),
            Some(other) => before.insert(key.to_string(), other.to_string()),
            None => before.remove(key),
        };
    }
    (before, after)
}

/// Whether a token selector selects a token with this property and name fields. A selector
/// field the changelog name does not list is not held against it: the name lists only the
/// fields that tell tokens of one property apart.
fn selects(
    selector: &Map<String, Value>,
    property: &str,
    fields: &BTreeMap<String, String>,
) -> bool {
    selector.iter().all(|(key, want)| {
        let want = match want {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };
        if key == "property" {
            return glob(&want, property);
        }
        fields.get(key).is_none_or(|have| glob(&want, have))
    })
}

/// One way a changelog entry touches the platform: how, why, and where it is bound.
struct Hit {
    class: Class,
    message: String,
    at: Option<String>,
}

fn hit(class: Class, message: String, at: Option<&str>) -> Hit {
    Hit {
        class,
        message,
        at: at.map(String::from),
    }
}

/// How one changelog entry of `component` touches the platform: every binding it reaches.
fn classify(b: &Bindings, component: &str, entry: &Value) -> Vec<Hit> {
    let (Some(kind), Some(change)) = (
        entry.get("kind").and_then(Value::as_str),
        entry.get("change").and_then(Value::as_str),
    ) else {
        return vec![];
    };
    let name = entry.get("name").and_then(Value::as_str).unwrap_or("");
    let contexts = str_list(entry.get("contexts"));
    let mut hits = Vec::new();
    match kind {
        "relationship" => {
            let property = property_of(entry);
            let record = entry.get("record").and_then(Value::as_str).unwrap_or("");
            if b.uuids.contains(record) {
                let class = if change == "removed" {
                    Class::Breaks
                } else {
                    Class::Changes
                };
                hits.push(hit(
                    class,
                    format!("a foundation relationship your manifest overrides or removes was {change} ({property})"),
                    None,
                ));
            }
            let renamed_from = field(entry, "context")
                .and_then(|f| f.get("before"))
                .and_then(Value::as_str);
            for rb in b
                .relationships
                .iter()
                .filter(|r| r.component == component && glob(&r.property, &property))
            {
                let in_contexts = contexts.iter().any(|c| glob(&rb.context, c));
                let at = Some(rb.at.as_str());
                match change {
                    "removed" if in_contexts => hits.push(hit(
                        Class::Breaks,
                        format!("relationship '{property}' / '{}' was removed", rb.context),
                        at,
                    )),
                    "updated" => {
                        if let Some(before) = renamed_from.filter(|x| glob(&rb.context, x)) {
                            let after = show(field(entry, "context").and_then(|f| f.get("after")));
                            hits.push(hit(
                                Class::Breaks,
                                format!("context '{before}' was renamed to '{after}' (property '{property}'); this binding names the old one"),
                                at,
                            ));
                        } else if in_contexts {
                            let what = if field(entry, "$ref").is_some() {
                                "now points to a different token"
                            } else {
                                "changed (option pins or other fields)"
                            };
                            hits.push(hit(
                                Class::Changes,
                                format!("relationship '{property}' / '{}' {what}", rb.context),
                                at,
                            ));
                        }
                    }
                    "added" if in_contexts => hits.push(hit(
                        Class::Changes,
                        format!(
                            "a new record for '{property}' / '{}' can change which token resolves",
                            rb.context
                        ),
                        at,
                    )),
                    _ => {}
                }
            }
        }
        "token" => {
            let property = property_of(entry);
            let (before, after) = name_fields(entry);
            let what = match (change, field(entry, "value")) {
                ("updated", Some(v)) => format!(
                    "token '{property}' changed value {} to {}",
                    show(v.get("before")),
                    show(v.get("after"))
                ),
                ("renamed", _) => format!("token '{property}' was renamed ({name})"),
                _ => format!("token '{property}' {change}"),
            };
            for tb in b.tokens.iter().filter(|t| t.component == component) {
                let now = selects(&tb.selector, &property, &after);
                let then = selects(&tb.selector, &property, &before);
                let at = Some(tb.at.as_str());
                match (change, then, now) {
                    // A rename moved the token out of the selector's reach.
                    ("renamed", true, false) => hits.push(hit(
                        Class::Breaks,
                        format!("{what}; this selector no longer matches it"),
                        at,
                    )),
                    (_, _, true) => hits.push(hit(Class::Changes, what.clone(), at)),
                    _ => {}
                }
            }
            if hits.is_empty() {
                if let Some(rb) = b.relationships.iter().find(|r| {
                    r.component == component && contexts.iter().any(|c| glob(&r.context, c))
                }) {
                    hits.push(hit(
                        Class::Changes,
                        format!("{what}; reached through '{}'", rb.context),
                        Some(rb.at.as_str()),
                    ));
                }
            }
        }
        "option" | "state" | "anatomy-part" => {
            let before = entry.get("before").and_then(Value::as_str).unwrap_or(name);
            if let Some(used) = b.names.get(component) {
                let touched = used.contains(name) || used.contains(before);
                match change {
                    "removed" | "renamed" if touched => hits.push(hit(
                        Class::Breaks,
                        format!(
                            "{kind} '{before}' was {change}{}",
                            if change == "renamed" {
                                format!(" to '{name}'")
                            } else {
                                String::new()
                            }
                        ),
                        None,
                    )),
                    "updated" if touched && kind != "anatomy-part" => hits.push(hit(
                        Class::Changes,
                        format!("{kind} '{name}' changed"),
                        None,
                    )),
                    _ => {}
                }
            }
        }
        "component" if change == "removed" && b.components.contains(component) => hits.push(hit(
            Class::Breaks,
            format!("component '{component}' was removed"),
            None,
        )),
        _ => {}
    }
    hits
}

fn source_of(commit: &Value) -> Option<String> {
    let s = commit.get("source")?;
    let title = s.get("title").and_then(Value::as_str)?;
    match s.get("url").and_then(Value::as_str) {
        Some(url) => Some(format!("{title} ({url})")),
        None => Some(title.to_string()),
    }
}

/// Parse `3.15.1` or `@adobe/spectrum-design-data@3.15.1`.
///
/// shortcut: prereleases are not handled. semver orders `3.15.1-beta.1` before `3.15.1`, so a
/// prerelease `release` would fall inside a range it should not; none of the changelogs has one
/// (29 releases), so handle it when the first appears.
pub fn parse_version(text: &str) -> Result<semver::Version, semver::Error> {
    semver::Version::parse(text.rsplit('@').next().unwrap_or(text))
}

/// The impact of the releases after `from` up to and including `to` on `bindings`, read from
/// `changelog_dir` (`<dataset>/changelog`).
pub fn impact(
    bindings: &Bindings,
    changelog_dir: &Path,
    from: &semver::Version,
    to: &semver::Version,
) -> std::io::Result<Report> {
    let mut findings: Vec<Finding> = Vec::new();
    let mut releases: BTreeSet<semver::Version> = BTreeSet::new();
    let mut no_changelog = Vec::new();
    let mut notes = Vec::new();
    for component in &bindings.components {
        let file = changelog_dir.join(format!("{component}.json"));
        let Ok(text) = std::fs::read_to_string(&file) else {
            no_changelog.push(component.clone());
            continue;
        };
        let doc: Value = serde_json::from_str(&text)
            .map_err(|e| std::io::Error::other(format!("{}: {e}", file.display())))?;
        if let Some(base) = doc
            .pointer("/baseline/release")
            .and_then(Value::as_str)
            .and_then(|r| semver::Version::parse(r).ok())
            .filter(|base| base > from)
        {
            notes.push(format!(
                "{component}: its changelog starts at release {base}, after {from}; earlier changes are not listed"
            ));
        }
        for release in doc
            .get("releases")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let Some(version) = release
                .get("release")
                .and_then(Value::as_str)
                .and_then(|r| semver::Version::parse(r).ok())
            else {
                continue;
            };
            if &version <= from || &version > to {
                continue;
            }
            for commit in release
                .get("commits")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                for entry in commit
                    .get("entries")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    let hits = classify(bindings, component, entry);
                    if hits.is_empty() {
                        continue;
                    }
                    releases.insert(version.clone());
                    // One count per entry and message, however many bindings it reaches.
                    let mut counted: BTreeSet<(Class, String)> = BTreeSet::new();
                    for h in hits {
                        let existing = findings.iter_mut().find(|f| {
                            f.component == *component
                                && f.class == h.class
                                && f.message == h.message
                        });
                        let f = match existing {
                            Some(f) => f,
                            None => {
                                findings.push(Finding {
                                    class: h.class,
                                    component: component.clone(),
                                    release: version.to_string(),
                                    message: h.message.clone(),
                                    bindings: vec![],
                                    source: source_of(commit),
                                    entries: 0,
                                });
                                findings.last_mut().expect("just pushed")
                            }
                        };
                        if let Some(at) = h.at {
                            if !f.bindings.contains(&at) {
                                f.bindings.push(at);
                            }
                        }
                        if counted.insert((h.class, h.message)) {
                            f.entries += 1;
                        }
                        // Releases need not be listed oldest first: keep the earliest.
                        if semver::Version::parse(&f.release).is_ok_and(|first| version < first) {
                            f.release = version.to_string();
                            f.source = source_of(commit);
                        }
                    }
                }
            }
        }
    }
    findings.sort_by(|a, b| {
        (a.class, &a.component, &a.release).cmp(&(b.class, &b.component, &b.release))
    });
    let contextless = bindings
        .relationships
        .iter()
        .filter(|r| r.context.is_empty())
        .count();
    if contextless > 0 {
        notes.push(format!(
            "{contextless} relationship binding(s) name no `context`, so the renderer never resolves them and this report cannot match them; `validate-manifest` reports them."
        ));
    }
    notes.push(
        "Not covered yet: the manifest's token overrides (`overrides[].target`), and changes to a foundation recipe for a component the platform did not replace.".into(),
    );
    Ok(Report {
        from: from.to_string(),
        to: to.to_string(),
        findings,
        releases: releases.iter().map(ToString::to_string).collect(),
        no_changelog,
        notes,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn bindings() -> Bindings {
        let mut b = Bindings::default();
        b.components.insert("action-button".into());
        b.relationships.push(RelBinding {
            component: "action-button".into(),
            property: "color".into(),
            context: "Background (selected, non emphasized)".into(),
            at: "v.json#/parts/c/props/fill".into(),
        });
        b.relationships.push(RelBinding {
            component: "action-button".into(),
            property: "color".into(),
            context: "Label {tone}".into(),
            at: "v.json#/parts/l/props/fill".into(),
        });
        b.tokens.push(TokBinding {
            component: "action-button".into(),
            selector: json!({ "property": "corner-radius" })
                .as_object()
                .unwrap()
                .clone(),
            at: "v.json#/parts/c/props/cornerRadius".into(),
        });
        b.names
            .entry("action-button".into())
            .or_default()
            .extend(["isQuiet".to_string(), "selectedTextColor".to_string()]);
        b
    }

    fn changelog(entries: Vec<Value>) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("action-button.json"),
            json!({ "component": "action-button",
                "baseline": { "release": "2.1.0" },
                "releases": [{ "release": "3.15.0", "commits": [{
                    "source": { "title": "fix: contexts (#1827)", "url": "https://x/1827" },
                    "entries": entries }] }] })
            .to_string(),
        )
        .unwrap();
        dir
    }

    fn run(entries: Vec<Value>, from: &str, to: &str) -> Report {
        let dir = changelog(entries);
        impact(
            &bindings(),
            dir.path(),
            &parse_version(from).unwrap(),
            &parse_version(to).unwrap(),
        )
        .unwrap()
    }

    fn rel(change: &str, context: &str, fields: Value) -> Value {
        json!({ "kind": "relationship", "change": change, "contexts": [context],
            "scope": { "property": "color" }, "name": "color", "record": "u", "fields": fields })
    }

    #[test]
    fn a_renamed_context_the_recipe_binds_breaks() {
        let e = rel(
            "updated",
            "Background",
            json!([{ "path": "context",
                "before": "Background (selected, non emphasized)", "after": "Background" }]),
        );
        let r = run(vec![e.clone(), e], "3.13.0", "3.15.1");
        assert_eq!(r.findings.len(), 1, "{:?}", r.findings);
        let f = &r.findings[0];
        assert_eq!(f.class, Class::Breaks);
        assert_eq!(f.entries, 2);
        assert!(f.message.contains("renamed to 'Background'"), "{f:?}");
        assert_eq!(f.bindings, ["v.json#/parts/c/props/fill"]);
        assert_eq!(
            f.source.as_deref(),
            Some("fix: contexts (#1827) (https://x/1827)")
        );
        assert_eq!(r.releases, ["3.15.0"]);
    }

    #[test]
    fn a_release_outside_the_range_is_ignored() {
        let e = rel(
            "removed",
            "Background (selected, non emphasized)",
            json!([]),
        );
        assert!(run(vec![e.clone()], "3.15.0", "3.16.0").findings.is_empty());
        assert!(run(vec![e.clone()], "3.13.0", "3.14.0").findings.is_empty());
        assert_eq!(run(vec![e], "3.14.0", "3.15.0").findings.len(), 1);
    }

    #[test]
    fn a_removed_relationship_breaks_and_a_repoint_changes() {
        let removed = rel(
            "removed",
            "Background (selected, non emphasized)",
            json!([]),
        );
        let repoint = rel(
            "updated",
            "Label bold",
            json!([{ "path": "$ref", "before": "a", "after": "b" }]),
        );
        let r = run(vec![removed, repoint], "3.13.0", "3.15.1");
        let classes: Vec<_> = r.findings.iter().map(|f| f.class).collect();
        assert_eq!(classes, [Class::Breaks, Class::Changes], "{:?}", r.findings);
    }

    #[test]
    fn an_unbound_context_is_not_reported() {
        let e = rel("removed", "Some other context", json!([]));
        assert!(run(vec![e], "3.13.0", "3.15.1").findings.is_empty());
    }

    #[test]
    fn a_token_value_change_reaches_the_platform_through_a_binding() {
        let direct = json!({ "kind": "token", "change": "updated", "contexts": [],
            "name": "corner-radius[size=m]",
            "fields": [{ "path": "value", "before": "4px", "after": "6px" }] });
        let reached = json!({ "kind": "token", "change": "updated",
            "contexts": ["Label bold"], "name": "text-color",
            "fields": [{ "path": "value", "before": "#111", "after": "#222" }] });
        let unrelated = json!({ "kind": "token", "change": "updated",
            "contexts": ["Elsewhere"], "name": "gap", "fields": [] });
        let r = run(vec![direct, reached, unrelated], "3.13.0", "3.15.1");
        assert_eq!(r.findings.len(), 2, "{:?}", r.findings);
        assert!(r.findings.iter().all(|f| f.class == Class::Changes));
        assert!(r.findings.iter().any(|f| f.message.contains("4px to 6px")));
    }

    #[test]
    fn a_removed_option_the_recipe_reads_breaks() {
        let used = json!({ "kind": "option", "change": "removed", "contexts": [],
            "name": "selectedTextColor", "fields": [] });
        let other = json!({ "kind": "option", "change": "removed", "contexts": [],
            "name": "unusedOption", "fields": [] });
        let r = run(vec![used, other], "3.13.0", "3.15.1");
        assert_eq!(r.findings.len(), 1, "{:?}", r.findings);
        assert_eq!(r.findings[0].class, Class::Breaks);
    }

    #[test]
    fn a_manifest_override_by_uuid_is_matched() {
        let mut b = bindings();
        b.uuids.insert("u".into());
        let dir = changelog(vec![rel("removed", "Anything", json!([]))]);
        let r = impact(
            &b,
            dir.path(),
            &parse_version("3.13.0").unwrap(),
            &parse_version("3.15.1").unwrap(),
        )
        .unwrap();
        assert_eq!(r.findings.len(), 1);
        assert_eq!(r.findings[0].class, Class::Breaks);
    }

    #[test]
    fn a_changelog_that_starts_after_from_is_noted() {
        let r = run(vec![], "2.0.0", "3.15.1");
        assert!(
            r.notes
                .iter()
                .any(|n| n.contains("starts at release 2.1.0")),
            "{:?}",
            r.notes
        );
    }

    fn token_binding(selector: Value) -> Bindings {
        let mut b = Bindings::default();
        b.components.insert("action-button".into());
        b.tokens.push(TokBinding {
            component: "action-button".into(),
            selector: selector.as_object().unwrap().clone(),
            at: "v.json#/parts/c/props/cornerRadius".into(),
        });
        b
    }

    fn run_with(b: &Bindings, entries: Vec<Value>) -> Report {
        let dir = changelog(entries);
        impact(
            b,
            dir.path(),
            &parse_version("3.13.0").unwrap(),
            &parse_version("3.15.1").unwrap(),
        )
        .unwrap()
    }

    fn renamed(name: &str, fields: Value) -> Value {
        json!({ "kind": "token", "change": "renamed", "contexts": [], "name": name, "fields": fields })
    }

    #[test]
    fn a_token_selector_at_one_size_ignores_another_size() {
        let b = token_binding(json!({ "property": "corner-radius", "size": "l" }));
        let m = renamed(
            "corner-radius[size=m]",
            json!([{ "path": "name.legacyKey", "after": "x" }]),
        );
        assert!(run_with(&b, vec![m]).findings.is_empty());
        let value = json!({ "kind": "token", "change": "updated", "contexts": [],
            "name": "corner-radius[size=m]",
            "fields": [{ "path": "value", "before": "4px", "after": "6px" }] });
        assert!(run_with(&b, vec![value]).findings.is_empty());
        let l = json!({ "kind": "token", "change": "updated", "contexts": [],
            "name": "corner-radius[size=l]",
            "fields": [{ "path": "value", "before": "4px", "after": "6px" }] });
        assert_eq!(run_with(&b, vec![l]).findings[0].class, Class::Changes);
    }

    #[test]
    fn a_rename_that_moves_a_token_out_of_the_selector_breaks() {
        let b = token_binding(json!({ "property": "gap", "anatomy": "focus-ring" }));
        let moved = renamed(
            "gap[anatomy=focus-indicator]",
            json!([{ "path": "name.anatomy", "before": "focus-ring", "after": "focus-indicator" }]),
        );
        let r = run_with(&b, vec![moved]);
        assert_eq!(r.findings.len(), 1, "{:?}", r.findings);
        assert_eq!(r.findings[0].class, Class::Breaks);
        // A rename of a field the selector does not name does not break it.
        let other = renamed(
            "gap[anatomy=focus-ring,legacyKey=new]",
            json!([{ "path": "name.legacyKey", "before": "old", "after": "new" }]),
        );
        assert_eq!(run_with(&b, vec![other]).findings[0].class, Class::Changes);
    }

    #[test]
    fn every_binding_a_change_reaches_is_listed() {
        let mut b = bindings();
        b.relationships.push(RelBinding {
            component: "action-button".into(),
            property: "color".into(),
            context: "Background (selected, non emphasized)".into(),
            at: "other.json#/parts/x/props/fill".into(),
        });
        let removed = rel(
            "removed",
            "Background (selected, non emphasized)",
            json!([]),
        );
        let r = run_with(&b, vec![removed]);
        assert_eq!(r.findings.len(), 1, "{:?}", r.findings);
        assert_eq!(r.findings[0].entries, 1);
        assert_eq!(
            r.findings[0].bindings,
            [
                "v.json#/parts/c/props/fill",
                "other.json#/parts/x/props/fill"
            ]
        );
    }

    #[test]
    fn the_earliest_release_is_kept_whatever_the_file_order() {
        let dir = tempfile::tempdir().unwrap();
        let release = |v: &str| {
            json!({ "release": v, "commits": [{ "entries": [
            rel("removed", "Background (selected, non emphasized)", json!([]))] }] })
        };
        std::fs::write(
            dir.path().join("action-button.json"),
            json!({ "component": "action-button",
                "releases": [release("3.15.0"), release("3.14.0")] })
            .to_string(),
        )
        .unwrap();
        let r = impact(
            &bindings(),
            dir.path(),
            &parse_version("3.13.0").unwrap(),
            &parse_version("3.15.1").unwrap(),
        )
        .unwrap();
        assert_eq!(r.findings.len(), 1);
        assert_eq!(r.findings[0].release, "3.14.0");
        assert_eq!(r.findings[0].entries, 2);
    }

    #[test]
    fn a_binding_with_no_context_is_called_out() {
        let mut b = bindings();
        b.relationships.push(RelBinding {
            component: "action-button".into(),
            property: "color".into(),
            context: String::new(),
            at: "v.json#/x".into(),
        });
        let r = run_with(&b, vec![]);
        assert!(
            r.notes.iter().any(|n| n.contains("name no `context`")),
            "{:?}",
            r.notes
        );
    }

    #[test]
    fn placeholders_match_any_run() {
        assert!(glob("Label {tone}", "Label bold"));
        assert!(glob("Fill {a} on {b}", "Fill x on y"));
        assert!(!glob("Label {tone}", "Background"));
        assert!(glob(" Control ", "Control"));
        assert!(!glob("Control", "Control (size)"));
    }

    #[test]
    fn versions_parse_with_or_without_the_package_prefix() {
        assert_eq!(
            parse_version("@adobe/spectrum-design-data@3.15.1")
                .unwrap()
                .to_string(),
            "3.15.1"
        );
        assert!(parse_version("latest").is_err());
    }
}
