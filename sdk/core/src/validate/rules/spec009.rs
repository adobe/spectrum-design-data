// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-009: name-field-enum-sync
//!
//! Recognized name-object fields (component, state, variant, etc.) SHOULD use
//! values from the corresponding design-system-registry enums when those enums
//! are available.
//!
//! This is a warning-only rule. When no registry data is present in the
//! `ValidationContext`, the rule emits no diagnostics. Full enforcement
//! requires loading the design-system-registry into `TokenGraph` (tracked in
//! #763).
//!
//! Structural fields that are not enum-checked: `property` (free-form name),
//! dimension keys (`colorScheme`, `scale`, `contrast`) which are validated by
//! SPEC-005/SPEC-008 against dimension declarations.

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};

/// Name-object fields whose values may be enum-validated when a registry is
/// loaded. Dimension keys (colorScheme, scale, contrast) are excluded here
/// because they are covered by dimension-declaration rules (SPEC-005/SPEC-008).
const ENUM_CHECKED_FIELDS: &[&str] = &["component", "state", "variant", "size"];

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-009"
    }

    fn name(&self) -> &'static str {
        "name-field-enum-sync"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        // Registry enum data is not yet threaded into ValidationContext.
        // When it is (see #763), iterate ctx.graph.tokens, check each
        // ENUM_CHECKED_FIELDS value against the registry, and emit
        // Severity::Warning diagnostics for unknown values.
        //
        // The field list below is referenced to ensure it compiles and is
        // linked into the binary even before registry support is added.
        let _ = ENUM_CHECKED_FIELDS;
        let _ = ctx;
        Vec::new()
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
    fn no_diagnostics_without_registry() {
        // Rule emits nothing until registry data is available.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "component": "button"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }
}
