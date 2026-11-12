// Copyright 2026 Adobe. All rights reserved.
use design_data_core::value_resolution;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

use crate::error::js_err;

#[derive(Deserialize, Tsify)]
#[tsify(from_wasm_abi, hashmap_as_object)]
pub struct ValueResolutionRecord {
    id: String,
    source: String,
    raw: serde_json::Value,
}

#[derive(Deserialize, Tsify)]
#[tsify(from_wasm_abi)]
pub struct ValueResolutionMode {
    name: String,
    modes: Vec<String>,
    default: String,
}

#[derive(Deserialize, Tsify)]
#[tsify(from_wasm_abi, hashmap_as_object)]
#[serde(rename_all = "camelCase")]
pub struct ValueResolutionInput {
    records: Vec<ValueResolutionRecord>,
    mode_sets: Vec<ValueResolutionMode>,
}

#[derive(Deserialize, Tsify)]
#[tsify(from_wasm_abi, hashmap_as_object)]
#[serde(rename_all = "camelCase")]
pub struct ValueResolutionQuery {
    id: String,
    context: HashMap<String, String>,
    #[serde(default)]
    select_concept: bool,
}

#[derive(Deserialize, Tsify)]
#[tsify(from_wasm_abi, hashmap_as_object)]
#[serde(transparent)]
pub struct ValueResolutionQueries(Vec<ValueResolutionQuery>);

#[derive(Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, hashmap_as_object, missing_as_null)]
#[serde(rename_all = "camelCase")]
pub struct ValueResolutionResult {
    id: String,
    selected_id: Option<String>,
    label: Option<String>,
    context: HashMap<String, String>,
    value: Option<serde_json::Value>,
    chain: Vec<String>,
    issue: Option<String>,
}

#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi, hashmap_as_object, missing_as_null)]
#[serde(transparent)]
pub struct ValueResolutionResults(Vec<ValueResolutionResult>);

#[wasm_bindgen]
pub struct ValueResolver {
    resolver: value_resolution::ValueResolver,
}

#[wasm_bindgen]
impl ValueResolver {
    #[wasm_bindgen(constructor)]
    pub fn new(input: ValueResolutionInput) -> Self {
        Self {
            resolver: value_resolution::ValueResolver::new(
                input
                    .records
                    .into_iter()
                    .map(|record| value_resolution::Record {
                        id: record.id,
                        source: record.source,
                        raw: record.raw,
                    })
                    .collect(),
                input
                    .mode_sets
                    .into_iter()
                    .map(|mode| value_resolution::ModeDeclaration {
                        name: mode.name,
                        modes: mode.modes,
                        default: mode.default,
                    })
                    .collect(),
            ),
        }
    }

    #[wasm_bindgen(js_name = "resolveValues")]
    pub fn resolve_values(
        &self,
        queries: ValueResolutionQueries,
    ) -> Result<ValueResolutionResults, JsValue> {
        let rows = self.resolver.resolve(
            queries
                .0
                .into_iter()
                .map(|query| value_resolution::Query {
                    id: query.id,
                    context: query.context,
                    select_concept: query.select_concept,
                })
                .collect(),
        );
        let rows = rows
            .into_iter()
            .map(serde_json::from_value)
            .collect::<Result<Vec<ValueResolutionResult>, _>>()
            .map_err(js_err)?;
        Ok(ValueResolutionResults(rows))
    }
}
