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
//! Pattern from rmux `crates/ratatui-rmux/tests/budget.rs`.
//! Enforces LOC caps, no async in render-path modules, and Message variant size.

use std::fs;
use std::path::Path;

const SRC_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src");

/// LOC limit for all `src/*.rs` files except the legacy `app.rs`.
const LOC_LIMIT: usize = 1000;

/// `app.rs` is the legacy App struct being retired. It hasn't been split yet
/// because it's still needed for backward-compat integration tests (write.rs etc).
/// This higher limit documents the known debt.
const APP_RS_LOC_LIMIT: usize = 1300;

fn count_lines(path: &Path) -> usize {
    fs::read_to_string(path)
        .unwrap_or_default()
        .lines()
        .count()
}

// ── LOC budget ────────────────────────────────────────────────────────────────

#[test]
fn no_source_file_exceeds_loc_limit() {
    let src = Path::new(SRC_DIR);
    let mut violations: Vec<String> = Vec::new();

    for entry in fs::read_dir(src).expect("src dir readable") {
        let entry = entry.expect("dir entry");
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("rs") {
            continue;
        }
        let filename = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
        let loc = count_lines(&path);
        let limit = if filename == "app.rs" { APP_RS_LOC_LIMIT } else { LOC_LIMIT };

        if loc > limit {
            violations.push(format!("{filename}: {loc} lines (limit {limit})"));
        }
    }

    assert!(
        violations.is_empty(),
        "Files exceeding LOC budget — split them:\n  {}",
        violations.join("\n  ")
    );
}

// ── No async in render-path modules ──────────────────────────────────────────

#[test]
fn no_async_in_view_rs() {
    let content = fs::read_to_string(Path::new(SRC_DIR).join("view.rs"))
        .expect("view.rs readable");
    assert!(!content.contains("async fn"), "no `async fn` in view.rs");
    assert!(!content.contains("tokio::"), "no tokio in view.rs");
}

#[test]
fn no_async_in_app_rs() {
    let content = fs::read_to_string(Path::new(SRC_DIR).join("app.rs"))
        .expect("app.rs readable");
    assert!(!content.contains("async fn"), "no `async fn` in app.rs");
    assert!(!content.contains("tokio::"), "no tokio in app.rs");
}

// ── Message variant size budget ───────────────────────────────────────────────

#[test]
fn message_variant_size_budget() {
    assert!(
        std::mem::size_of::<design_data_tui::Message>() <= 128,
        "Message is {} bytes — exceeds 128-byte budget; box large payloads",
        std::mem::size_of::<design_data_tui::Message>()
    );
}
