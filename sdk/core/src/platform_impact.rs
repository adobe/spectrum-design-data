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
    /// The first data release that carries this change.
    pub release: String,
    pub message: String,
    /// Where the platform writes the binding (`file#/json/pointer`), when there is one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub binding: Option<String>,
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

/// How one changelog entry of `component` touches the platform, if it does.
fn classify(
    b: &Bindings,
    component: &str,
    entry: &Value,
) -> Option<(Class, String, Option<String>)> {
    let kind = entry.get("kind").and_then(Value::as_str)?;
    let change = entry.get("change").and_then(Value::as_str)?;
    let name = entry.get("name").and_then(Value::as_str).unwrap_or("");
    let contexts = str_list(entry.get("contexts"));
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
                return Some((
                    class,
                    format!("a foundation relationship your manifest overrides or removes was {change} ({property})"),
                    None,
                ));
            }
            for rb in b
                .relationships
                .iter()
                .filter(|r| r.component == component && glob(&r.property, &property))
            {
                let in_contexts = contexts.iter().any(|c| glob(&rb.context, c));
                let renamed_from = field(entry, "context")
                    .and_then(|f| f.get("before"))
                    .and_then(Value::as_str);
                match change {
                    "removed" if in_contexts => {
                        return Some((
                            Class::Breaks,
                            format!("relationship '{property}' / '{}' was removed", rb.context),
                            Some(rb.at.clone()),
                        ))
                    }
                    "updated" => {
                        if let Some(before) = renamed_from.filter(|b| glob(&rb.context, b)) {
                            let after = show(field(entry, "context").and_then(|f| f.get("after")));
                            return Some((
                                Class::Breaks,
                                format!(
                                    "context '{before}' was renamed to '{after}' (property '{property}'); this binding names the old one"
                                ),
                                Some(rb.at.clone()),
                            ));
                        }
                        if in_contexts {
                            let what = if field(entry, "$ref").is_some() {
                                "now points to a different token"
                            } else {
                                "changed (option pins or other fields)"
                            };
                            return Some((
                                Class::Changes,
                                format!("relationship '{property}' / '{}' {what}", rb.context),
                                Some(rb.at.clone()),
                            ));
                        }
                    }
                    "added" if in_contexts => {
                        return Some((
                            Class::Changes,
                            format!(
                            "a new record for '{property}' / '{}' can change which token resolves",
                            rb.context
                        ),
                            Some(rb.at.clone()),
                        ))
                    }
                    _ => {}
                }
            }
            None
        }
        "token" => {
            let property = property_of(entry);
            let value = field(entry, "value");
            let what = match (change, value) {
                ("updated", Some(v)) => format!(
                    "token '{property}' changed value {} to {}",
                    show(v.get("before")),
                    show(v.get("after"))
                ),
                ("renamed", _) => format!("token '{property}' was renamed ({name})"),
                _ => format!("token '{property}' {change}"),
            };
            if let Some(tb) = b.tokens.iter().find(|t| {
                t.component == component
                    && t.selector
                        .get("property")
                        .and_then(Value::as_str)
                        .is_some_and(|p| glob(p, &property))
            }) {
                let class = if change == "renamed" {
                    Class::Breaks
                } else {
                    Class::Changes
                };
                return Some((class, what, Some(tb.at.clone())));
            }
            let rb = b.relationships.iter().find(|r| {
                r.component == component && contexts.iter().any(|c| glob(&r.context, c))
            })?;
            Some((
                Class::Changes,
                format!("{what}; reached through '{}'", rb.context),
                Some(rb.at.clone()),
            ))
        }
        "option" | "state" | "anatomy-part" => {
            let before = entry.get("before").and_then(Value::as_str).unwrap_or(name);
            let used = b.names.get(component)?;
            let hit = used.contains(name) || used.contains(before);
            match change {
                "removed" | "renamed" if hit => Some((
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
                "updated" if hit && kind != "anatomy-part" => {
                    Some((Class::Changes, format!("{kind} '{name}' changed"), None))
                }
                _ => None,
            }
        }
        "component" if change == "removed" && b.components.contains(component) => Some((
            Class::Breaks,
            format!("component '{component}' was removed"),
            None,
        )),
        _ => None,
    }
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
                    let Some((class, message, binding)) = classify(bindings, component, entry)
                    else {
                        continue;
                    };
                    releases.insert(version.clone());
                    if let Some(f) = findings.iter_mut().find(|f| {
                        f.component == *component && f.class == class && f.message == message
                    }) {
                        f.entries += 1;
                        continue;
                    }
                    findings.push(Finding {
                        class,
                        component: component.clone(),
                        release: version.to_string(),
                        message,
                        binding,
                        source: source_of(commit),
                        entries: 1,
                    });
                }
            }
        }
    }
    findings.sort_by(|a, b| {
        (a.class, &a.component, &a.release).cmp(&(b.class, &b.component, &b.release))
    });
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
        assert_eq!(f.binding.as_deref(), Some("v.json#/parts/c/props/fill"));
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
