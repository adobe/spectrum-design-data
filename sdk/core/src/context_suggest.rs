// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Relationship `context` suggestions.
//!
//! For each live relationship record that SPEC-092 flags (no context, and no contexted
//! record reaches it) this proposes a `context` string and the structured fields
//! (`contextRole`, `contextPart`, `contextQualifier`) for a person to review. Nothing is
//! written to the dataset: the output is a review file grouped by component.
//!
//! Source tiers, tried in order:
//!
//! * `binding`: every contexted record whose `$ref` chain reaches the record agrees on
//!   one context.
//! * `sibling`: every contexted record with the same component, `scope.property`,
//!   `scope.part` and object agrees on one context.
//! * `template`: built from `scope.part`, `scope.options` and the property. Only as good
//!   as the measured agreement (see [`quality`]); below [`TEMPLATE_USABLE`] it is
//!   labelled "needs review".
//!
//! Vocabulary is the relationship-contexts registry; a head word outside it is proposed
//! anyway and reported as a registry gap, never added.

use std::collections::{BTreeMap, HashMap, HashSet};

use serde::Serialize;
use serde_json::{json, Value};

use crate::graph::TokenGraph;
use crate::registry::{split_context, RegistryData};
use crate::validate::rules::spec092;

/// Main-word agreement the template tier must reach to drop its "needs review" label.
pub const TEMPLATE_USABLE: f64 = 0.80;

/// Components whose text styles default to the context `Text`.
const TYPOGRAPHY: &[&str] = &["heading", "detail", "body", "title", "code"];

/// Parenthesised words that are qualifiers, not anatomy parts.
const QUALIFIERS: &[&str] = &[
    "default",
    "minimum",
    "maximum",
    "size",
    "height",
    "width",
    "thickness",
    "rounding",
    "semantic",
    "non-semantic",
    "selected",
    "emphasized",
    "disabled",
    "hover",
    "down",
    "focus",
    "error",
    "quiet",
    "horizontal",
    "vertical",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Binding,
    Sibling,
    Template,
}

impl Tier {
    fn name(self) -> &'static str {
        match self {
            Tier::Binding => "binding",
            Tier::Sibling => "sibling",
            Tier::Template => "template",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Proposal {
    pub context: String,
    #[serde(rename = "contextRole", skip_serializing_if = "Vec::is_empty")]
    pub context_role: Vec<String>,
    #[serde(rename = "contextPart", skip_serializing_if = "Option::is_none")]
    pub context_part: Option<String>,
    #[serde(rename = "contextQualifier", skip_serializing_if = "Option::is_none")]
    pub context_qualifier: Option<String>,
    /// The structured fields reproduce the string through the SPEC-090 derivation. When
    /// false (an alias such as `Text`, or an unregistered head) the fields are a
    /// suggestion only and SPEC-090 would flag them next to the string.
    #[serde(rename = "fieldsDeriveString")]
    pub fields_derive_string: bool,
    pub tier: Tier,
    pub confidence: &'static str,
    /// What a template proposal was built from; absent for the other tiers.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub basis: Option<&'static str>,
    pub evidence: Vec<String>,
    /// Main word not in the registry (a registry gap), when that is the case.
    #[serde(rename = "registryGap", skip_serializing_if = "Option::is_none")]
    pub registry_gap: Option<String>,
}

struct Rec {
    uuid: Option<String>,
    component: String,
    property: String,
    part: Option<String>,
    object: Option<String>,
    options: serde_json::Map<String, Value>,
    context: Option<String>,
    ref_: Option<String>,
    legacy_key: Option<String>,
}

fn norm(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn opt_text(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.clone()),
        Value::Array(a) => {
            let parts: Vec<&str> = a.iter().filter_map(Value::as_str).collect();
            (!parts.is_empty()).then(|| parts.join(", "))
        }
        _ => None,
    }
}

fn capitalize(s: &str) -> String {
    let s = s.replace('-', " ");
    let mut c = s.chars();
    c.next()
        .map(|f| f.to_uppercase().chain(c).collect())
        .unwrap_or_default()
}

/// What the dataset knows about every relationship record, indexed once.
struct Index<'a> {
    reg: &'a RegistryData,
    recs: Vec<Rec>,
    /// uuid of a record → positions of contexted records whose `$ref` chain reaches it.
    reachers: HashMap<String, Vec<usize>>,
    /// Sibling key → positions of contexted records.
    siblings: HashMap<String, Vec<usize>>,
}

