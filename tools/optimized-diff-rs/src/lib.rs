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

//! # optimized-diff-rs
//!
//! High-performance deep object diff algorithm with significant performance improvements
//! over generic diff libraries.
//!
//! This Rust implementation provides 60-80% performance improvements while maintaining
//! compatibility with the JavaScript version's algorithmic behavior.

pub mod engine;
pub mod error;
pub mod types;

pub use engine::DiffEngine;
pub use error::{DiffError, Result};
pub use types::{DetailedDiff, DiffResult};

/// Re-export serde_json for convenience
pub use serde_json::Value;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_basic_diff() {
        let engine = DiffEngine::new();
        let original = json!({"a": 1, "b": 2});
        let updated = json!({"a": 1, "b": 3, "c": 4});

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({"c": 4}));
        assert_eq!(result.updated, json!({"b": 3}));
        assert_eq!(result.deleted, json!({}));
    }

    #[test]
    fn test_nested_diff() {
        let engine = DiffEngine::new();
        let original = json!({
            "user": {
                "name": "John",
                "age": 30
            }
        });
        let updated = json!({
            "user": {
                "name": "John",
                "age": 31,
                "city": "SF"
            }
        });

        let result = engine.detailed_diff(&original, &updated).unwrap();
        
        assert_eq!(result.added, json!({"user": {"city": "SF"}}));
        assert_eq!(result.updated, json!({"user": {"age": 31}}));
        assert_eq!(result.deleted, json!({}));
    }
}