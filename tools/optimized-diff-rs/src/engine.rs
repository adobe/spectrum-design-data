/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

use crate::error::{DiffError, Result};
use crate::types::{DetailedDiff, DiffResult};
use serde_json::{Map, Value};
use std::collections::HashSet;

/// High-performance deep object diff engine
///
/// This implementation provides significant performance improvements over generic
/// diff libraries by:
///
/// 1. Using HashSet-based lookups for O(1) key comparisons
/// 2. Early reference checking before deep comparison
/// 3. Optimized deep comparison logic for nested structures
/// 4. Efficient handling of common JSON data types
pub struct DiffEngine {
    /// Engine name for identification
    pub name: &'static str,
    /// Engine version
    pub version: &'static str,
    /// Engine description
    pub description: &'static str,
}

impl DiffEngine {
    /// Create a new diff engine instance
    pub fn new() -> Self {
        Self {
            name: "optimized-rs",
            version: "1.0.0",
            description: "High-performance deep object diff algorithm implemented in Rust",
        }
    }

    /// Perform a detailed diff with categorized changes
    ///
    /// Returns a DetailedDiff showing what was added, updated, and deleted.
    pub fn detailed_diff(&self, original: &Value, updated: &Value) -> Result<DetailedDiff> {
        let mut result = DetailedDiff::new();

        // Handle edge cases
        if !self.is_object(original) || !self.is_object(updated) {
            if original != updated {
                result.updated = updated.clone();
            }
            return Ok(result);
        }

        let original_obj = original.as_object().unwrap();
        let updated_obj = updated.as_object().unwrap();

        // Get all unique keys efficiently using HashSet
        let original_keys: HashSet<&String> = original_obj.keys().collect();
        let updated_keys: HashSet<&String> = updated_obj.keys().collect();
        let all_keys: HashSet<&String> = original_keys.union(&updated_keys).copied().collect();

        for &key in &all_keys {
            if !original_keys.contains(key) {
                // Completely new key - goes to added
                if let Some(value) = updated_obj.get(key) {
                    self.set_nested_value(&mut result.added, key, value.clone())?;
                }
            } else if !updated_keys.contains(key) {
                // Deleted key - goes to deleted
                self.set_nested_value(&mut result.deleted, key, Value::Null)?;
            } else {
                // Key exists in both - check for differences
                let original_value = original_obj.get(key).unwrap();
                let updated_value = updated_obj.get(key).unwrap();

                if original_value != updated_value {
                    // Values are different - need to analyze the difference
                    let diff_result = self.analyze_value_difference(original_value, updated_value)?;

                    if !self.is_empty_object(&diff_result.added) {
                        self.merge_nested_value(&mut result.added, key, &diff_result.added)?;
                    }

                    if !self.is_empty_object(&diff_result.updated) {
                        self.merge_nested_value(&mut result.updated, key, &diff_result.updated)?;
                    }

                    if !self.is_empty_object(&diff_result.deleted) {
                        self.merge_nested_value(&mut result.deleted, key, &diff_result.deleted)?;
                    }
                }
            }
        }

        Ok(result)
    }

    /// Get combined diff (all changes in one object)
    pub fn diff(&self, original: &Value, updated: &Value) -> Result<DiffResult> {
        let detailed = self.detailed_diff(original, updated)?;

        let mut result = Value::Object(Map::new());

        // Deep merge all changes into a single object
        self.deep_merge(&mut result, &detailed.added)?;
        self.deep_merge(&mut result, &detailed.updated)?;
        self.deep_merge(&mut result, &detailed.deleted)?;

        Ok(result)
    }

    /// Get only added properties
    pub fn added_diff(&self, original: &Value, updated: &Value) -> Result<DiffResult> {
        let detailed = self.detailed_diff(original, updated)?;
        Ok(detailed.added)
    }

    /// Get only deleted properties
    pub fn deleted_diff(&self, original: &Value, updated: &Value) -> Result<DiffResult> {
        let detailed = self.detailed_diff(original, updated)?;
        Ok(detailed.deleted)
    }

    /// Get only updated properties
    pub fn updated_diff(&self, original: &Value, updated: &Value) -> Result<DiffResult> {
        let detailed = self.detailed_diff(original, updated)?;
        Ok(detailed.updated)
    }