fn sibling_key(r: &Rec) -> String {
    format!(
        "{}|{}|{}|{}",
        r.component,
        r.property,
        r.part.as_deref().unwrap_or(""),
        r.object.as_deref().unwrap_or("")
    )
}

impl<'a> Index<'a> {
    fn new(graph: &TokenGraph, reg: &'a RegistryData) -> Self {
        let by_uuid: HashMap<&str, &Value> = graph
            .tokens
            .values()
            .filter_map(|t| Some((t.uuid.as_deref()?, &t.raw)))
            .collect();
        let recs: Vec<Rec> = graph
            .relationships
            .iter()
            .map(|r| {
                let scope = r.raw.get("scope").cloned().unwrap_or(Value::Null);
                let options = scope
                    .get("options")
                    .and_then(Value::as_object)
                    .cloned()
                    .unwrap_or_default();
                let s = |k: &str| scope.get(k).and_then(Value::as_str).map(String::from);
                let ref_ = r.raw.get("$ref").and_then(Value::as_str).map(String::from);
                let tok_name = ref_
                    .as_deref()
                    .and_then(|u| by_uuid.get(u))
                    .and_then(|t| t.get("name"));
                let object = options
                    .get("object")
                    .and_then(Value::as_str)
                    .map(String::from)
                    .or_else(|| {
                        tok_name?
                            .get("object")
                            .and_then(Value::as_str)
                            .map(String::from)
                    });
                Rec {
                    uuid: r.uuid.clone(),
                    component: s("component").unwrap_or_default(),
                    property: s("property").unwrap_or_default(),
                    part: s("part"),
                    object,
                    options,
                    context: r
                        .raw
                        .get("context")
                        .and_then(Value::as_str)
                        .map(norm)
                        .filter(|c| !c.is_empty()),
                    ref_,
                    legacy_key: r
                        .raw
                        .get("legacyKey")
                        .and_then(Value::as_str)
                        .map(String::from),
                }
            })
            .collect();
        let pos: HashMap<&str, usize> = recs
            .iter()
            .enumerate()
            .filter_map(|(i, r)| Some((r.uuid.as_deref()?, i)))
            .collect();
        let mut reachers: HashMap<String, Vec<usize>> = HashMap::new();
        let mut siblings: HashMap<String, Vec<usize>> = HashMap::new();
        for (i, rec) in recs.iter().enumerate() {
            if rec.context.is_none() {
                continue;
            }
            siblings.entry(sibling_key(rec)).or_default().push(i);
            let mut seen = HashSet::new();
            let mut next = rec.ref_.as_deref();
            while let Some(u) = next {
                let Some(&j) = pos.get(u) else { break };
                if !seen.insert(j) {
                    break;
                }
                reachers.entry(u.to_string()).or_default().push(i);
                next = recs[j].ref_.as_deref();
            }
        }
        Index {
            reg,
            recs,
            reachers,
            siblings,
        }
    }

