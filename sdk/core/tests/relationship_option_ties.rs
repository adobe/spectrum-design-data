// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Ratchet for option ties between relationship records.
//!
//! A recipe binds `(property, context)` and the solver keeps the record that pins the most
//! options matching the request. Two records of one `(component, property, context)` that
//! pin different option sets, match the same request equally well, and point at different
//! tokens leave the solver with a tie. Moving option qualifiers out of contexts (SPEC-093)
//! merges contexts, so it can create ties; this test counts the groups with at least one tie
//! per component and holds the count at the committed baseline.
//!
//! It mirrors the option scoring of the real solver: `when_score` and `pinned_options` in
//! `core/src/visual.rs`. Each pin that matches adds one to a record's score (an any-of array
//! counts once), a record with a pin that does not match is dropped, and the highest score
//! wins. A pin on an option the component does not declare, or on `state`, `scale` or
//! `colorScheme`, is ignored, as `pinned_options` ignores it, so two records that differ only
//! by such a pin count as one pin set. The exception is a `position` pin of `inner` or `outer`:
//! the solver picks the stroke it serves, so such records are grouped apart from the rest. If the solver's scoring changes, change this test too.
//!
//! It looks at option pins only. Token states and modes can still tell two records apart at
//! solve time, so a counted group is a candidate for review, not proof of a bug. A group with
//! more than `MAX_ASSIGNMENTS` option combinations cannot be enumerated; the test fails and
//! names it instead of reporting no tie.
//!
//! A second check covers the case the first cannot see: records of one `(property, context)`
//! with the *same* pin set and different `$ref`s. That is fine when the targets differ in a
//! name field the solver ranks by (state, color scheme, scale, size, or the number of name
//! fields), and an
//! ambiguity when the targets are indistinguishable. The groups where they are indistinguishable
//! are counted per component against `relationship-same-pin-set-baseline.json`. Context-less
//! records are skipped, because a recipe cannot bind them (SPEC-092), and so are dangling
//! `$ref`s (SPEC-055).
//!
//! Regenerate after fixing a group with:
//! `UPDATE_OPTION_TIES_BASELINE=1 cargo test -p design-data-core --test relationship_option_ties`

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::PathBuf;

use serde_json::Value;

const RESERVED: &[&str] = &["state", "scale", "colorScheme"];
const MAX_ASSIGNMENTS: usize = 4096;
/// Token name fields the solver ranks by (see `load_targets`).
const RANKED_NAME_FIELDS: &[&str] = &["state", "colorScheme", "scale", "size"];

type Counts = BTreeMap<String, usize>;
/// `(property, context)` -> pin set as JSON -> (the pins, the refs of the records that pin them).
type PinGroups =
    BTreeMap<(String, String), BTreeMap<String, (BTreeMap<String, Value>, BTreeSet<String>)>>;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/relationship-option-ties-baseline.json")
}

fn same_pin_set_baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/relationship-same-pin-set-baseline.json")
}

