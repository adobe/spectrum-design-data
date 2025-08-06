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

use optimized_diff::{DiffEngine, Value};
use serde_json::json;

/// Test data that mirrors the JavaScript test suite
mod test_data {
    use serde_json::{json, Value};

    pub fn original_obj() -> Value {
        json!({
            "name": "test-token",
            "value": "#FF0000",
            "description": "Red color",
            "nested": {
                "property": "value1",
                "deep": {
                    "level": "original"
                }
            },
            "arrayProp": [1, 2, 3]
        })
    }

    pub fn updated_obj() -> Value {
        json!({
            "name": "test-token",
            "value": "#00FF00", // changed
            "description": "Green color", // changed
            "newProp": "added", // added
            "nested": {
                "property": "value2", // changed
                "deep": {
                    "level": "updated" // changed
                },
                "newNested": "added" // added
            },
            "arrayProp": [1, 2, 3, 4] // changed
        })
    }

    pub fn complex_original() -> Value {
        json!({
            "user": {
                "name": "John Doe",
                "preferences": {
                    "theme": "dark",
                    "notifications": true,
                    "settings": {
                        "language": "en",
                        "timezone": "UTC"
                    }
                },
                "tags": ["admin", "user"],
                "metadata": {
                    "created": "2024-01-01",
                    "lastLogin": "2024-01-10"
                }
            },
            "settings": {
                "language": "en",
                "advanced": {
                    "debug": false,
                    "experimental": true
                }
            }
        })
    }

    pub fn complex_updated() -> Value {
        json!({
            "user": {
                "name": "John Smith", // changed
                "preferences": {
                    "theme": "light", // changed
                    "notifications": true,
                    "timezone": "PST", // added
                    "settings": {
                        "language": "en",
                        "timezone": "PST" // changed
                    }
                },
                "tags": ["admin", "user", "premium"], // changed
                "metadata": {
                    "created": "2024-01-01",
                    "lastLogin": "2024-01-15", // changed
                    "lastUpdate": "2024-01-15" // added
                }
            },
            "settings": {
                "language": "es", // changed
                "advanced": {
                    "debug": true, // changed
                    "experimental": true,
                    "beta": false // added
                }
            },
            "newSection": { // added
                "feature": "enabled"
            }
        })
    }
}

#[test]
fn test_detailed_diff_basic() {
    let engine = DiffEngine::new();
    let original = test_data::original_obj();
    let updated = test_data::updated_obj();

    let result = engine.detailed_diff(&original, &updated).unwrap();

    // Verify added properties
    assert_eq!(result.added.get("newProp"), Some(&json!("added")));
    assert_eq!(
        result.added.get("nested").and_then(|n| n.get("newNested")),
        Some(&json!("added"))
    );

    // Verify updated properties
    assert_eq!(result.updated.get("value"), Some(&json!("#00FF00")));
    assert_eq!(result.updated.get("description"), Some(&json!("Green color")));

    // Verify array changes are detected
    assert!(result.added.get("arrayProp").is_some() || result.updated.get("arrayProp").is_some());

    // Verify deleted is empty for this test case
    if let Some(obj) = result.deleted.as_object() {
        assert!(obj.is_empty());
    }
}

#[test]
fn test_detailed_diff_complex() {
    let engine = DiffEngine::new();
    let original = test_data::complex_original();
    let updated = test_data::complex_updated();

    let result = engine.detailed_diff(&original, &updated).unwrap();

    // Verify deep nested changes are detected
    assert_eq!(
        result.updated.get("user").and_then(|u| u.get("name")),
        Some(&json!("John Smith"))
    );

    // Verify added nested properties
    assert_eq!(
        result.added.get("newSection").and_then(|s| s.get("feature")),
        Some(&json!("enabled"))
    );

    // Verify complex nested updates
    assert_eq!(
        result.updated.get("settings").and_then(|s| s.get("language")),
        Some(&json!("es"))
    );
}

#[test]
fn test_combined_diff() {
    let engine = DiffEngine::new();
    let original = json!({"a": 1, "b": 2, "c": {"nested": "value"}});
    let updated = json!({"a": 2, "b": 2, "c": {"nested": "updated"}, "d": "new"});

    let result = engine.diff(&original, &updated).unwrap();

    // Combined diff should include all changes
    assert_eq!(result.get("a"), Some(&json!(2)));
    assert_eq!(result.get("d"), Some(&json!("new")));
    assert_eq!(
        result.get("c").and_then(|c| c.get("nested")),
        Some(&json!("updated"))
    );
}

