// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-050: property-decomposition-complete
//!
//! Detects `name.property` values that fuse a structured-field concept
//! (anatomy/object/position/size/state/colorRole/emphasis) instead of being
//! atomic, independent of whether the token roundtrips through canonical name
//! generation or is listed in naming-exceptions.json (spectrum-design-data-284.1).
//!
//! SPEC-007 (name-roundtrip) only catches fusion that also breaks
//! serialization; a token like "icon-color-informative" can roundtrip
//! cleanly while still smuggling anatomy ("icon") and colorRole
//! ("informative") into `property`. This rule flags that case directly by
//! scanning `property`'s hyphen-segments for a match against any advisory
//! structured-field registry.
//!
//! `COMPOUND_PROPERTIES` mirrors the same list in
//! tools/token-mapping-analyzer/src/decomposer.js — keep both in sync. It
//! short-circuits legitimate multi-word CSS properties (e.g. "text-align")
//! whose segments would otherwise coincidentally collide with a registry
//! term (anatomy has a "text" part).

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

/// Keep in sync with tools/token-mapping-analyzer/src/decomposer.js
/// `COMPOUND_PROPERTIES`. Matching is exact-string only, not prefix -- a new
/// compound term used with a suffix not yet listed here (e.g.
/// "border-width-thick") won't be exempted and its trailing segment(s) will
/// be checked against the structural-field registries like any other
/// property. Add the full suffixed form here if that's a false positive.
const COMPOUND_PROPERTIES: &[&str] = &[
    "font-size",
    "font-weight",
    "font-family",
    "font-style",
    "line-height",
    "text-transform",
    "text-align",
    "text-decoration",
    "corner-radius",
    "border-width",
    "minimum-width",
    "minimum-height",
    "minimum-padding-vertical",
    "component-size-minimum-perspective",
    "maximum-width",
    "maximum-height",
    "underline-gap",
    "typography-scale",
    "line-height-font-size",
    "component-height",
    "component-size-difference",
    "component-size-maximum-perspective",
    "component-size-width-ratio",
    "width-multiplier",
    "minimum-width-multiplier",
    "maximum-width-multiplier",
];

/// Structured fields whose presence inside `name.property` means the
/// property isn't atomic. Deliberately excludes `property` itself and
/// non-taxonomy fields (component, variant, icon, ...).
const STRUCTURAL_FIELDS: &[&str] = &[
    "anatomy",
    "object",
    "position",
    "size",
    "state",
    "colorRole",
    "emphasis",
];

/// Scan `property`'s hyphen-segments for every contiguous run that matches a
/// registered id in one of `STRUCTURAL_FIELDS`. Returns `(field, matched)`
/// pairs, deduplicated and sorted for deterministic diagnostic ordering.
fn structural_hits(property: &str, ctx: &ValidationContext<'_>) -> Vec<(&'static str, String)> {
    let segments: Vec<&str> = property.split('-').collect();
    let mut hits = Vec::new();

    for &field in STRUCTURAL_FIELDS {
        let Some(registry_set) = ctx.registry.for_field(field) else {
            continue;
        };
        for start in 0..segments.len() {
            for end in (start + 1)..=segments.len() {
                let candidate = segments[start..end].join("-");
                if registry_set.contains(&candidate) {
                    hits.push((field, candidate));
                }
            }
        }
    }

    hits.sort();
    hits.dedup();
    hits
}

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-050"
    }

    fn name(&self) -> &'static str {
        "property-decomposition-complete"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();

        for record in ctx.graph.tokens.values() {
            let Some(property) = record
                .raw
                .get("name")
                .and_then(|v| v.as_object())
                .and_then(|n| n.get("property"))
                .and_then(|v| v.as_str())
            else {
                continue;
            };

            if COMPOUND_PROPERTIES.contains(&property) {
                continue;
            }

            for (field, value) in structural_hits(property, ctx) {
                diags.push(Diagnostic {
                    file: record.file.clone(),
                    token: Some(record.name.clone()),
                    rule_id: Some("SPEC-050".into()),
                    severity: Severity::Warning,
                    message: format!(
                        "Token '{token}' fuses '{field}' concept '{value}' into \
                         name.property; decompose into the structured field",
                        token = record.name,
                    ),
                    instance_path: Some("/name/property".into()),
                    schema_path: None,
                });
            }
        }

        diags
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::validate::relational::diagnostics_for_rule;

    #[test]
    fn atomic_property_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-050").is_empty());
    }

    #[test]
    fn compound_css_property_no_warning() {
        // "text" alone is a registered anatomy part, but "font-size" is a
        // legitimate atomic CSS property and must not be flagged.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "font-size"}, "value": "12px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-050").is_empty());
    }

    #[test]
    fn icon_color_informative_warns_anatomy_and_color_role() {
        // Roundtrips cleanly through legacy-name generation today (property
        // is emitted verbatim), so SPEC-007 never flags it -- this is the
        // exact spectrum-design-data-284 blind spot SPEC-050 exists to catch.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "icon-color-informative"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-050");
        assert_eq!(diags.len(), 2);
        assert!(diags.iter().any(|d| d.message.contains("anatomy")));
        assert!(diags.iter().any(|d| d.message.contains("colorRole")));
    }

    #[test]
    fn background_color_warns_despite_being_a_registered_legacy_alias() {
        // "background-color" is itself a property-terms.json id (a legacy
        // roundtrip alias), but "background" independently collides with the
        // object/colorRole registries -- SPEC-050 must flag it regardless.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "background-color"}, "value": "#fff"}),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-050").is_empty());
    }

    #[test]
    fn already_decomposed_property_no_warning() {
        // Property is atomic once object/colorRole/state are split into their
        // own fields -- nothing left inside `property` to flag.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "object": "background", "state": ["selected"]}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-050").is_empty());
    }
}
