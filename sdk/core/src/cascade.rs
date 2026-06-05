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
//! 1. Filter candidates by context match (mode set values).
//! 2. Select by layer precedence: highest layer wins (Product > Platform > Foundation).
//! 3. Within a layer, select by specificity (non-default mode set count).
//! 4. Tie-break by document order (file path lexicographic, then array index).
//! 5. Resolve alias chain on the winner.

use std::collections::HashMap;

use crate::graph::{ModeSetRecord, TokenGraph, TokenRecord};

// ── Resolution context ────────────────────────────────────────────────────────

/// Context for cascade resolution: the mode set modes being resolved.
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
    /// Map of mode set name → requested mode value.
    pub mode_sets: HashMap<String, String>,
    /// Platform manifest mode set restrictions: mode set name → allowed mode values.
    /// Candidates naming a mode value absent from the allowed list are filtered out
    /// before context matching (spec cascade.md step 0). Empty = no restrictions.
    pub mode_set_restrictions: HashMap<String, Vec<String>>,
}

impl ResolutionContext {
    pub fn new() -> Self {
        Self::default()
    }

    /// Builder: add a mode set → mode pair.
    pub fn with(mut self, mode_set: impl Into<String>, mode: impl Into<String>) -> Self {
        self.mode_sets.insert(mode_set.into(), mode.into());
        self
    }

    /// Builder: add a mode set restriction (allowed modes for a given mode set).
    pub fn with_restriction(
        mut self,
        mode_set: impl Into<String>,
        allowed: Vec<impl Into<String>>,
    ) -> Self {
        self.mode_set_restrictions.insert(
            mode_set.into(),
            allowed.into_iter().map(Into::into).collect(),
        );
        self
    }
}

// ── Specificity ───────────────────────────────────────────────────────────────

/// Compute the specificity of a token's name object against declared mode sets.
///
/// Specificity = count of mode set fields on the name object whose value is
/// **not** the declared default for that mode set. Non-mode-set fields
/// (`property`, `component`, `state`, etc.) are ignored.
///
/// Per spec `cascade.md`: default mode set values MUST NOT contribute to
/// specificity.
pub fn specificity(
    name_obj: &serde_json::Map<String, serde_json::Value>,
    mode_sets: &[ModeSetRecord],
) -> u32 {
    let mut count = 0u32;
    for ms in mode_sets {
        if let Some(val) = name_obj.get(&ms.name).and_then(|v| v.as_str()) {
            if val != ms.default_mode {
                count += 1;
            }
        }
        // Absent mode set field → matches default → does not increase specificity.
    }
    count
}

// ── Context matching ──────────────────────────────────────────────────────────

/// Returns `true` if a token's name object matches the given resolution context.
///
/// Matching rules (per spec `cascade.md`):
/// - Mode set present in **context** but **absent** from name object → matches
///   any value (the token applies to all modes for that mode set).
/// - Mode set present in **both** → must match exactly.
/// - Mode set in name object but **not** in context → ignored.
pub fn matches_context(
    name_obj: &serde_json::Map<String, serde_json::Value>,
    context: &ResolutionContext,
) -> bool {
    for (ms_name, ctx_mode) in &context.mode_sets {
        if let Some(token_mode) = name_obj.get(ms_name).and_then(|v| v.as_str()) {
            if token_mode != ctx_mode {
                return false;
            }
        }
        // Mode set absent from name → wildcard, no rejection.
    }
    true
}

// ── Resolution engine ─────────────────────────────────────────────────────────

