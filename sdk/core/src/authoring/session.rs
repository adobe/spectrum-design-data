// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Authoring session state machine for MCP parity (RFC #973 Q4).
//!
//! Each session maps to a JSON file at
//! `$DESIGN_DATA_AUTHORING_SESSIONS_DIR/<session_id>.json` (or
//! `dirs::data_dir()/design-data/authoring-sessions/<session_id>.json`
//! as the default).  Functions load the session, mutate it, and write it
//! back atomically — no in-process state, safe for CLI one-shot invocations.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::draft::{
    build_value_fields, ClassificationDraftDto, NameFieldDto, ValueKind, ValueRowDto,
    ValuesDraftDto, WizardDraft, WizardScreen,
};
use crate::graph::{Layer, TokenGraph};
use crate::schema::SchemaRegistry;
use crate::suggest;
use crate::write::{write_token, WriteTokenInput};

// ── On-disk session format ────────────────────────────────────────────────────

/// Full on-disk representation of one authoring session.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionDraft {
    pub session_id: String,
    /// Absolute path to the token dataset directory.
    pub dataset_path: String,
    pub wizard: WizardDraft,
}

// ── Result types (returned to CLI/MCP callers) ────────────────────────────────

/// A suggestion returned by `step_intent`.
#[derive(Serialize, Deserialize, Clone)]
pub struct SuggestionSnapshot {
    pub token_name: String,
    pub token_uuid: Option<String>,
    pub confidence: f32,
    pub value: Option<serde_json::Value>,
}

/// Full result of `step_intent` — session state + ranked candidates.
#[derive(Serialize, Deserialize, Clone)]
pub struct IntentStepResult {
    pub session: SessionDraft,
    pub suggestions: Vec<SuggestionSnapshot>,
    /// True when the top suggestion's confidence meets or exceeds `alias_threshold()`.
    pub can_alias: bool,
}

/// Value row input shape accepted by `step_values`.
#[derive(Serialize, Deserialize, Clone)]
pub struct ValueRowInput {
    pub mode_combo: Vec<(String, String)>,
    pub kind: ValueKind,
    pub alias_target: String,
    pub literal: String,
}

/// Input to `commit_session`.
pub struct CommitInput {
    pub session_id: String,
    pub rationale: String,
    pub target: PathBuf,
    /// `$schema` URL for the token being written.
    pub schema_url: String,
    pub schema_path: Option<PathBuf>,
    pub product_context: Option<PathBuf>,
    pub is_override: bool,
}

/// Result of a successful `commit_session`.
#[derive(Debug, Serialize)]
pub struct CommitResult {
    pub session_id: String,
    pub written_to: PathBuf,
    pub product_context_updated: bool,
}

// ── Storage helpers ───────────────────────────────────────────────────────────

/// Resolve the sessions directory.
///
/// Checks `DESIGN_DATA_AUTHORING_SESSIONS_DIR` first (test seam), then
/// falls back to `dirs::data_dir()/design-data/authoring-sessions`.
pub fn sessions_dir() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DESIGN_DATA_AUTHORING_SESSIONS_DIR") {
        return Some(PathBuf::from(p));
    }
    dirs::data_dir().map(|d| d.join("design-data").join("authoring-sessions"))
}

fn session_path(session_id: &str) -> Option<PathBuf> {
    sessions_dir().map(|d| d.join(format!("{session_id}.json")))
}

