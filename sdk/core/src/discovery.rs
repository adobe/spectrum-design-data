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
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write_file(dir: &std::path::Path, name: &str, content: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn single_json_file_returns_itself() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let p = write_file(tmp.path(), "token.json", "{}");
        let result = discover_json_files(&p).unwrap();
        assert_eq!(result, vec![p]);
    }

    #[test]
    fn single_non_json_file_returns_empty() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let p = write_file(tmp.path(), "readme.txt", "hello");
        let result = discover_json_files(&p).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn nonexistent_path_returns_not_found_error() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let missing = tmp.path().join("does-not-exist");
        let err = discover_json_files(&missing).unwrap_err();
        assert_eq!(err.kind(), std::io::ErrorKind::NotFound);
    }

    #[test]
    fn directory_returns_only_json_files_sorted() {
        let tmp = tempfile::tempdir().expect("tempdir");
        write_file(tmp.path(), "b.json", "{}");
        write_file(tmp.path(), "a.json", "{}");
        write_file(tmp.path(), "skip.txt", "not json");
        let result = discover_json_files(tmp.path()).unwrap();
        // Two JSON files, sorted alphabetically.
        assert_eq!(result.len(), 2);
        assert!(result[0].ends_with("a.json"));
        assert!(result[1].ends_with("b.json"));
    }

    #[test]
    fn empty_directory_returns_empty_vec() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let result = discover_json_files(tmp.path()).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn recurses_into_subdirectories() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let sub = tmp.path().join("sub");
        fs::create_dir(&sub).unwrap();
        write_file(tmp.path(), "top.json", "{}");
        write_file(&sub, "nested.json", "{}");
        let result = discover_json_files(tmp.path()).unwrap();
        assert_eq!(result.len(), 2);
    }
}
