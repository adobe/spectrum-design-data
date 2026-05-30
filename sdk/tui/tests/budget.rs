// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Architectural budget tests (GH #1018).
//!
//! Enforces the three invariants from the rmux `tests/budget.rs` precedent:
//!
//! 1. **LOC cap**: no `src/**/*.rs` file exceeds 800 lines.
//! 2. **No async in render path**: all `src/view*.rs` files must not contain
//!    `async fn` or `tokio::`. The test scans automatically — no list to maintain.
//! 3. **Message variant size**: `size_of::<Message>() <= 128` bytes.
//!
//! The Message size is also checked inline in `src/message.rs`; the budget test
//! provides the authoritative, externally-visible assertion alongside the other
//! architectural invariants.

use std::fs;
use std::path::{Path, PathBuf};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn collect_rs(dir: &Path, out: &mut Vec<PathBuf>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_rs(&path, out);
            } else if path.extension().map_or(false, |e| e == "rs") {
                out.push(path);
            }
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/// No source file in `src/` may exceed 800 lines.
///
/// The 800-line cap keeps modules focused and reviewable. Files that grow past
/// this threshold should be split into cohesive submodules (see #1018).
#[test]
fn no_source_file_exceeds_loc_cap() {
    const CAP: usize = 800;

    let src_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut files: Vec<PathBuf> = Vec::new();
    collect_rs(&src_dir, &mut files);
    files.sort(); // deterministic failure order

    let violations: Vec<String> = files
        .iter()
        .filter_map(|path| {
            let content = fs::read_to_string(path).unwrap_or_default();
            let lines = content.lines().count();
            if lines > CAP {
                let rel = path
                    .strip_prefix(env!("CARGO_MANIFEST_DIR"))
                    .unwrap_or(path);
                Some(format!("{}: {} lines (cap {})", rel.display(), lines, CAP))
            } else {
                None
            }
        })
        .collect();

    assert!(
        violations.is_empty(),
        "Source files exceeding the {CAP}-LOC budget:\n{}",
        violations.join("\n")
    );
}

/// Render-path modules (`view*.rs`) must not contain `async fn` or `tokio::`.
///
/// Async code in the render path would block the draw loop and cause frame stutter.
/// This test scans all `src/view*.rs` files automatically, so new render modules
/// (e.g. `view_wizard.rs`) are covered without updating any list.
#[test]
fn no_async_in_render_path() {
    let src_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");

    let render_files: Vec<PathBuf> = fs::read_dir(&src_dir)
        .expect("src dir readable")
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with("view") && n.ends_with(".rs"))
                .unwrap_or(false)
        })
        .collect();

    assert!(
        !render_files.is_empty(),
        "no view*.rs files found in src/ — check CARGO_MANIFEST_DIR"
    );

    for path in &render_files {
        let name = path.file_name().unwrap().to_string_lossy();
        let content = fs::read_to_string(path).unwrap_or_else(|_| panic!("could not read {name}"));
        assert!(
            !content.contains("async fn"),
            "{name} must not contain `async fn` (render path must stay synchronous)"
        );
        assert!(
            !content.contains("tokio::"),
            "{name} must not use `tokio::` (render path must stay synchronous)"
        );
    }
}

/// `Message` variants must fit within 128 bytes.
///
/// Large `Message` variants slow down the event loop by bloating the enum's
/// stack size. Box large payloads instead (see module doc in `src/message.rs`).
#[test]
fn message_size_within_budget() {
    const MAX_BYTES: usize = 128;
    let actual = std::mem::size_of::<design_data_tui::Message>();
    assert!(
        actual <= MAX_BYTES,
        "Message is {actual} bytes — exceeds the {MAX_BYTES}-byte budget. \
         Box large payloads to reduce variant size (see src/message.rs)."
    );
}
