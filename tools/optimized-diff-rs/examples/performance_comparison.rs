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
use std::fs;
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

        // Modify some percentage of tokens for the updated version
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

    // Warm up
    for _ in 0..3 {
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
    println!("🚀 Rust Performance Benchmark");
    println!("==============================");

    let test_cases = vec![
        (100, 0.1, "Small dataset (10% changes)"),
        (500, 0.2, "Medium dataset (20% changes)"),
        (1000, 0.3, "Large dataset (30% changes)"),
        (2000, 0.15, "XL dataset (15% changes)"),
    ];

    let iterations = 10;
    let output_dir = "benchmark_data";
    fs::create_dir_all(output_dir)?;

    for (size, change_pct, description) in test_cases {
        println!("\n📋 Test Case: {}", description);
        println!("   Size: {} objects, {:.1}% changes", size, change_pct * 100.0);

        // Generate test data
        let (original, updated) = generate_test_data(size, change_pct);
        
        // Benchmark Rust implementation
        let avg_duration = benchmark_rust(&original, &updated, iterations);
        
        println!("   🦀 Rust Results:");
        println!("      Average time: {:.2}ms", avg_duration.as_secs_f64() * 1000.0);

        // Write test data for JavaScript comparison
        let test_output_dir = format!("{}/test_{}_{}", output_dir, size, (change_pct * 100.0) as u32);
        fs::create_dir_all(&test_output_dir)?;
        
        fs::write(
            format!("{}/original.json", test_output_dir),
            serde_json::to_string_pretty(&original)?
        )?;
        
        fs::write(
            format!("{}/updated.json", test_output_dir),
            serde_json::to_string_pretty(&updated)?
        )?;

        // Save Rust results
        let rust_results = json!({
            "avgTimeMs": avg_duration.as_secs_f64() * 1000.0,
            "iterations": iterations,
            "objectCount": size,
            "changePercentage": change_pct
        });

        fs::write(
            format!("{}/rust_results.json", test_output_dir),
            serde_json::to_string_pretty(&rust_results)?
        )?;

        println!("   💾 Test data saved to: {}", test_output_dir);
    }

    // Create JavaScript benchmark script
    let js_script = r#"const fs = require('fs');
const path = require('path');
const { detailedDiff } = require('../../optimized-diff/src/engine.js');

const testDir = process.argv[2];
if (!testDir) {
    console.error('Usage: node js_benchmark.js <test_directory>');
    process.exit(1);
}

console.log('📊 JavaScript Performance Benchmark');
console.log('====================================');

const original = JSON.parse(fs.readFileSync(path.join(testDir, 'original.json'), 'utf8'));
const updated = JSON.parse(fs.readFileSync(path.join(testDir, 'updated.json'), 'utf8'));

const iterations = 10;
let totalTime = 0;

// Warm up
for (let i = 0; i < 3; i++) {
    detailedDiff(original, updated);
}

console.log(`Running ${iterations} iterations...`);

for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const result = detailedDiff(original, updated);
    const end = process.hrtime.bigint();
    totalTime += Number(end - start);
}

const avgTimeNs = totalTime / iterations;
const avgTimeMs = avgTimeNs / 1_000_000;

console.log(`\n📈 JavaScript Results:`);
console.log(`   Average time: ${avgTimeMs.toFixed(2)}ms`);
console.log(`   Object count: ${Object.keys(original).length}`);

const jsResults = {
    avgTimeMs,
    iterations,
    objectCount: Object.keys(original).length
};

fs.writeFileSync(path.join(testDir, 'js_results.json'), JSON.stringify(jsResults, null, 2));
console.log(`✅ Results saved to js_results.json`);
"#;

    fs::write(format!("{}/js_benchmark.js", output_dir), js_script)?;

    println!("\n🎯 Comparison Instructions:");
    println!("===========================");
    println!("To compare with JavaScript:");
    println!("1. cd benchmark_data");
    println!("2. node js_benchmark.js test_1000_30");
    println!("3. Compare rust_results.json vs js_results.json");

    Ok(())
}