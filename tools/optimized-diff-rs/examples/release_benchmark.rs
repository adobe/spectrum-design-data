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
use std::time::Instant;

fn generate_test_data(size: usize, change_percentage: f32) -> (Value, Value) {
    let mut original = serde_json::Map::new();
    let mut updated = serde_json::Map::new();

    for i in 0..size {
        let token_name = format!("spectrum-token-{}", i);
        let token_data = json!({
            "name": token_name,
            "value": format!("#FF{:04X}", i % 65536),
            "description": format!("A design token for color #{}", i),
            "type": if i % 3 == 0 { "color" } else if i % 3 == 1 { "dimension" } else { "typography" },
            "metadata": {
                "category": format!("category-{}", i % 10),
                "deprecated": false,
                "private": i % 20 == 0,
                "tags": [
                    format!("tag-{}", i % 5),
                    format!("type-{}", i % 3),
                    "spectrum"
                ]
            }
        });

        original.insert(token_name.clone(), token_data.clone());

        if (i as f32 / size as f32) < change_percentage {
            let mut modified_token = token_data.clone();
            if let Some(obj) = modified_token.as_object_mut() {
                obj.insert("value".to_string(), json!(format!("#00{:04X}", i % 65536)));
                obj.insert("description".to_string(), json!(format!("Updated design token for color #{}", i)));
                if let Some(metadata) = obj.get_mut("metadata") {
                    if let Some(meta_obj) = metadata.as_object_mut() {
                        meta_obj.insert("lastModified".to_string(), json!("2024-01-15T10:30:00Z"));
                    }
                }
            }
            updated.insert(token_name, modified_token);
        } else {
            updated.insert(token_name, token_data);
        }
    }

    (Value::Object(original), Value::Object(updated))
}

fn benchmark_rust(original: &Value, updated: &Value, iterations: usize) -> std::time::Duration {
    let engine = DiffEngine::new();
    let mut total_duration = std::time::Duration::new(0, 0);

    // Extensive warm up for JIT optimization
    for _ in 0..10 {
        let _ = engine.detailed_diff(original, updated).unwrap();
    }

    // Actual benchmark
    for _ in 0..iterations {
        let start = Instant::now();
        let _ = engine.detailed_diff(original, updated).unwrap();
        total_duration += start.elapsed();
    }

    total_duration / iterations as u32
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Rust Release Mode Performance Benchmark");
    println!("==========================================");

    let test_cases = vec![
        (100, 0.1, "Small dataset (10% changes)"),
        (500, 0.2, "Medium dataset (20% changes)"),
        (1000, 0.3, "Large dataset (30% changes)"),
        (2000, 0.15, "XL dataset (15% changes)"),
        (5000, 0.1, "XXL dataset (10% changes)"),
    ];

    let iterations = 100; // More iterations for stable results

    for (size, change_pct, description) in test_cases {
        println!("\n📋 Test Case: {}", description);
        println!("   Size: {} objects, {:.1}% changes", size, change_pct * 100.0);

        let (original, updated) = generate_test_data(size, change_pct);
        let avg_duration = benchmark_rust(&original, &updated, iterations);
        
        println!("   🦀 Rust (Release) Results:");
        println!("      Average time: {:.2}ms", avg_duration.as_secs_f64() * 1000.0);
        println!("      Throughput: {:.0} objects/sec", size as f64 / avg_duration.as_secs_f64());
    }

    println!("\n🎯 Performance Notes:");
    println!("====================");
    println!("- Built with --release flag for maximum optimization");
    println!("- Extended warm-up period for stable measurements");
    println!("- {} iterations per test for statistical accuracy", iterations);

    Ok(())
}