fn read_json(path: &std::path::Path) -> Value {
    let text =
        std::fs::read_to_string(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
    serde_json::from_str(&text).unwrap_or_else(|e| panic!("parse {}: {e}", path.display()))
}

/// A value an option can take in a request, as a comparable string.
fn key(v: &Value) -> String {
    v.to_string()
}

/// True when a pinned value (scalar or any-of array) matches a request value.
fn pin_matches(pin: &Value, request: &str) -> bool {
    match pin {
        Value::Array(a) => a.iter().any(|x| key(x) == request),
        other => key(other) == request,
    }
}

/// What a record's scope says beyond its options: `between` and the descriptive fields. Two
/// records that differ here measure different things, so they are not ties. Empty for a record
/// that keeps those keys in `scope.options`, so existing groups do not change.
fn scope_identity(r: &Value) -> String {
    let Some(scope) = r.get("scope").and_then(Value::as_object) else {
        return String::new();
    };
    [
        "between",
        "attribute",
        "object",
        "position",
        "structure",
        "qualifier",
        "icon",
    ]
    .iter()
    .filter_map(|k| Some(format!("{k}={}", scope.get(*k)?)))
    .collect::<Vec<_>>()
    .join(" ")
}

/// A record's context with its scope identity, so the group label says what tells them apart.
fn group_context(r: &Value, context: &str) -> String {
    let id = scope_identity(r);
    // A record pinned to a stroke position is only compared with records of that position: the
    // solver drops the other position's records and lets a pinned one replace an unpinned one.
    let id = match r.pointer("/scope/options/position").and_then(Value::as_str) {
        Some(p @ ("inner" | "outer")) => format!("{id} stroke={p}").trim().to_string(),
        _ => id,
    };
    match id {
        id if id.is_empty() => context.to_string(),
        id => format!("{context} [{id}]"),
    }
}

/// Groups with at least one tie, and groups too large to enumerate, as `property / context`
/// labels.
fn tied_groups(component: &Value, records: &[Value]) -> (Vec<String>, Vec<String>) {
    let options = component.get("options").and_then(Value::as_object);
    let declared = |k: &str| !RESERVED.contains(&k) && options.is_some_and(|o| o.contains_key(k));
    // (property, context) -> pin set (as sorted JSON) -> refs
    let mut groups: PinGroups = BTreeMap::new();
    for r in records {
        let Some(property) = r.pointer("/scope/property").and_then(Value::as_str) else {
            continue;
        };
        let context = r
            .get("context")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim();
        let Some(rf) = r.get("$ref").and_then(Value::as_str) else {
            continue;
        };
        let pins: BTreeMap<String, Value> = r
            .pointer("/scope/options")
            .and_then(Value::as_object)
            .map(|o| {
                o.iter()
                    .filter(|(k, _)| declared(k))
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect()
            })
            .unwrap_or_default();
        let entry = groups
            .entry((property.to_string(), group_context(r, context)))
            .or_default()
            .entry(serde_json::to_string(&pins).unwrap())
            .or_insert_with(|| (pins, BTreeSet::new()));
        entry.1.insert(rf.to_string());
    }

    let mut out = Vec::new();
    let mut truncated = Vec::new();
    for ((property, context), sets) in &groups {
        if sets.len() < 2 {
            continue;
        }
        // Every value an option takes in this group, plus a value no pin names.
        let mut values: BTreeMap<&str, BTreeSet<String>> = BTreeMap::new();
        for (pins, _) in sets.values() {
            for (k, v) in pins {
                let e = values.entry(k.as_str()).or_default();
                match v {
                    Value::Array(a) => e.extend(a.iter().map(key)),
                    other => {
                        e.insert(key(other));
                    }
                }
            }
        }
        for (k, e) in values.iter_mut() {
            let is_bool = options
                .and_then(|o| o.get(*k))
                .and_then(|o| o.get("type"))
                .and_then(Value::as_str)
                == Some("boolean");
            if is_bool {
                e.insert("true".into());
                e.insert("false".into());
            }
            e.insert("\"<other>\"".into());
        }
        let names: Vec<&str> = values.keys().copied().collect();
        let all: Vec<&(BTreeMap<String, Value>, BTreeSet<String>)> = sets.values().collect();
        let allowed = |pins: &BTreeMap<String, Value>, name: &str| -> Option<BTreeSet<String>> {
            pins.get(name).map(|v| match v {
                Value::Array(a) => a.iter().map(key).collect(),
                other => BTreeSet::from([key(other)]),
            })
        };
        let mut tied = false;
        let mut too_big = false;
        // Only two records with the same pin count can tie, and only on a request that matches
        // both, so each pair fixes its own options and enumerates the rest.
        'pairs: for (i, (pa, ra)) in all.iter().enumerate() {
            for (pb, rb) in &all[i + 1..] {
                if pa.len() != pb.len() || ra == rb {
                    continue;
                }
                let mut lists: Vec<Vec<&String>> = Vec::new();
                let mut compatible = true;
                for n in &names {
                    let list: Vec<&String> = match (allowed(pa, n), allowed(pb, n)) {
                        (Some(x), Some(y)) => values[n]
                            .iter()
                            .filter(|v| x.contains(*v) && y.contains(*v))
                            .collect(),
                        (Some(x), None) | (None, Some(x)) => {
                            values[n].iter().filter(|v| x.contains(*v)).collect()
                        }
                        (None, None) => values[n].iter().collect(),
                    };
                    if list.is_empty() {
                        compatible = false;
                        break;
                    }
                    lists.push(list);
                }
                if !compatible {
                    continue;
                }
                let total: usize = lists.iter().map(Vec::len).product();
                if total > MAX_ASSIGNMENTS {
                    too_big = true;
                    continue;
                }
                let mut assignment = vec![0usize; names.len()];
                for _ in 0..total {
                    let request: BTreeMap<&str, &String> = names
                        .iter()
                        .enumerate()
                        .map(|(k, n)| (*n, lists[k][assignment[k]]))
                        .collect();
                    let matching: Vec<_> = all
                        .iter()
                        .filter(|(pins, _)| {
                            pins.iter().all(|(k, v)| {
                                request.get(k.as_str()).is_some_and(|r| pin_matches(v, r))
                            })
                        })
                        .collect();
                    let best = matching.iter().map(|(p, _)| p.len()).max().unwrap_or(0);
                    let top: Vec<_> = matching.iter().filter(|(p, _)| p.len() == best).collect();
                    let refs: BTreeSet<&BTreeSet<String>> = top.iter().map(|(_, r)| r).collect();
                    if top.len() > 1 && refs.len() > 1 {
                        tied = true;
                        break 'pairs;
                    }
                    for k in 0..assignment.len() {
                        assignment[k] += 1;
                        if assignment[k] < lists[k].len() {
                            break;
                        }
                        assignment[k] = 0;
                    }
                }
            }
        }
        if too_big && !tied {
            truncated.push(format!("{property} / {context}"));
        }
        if tied {
            out.push(format!("{property} / {context}"));
        }
    }
    (out, truncated)
}

