// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Per-component changelog: attribution, classification and derived semver.
//!
//! Takes the record-level diff of one revision step ([`crate::record_diff`]) and turns it into
//! changelog entries per component: each carries its relationship context(s), a change class,
//! a semver bump, and its source (the PR from the squash subject, otherwise the commit). The
//! component version is computed from the entries, never authored. The file format is
//! `schemas/component-changelog.schema.json` in design-data-spec.

use std::collections::{BTreeMap, BTreeSet, HashMap};

use semver::Version;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::diff::{ChangeType, PropertyChange};
use crate::record_diff::{Change, DatasetDiff, DatasetSnapshot, Layer, RecordChange};

/// What the change affects. `visual` covers visual and behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Class {
    Visual,
    Api,
    Documentation,
    Metadata,
}

/// Semver bump an entry implies. Ordered: the release bump is the maximum of its entries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Bump {
    Patch,
    Minor,
    Major,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FieldChange {
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub before: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub after: Option<Value>,
}

/// Where a change came from: the PR number in a squash subject (`... (#123)`), otherwise the
/// commit itself.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub number: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sha: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// `repo` is `owner/name` on GitHub when known (used for links only).
pub fn source_of(sha: &str, subject: &str, repo: Option<&str>) -> Source {
    let pr = subject
        .trim_end()
        .strip_suffix(')')
        .and_then(|s| s.rsplit_once("(#"))
        .and_then(|(title, n)| n.parse::<u64>().ok().map(|n| (title.trim_end(), n)));
    let url = |tail: String| repo.map(|r| format!("https://github.com/{r}/{tail}"));
    match pr {
        Some((title, n)) => Source {
            kind: "pr".into(),
            repo: repo.map(str::to_string),
            number: Some(n),
            title: Some(title.to_string()),
            sha: None,
            subject: None,
            url: url(format!("pull/{n}")),
        },
        None => Source {
            kind: "commit".into(),
            repo: repo.map(str::to_string),
            number: None,
            title: None,
            sha: Some(sha.to_string()),
            subject: Some(subject.to_string()),
            url: url(format!("commit/{sha}")),
        },
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub kind: String,
    pub change: Change,
    pub class: Class,
    pub bump: Bump,
    /// Alias-resolved value change of a token this component binds; its own record is unchanged.
    pub indirect: bool,
    /// Relationship contexts (spec-sheet block titles) the change shows up under.
    pub contexts: Vec<String>,
    /// `tokenBinding` when the component reaches the token only through its `tokenBindings`
    /// (by token name), not through a relationship.
    #[serde(default, rename = "reachedBy", skip_serializing_if = "Option::is_none")]
    pub reached_by: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope: Option<Value>,
    /// Record uuid, or a component-relative path.
    pub record: String,
    pub name: String,
    pub fields: Vec<FieldChange>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub before: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub after: Option<Value>,
    /// For an indirect change: the aliased tokens whose own record changed.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub via: Vec<String>,
    /// The record's own `rationale`, when it carries one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rationale: Option<String>,
}

/// The commit a revision step belongs to.
#[derive(Debug, Clone)]
pub struct Step {
    pub sha: String,
    pub date: String,
    pub source: Source,
}

/// The entries one commit contributed to a component, with where they came from.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CommitChanges {
    pub commit: String,
    pub date: String,
    pub source: Source,
    pub entries: Vec<Entry>,
    /// Metadata-class changes are not listed, only counted: legacy keys, ids, ordering,
    /// implementations and spec bookkeeping.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<MetadataSummary>,
}

/// What a commit changed in metadata-class fields: how many entries, and which fields.
/// A record added or removed (no field) is named `<kind> <change>`, e.g. `implementation added`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MetadataSummary {
    pub count: usize,
    pub fields: Vec<String>,
}

// ── Classification ──────────────────────────────────────────────────────────

fn head(path: &str) -> &str {
    path.split('.').next().unwrap_or(path)
}