    /// Analyze the difference between two values and categorize changes
    fn analyze_value_difference(&self, original: &Value, updated: &Value) -> Result<DetailedDiff> {
        let mut result = DetailedDiff::new();

        // If types are different, it's an update
        if std::mem::discriminant(original) != std::mem::discriminant(updated) {
            result.updated = updated.clone();
            return Ok(result);
        }

        // Handle primitive values first
        if self.is_primitive(original) {
            if original != updated {
                result.updated = updated.clone();
            }
            return Ok(result);
        }

        // Handle arrays
        if original.is_array() && updated.is_array() {
            return self.analyze_array_difference(
                original.as_array().unwrap(),
                updated.as_array().unwrap(),
            );
        }

        // Handle objects
        if self.is_object(original) && self.is_object(updated) {
            let original_obj = original.as_object().unwrap();
            let updated_obj = updated.as_object().unwrap();

            let original_keys: HashSet<&String> = original_obj.keys().collect();
            let updated_keys: HashSet<&String> = updated_obj.keys().collect();
            let all_keys: HashSet<&String> = original_keys.union(&updated_keys).copied().collect();

            for &key in &all_keys {
                if !original_keys.contains(key) {
                    // New property - goes to added
                    if let Some(value) = updated_obj.get(key) {
                        self.set_nested_value(&mut result.added, key, value.clone())?;
                    }
                } else if !updated_keys.contains(key) {
                    // Deleted property
                    self.set_nested_value(&mut result.deleted, key, Value::Null)?;
                } else {
                    // Property exists in both
                    let original_prop = original_obj.get(key).unwrap();
                    let updated_prop = updated_obj.get(key).unwrap();

                    if original_prop != updated_prop {
                        let prop_diff = self.analyze_value_difference(original_prop, updated_prop)?;

                        if !self.is_empty_object(&prop_diff.added) {
                            self.merge_nested_value(&mut result.added, key, &prop_diff.added)?;
                        }

                        let prop_diff_updated_is_empty = self.is_empty_object(&prop_diff.updated);
                        if !prop_diff_updated_is_empty {
                            if self.is_primitive(&prop_diff.updated) {
                                self.set_nested_value(&mut result.updated, key, prop_diff.updated.clone())?;
                            } else {
                                self.merge_nested_value(&mut result.updated, key, &prop_diff.updated)?;
                            }
                        }

                        if !self.is_empty_object(&prop_diff.deleted) {
                            self.merge_nested_value(&mut result.deleted, key, &prop_diff.deleted)?;
                        }

                        // If it's a simple value change, put it in updated
                        if self.is_empty_object(&prop_diff.added)
                            && self.is_empty_object(&prop_diff.deleted)
                            && prop_diff_updated_is_empty
                        {
                            // Only add to updated if the values are actually different
                            if original_prop != updated_prop {
                                self.set_nested_value(&mut result.updated, key, updated_prop.clone())?;
                            }
                        }
                    }
                }
            }

            return Ok(result);
        }

        // For other value types that are different
        if original != updated {
            result.updated = updated.clone();
        }

        Ok(result)
    }

    /// Analyze array differences
    fn analyze_array_difference(&self, original: &[Value], updated: &[Value]) -> Result<DetailedDiff> {
        let mut result = DetailedDiff::new();
        let max_length = original.len().max(updated.len());

        for i in 0..max_length {
            let key = i.to_string();

            if i >= original.len() {
                // New element
                self.set_nested_value(&mut result.added, &key, updated[i].clone())?;
            } else if i >= updated.len() {
                // Deleted element
                self.set_nested_value(&mut result.deleted, &key, Value::Null)?;
            } else if original[i] != updated[i] {
                // Changed element
                if self.is_object(&original[i]) 
                    && self.is_object(&updated[i])
                    && !original[i].is_array()
                    && !updated[i].is_array()
                {
                    let elem_diff = self.analyze_value_difference(&original[i], &updated[i])?;

                    if !self.is_empty_object(&elem_diff.added) {
                        self.set_nested_value(&mut result.added, &key, elem_diff.added)?;
                    }

                    if !self.is_empty_object(&elem_diff.updated) {
                        self.set_nested_value(&mut result.updated, &key, elem_diff.updated)?;
                    }

                    if !self.is_empty_object(&elem_diff.deleted) {
                        self.set_nested_value(&mut result.deleted, &key, elem_diff.deleted)?;
                    }
                } else {
                    // Simple value change in array
                    self.set_nested_value(&mut result.updated, &key, updated[i].clone())?;
                }
            }
        }

        // If only additions/updates, return as added (to match behavior)
        if self.is_empty_object(&result.updated) && self.is_empty_object(&result.deleted) {
            let mut new_result = DetailedDiff::new();
            new_result.added = result.added;
            return Ok(new_result);
        }

        Ok(result)
    }

    /// Check if a value is a plain object (not array, not null)
    fn is_object(&self, value: &Value) -> bool {
        value.is_object()
    }

    /// Check if a value is primitive (string, number, boolean, null)
    fn is_primitive(&self, value: &Value) -> bool {
        value.is_string() || value.is_number() || value.is_boolean() || value.is_null()
    }

    /// Check if a value represents an empty object
    fn is_empty_object(&self, value: &Value) -> bool {
        match value {
            Value::Object(obj) => obj.is_empty(),
            _ => false,
        }
    }

