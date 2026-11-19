// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A relationship's `scope.options`: the shapes an engine understands, including the any-of
//! forms of proposal 017, and their expansion into plain pins.
//!
//! `scope.options` is an AND object of option pins. It may also carry:
//!
//! * `anyOf`: an array of option-condition objects. The record applies when its other pins match
//!   and at least one alternative matches (for example `[{isSelected: true}, {isIndeterminate:
//!   true}]`);
//! * a `state` array whose elements may be `{ "anyOf": [state, ...] }`.
//!
//! A record with any-of is equivalent to one record per combination of alternatives, all with
//! the same `$ref`. [`variants`] returns those records, so the solver and the rules reason about
//! plain pins and never see `anyOf`.

use serde_json::{Map, Value};

/// The reserved key of an any-of in `scope.options` and in a `state` element.
pub const ANY_OF: &str = "anyOf";

/// Most variants one record may expand to. A bound keeps a typo from building a huge product.
pub const MAX_VARIANTS: usize = 64;

/// The fields of a relationship `scope` this engine knows. A record with any other field is
/// refused: dropping an unknown identity field would make two records that differ only by it
/// look identical.
const SCOPE_KEYS: &[&str] = &[
    "component",
    "part",
    "property",
    "options",
    "between",
    "attribute",
    "object",
    "position",
    "structure",
    "qualifier",
    "icon",
];

/// The descriptive scope fields that hold one registry term. `scope.between` is the pair
/// `{from, to}` and is checked on its own.
pub const DESCRIPTIVE_FIELDS: &[&str] = &[
    "attribute",
    "object",
    "position",
    "structure",
    "qualifier",
    "icon",
];

const NEWER: &str =
    "The data is newer than this engine: upgrade the CLI or the @adobe/design-data-* packages";

/// Keys that are not component options: a token state and the two modes.
const NOT_OPTIONS: &[&str] = &["state", "scale", "colorScheme", ANY_OF];

fn scalar(v: &Value) -> bool {
    v.is_string() || v.is_number() || v.is_boolean()
}

fn pin_value(v: &Value) -> bool {
    scalar(v) || v.as_array().is_some_and(|a| a.iter().all(scalar))
}

/// The alternatives of a `state` element `{ "anyOf": [...] }`, or `None` for any other value.
fn state_alternatives(element: &Value) -> Option<&Vec<Value>> {
    let obj = element.as_object()?;
    if obj.len() != 1 {
        return None;
    }
    obj.get(ANY_OF)?.as_array()
}

