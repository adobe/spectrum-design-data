// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Query filter engine — parse and evaluate filter expressions against tokens.
//!
//! Implements the query notation defined in `spec/query.md`: `key=value` pairs
//! with `,` (AND), `|` (OR), `!=` (negation), and `*` (glob wildcard).

use std::collections::HashMap;

use crate::graph::{TokenGraph, TokenRecord};
use crate::CoreError;

// ── Allowed keys (per spec) ─────────────────────────────────────────────────

/// Keys that may appear in filter expressions.
pub(crate) const ALLOWED_KEYS: &[&str] = &[
    "property",
    "component",
    "variant",
    "state",
    "colorScheme",
    "scale",
    "contrast",
    "uuid",
    "$schema",
];

/// Return the list of keys that may appear in filter expressions.
///
/// Exposed so that the wasm surface can return the canonical set dynamically
/// rather than duplicating it in JavaScript.
pub fn indexed_fields() -> &'static [&'static str] {
    ALLOWED_KEYS
}

/// Keys resolved from `raw["name"][key]` (name-object fields).
const NAME_OBJECT_KEYS: &[&str] = &[
    "property",
    "component",
    "variant",
    "state",
    "colorScheme",
    "scale",
    "contrast",
];

// ── AST types ───────────────────────────────────────────────────────────────

/// A parsed filter expression.
#[derive(Debug, Clone)]
pub struct TokenFilter {
    expr: FilterExpr,
}

impl TokenFilter {
    /// If this filter is exactly one `key=value` equality condition (no `,`,
    /// `|`, `!=`, or `*`), return `(key, value)`. Used to choose the index-backed
    /// fast path in [`filter_with_index`].
    fn single_equality(&self) -> Option<(&str, &str)> {
        let FilterExpr::Or(alternatives) = &self.expr else {
            return None;
        };
        let [group] = alternatives.as_slice() else {
            return None;
        };
        let [cond] = group.as_slice() else {
            return None;
        };
        if cond.op != Operator::Eq || cond.value.contains('*') {
            return None;
        }
        Some((&cond.key, &cond.value))
    }
}

#[derive(Debug, Clone)]
enum FilterExpr {
    /// Universal match (empty expression).
    All,
    /// `|`-separated alternatives.
    Or(Vec<Vec<Condition>>),
}

/// Comparison operator.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Operator {
    Eq,
    NotEq,
}

/// A single `key=value` or `key!=value` condition.
#[derive(Debug, Clone)]
struct Condition {
    key: String,
    op: Operator,
    value: String,
}

// ── Parser ──────────────────────────────────────────────────────────────────

/// Parse a filter expression string into a `TokenFilter`.
///
/// Returns `CoreError` for syntax errors or unknown keys.
pub fn parse(input: &str) -> Result<TokenFilter, CoreError> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Ok(TokenFilter {
            expr: FilterExpr::All,
        });
    }

    // Split on `|` first (OR — lower precedence).
    let or_parts: Vec<&str> = split_top_level(trimmed, '|');
    let mut alternatives = Vec::new();

    for or_part in or_parts {
        let and_parts: Vec<&str> = split_top_level(or_part.trim(), ',');
        let mut conditions = Vec::new();
        for part in and_parts {
            conditions.push(parse_condition(part.trim())?);
        }
        alternatives.push(conditions);
    }

    Ok(TokenFilter {
        expr: FilterExpr::Or(alternatives),
    })
}

/// Split a string on a delimiter, respecting that we don't have nesting.
fn split_top_level(s: &str, delim: char) -> Vec<&str> {
    s.split(delim).collect()
}

