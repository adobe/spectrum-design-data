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

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use optimized_diff::DiffEngine;
use serde_json::{json, Value};
use std::collections::HashMap;

/// Generate realistic test data that mimics token structures
fn generate_token_data(size: usize, change_percentage: f32) -> (Value, Value) {
    let mut original = serde_json::Map::new();
    let mut updated = serde_json::Map::new();

    for i in 0..size {
        let token_name = format!("token-{}", i);
        let token_data = json!({
            "name": token_name,
            "value": format!("#FF{:04X}", i % 65536),
            "description": format!("Description for token {}", i),
            "type": if i % 3 == 0 { "color" } else { "dimension" },
            "metadata": {
                "category": format!("category-{}", i % 10),
                "deprecated": false,
                "private": i % 20 == 0,
                "tags": [
                    format!("tag-{}", i % 5),
                    format!("type-{}", i % 3)
                ]
            }
        });

        original.insert(token_name.clone(), token_data.clone());

        // Modify some percentage of tokens for the updated version
        if (i as f32 / size as f32) < change_percentage {
            let mut modified_token = token_data.clone();
            if let Some(obj) = modified_token.as_object_mut() {
                obj.insert("value".to_string(), json!(format!("#00{:04X}", i % 65536)));
                obj.insert("description".to_string(), json!(format!("Updated description for token {}", i)));
                if let Some(metadata) = obj.get_mut("metadata") {
                    if let Some(meta_obj) = metadata.as_object_mut() {
                        meta_obj.insert("lastModified".to_string(), json!("2024-01-15"));
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

/// Generate deeply nested test data
fn generate_nested_data(depth: usize, breadth: usize) -> (Value, Value) {
    fn build_nested(current_depth: usize, max_depth: usize, breadth: usize, modified: bool) -> Value {
        if current_depth >= max_depth {
            return json!(if modified { "modified_leaf" } else { "original_leaf" });
        }

        let mut obj = serde_json::Map::new();
        for i in 0..breadth {
            let key = format!("key_{}", i);
            let is_modified = modified && i == 0; // Modify only first branch
            obj.insert(key, build_nested(current_depth + 1, max_depth, breadth, is_modified));
        }
        Value::Object(obj)
    }

    let original = build_nested(0, depth, breadth, false);
    let updated = build_nested(0, depth, breadth, true);
    (original, updated)
}

fn bench_detailed_diff(c: &mut Criterion) {
    let engine = DiffEngine::new();

    let sizes = [100, 500, 1000, 2000];
    let change_percentages = [0.1, 0.3, 0.5];

    let mut group = c.benchmark_group("detailed_diff");

    for &size in &sizes {
        for &change_pct in &change_percentages {
            group.throughput(Throughput::Elements(size as u64));
            
            let (original, updated) = generate_token_data(size, change_pct);
            let id = BenchmarkId::from_parameter(format!("{}tokens_{}%change", size, (change_pct * 100.0) as u32));
            
            group.bench_with_input(id, &(original, updated), |b, (orig, upd)| {
                b.iter(|| {
                    let result = engine.detailed_diff(black_box(orig), black_box(upd));
                    black_box(result)
                });
            });
        }
    }
    group.finish();
}

fn bench_diff_functions(c: &mut Criterion) {
    let engine = DiffEngine::new();
    let (original, updated) = generate_token_data(1000, 0.3);

    let mut group = c.benchmark_group("diff_functions");
    
    group.bench_function("detailed_diff", |b| {
        b.iter(|| {
            let result = engine.detailed_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    group.bench_function("diff", |b| {
        b.iter(|| {
            let result = engine.diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    group.bench_function("added_diff", |b| {
        b.iter(|| {
            let result = engine.added_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    group.bench_function("updated_diff", |b| {
        b.iter(|| {
            let result = engine.updated_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    group.bench_function("deleted_diff", |b| {
        b.iter(|| {
            let result = engine.deleted_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    group.finish();
}

fn bench_nested_structures(c: &mut Criterion) {
    let engine = DiffEngine::new();

    let depths = [5, 10, 15];
    let breadths = [2, 5, 10];

    let mut group = c.benchmark_group("nested_structures");

    for &depth in &depths {
        for &breadth in &breadths {
            let (original, updated) = generate_nested_data(depth, breadth);
            let id = BenchmarkId::from_parameter(format!("depth{}_breadth{}", depth, breadth));
            
            group.bench_with_input(id, &(original, updated), |b, (orig, upd)| {
                b.iter(|| {
                    let result = engine.detailed_diff(black_box(orig), black_box(upd));
                    black_box(result)
                });
            });
        }
    }
    group.finish();
}

fn bench_array_operations(c: &mut Criterion) {
    let engine = DiffEngine::new();

    let mut group = c.benchmark_group("array_operations");

    // Test different array sizes
    let sizes = [10, 50, 100, 500];
    
    for &size in &sizes {
        let original_array: Vec<Value> = (0..size).map(|i| json!(i)).collect();
        let mut updated_array = original_array.clone();
        // Modify every 10th element and add some new ones
        for i in 0..size {
            if i % 10 == 0 {
                updated_array[i] = json!(format!("modified_{}", i));
            }
        }
        updated_array.extend((size..size+10).map(|i| json!(i)));

        let original = json!({"array": original_array});
        let updated = json!({"array": updated_array});

        let id = BenchmarkId::from_parameter(format!("{}elements", size));
        group.bench_with_input(id, &(original, updated), |b, (orig, upd)| {
            b.iter(|| {
                let result = engine.detailed_diff(black_box(orig), black_box(upd));
                black_box(result)
            });
        });
    }
    group.finish();
}

fn bench_edge_cases(c: &mut Criterion) {
    let engine = DiffEngine::new();

    let mut group = c.benchmark_group("edge_cases");

    // Empty objects
    group.bench_function("empty_objects", |b| {
        let original = json!({});
        let updated = json!({});
        b.iter(|| {
            let result = engine.detailed_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    // Identical objects
    group.bench_function("identical_large_objects", |b| {
        let (original, _) = generate_token_data(1000, 0.0);
        let updated = original.clone();
        b.iter(|| {
            let result = engine.detailed_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    // Primitive values
    group.bench_function("primitive_values", |b| {
        let original = json!("hello");
        let updated = json!("world");
        b.iter(|| {
            let result = engine.detailed_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    // Type changes
    group.bench_function("type_changes", |b| {
        let original = json!({"field": "string"});
        let updated = json!({"field": 42});
        b.iter(|| {
            let result = engine.detailed_diff(black_box(&original), black_box(&updated));
            black_box(result)
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_detailed_diff,
    bench_diff_functions,
    bench_nested_structures,
    bench_array_operations,
    bench_edge_cases
);
criterion_main!(benches);