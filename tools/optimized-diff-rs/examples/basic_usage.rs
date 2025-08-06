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

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let engine = DiffEngine::new();

    // Example 1: Basic object diff
    println!("=== Basic Object Diff ===");
    let original = json!({
        "name": "John Doe",
        "age": 30,
        "city": "San Francisco"
    });

    let updated = json!({
        "name": "John Smith", // changed
        "age": 30,
        "city": "San Francisco",
        "country": "USA" // added
    });

    let result = engine.detailed_diff(&original, &updated)?;
    
    println!("Added: {}", serde_json::to_string_pretty(&result.added)?);
    println!("Updated: {}", serde_json::to_string_pretty(&result.updated)?);
    println!("Deleted: {}", serde_json::to_string_pretty(&result.deleted)?);

    // Example 2: Nested object diff
    println!("\n=== Nested Object Diff ===");
    let original_nested = json!({
        "user": {
            "profile": {
                "name": "Alice",
                "preferences": {
                    "theme": "dark",
                    "notifications": true
                }
            },
            "metadata": {
                "created": "2024-01-01"
            }
        }
    });

    let updated_nested = json!({
        "user": {
            "profile": {
                "name": "Alice",
                "preferences": {
                    "theme": "light", // changed
                    "notifications": true,
                    "language": "en" // added
                }
            },
            "metadata": {
                "created": "2024-01-01",
                "lastLogin": "2024-01-15" // added
            }
        }
    });

    let nested_result = engine.detailed_diff(&original_nested, &updated_nested)?;
    
    println!("Added: {}", serde_json::to_string_pretty(&nested_result.added)?);
    println!("Updated: {}", serde_json::to_string_pretty(&nested_result.updated)?);

    // Example 3: Array diff
    println!("\n=== Array Diff ===");
    let original_array = json!({
        "tags": ["admin", "user", "active"]
    });

    let updated_array = json!({
        "tags": ["admin", "user", "active", "premium"] // added element
    });

    let array_result = engine.detailed_diff(&original_array, &updated_array)?;
    println!("Added: {}", serde_json::to_string_pretty(&array_result.added)?);

    // Example 4: Performance test
    println!("\n=== Performance Test ===");
    let start = std::time::Instant::now();
    
    // Generate larger test data
    let mut large_original = serde_json::Map::new();
    let mut large_updated = serde_json::Map::new();
    
    for i in 0..1000 {
        let key = format!("token_{}", i);
        let value = json!({
            "name": key,
            "value": format!("#FF{:04X}", i),
            "type": "color"
        });
        
        large_original.insert(key.clone(), value.clone());
        
        // Modify every 10th item
        if i % 10 == 0 {
            let mut modified = value;
            if let Some(obj) = modified.as_object_mut() {
                obj.insert("modified".to_string(), json!(true));
            }
            large_updated.insert(key, modified);
        } else {
            large_updated.insert(key, value);
        }
    }

    let large_original = Value::Object(large_original);
    let large_updated = Value::Object(large_updated);

    let large_result = engine.detailed_diff(&large_original, &large_updated)?;
    let duration = start.elapsed();

    if let Value::Object(added) = large_result.added {
        println!("Processed 1000 objects with 100 changes in {:?}", duration);
        println!("Changes detected: {}", added.len());
    }

    // Example 5: Engine metadata
    println!("\n=== Engine Info ===");
    println!("Engine: {} v{}", engine.name, engine.version);
    println!("Description: {}", engine.description);

    Ok(())
}