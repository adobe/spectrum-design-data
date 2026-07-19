// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

mod spec001;
mod spec002;
mod spec003;
mod spec004;
mod spec005;
mod spec006;
mod spec007;
mod spec008;
mod spec009;
mod spec010;
mod spec011;
mod spec012;
mod spec013;
mod spec014;
mod spec015;
mod spec016;
mod spec017;
mod spec018;
mod spec019;
mod spec020;
mod spec021;
mod spec022;
mod spec023;
mod spec024;
mod spec025;
mod spec026;
mod spec027;
mod spec028;
mod spec029;
mod spec030;
mod spec031;
mod spec032;
// SPEC-033 is a meta-rule (registry-id-cross-namespace-allowed) documented in rules.yaml
// but has no SDK implementation — it constrains validator behavior via spec prose, not data.
mod spec034;
mod spec035;
mod spec036;
mod spec037;
mod spec038;
mod spec039;
mod spec040;
mod spec041;
mod spec042;
mod spec043;
// SPEC-044 (dataset-structure) is a filesystem pre-pass, not a graph rule — it
// inspects the on-disk directory layout before the graph is built. See
// `crate::validate::dataset_structure` and `validate::validate_dataset`.
mod spec045;
mod spec046;
mod spec047;
mod spec048;

use std::collections::HashSet;

/// Domain → `$schema` URL suffix mapping shared by SPEC-042, SPEC-043, and the
/// authoring classification validator.
/// Update this list when new token-type schemas are introduced; all consumers
/// pick up the change automatically.
pub(crate) const DOMAIN_SCHEMAS: &[(&str, &[&str])] = &[
    (
        "color",
        &["color.json", "color-set.json", "gradient-stop.json"],
    ),
    (
        "typography",
        &[
            "font-family.json",
            "font-weight.json",
            "font-style.json",
            "font-size.json",
            "typography.json",
            "multiplier.json",
        ],
    ),
    (
        "motion",
        &[
            "duration.json",
            "easing.json",
            "motion.json",
            "motion-set.json",
        ],
    ),
];

/// Returns the domain name for a token's `$schema` URL, or `None` if not a known domain type.
pub(crate) fn schema_domain(schema_url: &str) -> Option<&'static str> {
    DOMAIN_SCHEMAS
        .iter()
        .find(|(_, suffixes)| suffixes.iter().any(|s| schema_url.ends_with(s)))
        .map(|(domain, _)| *domain)
}
use crate::graph::TokenGraph;
use crate::registry::RegistryData;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};

/// Lazily initialized embedded registry data (parsed once, reused).
fn embedded_registry() -> &'static RegistryData {
    RegistryData::embedded()
}

/// Rules that only produce findings when `--components-path` is loaded (they
/// short-circuit to a no-op otherwise). Used to downgrade component-rule errors
/// to warnings under `--components-report-only` during backlog burn-down; see
/// `ValidationReport::downgrade_rules` and bead spectrum-design-data-0jm.
pub const COMPONENT_RULE_IDS: &[&str] = &[
    "SPEC-018", "SPEC-020", "SPEC-022", "SPEC-026", "SPEC-027", "SPEC-031", "SPEC-035", "SPEC-040",
];

/// All default catalog rules. See packages/design-data-spec/rules/rules.yaml for the full catalog.
pub fn default_rules() -> Vec<Box<dyn ValidationRule>> {
    vec![
        Box::new(spec001::Rule),
        Box::new(spec002::Rule),
        Box::new(spec003::Rule),
        Box::new(spec004::Rule),
        Box::new(spec005::Rule),
        Box::new(spec006::Rule),
        Box::new(spec007::Rule),
        Box::new(spec008::Rule),
        Box::new(spec009::Rule),
        Box::new(spec010::Rule),
        Box::new(spec011::Rule),
        Box::new(spec012::Rule),
        Box::new(spec013::Rule),
        Box::new(spec014::Rule),
        Box::new(spec015::Rule),
        Box::new(spec016::Rule),
        Box::new(spec017::Rule),
        Box::new(spec018::Rule),
        Box::new(spec019::Rule),
        Box::new(spec020::Rule),
        Box::new(spec021::Rule),
        Box::new(spec022::Rule),
        Box::new(spec023::Rule),
        Box::new(spec024::Rule),
        Box::new(spec025::Rule),
        Box::new(spec026::Rule),
        Box::new(spec027::Rule),
        Box::new(spec028::Rule),
        Box::new(spec029::Rule),
        Box::new(spec030::Rule),
        Box::new(spec031::Rule),
        Box::new(spec032::Rule),
        Box::new(spec034::Rule),
        Box::new(spec035::Rule),
        Box::new(spec036::Rule),
        Box::new(spec037::Rule),
        Box::new(spec038::Rule),
        Box::new(spec039::Rule),
        Box::new(spec040::Rule),
        Box::new(spec041::Rule),
        Box::new(spec042::Rule),
        Box::new(spec043::Rule),
        Box::new(spec045::Rule),
        Box::new(spec046::Rule),
        Box::new(spec047::Rule),
        Box::new(spec048::Rule),
    ]
}

/// Run every rule and collect diagnostics.
///
/// Pass `manifest` when a platform manifest document is available; rules such
/// as SPEC-039 read manifest fields and are silently no-ops when it is `None`.
pub fn run_rules(
    graph: &TokenGraph,
    naming_exceptions: &HashSet<String>,
    manifest: Option<&serde_json::Value>,
) -> Vec<Diagnostic> {
    let registry = embedded_registry();
    let ctx = ValidationContext {
        graph,
        naming_exceptions,
        registry,
        manifest,
    };
    let mut out = Vec::new();
    for r in default_rules() {
        out.extend(r.validate(&ctx));
    }
    out
}