/// Expand any-of scopes (proposal 017) into one record per alternative, as the solver does at
/// compile time, so every record the guard reads has plain pins.
fn expand_any_of(records: Vec<Value>) -> Vec<Value> {
    let mut out = Vec::new();
    for r in records {
        let options = r
            .pointer("/scope/options")
            .and_then(Value::as_object)
            .cloned();
        let Some(options) = options else {
            out.push(r);
            continue;
        };
        for v in design_data_core::scope::variants(&options) {
            let mut c = r.clone();
            let mut o = v.options;
            if !v.states.is_empty() {
                o.insert(
                    "state".into(),
                    Value::Array(v.states.into_iter().map(Value::String).collect()),
                );
            }
            c["scope"]["options"] = Value::Object(o);
            out.push(c);
        }
    }
    out
}

fn actual() -> (Counts, BTreeMap<String, Vec<String>>, Vec<String>) {
    let d = data_dir();
    let mut counts = Counts::new();
    let mut detail = BTreeMap::new();
    let mut too_big = Vec::new();
    let mut files: Vec<_> = std::fs::read_dir(d.join("relationships"))
        .expect("relationships dir")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|e| e == "json"))
        .collect();
    files.sort();
    for f in files {
        let name = f.file_stem().unwrap().to_string_lossy().to_string();
        let component = read_json(&d.join("components").join(format!("{name}.json")));
        let records = expand_any_of(read_json(&f).as_array().cloned().unwrap_or_default());
        let (tied, truncated) = tied_groups(&component, &records);
        too_big.extend(truncated.into_iter().map(|g| format!("{name}: {g}")));
        if !tied.is_empty() {
            counts.insert(name.clone(), tied.len());
            detail.insert(name, tied);
        }
    }
    (counts, detail, too_big)
}

#[test]
fn records_that_differ_in_between_are_not_ties() {
    let component = serde_json::json!({"options": {
        "size": {"values": [{"value": "s"}, {"value": "m"}]},
        "isQuiet": {"type": "boolean"}}});
    let rec = |options: Value, to: &str, rf: &str| {
        serde_json::json!({"scope": {"component": "x", "property": "gap",
            "between": {"from": "top", "to": to}, "options": options},
            "context": "Spacing", "$ref": rf})
    };
    // A small quiet request matches both records at the same specificity: a tie when the
    // endpoints agree, and none when they differ.
    let a = |to: &str| rec(serde_json::json!({"size": "s"}), to, "a");
    let b = |to: &str| rec(serde_json::json!({"isQuiet": true}), to, "b");
    let (tied, _) = tied_groups(&component, &[a("label"), b("label")]);
    let (apart, _) = tied_groups(&component, &[a("label"), b("icon")]);
    assert_eq!(tied.len(), 1, "{tied:?}");
    assert!(apart.is_empty(), "{apart:?}");
}

#[test]
fn descriptive_fields_separate_ties_and_the_old_place_does_not() {
    let component = serde_json::json!({"options": {
        "size": {"values": [{"value": "s"}, {"value": "m"}]},
        "isQuiet": {"type": "boolean"}}});
    let rec = |scope_extra: Value, options: Value, rf: &str| {
        let mut r = serde_json::json!({"scope": {"component": "x", "property": "gap",
            "options": options}, "context": "Spacing", "$ref": rf});
        for (k, v) in scope_extra.as_object().unwrap() {
            r["scope"][k] = v.clone();
        }
        r
    };
    let s = |extra: Value| rec(extra, serde_json::json!({"size": "s"}), "a");
    let q = |extra: Value| rec(extra, serde_json::json!({"isQuiet": true}), "b");
    for field in ["object", "position", "structure", "qualifier", "icon"] {
        let same = [
            s(serde_json::json!({field: "x"})),
            q(serde_json::json!({field: "x"})),
        ];
        let apart = [
            s(serde_json::json!({field: "x"})),
            q(serde_json::json!({field: "y"})),
        ];
        assert_eq!(tied_groups(&component, &same).0.len(), 1, "{field}");
        assert!(tied_groups(&component, &apart).0.is_empty(), "{field}");
    }
    // Keys still in `scope.options` are not identity here, so the baseline does not move.
    let old = |to: &str| {
        rec(
            serde_json::json!({}),
            serde_json::json!({"size": "s", "to": to}),
            "a",
        )
    };
    let old_q = |to: &str| {
        rec(
            serde_json::json!({}),
            serde_json::json!({"isQuiet": true, "to": to}),
            "b",
        )
    };
    assert_eq!(
        tied_groups(&component, &[old("label"), old_q("icon")])
            .0
            .len(),
        1
    );
}

