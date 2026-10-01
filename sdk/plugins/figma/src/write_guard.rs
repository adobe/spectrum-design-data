// Copyright 2026 Adobe. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

//! Raw-snapshot safeguards for the CREATE/UPDATE-only export payload.

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use serde::Serialize;
use serde_json::{Map, Value};

// Observed Figma storage noise is below 1e-6. This tolerance applies only to
// emitted scalar/color values, never to concurrency checks or untouched state.
pub const DEFAULT_NUMERIC_TOLERANCE: f64 = 1e-6;
const RAW_NUMBER: &str = "$figmaWriteGuardRawNumber";

/// Lossless guard representation: numeric leaves retain their original JSON
/// text. Unlike serde_json's workspace-wide arbitrary_precision feature, this
/// does not change serialization of the SDK's MessagePack/WASM caches.
pub fn parse_raw_snapshot(bytes: &[u8]) -> Result<Value, GuardError> {
    #[derive(serde::Deserialize)]
    struct Response {
        status: u16,
        error: bool,
        meta: Box<serde_json::value::RawValue>,
    }
    let response: Response = serde_json::from_slice(bytes)
        .map_err(|_| error("invalid snapshot", "malformed variables/local response"))?;
    if response.status != 200 || response.error {
        return Err(error(
            "invalid snapshot",
            "variables/local did not confirm success",
        ));
    }
    Ok(serde_json::json!({
        "status": response.status,
        "error": response.error,
        "meta": retain_numbers(&response.meta)?,
    }))
}

fn retain_numbers(raw: &serde_json::value::RawValue) -> Result<Value, GuardError> {
    let text = raw.get().trim();
    let invalid = || error("invalid snapshot", "malformed JSON metadata");
    match text.as_bytes().first() {
        Some(b'{') => {
            let fields: BTreeMap<String, Box<serde_json::value::RawValue>> =
                serde_json::from_str(text).map_err(|_| invalid())?;
            // Reserve the internal marker so an API object cannot masquerade as
            // a scalar and accidentally pass numeric verification.
            if fields.contains_key(RAW_NUMBER) {
                return Err(error(
                    "invalid snapshot",
                    "reserved raw-number marker in API metadata",
                ));
            }
            fields
                .into_iter()
                .map(|(key, value)| Ok((key, retain_numbers(&value)?)))
                .collect::<Result<Map<String, Value>, GuardError>>()
                .map(Value::Object)
        }
        Some(b'[') => {
            let values: Vec<Box<serde_json::value::RawValue>> =
                serde_json::from_str(text).map_err(|_| invalid())?;
            values
                .iter()
                .map(|value| retain_numbers(value))
                .collect::<Result<Vec<_>, _>>()
                .map(Value::Array)
        }
        Some(b'-' | b'0'..=b'9') => Ok(serde_json::json!({RAW_NUMBER: text})),
        _ => serde_json::from_str(text).map_err(|_| invalid()),
    }
}

#[derive(Debug, thiserror::Error)]
#[error("{stage}: {details}")]
pub struct GuardError {
    pub stage: &'static str,
    pub details: String,
}

fn error(stage: &'static str, details: impl Into<String>) -> GuardError {
    GuardError {
        stage,
        details: details.into(),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationReport {
    pub verified: bool,
    pub creates: usize,
    pub updates: usize,
    pub mode_values: usize,
    pub alias_values: usize,
    pub unrelated_variables_unchanged: usize,
    pub maximum_numeric_error: f64,
    pub numeric_tolerance: f64,
}

fn object<'a>(value: &'a Value, context: &str) -> Result<&'a Map<String, Value>, GuardError> {
    value.as_object().ok_or_else(|| {
        error(
            "invalid snapshot/payload",
            format!("{context} must be an object"),
        )
    })
}

fn string<'a>(value: &'a Value, field: &str) -> Result<&'a str, GuardError> {
    value[field]
        .as_str()
        .ok_or_else(|| error("invalid payload", format!("{field} must be a string")))
}

