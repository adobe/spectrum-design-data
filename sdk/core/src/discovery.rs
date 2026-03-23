// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Discover JSON files under a path (recursive).

use std::path::{Path, PathBuf};

use walkdir::WalkDir;

/// All `*.json` files under `root`, sorted for stable output.
pub fn discover_json_files(root: &Path) -> std::io::Result<Vec<PathBuf>> {
    if root.is_file() {
        if root.extension().and_then(|e| e.to_str()) == Some("json") {
            return Ok(vec![root.to_path_buf()]);
        }
        return Ok(vec![]);
    }

    if !root.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("path does not exist: {}", root.display()),
        ));
    }

    let mut out = Vec::new();
    for entry in WalkDir::new(root).follow_links(false).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let p = entry.path();
        if p.extension().and_then(|e| e.to_str()) == Some("json") {
            out.push(p.to_path_buf());
        }
    }
    out.sort();
    Ok(out)
}
