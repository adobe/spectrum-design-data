// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! [`diff_values`]: read-only, value-level counterpart to
//! [`build_import_overrides`](super::overrides::build_import_overrides) —
//! classifies every Figma variable and design-data token instead of emitting
//! overrides for the divergent ones.

use std::collections::{BTreeSet, HashMap};
use std::path::PathBuf;

use serde::Serialize;
use serde_json::Value;

use super::naming::{invert_name, resolve_alias_target};
use super::resolve::{
    collapse_modes, default_source_context, diff_against_source, multimode_name_field,
    record_concept_id, record_is_font_name, record_is_opacity, resolve_figma_value,
    resolve_set_member_in_context, scale_aligned_source_value,
};
use crate::mapping::build_export_payload;
use crate::types::{FigmaVariable, VariablesMeta};
use crate::FigmaError;
use design_data_core::graph::TokenGraph;

/// One variable/token's classification in a [`DiffReport`].
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "class", rename_all = "kebab-case")]
pub enum DiffClass {
    /// Figma's value matches the manifest-resolved source.
    Match,
    /// Figma's value diverges from the manifest-resolved source.
    ValueMismatch { design_data: Value, figma: Value },
    /// A Figma variable with no corresponding design-data token.
    FigmaOnly,
    /// A design-data token the generator would export, but no matching
    /// Figma variable exists in the file.
    DesignDataOnly,
    /// Covered by neither an override (multi-mode divergent) nor a
    /// convertible value (unresolved alias, or an unhandled resolved type).
    SkippedUncovered { reason: String },
    /// A genuinely multi-mode variable (e.g. `.Color theme`'s Light/Dark/
    /// Wireframe) whose modes were compared individually against the
    /// design-data value resolved for that same named mode, rather than
    /// collapsed into one value. Present only when at least one mode isn't a
    /// [`DiffClass::Match`] — full agreement across modes is reported as a
    /// plain [`DiffClass::Match`] instead.
    MultiModeMismatch { modes: Vec<ModeDiff> },
}

/// One Figma mode's classification within a [`DiffClass::MultiModeMismatch`].
#[derive(Debug, Clone, Serialize)]
pub struct ModeDiff {
    /// The Figma mode name (e.g. "Light", "Dark", "Wireframe").
    pub mode: String,
    /// Reuses [`DiffClass`] for the per-mode outcome — a mode can only ever
    /// land on `Match`, `ValueMismatch`, `FigmaOnly`, or `SkippedUncovered`
    /// (never `DesignDataOnly` or another `MultiModeMismatch`), but a
    /// dedicated enum for that subset isn't worth the duplication.
    #[serde(flatten)]
    pub class: DiffClass,
}

/// One entry in a [`DiffReport`]: a Figma variable name (or, for
/// [`DiffClass::DesignDataOnly`], the name the generator would produce)
/// paired with its classification.
#[derive(Debug, Clone, Serialize)]
pub struct DiffEntry {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub legacy_key: Option<String>,
    /// True when this variable's name came from the `--mapping` rename
    /// artifact rather than the default `{prefix}/{legacyKey}` convention.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub renamed: bool,
    #[serde(flatten)]
    pub class: DiffClass,
}

/// Per-category totals for a [`DiffReport`], for quick scanning.
#[derive(Debug, Clone, Serialize, Default)]
pub struct DiffCounts {
    pub matched: usize,
    pub value_mismatch: usize,
    pub figma_only: usize,
    pub design_data_only: usize,
    pub renamed: usize,
    pub skipped_uncovered: usize,
    pub multi_mode_mismatch: usize,
}

/// Value-level diff report: every Figma variable and every design-data
/// token the generator would export, classified.
#[derive(Debug, Clone, Serialize, Default)]
pub struct DiffReport {
    /// Sorted by name for stable, script-friendly output.
    pub entries: Vec<DiffEntry>,
    pub counts: DiffCounts,
}