    /// Set a nested value in an object
    fn set_nested_value(&self, target: &mut Value, key: &str, value: Value) -> Result<()> {
        if let Value::Object(ref mut obj) = target {
            obj.insert(key.to_string(), value);
            Ok(())
        } else {
            Err(DiffError::ProcessingError(
                "Target is not an object".to_string(),
            ))
        }
    }

    /// Merge a nested value into an object
    fn merge_nested_value(&self, target: &mut Value, key: &str, value: &Value) -> Result<()> {
        if let Value::Object(ref mut obj) = target {
            if let Some(existing) = obj.get_mut(key) {
                self.deep_merge(existing, value)?;
            } else {
                obj.insert(key.to_string(), value.clone());
            }
            Ok(())
        } else {
            Err(DiffError::ProcessingError(
                "Target is not an object".to_string(),
            ))
        }
    }

    /// Deep merge two values
    fn deep_merge(&self, target: &mut Value, source: &Value) -> Result<()> {
        match (target.as_object_mut(), source.as_object()) {
            (Some(target_obj), Some(source_obj)) => {
                for (key, value) in source_obj {
                    if let Some(target_value) = target_obj.get_mut(key) {
                        self.deep_merge(target_value, value)?;
                    } else {
                        target_obj.insert(key.clone(), value.clone());
                    }
                }
                Ok(())
            }
            _ => {
                *target = source.clone();
                Ok(())
            }
        }
    }
}

impl Default for DiffEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_engine_metadata() {
        let engine = DiffEngine::new();
        assert_eq!(engine.name, "optimized-rs");
        assert_eq!(engine.version, "1.0.0");
        assert!(!engine.description.is_empty());
    }

    #[test]
    fn test_simple_diff() {
        let engine = DiffEngine::new();
        let original = json!({"a": 1, "b": 2});
        let updated = json!({"a": 1, "b": 3, "c": 4});

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({"c": 4}));
        assert_eq!(result.updated, json!({"b": 3}));
        assert_eq!(result.deleted, json!({}));
    }

    #[test]
    fn test_nested_object_diff() {
        let engine = DiffEngine::new();
        let original = json!({
            "user": {
                "name": "John",
                "preferences": {
                    "theme": "dark",
                    "notifications": true
                }
            }
        });
        let updated = json!({
            "user": {
                "name": "John",
                "preferences": {
                    "theme": "light",
                    "notifications": true,
                    "timezone": "UTC"
                }
            }
        });

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({"user": {"preferences": {"timezone": "UTC"}}}));
        assert_eq!(result.updated, json!({"user": {"preferences": {"theme": "light"}}}));
        assert_eq!(result.deleted, json!({}));
    }

    #[test]
    fn test_array_diff() {
        let engine = DiffEngine::new();
        let original = json!({"items": [1, 2, 3]});
        let updated = json!({"items": [1, 2, 3, 4]});

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({"items": {"3": 4}}));
        assert_eq!(result.updated, json!({}));
        assert_eq!(result.deleted, json!({}));
    }

    #[test]
    fn test_deleted_properties() {
        let engine = DiffEngine::new();
        let original = json!({"a": 1, "b": 2, "c": 3});
        let updated = json!({"a": 1, "c": 4});

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({}));
        assert_eq!(result.updated, json!({"c": 4}));
        assert_eq!(result.deleted, json!({"b": null}));
    }

    #[test]
    fn test_combined_diff() {
        let engine = DiffEngine::new();
        let original = json!({"a": 1, "b": 2});
        let updated = json!({"a": 1, "b": 3, "c": 4});

        let result = engine.diff(&original, &updated).unwrap();
        
        // Combined diff should contain all changes
        assert_eq!(result.get("b"), Some(&json!(3)));
        assert_eq!(result.get("c"), Some(&json!(4)));
    }

    #[test]
    fn test_individual_diff_functions() {
        let engine = DiffEngine::new();
        let original = json!({"a": 1, "b": 2});
        let updated = json!({"a": 1, "b": 3, "c": 4});

        let added = engine.added_diff(&original, &updated).unwrap();
        let updated_diff = engine.updated_diff(&original, &updated).unwrap();
        let deleted = engine.deleted_diff(&original, &updated).unwrap();

        assert_eq!(added, json!({"c": 4}));
        assert_eq!(updated_diff, json!({"b": 3}));
        assert_eq!(deleted, json!({}));
    }

    #[test]
    fn test_primitive_diff() {
        let engine = DiffEngine::new();
        let original = json!("hello");
        let updated = json!("world");

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({}));
        assert_eq!(result.updated, json!("world"));
        assert_eq!(result.deleted, json!({}));
    }

    #[test]
    fn test_type_change() {
        let engine = DiffEngine::new();
        let original = json!(42);
        let updated = json!("forty-two");

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({}));
        assert_eq!(result.updated, json!("forty-two"));
        assert_eq!(result.deleted, json!({}));
    }
}