    /// Structured fields for a context string; `None` role when the head is unregistered.
    fn fields(
        &self,
        context: &str,
        tier: Tier,
        confidence: &'static str,
        mut evidence: Vec<String>,
        kind_hint: Option<bool>,
    ) -> Proposal {
        let (head, detail) = split_context(context);
        let roles = self.reg.context_roles(head);
        let (is_part, detail) = match detail {
            Some(d) => (
                kind_hint.unwrap_or_else(|| !QUALIFIERS.contains(&d.to_lowercase().as_str())),
                Some(d.to_string()),
            ),
            None => (false, None),
        };
        let (role, gap) = match &roles {
            Ok(r) => (r.iter().map(|s| s.to_string()).collect::<Vec<_>>(), None),
            Err(w) => (Vec::new(), Some(w.clone())),
        };
        let derives = roles.as_ref().is_ok_and(|r| {
            self.reg.derive_context(r, detail.as_deref()).as_deref() == Some(context)
        });
        if gap.is_some() {
            evidence.push(format!("main word '{head}' is not in the registry"));
        } else if !derives {
            evidence.push(
                "string uses a registry alias or case variant, so the fields would not derive it (SPEC-090)"
                    .into(),
            );
        }
        let has_roles = !role.is_empty();
        Proposal {
            context: context.to_string(),
            context_role: role,
            context_part: detail.clone().filter(|_| is_part && has_roles),
            context_qualifier: detail.filter(|_| !is_part && has_roles),
            fields_derive_string: derives,
            tier,
            confidence,
            basis: None,
            evidence,
            registry_gap: gap,
        }
    }

    fn binding(&self, i: usize) -> Option<Proposal> {
        let rec = &self.recs[i];
        let ids = self.reachers.get(rec.uuid.as_deref()?)?;
        let ctxs: Vec<&str> = ids
            .iter()
            .filter(|&&j| j != i)
            .filter_map(|&j| self.recs[j].context.as_deref())
            .collect();
        let first = *ctxs.first()?;
        if ctxs.iter().any(|c| *c != first) {
            return None;
        }
        Some(self.fields(
            first,
            Tier::Binding,
            "high",
            vec![format!(
                "{} contexted record(s) reach this one through $ref and all say '{first}'",
                ctxs.len()
            )],
            None,
        ))
    }

    fn sibling(&self, i: usize) -> Option<Proposal> {
        let rec = &self.recs[i];
        let ids = self.siblings.get(&sibling_key(rec))?;
        let ctxs: Vec<&str> = ids
            .iter()
            .filter(|&&j| j != i)
            .filter_map(|&j| self.recs[j].context.as_deref())
            .collect();
        let first = *ctxs.first()?;
        if ctxs.iter().any(|c| *c != first) {
            return None;
        }
        Some(self.fields(
            first,
            Tier::Sibling,
            "high",
            vec![format!(
                "{} sibling(s) with component '{}', property '{}'{} all say '{first}'",
                ctxs.len(),
                rec.component,
                rec.property,
                rec.part
                    .as_deref()
                    .map(|p| format!(", part '{p}'"))
                    .unwrap_or_default()
            )],
            None,
        ))
    }

