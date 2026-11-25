// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A recipe `facets` clause never matches in a graph without the behavior contracts. Once any
//! shipped recipe reads `facets`, every test that loads the recipes must load the contracts too.

use std::path::PathBuf;

#[test]
fn test_graphs_that_load_recipes_load_contracts_once_a_recipe_reads_facets() {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let reads_facets = std::fs::read_dir(manifest.join("../../packages/design-data/visuals"))
        .unwrap()
        .map(|e| std::fs::read_to_string(e.unwrap().path()).unwrap())
        .any(|text| text.contains("\"facets\""));
    if !reads_facets {
        return;
    }
    let missing: Vec<String> = std::fs::read_dir(manifest.join("tests"))
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "rs"))
        .filter(|p| {
            let text = std::fs::read_to_string(p).unwrap();
            text.contains("load_spec_visuals")
                && !text.contains("with_behaviors_dir")
                && !text.contains("load_spec_behaviors")
        })
        .map(|p| p.file_name().unwrap().to_string_lossy().into_owned())
        .collect();
    assert!(
        missing.is_empty(),
        "these test graphs load recipes but not contracts (add `.with_behaviors_dir(...)`): {missing:?}"
    );
}
