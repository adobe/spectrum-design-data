// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! [`pair_by_value`]: draft `legacyKey -> figmaName` pairing candidates for
//! Figma variables whose name doesn't already invert to a known token, by
//! matching resolved values instead.

use std::collections::{HashMap, HashSet};

use super::naming::invert_name;
use super::resolve::{
    collapse_modes, diff_against_source, record_is_font_name, record_is_opacity,
    scale_aligned_source_value,
};
use crate::types::VariablesMeta;
use design_data_core::graph::TokenGraph;

/// One candidate `legacyKey -> figmaName` override drafted by
/// [`pair_by_value`], for human review before merging into a mapping
/// artifact consumed by `figma export`/`diff --mapping`.
#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct PairingCandidate {
    pub legacy_key: String,
    pub figma_name: String,
}

/// Report from [`pair_by_value`]: drafted candidates plus what couldn't be
/// resolved, for human curation.
#[derive(Debug, Clone, serde::Serialize, Default)]
pub struct PairingReport {
    pub candidates: Vec<PairingCandidate>,
    /// Figma names whose value resolved but matched more than one
    /// design-data token, even after path-based disambiguation — needs a
    /// human pick.
    pub ambiguous: Vec<String>,
    /// Figma names whose value didn't resolve (dangling/cyclic alias) or
    /// matched zero design-data tokens (e.g. `app-frame`, which has no
    /// design-data counterpart — permanently figma-only).
    pub unmatched: Vec<String>,
}

/// Word set used to disambiguate a value collision: `suggest::tokenize`'s
/// split (any non-alphanumeric separator, single-char words dropped) with
/// pure-digit words also dropped — a Figma path and a legacy key can share
/// a bare scale index (e.g. `100`) with no semantic overlap at all, which
/// must not read as a real word match.
fn semantic_words(s: &str) -> HashSet<String> {
    design_data_core::suggest::tokenize(s)
        .into_iter()
        .filter(|w| !w.chars().all(|c| c.is_ascii_digit()))
        .collect()
}

/// Score how well two word sets match by Jaccard similarity, for
/// disambiguating a value collision (several design-data tokens sharing one
/// resolved value). A design-data token's semantic identity (e.g. `notice`,
/// `background`, `key-focus`) lives in its own key, not in its raw
/// name-cascade field values (those are primitive scale identifiers like
/// `colorFamily`/`scaleIndex`), so comparing against the key itself is what
/// actually breaks these ties.
///
/// Returned as `(intersection, union)` rather than a ratio so callers can
/// compare two scores exactly via cross-multiplication
/// (`a.0 * b.1` vs `b.0 * a.1`) instead of float equality.
fn word_overlap(a: &HashSet<String>, b: &HashSet<String>) -> (usize, usize) {
    let intersection = a.intersection(b).count();
    let union = a.union(b).count();
    (intersection, union.max(1))
}