/// Resolve the winning token for a given context.
///
/// Applies the full cascade algorithm from `spec/cascade.md`:
/// 1. Filter to tokens whose name object matches `context`.
/// 2. Sort by layer descending (Product > Platform > Foundation).
/// 3. Within a layer, sort by specificity descending.
/// 4. Tie-break by document order: lexicographically earlier file path wins;
///    within the same file, lower `index` wins.
///
/// Returns `None` when no candidate matches the context.
pub fn resolve<'a>(graph: &'a TokenGraph, context: &ResolutionContext) -> Option<&'a TokenRecord> {
    // 0. Collect all candidates, then apply platform mode-set restrictions (spec cascade.md step 0).
    //    Candidates that set a mode set field to a disallowed value are filtered out before
    //    context matching. Candidates that omit the mode set field (wildcard) are not affected —
    //    restriction is orthogonal to matches_context, which only checks explicit name-object fields.
    let restriction_filter = |t: &&TokenRecord| -> bool {
        if context.mode_set_restrictions.is_empty() {
            return true;
        }
        let Some(name_obj) = t.raw.get("name").and_then(|v| v.as_object()) else {
            return true;
        };
        for (ms_name, allowed) in &context.mode_set_restrictions {
            if let Some(mode) = name_obj.get(ms_name).and_then(|v| v.as_str()) {
                if !allowed.iter().any(|a| a == mode) {
                    return false;
                }
            }
            // Mode set absent from name object → wildcard → passes restriction filter.
        }
        true
    };

    // 1. Collect candidates with a `name` object matching the context.
    let mut candidates: Vec<&TokenRecord> = graph
        .tokens
        .values()
        .filter(restriction_filter)
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

    // 2. Sort: layer descending, then specificity descending, then document order.
    candidates.sort_by(|a, b| {
        let spec_a = a
            .raw
            .get("name")
            .and_then(|v| v.as_object())
            .map(|n| specificity(n, &graph.mode_sets))
            .unwrap_or(0);
        let spec_b = b
            .raw
            .get("name")
            .and_then(|v| v.as_object())
            .map(|n| specificity(n, &graph.mode_sets))
            .unwrap_or(0);
        b.layer
            .cmp(&a.layer) // descending layer: Product > Platform > Foundation
            .then_with(|| spec_b.cmp(&spec_a)) // descending specificity
            .then_with(|| a.file.cmp(&b.file)) // lex file path
            .then_with(|| a.index.cmp(&b.index)) // document order within file
    });

    candidates.into_iter().next()
}

// ── Property-scoped resolution ────────────────────────────────────────────────

/// One candidate returned by [`resolve_property`]: a token matching the
/// requested property, its cascade specificity, and whether it won resolution.
#[derive(Debug, Clone)]
pub struct ResolvedCandidate {
    pub record: TokenRecord,
    pub specificity: u32,
    pub is_winner: bool,
}

/// Resolve all tokens whose `name.property` equals `property`, ranked by cascade
/// precedence, with the winning token flagged.
///
/// Builds a property-filtered subgraph (preserving full records and their cascade
/// `layer` so Platform-layer manifest overrides correctly win over Foundation
/// tokens), sorts candidates by layer/specificity/document order, and runs
/// [`resolve`] on the subgraph to determine the winner.
pub fn resolve_property(
    graph: &TokenGraph,
    property: &str,
    ctx: &ResolutionContext,
) -> Vec<ResolvedCandidate> {
    let candidates: Vec<TokenRecord> = graph
        .tokens
        .values()
        .filter(|t| {
            t.raw
                .get("name")
                .and_then(|v| v.as_object())
                .and_then(|n| n.get("property"))
                .and_then(|v| v.as_str())
                == Some(property)
        })
        .cloned()
        .collect();

    if candidates.is_empty() {
        return Vec::new();
    }

    let filtered_graph =
        TokenGraph::from_records(candidates).with_mode_sets(graph.mode_sets.clone());

    let mut with_spec: Vec<(&TokenRecord, u32)> = filtered_graph
        .tokens
        .values()
        .map(|t| {
            let s = t
                .raw
                .get("name")
                .and_then(|v| v.as_object())
                .map(|n| specificity(n, &filtered_graph.mode_sets))
                .unwrap_or(0);
            (t, s)
        })
        .collect();

    with_spec.sort_by(|(a, sa), (b, sb)| {
        b.layer
            .cmp(&a.layer)
            .then_with(|| sb.cmp(sa))
            .then_with(|| a.file.cmp(&b.file))
            .then_with(|| a.index.cmp(&b.index))
    });

    let winner = resolve(&filtered_graph, ctx);

    with_spec
        .into_iter()
        .map(|(t, spec)| ResolvedCandidate {
            record: t.clone(),
            specificity: spec,
            is_winner: winner.map(|w| w.name == t.name).unwrap_or(false),
        })
        .collect()
}

// ── Resolve context helpers ───────────────────────────────────────────────────

