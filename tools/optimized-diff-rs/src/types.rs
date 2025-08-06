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

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Result of a detailed diff operation showing added, updated, and deleted changes
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DetailedDiff {
    /// Properties that were added in the updated object
    pub added: Value,
    /// Properties that were updated (changed) in the updated object
    pub updated: Value,
    /// Properties that were deleted from the original object
    pub deleted: Value,
}

impl DetailedDiff {
    /// Create a new empty DetailedDiff
    pub fn new() -> Self {
        Self {
            added: Value::Object(serde_json::Map::new()),
            updated: Value::Object(serde_json::Map::new()),
            deleted: Value::Object(serde_json::Map::new()),
        }
    }

    /// Check if the diff contains any changes
    pub fn is_empty(&self) -> bool {
        self.is_empty_object(&self.added)
            && self.is_empty_object(&self.updated)
            && self.is_empty_object(&self.deleted)
    }

    fn is_empty_object(&self, value: &Value) -> bool {
        match value {
            Value::Object(obj) => obj.is_empty(),
            _ => false,
        }
    }
}

impl Default for DetailedDiff {
    fn default() -> Self {
        Self::new()
    }
}

/// Type alias for a general diff result (combined changes)
pub type DiffResult = Value;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_detailed_diff_new() {
        let diff = DetailedDiff::new();
        assert!(diff.is_empty());
        assert_eq!(diff.added, json!({}));
        assert_eq!(diff.updated, json!({}));
        assert_eq!(diff.deleted, json!({}));
    }

    #[test]
    fn test_detailed_diff_is_empty() {
        let mut diff = DetailedDiff::new();
        assert!(diff.is_empty());

        diff.added = json!({"test": "value"});
        assert!(!diff.is_empty());
    }

    #[test]
    fn test_detailed_diff_serialization() {
        let diff = DetailedDiff {
            added: json!({"new_field": "value"}),
            updated: json!({"changed_field": "new_value"}),
            deleted: json!({"removed_field": null}),
        };

        let serialized = serde_json::to_string(&diff).unwrap();
        let deserialized: DetailedDiff = serde_json::from_str(&serialized).unwrap();

        assert_eq!(diff, deserialized);
    }
}