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
//! by such a pin count as one pin set. If the solver's scoring changes, change this test too.
//!
//! It looks at option pins only. Token states and modes can still tell two records apart at
//! solve time, so a counted group is a candidate for review, not proof of a bug. A group with
//! more than `MAX_ASSIGNMENTS` option combinations cannot be enumerated; the test fails and
//! names it instead of reporting no tie.
//!
//! A second check covers the case the first cannot see: records of one `(property, context)`
//! with the *same* pin set and different `$ref`s. That is fine when the targets differ in a
//! name field the solver ranks by (state, color scheme, scale, size, script), and an
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

type Counts = BTreeMap<String, usize>;

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

/// Groups with at least one tie, and groups too large to enumerate, as `property / context`
/// labels.
fn tied_groups(component: &Value, records: &[Value]) -> (Vec<String>, Vec<String>) {
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
        let records: Vec<Value> = read_json(&f).as_array().cloned().unwrap_or_default();
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

/// What can tell two records with one pin set apart at solve time. The solver ranks a
/// relationship's target by the target token's own name fields (state, color scheme, scale,
/// and the `size` or `script` the recipe asks for), so two records separate when their targets
/// differ in any name field, or in the scope of a relationship target. The record's own
/// `state`, `scale` and `colorScheme` options count too. Only records whose targets are
/// indistinguishable by all of that are flagged.
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
            let Some(items) = read_json(&path).as_array().cloned() else {
                continue;
            };
            for item in items {
                let Some(uuid) = item.get("uuid").and_then(Value::as_str) else {
                    continue;
                };
                let mut sig = Signature::new();
                if let Some(name) = item.get("name").and_then(Value::as_object) {
                    for (k, v) in name.iter().filter(|(k, _)| k.as_str() != "legacyKey") {
                        sig.insert(format!("name.{k}"), v.clone());
                    }
                } else if let Some(scope) = item.get("scope").and_then(Value::as_object) {
                    for (k, v) in scope {
                        sig.insert(format!("scope.{k}"), v.clone());
                    }
                }
                out.insert(uuid.to_string(), sig);
            }
        }
    }
    out
}

/// Groups where two records share a pin set, point at different tokens, and nothing in their
/// own scope or their targets' state, color scheme or scale tells them apart.
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
                context.to_string(),
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
        let records: Vec<Value> = read_json(&f).as_array().cloned().unwrap_or_default();
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
                sig(&[
                    ("name.property", json!("padding")),
                    ("name.size", json!("s")),
                ]),
            ),
            (
                "b",
                sig(&[
                    ("name.property", json!("padding")),
                    ("name.size", json!("l")),
                ]),
            ),
        ]);
        assert!(super::same_pin_set_groups(&comp(), &rs, &t).is_empty());
        let same = targets(&[
            ("a", sig(&[("name.property", json!("padding"))])),
            ("b", sig(&[("name.property", json!("padding"))])),
        ]);
        assert_eq!(super::same_pin_set_groups(&comp(), &rs, &same).len(), 1);
    }
}
