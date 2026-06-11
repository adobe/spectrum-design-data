// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token suggestion — rank existing tokens by intent-string similarity.
//!
//! The "reuse first" principle: before creating a new token, surface existing
//! tokens that likely already satisfy the intent. Supports the TUI wizard
//! Screen 1 banner and the `suggest_token` operation in the agent-readable surface.

use std::collections::HashSet;
use std::path::PathBuf;

use serde_json::Value;

use crate::graph::{Layer, TokenGraph, TokenRecord};
use crate::naming::extract_legacy_key;

/// A ranked suggestion result.
#[derive(Debug, Clone)]
pub struct SuggestionResult {
    /// UUID of the suggested token, if present.
    pub token_uuid: Option<String>,
    /// Token key (its name in the source file).
    pub token_name: String,
    /// Source file path.
    pub file: PathBuf,
    /// Cascade layer.
    pub layer: Layer,
    /// Similarity score in 0.0–1.0 (higher = more relevant).
    pub confidence: f32,
    /// The token's name object, if any.
    pub name_object: Option<Value>,
    /// The token's raw value, if any.
    pub value: Option<Value>,
}

impl SuggestionResult {
    /// Human-readable label for display in the wizard suggestion list.
    ///
    /// Derives the legacy name from the token's `name` object when present —
    /// the same derivation used by the graph loader to populate
    /// `legacy_name_index`. Falls back to the raw graph key (`token_name`)
    /// when no name object is available (e.g. object-format tokens whose graph
    /// key is already a readable name like `accent-background-color-default`).
    pub fn display_name(&self) -> String {
        self.name_object
            .as_ref()
            .and_then(extract_legacy_key)
            .unwrap_or_else(|| self.token_name.clone())
    }
}

/// Suggest existing tokens that match the given `intent` string.
///
/// Scores each token in the graph using Jaccard similarity between the
/// intent word-set and the token's bag of words (key segments + name-object
/// field values + description text).  Tokens with `property` field that
/// contradicts `property_hint` (if supplied) receive a score of zero.
///
/// Returns up to `limit` results, sorted by score descending.
pub fn suggest<'a>(
    graph: &'a TokenGraph,
    intent: &str,
    property_hint: Option<&str>,
    limit: usize,
) -> Vec<SuggestionResult> {
    let intent_words = tokenize(intent);
    if intent_words.is_empty() {
        return Vec::new();
    }

    let mut scored: Vec<(f32, &'a TokenRecord)> = graph
        .tokens
        .values()
        .filter_map(|tok| {
            let score = score_token(tok, &intent_words, property_hint);
            if score > 0.0 {
                Some((score, tok))
            } else {
                None
            }
        })
        .collect();

    // Sort descending by score, then ascending by name for determinism.
    scored.sort_by(|(s1, t1), (s2, t2)| {
        s2.partial_cmp(s1)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| t1.name.cmp(&t2.name))
    });

    scored
        .into_iter()
        .take(limit)
        .map(|(confidence, tok)| {
            let name_object =
                tok.raw.get("name").and_then(
                    |v| {
                        if v.is_object() {
                            Some(v.clone())
                        } else {
                            None
                        }
                    },
                );
            let value = tok.raw.get("value").cloned();
            SuggestionResult {
                token_uuid: tok.uuid.clone(),
                token_name: tok.name.clone(),
                file: tok.file.clone(),
                layer: tok.layer,
                confidence,
                name_object,
                value,
            }
        })
        .collect()
}

/// Compute a 0.0–1.0 Jaccard score for a single token against the intent.
///
/// Returns 0.0 when:
/// - `property_hint` is set and the token's `name.property` does not match it.
/// - There is no word overlap at all.
fn score_token(
    tok: &TokenRecord,
    intent_words: &HashSet<String>,
    property_hint: Option<&str>,
) -> f32 {
    // Property hint filter: hard-exclude tokens whose name.property doesn't match.
    if let Some(hint) = property_hint {
        let token_property = tok
            .raw
            .get("name")
            .and_then(|n| n.get("property"))
            .and_then(|v| v.as_str());
        match token_property {
            Some(p) if !property_matches(p, hint) => return 0.0,
            None => return 0.0,
            _ => {}
        }
    }

    let token_words = token_word_set(tok);
    jaccard(intent_words, &token_words)
}

/// Whether a token's `property` field satisfies a hint string.
/// Accepts exact match or suffix match (e.g. hint "color" matches "icon-color").
fn property_matches(property: &str, hint: &str) -> bool {
    property == hint || property.contains(hint)
}

/// Build a word-bag from a token: key segments + name-object field values + description.
fn token_word_set(tok: &TokenRecord) -> HashSet<String> {
    let mut words = HashSet::new();

    // Token key segments: "accent-background-color-default" → {accent, background, color, default}.
    for w in tokenize(&tok.name) {
        words.insert(w);
    }

    // Name-object field values only (not keys — "property", "colorFamily", etc. are
    // schema vocab, not semantic signal, and including them inflates every token's bag).
    if let Some(name_obj) = tok.raw.get("name").and_then(|v| v.as_object()) {
        for v in name_obj.values() {
            if let Some(s) = v.as_str() {
                for w in tokenize(s) {
                    words.insert(w);
                }
            }
        }
    }

    // Optional description field.
    if let Some(desc) = tok.raw.get("description").and_then(|v| v.as_str()) {
        for w in tokenize(desc) {
            words.insert(w);
        }
    }

    words
}

/// Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0.0 on empty sets.
fn jaccard(a: &HashSet<String>, b: &HashSet<String>) -> f32 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let intersection = a.intersection(b).count() as f32;
    let union = a.union(b).count() as f32;
    intersection / union
}