#[test]
fn relationship_option_ties_match_the_baseline() {
    let (actual, detail, too_big) = actual();
    assert!(
        too_big.is_empty(),
        "\nThese groups have more than {MAX_ASSIGNMENTS} option combinations (MAX_ASSIGNMENTS in this file) and were not checked for ties: {}\nUPDATE_OPTION_TIES_BASELINE does not clear this. Raise MAX_ASSIGNMENTS or split the group in the data.\n",
        too_big.join("; ")
    );

    if std::env::var_os("UPDATE_OPTION_TIES_BASELINE").is_some() {
        let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
        std::fs::write(baseline_path(), json).expect("write baseline");
        return;
    }

    let baseline: Counts = serde_json::from_str(
        &std::fs::read_to_string(baseline_path())
            .expect("read relationship-option-ties-baseline.json"),
    )
    .expect("parse baseline");

    let mut problems = Vec::new();
    let names: BTreeSet<&String> = actual.keys().chain(baseline.keys()).collect();
    for name in names {
        let (have, allowed) = (
            actual.get(name).copied().unwrap_or(0),
            baseline.get(name).copied().unwrap_or(0),
        );
        if have > allowed {
            problems.push(format!(
                "{name}: {have} groups with a possible tie, baseline allows {allowed}. Groups: {}. Two records pin different options, match some request equally well and point at different tokens. Check with `design-data render` that token states or the recipe separate them; otherwise add a record that pins both options, or pin an option that tells them apart.",
                detail.get(name).map(|d| d.join("; ")).unwrap_or_default()
            ));
        } else if have < allowed {
            problems.push(format!(
                "{name}: {have} groups with a possible tie, baseline is {allowed}. Lower the baseline (UPDATE_OPTION_TIES_BASELINE=1) to keep the improvement."
            ));
        }
    }
    assert!(problems.is_empty(), "\n{}\n", problems.join("\n"));
}

/// What the solver can use to tell two records with one pin set apart. For relationship
/// bindings it filters candidate tokens by the request's modes and size against the token name
/// (`rank_by`), then prefers a candidate whose states match the request and, among equals, the
/// token with fewer name fields (`rank_key`, `resolve_candidates` in `visual.rs`). Other name
/// fields (`property`, `anatomy`, `colorRole`, `variant`, `script`, `scaleIndex` and so on) are
/// not ranked, so a difference in them alone does not count. This is an over-approximation: a
/// group can be counted that the solver still resolves through the recipe's `when` rules.
type Signature = BTreeMap<String, Value>;

fn pick(into: &mut Signature, from: Option<&Value>) {
    let Some(obj) = from.and_then(Value::as_object) else {
        return;
    };
    for k in RESERVED {
        if let Some(v) = obj.get(*k) {
            into.insert(format!("record.{k}"), v.clone());
        }
    }
}

/// Signature of every token and relationship by `uuid`: a token's name (without its
/// `legacyKey`) or a relationship's scope.
fn load_targets() -> HashMap<String, Signature> {
    let d = data_dir();
    let mut out = HashMap::new();
    let mut dirs = vec![d.join("tokens"), d.join("relationships")];
    dirs.retain(|p| p.is_dir());
    for dir in dirs {
        for entry in std::fs::read_dir(&dir)
            .expect("read dir")
            .filter_map(Result::ok)
        {
            let path = entry.path();
            if path.extension().is_none_or(|e| e != "json") {
                continue;
            }
            let items = read_json(&path)
                .as_array()
                .cloned()
                .unwrap_or_else(|| panic!("{} is not a JSON array", path.display()));
            for item in items {
                let Some(uuid) = item.get("uuid").and_then(Value::as_str) else {
                    continue;
                };
                let mut sig = Signature::new();
                if let Some(name) = item.get("name").and_then(Value::as_object) {
                    // What `rank_by` and `resolve_candidates` in `visual.rs` can use to pick
                    // between tokens: the request's modes (colorScheme, scale), its size, the
                    // token's state, and, among equals, the token with fewer name fields.
                    for k in RANKED_NAME_FIELDS {
                        if let Some(v) = name.get(*k) {
                            sig.insert(format!("name.{k}"), v.clone());
                        }
                    }
                    sig.insert("name.fields".into(), Value::from(name.len()));
                } else if let Some(options) =
                    item.pointer("/scope/options").and_then(Value::as_object)
                {
                    for k in RANKED_NAME_FIELDS {
                        if let Some(v) = options.get(*k) {
                            sig.insert(format!("name.{k}"), v.clone());
                        }
                    }
                }
                out.insert(uuid.to_string(), sig);
            }
        }
    }
    out
}