/// Why this engine cannot use a relationship record's `scope.options`, or `None` when every
/// value has a shape it understands and can run. The engine must refuse what it does not
/// understand: a solver that dropped an unknown pin would apply the record to every request,
/// which is silent wrong output.
///
/// A `scope` may only hold `component`, `part`, `property`, `options`, `between` (an object
/// with a non-empty string `from` and/or `to`) and the descriptive fields in
/// [`DESCRIPTIVE_FIELDS`] (each a non-empty string).
///
/// Understood shapes (deny by default; a new shape is added here when the solver learns it):
/// * `state`: an array whose elements are state strings or `{ "anyOf": [strings] }`;
/// * `anyOf`: a non-empty array of non-empty objects whose keys are component options (not
///   `state`, `scale`, `colorScheme` or `anyOf`) and whose values are pins;
/// * any other option: a string, number or boolean, or an array of those.
///
/// A record that carries its own `value` (and no `$ref`) may not use an any-of, and one record
/// may not expand to more than [`MAX_VARIANTS`] variants.
pub fn unsupported_shape(raw: &Value) -> Option<String> {
    if let Some(key) = raw
        .get("scope")
        .and_then(Value::as_object)
        .and_then(|scope| scope.keys().find(|k| !SCOPE_KEYS.contains(&k.as_str())))
    {
        return Some(format!(
            "scope.{key} is a field this engine does not know. {NEWER}"
        ));
    }
    if let Some(why) = unsupported_descriptive(raw) {
        return Some(why);
    }
    let options = raw.pointer("/scope/options")?;
    let Some(options) = options.as_object() else {
        return Some("scope.options is not an object".to_string());
    };
    let mut uses_any_of = false;
    for (key, value) in options {
        let ok = match key.as_str() {
            "state" => value.as_array().is_some_and(|a| {
                a.iter().all(|e| {
                    e.is_string()
                        || state_alternatives(e).is_some_and(|alts| {
                            uses_any_of = true;
                            !alts.is_empty() && alts.iter().all(Value::is_string)
                        })
                })
            }),
            ANY_OF => {
                uses_any_of = true;
                value.as_array().is_some_and(|alts| {
                    !alts.is_empty()
                        && alts.iter().all(|alt| {
                            alt.as_object().is_some_and(|o| {
                                !o.is_empty()
                                    && o.iter().all(|(k, v)| {
                                        !NOT_OPTIONS.contains(&k.as_str()) && pin_value(v)
                                    })
                            })
                        })
                })
            }
            _ => pin_value(value),
        };
        if !ok {
            return Some(format!(
                "scope.options.{key} has a value this engine does not support ({value}). {NEWER}"
            ));
        }
    }
    if uses_any_of && raw.get("value").is_some() && raw.get("$ref").is_none() {
        return Some(
            "scope.options uses anyOf on a record that carries its own value; an any-of needs a \
             $ref"
                .to_string(),
        );
    }
    if uses_any_of && count_variants(options) > MAX_VARIANTS {
        return Some(format!(
            "scope.options expands to more than {MAX_VARIANTS} variants"
        ));
    }
    None
}

/// The descriptive keys of a record as the name-object fields they stand for: `between.from`
/// and `between.to` as `from` and `to`, and `object`, `position`, `structure`, `qualifier` and
/// `icon` as themselves. A record keeps them either in `scope` (the new place) or, until the
/// data is moved, inside `scope.options`; `scope` wins when both hold one.
pub fn descriptive(scope: &Map<String, Value>) -> Map<String, Value> {
    let mut out = Map::new();
    let options = scope.get("options").and_then(Value::as_object);
    for key in ["from", "to"]
        .into_iter()
        .chain(DESCRIPTIVE_FIELDS.iter().copied())
    {
        if let Some(v) = options.and_then(|o| o.get(key)) {
            out.insert(key.to_string(), v.clone());
        }
    }
    if let Some(between) = scope.get("between").and_then(Value::as_object) {
        for end in ["from", "to"] {
            if let Some(v) = between.get(end) {
                out.insert(end.to_string(), v.clone());
            }
        }
    }
    for key in DESCRIPTIVE_FIELDS {
        if let Some(v) = scope.get(*key) {
            out.insert(key.to_string(), v.clone());
        }
    }
    out
}

/// `scope.options` plus the descriptive keys from [`descriptive`], new place winning. This is
/// what a reader that treats `from`, `to`, `object` ... like any other key of the old
/// `scope.options` should iterate while records are in both places.
pub fn options_with_descriptive(scope: &Map<String, Value>) -> Map<String, Value> {
    let mut out = scope
        .get("options")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    out.extend(descriptive(scope));
    out
}

fn non_empty_string(v: &Value) -> bool {
    v.as_str().is_some_and(|s| !s.is_empty())
}

/// A `scope.between` or descriptive field whose value is not the shape this engine reads.
fn unsupported_descriptive(raw: &Value) -> Option<String> {
    let scope = raw.get("scope")?.as_object()?;
    for key in DESCRIPTIVE_FIELDS {
        if let Some(v) = scope.get(*key).filter(|v| !non_empty_string(v)) {
            return Some(format!(
                "scope.{key} has a value this engine does not support ({v}). {NEWER}"
            ));
        }
    }
    let between = scope.get("between")?;
    let ok = between.as_object().is_some_and(|b| {
        !b.is_empty()
            && b.iter()
                .all(|(k, v)| (k == "from" || k == "to") && non_empty_string(v))
    });
    (!ok).then(|| {
        format!("scope.between has a value this engine does not support ({between}). {NEWER}")
    })
}

