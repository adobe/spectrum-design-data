// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Runs the shared option-constraint cases through the Rust model. The JS port in
//! `sdk/plugins/site/assets/constraints.js` runs the same file.

use std::path::PathBuf;

use design_data_core::constraints::{read_constraints, Combination};
use serde_json::{json, Value};

fn read(path: PathBuf) -> Value {
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
    serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

#[test]
fn shared_cases_match() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let cases = read(root.join("tests/fixtures/option-constraint-cases.json"));
    let cases = cases["cases"].as_array().expect("cases array");
    assert!(!cases.is_empty());

    for case in cases {
        let name = case["name"].as_str().unwrap();
        let component = match case["component"].as_str() {
            Some(c) => read(root.join(format!("../../packages/design-data/components/{c}.json"))),
            None => json!({ "constraints": case["constraints"] }),
        };
        let combo: Combination = case["combo"]
            .as_object()
            .unwrap()
            .iter()
            .map(|(k, v)| (k.clone(), if v.is_null() { None } else { Some(v.clone()) }))
            .collect();
        let got: Vec<u64> = read_constraints(&component)
            .into_iter()
            .filter(|(_, c)| c.excludes(&combo))
            .map(|(i, _)| i as u64)
            .collect();
        let expected: Vec<u64> = case["expected"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_u64().unwrap())
            .collect();
        assert_eq!(got, expected, "{name}");
    }
}