/// Parse a comma-separated `property=<name>,<modeSet>=<mode>,...` expression into a
/// `(property, ResolutionContext)` pair.
///
/// The `property` key is special: its value becomes the first return value; all other
/// `key=value` pairs are inserted into the context.  Unknown keys are silently ignored
/// (no token query semantics here — just mode-set dimension bindings).
///
/// ```rust
/// use design_data_core::cascade::parse_resolve_context;
/// let (prop, ctx) = parse_resolve_context("property=color,colorScheme=dark").unwrap();
/// assert_eq!(prop, "color");
/// ```
pub fn parse_resolve_context(expr: &str) -> Result<(String, ResolutionContext), String> {
    let mut property: Option<String> = None;
    let mut ctx = ResolutionContext::new();
    for pair in expr.split(',') {
        let pair = pair.trim();
        if let Some((k, v)) = pair.split_once('=') {
            let k = k.trim();
            let v = v.trim();
            if k == "property" {
                property = Some(v.to_string());
            } else if !k.is_empty() && !v.is_empty() {
                ctx = ctx.with(k, v);
            }
        }
    }
    let prop = property.ok_or_else(|| "missing property= in expression".to_string())?;
    if prop.is_empty() {
        return Err("property value must not be empty".to_string());
    }
    Ok((prop, ctx))
}