/// How many variants `options` expands to, before conflicting ones are dropped.
fn count_variants(options: &Map<String, Value>) -> usize {
    let alts = options
        .get(ANY_OF)
        .and_then(Value::as_array)
        .map_or(1, Vec::len);
    let states: usize = options
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(state_alternatives)
        .map(Vec::len)
        .product();
    alts.saturating_mul(states)
}

/// One plain record a scope expands to.
#[derive(Debug, Clone, PartialEq)]
pub struct Variant {
    /// The option pins: the base pins plus one alternative's. Includes `scale` and
    /// `colorScheme` when the record has them; never `state` or `anyOf`.
    pub options: Map<String, Value>,
    /// The raw state strings: the fixed ones plus one member of each state any-of, with no
    /// repeats.
    pub states: Vec<String>,
}

/// The values two pins on one option both allow, as a pin, or `None` when they share none.
/// A pin is a value or an array that matches when any element does.
pub(crate) fn intersect(a: &Value, b: &Value) -> Option<Value> {
    let set = |v: &Value| -> Vec<Value> {
        match v {
            Value::Array(items) => items.clone(),
            other => vec![other.clone()],
        }
    };
    let (sa, sb) = (set(a), set(b));
    let shared: Vec<Value> = sa.into_iter().filter(|x| sb.contains(x)).collect();
    match shared.len() {
        0 => None,
        1 => shared.into_iter().next(),
        _ => Some(Value::Array(shared)),
    }
}

/// The plain records `options` stands for. A record without any-of gives one variant. A
/// combination whose alternative pins an option to a value that contradicts a base pin is
/// dropped, because no request can match it.
pub fn variants(options: &Map<String, Value>) -> Vec<Variant> {
    let base: Map<String, Value> = options
        .iter()
        .filter(|(k, _)| k.as_str() != "state" && k.as_str() != ANY_OF)
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    let alternatives: Vec<Map<String, Value>> = match options.get(ANY_OF).and_then(Value::as_array)
    {
        Some(alts) => alts
            .iter()
            .filter_map(|a| a.as_object().cloned())
            .collect::<Vec<_>>(),
        None => vec![Map::new()],
    };
    // Each element of `state` is a set of alternative state strings (one for a plain state).
    let elements: Vec<Vec<String>> = options
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|e| match e.as_str() {
            Some(s) => Some(vec![s.to_string()]),
            None => state_alternatives(e).map(|alts| {
                alts.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            }),
        })
        .collect();
    let mut state_combos: Vec<Vec<String>> = vec![Vec::new()];
    for element in &elements {
        let mut next = Vec::new();
        for combo in &state_combos {
            for member in element {
                let mut c = combo.clone();
                if !c.contains(member) {
                    c.push(member.clone());
                }
                next.push(c);
            }
        }
        state_combos = next;
    }
    let mut out: Vec<Variant> = Vec::new();
    for alt in &alternatives {
        let mut pins = base.clone();
        let mut conflict = false;
        for (k, v) in alt {
            match base.get(k) {
                // The alternative narrows a base pin: both must hold, so the pin is the values
                // they share, and an empty overlap matches no request.
                Some(b) => match intersect(b, v) {
                    Some(both) => {
                        pins.insert(k.clone(), both);
                    }
                    None => conflict = true,
                },
                None => {
                    pins.insert(k.clone(), v.clone());
                }
            }
        }
        if conflict {
            continue;
        }
        for states in &state_combos {
            let v = Variant {
                options: pins.clone(),
                states: states.clone(),
            };
            if !out.contains(&v) {
                out.push(v);
            }
        }
    }
    out
}

