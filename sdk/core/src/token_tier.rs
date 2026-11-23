// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token tiers (spec: taxonomy.md, Token tiers). A token's tier is its explicit `tokenTier`
//! when it declares one, otherwise it is derived from the token itself:
//!
//! 1. a name field whose catalog entry implies `component` → `component`;
//! 2. the value is an alias → `semantic` (a primitive is a terminal value);
//! 3. a name field whose catalog entry implies `semantic` → `semantic`;
//! 4. otherwise → `primitive`.

use serde_json::Value;

use crate::graph::{extract_alias_target, TokenRecord};
use crate::registry::FieldCatalog;

/// The tier a token declares with `tokenTier`, if any.
pub fn explicit(record: &TokenRecord) -> Option<&str> {
    explicit_raw(&record.raw)
}

/// The tier derived from the token's name fields and value, ignoring any `tokenTier`.
pub fn derive(record: &TokenRecord) -> &'static str {
    derive_raw(&record.raw)
}

/// The explicit tier when declared, otherwise the derived one.
pub fn effective(record: &TokenRecord) -> &str {
    effective_raw(&record.raw)
}

/// [`explicit`] for a token's source JSON.
pub fn explicit_raw(raw: &Value) -> Option<&str> {
    raw.get("tokenTier").and_then(|v| v.as_str())
}

/// [`derive`] for a token's source JSON.
pub fn derive_raw(raw: &Value) -> &'static str {
    let catalog = FieldCatalog::embedded();
    let implied = |tier: &str| {
        raw.get("name")
            .and_then(|v| v.as_object())
            .is_some_and(|name| {
                name.keys()
                    .any(|k| catalog.get(k).and_then(|e| e.implies_token_tier) == Some(tier))
            })
    };
    let is_alias = raw
        .as_object()
        .is_some_and(|obj| extract_alias_target(obj).is_some());
    if implied("component") {
        "component"
    } else if is_alias || implied("semantic") {
        "semantic"
    } else {
        "primitive"
    }
}

/// [`effective`] for a token's source JSON.
pub fn effective_raw(raw: &Value) -> &str {
    explicit_raw(raw).unwrap_or_else(|| derive_raw(raw))
}

/// Where the effective tier comes from: `"declared"` (a `tokenTier` override) or `"derived"`.
pub fn source_raw(raw: &Value) -> &'static str {
    if explicit_raw(raw).is_some() {
        "declared"
    } else {
        "derived"
    }
}