fn actions<'a>(body: &'a Value, field: &str) -> Result<&'a [Value], GuardError> {
    match body.get(field) {
        None => Ok(&[]),
        Some(Value::Array(values)) => Ok(values),
        _ => Err(error(
            "invalid payload",
            format!("{field} must be an array"),
        )),
    }
}

fn snapshot(raw: &Value) -> Result<&Value, GuardError> {
    let meta = raw
        .get("meta")
        .ok_or_else(|| error("invalid snapshot", "missing meta"))?;
    let variables = object(&meta["variables"], "meta.variables")?;
    for (id, variable) in variables {
        object(variable, "variable")?;
        object(&variable["valuesByMode"], "valuesByMode")?;
        if variable["id"] != *id || !variable["variableCollectionId"].is_string() {
            return Err(error(
                "invalid snapshot",
                format!("invalid variable identity {id}"),
            ));
        }
    }
    let collections = object(&meta["variableCollections"], "meta.variableCollections")?;
    for collection in collections.values() {
        object(collection, "collection")?;
        if !collection["modes"].is_array()
            || !collection["variableIds"].is_array()
            || collection["variableIds"]
                .as_array()
                .is_some_and(|ids| ids.iter().any(|id| !id.is_string()))
        {
            return Err(error(
                "invalid snapshot",
                "missing collection modes or variableIds",
            ));
        }
    }
    Ok(meta)
}

/// Normalize only unstable collection membership ordering, retaining duplicates.
pub fn normalize_membership(meta: &Value) -> Value {
    let mut normalized = meta.clone();
    if let Some(collections) = normalized["variableCollections"].as_object_mut() {
        for collection in collections.values_mut() {
            if let Some(ids) = collection["variableIds"].as_array_mut() {
                ids.sort_by_key(Value::to_string);
            }
        }
    }
    normalized
}

// Paths, not values: diagnostics never echo raw API content or credentials.
fn differences(expected: &Value, actual: &Value, path: &str, output: &mut Vec<String>) {
    if expected == actual || output.len() >= 20 {
        return;
    }
    match (expected, actual) {
        (Value::Object(left), Value::Object(right)) => {
            let keys: BTreeSet<_> = left.keys().chain(right.keys()).collect();
            for key in keys {
                let next = format!("{path}/{key}");
                match (left.get(key), right.get(key)) {
                    (Some(a), Some(b)) => differences(a, b, &next, output),
                    _ if output.len() < 20 => output.push(next),
                    _ => {}
                }
            }
        }
        _ => output.push(path.to_string()),
    }
}

pub fn check_concurrent_change(baseline: &Value, current: &Value) -> Result<(), GuardError> {
    let expected = normalize_membership(snapshot(baseline)?);
    let actual = normalize_membership(snapshot(current)?);
    let mut paths = Vec::new();
    differences(&expected, &actual, "meta", &mut paths);
    if paths.is_empty() {
        Ok(())
    } else {
        Err(error(
            "concurrent Figma changes",
            format!("changed paths (up to 20): {}", paths.join(", ")),
        ))
    }
}

pub fn validate_tolerance(tolerance: f64) -> Result<(), GuardError> {
    if !tolerance.is_finite() || tolerance < 0.0 {
        return Err(error(
            "invalid numeric tolerance",
            "must be finite and nonnegative",
        ));
    }
    Ok(())
}