/// Groups where two records share a pin set, point at different tokens, and the solver has
/// nothing to rank them by: no difference in the targets' `RANKED_NAME_FIELDS` or name-field
/// count (or a relationship target's equivalent scope options), and none in the record's own
/// `state`, `scale` or `colorScheme`.
fn same_pin_set_groups(
    component: &Value,
    records: &[Value],
    targets: &HashMap<String, Signature>,
) -> Vec<String> {
    let options = component.get("options").and_then(Value::as_object);
    let declared = |k: &str| !RESERVED.contains(&k) && options.is_some_and(|o| o.contains_key(k));
    type Entry = (String, Signature);
    let mut groups: BTreeMap<(String, String, String), Vec<Entry>> = BTreeMap::new();
    for r in records {
        let (Some(property), Some(rf)) = (
            r.pointer("/scope/property").and_then(Value::as_str),
            r.get("$ref").and_then(Value::as_str),
        ) else {
            continue;
        };
        let context = r
            .get("context")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim();
        if context.is_empty() {
            continue; // a recipe binds on (property, context): a context-less record is unreachable
        }
        let pins: BTreeMap<&String, &Value> = r
            .pointer("/scope/options")
            .and_then(Value::as_object)
            .map(|o| o.iter().filter(|(k, _)| declared(k)).collect())
            .unwrap_or_default();
        // A dangling `$ref` (SPEC-055, p6ga.15) has no target to compare: treat each as distinct.
        let mut sig = targets.get(rf).cloned().unwrap_or_else(|| {
            Signature::from([("unresolved".to_string(), Value::String(rf.to_string()))])
        });
        pick(&mut sig, r.pointer("/scope/options"));
        groups
            .entry((
                property.to_string(),
                group_context(r, context),
                serde_json::to_string(&pins).unwrap(),
            ))
            .or_default()
            .push((rf.to_string(), sig));
    }
    let mut out = BTreeSet::new();
    for ((property, context, _), entries) in &groups {
        'g: for (i, (ra, sa)) in entries.iter().enumerate() {
            for (rb, sb) in &entries[i + 1..] {
                if ra != rb && sa == sb {
                    out.insert(format!("{property} / {context}"));
                    break 'g;
                }
            }
        }
    }
    out.into_iter().collect()
}

fn actual_same_pin_set() -> (Counts, BTreeMap<String, Vec<String>>) {
    let d = data_dir();
    let targets = load_targets();
    let mut counts = Counts::new();
    let mut detail = BTreeMap::new();
    let mut files: Vec<_> = std::fs::read_dir(d.join("relationships"))
        .expect("relationships dir")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|e| e == "json"))
        .collect();
    files.sort();
    for f in files {
        let name = f.file_stem().unwrap().to_string_lossy().to_string();
        let component = read_json(&d.join("components").join(format!("{name}.json")));
        let records = expand_any_of(read_json(&f).as_array().cloned().unwrap_or_default());
        let flagged = same_pin_set_groups(&component, &records, &targets);
        if !flagged.is_empty() {
            counts.insert(name.clone(), flagged.len());
            detail.insert(name, flagged);
        }
    }
    (counts, detail)
}

