// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Cascade resolution: specificity, context matching, and the resolution engine.
//!
//! Implements the algorithm defined in `spec/cascade.md`:
//! 1. Filter candidates by context match (dimension values).
//! 2. Select by layer precedence (Foundation < Platform < Product).
//! 3. Within a layer, select by specificity (non-default dimension count).
//! 4. Tie-break by document order (file path lexicographic, then array index).
//! 5. Resolve alias chain on the winner.

use std::collections::HashMap;

use crate::graph::{DimensionRecord, TokenGraph, TokenRecord};

// ── Resolution context ────────────────────────────────────────────────────────

/// Context for cascade resolution: the dimension modes being resolved.
///
/// # Example
/// ```
/// use design_data_core::cascade::ResolutionContext;
/// let ctx = ResolutionContext::new()
///     .with("colorScheme", "dark")
///     .with("scale", "mobile");
/// ```
#[derive(Debug, Clone, Default)]
pub struct ResolutionContext {
    /// Map of dimension name → requested mode value.
    pub dimensions: HashMap<String, String>,
}

impl ResolutionContext {
    pub fn new() -> Self {
        Self::default()
    }

    /// Builder: add a dimension → mode pair.
    pub fn with(mut self, dimension: impl Into<String>, mode: impl Into<String>) -> Self {
        self.dimensions.insert(dimension.into(), mode.into());
        self
    }
}

// ── Specificity ───────────────────────────────────────────────────────────────

/// Compute the specificity of a token's name object against declared dimensions.
///
/// Specificity = count of dimension fields on the name object whose value is
/// **not** the declared default for that dimension. Non-dimension fields
/// (`property`, `component`, `state`, etc.) are ignored.
///
/// Per spec `cascade.md`: default dimension values MUST NOT contribute to
/// specificity.
pub fn specificity(
    name_obj: &serde_json::Map<String, serde_json::Value>,
    dimensions: &[DimensionRecord],
) -> u32 {
    let mut count = 0u32;
    for dim in dimensions {
        if let Some(val) = name_obj.get(&dim.name).and_then(|v| v.as_str()) {
            if val != dim.default_mode {
                count += 1;
            }
        }
        // Absent dimension field → matches default → does not increase specificity.
    }
    count
}

// ── Context matching ──────────────────────────────────────────────────────────

/// Returns `true` if a token's name object matches the given resolution context.
///
/// Matching rules (per spec `cascade.md`):
/// - Dimension present in **context** but **absent** from name object → matches
///   any value (the token applies to all modes for that dimension).
/// - Dimension present in **both** → must match exactly.
/// - Dimension in name object but **not** in context → ignored.
pub fn matches_context(
    name_obj: &serde_json::Map<String, serde_json::Value>,
    context: &ResolutionContext,
) -> bool {
    for (dim_name, ctx_mode) in &context.dimensions {
        if let Some(token_mode) = name_obj.get(dim_name).and_then(|v| v.as_str()) {
            if token_mode != ctx_mode {
                return false;
            }
        }
        // Dimension absent from name → wildcard, no rejection.
    }
    true
}

// ── Resolution engine ─────────────────────────────────────────────────────────

