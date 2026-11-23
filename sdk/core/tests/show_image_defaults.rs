// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Pins the `showImage` option defaults to the Figma Web POC. Standard dialog "Show preview"
//! defaults to false; Coach mark "Show cover image" defaults to true. No other component
//! nests either one, so there is no instance to pin.

use serde_json::Value;
use std::path::PathBuf;

fn option(component: &str, name: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!(
        "../../packages/design-data/components/{component}.json"
    ));
    let text = std::fs::read_to_string(&path).unwrap();
    let json: Value = serde_json::from_str(&text).unwrap();
    json["options"][name].clone()
}

#[test]
fn show_image_defaults_match_figma() {
    for (component, default) in [("standard-dialog", false), ("coach-mark", true)] {
        let opt = option(component, "showImage");
        assert_eq!(opt["type"], "boolean", "{component}");
        assert_eq!(opt["default"], default, "{component} showImage default");
        assert!(
            option(component, "hideImage").is_null(),
            "{component} hideImage"
        );
    }
}
