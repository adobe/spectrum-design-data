// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::path::Path;

fn main() {
    let pkg_json =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data/package.json");

    println!("cargo:rerun-if-changed={}", pkg_json.display());

    let raw = std::fs::read_to_string(&pkg_json)
        .unwrap_or_else(|e| panic!("build.rs: cannot read {}: {e}", pkg_json.display()));

    // Minimal extraction — avoids pulling serde_json into build deps.
    let version = raw
        .lines()
        .find_map(|line| {
            let trimmed = line.trim();
            trimmed
                .strip_prefix("\"version\":")
                .map(|rest| rest.trim().trim_matches(['"', ',']).to_owned())
        })
        .unwrap_or_else(|| panic!("build.rs: no \"version\" field in {}", pkg_json.display()));

    println!("cargo:rustc-env=DESIGN_DATA_VERSION={version}");
}