/// Resolve the winning token for a given context.
///
/// Applies the full cascade algorithm:
/// 1. Filter to tokens whose name object matches `context`.
/// 2. Select maximum specificity among candidates.
/// 3. Tie-break by document order: lexicographically earlier file path wins;
///    within the same file, lower `index` wins.
///
/// Layer precedence (Foundation < Platform < Product) is not yet enforced
/// because the current dataset is single-layer (Foundation). Layer support
/// will be added when multi-layer datasets are introduced.
///
/// Returns `None` when no candidate matches the context.
pub fn resolve<'a>(graph: &'a TokenGraph, context: &ResolutionContext) -> Option<&'a TokenRecord> {
    // 1. Collect candidates with a `name` object matching the context.
    let mut candidates: Vec<&TokenRecord> = graph
        .tokens
        .values()
        .filter(|t| {
            t.raw
                .get("name")
                .and_then(|v| v.as_object())
                .is_some_and(|name_obj| matches_context(name_obj, context))
        })
        .collect();

    if candidates.is_empty() {
        return None;
    }

    // 2. Sort: highest specificity first; tie-break by (file path, index).
    candidates.sort_by(|a, b| {
        let spec_a = a
            .raw
            .get("name")
            .and_then(|v| v.as_object())
            .map(|n| specificity(n, &graph.dimensions))
            .unwrap_or(0);
        let spec_b = b
            .raw
            .get("name")
            .and_then(|v| v.as_object())
            .map(|n| specificity(n, &graph.dimensions))
            .unwrap_or(0);
        spec_b
            .cmp(&spec_a) // descending specificity
            .then_with(|| a.file.cmp(&b.file)) // lex file path
            .then_with(|| a.index.cmp(&b.index)) // document order within file
    });

    candidates.into_iter().next()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{DimensionRecord, TokenGraph};

    fn color_scheme_dim() -> DimensionRecord {
        DimensionRecord {
            file: PathBuf::from("dimensions/color-scheme.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into(), "wireframe".into()],
            default_mode: "light".into(),
        }
    }

    fn scale_dim() -> DimensionRecord {
        DimensionRecord {
            file: PathBuf::from("dimensions/scale.json"),
            name: "scale".into(),
            modes: vec!["desktop".into(), "mobile".into()],
            default_mode: "desktop".into(),
        }
    }

    // ── specificity ──────────────────────────────────────────────────────────

    #[test]
    fn specificity_zero_for_no_dimensions() {
        let name = json!({"property": "foo"});
        let dims = [color_scheme_dim()];
        assert_eq!(specificity(name.as_object().unwrap(), &dims), 0);
    }

    #[test]
    fn specificity_zero_for_default_value() {
        let name = json!({"property": "foo", "colorScheme": "light"});
        let dims = [color_scheme_dim()]; // default is "light"
        assert_eq!(specificity(name.as_object().unwrap(), &dims), 0);
    }

    #[test]
    fn specificity_one_for_non_default() {
        let name = json!({"property": "foo", "colorScheme": "dark"});
        let dims = [color_scheme_dim()];
        assert_eq!(specificity(name.as_object().unwrap(), &dims), 1);
    }

    #[test]
    fn specificity_two_for_two_non_defaults() {
        let name = json!({"property": "foo", "colorScheme": "dark", "scale": "mobile"});
        let dims = [color_scheme_dim(), scale_dim()];
        assert_eq!(specificity(name.as_object().unwrap(), &dims), 2);
    }

    // ── matches_context ──────────────────────────────────────────────────────

    #[test]
    fn matches_when_token_omits_dimension() {
        let name = json!({"property": "foo"}); // no colorScheme
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(matches_context(name.as_object().unwrap(), &ctx));
    }

    #[test]
    fn matches_when_dimension_values_equal() {
        let name = json!({"property": "foo", "colorScheme": "dark"});
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(matches_context(name.as_object().unwrap(), &ctx));
    }

    #[test]
    fn no_match_when_dimension_values_differ() {
        let name = json!({"property": "foo", "colorScheme": "light"});
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(!matches_context(name.as_object().unwrap(), &ctx));
    }

    // ── resolve ──────────────────────────────────────────────────────────────

    #[test]
    fn resolve_returns_none_for_empty_graph() {
        let g = TokenGraph::default();
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(resolve(&g, &ctx).is_none());
    }

    #[test]
    fn resolve_picks_matching_token() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t-light".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg"}, "value": "#fff"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_dimensions(vec![color_scheme_dim()]);

        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        let winner = resolve(&g, &ctx).expect("should find a winner");
        // dark-specific token has higher specificity than the base token
        assert_eq!(
            winner
                .raw
                .get("name")
                .unwrap()
                .get("colorScheme")
                .unwrap()
                .as_str()
                .unwrap(),
            "dark"
        );
    }

    #[test]
    fn resolve_falls_back_to_base_token_when_no_specific_match() {
        let g = TokenGraph::from_pairs(vec![(
            "t-base".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg"}, "value": "#fff"}),
        )])
        .with_dimensions(vec![color_scheme_dim()]);

        // Asking for dark, only base token exists — base matches (wildcard)
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(resolve(&g, &ctx).is_some());
    }

    #[test]
    fn resolve_tie_broken_by_file_order() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t1".into(),
                PathBuf::from("a.tokens.json"), // lex-first file
                json!({"name": {"property": "bg"}, "value": "#aaa"}),
            ),
            (
                "t2".into(),
                PathBuf::from("b.tokens.json"),
                json!({"name": {"property": "bg"}, "value": "#bbb"}),
            ),
        ])
        .with_dimensions(vec![color_scheme_dim()]);

        let ctx = ResolutionContext::new();
        let winner = resolve(&g, &ctx).expect("should find a winner");
        // a.tokens.json comes before b.tokens.json lexicographically
        assert_eq!(winner.file, PathBuf::from("a.tokens.json"));
    }
}