#[test]
fn same_pin_set_duplicates_match_the_baseline() {
    let (actual, detail) = actual_same_pin_set();

    if std::env::var_os("UPDATE_OPTION_TIES_BASELINE").is_some() {
        let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
        std::fs::write(same_pin_set_baseline_path(), json).expect("write baseline");
        return;
    }

    let baseline: Counts = serde_json::from_str(
        &std::fs::read_to_string(same_pin_set_baseline_path())
            .expect("read relationship-same-pin-set-baseline.json"),
    )
    .expect("parse baseline");

    let mut problems = Vec::new();
    let names: BTreeSet<&String> = actual.keys().chain(baseline.keys()).collect();
    for name in names {
        let (have, allowed) = (
            actual.get(name).copied().unwrap_or(0),
            baseline.get(name).copied().unwrap_or(0),
        );
        if have > allowed {
            problems.push(format!(
                "{name}: {have} groups where records share a pin set, point at different tokens and nothing tells them apart, baseline allows {allowed}. Groups: {}. Pin the option that separates them (for example size), or make the tokens differ by state, colorScheme or scale.",
                detail.get(name).map(|d| d.join("; ")).unwrap_or_default()
            ));
        } else if have < allowed {
            problems.push(format!(
                "{name}: {have} such groups, baseline is {allowed}. Lower the baseline (UPDATE_OPTION_TIES_BASELINE=1) to keep the improvement."
            ));
        }
    }
    assert!(problems.is_empty(), "\n{}\n", problems.join("\n"));
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::tied_groups;

    fn comp() -> serde_json::Value {
        json!({"options": {
            "isSelected": {"type": "boolean"},
            "isDisabled": {"type": "boolean"},
            "size": {"type": "string", "values": [{"value": "s"}, {"value": "m"}]}
        }})
    }

    fn rec(options: serde_json::Value, rf: &str) -> serde_json::Value {
        json!({"scope": {"property": "color", "options": options}, "context": "Control", "$ref": rf})
    }

    #[test]
    fn selected_versus_disabled_with_different_tokens_ties() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isDisabled": true}), "b"),
        ];
        assert_eq!(tied_groups(&comp(), &rs).0.len(), 1);
    }

    #[test]
    fn a_record_for_the_combination_resolves_the_tie() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isDisabled": true}), "b"),
            rec(json!({"isSelected": true, "isDisabled": true}), "b"),
        ];
        assert!(tied_groups(&comp(), &rs).0.is_empty());
    }

    #[test]
    fn the_same_token_under_two_pin_sets_is_not_a_tie() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isDisabled": true}), "a"),
        ];
        assert!(tied_groups(&comp(), &rs).0.is_empty());
    }

    #[test]
    fn an_any_of_array_matches_each_listed_value() {
        let rs = vec![
            rec(json!({"size": ["s", "m"]}), "a"),
            rec(json!({"isSelected": true}), "b"),
        ];
        assert_eq!(tied_groups(&comp(), &rs).0.len(), 1);
    }

    #[test]
    fn a_boolean_pinned_to_false_is_a_different_pin_set() {
        let rs = vec![
            rec(json!({"isSelected": false}), "a"),
            rec(json!({"isDisabled": true}), "b"),
        ];
        assert_eq!(tied_groups(&comp(), &rs).0.len(), 1);
    }

    #[test]
    fn a_pin_on_an_undeclared_option_is_ignored() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isSelected": true, "from": "top"}), "b"),
        ];
        assert!(tied_groups(&comp(), &rs).0.is_empty());
    }

    #[test]
    fn a_group_too_large_to_enumerate_is_reported_not_passed() {
        let many: serde_json::Map<String, serde_json::Value> = (0..14)
            .map(|i| (format!("o{i}"), json!({"type": "boolean"})))
            .collect();
        let component = json!({ "options": many });
        let rs: Vec<_> = (0..14)
            .map(|i| {
                let mut pins = serde_json::Map::new();
                pins.insert(format!("o{i}"), json!(true));
                rec(serde_json::Value::Object(pins), &format!("t{i}"))
            })
            .collect();
        let (tied, truncated) = tied_groups(&component, &rs);
        assert!(tied.is_empty());
        assert_eq!(truncated.len(), 1);
    }

    fn sig(pairs: &[(&str, serde_json::Value)]) -> super::Signature {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect()
    }

    fn targets(
        items: &[(&str, super::Signature)],
    ) -> std::collections::HashMap<String, super::Signature> {
        items
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect()
    }

    #[test]
    fn same_pin_set_with_nothing_to_tell_them_apart_is_flagged() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isSelected": true}), "b"),
        ];
        let t = targets(&[("a", sig(&[])), ("b", sig(&[]))]);
        assert_eq!(super::same_pin_set_groups(&comp(), &rs, &t).len(), 1);
    }

    #[test]
    fn a_token_scale_or_state_tells_them_apart() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isSelected": true}), "b"),
        ];
        let by_scale = targets(&[
            ("a", sig(&[("name.scale", json!("desktop"))])),
            ("b", sig(&[("name.scale", json!("mobile"))])),
        ]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &by_scale).is_empty());
        let by_state = targets(&[
            ("a", sig(&[("name.state", json!(["hover"]))])),
            ("b", sig(&[("name.state", json!(["down"]))])),
        ]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &by_state).is_empty());
    }

    #[test]
    fn a_state_on_the_record_scope_tells_them_apart() {
        let rs = vec![
            rec(json!({"isSelected": true, "state": ["hover"]}), "a"),
            rec(json!({"isSelected": true, "state": ["down"]}), "b"),
        ];
        let t = targets(&[("a", sig(&[])), ("b", sig(&[]))]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &t).is_empty());
    }

    #[test]
    fn the_same_ref_twice_is_not_flagged() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isSelected": true}), "a"),
        ];
        let t = targets(&[("a", sig(&[]))]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &t).is_empty());
    }

    #[test]
    fn a_size_difference_in_the_token_name_tells_them_apart() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isSelected": true}), "b"),
        ];
        let t = targets(&[
            (
                "a",
                sig(&[("name.size", json!("s")), ("name.fields", json!(2))]),
            ),
            (
                "b",
                sig(&[("name.size", json!("l")), ("name.fields", json!(2))]),
            ),
        ]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &t).is_empty());
    }

    #[test]
    fn fewer_name_fields_tells_them_apart_but_other_fields_do_not() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isSelected": true}), "b"),
        ];
        let by_count = targets(&[
            ("a", sig(&[("name.fields", json!(2))])),
            ("b", sig(&[("name.fields", json!(3))])),
        ]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &by_count).is_empty());
        // `load_targets` only keeps ranked fields, so tokens that differ by property or role
        // have equal signatures and are flagged.
        let same = targets(&[
            ("a", sig(&[("name.fields", json!(2))])),
            ("b", sig(&[("name.fields", json!(2))])),
        ]);
        assert_eq!(super::same_pin_set_groups(&comp(), &rs, &same).len(), 1);
    }

    #[test]
    fn an_any_of_expands_into_the_pin_sets_of_its_alternatives() {
        // An any-of record and a plain record with the same refs and different pins: after
        // expansion the any-of is two pin sets, one equal to the plain pins, none a tie.
        let any_of = rec(
            json!({"anyOf": [{"isSelected": true}, {"isDisabled": true}]}),
            "a",
        );
        let plain = rec(json!({"isSelected": true}), "a");
        let expanded = super::expand_any_of(vec![any_of.clone(), plain.clone()]);
        assert_eq!(expanded.len(), 3);
        assert!(tied_groups(&comp(), &expanded).0.is_empty());
        // The same any-of against a plain record with a different token is a possible tie.
        let other = rec(json!({"isDisabled": true}), "b");
        let expanded = super::expand_any_of(vec![any_of, other]);
        assert_eq!(tied_groups(&comp(), &expanded).0.len(), 1);
    }
}