/// Fail closed if a future exporter introduces collection/mode mutations.
pub fn validate_payload(baseline: &Value, payload: &Value) -> Result<(), GuardError> {
    object(payload, "payload")?;
    let meta = snapshot(baseline)?;
    if !actions(payload, "variableCollections")?.is_empty()
        || !actions(payload, "variableModes")?.is_empty()
    {
        return Err(error(
            "unsupported payload",
            "collection/mode mutations cannot be verified",
        ));
    }
    let existing = object(&meta["variables"], "variables")?;
    let collections = object(&meta["variableCollections"], "collections")?;
    let mut ids = HashSet::new();
    let mut variable_collections = HashMap::new();
    for variable in actions(payload, "variables")? {
        let id = string(variable, "id")?;
        if !ids.insert(id) {
            return Err(error(
                "invalid payload",
                format!("duplicate variable ID {id}"),
            ));
        }
        match string(variable, "action")? {
            "UPDATE" if existing.contains_key(id) => {}
            "CREATE" if !existing.contains_key(id) => {}
            _ => {
                return Err(error(
                    "invalid payload",
                    format!("invalid action/target for {id}"),
                ))
            }
        }
        let collection_id = string(variable, "variableCollectionId")?;
        if !collections.contains_key(collection_id) {
            return Err(error(
                "invalid payload",
                format!("missing collection {collection_id}"),
            ));
        }
        if variable["action"] == "UPDATE"
            && existing[id]["variableCollectionId"] != variable["variableCollectionId"]
        {
            return Err(error(
                "invalid payload",
                format!("UPDATE moves variable {id}"),
            ));
        }
        variable_collections.insert(id, collection_id);
    }
    let mut mode_keys = HashSet::new();
    for mode_value in actions(payload, "variableModeValues")? {
        let id = string(mode_value, "variableId")?;
        let mode_id = string(mode_value, "modeId")?;
        let collection_id = variable_collections
            .get(id)
            .copied()
            .or_else(|| existing.get(id)?.get("variableCollectionId")?.as_str())
            .ok_or_else(|| error("invalid payload", format!("missing variable {id}")))?;
        if !mode_keys.insert((id, mode_id))
            || !collections[collection_id]["modes"]
                .as_array()
                .expect("snapshot checked")
                .iter()
                .any(|mode| mode["modeId"] == mode_id)
        {
            return Err(error(
                "invalid payload",
                format!("invalid/duplicate mode {id}/{mode_id}"),
            ));
        }
        let value = mode_value
            .get("value")
            .ok_or_else(|| error("invalid payload", "missing mode value"))?;
        if value["type"] == "VARIABLE_ALIAS" {
            let target = string(value, "id")?;
            if !ids.contains(target) && !existing.contains_key(target) {
                return Err(error(
                    "invalid payload",
                    format!("dangling alias target {target}"),
                ));
            }
        }
    }
    Ok(())
}

pub fn remap_temp_ids(
    payload: &Value,
    mapping: &HashMap<String, String>,
    baseline: &Value,
) -> Result<Value, GuardError> {
    validate_payload(baseline, payload)?;
    let existing = object(&snapshot(baseline)?["variables"], "variables")?;
    let creates: HashSet<_> = actions(payload, "variables")?
        .iter()
        .filter(|v| v["action"] == "CREATE")
        .map(|v| string(v, "id"))
        .collect::<Result<_, _>>()?;
    if creates != mapping.keys().map(String::as_str).collect()
        || mapping.values().collect::<HashSet<_>>().len() != mapping.len()
        || mapping
            .values()
            .any(|id| id.is_empty() || existing.contains_key(id))
    {
        return Err(error(
            "readback verification failed",
            "missing, extra, colliding or duplicate temp-ID mappings",
        ));
    }
    let resolve = |id: &str| mapping.get(id).cloned().unwrap_or_else(|| id.to_string());
    let mut remapped = payload.clone();
    if let Some(variables) = remapped["variables"].as_array_mut() {
        for variable in variables {
            variable["id"] = Value::String(resolve(string(variable, "id")?));
        }
    }
    if let Some(values) = remapped["variableModeValues"].as_array_mut() {
        for value in values {
            value["variableId"] = Value::String(resolve(string(value, "variableId")?));
            if value["value"]["type"] == "VARIABLE_ALIAS" {
                value["value"]["id"] = Value::String(resolve(string(&value["value"], "id")?));
            }
        }
    }
    Ok(remapped)
}

fn equal_value(expected: &Value, actual: &Value, tolerance: f64, maximum: &mut f64) -> bool {
    let number = |value: &Value| {
        value.as_f64().or_else(|| {
            value
                .as_object()
                .filter(|fields| fields.len() == 1)?
                .get(RAW_NUMBER)?
                .as_str()?
                .parse::<f64>()
                .ok()
        })
    };
    if let (Some(a), Some(b)) = (number(expected), number(actual)) {
        let delta = (a - b).abs();
        *maximum = maximum.max(delta);
        return delta.is_finite() && delta <= tolerance;
    }
    match (expected, actual) {
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter().all(|(key, value)| {
                    b.get(key)
                        .is_some_and(|other| equal_value(value, other, tolerance, maximum))
                })
        }
        _ => expected == actual,
    }
}