/// Compare a genuinely multi-mode Figma variable (more than one populated
/// mode, backed by a design-data set) mode-by-mode against the design-data
/// value resolved for that same named mode, instead of [`collapse_modes`]'
/// single-value-or-give-up model — the entire point of `.Color theme` is that
/// its Light/Dark/Wireframe modes diverge, so requiring universal agreement
/// discards nearly 60% of that collection as `skipped-uncovered` today.
///
/// Rolls up to a plain [`DiffClass::Match`] when every mode agrees, to
/// [`DiffClass::SkippedUncovered`] when every mode is uncovered (no
/// design-data value to compare in any mode — a coverage gap, not a
/// divergence), else [`DiffClass::MultiModeMismatch`] listing every mode's
/// own classification (matches included, for context).
fn diff_multimode(
    variable: &FigmaVariable,
    meta: &VariablesMeta,
    graph: &TokenGraph,
    legacy_key: &str,
    record: &design_data_core::graph::TokenRecord,
    leaf: &design_data_core::graph::TokenRecord,
) -> DiffClass {
    let collection = meta
        .variable_collections
        .get(&variable.variable_collection_id);
    let is_opacity = record_is_opacity(leaf);
    let is_font_name = record_is_font_name(leaf);
    let concept_id = record_concept_id(&record.raw);

    let mut mode_ids: Vec<&String> = variable.values_by_mode.keys().collect();
    mode_ids.sort();

    let mut modes = Vec::with_capacity(mode_ids.len());
    for mode_id in mode_ids {
        let mode_name = collection
            .and_then(|c| c.modes.iter().find(|m| &m.mode_id == mode_id))
            .map_or_else(|| mode_id.clone(), |m| m.name.clone());
        let mode_key = mode_name.to_lowercase();

        let figma_value = variable
            .values_by_mode
            .get(mode_id)
            .and_then(|v| resolve_figma_value(meta, v, 0, Some(&mode_name)));

        // The design-data value resolved for this same named mode: align to
        // the matching set member via `resolve_set_member_in_context` (same
        // helper `scale_aligned_source_value` uses). A mode field we don't
        // recognize (or no concept_id) falls back to `leaf`'s own value, since
        // that's an ordinary single-valued token, not a real per-mode
        // divergence. A *recognized* mode field that fails to resolve (no
        // design-data member matches this Figma mode) is reported
        // `SkippedUncovered` below instead of being compared against an
        // unrelated mode's value.
        let dd_resolution = multimode_name_field(graph, &mode_key).map(|field| {
            let ctx = HashMap::from([(field.to_string(), mode_key.clone())]);
            graph
                .resolve_relationship_ref_in_context(legacy_key, &ctx)
                .and_then(|rec| {
                    rec.resolve_leaf_in_context(graph, &ctx)
                        .raw
                        .get("value")
                        .cloned()
                })
                .or_else(|| {
                    // `record`'s own `conceptId` is only trustworthy as a
                    // fallback when `legacy_key` isn't CTR-backed at all —
                    // for a CTR with sibling records, `record` was resolved
                    // context-free and may be an arbitrary (e.g. Light)
                    // sibling, so falling back to *its* `conceptId` here for
                    // a mode none of the siblings actually cover would
                    // silently compare against the wrong palette step
                    // instead of reporting the mode uncovered.
                    (!graph.has_relationship_record(legacy_key))
                        .then(|| {
                            concept_id.and_then(|concept_id| {
                                resolve_set_member_in_context(graph, concept_id, field, &mode_key)
                            })
                        })
                        .flatten()
                })
        });

        let class = if let Some(None) = dd_resolution {
            DiffClass::SkippedUncovered {
                reason: "uncovered".to_string(),
            }
        } else {
            let dd_value = dd_resolution
                .flatten()
                .or_else(|| leaf.raw.get("value").cloned());
            match figma_value {
                None => DiffClass::SkippedUncovered {
                    reason: "unconvertible".to_string(),
                },
                Some(figma_value) => match diff_against_source(
                    &variable.resolved_type,
                    &figma_value,
                    dd_value.as_ref(),
                    is_opacity,
                    is_font_name,
                ) {
                    Ok(None) => DiffClass::Match,
                    Ok(Some(_)) if dd_value.is_none() => DiffClass::FigmaOnly,
                    Ok(Some(figma)) => DiffClass::ValueMismatch {
                        design_data: dd_value.clone().unwrap_or(Value::Null),
                        figma,
                    },
                    Err(()) => DiffClass::SkippedUncovered {
                        reason: "unconvertible".to_string(),
                    },
                },
            }
        };
        modes.push(ModeDiff {
            mode: mode_name,
            class,
        });
    }

    if modes.iter().all(|m| matches!(m.class, DiffClass::Match)) {
        DiffClass::Match
    } else if modes
        .iter()
        .all(|m| matches!(m.class, DiffClass::SkippedUncovered { .. }))
    {
        // No mode resolved to a design-data value at all: the concept isn't
        // covered per color-scheme, which is a coverage gap, not a per-mode
        // divergence — don't inflate MultiModeMismatch with it.
        DiffClass::SkippedUncovered {
            reason: "multimode-uncovered".to_string(),
        }
    } else {
        DiffClass::MultiModeMismatch { modes }
    }
}