    fn template(&self, i: usize) -> Option<Proposal> {
        let rec = &self.recs[i];
        let p = rec.property.as_str();
        let opt = |k: &str| rec.options.get(k).and_then(opt_text);
        let mut ev = Vec::new();
        let (head, detail, confidence, basis): (
            String,
            Option<(bool, String)>,
            &'static str,
            &'static str,
        );

        let spacing = matches!(p, "gap" | "space-between" | "spacing")
            || p.contains("-to-")
            || p.starts_with("padding")
            || p.starts_with("margin");
        let text = p.starts_with("font-")
            || p.starts_with("line-height")
            || p.starts_with("letter-spacing")
            || p == "typography";
        let minmax = if p.contains("minimum") {
            Some("minimum")
        } else if p.contains("maximum") {
            Some("maximum")
        } else {
            None
        };
        let state_or_qualifier = opt("qualifier").or_else(|| opt("state"));

        if TYPOGRAPHY.contains(&rec.component.as_str()) {
            head = "Text".into();
            detail = None;
            confidence = "medium";
            basis = "typography";
            ev.push(format!(
                "typography component '{}' defaults to 'Text' (owner decision)",
                rec.component
            ));
        } else if opt("structure").as_deref() == Some("drop-shadow") {
            head = "Drop shadow".into();
            detail = None;
            confidence = "medium";
            basis = "drop-shadow";
            ev.push("scope.options.structure is 'drop-shadow'".into());
        } else if spacing {
            head = "Spacing".into();
            detail = match (opt("from"), opt("to"), rec.part.as_deref()) {
                (Some(f), Some(t), _) => Some((true, format!("{f} to {t}"))),
                (_, _, Some(part)) => Some((true, part.replace('-', " "))),
                _ => None,
            };
            confidence = if detail.is_some() { "medium" } else { "low" };
            basis = "spacing";
            ev.push(format!("property '{p}' is a spacing property"));
        } else if text && rec.part.is_none() {
            head = "Label".into();
            detail = None;
            confidence = "low";
            basis = "text-property";
            ev.push(format!("property '{p}' styles text; no part to name it"));
        } else if let Some(part) = rec.part.as_deref() {
            head = capitalize(part);
            let dim = ["size", "width", "height", "thickness"]
                .iter()
                .find(|d| p.ends_with(*d) && !p.starts_with("border") && !text);
            detail = state_or_qualifier.map(|q| (false, q)).or_else(|| {
                dim.map(|d| (false, minmax.map_or(d.to_string(), |m| format!("{m} {d}"))))
            });
            confidence = "medium";
            basis = "part";
            ev.push(format!("scope.part is '{part}'"));
        } else if let Some(obj) = rec.object.as_deref() {
            head = capitalize(obj);
            detail = state_or_qualifier.map(|q| (false, q));
            confidence = "medium";
            basis = "object";
            ev.push(format!("object is '{obj}'"));
        } else {
            let (h, d): (&str, Option<&str>) = if p.starts_with("workflow-icon-size") {
                ("Icon", None)
            } else if p.ends_with("border-width") {
                ("Border", None)
            } else if p == "corner-radius" {
                ("Rounding", None)
            } else if p == "color" {
                ("Background", None)
            } else if p.ends_with("width") {
                ("Width", minmax)
            } else if p.ends_with("height") {
                ("Height", minmax)
            } else if p == "size" {
                ("Size", None)
            } else if p == "thickness" {
                ("Thickness", None)
            } else {
                return None;
            };
            head = h.into();
            detail = d
                .map(String::from)
                .or(state_or_qualifier)
                .map(|d| (false, d));
            confidence = "low";
            basis = "property";
            ev.push(format!("name only: property '{p}', no part or object"));
        }
        if let Some(k) = &rec.legacy_key {
            ev.push(format!("legacyKey '{k}'"));
        }
        let context = match &detail {
            Some((_, d)) => format!("{head} ({d})"),
            None => head,
        };
        let mut out = self.fields(
            &context,
            Tier::Template,
            confidence,
            ev,
            detail.map(|(part, _)| part),
        );
        out.basis = Some(basis);
        Some(out)
    }

    fn tiers(&self, i: usize) -> [Option<Proposal>; 3] {
        [self.binding(i), self.sibling(i), self.template(i)]
    }