fn field_class(layer: Layer, kind: &str, path: &str) -> Class {
    if layer == Layer::Visual {
        return Class::Visual;
    }
    let last = path.rsplit('.').next().unwrap_or(path);
    if matches!(
        last,
        "description" | "deprecatedComment" | "rationale" | "note" | "notes" | "comment"
    ) || head(path) == "documentBlocks"
        || (kind == "relationship" && head(path) == "context")
    {
        return Class::Documentation;
    }
    match kind {
        "token" | "relationship" => match head(path) {
            "value" | "$ref" | "sets" => Class::Visual,
            "name" => Class::Api,
            "lifecycle" if path.contains("deprecatedIn") || path.contains("replacedBy") => {
                Class::Api
            }
            _ => Class::Metadata,
        },
        "document-block" => Class::Documentation,
        "implementation" => Class::Metadata,
        "lifecycle" => {
            if path.contains("deprecatedIn") || path.contains("replacedBy") {
                Class::Api
            } else {
                Class::Metadata
            }
        }
        "component" => match head(path) {
            "meta" | "$schema" | "$id" | "specVersion" | "anatomyReview" | "displayName" => {
                Class::Metadata
            }
            _ => Class::Api,
        },
        _ => Class::Api,
    }
}

fn structural_class(c: &RecordChange) -> Class {
    match (c.layer, c.kind) {
        (Layer::Visual, _) => Class::Visual,
        (_, "implementation") => Class::Metadata,
        (_, "document-block") => Class::Documentation,
        (_, "relationship") => Class::Visual,
        (_, "token") => match c.change {
            Change::Deprecated | Change::Reverted | Change::Renamed => Class::Api,
            _ => Class::Visual,
        },
        _ => Class::Api,
    }
}

const BREAKING_KINDS: [&str; 6] = [
    "option",
    "option-value",
    "state",
    "anatomy-part",
    "slot",
    "relationship",
];

fn bump_of(c: &RecordChange, fields: &[PropertyChange], class: Class) -> Bump {
    if class == Class::Metadata {
        return Bump::Patch;
    }
    match c.change {
        Change::Removed => {
            if BREAKING_KINDS.contains(&c.kind) || (c.kind == "component") {
                Bump::Major
            } else {
                Bump::Patch
            }
        }
        Change::Renamed if ["option", "state", "anatomy-part", "slot"].contains(&c.kind) => {
            Bump::Major
        }
        Change::Added if c.kind != "component" => Bump::Minor,
        Change::Updated => {
            let removed_value = fields.iter().any(|f| {
                f.change_type == ChangeType::Deleted
                    && !f.path.ends_with("default")
                    && c.kind == "option-value"
            });
            let type_change = c.kind == "option" && fields.iter().any(|f| f.path == "type");
            let deprecated = c.kind == "lifecycle"
                && fields.iter().any(|f| {
                    f.path.ends_with("deprecatedIn") && f.change_type != ChangeType::Deleted
                });
            if removed_value || type_change || deprecated {
                Bump::Major
            } else {
                Bump::Patch
            }
        }
        _ => Bump::Patch,
    }
}

fn to_field(p: &PropertyChange) -> FieldChange {
    FieldChange {
        path: p.path.clone(),
        before: p.original_value.clone(),
        after: p.new_value.clone(),
    }
}

// ── Attribution ─────────────────────────────────────────────────────────────

fn bindings(snaps: [&DatasetSnapshot; 2]) -> HashMap<String, BTreeSet<(String, String)>> {
    let mut m: HashMap<String, BTreeSet<(String, String)>> = HashMap::new();
    for snap in snaps {
        for r in &snap.relationships {
            let (Some(t), Some(c)) = (
                r.get("$ref").and_then(Value::as_str),
                r.get("scope")
                    .and_then(|s| s.get("component"))
                    .and_then(Value::as_str),
            ) else {
                continue;
            };
            if r.get("$schema").is_some() {
                continue; // an inline alias token, not a binding
            }
            let ctx = r
                .get("context")
                .and_then(Value::as_str)
                .unwrap_or("")
                .trim()
                .to_string();
            m.entry(t.to_string())
                .or_default()
                .insert((c.to_string(), ctx));
        }
    }
    m
}

/// Token uuid → (component, context) for each component `tokenBindings` entry, resolving the
/// binding's token name through the serialized legacy key. Names shared by several tokens
/// (desktop/mobile, light/dark) resolve to each of them.
fn name_bindings(snaps: [&DatasetSnapshot; 2]) -> HashMap<String, BTreeSet<(String, String)>> {
    let mut m: HashMap<String, BTreeSet<(String, String)>> = HashMap::new();
    for snap in snaps {
        let mut by_name: HashMap<String, Vec<&str>> = HashMap::new();
        for t in snap.graph.tokens.values() {
            if let (Some(n), Some(u)) = (
                t.raw
                    .get("name")
                    .and_then(crate::naming::extract_legacy_key),
                t.raw.get("uuid").and_then(Value::as_str),
            ) {
                by_name.entry(n).or_default().push(u);
            }
        }
        for (comp, raw) in &snap.components {
            let bindings = raw.get("tokenBindings").and_then(Value::as_array);
            for b in bindings.into_iter().flatten() {
                let Some(name) = b.get("token").and_then(Value::as_str) else {
                    continue;
                };
                let ctx = b.get("context").and_then(Value::as_str).unwrap_or("");
                for u in by_name.get(name).into_iter().flatten() {
                    m.entry(u.to_string())
                        .or_default()
                        .insert((comp.clone(), ctx.trim().to_string()));
                }
            }
        }
    }
    m
}

