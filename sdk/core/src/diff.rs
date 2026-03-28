// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Semantic diff engine — compare two token graph versions and produce a
//! structured change report.
//!
//! Implements the diff specification in `spec/diff.md`: six mutually exclusive
//! categories (renamed, deprecated, reverted, added, deleted, updated) with
//! property-level change tracking.

use std::collections::{HashMap, HashSet};

use serde::Serialize;
use serde_json::Value;

use crate::graph::{TokenGraph, TokenRecord};

// ── Public types ────────────────────────────────────────────────────────────

/// The type of a property-level change.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChangeType {
    Added,
    Deleted,
    Updated,
}

/// A single property-level change within a token.
#[derive(Debug, Clone, Serialize)]
pub struct PropertyChange {
    pub path: String,
    pub change_type: ChangeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_value: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_value: Option<Value>,
}

/// A token that was renamed (same identity, different name).
#[derive(Debug, Clone, Serialize)]
pub struct RenamedToken {
    pub old_name: String,
    pub new_name: String,
    pub uuid: Option<String>,
    pub property_changes: Vec<PropertyChange>,
}

/// A new token carrying a `deprecated` field.
#[derive(Debug, Clone, Serialize)]
pub struct DeprecatedToken {
    pub name: String,
    pub uuid: Option<String>,
}

/// A matched token that lost its `deprecated` field.
#[derive(Debug, Clone, Serialize)]
pub struct RevertedToken {
    pub name: String,
    pub uuid: Option<String>,
}

/// A truly new token (not renamed, not deprecated).
#[derive(Debug, Clone, Serialize)]
pub struct AddedToken {
    pub name: String,
    pub uuid: Option<String>,
}

/// A truly deleted token (not the source of a rename).
#[derive(Debug, Clone, Serialize)]
pub struct DeletedToken {
    pub name: String,
    pub uuid: Option<String>,
}

/// A matched token with property-level changes.
#[derive(Debug, Clone, Serialize)]
pub struct UpdatedToken {
    pub name: String,
    pub uuid: Option<String>,
    pub property_changes: Vec<PropertyChange>,
}

/// Complete diff report between two dataset versions.
#[derive(Debug, Clone, Default, Serialize)]
pub struct DiffReport {
    pub renamed: Vec<RenamedToken>,
    pub deprecated: Vec<DeprecatedToken>,
    pub reverted: Vec<RevertedToken>,
    pub added: Vec<AddedToken>,
    pub deleted: Vec<DeletedToken>,
    pub updated: Vec<UpdatedToken>,
}

impl DiffReport {
    /// Returns `true` if no changes were detected.
    pub fn is_empty(&self) -> bool {
        self.renamed.is_empty()
            && self.deprecated.is_empty()
            && self.reverted.is_empty()
            && self.added.is_empty()
            && self.deleted.is_empty()
            && self.updated.is_empty()
    }
}

// ── Internal types ──────────────────────────────────────────────────────────

/// A paired token across old and new graphs.
struct TokenPair<'a> {
    old: &'a TokenRecord,
    new: &'a TokenRecord,
}

// ── Engine ──────────────────────────────────────────────────────────────────