    fn main_word(&self, context: &str) -> String {
        let head = split_context(context).0;
        match self.reg.context_roles(head) {
            Ok(r) => r.join(","),
            Err(_) => norm(head).to_lowercase(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct Agreement {
    pub applicable: usize,
    pub exact: usize,
    #[serde(rename = "mainWord")]
    pub main_word: usize,
}

impl Quality {
    /// A template basis is usable when it was measured on enough records and reached
    /// [`TEMPLATE_USABLE`] main-word agreement.
    fn basis_usable(&self, basis: &str) -> bool {
        self.template_by_basis
            .get(basis)
            .is_some_and(|a| a.applicable >= 10 && a.main_word_rate() >= TEMPLATE_USABLE)
    }
}

impl Agreement {
    pub fn exact_rate(&self) -> f64 {
        rate(self.exact, self.applicable)
    }
    pub fn main_word_rate(&self) -> f64 {
        rate(self.main_word, self.applicable)
    }
}

fn rate(n: usize, d: usize) -> f64 {
    if d == 0 {
        0.0
    } else {
        n as f64 / d as f64
    }
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct Quality {
    /// Records that had a context, each tried with its own context hidden.
    pub records: usize,
    pub binding: Agreement,
    pub sibling: Agreement,
    pub template: Agreement,
    /// First tier that applies, as the suggester would choose.
    pub total: Agreement,
    /// The template tier split by what it was built from.
    #[serde(rename = "templateByBasis")]
    pub template_by_basis: BTreeMap<String, Agreement>,
    #[serde(rename = "templateUsable")]
    pub template_usable: bool,
}

/// Run the tiers over every record that already has a context, hiding it, and count how
/// often each tier agrees with the human string. A record's own context is never used.
pub fn quality(graph: &TokenGraph) -> Quality {
    let idx = Index::new(graph, RegistryData::embedded());
    quality_of(&idx)
}

fn quality_of(idx: &Index<'_>) -> Quality {
    let mut q = Quality::default();
    for (i, rec) in idx.recs.iter().enumerate() {
        let Some(human) = rec.context.as_deref() else {
            continue;
        };
        q.records += 1;
        let human_main = idx.main_word(human);
        let tiers = idx.tiers(i);
        let mut first = true;
        for (slot, p) in [&mut q.binding, &mut q.sibling, &mut q.template]
            .into_iter()
            .zip(tiers.iter())
        {
            let Some(p) = p else { continue };
            let exact = p.context == human;
            let main = idx.main_word(&p.context) == human_main;
            if let Some(b) = p.basis {
                let a = q.template_by_basis.entry(b.to_string()).or_default();
                a.applicable += 1;
                a.exact += usize::from(exact);
                a.main_word += usize::from(main);
            }
            slot.applicable += 1;
            slot.exact += usize::from(exact);
            slot.main_word += usize::from(main);
            if std::mem::take(&mut first) {
                q.total.applicable += 1;
                q.total.exact += usize::from(exact);
                q.total.main_word += usize::from(main);
            }
        }
    }
    q.template_usable = q.template.main_word_rate() >= TEMPLATE_USABLE;
    q
}

#[derive(Debug, Clone, Serialize)]
pub struct Entry {
    pub uuid: Option<String>,
    pub component: String,
    pub scope: Value,
    #[serde(flatten)]
    pub proposal: Proposal,
    /// For a template proposal: `needs review` when its basis is below target or unmeasured,
    /// `owner default` for typography `Text` (a decision, not a measurement).
    pub review: &'static str,
}

#[derive(Debug, Clone, Serialize)]
pub struct ComponentGroup {
    pub component: String,
    pub count: usize,
    pub records: Vec<Entry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Summary {
    #[serde(rename = "flaggedRecords")]
    pub flagged_records: usize,
    pub proposed: usize,
    pub unproposed: usize,
    #[serde(rename = "byTier")]
    pub by_tier: BTreeMap<String, usize>,
    #[serde(rename = "byConfidence")]
    pub by_confidence: BTreeMap<String, usize>,
    #[serde(rename = "registryGaps")]
    pub registry_gaps: BTreeMap<String, usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReviewFile {
    pub note: &'static str,
    pub summary: Summary,
    pub quality: Quality,
    pub components: Vec<ComponentGroup>,
    /// Flagged records no tier could propose a context for.
    pub unproposed: Vec<Value>,
}

/// Build the review file for the records SPEC-092 flags, limited to `components` when given
/// and without the typography components when `skip_typography`.
pub fn review(graph: &TokenGraph, components: &[String], skip_typography: bool) -> ReviewFile {
    let idx = Index::new(graph, RegistryData::embedded());
    let q = quality_of(&idx);
    let mut groups: BTreeMap<String, Vec<Entry>> = BTreeMap::new();
    let mut summary = Summary {
        flagged_records: 0,
        proposed: 0,
        unproposed: 0,
        by_tier: BTreeMap::new(),
        by_confidence: BTreeMap::new(),
        registry_gaps: BTreeMap::new(),
    };
    let mut unproposed = Vec::new();
    for i in spec092::flagged(&graph.relationships) {
        let rec = &idx.recs[i];
        if (!components.is_empty() && !components.contains(&rec.component))
            || (skip_typography && TYPOGRAPHY.contains(&rec.component.as_str()))
        {
            continue;
        }
        summary.flagged_records += 1;
        let scope = graph.relationships[i]
            .raw
            .get("scope")
            .cloned()
            .unwrap_or(Value::Null);
        let Some(proposal) = idx.tiers(i).into_iter().flatten().next() else {
            summary.unproposed += 1;
            unproposed.push(json!({"uuid": rec.uuid, "component": rec.component, "scope": scope}));
            continue;
        };
        summary.proposed += 1;
        *summary
            .by_tier
            .entry(proposal.tier.name().into())
            .or_default() += 1;
        *summary
            .by_confidence
            .entry(format!("{}:{}", proposal.tier.name(), proposal.confidence))
            .or_default() += 1;
        if let Some(g) = &proposal.registry_gap {
            *summary.registry_gaps.entry(g.clone()).or_default() += 1;
        }
        let review = if proposal.tier == Tier::Template {
            match proposal.basis {
                Some("typography") => "owner default",
                Some(b) if q.basis_usable(b) => "review",
                _ => "needs review",
            }
        } else {
            "review"
        };
        groups
            .entry(rec.component.clone())
            .or_default()
            .push(Entry {
                uuid: rec.uuid.clone(),
                component: rec.component.clone(),
                scope,
                proposal,
                review,
            });
    }
    ReviewFile {
        note: "Review file only: nothing here is written to the dataset. Accept per component; the context string stays the identity key.",
        summary,
        quality: q,
        components: groups
            .into_iter()
            .map(|(component, records)| ComponentGroup {
                component,
                count: records.len(),
                records,
            })
            .collect(),
        unproposed,
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;
    use crate::graph::RelationshipRecord;

    fn graph(raws: Vec<Value>) -> TokenGraph {
        let mut g = TokenGraph::default();
        for (index, raw) in raws.into_iter().enumerate() {
            g.relationships.push(RelationshipRecord {
                file: PathBuf::from("r.json"),
                index,
                uuid: raw.get("uuid").and_then(Value::as_str).map(String::from),
                raw,
            });
        }
        g
    }

    fn rec(uuid: &str, scope: Value, extra: Value) -> Value {
        let mut v = json!({"uuid": uuid, "scope": scope, "$ref": "t"});
        for (k, x) in extra.as_object().unwrap() {
            v[k] = x.clone();
        }
        v
    }

    fn one(g: &TokenGraph, i: usize) -> Proposal {
        let idx = Index::new(g, RegistryData::embedded());
        idx.tiers(i).into_iter().flatten().next().unwrap()
    }

    #[test]
    fn tier_binding_copies_the_context_that_reaches_the_record() {
        // The flagged record is reached only by a contexted record, so SPEC-092 would not
        // flag it; exercise the tier directly.
        let g = graph(vec![
            rec(
                "a",
                json!({"component": "tag", "property": "gap"}),
                json!({"$ref": "b", "context": "Spacing (icon to label)"}),
            ),
            rec(
                "b",
                json!({"component": "tag", "property": "gap"}),
                json!({}),
            ),
        ]);
        let p = one(&g, 1);
        assert_eq!(p.tier, Tier::Binding);
        assert_eq!(p.context, "Spacing (icon to label)");
        assert_eq!(p.context_role, ["spacing"]);
        assert_eq!(p.context_part.as_deref(), Some("icon to label"));
        assert!(p.fields_derive_string);
    }

    #[test]
    fn tier_sibling_needs_unanimity() {
        let s = json!({"component": "tag", "property": "width", "part": "track"});
        let mut rs = vec![
            rec("a", s.clone(), json!({"context": "Track (size)"})),
            rec("b", s.clone(), json!({"context": "Track (size)"})),
            rec("c", s.clone(), json!({})),
        ];
        let g = graph(rs.clone());
        let p = one(&g, 2);
        assert_eq!(p.tier, Tier::Sibling);
        assert_eq!(p.context, "Track (size)");
        assert_eq!(p.context_qualifier.as_deref(), Some("size"));
        rs[1]["context"] = json!("Track");
        assert_eq!(one(&graph(rs), 2).tier, Tier::Template);
    }

    #[test]
    fn tier_template_uses_part_options_and_property() {
        let g = graph(vec![
            rec(
                "a",
                json!({"component": "table", "property": "color", "part": "row", "options": {"state": ["selected"]}}),
                json!({}),
            ),
            rec(
                "b",
                json!({"component": "tabs", "property": "gap", "options": {"from": "edge", "to": "fill"}}),
                json!({}),
            ),
            rec(
                "c",
                json!({"component": "fab", "property": "blur", "options": {"structure": "drop-shadow"}}),
                json!({}),
            ),
            rec(
                "d",
                json!({"component": "heading", "property": "font-size"}),
                json!({}),
            ),
            rec(
                "e",
                json!({"component": "panel", "property": "minimum-width"}),
                json!({}),
            ),
        ]);
        let ps: Vec<Proposal> = (0..5).map(|i| one(&g, i)).collect();
        assert_eq!(ps[0].context, "Row (selected)");
        assert_eq!(ps[0].context_role, ["layout"]);
        assert_eq!(ps[1].context, "Spacing (edge to fill)");
        assert_eq!(ps[2].context, "Drop shadow");
        assert_eq!(ps[2].context_role, ["shadow"]);
        assert!(!ps[2].fields_derive_string);
        assert_eq!(ps[3].context, "Text");
        assert_eq!(ps[3].context_role, ["label"]);
        assert_eq!(ps[4].context, "Width (minimum)");
        assert!(ps.iter().all(|p| p.tier == Tier::Template));
    }

    #[test]
    fn an_unregistered_head_is_a_registry_gap_not_new_vocabulary() {
        let g = graph(vec![rec(
            "a",
            json!({"component": "panel", "property": "color", "part": "gripper"}),
            json!({}),
        )]);
        let p = one(&g, 0);
        assert_eq!(p.context, "Gripper");
        assert_eq!(p.registry_gap.as_deref(), Some("gripper"));
        assert!(p.context_role.is_empty());
    }

    #[test]
    fn quality_hides_each_records_own_context() {
        let s = json!({"component": "tag", "property": "width"});
        let g = graph(vec![
            rec("a", s.clone(), json!({"context": "Width (default)"})),
            rec("b", s.clone(), json!({"context": "Width (default)"})),
            rec("c", s, json!({"context": "Size"})),
        ]);
        let q = quality(&g);
        assert_eq!(q.records, 3);
        // a and b each see one agreeing and one disagreeing sibling, so only c is
        // covered, and it is wrong; the other two fall through to the template tier.
        assert_eq!((q.sibling.applicable, q.sibling.exact), (1, 0));
        assert_eq!(q.template.applicable, 3);
        assert_eq!(q.total.applicable, 3);
    }

    #[test]
    fn review_file_groups_by_component_and_labels_the_template_tier() {
        let g = graph(vec![
            rec(
                "a",
                json!({"component": "tabs", "property": "height", "part": "tab-item"}),
                json!({}),
            ),
            rec(
                "b",
                json!({"component": "table", "property": "color", "part": "row"}),
                json!({}),
            ),
            rec(
                "c",
                json!({"component": "tabs", "property": "wibble"}),
                json!({}),
            ),
            rec(
                "d",
                json!({"component": "tabs", "property": "width"}),
                json!({"context": "Width"}),
            ),
        ]);
        let r = review(&g, &[], false);
        assert_eq!(r.summary.flagged_records, 3);
        assert_eq!(r.summary.proposed, 2);
        assert_eq!(r.unproposed.len(), 1);
        let names: Vec<&str> = r.components.iter().map(|c| c.component.as_str()).collect();
        assert_eq!(names, ["table", "tabs"]);
        let v = serde_json::to_value(&r).unwrap();
        assert_eq!(v["components"][1]["records"][0]["tier"], "template");
        assert_eq!(v["components"][1]["records"][0]["uuid"], "a");
        assert!(v["components"][1]["records"][0]["evidence"].is_array());
        // Too few measured records for the basis, so it stays "needs review".
        assert_eq!(v["components"][1]["records"][0]["review"], "needs review");
    }
}