fn save_session(draft: &SessionDraft) -> Result<(), String> {
    let path = session_path(&draft.session_id)
        .ok_or_else(|| "cannot determine sessions directory".to_string())?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create sessions directory: {e}"))?;
    }
    let json = serde_json::to_string_pretty(draft)
        .map_err(|e| format!("failed to serialize session: {e}"))?;
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, &json)
        .map_err(|e| format!("failed to write session file to {tmp:?}: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("failed to commit session file: {e}"))
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Return the confidence floor for surfacing the "reuse first" banner.
///
/// When the top suggestion meets or exceeds this value, `can_alias` is `true`
/// in `IntentStepResult` and the TUI Screen 1 banner is shown.
///
/// The default (0.35) was calibrated against `packages/tokens/src` in
/// `sdk/core/tests/suggest_calibration.rs`: positive matches score 0.6–1.0
/// while single-word/noise queries stay at 0.0–0.33, leaving a clean gap.
///
/// Override at runtime with `DESIGN_DATA_ALIAS_THRESHOLD=<f32>`.
/// Parsed once per process and cached.
pub fn alias_threshold() -> f32 {
    use std::sync::OnceLock;
    static THRESHOLD: OnceLock<f32> = OnceLock::new();
    *THRESHOLD.get_or_init(|| {
        std::env::var("DESIGN_DATA_ALIAS_THRESHOLD")
            .ok()
            .and_then(|v| v.parse::<f32>().ok())
            .unwrap_or(0.35)
    })
}

/// Create a new authoring session for the given dataset directory.
///
/// Returns the new `SessionDraft` (including the generated `session_id`).
pub fn start_session(dataset_path: &str) -> Result<SessionDraft, String> {
    let session_id = Uuid::new_v4().to_string();
    let draft = SessionDraft {
        session_id,
        dataset_path: dataset_path.to_string(),
        wizard: WizardDraft::new(),
    };
    save_session(&draft)?;
    Ok(draft)
}

/// Load a session by id.  Returns `None` on any I/O or parse error.
pub fn get_session(session_id: &str) -> Option<SessionDraft> {
    let path = session_path(session_id)?;
    let text = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&text).ok()
}

/// List all sessions in the sessions directory, sorted by session_id.
pub fn list_sessions() -> Vec<SessionDraft> {
    let Some(dir) = sessions_dir() else {
        return Vec::new();
    };
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut sessions: Vec<SessionDraft> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|x| x == "json").unwrap_or(false))
        .filter_map(|e| {
            let text = std::fs::read_to_string(e.path()).ok()?;
            serde_json::from_str(&text).ok()
        })
        .collect();
    sessions.sort_by(|a, b| a.session_id.cmp(&b.session_id));
    sessions
}

/// Delete the session file.  Ignores `NotFound`.
pub fn cancel_session(session_id: &str) {
    let Some(path) = session_path(session_id) else {
        return;
    };
    let _ = std::fs::remove_file(&path);
}

/// Update the intent field and run `suggest` against the dataset.
///
/// Loads the `TokenGraph` from the session's `dataset_path` on each call
/// (one-shot CLI — no warm cache needed).
pub fn step_intent(session_id: &str, intent: &str) -> Result<IntentStepResult, String> {
    let mut session =
        get_session(session_id).ok_or_else(|| format!("session not found: {session_id}"))?;

    session.wizard.intent = intent.to_string();
    session.wizard.screen = WizardScreen::Intent;

    let dataset_path = std::path::Path::new(&session.dataset_path);
    let graph = TokenGraph::open_cached(dataset_path)
        .map_err(|e| format!("failed to load dataset at {:?}: {e}", session.dataset_path))?;

    let raw = suggest::suggest(&graph, intent, None, 10);
    let can_alias = raw
        .first()
        .map(|s| s.confidence >= alias_threshold())
        .unwrap_or(false);

    let suggestions: Vec<SuggestionSnapshot> = raw
        .iter()
        .map(|s| SuggestionSnapshot {
            token_name: s.token_name.clone(),
            token_uuid: s.token_uuid.clone(),
            confidence: s.confidence,
            value: s.value.clone(),
        })
        .collect();

    save_session(&session)?;
    Ok(IntentStepResult {
        session,
        suggestions,
        can_alias,
    })
}

/// Update classification fields (layer, property, name-object fields).
pub fn step_classification(
    session_id: &str,
    layer: Layer,
    property: &str,
    name_fields: Vec<(String, String)>,
) -> Result<SessionDraft, String> {
    let mut session =
        get_session(session_id).ok_or_else(|| format!("session not found: {session_id}"))?;

    session.wizard.classification = ClassificationDraftDto {
        layer,
        property: property.to_string(),
        name_fields: name_fields
            .into_iter()
            .map(|(key, value)| NameFieldDto { key, value })
            .collect(),
        focused_field: 0,
    };
    session.wizard.screen = WizardScreen::Classification;

    save_session(&session)?;
    Ok(session)
}

/// Replace the values rows for Screen 3.
pub fn step_values(session_id: &str, rows: Vec<ValueRowInput>) -> Result<SessionDraft, String> {
    let mut session =
        get_session(session_id).ok_or_else(|| format!("session not found: {session_id}"))?;

    session.wizard.values = ValuesDraftDto {
        rows: rows
            .into_iter()
            .map(|r| ValueRowDto {
                mode_combo: r.mode_combo,
                kind: r.kind,
                alias_target: r.alias_target,
                literal: r.literal,
            })
            .collect(),
        selected: 0,
    };
    session.wizard.screen = WizardScreen::Values;

    save_session(&session)?;
    Ok(session)
}

