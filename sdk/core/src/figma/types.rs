// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Serde types for the Figma Variables REST API.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

// ── GET /v1/files/:file_key/variables/local ──────────────────────────────────

/// Top-level response from `GET /v1/files/:file_key/variables/local`.
#[derive(Debug, Deserialize)]
pub struct GetVariablesResponse {
    pub status: u16,
    pub error: bool,
    pub meta: VariablesMeta,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariablesMeta {
    pub variables: HashMap<String, FigmaVariable>,
    pub variable_collections: HashMap<String, FigmaVariableCollection>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FigmaVariable {
    pub id: String,
    pub name: String,
    pub key: String,
    pub variable_collection_id: String,
    pub resolved_type: String,
    pub values_by_mode: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub remote: bool,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub hidden_from_publishing: bool,
    #[serde(default)]
    pub scopes: Vec<String>,
    #[serde(default)]
    pub code_syntax: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FigmaVariableCollection {
    pub id: String,
    pub name: String,
    pub key: String,
    pub modes: Vec<FigmaMode>,
    #[serde(default)]
    pub default_mode_id: String,
    #[serde(default)]
    pub remote: bool,
    #[serde(default)]
    pub hidden_from_publishing: bool,
    #[serde(default)]
    pub variable_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FigmaMode {
    pub mode_id: String,
    pub name: String,
}

// ── POST /v1/files/:file_key/variables ───────────────────────────────────────

/// Request body for `POST /v1/files/:file_key/variables`.
#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PostVariablesBody {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub variable_collections: Vec<CollectionAction>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub variable_modes: Vec<ModeAction>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub variables: Vec<VariableAction>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub variable_mode_values: Vec<ModeValueAction>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionAction {
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial_mode_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hidden_from_publishing: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeAction {
    pub action: String,
    pub id: String,
    pub name: String,
    pub variable_collection_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VariableAction {
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub name: String,
    pub variable_collection_id: String,
    pub resolved_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hidden_from_publishing: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scopes: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_syntax: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeValueAction {
    pub variable_id: String,
    pub mode_id: String,
    pub value: serde_json::Value,
}

/// Response from `POST /v1/files/:file_key/variables`.
#[derive(Debug, Deserialize)]
pub struct PostVariablesResponse {
    pub status: u16,
    pub error: bool,
    #[serde(default)]
    pub meta: PostVariablesMeta,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PostVariablesMeta {
    #[serde(default)]
    pub temp_id_to_real_id: HashMap<String, String>,
}

// ── Value types ──────────────────────────────────────────────────────────────

/// Color in Figma's 0-1 float format.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FigmaColor {
    pub r: f64,
    pub g: f64,
    pub b: f64,
    pub a: f64,
}

/// Variable alias reference.
#[derive(Debug, Serialize)]
pub struct FigmaVariableAlias {
    #[serde(rename = "type")]
    pub alias_type: String,
    pub id: String,
}

impl FigmaVariableAlias {
    pub fn new(id: String) -> Self {
        Self {
            alias_type: "VARIABLE_ALIAS".to_string(),
            id,
        }
    }
}