/// Split a string into lowercase words, splitting on any non-alphanumeric character.
pub(crate) fn tokenize(s: &str) -> HashSet<String> {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty() && w.len() > 1)
        .map(|w| w.to_lowercase())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::TokenGraph;
    use serde_json::json;
    use std::path::PathBuf;

    fn make_graph(tokens: Vec<(&str, serde_json::Value)>) -> TokenGraph {
        let pairs: Vec<(String, PathBuf, serde_json::Value)> = tokens
            .into_iter()
            .map(|(key, v)| (key.to_string(), PathBuf::from("tokens.json"), v))
            .collect();
        TokenGraph::from_pairs(pairs)
    }

    #[test]
    fn suggest_returns_empty_for_blank_intent() {
        let g = make_graph(vec![(
            "accent-bg",
            json!({ "name": { "property": "background-color" }, "value": "rgb(0,0,0)" }),
        )]);
        let results = suggest(&g, "   ", None, 10);
        assert!(results.is_empty());
    }

    #[test]
    fn suggest_ranks_matching_token_above_unrelated() {
        let g = make_graph(vec![
            (
                "accent-background-color-default",
                json!({ "name": { "property": "background-color", "variant": "accent" } }),
            ),
            (
                "font-size-100",
                json!({ "name": { "property": "font-size", "scaleIndex": 100 } }),
            ),
        ]);

        let results = suggest(&g, "accent background", None, 10);
        assert!(!results.is_empty());
        assert_eq!(results[0].token_name, "accent-background-color-default");
    }

    #[test]
    fn suggest_filters_by_property_hint() {
        let g = make_graph(vec![
            (
                "accent-background-color",
                json!({ "name": { "property": "background-color" } }),
            ),
            (
                "accent-border-color",
                json!({ "name": { "property": "border-color" } }),
            ),
        ]);

        let results = suggest(&g, "accent", Some("background-color"), 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].token_name, "accent-background-color");
    }

    #[test]
    fn suggest_respects_limit() {
        // Collect keys into a Vec first so their lifetimes outlast the make_graph call.
        let keys: Vec<String> = (1..=10).map(|i| format!("color-{i}")).collect();
        let tokens: Vec<(&str, serde_json::Value)> = keys
            .iter()
            .enumerate()
            .map(|(i, k)| {
                (
                    k.as_str(),
                    json!({ "name": { "property": "color", "scaleIndex": i + 1 } }),
                )
            })
            .collect();
        let g = make_graph(tokens);

        let results = suggest(&g, "color", None, 3);
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn suggest_carries_uuid_and_value() {
        let g = make_graph(vec![(
            "my-color",
            json!({
                "name": { "property": "color" },
                "uuid": "aaaaaaaa-0001-4001-8001-000000000001",
                "value": "rgb(0, 0, 0)"
            }),
        )]);

        let results = suggest(&g, "color", None, 1);
        assert_eq!(
            results[0].token_uuid.as_deref(),
            Some("aaaaaaaa-0001-4001-8001-000000000001")
        );
        assert_eq!(
            results[0].value.as_ref().and_then(|v| v.as_str()),
            Some("rgb(0, 0, 0)")
        );
    }

    // ── display_name() ────────────────────────────────────────────────────────

    fn make_suggestion(token_name: &str, name_object: Option<serde_json::Value>) -> SuggestionResult {
        SuggestionResult {
            token_uuid: None,
            token_name: token_name.to_string(),
            file: PathBuf::from("tokens/color-aliases.tokens.json"),
            layer: crate::graph::Layer::Foundation,
            confidence: 0.18,
            name_object,
            value: None,
        }
    }

    #[test]
    fn display_name_derives_readable_name_from_color_domain_name_object() {
        // Cascade token: graph key is file:index, but name_object is a color-domain object.
        let s = make_suggestion(
            "tokens/color-aliases.tokens.json:0",
            Some(json!({
                "variant": "accent",
                "colorFamily": "background-color",
                "scaleIndex": 100
            })),
        );
        assert_eq!(s.display_name(), "accent-background-color-100");
    }

    #[test]
    fn display_name_derives_readable_name_from_component_name_object() {
        // Cascade token with property/component/state name object.
        let s = make_suggestion(
            "tokens/layout.tokens.json:7",
            Some(json!({
                "property": "background-color",
                "component": "button",
                "state": "hover"
            })),
        );
        assert_eq!(s.display_name(), "button-background-color-hover");
    }

    #[test]
    fn display_name_falls_back_to_token_name_when_no_name_object() {
        // Object-format token: graph key is already readable; name_object is None.
        let s = make_suggestion("accent-background-color-default", None);
        assert_eq!(s.display_name(), "accent-background-color-default");
    }

    #[test]
    fn display_name_falls_back_to_token_name_when_name_object_is_not_object() {
        // Defensive: name_object present but not a valid name structure.
        let s = make_suggestion(
            "tokens/misc.tokens.json:2",
            Some(json!("some-legacy-string-key")),
        );
        // extract_legacy_key handles string escape hatch: returns the string itself.
        assert_eq!(s.display_name(), "some-legacy-string-key");
    }

    #[test]
    fn suggest_returns_zero_confidence_tokens_excluded() {
        let g = make_graph(vec![
            (
                "accent-color",
                json!({ "name": { "property": "color", "variant": "accent" } }),
            ),
            (
                "typography-size",
                json!({ "name": { "property": "font-size" } }),
            ),
        ]);

        // "border" has no overlap with either token.
        let results = suggest(&g, "border", None, 10);
        assert!(results.is_empty(), "no match should mean empty results");
    }
}
