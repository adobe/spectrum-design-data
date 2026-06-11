// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! fzf-style subsequence matching for token names (GH #1079).
//!
//! [`subsequence_score`] scores a needle against a haystack, returning `None`
//! when the needle is not a subsequence of the haystack.

#[cfg(test)]
mod tests {
    use design_data_core::query::subsequence_score;

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
