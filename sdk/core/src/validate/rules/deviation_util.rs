// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared reader for the merged `extensions.deviations` of a platform manifest.

use serde_json::Value;

/// `(file, document)` for each loaded `extensions/deviations/` file.
pub(crate) fn files(manifest: Option<&Value>) -> impl Iterator<Item = (&str, &Value)> {
    manifest
        .and_then(|m| m.get("extensions"))
        .and_then(|e| e.get("deviations"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|e| Some((e.get("file")?.as_str()?, e.get("deviations")?)))
}

/// The entries of one deviations document.
pub(crate) fn entries(doc: &Value) -> impl Iterator<Item = &Value> {
    doc.get("deviations")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
}

pub(crate) fn id(entry: &Value) -> &str {
    entry.get("id").and_then(Value::as_str).unwrap_or("?")
}
