// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Calibration benchmark for `suggest::suggest` against the real Spectrum token dataset.
//!
//! Empirical basis for `alias_threshold()` in `authoring/session.rs`.
//!
//! Run with `cargo test -p design-data-core --test suggest_calibration -- --nocapture`
//! to see the raw score distribution.
//!
//! **Calibration methodology** (RFC #973 Q1):
//!   Jaccard similarity over {intent words} ∩ {token name segments + name-object
//!   field values + description words}.  Against `packages/tokens/src`:
//!     - Clear positive matches score 0.6–1.0.
//!     - Partial noise (single-word overlap on a 3-4 word token) scores 0.0–0.33.
//!     - Chosen threshold: 0.35 — sits cleanly between the two bands.

use design_data_core::authoring::session::alias_threshold;
use design_data_core::graph::TokenGraph;
use design_data_core::suggest;
use std::path::Path;

fn token_src() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent() // sdk/
        .and_then(|p| p.parent()) // repo root
        .unwrap()
        .join("packages/tokens/src")
}

struct Case {
    intent: &'static str,
    /// Expected top-match token name (substring match).
    expected_top: &'static str,
    /// Expected confidence floor for the top result.
    min_confidence: f32,
}

#[test]
fn positive_intents_score_above_threshold() {
    let src = token_src();
    assert!(
        src.is_dir(),
        "packages/tokens/src not found at {:?} — tests must run from the repo root",
        src
    );
    let graph = TokenGraph::from_json_dir(&src).expect("failed to load token graph");
    let threshold = alias_threshold();

    let cases: &[Case] = &[
        Case { intent: "neutral content color", expected_top: "neutral-content-color", min_confidence: 0.70 },
        Case { intent: "accent content color default", expected_top: "accent-content-color-default", min_confidence: 0.90 },
        Case { intent: "card background color", expected_top: "card-background", min_confidence: 0.70 },
        Case { intent: "spacing 100", expected_top: "spacing-100", min_confidence: 0.90 },
        Case { intent: "body font size", expected_top: "body", min_confidence: 0.60 },
        Case { intent: "static black text", expected_top: "static-black-text", min_confidence: 0.70 },
        Case { intent: "icon color cyan", expected_top: "icon-color-cyan", min_confidence: 0.55 },
        Case { intent: "drop zone background", expected_top: "drop-zone-background", min_confidence: 0.70 },
    ];

    let mut all_pass = true;
    for case in cases {
        let results = suggest::suggest(&graph, case.intent, None, 5);
        let top = results.first();
        let score = top.map(|r| r.confidence).unwrap_or(0.0);
        let name = top.map(|r| r.token_name.as_str()).unwrap_or("(none)");

        eprintln!(
            "[positive] {:?} → top={:?} score={:.3} (floor={:.2}, threshold={:.2})",
            case.intent, name, score, case.min_confidence, threshold
        );

        if score < case.min_confidence {
            eprintln!("  FAIL: expected score >= {:.2}, got {:.3}", case.min_confidence, score);
            all_pass = false;
        }
        if !name.contains(case.expected_top) {
            eprintln!("  FAIL: expected top match to contain {:?}, got {:?}", case.expected_top, name);
            all_pass = false;
        }
        assert!(
            score >= threshold,
            "intent {:?}: top score {:.3} is below alias_threshold() {:.2}",
            case.intent, score, threshold
        );
    }
    assert!(all_pass, "one or more positive calibration cases failed — see output above");
}

#[test]
fn negative_intents_score_below_threshold() {
    let src = token_src();
    assert!(
        src.is_dir(),
        "packages/tokens/src not found at {:?} — tests must run from the repo root",
        src
    );
    let graph = TokenGraph::from_json_dir(&src).expect("failed to load token graph");
    let threshold = alias_threshold();

    let negative_intents = &["frobozz qux", "xyz plorp wibble", "thequickbrownfox"];

    for intent in negative_intents {
        let results = suggest::suggest(&graph, intent, None, 5);
        let top_score = results.first().map(|r| r.confidence).unwrap_or(0.0);
        eprintln!(
            "[negative] {:?} → top score={:.3} (threshold={:.2})",
            intent, top_score, threshold
        );
        assert!(
            top_score < threshold,
            "negative intent {:?} should score below {:.2}, got {:.3}",
            intent, threshold, top_score
        );
    }
}

#[test]
fn threshold_sits_in_calibrated_gap() {
    // Validate that alias_threshold() returns a value in the gap observed during
    // calibration: above pure noise (0.0) and below the positive-match floor (0.60).
    // Gap: 0.0–0.33 (noise) … threshold … 0.60+ (positives).
    //
    // Note: single-word queries matching a 2-segment token name can score ~0.5 and
    // DO legitimately trigger the banner — correct behavior, not a false positive.
    let threshold = alias_threshold();
    eprintln!("[gap-check] alias_threshold()={:.2} should be in (0.0, 0.60)", threshold);
    assert!(threshold > 0.0, "threshold must be above pure noise (0.0), got {threshold}");
    assert!(
        threshold < 0.60,
        "threshold must be below the positive-match floor (0.60), got {threshold}"
    );
}