/// The alternative objects of `options.anyOf`, in order. Empty when there is none.
pub fn any_of_alternatives(options: &Map<String, Value>) -> Vec<&Map<String, Value>> {
    options
        .get(ANY_OF)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
        .collect()
}

/// Whether `options` uses an any-of: the `anyOf` key or a `state` element `{ "anyOf": [...] }`.
pub fn uses_any_of(options: &Map<String, Value>) -> bool {
    options.contains_key(ANY_OF)
        || options
            .get("state")
            .and_then(Value::as_array)
            .is_some_and(|a| a.iter().any(|e| state_alternatives(e).is_some()))
}

/// The states of each element of `options.state`, one list per element: a state string is a
/// list of one, an `{ "anyOf": [...] }` element lists its members.
pub fn state_elements(options: &Map<String, Value>) -> Vec<Vec<String>> {
    options
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .map(|e| match e.as_str() {
            Some(s) => vec![s.to_string()],
            None => state_alternatives(e)
                .into_iter()
                .flatten()
                .filter_map(|v| v.as_str().map(String::from))
                .collect(),
        })
        .collect()
}

/// The component option names `options` pins, including the ones inside an any-of.
pub fn option_names(options: &Map<String, Value>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut push = |k: &String| {
        if !NOT_OPTIONS.contains(&k.as_str()) && !out.contains(k) {
            out.push(k.clone());
        }
    };
    options.keys().for_each(&mut push);
    for alt in options
        .get(ANY_OF)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
    {
        alt.keys().for_each(&mut push);
    }
    out
}

/// The identity fields a structured selector may name, as `(selector key, record pointer)`.
/// `contextRole` and `contextQualifier` are label inputs, not identity.
const IDENTITY_FIELDS: [(&str, &str); 3] = [
    ("attribute", "/scope/attribute"),
    ("part", "/scope/part"),
    ("between", "/scope/between"),
];

/// The record's identity as one line, `property / attribute / part / between`, with `-` for a field it
/// does not have. Two records with the same line are one identity.
pub fn relationship_identity(rec: &Value) -> String {
    let text = |p: &str| match rec.pointer(p) {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Object(o)) => format!(
            "{}>{}",
            o.get("from").and_then(Value::as_str).unwrap_or("*"),
            o.get("to").and_then(Value::as_str).unwrap_or("*")
        ),
        _ => "-".into(),
    };
    [
        "/scope/property",
        "/scope/attribute",
        "/scope/part",
        "/scope/between",
    ]
    .map(text)
    .join(" / ")
}

/// Whether a recipe relationship selector names `rec` apart from its `property`: the same
/// `context` when the selector has one, else the `part` and `between` the selector gives equal
/// the record's. A field the selector leaves out is not compared; SPEC-062 rejects a selector
/// that then names more than one identity.
pub fn selector_identity_matches(sel: &Value, rec: &Value) -> bool {
    if let Some(c) = sel.get("context").and_then(Value::as_str) {
        return rec.get("context").and_then(Value::as_str).map(str::trim) == Some(c.trim());
    }
    IDENTITY_FIELDS
        .iter()
        .all(|(k, p)| sel.get(k).is_none_or(|v| Some(v) == rec.pointer(p)))
}

/// [`selector_identity_matches`] and the same `scope.property`.
pub fn selector_matches(sel: &Value, rec: &Value) -> bool {
    sel.get("property").and_then(Value::as_str)
        == rec.pointer("/scope/property").and_then(Value::as_str)
        && selector_identity_matches(sel, rec)
}

