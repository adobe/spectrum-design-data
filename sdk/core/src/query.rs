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
const ALLOWED_KEYS: &[&str] = &[
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
fn resolve_key(raw: &serde_json::Value, key: &str) -> Option<String> {
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

// ── Index builder (optional optimization, #783) ─────────────────────────────

/// Build a secondary index mapping field values to token graph keys.
///
/// Useful for accelerating single-field equality queries on large token sets.
pub fn build_index(graph: &TokenGraph, key: &str) -> HashMap<String, Vec<String>> {
    let mut index: HashMap<String, Vec<String>> = HashMap::new();
    for (graph_key, token) in &graph.tokens {
        if let Some(value) = resolve_key(&token.raw, key) {
            index.entry(value).or_default().push(graph_key.clone());
        }
    }
    index
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