/// Parse a single `key=value` or `key!=value` condition.
fn parse_condition(s: &str) -> Result<Condition, CoreError> {
    // Try `!=` first (longer operator).
    if let Some(pos) = s.find("!=") {
        let key = s[..pos].trim().to_string();
        let value = s[pos + 2..].trim().to_string();
        validate_key(&key)?;
        return Ok(Condition {
            key,
            op: Operator::NotEq,
            value,
        });
    }
    // Then `=`.
    if let Some(pos) = s.find('=') {
        let key = s[..pos].trim().to_string();
        let value = s[pos + 1..].trim().to_string();
        validate_key(&key)?;
        return Ok(Condition {
            key,
            op: Operator::Eq,
            value,
        });
    }
    Err(CoreError::QueryParse(format!(
        "invalid condition (missing operator): {s:?}"
    )))
}

/// Validate that a key is in the allowed set.
fn validate_key(key: &str) -> Result<(), CoreError> {
    if key.is_empty() {
        return Err(CoreError::QueryParse("empty key".to_string()));
    }
    if ALLOWED_KEYS.contains(&key) {
        return Ok(());
    }
    Err(CoreError::QueryParse(format!(
        "unknown key {key:?}; allowed keys are: {}",
        ALLOWED_KEYS.join(", ")
    )))
}

// ── Filter evaluation ───────────────────────────────────────────────────────

/// Filter tokens in a graph that match the given expression.
///
/// Returns references to matching `TokenRecord`s, sorted by name for
/// deterministic output.
pub fn filter<'a>(graph: &'a TokenGraph, expr: &TokenFilter) -> Vec<&'a TokenRecord> {
    let mut results: Vec<&TokenRecord> = graph
        .tokens
        .values()
        .filter(|t| matches_expr(&t.raw, &expr.expr))
        .collect();
    results.sort_by(|a, b| a.name.cmp(&b.name));
    results
}

/// Evaluate a filter expression against a token's raw JSON.
fn matches_expr(raw: &serde_json::Value, expr: &FilterExpr) -> bool {
    match expr {
        FilterExpr::All => true,
        FilterExpr::Or(alternatives) => alternatives
            .iter()
            .any(|and_group| and_group.iter().all(|cond| matches_condition(raw, cond))),
    }
}

/// Evaluate a single condition against a token's raw JSON.
fn matches_condition(raw: &serde_json::Value, cond: &Condition) -> bool {
    let field_value = resolve_key(raw, &cond.key);

    match (&cond.op, field_value) {
        (Operator::Eq, Some(actual)) => glob_match(&cond.value, &actual),
        (Operator::Eq, None) => false,
        (Operator::NotEq, Some(actual)) => !glob_match(&cond.value, &actual),
        (Operator::NotEq, None) => true, // Missing field satisfies !=
    }
}

/// Resolve a query key to the field value in a token's raw JSON.
pub(crate) fn resolve_key(raw: &serde_json::Value, key: &str) -> Option<String> {
    if NAME_OBJECT_KEYS.contains(&key) {
        raw.get("name")
            .and_then(|n| n.get(key))
            .and_then(|v| v.as_str())
            .map(String::from)
    } else if key == "uuid" {
        raw.get("uuid").and_then(|v| v.as_str()).map(String::from)
    } else if key == "$schema" {
        raw.get("$schema")
            .and_then(|v| v.as_str())
            .map(String::from)
    } else {
        None
    }
}

// ── Glob matching ───────────────────────────────────────────────────────────

/// Simple glob matching: `*` matches zero or more characters.
/// Case-sensitive, per spec.
fn glob_match(pattern: &str, text: &str) -> bool {
    // No wildcards → exact match.
    if !pattern.contains('*') {
        return pattern == text;
    }

    let parts: Vec<&str> = pattern.split('*').collect();
    let mut pos = 0;

    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }
        match text[pos..].find(part) {
            Some(found) => {
                // First segment must match at the start.
                if i == 0 && found != 0 {
                    return false;
                }
                pos += found + part.len();
            }
            None => return false,
        }
    }

    // If pattern doesn't end with *, text must be fully consumed.
    if !pattern.ends_with('*') {
        return pos == text.len();
    }

    true
}

// ── Secondary index (#783) ──────────────────────────────────────────────────