/// Draft `legacyKey -> figmaName` override candidates for Figma variables
/// whose name doesn't already invert to a known legacy key (`invert_name`/
/// `resolve_alias_key`), by matching resolved values instead.
///
/// Only variables whose name starts with one of `name_prefixes` (e.g.
/// `["Alias/", "Icon/"]`) are considered — Palette and any name already
/// resolved or explicitly mapped via `mapping` are left alone, so this only
/// fills genuine gaps. `mapping` is the same forward `legacyKey ->
/// figmaName` artifact `figma export`/`diff --mapping` use. Every
/// candidate's value is checked against every design-data token's resolved
/// (alias-followed) value via the same [`diff_against_source`] comparison
/// the diff itself uses, so a candidate is never proposed on a value the
/// diff would call `value-mismatch`.
pub fn pair_by_value(
    meta: &VariablesMeta,
    graph: &TokenGraph,
    name_prefixes: &[&str],
    mapping: Option<&HashMap<String, String>>,
) -> PairingReport {
    // `invert_name` expects a figmaName -> legacyKey map, the reverse of
    // `mapping`'s legacyKey -> figmaName convention (mirrors `diff_values`).
    let reversed: Option<HashMap<String, String>> =
        mapping.map(|m| m.iter().map(|(k, v)| (v.clone(), k.clone())).collect());

    let mut report = PairingReport::default();

    // legacy_key -> alias-resolved leaf record, mirroring how the CLI
    // derives legacy keys for `diff_values` (main.rs: extract_legacy_key on
    // the raw name, falling back to the graph key).
    let mut by_key: std::collections::BTreeMap<String, &design_data_core::graph::TokenRecord> =
        std::collections::BTreeMap::new();
    // `graph.tokens` is a HashMap, so iterate in graph-key order rather than
    // hash order — when two tokens derive the same legacy_key, `or_insert_with`
    // below keeps whichever comes first, and that pick must be stable across
    // runs (it previously wasn't: HashMap iteration order varies per process).
    let mut sorted_keys: Vec<&String> = graph.tokens.keys().collect();
    sorted_keys.sort();
    for key in sorted_keys {
        let record = &graph.tokens[key];
        let legacy_key = record
            .raw
            .get("name")
            .and_then(design_data_core::naming::extract_legacy_key)
            .unwrap_or_else(|| record.name.clone());
        by_key
            .entry(legacy_key)
            .or_insert_with(|| record.resolve_leaf(graph));
    }
    // Each legacy_key's word set is reused across every colliding variable
    // that considers it, so tokenize once here rather than per comparison.
    let key_words: HashMap<&str, HashSet<String>> = by_key
        .keys()
        .map(|key| (key.as_str(), semantic_words(key)))
        .collect();

    for variable in meta.variables.values() {
        // A remote/library-linked variable is never a real pairing target —
        // `diff_values`/`build_import_overrides` both skip these too.
        if variable.remote {
            continue;
        }
        if !name_prefixes.iter().any(|p| variable.name.starts_with(p)) {
            continue;
        }
        if invert_name(&variable.name, reversed.as_ref()).is_some_and(|k| {
            by_key.contains_key(&k) || graph.resolve_relationship_ref(&k).is_some()
        }) {
            continue; // already resolves by name (direct token or CTR) — nothing to pair
        }

        // `collapse_modes` (not a raw `values_by_mode.values().next()` pick)
        // both cross-checks multi-mode agreement and resolves alias chains
        // deterministically — a plain HashMap `.next()` here previously made
        // results flip between runs on the same snapshot.
        let resolved = match collapse_modes(variable, meta) {
            Ok(Some(v)) => v,
            Ok(None) | Err(()) => {
                report.unmatched.push(variable.name.clone());
                continue;
            }
        };

        // ponytail: O(N×M) scan (N unresolved variables × M design-data
        // tokens) — at S2.Color-theme's scale (hundreds of each) this runs
        // in milliseconds; build a value -> [legacy_key] index once if this
        // is ever called against a much larger corpus.
        let matches: Vec<&str> = by_key
            .iter()
            .filter(|(_, leaf)| {
                let source_value = scale_aligned_source_value(variable, meta, graph, leaf);
                diff_against_source(
                    &variable.resolved_type,
                    &resolved,
                    source_value.as_ref(),
                    record_is_opacity(leaf),
                    record_is_font_name(leaf),
                )
                .is_ok_and(|v| v.is_none())
            })
            .map(|(key, _)| key.as_str())
            .collect();

        let chosen = match matches.as_slice() {
            [] => None,
            [only] => Some((*only).to_string()),
            several => {
                // Compare Jaccard ratios (intersection/union) without floats:
                // a.0/a.1 >= b.0/b.1  <=>  a.0*b.1 >= b.0*a.1. Equal ratios
                // then break on the larger absolute intersection — 4/10 is a
                // stronger match than 2/5 even though the ratio is the same,
                // so it isn't treated as a coin-flip tie against it.
                let score_cmp = |a: &(usize, usize), b: &(usize, usize)| {
                    (a.0 * b.1).cmp(&(b.0 * a.1)).then(a.0.cmp(&b.0))
                };
                let name_words = semantic_words(&variable.name);
                let scored: Vec<((usize, usize), &str)> = several
                    .iter()
                    .map(|key| {
                        let overlap = key_words
                            .get(key)
                            .map_or((0, 1), |words| word_overlap(&name_words, words));
                        (overlap, *key)
                    })
                    .collect();
                let best = scored.iter().map(|(score, _)| *score).max_by(score_cmp);
                match best {
                    // A zero-intersection "winner" carries no signal — every
                    // candidate is equally (dis)similar, so it isn't a real
                    // disambiguation and must still fall through to ambiguous.
                    Some(best) if best.0 > 0 => {
                        let winners: Vec<&str> = scored
                            .iter()
                            .filter(|(score, _)| score_cmp(score, &best).is_eq())
                            .map(|(_, key)| *key)
                            .collect();
                        match winners.as_slice() {
                            [only] => Some((*only).to_string()),
                            _ => None,
                        }
                    }
                    _ => None,
                }
            }
        };

        match chosen {
            Some(legacy_key) => report.candidates.push(PairingCandidate {
                legacy_key,
                figma_name: variable.name.clone(),
            }),
            None if matches.len() > 1 => report.ambiguous.push(variable.name.clone()),
            None => report.unmatched.push(variable.name.clone()),
        }
    }

    // A `legacyKey -> figmaName` mapping artifact can only hold one figmaName
    // per key, so if two different Figma variables both independently chose
    // the same legacy_key, neither pick was truly distinguishing — demote
    // both back to ambiguous rather than silently emitting a pair the
    // mapping artifact would then collide on.
    let mut counts: HashMap<String, usize> = HashMap::new();
    for candidate in &report.candidates {
        *counts.entry(candidate.legacy_key.clone()).or_default() += 1;
    }
    let (colliding, unique): (Vec<_>, Vec<_>) = report
        .candidates
        .into_iter()
        .partition(|c| counts[&c.legacy_key] > 1);
    report.candidates = unique;
    report
        .ambiguous
        .extend(colliding.into_iter().map(|c| c.figma_name));

    report.candidates.sort();
    report.ambiguous.sort();
    report.unmatched.sort();
    report
}