/// Compute a semantic diff between two token graphs.
///
/// Follows the category partitioning order defined in `spec/diff.md`:
/// renamed → deprecated → reverted → added → deleted → updated.
pub fn semantic_diff(old: &TokenGraph, new: &TokenGraph) -> DiffReport {
    let (pairs, unpaired_old, unpaired_new) = pair_tokens(old, new);

    // 1. Renamed — paired tokens where the name changed.
    let mut renamed_old_names: HashSet<String> = HashSet::new();
    let mut renamed = Vec::new();
    for p in &pairs {
        if !names_equal(p.old, p.new) {
            renamed_old_names.insert(p.old.name.clone());
            let changes = diff_properties(&p.old.raw, &p.new.raw);
            renamed.push(RenamedToken {
                old_name: display_name(p.old),
                new_name: display_name(p.new),
                uuid: p.new.uuid.clone(),
                property_changes: changes,
            });
        }
    }

    // 2. Deprecated — unmatched new tokens carrying a `deprecated` field.
    let mut deprecated_names: HashSet<String> = HashSet::new();
    let mut deprecated = Vec::new();
    for t in &unpaired_new {
        if is_deprecated(&t.raw) {
            deprecated_names.insert(t.name.clone());
            deprecated.push(DeprecatedToken {
                name: display_name(t),
                uuid: t.uuid.clone(),
            });
        }
    }

    // 3. Reverted — paired tokens where old had `deprecated` and new does not.
    let mut reverted_names: HashSet<String> = HashSet::new();
    let mut reverted = Vec::new();
    for p in &pairs {
        if names_equal(p.old, p.new)
            && has_deprecated_field(&p.old.raw)
            && !has_deprecated_field(&p.new.raw)
        {
            reverted_names.insert(p.new.name.clone());
            reverted.push(RevertedToken {
                name: display_name(p.new),
                uuid: p.new.uuid.clone(),
            });
        }
    }

    // 4. Added — remaining unmatched new tokens.
    let mut added = Vec::new();
    for t in &unpaired_new {
        if !deprecated_names.contains(&t.name) {
            added.push(AddedToken {
                name: display_name(t),
                uuid: t.uuid.clone(),
            });
        }
    }

    // 5. Deleted — remaining unmatched old tokens (not rename sources).
    let mut deleted = Vec::new();
    for t in &unpaired_old {
        if !renamed_old_names.contains(&t.name) {
            deleted.push(DeletedToken {
                name: display_name(t),
                uuid: t.uuid.clone(),
            });
        }
    }

    // 6. Updated — paired tokens with same name but different properties.
    let mut updated = Vec::new();
    for p in &pairs {
        if names_equal(p.old, p.new) && !reverted_names.contains(&p.new.name) {
            let changes = diff_properties(&p.old.raw, &p.new.raw);
            if !changes.is_empty() {
                updated.push(UpdatedToken {
                    name: display_name(p.new),
                    uuid: p.new.uuid.clone(),
                    property_changes: changes,
                });
            }
        }
    }

    // Sort each category by name for deterministic output (RECOMMENDED in spec).
    renamed.sort_by(|a, b| a.new_name.cmp(&b.new_name));
    deprecated.sort_by(|a, b| a.name.cmp(&b.name));
    reverted.sort_by(|a, b| a.name.cmp(&b.name));
    added.sort_by(|a, b| a.name.cmp(&b.name));
    deleted.sort_by(|a, b| a.name.cmp(&b.name));
    updated.sort_by(|a, b| a.name.cmp(&b.name));

    DiffReport {
        renamed,
        deprecated,
        reverted,
        added,
        deleted,
        updated,
    }
}

// ── Token pairing ───────────────────────────────────────────────────────────

