// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Design system registry data embedded at compile time.
//!
//! Each registry JSON file from `packages/design-system-registry/registry/` is included
//! via `include_str!` and parsed into `HashSet<String>` lookups keyed by value ID.
//! This avoids runtime filesystem access and keeps the validator self-contained.

use std::collections::HashSet;

use serde_json::Value;

/// Parsed registry data for SPEC-009 enum validation.
#[derive(Debug, Clone)]
pub struct RegistryData {
    pub components: HashSet<String>,
    pub states: HashSet<String>,
    pub variants: HashSet<String>,
    pub sizes: HashSet<String>,
    pub anatomy: HashSet<String>,
    pub token_objects: HashSet<String>,
    pub structures: HashSet<String>,
    pub substructures: HashSet<String>,
    pub orientations: HashSet<String>,
    pub positions: HashSet<String>,
    pub densities: HashSet<String>,
    pub shapes: HashSet<String>,
}

/// Parse a registry JSON file into a set of value IDs (and their aliases).
fn parse_registry(json_str: &str) -> HashSet<String> {
    let v: Value = serde_json::from_str(json_str).expect("embedded registry JSON must be valid");
    let mut set = HashSet::new();
    if let Some(values) = v.get("values").and_then(|v| v.as_array()) {
        for entry in values {
            if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
                set.insert(id.to_string());
            }
            if let Some(aliases) = entry.get("aliases").and_then(|v| v.as_array()) {
                for alias in aliases {
                    if let Some(a) = alias.as_str() {
                        set.insert(a.to_string());
                    }
                }
            }
        }
    }
    set
}

impl RegistryData {
    /// Load all registries from embedded JSON (compile-time inclusion).
    pub fn embedded() -> Self {
        Self {
            components: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/components.json"
            )),
            states: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/states.json"
            )),
            variants: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/variants.json"
            )),
            sizes: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/sizes.json"
            )),
            anatomy: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/anatomy-terms.json"
            )),
            token_objects: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/token-objects.json"
            )),
            structures: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/structures.json"
            )),
            substructures: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/substructures.json"
            )),
            orientations: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/orientations.json"
            )),
            positions: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/positions.json"
            )),
            densities: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/densities.json"
            )),
            shapes: parse_registry(include_str!(
                "../../../packages/design-system-registry/registry/shapes.json"
            )),
        }
    }

    /// Look up which registry a name-object field should be validated against.
    pub fn for_field(&self, field: &str) -> Option<&HashSet<String>> {
        match field {
            "component" => Some(&self.components),
            "state" => Some(&self.states),
            "variant" => Some(&self.variants),
            "size" => Some(&self.sizes),
            "anatomy" => Some(&self.anatomy),
            "object" => Some(&self.token_objects),
            "structure" => Some(&self.structures),
            "substructure" => Some(&self.substructures),
            "orientation" => Some(&self.orientations),
            "position" => Some(&self.positions),
            "density" => Some(&self.densities),
            "shape" => Some(&self.shapes),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_registries_load() {
        let r = RegistryData::embedded();
        assert!(r.components.contains("button"));
        assert!(r.states.contains("hover"));
        assert!(r.variants.contains("accent"));
        assert!(r.sizes.contains("m"));
        assert!(r.anatomy.contains("icon"));
        assert!(r.token_objects.contains("background"));
        assert!(r.structures.contains("base"));
        assert!(r.orientations.contains("vertical"));
        assert!(r.positions.contains("top"));
        assert!(r.densities.contains("compact"));
        assert!(r.shapes.contains("uniform"));
    }

    #[test]
    fn for_field_returns_correct_registry() {
        let r = RegistryData::embedded();
        assert!(r.for_field("component").unwrap().contains("button"));
        assert!(r.for_field("object").unwrap().contains("background"));
        assert!(r.for_field("property").is_none()); // free-form
        assert!(r.for_field("colorScheme").is_none()); // dimension
    }
}