fn rationale_of(new: &DatasetSnapshot, c: &RecordChange) -> Option<String> {
    let rec = match c.layer {
        Layer::Component => c.component.as_ref().and_then(|n| new.components.get(n)),
        _ => new
            .relationships
            .iter()
            .find(|r| r.get("uuid").and_then(Value::as_str) == Some(&c.id))
            .or_else(|| {
                new.graph
                    .tokens
                    .values()
                    .map(|t| &t.raw)
                    .find(|r| r.get("uuid").and_then(Value::as_str) == Some(&c.id))
            }),
    }?;
    rec.get("rationale")
        .and_then(Value::as_str)
        .map(str::to_string)
}

/// Changelog entries per component for one revision step.
///
/// Tokens in the global layer reach a component through its relationships (`$ref`); a token
/// the component binds whose own record is unchanged but whose alias-resolved value moved is an
/// indirect change. Component-owned records attribute to their `scope.component` directly.
pub fn entries_for_step(
    old: &DatasetSnapshot,
    new: &DatasetSnapshot,
    diff: &DatasetDiff,
    step: &Step,
) -> BTreeMap<String, CommitChanges> {
    let bound = bindings([old, new]);
    let named = name_bindings([old, new]);
    let mut out: BTreeMap<String, Vec<Entry>> = BTreeMap::new();
    let mut push = |comp: &str, e: Entry| out.entry(comp.to_string()).or_default().push(e);
    let mk = |c: &RecordChange,
              class: Class,
              bump: Bump,
              fields: Vec<FieldChange>,
              contexts: Vec<String>,
              reached_by: Option<&str>| {
        let compact = matches!(c.kind, "relationship" | "token");
        let pick = |v: &Option<Value>| {
            v.as_ref().and_then(|r| {
                if compact {
                    r.get("$ref").or_else(|| r.get("value")).cloned()
                } else if matches!(c.kind, "component" | "visual-recipe") {
                    None
                } else {
                    Some(r.clone())
                }
            })
        };
        Entry {
            id: String::new(),
            kind: c.kind.to_string(),
            change: c.change,
            class,
            bump,
            indirect: false,
            contexts,
            reached_by: reached_by.map(String::from),
            scope: c.scope.clone(),
            record: c.id.clone(),
            name: c.name.clone(),
            fields,
            before: pick(&c.before),
            after: pick(&c.after),
            via: vec![],
            rationale: rationale_of(new, c),
        }
    };

    for c in &diff.changes {
        // Where this change shows up: (component, contexts).
        let mut targets: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
        let mut by_binding: BTreeSet<String> = BTreeSet::new();
        if let Some(comp) = &c.component {
            let ctx = targets.entry(comp.clone()).or_default();
            if let Some(x) = &c.context {
                ctx.insert(x.clone());
            }
        }
        if c.layer == Layer::Token && !matches!(c.change, Change::Added | Change::Removed) {
            for (comp, ctx) in bound.get(&c.id).into_iter().flatten() {
                let e = targets.entry(comp.clone()).or_default();
                if !ctx.is_empty() {
                    e.insert(ctx.clone());
                }
            }
            // A token a component names in `tokenBindings` reaches it without a relationship.
            for (comp, ctx) in named.get(&c.id).into_iter().flatten() {
                if !targets.contains_key(comp) {
                    by_binding.insert(comp.clone());
                }
                let e = targets.entry(comp.clone()).or_default();
                if !ctx.is_empty() {
                    e.insert(ctx.clone());
                }
            }
        }
        if targets.is_empty() {
            continue;
        }
        // One entry per class: fields of one record can be both a value change and metadata.
        let mut by_class: BTreeMap<u8, (Class, Vec<&PropertyChange>)> = BTreeMap::new();
        for f in &c.fields {
            let class = field_class(c.layer, c.kind, &f.path);
            by_class
                .entry(class as u8)
                .or_insert((class, vec![]))
                .1
                .push(f);
        }
        let groups: Vec<(Class, Vec<&PropertyChange>)> = if by_class.is_empty() {
            vec![(structural_class(c), vec![])]
        } else {
            by_class.into_values().collect()
        };
        for (class, fields) in groups {
            let owned: Vec<PropertyChange> = fields.iter().map(|f| (*f).clone()).collect();
            let bump = bump_of(c, &owned, class);
            for (comp, ctx) in &targets {
                push(
                    comp,
                    mk(
                        c,
                        class,
                        bump,
                        owned.iter().map(to_field).collect(),
                        ctx.iter().cloned().collect(),
                        by_binding.contains(comp).then_some("tokenBinding"),
                    ),
                );
            }
        }
    }

    for r in &diff.resolved {
        let direct = bound.get(&r.uuid);
        let by_name = named
            .get(&r.uuid)
            .into_iter()
            .flatten()
            .filter(|(comp, _)| !direct.is_some_and(|d| d.iter().any(|(c, _)| c == comp)))
            .map(|x| (x, Some("tokenBinding")));
        for ((comp, ctx), reached_by) in direct
            .into_iter()
            .flatten()
            .map(|x| (x, None))
            .chain(by_name)
        {
            push(
                comp,
                Entry {
                    id: String::new(),
                    kind: "token".into(),
                    change: Change::Updated,
                    class: Class::Visual,
                    bump: Bump::Patch,
                    indirect: true,
                    contexts: if ctx.is_empty() {
                        vec![]
                    } else {
                        vec![ctx.clone()]
                    },
                    reached_by: reached_by.map(String::from),
                    scope: None,
                    record: r.uuid.clone(),
                    name: String::new(),
                    fields: vec![FieldChange {
                        path: "value".into(),
                        before: Some(r.before.clone()),
                        after: Some(r.after.clone()),
                    }],
                    before: None,
                    after: None,
                    via: r.via.clone(),
                    rationale: None,
                },
            );
        }
    }

    out.into_iter()
        .map(|(c, all)| {
            let (meta, mut entries): (Vec<Entry>, Vec<Entry>) =
                all.into_iter().partition(|e| e.class == Class::Metadata);
            for (i, e) in entries.iter_mut().enumerate() {
                e.id = format!("{}-{i}", &step.sha[..step.sha.len().min(8)]);
            }
            let fields: BTreeSet<String> = meta
                .iter()
                .flat_map(|e| {
                    if e.fields.is_empty() {
                        vec![format!("{} {}", e.kind, change_word(e.change))]
                    } else {
                        e.fields.iter().map(|f| f.path.clone()).collect()
                    }
                })
                .collect();
            let changes = CommitChanges {
                commit: step.sha.clone(),
                date: step.date.clone(),
                source: step.source.clone(),
                entries,
                metadata: (!meta.is_empty()).then(|| MetadataSummary {
                    count: meta.len(),
                    fields: fields.into_iter().collect(),
                }),
            };
            (c, changes)
        })
        .collect()
}

