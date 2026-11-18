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

use crate::graph::TokenRecord;
use crate::registry::FieldCatalog;

/// The tier a token declares with `tokenTier`, if any.
pub fn explicit(record: &TokenRecord) -> Option<&str> {
    record.raw.get("tokenTier").and_then(|v| v.as_str())
}

/// The tier derived from the token's name fields and value, ignoring any `tokenTier`.
pub fn derive(record: &TokenRecord) -> &'static str {
    let catalog = FieldCatalog::embedded();
    let implied = |tier: &str| {
        record
            .raw
            .get("name")
            .and_then(|v| v.as_object())
            .is_some_and(|name| {
                name.keys()
                    .any(|k| catalog.get(k).and_then(|e| e.implies_token_tier) == Some(tier))
            })
    };
    if implied("component") {
        "component"
    } else if record.alias_target.is_some() || implied("semantic") {
        "semantic"
    } else {
        "primitive"
    }
}

/// The explicit tier when declared, otherwise the derived one.
pub fn effective(record: &TokenRecord) -> &str {
    explicit(record).unwrap_or_else(|| derive(record))
}
