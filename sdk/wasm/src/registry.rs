// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Registry vocabulary helpers.
//!
//! Two surfaces:
//! 1. **Embedded registry** — fast lookup backed by the compile-time-embedded
//!    `RegistryData::embedded()`. Useful when you only need IDs or membership checks.
//! 2. **JSON-object helpers** — accept a [`RegistryObject`] (the shape of the JSON files
//!    in `@adobe/spectrum-design-data/registry/*.json`) and return rich value objects.
//!    These mirror the deprecated `@adobe/design-system-registry` helper API.

use std::sync::OnceLock;

use design_data_core::registry::RegistryData;
use wasm_bindgen::prelude::*;

use crate::error::js_err;
use crate::types::{RegistryEntry, RegistryObject};

// ---------------------------------------------------------------------------
// Embedded registry (compile-time)
// ---------------------------------------------------------------------------

static REGISTRY: OnceLock<RegistryData> = OnceLock::new();

fn registry() -> &'static RegistryData {
    REGISTRY.get_or_init(RegistryData::embedded)
}

/// Return all IDs (and aliases) registered for a given field name.
///
/// `fieldName` should be the canonical field key as used in token `name` objects —
/// e.g. `"property"`, `"component"`, `"variant"`, `"state"`.
///
/// Returns `undefined` if the field is not in the embedded registry.
#[wasm_bindgen(js_name = "getFieldValues")]
pub fn get_field_values(field_name: &str) -> Option<Vec<String>> {
    registry()
        .for_field(field_name)
        .map(|set| set.iter().cloned().collect())
}

/// Return `true` if `value` (an ID or alias) is registered for `fieldName`.
#[wasm_bindgen(js_name = "hasFieldValue")]
pub fn has_field_value(field_name: &str, value: &str) -> bool {
    registry()
        .for_field(field_name)
        .map(|set| set.contains(value))
        .unwrap_or(false)
}

/// Return the list of advisory field names (fields whose values are informational,
/// not normative — e.g. `"variant"`, `"state"`).
#[wasm_bindgen(js_name = "getAdvisoryFields")]
pub fn get_advisory_fields() -> Vec<String> {
    registry()
        .advisory_fields()
        .iter()
        .map(|s| s.to_string())
        .collect()
}

/// Return the list of field names that can be used as filter keys in query
/// expressions (e.g. `"property"`, `"component"`, `"$schema"`).
///
/// This is the canonical set maintained in `design_data_core::query::ALLOWED_KEYS`,
/// exposed here so callers do not need to hard-code it.
#[wasm_bindgen(js_name = "getIndexedFields")]
pub fn get_indexed_fields() -> Vec<String> {
    design_data_core::query::indexed_fields()
        .iter()
        .map(|s| s.to_string())
        .collect()
}

// ---------------------------------------------------------------------------
// JSON-object helpers (mirror @adobe/design-system-registry contract)
//
// These accept a RegistryObject (the { values: [...] } JSON shape) and return
// rich value objects — the same API as the deprecated JS shim.
// ---------------------------------------------------------------------------

/// Return all value IDs from a registry vocabulary object.
///
/// Equivalent to `@adobe/design-system-registry`'s `getValues(registry)`.
#[wasm_bindgen(js_name = "getValues")]
pub fn get_values(registry: JsValue) -> Result<Vec<String>, JsValue> {
    let obj: RegistryObject = serde_wasm_bindgen::from_value(registry).map_err(js_err)?;
    Ok(obj.values.into_iter().map(|v| v.id).collect())
}

/// Find a registry entry by its ID or one of its aliases.
///
/// Returns `undefined` if not found.
/// Equivalent to `@adobe/design-system-registry`'s `findValue(registry, searchTerm)`.
#[wasm_bindgen(js_name = "findValue")]
pub fn find_value(registry: JsValue, search_term: &str) -> Result<JsValue, JsValue> {
    let obj: RegistryObject = serde_wasm_bindgen::from_value(registry).map_err(js_err)?;
    let found = obj.values.into_iter().find(|v| {
        v.id == search_term
            || v.aliases
                .as_ref()
                .map(|aliases| aliases.iter().any(|a| a == search_term))
                .unwrap_or(false)
    });
    match found {
        Some(entry) => serde_wasm_bindgen::to_value(&entry).map_err(js_err),
        None => Ok(JsValue::UNDEFINED),
    }
}

/// Return `true` if `searchTerm` matches any value ID or alias in the registry.
///
/// Equivalent to `@adobe/design-system-registry`'s `hasValue(registry, searchTerm)`.
#[wasm_bindgen(js_name = "hasValue")]
pub fn has_value(registry: JsValue, search_term: &str) -> Result<bool, JsValue> {
    let obj: RegistryObject = serde_wasm_bindgen::from_value(registry).map_err(js_err)?;
    let found = obj.values.iter().any(|v| {
        v.id == search_term
            || v.aliases
                .as_ref()
                .map(|aliases| aliases.iter().any(|a| a == search_term))
                .unwrap_or(false)
    });
    Ok(found)
}

/// Return the default value entry, or `undefined` if none is marked as default.
///
/// Equivalent to `@adobe/design-system-registry`'s `getDefault(registry)`.
#[wasm_bindgen(js_name = "getDefault")]
pub fn get_default(registry: JsValue) -> Result<JsValue, JsValue> {
    let obj: RegistryObject = serde_wasm_bindgen::from_value(registry).map_err(js_err)?;
    let found = obj.values.into_iter().find(|v| v.default == Some(true));
    match found {
        Some(entry) => serde_wasm_bindgen::to_value(&entry).map_err(js_err),
        None => Ok(JsValue::UNDEFINED),
    }
}

/// Return all non-deprecated value entries.
///
/// Equivalent to `@adobe/design-system-registry`'s `getActiveValues(registry)`.
#[wasm_bindgen(js_name = "getActiveValues")]
pub fn get_active_values(registry: JsValue) -> Result<JsValue, JsValue> {
    let obj: RegistryObject = serde_wasm_bindgen::from_value(registry).map_err(js_err)?;
    let active: Vec<RegistryEntry> = obj
        .values
        .into_iter()
        .filter(|v| v.deprecated != Some(true))
        .collect();
    serde_wasm_bindgen::to_value(&active).map_err(js_err)
}