// ── Field borders: a disabled field keeps its disabled border ──────────────────────────────

/// `option_matches` in `visual.rs`: an unset option is null, which matches a pinned `false`.
fn option_matches(have: &Value, want: &Value) -> bool {
    have == want
        || (have.is_null() && *want == Value::Bool(false))
        || (*want == Value::Bool(true) && have.as_str().is_some_and(|v| !v.is_empty()))
}

/// The records that win the option stage of `resolve_candidates`: drop a record with a pin that
/// does not match, then keep the ones with the most matching pins. `state` is not a pin here; it
/// only ranks what is left, so a record that survives this stage cannot be outranked by one that
/// does not.
fn option_stage<'a>(
    records: &'a [Value],
    declared: &BTreeMap<String, Value>,
    request: &BTreeMap<&str, Value>,
) -> Vec<&'a Value> {
    let mut scored: Vec<(usize, &Value)> = Vec::new();
    'record: for r in records {
        let mut score = 0;
        if let Some(pins) = r.pointer("/scope/options").and_then(Value::as_object) {
            for (name, want) in pins {
                if RESERVED.contains(&name.as_str()) || !declared.contains_key(name) {
                    continue;
                }
                let have = request
                    .get(name.as_str())
                    .or_else(|| declared.get(name))
                    .cloned()
                    .unwrap_or(Value::Null);
                let ok = match want {
                    Value::Array(any) => any.iter().any(|w| option_matches(&have, w)),
                    w => option_matches(&have, w),
                };
                if !ok {
                    continue 'record;
                }
                score += 1;
            }
        }
        scored.push((score, r));
    }
    let best = scored.iter().map(|(s, _)| *s).max().unwrap_or(0);
    scored
        .into_iter()
        .filter(|(s, _)| *s == best)
        .map(|(_, r)| r)
        .collect()
}