#[test]
fn test_individual_diff_functions() {
    let engine = DiffEngine::new();
    let original = json!({"keep": "same", "change": "old", "remove": "gone"});
    let updated = json!({"keep": "same", "change": "new", "add": "here"});

    let added = engine.added_diff(&original, &updated).unwrap();
    let updated_diff = engine.updated_diff(&original, &updated).unwrap();
    let deleted = engine.deleted_diff(&original, &updated).unwrap();

    assert_eq!(added.get("add"), Some(&json!("here")));
    assert_eq!(updated_diff.get("change"), Some(&json!("new")));
    assert_eq!(deleted.get("remove"), Some(&json!(null)));
}

#[test]
fn test_array_modifications() {
    let engine = DiffEngine::new();
    let original = json!({"list": [1, 2, 3, {"nested": "original"}]});
    let updated = json!({"list": [1, 3, 4, {"nested": "updated"}, 5]});

    let result = engine.detailed_diff(&original, &updated).unwrap();

    // Arrays should be treated as objects with numeric keys
    assert!(result.added.get("list").is_some() || result.updated.get("list").is_some());
}

#[test]
fn test_type_changes() {
    let engine = DiffEngine::new();
    let original = json!({"field": "string"});
    let updated = json!({"field": 42});

    let result = engine.detailed_diff(&original, &updated).unwrap();

    assert_eq!(result.updated.get("field"), Some(&json!(42)));
    assert!(result.added.as_object().unwrap().is_empty());
    assert!(result.deleted.as_object().unwrap().is_empty());
}

#[test]
fn test_null_and_undefined_handling() {
    let engine = DiffEngine::new();
    let original = json!({"field": null, "remove": "value"});
    let updated = json!({"field": "now_has_value"});

    let result = engine.detailed_diff(&original, &updated).unwrap();

    assert_eq!(result.updated.get("field"), Some(&json!("now_has_value")));
    assert_eq!(result.deleted.get("remove"), Some(&json!(null)));
}

#[test]
fn test_deep_nesting() {
    let engine = DiffEngine::new();
    let original = json!({
        "level1": {
            "level2": {
                "level3": {
                    "level4": {
                        "deep_value": "original"
                    }
                }
            }
        }
    });
    let updated = json!({
        "level1": {
            "level2": {
                "level3": {
                    "level4": {
                        "deep_value": "updated"
                    }
                }
            }
        }
    });

    let result = engine.detailed_diff(&original, &updated).unwrap();

    // Verify deep nested change is detected
    assert_eq!(
        result.updated
            .get("level1")
            .and_then(|l1| l1.get("level2"))
            .and_then(|l2| l2.get("level3"))
            .and_then(|l3| l3.get("level4"))
            .and_then(|l4| l4.get("deep_value")),
        Some(&json!("updated"))
    );
}

#[test]
fn test_empty_objects() {
    let engine = DiffEngine::new();
    let original = json!({});
    let updated = json!({"new": "value"});

    let result = engine.detailed_diff(&original, &updated).unwrap();

    assert_eq!(result.added.get("new"), Some(&json!("value")));
    assert!(result.updated.as_object().unwrap().is_empty());
    assert!(result.deleted.as_object().unwrap().is_empty());
}

#[test]
fn test_identical_objects() {
    let engine = DiffEngine::new();
    let original = json!({"same": "value", "nested": {"also": "same"}});
    let updated = original.clone();

    let result = engine.detailed_diff(&original, &updated).unwrap();

    assert!(result.is_empty());
}

#[test]
fn test_primitive_values() {
    let engine = DiffEngine::new();
    
    // Test string to string
    let result = engine.detailed_diff(&json!("old"), &json!("new")).unwrap();
    assert_eq!(result.updated, json!("new"));

    // Test number to number
    let result = engine.detailed_diff(&json!(1), &json!(2)).unwrap();
    assert_eq!(result.updated, json!(2));

    // Test boolean to boolean
    let result = engine.detailed_diff(&json!(true), &json!(false)).unwrap();
    assert_eq!(result.updated, json!(false));
}

#[test]
fn test_performance_with_large_objects() {
    use std::time::Instant;
    
    let engine = DiffEngine::new();
    
    // Create larger test objects
    let mut original = serde_json::Map::new();
    let mut updated = serde_json::Map::new();
    
    for i in 0..1000 {
        let key = format!("key_{}", i);
        original.insert(key.clone(), json!(format!("value_{}", i)));
        if i % 10 == 0 {
            // Change every 10th value
            updated.insert(key, json!(format!("updated_{}", i)));
        } else {
            updated.insert(key, json!(format!("value_{}", i)));
        }
    }

    let original = Value::Object(original);
    let updated = Value::Object(updated);

    let start = Instant::now();
    let result = engine.detailed_diff(&original, &updated).unwrap();
    let duration = start.elapsed();

    // Verify it completes in reasonable time (should be very fast)
    assert!(duration.as_millis() < 100, "Diff took too long: {:?}", duration);
    
    // Verify correct number of changes detected
    if let Value::Object(updated_obj) = result.updated {
        assert_eq!(updated_obj.len(), 100); // 1000 / 10 = 100 changes
    }
}