/// Every state string `options.state` mentions, including the members of a state any-of.
pub fn mentioned_states(options: &Map<String, Value>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for e in options
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let members: Vec<&str> = match e.as_str() {
            Some(s) => vec![s],
            None => state_alternatives(e)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .collect(),
        };
        for m in members {
            if !out.iter().any(|x| x == m) {
                out.push(m.to_string());
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn obj(v: Value) -> Map<String, Value> {
        v.as_object().cloned().unwrap()
    }

    fn rec(options: Value) -> Value {
        json!({"scope": {"component": "x", "property": "y", "options": options}, "$ref": "t"})
    }

    #[test]
    fn a_selector_names_a_record_by_context_or_by_the_identity_fields_it_gives() {
        let rec = json!({
            "scope": {"component": "x", "property": "space-between", "part": "p",
                "between": {"from": "a", "to": "b"}},
            "context": "Spacing (a to b)"
        });
        let sel = |v: Value| selector_matches(&v, &rec);
        assert!(sel(
            json!({"property": "space-between", "context": " Spacing (a to b) "})
        ));
        assert!(sel(json!({"property": "space-between", "part": "p"})));
        assert!(sel(json!({"property": "space-between", "part": "p",
            "between": {"from": "a", "to": "b"}})));
        // A field the selector gives must match, and another property never matches.
        assert!(!sel(json!({"property": "space-between", "part": "q"})));
        assert!(!sel(
            json!({"property": "gap", "context": "Spacing (a to b)"})
        ));
        assert!(!sel(
            json!({"property": "space-between", "between": {"from": "a", "to": "c"}})
        ));
    }

    #[test]
    fn an_attribute_is_part_of_the_identity_and_the_match() {
        let rec = json!({"scope": {"component": "x", "property": "color", "attribute": "border",
            "part": "p"}, "$ref": "t"});
        assert_eq!(unsupported_shape(&rec), None);
        assert_eq!(relationship_identity(&rec), "color / border / p / -");
        assert!(selector_matches(
            &json!({"property": "color", "attribute": "border", "part": "p"}),
            &rec
        ));
        assert!(!selector_matches(
            &json!({"property": "color", "attribute": "background", "part": "p"}),
            &rec
        ));
        assert!(selector_matches(
            &json!({"property": "color", "part": "p"}),
            &rec
        ));
    }

    #[test]
    fn the_identity_line_names_each_field_or_a_dash() {
        let rec = json!({"scope": {"property": "size", "part": "handle"}});
        assert_eq!(relationship_identity(&rec), "size / - / handle / -");
        let gap = json!({"scope": {"property": "space-between", "between": {"from": "top", "to": "box"}}});
        assert_eq!(
            relationship_identity(&gap),
            "space-between / - / - / top>box"
        );
    }

    #[test]
    fn shapes_in_use_are_accepted() {
        for o in [
            json!({"size": "m", "isSelected": true, "scaleIndex": 100}),
            json!({"size": ["s", "m"], "isSelected": [false, true]}),
            json!({"state": ["selected", "hover"], "scale": "desktop"}),
            json!({}),
        ] {
            assert_eq!(unsupported_shape(&rec(o)), None);
        }
        assert_eq!(unsupported_shape(&json!({"value": 1})), None);
    }

    #[test]
    fn the_any_of_forms_are_accepted() {
        for o in [
            json!({"anyOf": [{"isSelected": true}, {"isIndeterminate": true}]}),
            json!({"isEmphasized": true, "anyOf": [{"isSelected": true}, {"isIndeterminate": true}]}),
            json!({"anyOf": [{"size": ["s", "m"], "isDisabled": true}, {"variant": "a"}]}),
            json!({"state": [{"anyOf": ["hover", "down"]}]}),
            json!({"state": ["selected", {"anyOf": ["hover", "down"]}]}),
        ] {
            assert_eq!(unsupported_shape(&rec(o.clone())), None, "{o}");
        }
    }

    #[test]
    fn malformed_any_of_is_refused() {
        for o in [
            json!({"anyOf": []}),
            json!({"anyOf": [{}]}),
            json!({"anyOf": ["isSelected"]}),
            json!({"anyOf": {"isSelected": true}}),
            json!({"anyOf": [{"anyOf": [{"a": 1}]}]}),
            json!({"anyOf": [{"state": ["hover"]}]}),
            json!({"anyOf": [{"scale": "desktop"}]}),
            json!({"anyOf": [{"size": {"min": 1}}]}),
            json!({"state": [{"anyOf": []}]}),
            json!({"state": [{"anyOf": [["hover"]]}]}),
            json!({"state": [{"anyOf": ["hover"], "extra": 1}]}),
            json!({"state": [["hover"]]}),
            json!({"state": [{"allOf": ["hover"]}]}),
        ] {
            let why = unsupported_shape(&rec(o.clone())).unwrap_or_else(|| panic!("{o}"));
            assert!(why.contains("upgrade the CLI"), "{o}: {why}");
        }
    }

    #[test]
    fn an_any_of_needs_a_ref() {
        let own_value = json!({"scope": {"component": "x", "property": "y",
            "options": {"anyOf": [{"a": true}, {"b": true}]}}, "value": "1px"});
        assert!(unsupported_shape(&own_value)
            .unwrap()
            .contains("its own value"));
    }

    #[test]
    fn too_many_variants_are_refused() {
        let alts: Vec<Value> = (0..9).map(|i| json!({ "o": i })).collect();
        let states: Vec<Value> = (0..9)
            .map(|_| json!({"anyOf": ["hover", "down", "focus"]}))
            .collect();
        let big = rec(json!({"anyOf": alts, "state": states}));
        assert!(unsupported_shape(&big).unwrap().contains("variants"));
    }

    #[test]
    fn a_plain_scope_is_one_variant() {
        let v = variants(&obj(json!({"size": "m", "state": ["hover"]})));
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].options, obj(json!({"size": "m"})));
        assert_eq!(v[0].states, vec!["hover".to_string()]);
    }

    #[test]
    fn an_option_any_of_is_one_variant_per_alternative() {
        let v = variants(&obj(json!({
            "isEmphasized": true,
            "anyOf": [{"isSelected": true}, {"isIndeterminate": true}]
        })));
        assert_eq!(v.len(), 2);
        assert_eq!(
            v[0].options,
            obj(json!({"isEmphasized": true, "isSelected": true}))
        );
        assert_eq!(
            v[1].options,
            obj(json!({"isEmphasized": true, "isIndeterminate": true}))
        );
    }

    #[test]
    fn a_state_any_of_composes_with_a_fixed_state() {
        let v = variants(&obj(
            json!({"state": ["selected", {"anyOf": ["hover", "down"]}]}),
        ));
        let states: Vec<Vec<String>> = v.iter().map(|x| x.states.clone()).collect();
        assert_eq!(
            states,
            vec![
                vec!["selected".to_string(), "hover".to_string()],
                vec!["selected".to_string(), "down".to_string()],
            ]
        );
    }

    #[test]
    fn a_repeated_state_counts_once() {
        let v = variants(&obj(
            json!({"state": ["down", {"anyOf": ["down", "hover"]}]}),
        ));
        let states: Vec<Vec<String>> = v.iter().map(|x| x.states.clone()).collect();
        assert_eq!(
            states,
            vec![
                vec!["down".to_string()],
                vec!["down".to_string(), "hover".to_string()]
            ]
        );
    }

    #[test]
    fn an_alternative_that_contradicts_a_base_pin_is_dropped() {
        let v = variants(&obj(json!({
            "isSelected": true,
            "anyOf": [{"isSelected": false}, {"isIndeterminate": true}]
        })));
        assert_eq!(v.len(), 1);
        assert_eq!(
            v[0].options,
            obj(json!({"isSelected": true, "isIndeterminate": true}))
        );
    }

    #[test]
    fn option_names_and_states_include_the_alternatives() {
        let o = obj(json!({
            "scale": "desktop", "size": "m",
            "anyOf": [{"isSelected": true}, {"isIndeterminate": true}],
            "state": ["selected", {"anyOf": ["hover", "down"]}]
        }));
        assert_eq!(
            option_names(&o),
            vec![
                "size".to_string(),
                "isSelected".into(),
                "isIndeterminate".into()
            ]
        );
        assert_eq!(
            mentioned_states(&o),
            vec!["selected".to_string(), "hover".into(), "down".into()]
        );
    }

    #[test]
    fn an_unknown_scope_field_is_refused() {
        let known =
            json!({"scope": {"component": "x", "part": "p", "property": "y", "options": {}}});
        assert_eq!(unsupported_shape(&known), None);
        for field in ["from", "to", "slot", "variant"] {
            let mut rec = known.clone();
            rec["scope"][field] = json!("x");
            let why = unsupported_shape(&rec).unwrap_or_else(|| panic!("{field}"));
            assert!(why.contains(&format!("scope.{field}")), "{why}");
            assert!(why.contains("newer than this engine"), "{why}");
        }
        // Without an options object the field is still seen.
        let bare = json!({"scope": {"component": "x", "property": "y", "slot": "a"}});
        assert!(unsupported_shape(&bare).unwrap().contains("scope.slot"));
    }

    #[test]
    fn descriptive_reads_both_places_and_the_new_one_wins() {
        let old = json!({"options": {"from": "top", "to": "control", "object": "a", "size": "m"}});
        let new = json!({"between": {"from": "top", "to": "control"}, "object": "a",
            "options": {"size": "m"}});
        let both = json!({"between": {"from": "top"}, "options": {"from": "edge", "to": "x"}});
        let (old, new, both) = (
            old.as_object().unwrap(),
            new.as_object().unwrap(),
            both.as_object().unwrap(),
        );
        assert_eq!(descriptive(old), descriptive(new));
        assert_eq!(options_with_descriptive(old), options_with_descriptive(new));
        assert_eq!(descriptive(both)["from"], "top");
        assert_eq!(descriptive(both)["to"], "x");
        // `size` is a condition, not a descriptive key.
        assert!(!descriptive(old).contains_key("size"));
    }

    #[test]
    fn descriptive_scope_fields_are_accepted_with_the_right_shape() {
        let rec = |extra: Value| {
            let mut r = json!({"scope": {"component": "x", "property": "y", "options": {}}});
            for (k, v) in extra.as_object().unwrap() {
                r["scope"][k] = v.clone();
            }
            r
        };
        for ok in [
            json!({"between": {"from": "top", "to": "text"}}),
            json!({"between": {"from": "top"}}),
            json!({"between": {"to": "text"}}),
            json!({"object": "background", "position": "top", "structure": "base"}),
            json!({"qualifier": "stacked", "icon": "chevron"}),
        ] {
            assert_eq!(unsupported_shape(&rec(ok.clone())), None, "{ok}");
        }
        for bad in [
            json!({"between": {}}),
            json!({"between": "top"}),
            json!({"between": {"from": "top", "via": "x"}}),
            json!({"between": {"from": 3}}),
            json!({"object": ""}),
            json!({"position": ["top"]}),
            json!({"icon": null}),
        ] {
            let why = unsupported_shape(&rec(bad.clone())).unwrap_or_else(|| panic!("{bad}"));
            assert!(why.contains("upgrade the CLI"), "{why}");
        }
    }

    #[test]
    fn an_alternative_narrows_an_array_pin_to_the_values_they_share() {
        let v = variants(&obj(json!({
            "size": ["s", "m"],
            "anyOf": [{"size": "m"}, {"size": "l"}, {"size": ["m", "l"]}]
        })));
        assert_eq!(v.len(), 1, "{v:?}");
        assert_eq!(v[0].options, obj(json!({"size": "m"})));
    }
}