/// A prebuilt secondary index: `field -> value -> graph keys`.
///
/// Accelerates single-field equality queries from an O(n) scan over every token
/// to an O(matches) lookup. Built once from a [`TokenGraph`] (or hydrated from
/// the cache's multimap tables) and reused across queries.
#[derive(Debug, Clone, Default)]
pub struct TokenIndex {
    by_field: HashMap<String, HashMap<String, Vec<String>>>,
}

impl TokenIndex {
    /// Build an index over every queryable field of every token in `graph`.
    pub fn build(graph: &TokenGraph) -> Self {
        let mut index = TokenIndex::default();
        for (graph_key, token) in &graph.tokens {
            for key in ALLOWED_KEYS {
                if let Some(value) = resolve_key(&token.raw, key) {
                    index.insert(key, &value, graph_key);
                }
            }
        }
        index
    }

    /// Insert one `field=value -> graph key` mapping (used when loading the
    /// index from the cache's multimap tables).
    pub(crate) fn insert(&mut self, field: &str, value: &str, graph_key: &str) {
        self.by_field
            .entry(field.to_string())
            .or_default()
            .entry(value.to_string())
            .or_default()
            .push(graph_key.to_string());
    }

    /// Graph keys matching `field == value`, if that field is indexed.
    fn lookup(&self, field: &str, value: &str) -> Option<&[String]> {
        self.by_field
            .get(field)
            .and_then(|m| m.get(value))
            .map(Vec::as_slice)
    }
}

/// Build a secondary index mapping a single field's values to token graph keys.
///
/// Retained for callers that only need one field; prefer [`TokenIndex`] when
/// querying repeatedly across fields.
pub fn build_index(graph: &TokenGraph, key: &str) -> HashMap<String, Vec<String>> {
    let mut index: HashMap<String, Vec<String>> = HashMap::new();
    for (graph_key, token) in &graph.tokens {
        if let Some(value) = resolve_key(&token.raw, key) {
            index.entry(value).or_default().push(graph_key.clone());
        }
    }
    index
}

/// Filter tokens using a prebuilt [`TokenIndex`] for the common single-field
/// equality case, falling back to the full [`filter`] scan for everything else
/// (wildcards, negation, `AND`/`OR` compositions).
///
/// Results are identical to [`filter`]; only the evaluation strategy differs.
pub fn filter_with_index<'a>(
    graph: &'a TokenGraph,
    index: &TokenIndex,
    expr: &TokenFilter,
) -> Vec<&'a TokenRecord> {
    if let Some((key, value)) = expr.single_equality() {
        if let Some(graph_keys) = index.lookup(key, value) {
            let mut results: Vec<&TokenRecord> = graph_keys
                .iter()
                .filter_map(|k| graph.tokens.get(k))
                .collect();
            results.sort_by(|a, b| a.name.cmp(&b.name));
            return results;
        }
        // Indexed field, but no entries for this value → empty (not a fallback).
        if index.by_field.contains_key(key) {
            return Vec::new();
        }
    }
    filter(graph, expr)
}

// ── Fuzzy subsequence matching ───────────────────────────────────────────────

/// Characters that mark a word boundary in a token name.  A match immediately
/// after one of these (or at the start of the string) earns a boundary bonus.
const BOUNDARY_CHARS: &[char] = &['-', '_', '.', '[', ']', ' ', ',', '='];

