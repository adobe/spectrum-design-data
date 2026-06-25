// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared facet-suggestion infrastructure used by both the find wizard and the
//! authoring wizard's classification screen.
//!
//! # Pattern
//!
//! Given a focused field key (e.g. `"property"`, `"component"`, `"variant"`):
//! 1. Build the candidate universe from the live `TokenIndex` for that field.
//! 2. Fall back to the static `RegistryData` vocabulary when the index has no entries.
//! 3. Optionally constrain counts with cross-field `facet_counts` from the active query.
//! 4. Filter by typed prefix, then sort reachable (count > 0) first / dimmed (count == 0) last.
//!
//! Both the find wizard ([`super::super::find`]) and the classification screen
//! ([`super::classification`]) call [`field_suggestions`] to populate their
//! suggestion lists.

use std::collections::HashMap;

use design_data_core::query::TokenIndex;
use design_data_core::registry::RegistryData;

use super::caps::MAX_PROPERTY_SUGGESTIONS;

/// A single autocomplete candidate for a structured name-object field.
///
/// `count` is the number of tokens that match the full filter when this value
/// is applied to the focused field (given any other fields already set).
/// `count == 0` signals an incompatible value — the view renders it dimmed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FacetOption {
    pub value: String,
    pub count: usize,
}

/// How many zero-count (incompatible) options to append below the reachable list.
const ZERO_COUNT_TAIL: usize = 4;

/// Build a sorted suggestion list for `field_key` given what the user has typed
/// (`typed`, already lowercased) and an optional pre-computed cross-field
/// constraint map.
///
/// # Arguments
/// * `field_key`   — e.g. `"property"`, `"component"`, `"variant"`, `"state"`.
/// * `typed`       — the current input value (trimmed, lowercased) used as a
///   substring filter.
/// * `index`       — live `TokenIndex` from the current `UpdateCtx`; supplies
///   real corpus counts for each field value.
/// * `constrained` — cross-field match counts (from `query::facet_counts`); when
///   `None` the baseline index counts are used directly.
///
/// Returns a `Vec<FacetOption>` capped at `MAX_PROPERTY_SUGGESTIONS` reachable
/// entries plus `ZERO_COUNT_TAIL` dimmed entries.
pub fn field_suggestions(
    field_key: &str,
    typed: &str,
    index: &TokenIndex,
    constrained: Option<&HashMap<String, usize>>,
) -> Vec<FacetOption> {
    // 1. Candidate universe — live corpus counts, or static registry fallback.
    let from_index = index.field_value_counts(field_key);
    let candidates: Vec<(String, usize)> = if from_index.is_empty() {
        // No corpus entries for this field: fall back to the static registry vocabulary.
        RegistryData::embedded()
            .for_field(field_key)
            .map(|vocab| vocab.iter().map(|v| (v.clone(), 0)).collect())
            .unwrap_or_default()
    } else {
        from_index.into_iter().collect()
    };

    // 2. Filter by typed substring.
    let mut options: Vec<FacetOption> = candidates
        .into_iter()
        .filter(|(v, _)| typed.is_empty() || v.to_lowercase().contains(typed))
        .map(|(value, baseline_count)| {
            let count = constrained
                .and_then(|c| c.get(&value))
                .copied()
                .unwrap_or(baseline_count);
            FacetOption { value, count }
        })
        .collect();

    // 3. Sort: reachable (count > 0) first by count desc then value asc;
    //    incompatible (count == 0) last alphabetically.
    options.sort_by(|a, b| match (a.count > 0, b.count > 0) {
        (true, true) => b.count.cmp(&a.count).then_with(|| a.value.cmp(&b.value)),
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        (false, false) => a.value.cmp(&b.value),
    });

    // 4. Cap: reachable slice + dimmed tail.
    let reachable: Vec<_> = options
        .iter()
        .filter(|o| o.count > 0)
        .take(MAX_PROPERTY_SUGGESTIONS)
        .cloned()
        .collect();
    let dimmed: Vec<_> = options
        .iter()
        .filter(|o| o.count == 0)
        .take(ZERO_COUNT_TAIL)
        .cloned()
        .collect();

    reachable.into_iter().chain(dimmed).collect()
}
