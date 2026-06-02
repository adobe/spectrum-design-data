// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Layout breakpoint tests — verify the home screen renders correctly at key terminal sizes.
//!
//! These tests exist alongside the render tests in `render.rs` but are kept separate to
//! give layout concerns their own home and to keep `render.rs` under the file-length norms.
//!
//! ## Logo threshold
//! The logo is shown when the *active-view area* height >= LOGO_LINES + 1 + NON_LOGO_HEIGHT.
//! From `src/view.rs`: LOGO_LINES = 17, NON_LOGO_HEIGHT = 13, so threshold = 31 content rows.
//!
//! The active-view area is the terminal height minus 2 fixed rows (primer header + palette
//! prompt). So in **terminal** coordinates the logo appears when terminal_height >= 33.
//!
//! ## Verified sizes (terminal rows × cols)
//! | Size    | Content rows | Expectation                                       |
//! |---------|-------------|---------------------------------------------------|
//! | 120×36  | 34          | Spectrum/auto-demo target — logo + all UI visible |
//! | 80×24   | 22          | Standard small terminal — no logo, clean layout   |
//! | 80×33   | 31          | Exact threshold — logo present                    |
//! | 80×32   | 30          | One row below threshold — logo absent             |
//! | 10×5    | 3           | Narrow — must not panic                           |
//! | 1×33    | 31          | Very narrow at logo threshold height — must not panic |

mod common;
use common::{render_to_buffer, TEST_PRIMER};

use design_data_tui::Model;
use ratatui::buffer::Buffer;

// ── Helpers ────────────────────────────────────────────────────────────────────

/// Collect a single row of the buffer as a `String`.
fn row_str(buf: &Buffer, y: u16, w: u16) -> String {
    (0..w)
        .map(|x| buf.cell((x, y)).unwrap().symbol().to_string())
        .collect()
}

/// Return true if any row (excluding the primer header at y=0 and palette at y=h-1)
/// contains `needle`.
fn any_row_contains(buf: &Buffer, needle: &str, w: u16, h: u16) -> bool {
    (1..h.saturating_sub(1)).any(|y| row_str(buf, y, w).contains(needle))
}

// ── 120×36: Spectrum/auto-demo target ─────────────────────────────────────────

#[test]
fn spectrum_target_120x36_shows_logo_and_all_sections() {
    const W: u16 = 120;
    const H: u16 = 36;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);

    assert!(
        any_row_contains(&buf, "▀", W, H),
        "120×36: logo should be visible (threshold is 31 rows)"
    );
    assert!(
        any_row_contains(&buf, "Spectrum Design Data", W, H),
        "120×36: product name should be visible"
    );
    assert!(
        any_row_contains(&buf, ":validate", W, H),
        "120×36: command table should be visible"
    );
    // Primer arrow on the first row.
    assert_eq!(
        buf.cell((0, 0)).unwrap().symbol(),
        "▶",
        "120×36: primer arrow at (0,0)"
    );
    // Palette prompt row should be blank (palette closed).
    assert!(
        row_str(&buf, H - 1, W).trim().is_empty(),
        "120×36: palette row should be blank when closed"
    );
}

// ── 80×24: standard small terminal ────────────────────────────────────────────

#[test]
fn standard_80x24_no_logo_but_all_ui_present() {
    const W: u16 = 80;
    const H: u16 = 24;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);

    assert!(
        !any_row_contains(&buf, "▀", W, H),
        "80×24: logo should be hidden (only 24 rows; threshold is 31)"
    );
    assert!(
        any_row_contains(&buf, "Spectrum Design Data", W, H),
        "80×24: product name should still be visible"
    );
    assert!(
        any_row_contains(&buf, ">", W, H),
        "80×24: prompt cue should be visible"
    );
    assert_eq!(
        buf.cell((0, 0)).unwrap().symbol(),
        "▶",
        "80×24: primer arrow at (0,0)"
    );
}

// ── 80×33: exact logo threshold in terminal coordinates ───────────────────────

#[test]
fn logo_threshold_exact_terminal_height_33_shows_logo() {
    // Content rows = terminal_height - 2 (primer + palette) = 33 - 2 = 31.
    // The logo condition `content_height >= 31` is true at exactly 31 content rows.
    const W: u16 = 80;
    const H: u16 = 33;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);

    assert!(
        any_row_contains(&buf, "▀", W, H),
        "33 terminal rows (31 content): logo should appear at the exact threshold"
    );
    assert!(
        any_row_contains(&buf, "Spectrum Design Data", W, H),
        "33 terminal rows: product name should be visible"
    );
}

// ── 80×32: one row below threshold ────────────────────────────────────────────

#[test]
fn one_below_threshold_terminal_height_32_hides_logo() {
    // Content rows = 32 - 2 = 30. Condition `content_height >= 31` is false.
    const W: u16 = 80;
    const H: u16 = 32;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);

    assert!(
        !any_row_contains(&buf, "▀", W, H),
        "32 terminal rows (30 content): logo should be hidden (one below the threshold)"
    );
    assert!(
        any_row_contains(&buf, "Spectrum Design Data", W, H),
        "32 terminal rows: product name should still appear without the logo"
    );
    assert!(
        any_row_contains(&buf, ">", W, H),
        "32 terminal rows: prompt cue should still appear"
    );
}

// ── Primer is always on row 0 ──────────────────────────────────────────────────

#[test]
fn primer_row_is_always_row_zero_at_120x36() {
    const W: u16 = 120;
    const H: u16 = 36;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    let row = row_str(&buf, 0, W);
    assert!(
        row.contains(TEST_PRIMER),
        "120×36: primer row at y=0 should contain the primer text; got: {row}"
    );
}

#[test]
fn primer_row_is_always_row_zero_at_80x24() {
    const W: u16 = 80;
    const H: u16 = 24;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    let row = row_str(&buf, 0, W);
    assert!(
        row.contains(TEST_PRIMER),
        "80×24: primer row at y=0 should contain the primer text; got: {row}"
    );
}

// ── Panic safety at unusual sizes ────────────────────────────────────────────

#[test]
fn does_not_panic_at_10x5() {
    let mut model = Model::new();
    render_to_buffer(&mut model, 10, 5);
}

#[test]
fn does_not_panic_at_width_1_logo_threshold_height() {
    // Very narrow (1 col) at logo-threshold terminal height (33) — no overflow panic.
    let mut model = Model::new();
    render_to_buffer(&mut model, 1, 33);
}
