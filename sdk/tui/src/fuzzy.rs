// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! fzf-style subsequence matching for the `/` fuzzy-find palette (GH #1079).
//!
//! [`subsequence_score`] scores a needle against a haystack, returning `None`
//! when the needle is not a subsequence of the haystack. [`rank_token_rows`]
//! applies that scorer across every token's display name and returns the
//! matching [`QueryRow`]s ranked best-first, ready to drop into a `QueryView`.

use design_data_core::diff::display_name;
use design_data_core::graph::TokenGraph;
pub use design_data_core::query::subsequence_score;

use crate::app_views::QueryRow;

/// Rank every token in `graph` against `query`, returning matching rows best-first.
///
/// An empty (or whitespace-only) query returns all tokens sorted by name. A
/// non-empty query keeps only tokens whose display name contains `query` as a
/// subsequence, sorted by descending score and then name for stable ordering.
pub fn rank_token_rows(graph: &TokenGraph, query: &str) -> Vec<QueryRow> {
    let q = query.trim();
    if q.is_empty() {
        let mut rows: Vec<QueryRow> = graph.tokens.values().map(QueryRow::from_record).collect();
        rows.sort_by(|a, b| a.name.cmp(&b.name));
        return rows;
    }

    let mut scored: Vec<(i32, QueryRow)> = graph
        .tokens
        .values()
        .filter_map(|t| {
            let name = display_name(t);
            subsequence_score(&name, q).map(|s| (s, QueryRow::from_record(t)))
        })
        .collect();
    scored.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.name.cmp(&b.1.name)));
    scored.into_iter().map(|(_, row)| row).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_needle_matches_with_zero_score() {
        assert_eq!(subsequence_score("button-background", ""), Some(0));
    }

    #[test]
    fn subsequence_matches_across_word_boundaries() {
        // b-t-n from "button", b-g from "background".
        assert!(subsequence_score("button-background", "btnbg").is_some());
    }

    #[test]
    fn non_subsequence_returns_none() {
        assert_eq!(subsequence_score("button-background", "xyz"), None);
        // Right characters, wrong order.
        assert_eq!(subsequence_score("abc", "cba"), None);
    }

    #[test]
    fn matching_is_case_insensitive() {
        assert!(subsequence_score("Button-Background", "btn").is_some());
        assert!(subsequence_score("button-background", "BTN").is_some());
    }

    #[test]
    fn consecutive_run_outscores_scattered_match() {
        // Same characters, no boundary differences (no separators): a consecutive
        // run ("xbackx") must outscore the scattered spelling ("xbxaxcxkx").
        let tight = subsequence_score("xbackx", "back").unwrap();
        let loose = subsequence_score("xbxaxcxkx", "back").unwrap();
        assert!(tight > loose, "tight {tight} should beat loose {loose}");
    }

    #[test]
    fn boundary_match_outscores_mid_word_match() {
        let boundary = subsequence_score("color-accent", "a").unwrap();
        let mid_word = subsequence_score("character", "a").unwrap();
        assert!(
            boundary > mid_word,
            "boundary {boundary} should beat mid-word {mid_word}"
        );
    }
}