fn change_word(c: Change) -> &'static str {
    match c {
        Change::Added => "added",
        Change::Removed => "removed",
        Change::Updated => "updated",
        Change::Renamed => "renamed",
        Change::Deprecated => "deprecated",
        Change::Reverted => "reverted",
    }
}

// ── Versions ────────────────────────────────────────────────────────────────

/// One release of one component.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Release {
    /// The package release this belongs to, e.g. `3.7.1`.
    pub release: String,
    /// Component semver, derived from the entries.
    pub version: String,
    /// Bump applied to the previous version; absent for the component's first release.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bump: Option<Bump>,
    pub date: String,
    /// Dataset commit the release was taken at.
    pub commit: String,
    /// The changes of each commit in the release, oldest first.
    pub commits: Vec<CommitChanges>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Baseline {
    pub release: String,
    pub version: String,
    pub commit: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentLog {
    #[serde(rename = "$schema")]
    pub schema: String,
    pub spec_version: String,
    pub component: String,
    /// Set when the component already existed before the first recorded release.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub baseline: Option<Baseline>,
    pub releases: Vec<Release>,
}

/// Label of the release holding changes that have not shipped in a package release yet.
pub const UNRELEASED: &str = "unreleased";
pub const STARTING_VERSION: &str = "1.0.0";
pub const SCHEMA_URL: &str =
    "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component-changelog.schema.json";

impl ComponentLog {
    pub fn new(component: &str) -> Self {
        Self {
            schema: SCHEMA_URL.into(),
            spec_version: "1.0.0-draft".into(),
            component: component.into(),
            baseline: None,
            releases: vec![],
        }
    }

    /// Latest component version, if the component has been recorded.
    pub fn version(&self) -> Option<String> {
        self.releases
            .last()
            .map(|r| r.version.clone())
            .or_else(|| self.baseline.as_ref().map(|b| b.version.clone()))
    }

    pub fn has_release(&self, release: &str) -> bool {
        self.releases.iter().any(|r| r.release == release)
    }

    /// Record a release; returns false when nothing was added. A release already recorded is
    /// left alone (append only), and commits an earlier release already holds are dropped, so
    /// overlapping ranges (a tag to HEAD after a backfill) never repeat a change. A component
    /// with no earlier version starts at `1.0.0`.
    ///
    /// The one exception to append-only is the pending `unreleased` release at the end: the
    /// next real release takes over its commits and the version is worked out again from the
    /// version before it.
    pub fn append(
        &mut self,
        release: &str,
        date: &str,
        commit: &str,
        commits: Vec<CommitChanges>,
    ) -> bool {
        if self.has_release(release) {
            return false;
        }
        let mut pending: Vec<CommitChanges> = vec![];
        if release != UNRELEASED
            && self
                .releases
                .last()
                .is_some_and(|r| r.release == UNRELEASED)
        {
            pending = self.releases.pop().map(|r| r.commits).unwrap_or_default();
        }
        let recorded: BTreeSet<String> = self
            .releases
            .iter()
            .flat_map(|r| r.commits.iter().map(|c| c.commit.clone()))
            .chain(pending.iter().map(|c| c.commit.clone()))
            .collect();
        let mut all = pending;
        all.extend(
            commits
                .into_iter()
                .filter(|c| !recorded.contains(&c.commit)),
        );
        all.retain(|c| !c.entries.is_empty() || c.metadata.is_some());
        let Some(bump) = all
            .iter()
            .map(|c| {
                c.entries
                    .iter()
                    .map(|e| e.bump)
                    .max()
                    .unwrap_or(Bump::Patch)
            })
            .max()
        else {
            return false;
        };
        let (version, bump) = match self.version() {
            None => (STARTING_VERSION.to_string(), None),
            Some(prev) => {
                let mut v = Version::parse(&prev).unwrap_or_else(|_| Version::new(1, 0, 0));
                match bump {
                    Bump::Major => {
                        v.major += 1;
                        v.minor = 0;
                        v.patch = 0;
                    }
                    Bump::Minor => {
                        v.minor += 1;
                        v.patch = 0;
                    }
                    Bump::Patch => v.patch += 1,
                }
                (v.to_string(), Some(bump))
            }
        };
        self.releases.push(Release {
            release: release.into(),
            version,
            bump,
            date: date.into(),
            commit: commit.into(),
            commits: all,
        });
        true
    }

    /// Give the pending `unreleased` release the name of the release being made, when there is
    /// nothing newer to add. Returns false when there is no pending release.
    pub fn adopt_unreleased(&mut self, release: &str, date: &str, commit: &str) -> bool {
        if release == UNRELEASED || self.has_release(release) {
            return false;
        }
        match self.releases.last_mut() {
            Some(r) if r.release == UNRELEASED => {
                r.release = release.into();
                r.date = date.into();
                r.commit = commit.into();
                true
            }
            _ => false,
        }
    }
}

/// JSON of a log with a trailing newline, as committed. Entries, sources and metadata
/// summaries are one line each, so a changelog reads and diffs line by line.
pub fn to_json(log: &ComponentLog) -> String {
    let mut s = String::new();
    emit(&json!(log), 0, "", &mut s);
    s.push('\n');
    s
}

fn emit(v: &Value, depth: usize, key: &str, out: &mut String) {
    let pad = |d: usize| "  ".repeat(d);
    let one_line = matches!(key, "source" | "baseline" | "metadata");
    match v {
        Value::Object(m) if !one_line && !m.is_empty() => {
            out.push_str("{\n");
            for (i, (k, x)) in m.iter().enumerate() {
                out.push_str(&pad(depth + 1));
                out.push_str(&serde_json::to_string(k).unwrap_or_default());
                out.push_str(": ");
                emit(x, depth + 1, k, out);
                out.push_str(if i + 1 < m.len() { ",\n" } else { "\n" });
            }
            out.push_str(&pad(depth));
            out.push('}');
        }
        Value::Array(a) if !a.is_empty() && !matches!(key, "fields") => {
            out.push_str("[\n");
            for (i, x) in a.iter().enumerate() {
                out.push_str(&pad(depth + 1));
                if key == "entries" {
                    out.push_str(&serde_json::to_string(x).unwrap_or_default());
                } else {
                    emit(x, depth + 1, "", out);
                }
                out.push_str(if i + 1 < a.len() { ",\n" } else { "\n" });
            }
            out.push_str(&pad(depth));
            out.push(']');
        }
        _ => out.push_str(&serde_json::to_string(v).unwrap_or_default()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::TokenGraph;
    use crate::record_diff::diff_datasets;

    fn snap(rels: Vec<Value>, comps: Vec<(&str, Value)>) -> DatasetSnapshot {
        DatasetSnapshot {
            graph: TokenGraph::default(),
            relationships: rels,
            components: comps.into_iter().map(|(k, v)| (k.into(), v)).collect(),
            visuals: BTreeMap::new(),
        }
    }

    fn step() -> Step {
        Step {
            sha: "abcdef0123".into(),
            date: "2026-01-01".into(),
            source: source_of("abcdef0123", "fix: x (#12)", Some("o/r")),
        }
    }

    fn run(old: &DatasetSnapshot, new: &DatasetSnapshot) -> BTreeMap<String, CommitChanges> {
        entries_for_step(old, new, &diff_datasets(old, new), &step())
    }

    #[test]
    fn source_is_the_pr_or_the_commit() {
        let s = source_of("abc", "feat(x): y (#12)", Some("o/r"));
        assert_eq!((s.kind.as_str(), s.number), ("pr", Some(12)));
        assert_eq!(s.title.as_deref(), Some("feat(x): y"));
        assert_eq!(s.url.as_deref(), Some("https://github.com/o/r/pull/12"));
        let s = source_of("abc", "direct push", None);
        assert_eq!((s.kind.as_str(), s.sha.as_deref()), ("commit", Some("abc")));
    }

    fn tok(u: &str, v: &str) -> Value {
        json!({"scope": {"component": "c", "property": "pad"}, "$schema": "x/dimension.json", "value": v, "uuid": u})
    }

    fn rel(u: &str, r: &str) -> Value {
        json!({"scope": {"component": "c", "property": "pad"}, "context": "Spacing", "$ref": r, "uuid": u})
    }

    #[test]
    fn value_change_is_visual_patch_and_alias_move_is_indirect() {
        // r -> a -> b ; b's value changes: a is an indirect change, b is not bound by c.
        let alias = |t: &str| json!({"scope": {"component": "c", "property": "a"}, "$schema": "x/alias.json", "$ref": t, "uuid": "a"});
        let old = snap(vec![rel("r", "a"), alias("b"), tok("b", "1px")], vec![]);
        let new = snap(vec![rel("r", "a"), alias("b"), tok("b", "2px")], vec![]);
        let e = &run(&old, &new)["c"].entries;
        let indirect: Vec<_> = e.iter().filter(|e| e.indirect).collect();
        assert_eq!(indirect.len(), 1);
        assert_eq!(indirect[0].contexts, vec!["Spacing"]);
        assert_eq!(
            (indirect[0].class, indirect[0].bump),
            (Class::Visual, Bump::Patch)
        );
        assert_eq!(indirect[0].via, vec!["b"]);
    }

    #[test]
    fn token_bindings_by_name_attribute_a_token_change_and_are_marked() {
        let graph = |v: &str| {
            TokenGraph::from_pairs(vec![
                (
                    "pad-token".into(),
                    "t.json".into(),
                    json!({"name": "pad-token", "$schema": "x/dimension.json", "value": v, "uuid": "t1"}),
                ),
                (
                    "other-token".into(),
                    "t.json".into(),
                    json!({"name": "other-token", "$schema": "x/dimension.json", "value": "9px", "uuid": "t2"}),
                ),
            ])
        };
        let comp =
            json!({"name": "c", "tokenBindings": [{"token": "pad-token", "context": "Rounding "}]});
        let mut old = snap(vec![], vec![("c", comp.clone())]);
        let mut new = snap(vec![], vec![("c", comp)]);
        old.graph = graph("1px");
        new.graph = graph("2px");
        let e = &run(&old, &new)["c"].entries;
        assert_eq!(e.len(), 1, "{e:?}");
        assert_eq!(e[0].record, "t1");
        assert_eq!(e[0].contexts, vec!["Rounding"]);
        assert_eq!(e[0].reached_by.as_deref(), Some("tokenBinding"));

        // A relationship that reaches the token as well wins: the entry is not marked.
        let mut old = snap(
            vec![rel("r", "t1")],
            vec![(
                "c",
                json!({"name": "c", "tokenBindings": [{"token": "pad-token"}]}),
            )],
        );
        let mut new = snap(
            vec![rel("r", "t1")],
            vec![(
                "c",
                json!({"name": "c", "tokenBindings": [{"token": "pad-token"}]}),
            )],
        );
        old.graph = graph("1px");
        new.graph = graph("2px");
        let e = &run(&old, &new)["c"].entries;
        assert!(e.iter().all(|e| e.reached_by.is_none()), "{e:?}");
    }

    #[test]
    fn rebinding_is_a_patch_but_removal_is_major() {
        let e = &run(
            &snap(vec![rel("1", "x")], vec![]),
            &snap(vec![rel("2", "y")], vec![]),
        )["c"]
            .entries;
        assert_eq!(
            (e[0].kind.as_str(), e[0].change, e[0].bump),
            ("relationship", Change::Updated, Bump::Patch)
        );
        let e = &run(&snap(vec![rel("1", "x")], vec![]), &snap(vec![], vec![]))["c"].entries;
        assert_eq!(e[0].bump, Bump::Major);
    }

    #[test]
    fn bumps_by_component_change() {
        let base = json!({"name": "c", "options": {"size": {"values": [{"value": "s"}, {"value": "m"}]}},
            "anatomy": [{"name": "icon"}], "documentBlocks": [{"type": "purpose", "content": "a"}]});
        let step_bump = |new: Value| {
            let e = &run(
                &snap(vec![], vec![("c", base.clone())]),
                &snap(vec![], vec![("c", new)]),
            )["c"]
                .entries;
            (
                e.iter().map(|e| e.bump).max().unwrap(),
                e.iter().map(|e| e.class).collect::<Vec<_>>(),
            )
        };
        let mut v = base.clone();
        v["options"]["size"]["values"] = json!([{"value": "s"}]);
        assert_eq!(step_bump(v).0, Bump::Major);
        let mut v = base.clone();
        v["options"]["size"]["values"] = json!([{"value": "s"}, {"value": "m"}, {"value": "l"}]);
        assert_eq!(step_bump(v).0, Bump::Minor);
        let mut v = base.clone();
        v["documentBlocks"] = json!([{"type": "purpose", "content": "b"}]);
        assert_eq!(step_bump(v), (Bump::Patch, vec![Class::Documentation]));
        let mut v = base.clone();
        v["lifecycle"] = json!({"deprecatedIn": "2.0.0"});
        assert_eq!(step_bump(v).0, Bump::Major);
    }

    #[test]
    fn versions_start_at_1_0_0_and_releases_are_append_only() {
        let mut log = ComponentLog::new("c");
        let e = |bump, commit: &str| {
            let mut c = run(
                &snap(vec![rel("1", "x")], vec![]),
                &snap(vec![rel("2", "y")], vec![]),
            )
            .remove("c")
            .unwrap();
            c.entries[0].bump = bump;
            c.commit = commit.into();
            vec![c]
        };
        assert!(log.append("1", "d", "c1", e(Bump::Patch, "c1")));
        assert_eq!(log.version().as_deref(), Some("1.0.0"));
        assert!(log.append("2", "d", "c2", e(Bump::Minor, "c2")));
        assert!(log.append("3", "d", "c3", e(Bump::Major, "c3")));
        assert_eq!(log.version().as_deref(), Some("2.0.0"));
        assert!(!log.append("2", "d", "c9", e(Bump::Major, "c9")));
        // The same commit under a new label is not recorded twice.
        assert!(!log.append("4", "d", "c3", e(Bump::Major, "c3")));
        assert_eq!(log.releases.len(), 3);
    }

    #[test]
    fn a_generated_log_matches_the_schema() {
        let old = snap(
            vec![rel("1", "x")],
            vec![(
                "c",
                json!({"name": "c", "options": {"a": {"type": "string"}}}),
            )],
        );
        let new = snap(
            vec![rel("2", "y")],
            vec![("c", json!({"name": "c", "options": {}}))],
        );
        let mut log = ComponentLog::new("c");
        log.baseline = Some(Baseline {
            release: "1.0.0".into(),
            version: "1.0.0".into(),
            commit: "c0".into(),
        });
        log.append(
            "1.1.0",
            "2026-01-01",
            "c1",
            vec![run(&old, &new).remove("c").unwrap()],
        );
        let schema: Value = serde_json::from_str(include_str!(
            "../../../packages/design-data-spec/schemas/component-changelog.schema.json"
        ))
        .unwrap();
        let v = jsonschema::validator_for(&schema).unwrap();
        let doc: Value = serde_json::from_str(&to_json(&log)).unwrap();
        let errors: Vec<String> = v
            .iter_errors(&doc)
            .map(|e| format!("{}: {e}", e.instance_path))
            .collect();
        assert!(errors.is_empty(), "{errors:#?}");
        assert_eq!(log.releases[0].version, "2.0.0");
    }

    #[test]
    fn metadata_changes_are_counted_not_listed() {
        let mut b = tok("t", "1px");
        b["legacyKey"] = json!("old");
        let mut a = tok("t", "1px");
        a["legacyKey"] = json!("new");
        a["conceptId"] = json!("c");
        let c = &run(&snap(vec![b], vec![]), &snap(vec![a], vec![]))["c"];
        assert!(c.entries.is_empty());
        let m = c.metadata.as_ref().unwrap();
        assert_eq!(m.count, 1);
        assert_eq!(m.fields, vec!["conceptId", "legacyKey"]);
        // Metadata alone is still a patch release.
        let mut log = ComponentLog::new("c");
        log.baseline = Some(Baseline {
            release: "1".into(),
            version: "1.0.0".into(),
            commit: "c0".into(),
        });
        assert!(log.append("2", "d", "c1", vec![c.clone()]));
        assert_eq!(log.releases[0].version, "1.0.1");
    }

    #[test]
    fn unreleased_is_taken_over_by_the_next_release() {
        let mk = |commit: &str, bump| {
            let mut c = run(
                &snap(vec![rel("1", "x")], vec![]),
                &snap(vec![rel("2", "y")], vec![]),
            )
            .remove("c")
            .unwrap();
            c.entries[0].bump = bump;
            c.commit = commit.into();
            c
        };
        let mut log = ComponentLog::new("c");
        log.baseline = Some(Baseline {
            release: "1".into(),
            version: "1.0.0".into(),
            commit: "c0".into(),
        });
        assert!(log.append("2.0.0", "d", "t", vec![mk("a", Bump::Patch)]));
        assert!(log.append(UNRELEASED, "d", "h", vec![mk("b", Bump::Minor)]));
        assert_eq!(log.version().as_deref(), Some("1.1.0"));
        // Version PR: the range from the last tag repeats `b` and adds `c`.
        assert!(log.append(
            "3.0.0",
            "d2",
            "h2",
            vec![mk("b", Bump::Minor), mk("c", Bump::Major)]
        ));
        assert_eq!(log.releases.len(), 2);
        let r = &log.releases[1];
        assert_eq!((r.release.as_str(), r.version.as_str()), ("3.0.0", "2.0.0"));
        let commits: Vec<_> = r.commits.iter().map(|c| c.commit.as_str()).collect();
        assert_eq!(commits, ["b", "c"]);
        // Nothing newer: the pending release is just renamed.
        let mut log2 = ComponentLog::new("c");
        log2.baseline = log.baseline.clone();
        log2.append(UNRELEASED, "d", "h", vec![mk("b", Bump::Minor)]);
        assert!(log2.adopt_unreleased("3.0.0", "d2", "h2"));
        assert_eq!(
            (
                log2.releases[0].release.as_str(),
                log2.releases[0].version.as_str()
            ),
            ("3.0.0", "1.1.0")
        );
        assert!(!log2.adopt_unreleased("3.0.0", "d2", "h2"));
    }

    #[test]
    fn entries_are_one_line_each() {
        let old = snap(vec![rel("1", "x"), rel("3", "z")], vec![]);
        let new = snap(vec![rel("2", "y")], vec![]);
        let mut log = ComponentLog::new("c");
        log.append("1", "d", "c1", vec![run(&old, &new).remove("c").unwrap()]);
        let text = to_json(&log);
        let doc: Value = serde_json::from_str(&text).unwrap();
        let n = doc["releases"][0]["commits"][0]["entries"]
            .as_array()
            .unwrap()
            .len();
        assert!(n >= 2);
        assert_eq!(
            text.lines()
                .filter(|l| l.trim_start().starts_with("{\"id\""))
                .count(),
            n
        );
    }
}