/// Score `needle` as a subsequence of `haystack` (both matched case-insensitively).
///
/// Returns `None` when `needle` is not a subsequence of `haystack`.  An empty
/// needle matches everything with a score of `0`.  Higher scores indicate
/// tighter matches: each matched character scores `1`, with a `+3` bonus for
/// runs of consecutive matches and a `+5` bonus for matches landing on a word
/// boundary (so `btnbg` ranks `button-background` above incidental hits).
pub fn subsequence_score(haystack: &str, needle: &str) -> Option<i32> {
    if needle.is_empty() {
        return Some(0);
    }
    let hay: Vec<char> = haystack.chars().flat_map(char::to_lowercase).collect();
    let pat: Vec<char> = needle.chars().flat_map(char::to_lowercase).collect();

    let mut score: i32 = 0;
    let mut hi: usize = 0;
    let mut last_match: Option<usize> = None;

    for &pc in &pat {
        let mut found = false;
        while hi < hay.len() {
            let idx = hi;
            let hc = hay[idx];
            hi += 1;
            if hc == pc {
                score += 1;
                let at_boundary = idx == 0 || BOUNDARY_CHARS.contains(&hay[idx - 1]);
                if at_boundary {
                    score += 5;
                }
                if idx > 0 && last_match == Some(idx - 1) {
                    score += 3;
                }
                last_match = Some(idx);
                found = true;
                break;
            }
        }
        if !found {
            return None;
        }
    }

    Some(score)
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::TokenGraph;
    use serde_json::json;
    use std::path::PathBuf;

    fn make_graph(tokens: Vec<(&str, serde_json::Value)>) -> TokenGraph {
        TokenGraph::from_pairs(
            tokens
                .into_iter()
                .map(|(name, raw)| (name.to_string(), PathBuf::from("test.json"), raw))
                .collect(),
        )
    }

    // ── indexed_fields ──────────────────────────────────────────────────

    #[test]
    fn indexed_fields_contains_expected_keys() {
        let fields = super::indexed_fields();
        let expected = [
            "property", "component", "variant", "state",
            "colorScheme", "scale", "contrast", "uuid", "$schema",
        ];
        assert_eq!(fields.len(), expected.len());
        for key in &expected {
            assert!(fields.contains(key), "indexed_fields missing key: {key}");
        }
    }

    // ── Parser tests ────────────────────────────────────────────────────

    #[test]
    fn parse_empty_matches_all() {
        let f = parse("").unwrap();
        assert!(matches!(f.expr, FilterExpr::All));
    }

    #[test]
    fn parse_single_condition() {
        let f = parse("component=button").unwrap();
        if let FilterExpr::Or(alts) = &f.expr {
            assert_eq!(alts.len(), 1);
            assert_eq!(alts[0].len(), 1);
            assert_eq!(alts[0][0].key, "component");
            assert_eq!(alts[0][0].value, "button");
            assert_eq!(alts[0][0].op, Operator::Eq);
        } else {
            panic!("expected Or");
        }
    }

    #[test]
    fn parse_and_conditions() {
        let f = parse("component=button,state=hover").unwrap();
        if let FilterExpr::Or(alts) = &f.expr {
            assert_eq!(alts.len(), 1);
            assert_eq!(alts[0].len(), 2);
        } else {
            panic!("expected Or");
        }
    }

    #[test]
    fn parse_or_conditions() {
        let f = parse("property=bg|property=fg").unwrap();
        if let FilterExpr::Or(alts) = &f.expr {
            assert_eq!(alts.len(), 2);
        } else {
            panic!("expected Or");
        }
    }

    #[test]
    fn parse_negation() {
        let f = parse("colorScheme!=light").unwrap();
        if let FilterExpr::Or(alts) = &f.expr {
            assert_eq!(alts[0][0].op, Operator::NotEq);
        } else {
            panic!("expected Or");
        }
    }

    #[test]
    fn parse_unknown_key_rejected() {
        let err = parse("unknown=value");
        assert!(err.is_err());
    }

    #[test]
    fn parse_dollar_schema_key() {
        let f = parse("$schema=https://example.com/token.json").unwrap();
        if let FilterExpr::Or(alts) = &f.expr {
            assert_eq!(alts[0][0].key, "$schema");
        } else {
            panic!("expected Or");
        }
    }

    #[test]
    fn parse_whitespace_trimmed() {
        let f = parse("  component = button , state = hover  ").unwrap();
        if let FilterExpr::Or(alts) = &f.expr {
            assert_eq!(alts[0][0].key, "component");
            assert_eq!(alts[0][0].value, "button");
            assert_eq!(alts[0][1].key, "state");
            assert_eq!(alts[0][1].value, "hover");
        } else {
            panic!("expected Or");
        }
    }

    // ── Glob matching ───────────────────────────────────────────────────

    #[test]
    fn glob_exact() {
        assert!(glob_match("hello", "hello"));
        assert!(!glob_match("hello", "world"));
    }

    #[test]
    fn glob_star_prefix() {
        assert!(glob_match("*-color", "background-color"));
        assert!(!glob_match("*-color", "background-size"));
    }

    #[test]
    fn glob_star_suffix() {
        assert!(glob_match("color-*", "color-default"));
        assert!(glob_match("color-*", "color-"));
        assert!(!glob_match("color-*", "background-color"));
    }

    #[test]
    fn glob_star_middle() {
        assert!(glob_match("a*z", "abcz"));
        assert!(glob_match("a*z", "az"));
        assert!(!glob_match("a*z", "abcd"));
    }

    #[test]
    fn glob_multiple_stars() {
        assert!(glob_match("*bg*color*", "my-bg-base-color-default"));
    }

    // ── Filter evaluation ───────────────────────────────────────────────

    #[test]
    fn filter_single_match() {
        let g = make_graph(vec![
            (
                "btn",
                json!({"name": {"property": "bg", "component": "button"}, "value": "1"}),
            ),
            (
                "chk",
                json!({"name": {"property": "bg", "component": "checkbox"}, "value": "2"}),
            ),
        ]);
        let f = parse("component=button").unwrap();
        let results = filter(&g, &f);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].raw["name"]["component"], "button");
    }

    #[test]
    fn filter_and() {
        let g = make_graph(vec![
            (
                "btn-hover",
                json!({"name": {"property": "bg", "component": "button", "state": "hover"}, "value": "1"}),
            ),
            (
                "btn-default",
                json!({"name": {"property": "bg", "component": "button"}, "value": "2"}),
            ),
            (
                "chk-hover",
                json!({"name": {"property": "bg", "component": "checkbox", "state": "hover"}, "value": "3"}),
            ),
        ]);
        let f = parse("component=button,state=hover").unwrap();
        let results = filter(&g, &f);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn filter_or() {
        let g = make_graph(vec![
            (
                "btn",
                json!({"name": {"property": "bg", "component": "button"}, "value": "1"}),
            ),
            (
                "chk",
                json!({"name": {"property": "bg", "component": "checkbox"}, "value": "2"}),
            ),
            (
                "slider",
                json!({"name": {"property": "bg", "component": "slider"}, "value": "3"}),
            ),
        ]);
        let f = parse("component=button|component=checkbox").unwrap();
        let results = filter(&g, &f);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn filter_negation() {
        let g = make_graph(vec![
            (
                "light",
                json!({"name": {"property": "bg", "colorScheme": "light"}, "value": "1"}),
            ),
            (
                "dark",
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "2"}),
            ),
            ("none", json!({"name": {"property": "bg"}, "value": "3"})),
        ]);
        let f = parse("colorScheme!=light").unwrap();
        let results = filter(&g, &f);
        // "dark" matches (not light), "none" matches (absent field satisfies !=).
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn filter_wildcard() {
        let g = make_graph(vec![
            (
                "bg",
                json!({"name": {"property": "background-color"}, "value": "1"}),
            ),
            (
                "border",
                json!({"name": {"property": "border-color"}, "value": "2"}),
            ),
            (
                "size",
                json!({"name": {"property": "font-size"}, "value": "3"}),
            ),
        ]);
        let f = parse("property=*-color").unwrap();
        let results = filter(&g, &f);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn filter_schema_key() {
        let g = make_graph(vec![
            (
                "color",
                json!({"name": {"property": "bg"}, "$schema": "https://example.com/color.json", "value": "1"}),
            ),
            (
                "size",
                json!({"name": {"property": "sz"}, "$schema": "https://example.com/dimension.json", "value": "2"}),
            ),
        ]);
        let f = parse("$schema=https://example.com/color.json").unwrap();
        let results = filter(&g, &f);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn filter_empty_matches_all() {
        let g = make_graph(vec![
            ("a", json!({"name": {"property": "a"}, "value": "1"})),
            ("b", json!({"name": {"property": "b"}, "value": "2"})),
        ]);
        let f = parse("").unwrap();
        let results = filter(&g, &f);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn filter_no_matches() {
        let g = make_graph(vec![(
            "a",
            json!({"name": {"property": "bg"}, "value": "1"}),
        )]);
        let f = parse("component=nonexistent").unwrap();
        let results = filter(&g, &f);
        assert!(results.is_empty());
    }

    // ── filter_with_index equivalence (#783) ─────────────────────────────

    /// Assert `filter` and `filter_with_index` return the same names for `expr`.
    fn assert_filter_equivalent(graph: &TokenGraph, expr_str: &str) {
        let expr = parse(expr_str).unwrap();
        let index = TokenIndex::build(graph);
        let scan: Vec<_> = filter(graph, &expr)
            .into_iter()
            .map(|t| t.name.clone())
            .collect();
        let indexed: Vec<_> = filter_with_index(graph, &index, &expr)
            .into_iter()
            .map(|t| t.name.clone())
            .collect();
        assert_eq!(scan, indexed, "expr={expr_str:?}");
    }

    #[test]
    fn filter_with_index_matches_filter_single_equality() {
        let g = make_graph(vec![
            (
                "btn",
                json!({"name": {"property": "bg", "component": "button"}, "value": "1"}),
            ),
            (
                "chk",
                json!({"name": {"property": "bg", "component": "checkbox"}, "value": "2"}),
            ),
        ]);
        assert_filter_equivalent(&g, "component=button");
        assert_filter_equivalent(&g, "property=bg");
    }

    #[test]
    fn filter_with_index_matches_filter_complex_expressions() {
        let g = make_graph(vec![
            (
                "btn",
                json!({"name": {"property": "bg", "component": "button", "state": "hover"}, "value": "1"}),
            ),
            (
                "chk",
                json!({"name": {"property": "bg", "component": "checkbox", "state": "hover"}, "value": "2"}),
            ),
            (
                "slider",
                json!({"name": {"property": "bg", "component": "slider", "state": "default"}, "value": "3"}),
            ),
            (
                "light",
                json!({"name": {"property": "fg", "colorScheme": "light"}, "value": "4"}),
            ),
            (
                "dark",
                json!({"name": {"property": "fg", "colorScheme": "dark"}, "value": "5"}),
            ),
        ]);
        assert_filter_equivalent(&g, "");
        assert_filter_equivalent(&g, "component=button,state=hover");
        assert_filter_equivalent(&g, "component=button|component=checkbox");
        assert_filter_equivalent(&g, "colorScheme!=light");
        assert_filter_equivalent(&g, "property=*-bg");
        assert_filter_equivalent(&g, "component=missing");
    }

    // ── Index builder ───────────────────────────────────────────────────

    #[test]
    fn build_index_groups_by_value() {
        let g = make_graph(vec![
            (
                "a",
                json!({"name": {"property": "bg", "component": "button"}, "value": "1"}),
            ),
            (
                "b",
                json!({"name": {"property": "fg", "component": "button"}, "value": "2"}),
            ),
            (
                "c",
                json!({"name": {"property": "bg", "component": "checkbox"}, "value": "3"}),
            ),
        ]);
        let idx = build_index(&g, "component");
        assert_eq!(idx.get("button").map(|v| v.len()), Some(2));
        assert_eq!(idx.get("checkbox").map(|v| v.len()), Some(1));
    }
}