/// Read-only, value-level counterpart to
/// [`build_import_overrides`](super::overrides::build_import_overrides):
/// instead of emitting manifest overrides for divergent variables, classifies
/// *every* Figma variable and design-data token as match / value-mismatch /
/// figma-only / design-data-only / skipped-uncovered (with a `renamed` flag
/// when the `--mapping` artifact supplied the name).
///
/// `mapping` is the forward name-mapping artifact (legacy key → Figma name),
/// the same direction `figma export --mapping` and [`build_export_payload`]
/// use; this reverses it internally for the Figma-driven walk, which needs
/// the opposite direction (as `build_import_overrides` does).
///
/// The design-data-only pass reuses [`build_export_payload`] to compute the
/// set of Figma names the generator would produce (the same approach
/// `figma::audit::audit_names` uses for its `generated_only` bucket), so it
/// requires the file to contain the `.Color theme` and `.Platform scale`
/// collections `build_export_payload` targets.
pub fn diff_values(
    meta: &VariablesMeta,
    graph: &TokenGraph,
    tokens: &[(String, PathBuf, Value)],
    mapping: Option<&HashMap<String, String>>,
) -> Result<DiffReport, FigmaError> {
    let reversed: Option<HashMap<String, String>> =
        mapping.map(|m| m.iter().map(|(k, v)| (v.clone(), k.clone())).collect());

    let mut entries = Vec::new();
    let mut counts = DiffCounts::default();
    let mut seen: BTreeSet<String> = BTreeSet::new();

    let mut variables: Vec<&FigmaVariable> =
        meta.variables.values().filter(|v| !v.remote).collect();
    variables.sort_by(|a, b| a.name.cmp(&b.name));

    for variable in variables {
        seen.insert(variable.name.clone());
        let renamed = reversed
            .as_ref()
            .is_some_and(|m| m.contains_key(&variable.name));
        if renamed {
            counts.renamed += 1;
        }

        // A bare (slash-less) Figma name — e.g. the single-mode
        // `S2.Color-theme` collection's opacity variables, which are all
        // `VARIABLE_ALIAS`es into `.Color theme` — never inverts via
        // `invert_name`'s `{prefix}/{legacyKey}` convention, so it can't
        // reach the alias-target fallback below unless that fallback runs
        // even when inversion itself fails outright (not just when it
        // inverts to something the graph can't resolve).
        let inverted = invert_name(&variable.name, reversed.as_ref());
        let resolved = inverted
            .as_ref()
            .and_then(|legacy_key| {
                graph
                    .resolve_alias_key(legacy_key)
                    .or_else(|| graph.resolve_relationship_ref(legacy_key))
                    .map(|record| (legacy_key.clone(), record))
                    // A naive name inversion can coincidentally land on a real but
                    // wrong-shaped token: a multi-layer composite (e.g. `drop-shadow-
                    // dragged`'s array of shadow layers) has `value: [...]`, which no
                    // scalar Figma variable (COLOR/FLOAT/STRING) can hold — so a
                    // Figma alias named e.g. `Alias/drop-shadow/dragged` whose
                    // inverted name happens to equal that composite's own key isn't
                    // actually a match for it. Treat it as unresolved so the
                    // alias-target fallback below can find the real (flat) sibling
                    // token instead (e.g. `drop-shadow-dragged-color`).
                    .filter(|(_, record)| !record.raw.get("value").is_some_and(Value::is_array))
            })
            .or_else(|| resolve_alias_target(variable, meta, graph, reversed.as_ref()));
        let Some((legacy_key, record)) = resolved else {
            counts.figma_only += 1;
            entries.push(DiffEntry {
                name: variable.name.clone(),
                legacy_key: inverted,
                renamed,
                class: DiffClass::FigmaOnly,
            });
            continue;
        };

        let leaf = record.resolve_leaf(graph);

        // A genuinely multi-mode variable backed by a design-data set (e.g.
        // `.Color theme`'s Light/Dark/Wireframe) diverging across modes is
        // the normal case, not the `collapse_modes` "give up" case below —
        // compare each mode against its own named design-data value instead
        // of requiring universal agreement. Single-mode variables and
        // tokens with no set to align to (ordinary single-value tokens) fall
        // through unchanged to the existing collapse-and-compare path.
        if variable.values_by_mode.len() > 1
            && (record_concept_id(&record.raw).is_some()
                || graph.has_relationship_record(&legacy_key))
        {
            let class = diff_multimode(variable, meta, graph, &legacy_key, record, leaf);
            match &class {
                DiffClass::Match => counts.matched += 1,
                DiffClass::SkippedUncovered { .. } => counts.skipped_uncovered += 1,
                _ => counts.multi_mode_mismatch += 1,
            }
            entries.push(DiffEntry {
                name: variable.name.clone(),
                legacy_key: Some(legacy_key),
                renamed,
                class,
            });
            continue;
        }

        let collapsed = match collapse_modes(variable, meta) {
            Ok(Some(v)) => v,
            Ok(None) => {
                counts.skipped_uncovered += 1;
                entries.push(DiffEntry {
                    name: variable.name.clone(),
                    legacy_key: Some(legacy_key),
                    renamed,
                    class: DiffClass::SkippedUncovered {
                        reason: "multimode-divergent".to_string(),
                    },
                });
                continue;
            }
            Err(()) => {
                counts.skipped_uncovered += 1;
                entries.push(DiffEntry {
                    name: variable.name.clone(),
                    legacy_key: Some(legacy_key),
                    renamed,
                    class: DiffClass::SkippedUncovered {
                        reason: "unconvertible".to_string(),
                    },
                });
                continue;
            }
        };

        // `record` may be one of several tokens sharing this legacy_key,
        // disambiguated only by `name.scale`/`name.colorScheme` (a scale-set's
        // desktop/mobile members, a color-set's light/dark/wireframe members).
        // Walking its alias chain context-free (`resolve_leaf`) can drop that
        // axis the moment a hop lands on another concept_id, degrading to an
        // arbitrary (first-indexed) member instead of staying on the same
        // scale/scheme the top-level record was picked for. Pin the chain to
        // that same axis, matching how a mode-less Figma variable's own alias
        // chain stays on one collection mode (its default) throughout.
        let leaf = default_source_context(record)
            .map(|ctx| record.resolve_leaf_in_context(graph, &ctx))
            .unwrap_or(leaf);

        let source_value = scale_aligned_source_value(variable, meta, graph, leaf);
        let is_opacity = record_is_opacity(leaf);
        let is_font_name = record_is_font_name(leaf);
        let class = match diff_against_source(
            &variable.resolved_type,
            &collapsed,
            source_value.as_ref(),
            is_opacity,
            is_font_name,
        ) {
            Ok(None) => {
                counts.matched += 1;
                DiffClass::Match
            }
            Ok(Some(figma_value)) => {
                counts.value_mismatch += 1;
                DiffClass::ValueMismatch {
                    design_data: source_value.clone().unwrap_or(Value::Null),
                    figma: figma_value,
                }
            }
            Err(()) => {
                counts.skipped_uncovered += 1;
                DiffClass::SkippedUncovered {
                    reason: "unconvertible".to_string(),
                }
            }
        };
        entries.push(DiffEntry {
            name: variable.name.clone(),
            legacy_key: Some(legacy_key),
            renamed,
            class,
        });
    }

    // Design-data-only pass: names the generator would produce that no real
    // Figma variable in the file covers.
    // A file missing the `.Color theme`/`.Platform scale` collections can't
    // produce an export payload at all; that's a reason to skip this one
    // pass, not to discard the Figma-driven diff already computed above.
    if let Ok((body, _summary)) = build_export_payload(tokens, meta, mapping) {
        for action in &body.variables {
            if !seen.contains(&action.name) {
                let legacy_key = invert_name(&action.name, reversed.as_ref());
                // A legacy key that never resolved (e.g. a cascade-format
                // token with no usable `name`/`legacyKey` field) falls back
                // to its synthetic `path:index` graph key, which always
                // contains `.json:` — surface that as a skip, not a
                // misleading "real gap" entry.
                if action.name.contains(".json:") {
                    counts.skipped_uncovered += 1;
                    entries.push(DiffEntry {
                        name: action.name.clone(),
                        legacy_key,
                        renamed: false,
                        class: DiffClass::SkippedUncovered {
                            reason: "legacy-key-unresolved".to_string(),
                        },
                    });
                    continue;
                }
                counts.design_data_only += 1;
                entries.push(DiffEntry {
                    name: action.name.clone(),
                    legacy_key,
                    renamed: false,
                    class: DiffClass::DesignDataOnly,
                });
            }
        }
    }

    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(DiffReport { entries, counts })
}
