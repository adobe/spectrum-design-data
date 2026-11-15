// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Every relationship record committed in this repository has a `scope.options` shape the
//! engine accepts. `TokenGraph::load_spec_relationships` refuses a shape it does not understand
//! (see `unsupported_scope_shape` in `core/src/graph.rs`), so a new kind of value in the data
//! fails here before it can break `validate` for everyone.

use std::path::PathBuf;

use design_data_core::graph::TokenGraph;

fn repo(path: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join(path)
}

#[test]
fn foundation_relationships_load() {
    let records = TokenGraph::load_spec_relationships(&repo("packages/design-data/relationships"))
        .expect("foundation relationships load");
    assert!(records.len() > 1000, "{}", records.len());
}

#[test]
fn platform_relationships_load() {
    let dir = repo("platforms/ios/extensions/relationships");
    if dir.is_dir() {
        TokenGraph::load_spec_relationships(&dir).expect("platform relationships load");
    }
}