/// Apply a set of manifest mode-set restrictions to a `ResolutionContext`.
///
/// Each `(mode_set, allowed_modes)` pair from the manifest is added to the context as a
/// restriction.  This is the same operation both CLI and TUI perform before calling
/// [`resolve_property`].
pub fn apply_restrictions(
    ctx: ResolutionContext,
    restrictions: &HashMap<String, Vec<String>>,
) -> ResolutionContext {
    restrictions
        .iter()
        .fold(ctx, |acc, (mode_set, allowed)| {
            acc.with_restriction(mode_set.clone(), allowed.clone())
        })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{Layer, ModeSetRecord, TokenGraph, TokenRecord};

    fn color_scheme_mode_set() -> ModeSetRecord {
        ModeSetRecord {
            file: PathBuf::from("mode-sets/color-scheme.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into(), "wireframe".into()],
            default_mode: "light".into(),
        }
    }

    fn scale_mode_set() -> ModeSetRecord {
        ModeSetRecord {
            file: PathBuf::from("mode-sets/scale.json"),
            name: "scale".into(),
            modes: vec!["desktop".into(), "mobile".into()],
            default_mode: "desktop".into(),
        }
    }

    // ── specificity ──────────────────────────────────────────────────────────

    #[test]
    fn specificity_zero_for_no_mode_sets() {
        let name = json!({"property": "foo"});
        let mode_sets = [color_scheme_mode_set()];
        assert_eq!(specificity(name.as_object().unwrap(), &mode_sets), 0);
    }

    #[test]
    fn specificity_zero_for_default_value() {
        let name = json!({"property": "foo", "colorScheme": "light"});
        let mode_sets = [color_scheme_mode_set()]; // default is "light"
        assert_eq!(specificity(name.as_object().unwrap(), &mode_sets), 0);
    }

    #[test]
    fn specificity_one_for_non_default() {
        let name = json!({"property": "foo", "colorScheme": "dark"});
        let mode_sets = [color_scheme_mode_set()];
        assert_eq!(specificity(name.as_object().unwrap(), &mode_sets), 1);
    }

    #[test]
    fn specificity_two_for_two_non_defaults() {
        let name = json!({"property": "foo", "colorScheme": "dark", "scale": "mobile"});
        let mode_sets = [color_scheme_mode_set(), scale_mode_set()];
        assert_eq!(specificity(name.as_object().unwrap(), &mode_sets), 2);
    }

    // ── matches_context ──────────────────────────────────────────────────────

    #[test]
    fn matches_when_token_omits_mode_set() {
        let name = json!({"property": "foo"}); // no colorScheme
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(matches_context(name.as_object().unwrap(), &ctx));
    }

    #[test]
    fn matches_when_mode_set_values_equal() {
        let name = json!({"property": "foo", "colorScheme": "dark"});
        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        assert!(matches_context(name.as_object().unwrap(), &ctx));
    }

    #[test]
    fn no_match_when_mode_set_values_differ() {
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
        .with_mode_sets(vec![color_scheme_mode_set()]);

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
        .with_mode_sets(vec![color_scheme_mode_set()]);

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
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new();
        let winner = resolve(&g, &ctx).expect("should find a winner");
        // a.tokens.json comes before b.tokens.json lexicographically
        assert_eq!(winner.file, PathBuf::from("a.tokens.json"));
    }

    // ── mode-set restrictions ────────────────────────────────────────────────

    #[test]
    fn restriction_filters_out_disallowed_mode_candidate() {
        // Only light is allowed; dark token should be filtered out.
        let g = TokenGraph::from_pairs(vec![
            (
                "t-light".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "light"}, "value": "#fff"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new()
            .with("colorScheme", "light")
            .with_restriction("colorScheme", vec!["light"]);
        let winner = resolve(&g, &ctx).expect("should find the light candidate");
        assert_eq!(
            winner
                .raw
                .get("name")
                .unwrap()
                .get("colorScheme")
                .unwrap()
                .as_str()
                .unwrap(),
            "light"
        );
    }

    #[test]
    fn restriction_allows_wildcard_candidate_through() {
        // Wildcard token (no colorScheme) survives even when dark is restricted.
        let g = TokenGraph::from_pairs(vec![
            (
                "t-wildcard".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg"}, "value": "#ccc"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new()
            .with("colorScheme", "light")
            .with_restriction("colorScheme", vec!["light"]);
        let winner = resolve(&g, &ctx).expect("wildcard should survive");
        // t-dark is filtered; t-wildcard wins.
        assert!(
            winner.raw.get("name").unwrap().get("colorScheme").is_none(),
            "wildcard token should win"
        );
    }

    #[test]
    fn restriction_returns_none_when_all_candidates_are_restricted() {
        // Only dark token exists; restriction allows only light → no candidate survives.
        let g = TokenGraph::from_pairs(vec![(
            "t-dark".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new()
            .with("colorScheme", "light")
            .with_restriction("colorScheme", vec!["light"]);
        assert!(resolve(&g, &ctx).is_none());
    }

    #[test]
    fn empty_restrictions_do_not_change_behavior() {
        let g = TokenGraph::from_pairs(vec![(
            "t-dark".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        // No restrictions set — dark token resolves normally.
        assert!(resolve(&g, &ctx).is_some());
    }

    #[test]
    fn product_layer_beats_foundation_layer() {
        // Foundation token with same name-object as the Product override.
        let foundation = TokenRecord {
            name: "foundation-bg".into(),
            file: PathBuf::from("foundation.tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some("uuid-bg".into()),
            alias_target: None,
            raw: json!({"name": {"property": "bg"}, "uuid": "uuid-bg", "value": "#foundation"}),
            layer: Layer::Foundation,
        };
        // Product override: same name-object, overrides value.
        let product = TokenRecord {
            name: "product-context:uuid-bg:0".into(),
            file: PathBuf::from("product-context.json"),
            index: 0,
            schema_url: None,
            uuid: Some("uuid-bg".into()),
            alias_target: None,
            raw: json!({"name": {"property": "bg"}, "uuid": "uuid-bg", "value": "#product"}),
            layer: Layer::Product,
        };
        let g = TokenGraph::from_records(vec![foundation, product]);
        let ctx = ResolutionContext::new();
        let winner = resolve(&g, &ctx).expect("should find a winner");
        assert_eq!(winner.layer, Layer::Product);
        assert_eq!(
            winner.raw.get("value").and_then(|v| v.as_str()),
            Some("#product")
        );
    }

    // ── resolve_property ─────────────────────────────────────────────────────

    #[test]
    fn resolve_property_flags_winner_and_filters_by_property() {
        let g = TokenGraph::from_pairs(vec![
            (
                "btn-bg".into(),
                PathBuf::from("a.json"),
                json!({"name": {"property": "background-color", "component": "button"}, "value": "#aaa"}),
            ),
            (
                "btn-fg".into(),
                PathBuf::from("a.json"),
                json!({"name": {"property": "color", "component": "button"}, "value": "#111"}),
            ),
        ]);
        let ctx = ResolutionContext::new();
        let results = resolve_property(&g, "background-color", &ctx);
        assert_eq!(results.len(), 1);
        assert!(results[0].is_winner);
        assert_eq!(results[0].record.name, "btn-bg");
    }

    #[test]
    fn resolve_property_respects_restrictions() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t-light".into(),
                PathBuf::from("a.json"),
                json!({"name": {"property": "bg", "colorScheme": "light"}, "value": "#fff"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new()
            .with("colorScheme", "light")
            .with_restriction("colorScheme", vec!["light"]);
        let results = resolve_property(&g, "bg", &ctx);
        assert_eq!(results.len(), 2);
        let winner = results.iter().find(|c| c.is_winner).expect("winner");
        assert_eq!(
            winner.record.raw["name"]["colorScheme"].as_str(),
            Some("light")
        );
    }

    // ── Layer ordering: Platform > Foundation ────────────────────────────────

    #[test]
    fn platform_layer_beats_foundation_layer() {
        // Foundation token and Platform override for the same name object.
        let foundation = TokenRecord {
            name: "foundation-bg".into(),
            file: PathBuf::from("foundation.tokens.json"),
            index: 0,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "bg"}, "value": "#foundation"}),
            layer: Layer::Foundation,
        };
        let platform = TokenRecord {
            name: "platform-bg".into(),
            file: PathBuf::from("platform.tokens.json"),
            index: 0,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "bg"}, "value": "#platform"}),
            layer: Layer::Platform,
        };
        let g = TokenGraph::from_records(vec![foundation, platform]);
        let ctx = ResolutionContext::new();
        let winner = resolve(&g, &ctx).expect("should find a winner");
        assert_eq!(winner.layer, Layer::Platform);
        assert_eq!(
            winner.raw.get("value").and_then(|v| v.as_str()),
            Some("#platform")
        );
    }

    // ── Specificity tie-break within same layer ──────────────────────────────

    #[test]
    fn higher_specificity_beats_lower_within_same_layer() {
        // Same layer (Foundation), different specificity.
        // dark token (colorScheme=dark, non-default) has specificity 1.
        // light token (colorScheme=light, IS default) has specificity 0.
        // When asking for dark, dark-specific token wins via specificity.
        let g = TokenGraph::from_pairs(vec![
            (
                "t-light".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "light"}, "value": "#light"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#dark"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set()]); // default_mode = "light"

        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        let winner = resolve(&g, &ctx).expect("should find a winner");
        // t-dark: colorScheme=dark (non-default) → specificity 1.
        // t-light: colorScheme=light (IS default) → specificity 0.
        // t-dark wins even though both files are the same.
        assert_eq!(
            winner.raw["name"]["colorScheme"].as_str(),
            Some("dark")
        );
    }

    #[test]
    fn equal_specificity_same_layer_falls_back_to_document_index() {
        // Two tokens in the same file: same layer, same specificity.
        // Lower index wins (document order).
        // Note: from_pairs sets index=0 for all tokens; use from_records instead
        // so we can control the index explicitly.
        use crate::graph::TokenRecord;
        let first = TokenRecord {
            name: "t-first".into(),
            file: PathBuf::from("same.json"),
            index: 0,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#first"}),
            layer: Layer::Foundation,
        };
        let second = TokenRecord {
            name: "t-second".into(),
            file: PathBuf::from("same.json"),
            index: 1, // higher index → loses tie-break
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#second"}),
            layer: Layer::Foundation,
        };
        let g = TokenGraph::from_records(vec![first, second])
            .with_mode_sets(vec![color_scheme_mode_set()]);

        let ctx = ResolutionContext::new().with("colorScheme", "dark");
        let winner = resolve(&g, &ctx).expect("should find a winner");
        // Both have the same file path and same specificity (dark=non-default → 1).
        // t-first (index 0) beats t-second (index 1) via document order.
        assert_eq!(
            winner.raw.get("value").and_then(|v| v.as_str()),
            Some("#first")
        );
    }

    #[test]
    fn double_mode_set_token_beats_single_mode_set_token() {
        // Token with both colorScheme=dark AND scale=mobile has specificity 2.
        // Token with only colorScheme=dark has specificity 1.
        // The double-specific token wins when context matches both.
        let g = TokenGraph::from_pairs(vec![
            (
                "t-dark-mobile".into(),
                PathBuf::from("a.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark", "scale": "mobile"}, "value": "#double"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#single"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set(), scale_mode_set()]);

        let ctx = ResolutionContext::new()
            .with("colorScheme", "dark")
            .with("scale", "mobile");
        let winner = resolve(&g, &ctx).expect("should find a winner");
        assert_eq!(
            winner.raw.get("value").and_then(|v| v.as_str()),
            Some("#double"),
            "double-specific token (specificity 2) should beat single-specific (specificity 1)"
        );
    }
}