/// Build and write the token, then delete the session on success.
pub fn commit_session(
    input: CommitInput,
    registry: &SchemaRegistry,
) -> Result<CommitResult, String> {
    let session = get_session(&input.session_id)
        .ok_or_else(|| format!("session not found: {}", input.session_id))?;

    let wizard = &session.wizard;
    let key = derive_token_key(wizard);
    let token = build_token_value(wizard, &input.schema_url, &input.rationale);

    let rationale_opt = if input.rationale.is_empty() {
        None
    } else {
        Some(input.rationale.clone())
    };

    let write_input = WriteTokenInput {
        key,
        token,
        target: input.target.clone(),
        product_context: input.product_context.clone(),
        rationale: rationale_opt,
        created_at: None,
        is_override: input.is_override,
    };

    let result =
        write_token(write_input, registry).map_err(|e| format!("write_token failed: {e}"))?;

    cancel_session(&input.session_id);

    Ok(CommitResult {
        session_id: input.session_id,
        written_to: result.written_to,
        product_context_updated: result.product_context_updated,
    })
}

// ── Private helpers ───────────────────────────────────────────────────────────

/// Derive a token key from the wizard's classification state.
///
/// Joins the property and name-field values with `-`.  Layer is intentionally
/// excluded: property names are unique within a layer's schema, so
/// `property-variant-state` is the canonical key regardless of layer.
fn derive_token_key(wizard: &WizardDraft) -> String {
    super::draft::derive_token_key_from_parts(
        &wizard.classification.property,
        wizard
            .classification
            .name_fields
            .iter()
            .map(|f| f.value.as_str()),
    )
    .unwrap_or_else(|| "unnamed-token".to_string())
}

