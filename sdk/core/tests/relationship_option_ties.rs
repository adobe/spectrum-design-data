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
//! It looks at option pins only. Token states and modes can still tell two records apart at
//! solve time, so a counted group is a candidate for review, not proof of a bug.
//!
//! Regenerate after fixing a group with:
//! `UPDATE_OPTION_TIES_BASELINE=1 cargo test -p design-data-core --test relationship_option_ties`

use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;

use serde_json::Value;

const RESERVED: &[&str] = &["state", "scale", "colorScheme"];
const MAX_ASSIGNMENTS: usize = 4096;

type Counts = BTreeMap<String, usize>;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/relationship-option-ties-baseline.json")
}

fn read_json(path: &std::path::Path) -> Value {
    serde_json::from_str(&std::fs::read_to_string(path).expect("read")).expect("parse")
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

/// Groups with at least one tie, as `property / context` labels.
fn tied_groups(component: &Value, records: &[Value]) -> Vec<String> {
    let options = component.get("options").and_then(Value::as_object);
    let declared = |k: &str| !RESERVED.contains(&k) && options.is_some_and(|o| o.contains_key(k));
    // (property, context) -> pin set (as sorted JSON) -> refs
    let mut groups: BTreeMap<
        (String, String),
        BTreeMap<String, (BTreeMap<String, Value>, BTreeSet<String>)>,
    > = BTreeMap::new();
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
            .entry((property.to_string(), context.to_string()))
            .or_default()
            .entry(serde_json::to_string(&pins).unwrap())
            .or_insert_with(|| (pins, BTreeSet::new()));
        entry.1.insert(rf.to_string());
    }

    let mut out = Vec::new();
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
        let mut assignment = vec![0usize; names.len()];
        let lists: Vec<Vec<&String>> = names.iter().map(|n| values[n].iter().collect()).collect();
        let total: usize = lists
            .iter()
            .map(Vec::len)
            .product::<usize>()
            .min(MAX_ASSIGNMENTS);
        let mut tied = false;
        for _ in 0..total {
            let request: BTreeMap<&str, &String> = names
                .iter()
                .enumerate()
                .map(|(i, n)| (*n, lists[i][assignment[i]]))
                .collect();
            let matching: Vec<&(BTreeMap<String, Value>, BTreeSet<String>)> = sets
                .values()
                .filter(|(pins, _)| {
                    pins.iter()
                        .all(|(k, v)| request.get(k.as_str()).is_some_and(|r| pin_matches(v, r)))
                })
                .collect();
            let best = matching.iter().map(|(p, _)| p.len()).max().unwrap_or(0);
            let top: Vec<_> = matching.iter().filter(|(p, _)| p.len() == best).collect();
            if top.len() > 1 {
                let refs: BTreeSet<&BTreeSet<String>> = top.iter().map(|(_, r)| r).collect();
                if refs.len() > 1 {
                    tied = true;
                    break;
                }
            }
            for i in 0..assignment.len() {
                assignment[i] += 1;
                if assignment[i] < lists[i].len() {
                    break;
                }
                assignment[i] = 0;
            }
        }
        if tied {
            out.push(format!("{property} / {context}"));
        }
    }
    out
}

fn actual() -> (Counts, BTreeMap<String, Vec<String>>) {
    let d = data_dir();
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
        let records: Vec<Value> = read_json(&f).as_array().cloned().unwrap_or_default();
        let tied = tied_groups(&component, &records);
        if !tied.is_empty() {
            counts.insert(name.clone(), tied.len());
            detail.insert(name, tied);
        }
    }
    (counts, detail)
}

#[test]
fn relationship_option_ties_match_the_baseline() {
    let (actual, detail) = actual();

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
                "{name}: {have} tied groups, baseline allows {allowed}. Groups: {}. Pin a distinguishing option or add the record for the combination.",
                detail.get(name).map(|d| d.join("; ")).unwrap_or_default()
            ));
        } else if have < allowed {
            problems.push(format!(
                "{name}: {have} tied groups, baseline is {allowed}. Lower the baseline (UPDATE_OPTION_TIES_BASELINE=1) to keep the improvement."
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
        assert_eq!(tied_groups(&comp(), &rs).len(), 1);
    }

    #[test]
    fn a_record_for_the_combination_resolves_the_tie() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isDisabled": true}), "b"),
            rec(json!({"isSelected": true, "isDisabled": true}), "b"),
        ];
        assert!(tied_groups(&comp(), &rs).is_empty());
    }

    #[test]
    fn the_same_token_under_two_pin_sets_is_not_a_tie() {
        let rs = vec![
            rec(json!({"isSelected": true}), "a"),
            rec(json!({"isDisabled": true}), "a"),
        ];
        assert!(tied_groups(&comp(), &rs).is_empty());
    }

    #[test]
    fn an_any_of_array_matches_each_listed_value() {
        let rs = vec![
            rec(json!({"size": ["s", "m"]}), "a"),
            rec(json!({"isSelected": true}), "b"),
        ];
        assert_eq!(tied_groups(&comp(), &rs).len(), 1);
    }
}