pub fn verify_readback(
    baseline: &Value,
    after: &Value,
    payload: &Value,
    mapping: &HashMap<String, String>,
    tolerance: f64,
) -> Result<VerificationReport, GuardError> {
    validate_tolerance(tolerance)?;
    let body = remap_temp_ids(payload, mapping, baseline)?;
    let mut expected = normalize_membership(snapshot(baseline)?);
    let mut actual = normalize_membership(snapshot(after)?);
    let after_variables = object(&actual["variables"], "variables")?.clone();
    let mut touched = HashSet::new();
    let mut creates = 0;
    let mut updates = 0;
    for variable in actions(&body, "variables")? {
        let id = string(variable, "id")?;
        touched.insert(id);
        let live = after_variables.get(id).ok_or_else(|| {
            error(
                "readback verification failed",
                format!("missing variable {id}"),
            )
        })?;
        object(live, "readback variable")?;
        if live["id"] != id {
            return Err(error(
                "readback verification failed",
                format!("target ID mismatch {id}"),
            ));
        }
        if variable["action"] == "CREATE" {
            creates += 1;
            // Only server-generated metadata is taken from readback. All emitted
            // fields and mode values below remain independently expected.
            expected["variables"][id] = live.clone();
            expected["variables"][id]["valuesByMode"] = Value::Object(Map::new());
            let collection_id = string(variable, "variableCollectionId")?;
            expected["variableCollections"][collection_id]["variableIds"]
                .as_array_mut()
                .expect("snapshot checked")
                .push(Value::String(id.to_string()));
        } else {
            updates += 1;
        }
        for (field, value) in object(variable, "variable action")? {
            if field != "action" {
                expected["variables"][id][field] = value.clone();
            }
        }
    }
    let mut maximum_numeric_error = 0.0_f64;
    let mut alias_values = 0;
    for mode_value in actions(&body, "variableModeValues")? {
        let id = string(mode_value, "variableId")?;
        let mode_id = string(mode_value, "modeId")?;
        touched.insert(id);
        let value = &mode_value["value"];
        if value["type"] == "VARIABLE_ALIAS" {
            alias_values += 1;
            let target = string(value, "id")?;
            if !after_variables.contains_key(target) || after_variables[target]["id"] != target {
                return Err(error(
                    "readback verification failed",
                    format!("missing alias target {target}"),
                ));
            }
        }
        let live = after_variables
            .get(id)
            .and_then(|v| v.get("valuesByMode"))
            .and_then(|v| v.get(mode_id))
            .ok_or_else(|| {
                error(
                    "readback verification failed",
                    format!("missing mode value {id}/{mode_id}"),
                )
            })?;
        if !equal_value(value, live, tolerance, &mut maximum_numeric_error) {
            return Err(error(
                "readback verification failed",
                format!("mode value mismatch {id}/{mode_id}"),
            ));
        }
        expected["variables"][id]["valuesByMode"][mode_id] = value.clone();
        // Tolerant comparison is restricted to values explicitly written.
        actual["variables"][id]["valuesByMode"][mode_id] = value.clone();
    }
    expected = normalize_membership(&expected);
    let mut paths = Vec::new();
    differences(&expected, &actual, "meta", &mut paths);
    if !paths.is_empty() {
        return Err(error(
            "readback verification failed",
            format!("mismatched paths (up to 20): {}", paths.join(", ")),
        ));
    }
    Ok(VerificationReport {
        verified: true,
        creates,
        updates,
        mode_values: actions(&body, "variableModeValues")?.len(),
        alias_values,
        unrelated_variables_unchanged: after_variables.len() - touched.len(),
        maximum_numeric_error,
        numeric_tolerance: tolerance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn fixture() -> (Value, Value, HashMap<String, String>, Value) {
        let baseline = json!({"status":200,"error":false,"meta":{
            "variables":{
                "n":{"id":"n","name":"number","key":"kn","variableCollectionId":"scale",
                    "resolvedType":"FLOAT","valuesByMode":{"desktop":1.3,"mobile":7},
                    "description":"old","remote":false,"hiddenFromPublishing":false,"scopes":[],"codeSyntax":{"WEB":"old"}},
                "a":{"id":"a","name":"alias","key":"ka","variableCollectionId":"scale",
                    "resolvedType":"FLOAT","valuesByMode":{"desktop":{"type":"VARIABLE_ALIAS","id":"n"}}},
                "color":{"id":"color","name":"color","key":"kc","variableCollectionId":"scale",
                    "resolvedType":"COLOR","valuesByMode":{"desktop":{"r":0.1,"g":0.2,"b":0.3,"a":1}}},
                "old":{"id":"old","name":"deprecated","key":"ko","variableCollectionId":"scale",
                    "resolvedType":"FLOAT","description":"deprecated","valuesByMode":{"desktop":99}}
            },
            "variableCollections":{"scale":{"id":"scale","name":".Platform scale","key":"ks",
                "isExtension":false,"remote":false,"hiddenFromPublishing":false,
                "modes":[{"modeId":"desktop","name":"Desktop"},{"modeId":"mobile","name":"Mobile"}],
                "defaultModeId":"desktop","variableIds":["n","a","color","old"]}}
        }});
        let payload = json!({
            "variables":[
                {"action":"UPDATE","id":"n","name":"number","variableCollectionId":"scale","resolvedType":"FLOAT",
                    "description":"new","hiddenFromPublishing":true,"scopes":["ALL_SCOPES"],"codeSyntax":{"WEB":"--number"}},
                {"action":"CREATE","id":"tmp","name":"mode-set-target","variableCollectionId":"scale","resolvedType":"FLOAT"},
                {"action":"UPDATE","id":"a","name":"alias","variableCollectionId":"scale","resolvedType":"FLOAT"},
                {"action":"UPDATE","id":"color","name":"color","variableCollectionId":"scale","resolvedType":"COLOR"}
            ],
            "variableModeValues":[
                {"variableId":"n","modeId":"desktop","value":1.7},
                {"variableId":"tmp","modeId":"desktop","value":{"type":"VARIABLE_ALIAS","id":"n"}},
                {"variableId":"a","modeId":"desktop","value":{"type":"VARIABLE_ALIAS","id":"tmp"}},
                {"variableId":"color","modeId":"desktop","value":{"r":0.2,"g":0.3,"b":0.4,"a":1}}
            ]
        });
        let mapping = HashMap::from([("tmp".to_string(), "real".to_string())]);
        let mut after = baseline.clone();
        let remapped = remap_temp_ids(&payload, &mapping, &baseline).unwrap();
        after["meta"]["variables"]["real"] = json!({
            "id":"real","key":"generated","remote":false,"valuesByMode":{}
        });
        for variable in remapped["variables"].as_array().unwrap() {
            let id = variable["id"].as_str().unwrap();
            for (field, value) in variable.as_object().unwrap() {
                if field != "action" {
                    after["meta"]["variables"][id][field] = value.clone();
                }
            }
        }
        for value in remapped["variableModeValues"].as_array().unwrap() {
            let id = value["variableId"].as_str().unwrap();
            let mode = value["modeId"].as_str().unwrap();
            after["meta"]["variables"][id]["valuesByMode"][mode] = value["value"].clone();
        }
        after["meta"]["variableCollections"]["scale"]["variableIds"]
            .as_array_mut()
            .unwrap()
            .push(json!("real"));
        (baseline, payload, mapping, after)
    }

    #[test]
    fn create_update_chain_and_unrelated_state_verify() {
        let (baseline, payload, mapping, after) = fixture();
        let report = verify_readback(
            &baseline,
            &after,
            &payload,
            &mapping,
            DEFAULT_NUMERIC_TOLERANCE,
        )
        .unwrap();
        assert_eq!(
            (report.creates, report.updates, report.alias_values),
            (1, 3, 2)
        );
        assert_eq!(report.unrelated_variables_unchanged, 1);
        assert_eq!(
            after["meta"]["variables"]["a"]["valuesByMode"]["desktop"]["id"],
            "real"
        );
    }

    #[test]
    fn concurrent_drift_checks_all_metadata_and_mode_order() {
        let (baseline, _, _, _) = fixture();
        for path in [
            "/meta/variables/n/name",
            "/meta/variables/n/key",
            "/meta/variables/n/valuesByMode/desktop",
            "/meta/variables/n/description",
            "/meta/variables/n/remote",
            "/meta/variables/n/scopes",
            "/meta/variables/n/codeSyntax",
            "/meta/variables/n/hiddenFromPublishing",
            "/meta/variableCollections/scale/isExtension",
            "/meta/variableCollections/scale/modes",
            "/meta/variableCollections/scale/defaultModeId",
            "/meta/variableCollections/scale/key",
            "/meta/variableCollections/scale/variableIds",
        ] {
            let mut changed = baseline.clone();
            *changed.pointer_mut(path).unwrap() = json!("changed");
            assert!(
                check_concurrent_change(&baseline, &changed).is_err(),
                "{path}"
            );
        }
        let mut changed = baseline.clone();
        changed["meta"]["variableCollections"]["scale"]["modes"]
            .as_array_mut()
            .unwrap()
            .reverse();
        assert!(check_concurrent_change(&baseline, &changed).is_err());
        let mut changed = baseline.clone();
        changed["meta"]["variables"]
            .as_object_mut()
            .unwrap()
            .remove("old");
        assert!(check_concurrent_change(&baseline, &changed).is_err());
        let mut changed = baseline.clone();
        changed["meta"]["variables"]["extra"] = changed["meta"]["variables"]["old"].clone();
        changed["meta"]["variables"]["extra"]["id"] = json!("extra");
        assert!(check_concurrent_change(&baseline, &changed).is_err());
    }

    #[test]
    fn membership_order_is_the_only_normalization() {
        let (baseline, payload, mapping, mut after) = fixture();
        let mut reordered = baseline.clone();
        reordered["meta"]["variableCollections"]["scale"]["variableIds"]
            .as_array_mut()
            .unwrap()
            .reverse();
        check_concurrent_change(&baseline, &reordered).unwrap();
        after["meta"]["variableCollections"]["scale"]["variableIds"]
            .as_array_mut()
            .unwrap()
            .reverse();
        verify_readback(&baseline, &after, &payload, &mapping, 0.0).unwrap();
    }

    #[test]
    fn raw_numbers_do_not_round_away_concurrent_drift() {
        let (baseline, _, _, _) = fixture();
        let text = baseline.to_string();
        let baseline =
            parse_raw_snapshot(text.replace("1.3", "0.123456789012345678901").as_bytes()).unwrap();
        let changed =
            parse_raw_snapshot(text.replace("1.3", "0.123456789012345678902").as_bytes()).unwrap();
        assert!(check_concurrent_change(&baseline, &changed).is_err());
    }

    #[test]
    fn raw_snapshots_verify_without_affecting_normal_json_serialization() {
        let (baseline, payload, mapping, after) = fixture();
        let baseline = parse_raw_snapshot(&serde_json::to_vec(&baseline).unwrap()).unwrap();
        let after = parse_raw_snapshot(&serde_json::to_vec(&after).unwrap()).unwrap();
        verify_readback(
            &baseline,
            &after,
            &payload,
            &mapping,
            DEFAULT_NUMERIC_TOLERANCE,
        )
        .unwrap();
        assert_eq!(
            serde_json::to_string(&serde_json::json!(1.3)).unwrap(),
            "1.3"
        );
        let malicious = serde_json::json!({"status":200,"error":false,"meta":{RAW_NUMBER:"1.3"}});
        assert!(parse_raw_snapshot(&serde_json::to_vec(&malicious).unwrap()).is_err());
    }

    #[test]
    fn tolerance_is_absolute_and_only_applies_to_written_values() {
        let (baseline, payload, mapping, after) = fixture();
        for path in [
            "/meta/variables/n/valuesByMode/desktop",
            "/meta/variables/color/valuesByMode/desktop/r",
        ] {
            let mut near = after.clone();
            let value = near.pointer(path).unwrap().as_f64().unwrap();
            *near.pointer_mut(path).unwrap() = json!(value + 0.0000005);
            let report = verify_readback(
                &baseline,
                &near,
                &payload,
                &mapping,
                DEFAULT_NUMERIC_TOLERANCE,
            )
            .unwrap();
            assert!(report.maximum_numeric_error > 0.0);
            assert!(verify_readback(&baseline, &near, &payload, &mapping, 0.0).is_err());
            *near.pointer_mut(path).unwrap() = json!(value + 0.000002);
            assert!(verify_readback(
                &baseline,
                &near,
                &payload,
                &mapping,
                DEFAULT_NUMERIC_TOLERANCE
            )
            .is_err());
        }
        for path in [
            "/meta/variables/n/valuesByMode/mobile",
            "/meta/variables/old/valuesByMode/desktop",
        ] {
            let mut near = after.clone();
            *near.pointer_mut(path).unwrap() =
                json!(near.pointer(path).unwrap().as_f64().unwrap() + 0.0000001);
            assert!(verify_readback(&baseline, &near, &payload, &mapping, 1.0).is_err());
        }
        let mut wrong_type = after.clone();
        wrong_type["meta"]["variables"]["n"]["valuesByMode"]["desktop"] = json!(true);
        assert!(verify_readback(&baseline, &wrong_type, &payload, &mapping, 10.0).is_err());
    }

    #[test]
    fn readback_detects_missing_targets_and_unexpected_changes() {
        let (baseline, payload, mapping, after) = fixture();
        for path in [
            "/meta/variables/n/key",
            "/meta/variables/n/name",
            "/meta/variables/n/codeSyntax",
            "/meta/variables/n/scopes",
            "/meta/variables/n/description",
            "/meta/variables/n/hiddenFromPublishing",
            "/meta/variables/old/description",
            "/meta/variableCollections/scale/isExtension",
            "/meta/variableCollections/scale/modes",
            "/meta/variables/a/valuesByMode/desktop/id",
        ] {
            let mut changed = after.clone();
            *changed.pointer_mut(path).unwrap() = json!("unexpected");
            assert!(
                verify_readback(&baseline, &changed, &payload, &mapping, 1e-6).is_err(),
                "{path}"
            );
        }
        for id in ["n", "real", "old"] {
            let mut missing = after.clone();
            missing["meta"]["variables"]
                .as_object_mut()
                .unwrap()
                .remove(id);
            assert!(verify_readback(&baseline, &missing, &payload, &mapping, 1e-6).is_err());
        }
        let mut changed = after.clone();
        changed["meta"]["variables"]["real"]["valuesByMode"]["mobile"] = json!(0);
        assert!(verify_readback(&baseline, &changed, &payload, &mapping, 1e-6).is_err());
    }

    #[test]
    fn invalid_mappings_and_payloads_fail_closed() {
        let (baseline, payload, _, after) = fixture();
        for mapping in [
            HashMap::new(),
            HashMap::from([("tmp".into(), "n".into())]),
            HashMap::from([
                ("tmp".into(), "real".into()),
                ("unknown".into(), "extra".into()),
            ]),
        ] {
            assert!(verify_readback(&baseline, &after, &payload, &mapping, 1e-6).is_err());
        }
        let mut dangling = payload.clone();
        dangling["variableModeValues"][1]["value"]["id"] = json!("missing");
        assert!(validate_payload(&baseline, &dangling).is_err());
        for field in ["variableCollections", "variableModes"] {
            let mut unsupported = payload.clone();
            unsupported[field] = json!([{"action":"DELETE"}]);
            assert!(validate_payload(&baseline, &unsupported).is_err());
        }
        for value in [f64::NAN, f64::INFINITY, -1.0] {
            assert!(validate_tolerance(value).is_err());
        }
    }
}