/// Construct the token JSON value from wizard state.
///
/// A single row with an empty `mode_combo` produces a flat `value`/`$ref` field.
/// Multiple rows, or rows with mode conditions, produce a nested `sets` structure
/// keyed by each row's first-dimension mode value (recursively for deeper combos).
fn build_token_value(wizard: &WizardDraft, schema_url: &str, rationale: &str) -> serde_json::Value {
    let mut obj = serde_json::Map::new();

    obj.insert(
        "$schema".into(),
        serde_json::Value::String(schema_url.to_string()),
    );

    obj.insert(
        "name".into(),
        crate::authoring::draft::build_name_object(
            &wizard.classification.property,
            &wizard.classification.name_fields,
        ),
    );

    for (field, value) in build_value_fields(&wizard.values.rows) {
        obj.insert(field, value);
    }

    if !rationale.is_empty() {
        obj.insert(
            "rationale".into(),
            serde_json::Value::String(rationale.to_string()),
        );
    }

    obj.insert(
        "uuid".into(),
        serde_json::Value::String(Uuid::new_v4().to_string()),
    );

    serde_json::Value::Object(obj)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::Layer;
    use std::sync::Mutex;

    static SESSION_DIR_LOCK: Mutex<()> = Mutex::new(());

    fn with_temp_sessions<F: FnOnce()>(f: F) -> tempfile::TempDir {
        let dir = tempfile::TempDir::new().unwrap();
        // unwrap_or_else recovers a poisoned mutex (from a prior test panic).
        let _guard = SESSION_DIR_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        std::env::set_var("DESIGN_DATA_AUTHORING_SESSIONS_DIR", dir.path());
        // catch_unwind ensures remove_var runs even if f() panics.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(f));
        std::env::remove_var("DESIGN_DATA_AUTHORING_SESSIONS_DIR");
        if let Err(e) = result {
            std::panic::resume_unwind(e);
        }
        dir
    }

    #[test]
    fn start_creates_session_on_disk() {
        let _dir = with_temp_sessions(|| {
            let session = start_session("/fake/dataset").unwrap();
            assert!(!session.session_id.is_empty());
            let loaded = get_session(&session.session_id).unwrap();
            assert_eq!(loaded.dataset_path, "/fake/dataset");
            assert_eq!(loaded.wizard.screen, WizardScreen::Intent);
        });
    }

    #[test]
    fn get_session_returns_none_for_unknown_id() {
        let _dir = with_temp_sessions(|| {
            assert!(get_session("nonexistent-id").is_none());
        });
    }

    #[test]
    fn cancel_removes_session_file() {
        let _dir = with_temp_sessions(|| {
            let session = start_session("/fake/dataset").unwrap();
            cancel_session(&session.session_id);
            assert!(get_session(&session.session_id).is_none());
        });
    }

    #[test]
    fn step_classification_updates_session() {
        let _dir = with_temp_sessions(|| {
            let session = start_session("/fake/dataset").unwrap();
            let updated = step_classification(
                &session.session_id,
                Layer::Platform,
                "background-color",
                vec![("variant".into(), "accent".into())],
            )
            .unwrap();
            assert_eq!(updated.wizard.classification.layer, Layer::Platform);
            assert_eq!(updated.wizard.classification.property, "background-color");
            assert_eq!(updated.wizard.classification.name_fields[0].value, "accent");
            assert_eq!(updated.wizard.screen, WizardScreen::Classification);
        });
    }

    #[test]
    fn step_values_updates_session() {
        let _dir = with_temp_sessions(|| {
            let session = start_session("/fake/dataset").unwrap();
            let updated = step_values(
                &session.session_id,
                vec![ValueRowInput {
                    mode_combo: vec![],
                    kind: ValueKind::Literal,
                    alias_target: String::new(),
                    literal: "rgb(0, 0, 0)".into(),
                }],
            )
            .unwrap();
            assert_eq!(updated.wizard.values.rows.len(), 1);
            assert_eq!(updated.wizard.values.rows[0].literal, "rgb(0, 0, 0)");
            assert_eq!(updated.wizard.screen, WizardScreen::Values);
        });
    }

    #[test]
    fn list_sessions_returns_all() {
        let _dir = with_temp_sessions(|| {
            let s1 = start_session("/a").unwrap();
            let s2 = start_session("/b").unwrap();
            let sessions = list_sessions();
            let ids: Vec<&str> = sessions.iter().map(|s| s.session_id.as_str()).collect();
            assert!(ids.contains(&s1.session_id.as_str()));
            assert!(ids.contains(&s2.session_id.as_str()));
        });
    }

    #[test]
    fn step_classification_returns_error_for_unknown_session() {
        let _dir = with_temp_sessions(|| {
            let result = step_classification("bad-id", Layer::Foundation, "color", vec![]);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("not found"));
        });
    }

    #[test]
    fn build_token_value_multi_mode_persists_every_row() {
        // Regression guard: the committed token must carry all mode-combo rows
        // as a `sets` block, not just the first row.
        let wizard = WizardDraft {
            screen: WizardScreen::Values,
            intent: String::new(),
            selected_suggestion: 0,
            chosen_path: crate::authoring::draft::WizardPath::CreateNew,
            classification: ClassificationDraftDto {
                layer: Layer::Foundation,
                property: "background-color".into(),
                name_fields: vec![],
                focused_field: 0,
            },
            values: ValuesDraftDto {
                rows: vec![
                    ValueRowDto {
                        mode_combo: vec![("color-scheme".into(), "light".into())],
                        kind: ValueKind::Literal,
                        alias_target: String::new(),
                        literal: "white".into(),
                    },
                    ValueRowDto {
                        mode_combo: vec![("color-scheme".into(), "dark".into())],
                        kind: ValueKind::Literal,
                        alias_target: String::new(),
                        literal: "black".into(),
                    },
                ],
                selected: 0,
            },
            rationale: String::new(),
            schema_url: None,
            schema_url_input: String::new(),
        };
        let token = build_token_value(&wizard, "https://example.com/schema.json", "because");
        let sets = token["sets"].as_object().unwrap();
        assert_eq!(sets["light"]["value"], "white");
        assert_eq!(sets["dark"]["value"], "black");
        assert_eq!(token["rationale"], "because");
        assert!(token.get("value").is_none(), "multi-mode must not be flat");
    }

    #[test]
    fn commit_session_returns_error_for_unknown_session() {
        let _dir = with_temp_sessions(|| {
            // Simulate a double-commit: the session file is gone after the
            // first commit, so a second attempt hits "session not found".
            // We use an empty schema dir — the registry is never reached because
            // the session lookup fails first.
            use crate::schema::SchemaRegistry;
            // new_stub() produces a no-op registry; it's never reached because
            // commit_session returns early at the session-not-found check.
            let registry = SchemaRegistry::new_stub();
            let result = commit_session(
                CommitInput {
                    session_id: "nonexistent-id".into(),
                    rationale: String::new(),
                    target: std::path::PathBuf::from("/tmp/out.json"),
                    schema_url: "https://example.com/schema.json".into(),
                    schema_path: None,
                    product_context: None,
                    is_override: false,
                },
                &registry,
            );
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("not found"));
        });
    }
}
