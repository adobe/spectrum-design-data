// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A scale-pinned illustrated-message font-size record names the token of its own scale, not
//! the concept id that holds both scales: a concept id makes the spec sheet show the desktop
//! value on the mobile row.

use std::path::PathBuf;

use serde_json::Value;

fn read(rel: &str) -> Vec<Value> {
    let p = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../packages/design-data")
        .join(rel);
    serde_json::from_str(&std::fs::read_to_string(p).expect("read")).expect("parse")
}

#[test]
fn scale_pinned_font_size_records_name_the_token_of_their_scale() {
    let mut tokens = Vec::new();
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data/tokens");
    for e in std::fs::read_dir(dir).expect("tokens dir").flatten() {
        if let Ok(s) = std::fs::read_to_string(e.path()) {
            if let Ok(Value::Array(a)) = serde_json::from_str::<Value>(&s) {
                tokens.extend(a);
            }
        }
    }
    let mut checked = 0;
    for r in read("relationships/illustrated-message.json") {
        let scale = r.pointer("/scope/options/scale").and_then(Value::as_str);
        let (Some(scale), Some(rf)) = (scale, r.get("$ref").and_then(Value::as_str)) else {
            continue;
        };
        if r.pointer("/scope/property").and_then(Value::as_str) != Some("font-size")
            || r.get("lifecycle").is_some()
        {
            continue;
        }
        let Some(t) = tokens
            .iter()
            .find(|t| t.get("uuid").and_then(Value::as_str) == Some(rf))
        else {
            continue; // a record target (the description records): not a token pin
        };
        let tok_scale = t.pointer("/name/scale").and_then(Value::as_str);
        assert_eq!(tok_scale, Some(scale), "record {} pins {scale}", r["uuid"]);
        checked += 1;
    }
    assert_eq!(checked, 12, "the 12 title font-size records");
}