/// Pair tokens across old and new graphs.
///
/// Returns (paired, unpaired_old, unpaired_new).
///
/// Matching rules per spec `diff.md` — Token identity:
/// 1. UUID match (primary): same `uuid` value in both graphs.
/// 2. Name-object equivalence (fallback): when UUID match is not found for a
///    token (because either side lacks a uuid or no counterpart exists).
fn pair_tokens<'a>(
    old: &'a TokenGraph,
    new: &'a TokenGraph,
) -> (
    Vec<TokenPair<'a>>,
    Vec<&'a TokenRecord>,
    Vec<&'a TokenRecord>,
) {
    let mut pairs = Vec::new();
    let mut matched_old: HashSet<String> = HashSet::new();
    let mut matched_new: HashSet<String> = HashSet::new();

    // Pass 1: UUID matching.
    // Build old UUID → key index (old graph's uuid_index is private but
    // crate-visible; we iterate tokens directly for clarity).
    let mut old_by_uuid: HashMap<&str, &str> = HashMap::new();
    for (key, t) in &old.tokens {
        if let Some(ref uuid) = t.uuid {
            old_by_uuid.entry(uuid.as_str()).or_insert(key.as_str());
        }
    }

    for (new_key, new_tok) in &new.tokens {
        if let Some(ref uuid) = new_tok.uuid {
            if let Some(&old_key) = old_by_uuid.get(uuid.as_str()) {
                if let Some(old_tok) = old.tokens.get(old_key) {
                    pairs.push(TokenPair {
                        old: old_tok,
                        new: new_tok,
                    });
                    matched_old.insert(old_key.to_string());
                    matched_new.insert(new_key.clone());
                }
            }
        }
    }

    // Pass 2: Name equivalence fallback for unmatched tokens.
    // For cascade tokens, compare the serialized `raw["name"]` object.
    // For legacy tokens (no `raw["name"]`), compare `TokenRecord.name`
    // (the outer object key used as the graph key).
    let mut old_by_name: HashMap<String, &str> = HashMap::new();
    for (key, t) in &old.tokens {
        if !matched_old.contains(key.as_str()) {
            let name_key = identity_key(t);
            old_by_name.entry(name_key).or_insert(key.as_str());
        }
    }

    for (new_key, new_tok) in &new.tokens {
        if matched_new.contains(new_key) {
            continue;
        }
        let name_key = identity_key(new_tok);
        if let Some(&old_key) = old_by_name.get(&name_key) {
            if let Some(old_tok) = old.tokens.get(old_key) {
                pairs.push(TokenPair {
                    old: old_tok,
                    new: new_tok,
                });
                matched_old.insert(old_key.to_string());
                matched_new.insert(new_key.clone());
                // Remove from name index so it can't be double-matched.
                old_by_name.remove(&name_key);
            }
        }
    }

    let unpaired_old: Vec<&TokenRecord> = old
        .tokens
        .values()
        .filter(|t| !matched_old.contains(&t.name))
        .collect();
    let unpaired_new: Vec<&TokenRecord> = new
        .tokens
        .values()
        .filter(|t| !matched_new.contains(&t.name))
        .collect();

    (pairs, unpaired_old, unpaired_new)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/// Produce a stable identity key for a token, used to pair tokens across graphs.
///
/// Cascade tokens carry a structured `raw["name"]` object — serialize it to a
/// canonical JSON string. Legacy tokens have no `raw["name"]`; their identity
/// is the outer object key stored in `TokenRecord.name`.
fn identity_key(t: &TokenRecord) -> String {
    if let Some(name) = t.raw.get("name") {
        // Prefix with "name:" to avoid collisions with legacy keys.
        format!("name:{}", serde_json::to_string(name).unwrap_or_default())
    } else {
        format!("key:{}", t.name)
    }
}

/// Check if two tokens have the same name.
///
/// Cascade tokens: compare `raw["name"]` objects (deep equal).
/// Legacy tokens: compare `TokenRecord.name` (the graph key).
/// Mixed: never equal (different identity schemes).
fn names_equal(old: &TokenRecord, new: &TokenRecord) -> bool {
    match (old.raw.get("name"), new.raw.get("name")) {
        (Some(a), Some(b)) => a == b,
        (None, None) => old.name == new.name,
        _ => false,
    }
}

/// Get a human-readable display name for a token.
///
/// Cascade tokens: serialize the full `name` object as a compact string
/// (e.g. `background-color[colorScheme=dark]`). Falls back to just
/// `name.property` if other fields are absent.
/// Legacy tokens: use the graph key (`TokenRecord.name`).
fn display_name(t: &TokenRecord) -> String {
    if let Some(name_obj) = t.raw.get("name").and_then(|v| v.as_object()) {
        let property = name_obj
            .get("property")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        // Collect non-property fields as dimension qualifiers.
        let mut qualifiers: Vec<String> = name_obj
            .iter()
            .filter(|(k, _)| *k != "property")
            .map(|(k, v)| format!("{k}={}", v.as_str().unwrap_or("?")))
            .collect();
        qualifiers.sort();
        if qualifiers.is_empty() {
            property.to_string()
        } else {
            format!("{property}[{}]", qualifiers.join(","))
        }
    } else {
        t.name.clone()
    }
}

/// Check if a token has a `deprecated` field (at the top level or via
/// set-level normalization per spec).
fn is_deprecated(raw: &Value) -> bool {
    // Top-level deprecated field.
    if has_deprecated_field(raw) {
        return true;
    }
    // Set-level normalization: if all sets carry `deprecated: true`,
    // treat the token as deprecated.
    if let Some(sets) = raw.get("sets").and_then(|v| v.as_object()) {
        if sets.is_empty() {
            return false;
        }
        return sets.values().all(|entry| {
            entry
                .as_object()
                .and_then(|o| o.get("deprecated"))
                .and_then(|v| v.as_bool())
                == Some(true)
        });
    }
    false
}

/// Check if the raw JSON has a top-level `deprecated` field.
fn has_deprecated_field(raw: &Value) -> bool {
    raw.as_object()
        .map(|o| o.contains_key("deprecated"))
        .unwrap_or(false)
}

// ── Property-level diff ─────────────────────────────────────────────────────

/// Recursively diff two JSON values, producing property-level change records.
pub fn diff_properties(old: &Value, new: &Value) -> Vec<PropertyChange> {
    let mut changes = Vec::new();
    diff_recursive(old, new, String::new(), &mut changes);
    changes.sort_by(|a, b| a.path.cmp(&b.path));
    changes
}

fn diff_recursive(old: &Value, new: &Value, prefix: String, out: &mut Vec<PropertyChange>) {
    if old == new {
        return;
    }

    match (old, new) {
        (Value::Object(old_map), Value::Object(new_map)) => {
            // Check for deleted and updated keys.
            for (key, old_val) in old_map {
                let path = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{prefix}.{key}")
                };
                match new_map.get(key) {
                    Some(new_val) => {
                        diff_recursive(old_val, new_val, path, out);
                    }
                    None => {
                        out.push(PropertyChange {
                            path,
                            change_type: ChangeType::Deleted,
                            new_value: None,
                            original_value: Some(old_val.clone()),
                        });
                    }
                }
            }
            // Check for added keys.
            for (key, new_val) in new_map {
                if !old_map.contains_key(key) {
                    let path = if prefix.is_empty() {
                        key.clone()
                    } else {
                        format!("{prefix}.{key}")
                    };
                    out.push(PropertyChange {
                        path,
                        change_type: ChangeType::Added,
                        new_value: Some(new_val.clone()),
                        original_value: None,
                    });
                }
            }
        }
        _ => {
            // Leaf-level change (different types or different values).
            out.push(PropertyChange {
                path: prefix,
                change_type: ChangeType::Updated,
                new_value: Some(new.clone()),
                original_value: Some(old.clone()),
            });
        }
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::TokenGraph;
    use serde_json::json;
    use std::path::PathBuf;

    fn make_graph(tokens: Vec<(&str, Value)>) -> TokenGraph {
        TokenGraph::from_pairs(
            tokens
                .into_iter()
                .map(|(name, raw)| (name.to_string(), PathBuf::from("test.json"), raw))
                .collect(),
        )
    }

    // ── Token pairing ───────────────────────────────────────────────────

    #[test]
    fn pair_by_uuid() {
        let old = make_graph(vec![(
            "token-a",
            json!({"name": {"property": "bg"}, "uuid": "uuid-1", "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "token-a",
            json!({"name": {"property": "bg"}, "uuid": "uuid-1", "value": "#000"}),
        )]);
        let (pairs, unpaired_old, unpaired_new) = pair_tokens(&old, &new);
        assert_eq!(pairs.len(), 1);
        assert!(unpaired_old.is_empty());
        assert!(unpaired_new.is_empty());
    }

    #[test]
    fn pair_by_name_object_fallback() {
        let old = make_graph(vec![(
            "token-a",
            json!({"name": {"property": "bg"}, "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "token-a",
            json!({"name": {"property": "bg"}, "value": "#000"}),
        )]);
        let (pairs, unpaired_old, unpaired_new) = pair_tokens(&old, &new);
        assert_eq!(pairs.len(), 1);
        assert!(unpaired_old.is_empty());
        assert!(unpaired_new.is_empty());
    }

    #[test]
    fn uuid_backfill_preserves_continuity() {
        // Old token has no UUID, new token gains a UUID — should still pair
        // via name-object fallback.
        let old = make_graph(vec![(
            "token-a",
            json!({"name": {"property": "bg"}, "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "token-a",
            json!({"name": {"property": "bg"}, "uuid": "new-uuid", "value": "#fff"}),
        )]);
        let (pairs, unpaired_old, unpaired_new) = pair_tokens(&old, &new);
        assert_eq!(pairs.len(), 1, "UUID backfill must not break pairing");
        assert!(unpaired_old.is_empty());
        assert!(unpaired_new.is_empty());
    }

    #[test]
    fn pair_legacy_tokens_by_graph_key() {
        // Legacy tokens have no raw["name"] — pairing must use TokenRecord.name.
        let old = make_graph(vec![(
            "background-color-default",
            json!({"$schema": ".../color.json", "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "background-color-default",
            json!({"$schema": ".../color.json", "value": "#000"}),
        )]);
        let (pairs, unpaired_old, unpaired_new) = pair_tokens(&old, &new);
        assert_eq!(pairs.len(), 1, "legacy tokens must pair by graph key");
        assert!(unpaired_old.is_empty());
        assert!(unpaired_new.is_empty());
    }

    #[test]
    fn legacy_rename_detected_by_uuid() {
        // Legacy tokens paired by UUID with different graph keys = rename.
        let old = make_graph(vec![(
            "old-bg-color",
            json!({"$schema": ".../color.json", "uuid": "uuid-1", "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "new-bg-color",
            json!({"$schema": ".../color.json", "uuid": "uuid-1", "value": "#fff"}),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.renamed.len(), 1, "legacy rename must be detected");
        assert_eq!(report.renamed[0].old_name, "old-bg-color");
        assert_eq!(report.renamed[0].new_name, "new-bg-color");
    }

    #[test]
    fn display_name_shows_full_cascade_name() {
        let t = &make_graph(vec![(
            "key",
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )]);
        let token = t.tokens.values().next().unwrap();
        assert_eq!(display_name(token), "bg[colorScheme=dark]");
    }

    // ── Rename detection ────────────────────────────────────────────────

    #[test]
    fn detect_rename_by_uuid() {
        let old = make_graph(vec![(
            "old-name",
            json!({"name": {"property": "old-name"}, "uuid": "uuid-1", "value": "1"}),
        )]);
        let new = make_graph(vec![(
            "new-name",
            json!({"name": {"property": "new-name"}, "uuid": "uuid-1", "value": "1"}),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.renamed.len(), 1);
        assert_eq!(report.renamed[0].old_name, "old-name");
        assert_eq!(report.renamed[0].new_name, "new-name");
        assert!(report.added.is_empty());
        assert!(report.deleted.is_empty());
    }

    // ── Deprecation / reversion ─────────────────────────────────────────

    #[test]
    fn detect_deprecated_new_token() {
        let old = make_graph(vec![]);
        let new = make_graph(vec![(
            "dep-token",
            json!({"name": {"property": "dep-token"}, "deprecated": true, "value": "1"}),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.deprecated.len(), 1);
        assert!(
            report.added.is_empty(),
            "deprecated token must not appear as added"
        );
    }

    #[test]
    fn detect_deprecated_set_level_normalization() {
        let old = make_graph(vec![]);
        let new = make_graph(vec![(
            "set-dep",
            json!({
                "name": {"property": "set-dep"},
                "sets": {
                    "light": {"value": "#fff", "deprecated": true},
                    "dark": {"value": "#000", "deprecated": true}
                }
            }),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(
            report.deprecated.len(),
            1,
            "set-level deprecation must normalize"
        );
    }

    #[test]
    fn detect_reverted_token() {
        let old = make_graph(vec![(
            "rev-token",
            json!({"name": {"property": "rev"}, "uuid": "uuid-1", "deprecated": true, "value": "1"}),
        )]);
        let new = make_graph(vec![(
            "rev-token",
            json!({"name": {"property": "rev"}, "uuid": "uuid-1", "value": "1"}),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.reverted.len(), 1);
        assert!(
            report.updated.is_empty(),
            "reverted must not appear as updated"
        );
    }

    #[test]
    fn matched_token_gaining_deprecated_is_updated() {
        // Per spec: a matched token that gains `deprecated` is classified as
        // updated, not deprecated.
        let old = make_graph(vec![(
            "token",
            json!({"name": {"property": "bg"}, "uuid": "uuid-1", "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "token",
            json!({"name": {"property": "bg"}, "uuid": "uuid-1", "value": "#fff", "deprecated": true}),
        )]);
        let report = semantic_diff(&old, &new);
        assert!(
            report.deprecated.is_empty(),
            "matched token must not be deprecated"
        );
        assert_eq!(report.updated.len(), 1, "must be classified as updated");
        assert!(report.updated[0]
            .property_changes
            .iter()
            .any(|c| c.path == "deprecated"));
    }

    // ── Added / deleted ─────────────────────────────────────────────────

    #[test]
    fn detect_added_token() {
        let old = make_graph(vec![]);
        let new = make_graph(vec![(
            "new-token",
            json!({"name": {"property": "new"}, "value": "1"}),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.added.len(), 1);
    }

    #[test]
    fn detect_deleted_token() {
        let old = make_graph(vec![(
            "old-token",
            json!({"name": {"property": "old"}, "value": "1"}),
        )]);
        let new = make_graph(vec![]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.deleted.len(), 1);
    }

    // ── Property-level changes ──────────────────────────────────────────

    #[test]
    fn property_value_change() {
        let old = make_graph(vec![(
            "token",
            json!({"name": {"property": "bg"}, "uuid": "uuid-1", "value": "#fff"}),
        )]);
        let new = make_graph(vec![(
            "token",
            json!({"name": {"property": "bg"}, "uuid": "uuid-1", "value": "#000"}),
        )]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.updated.len(), 1);
        let changes = &report.updated[0].property_changes;
        assert!(changes
            .iter()
            .any(|c| c.path == "value" && c.change_type == ChangeType::Updated));
    }

    #[test]
    fn property_nested_change() {
        let changes = diff_properties(
            &json!({"sets": {"light": {"value": "#fff"}}}),
            &json!({"sets": {"light": {"value": "#000"}}}),
        );
        assert!(changes
            .iter()
            .any(|c| c.path == "sets.light.value" && c.change_type == ChangeType::Updated));
    }

    #[test]
    fn property_added_and_deleted() {
        let changes = diff_properties(&json!({"a": 1, "b": 2}), &json!({"a": 1, "c": 3}));
        assert!(changes
            .iter()
            .any(|c| c.path == "b" && c.change_type == ChangeType::Deleted));
        assert!(changes
            .iter()
            .any(|c| c.path == "c" && c.change_type == ChangeType::Added));
    }

    // ── Full pipeline ───────────────────────────────────────────────────

    #[test]
    fn full_pipeline_all_categories() {
        let old = make_graph(vec![
            (
                "renamed",
                json!({"name": {"property": "old-name"}, "uuid": "u1", "value": "1"}),
            ),
            (
                "to-delete",
                json!({"name": {"property": "to-delete"}, "uuid": "u2", "value": "2"}),
            ),
            (
                "to-update",
                json!({"name": {"property": "to-update"}, "uuid": "u3", "value": "old"}),
            ),
            (
                "to-revert",
                json!({"name": {"property": "to-revert"}, "uuid": "u4", "deprecated": true, "value": "4"}),
            ),
        ]);
        let new = make_graph(vec![
            (
                "renamed-new",
                json!({"name": {"property": "new-name"}, "uuid": "u1", "value": "1"}),
            ),
            (
                "to-add",
                json!({"name": {"property": "to-add"}, "value": "new"}),
            ),
            (
                "to-deprecate",
                json!({"name": {"property": "to-deprecate"}, "deprecated": true, "value": "dep"}),
            ),
            (
                "to-update",
                json!({"name": {"property": "to-update"}, "uuid": "u3", "value": "new"}),
            ),
            (
                "to-revert",
                json!({"name": {"property": "to-revert"}, "uuid": "u4", "value": "4"}),
            ),
        ]);
        let report = semantic_diff(&old, &new);
        assert_eq!(report.renamed.len(), 1, "should have 1 renamed");
        assert_eq!(report.deprecated.len(), 1, "should have 1 deprecated");
        assert_eq!(report.reverted.len(), 1, "should have 1 reverted");
        assert_eq!(report.added.len(), 1, "should have 1 added");
        assert_eq!(report.deleted.len(), 1, "should have 1 deleted");
        assert_eq!(report.updated.len(), 1, "should have 1 updated");
    }

    #[test]
    fn empty_diff_identical_graphs() {
        let g = make_graph(vec![
            (
                "a",
                json!({"name": {"property": "a"}, "uuid": "u1", "value": "1"}),
            ),
            (
                "b",
                json!({"name": {"property": "b"}, "uuid": "u2", "value": "2"}),
            ),
        ]);
        let report = semantic_diff(&g, &g);
        assert!(
            report.is_empty(),
            "identical graphs should produce empty diff"
        );
    }
}