/// Token `uuid` or `conceptId` -> `legacyKey`.
fn legacy_keys() -> HashMap<String, String> {
    let mut out = HashMap::new();
    for entry in std::fs::read_dir(data_dir().join("tokens"))
        .expect("read tokens")
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if path.extension().is_none_or(|e| e != "json") {
            continue;
        }
        for token in read_json(&path).as_array().cloned().unwrap_or_default() {
            let Some(legacy) = token.pointer("/name/legacyKey").and_then(Value::as_str) else {
                continue;
            };
            for id in ["uuid", "conceptId"] {
                if let Some(v) = token.get(id).and_then(Value::as_str) {
                    out.insert(v.to_string(), legacy.to_string());
                }
            }
        }
    }
    out
}

/// A disabled field's border is `disabled-border-color` whatever state the pointer or focus is
/// in. The solver keeps only the records with the most matching option pins, and `state` is not
/// an option pin, so a hover or focus record (no option pins) cannot beat the disabled record.
/// Also covers an `isError` that is not in the request: unset matches a pinned `false`.
#[test]
fn a_disabled_field_border_is_not_overridden_by_state_records() {
    let legacy = legacy_keys();
    for name in [
        "text-field",
        "number-field",
        "text-area",
        "search-field",
        "combo-box",
    ] {
        let component = read_json(&data_dir().join(format!("components/{name}.json")));
        let declared: BTreeMap<String, Value> = component
            .get("options")
            .and_then(Value::as_object)
            .map(|o| {
                o.iter()
                    .map(|(k, v)| (k.clone(), v.get("default").cloned().unwrap_or(Value::Null)))
                    .collect()
            })
            .unwrap_or_default();
        let records: Vec<Value> = read_json(&data_dir().join(format!("relationships/{name}.json")))
            .as_array()
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter(|r| {
                r.pointer("/lifecycle/deprecatedIn").is_none()
                    && r.pointer("/scope/property").and_then(Value::as_str) == Some("color")
                    && r.get("context").and_then(Value::as_str) == Some("Border")
            })
            .collect();
        let request = BTreeMap::from([("isDisabled", Value::Bool(true))]);
        let winners = option_stage(&records, &declared, &request);
        let refs: BTreeSet<&str> = winners
            .iter()
            .filter_map(|r| r.get("$ref").and_then(Value::as_str))
            .collect();
        let keys: BTreeSet<&str> = refs
            .iter()
            .filter_map(|r| legacy.get(*r).map(String::as_str))
            .collect();
        assert_eq!(
            keys,
            BTreeSet::from(["disabled-border-color"]),
            "{name}: a disabled field's border resolves to {keys:?}, not only disabled-border-color"
        );
    }
}

/// Token `uuid` or `conceptId` -> its `name` object.
fn token_names() -> HashMap<String, Value> {
    let mut out = HashMap::new();
    for entry in std::fs::read_dir(data_dir().join("tokens"))
        .expect("read tokens")
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if path.extension().is_none_or(|e| e != "json") {
            continue;
        }
        for token in read_json(&path).as_array().cloned().unwrap_or_default() {
            let Some(name) = token.get("name") else {
                continue;
            };
            for id in ["uuid", "conceptId"] {
                if let Some(v) = token.get(id).and_then(Value::as_str) {
                    out.insert(v.to_string(), name.clone());
                }
            }
        }
    }
    out
}

/// Number field does not declare `keyboard-focus`, so its keyboard-focus error border cannot pin
/// that state in `scope.options.state` (SPEC-054). A record with no pinned state takes the state
/// of its token (`Candidate` in `visual.rs`), so it still differs from the default error border:
/// the two have the same option pins and are told apart by state.
#[test]
fn number_field_keyboard_focus_error_border_is_told_apart_by_its_token_state() {
    let names = token_names();
    let records = read_json(&data_dir().join("relationships/number-field.json"));
    let states: Vec<Value> = records
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .filter(|r| {
            r.pointer("/lifecycle/deprecatedIn").is_none()
                && r.pointer("/scope/property").and_then(Value::as_str) == Some("color")
                && r.get("context").and_then(Value::as_str) == Some("Border")
                && r.pointer("/scope/options/isError") == Some(&Value::Bool(true))
                && r.pointer("/scope/options/state").is_none()
        })
        .filter_map(|r| {
            let name = names.get(r.get("$ref")?.as_str()?)?;
            let light = name.get("colorScheme").is_none_or(|c| c == "light");
            light.then(|| name.get("state").cloned().unwrap_or(Value::Null))
        })
        .collect();
    let unique: BTreeSet<String> = states.iter().map(key).collect();
    assert_eq!(
        unique.len(),
        states.len(),
        "stateless error borders share a state: {states:?}"
    );
    assert!(
        unique.contains(&key(&serde_json::json!(["keyboard-focus"]))),
        "the keyboard-focus error border should carry its state on the token: {states:?}"
    );
}
