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
    build_value_fields, ClassificationDraftDto, FieldDiagnostic, NameFieldDto, ValueKind,
    ValueRowDto, ValuesDraftDto, WizardDraft, WizardScreen,
};
use crate::graph::{Layer, TokenGraph};
use crate::primer::SPEC_VERSION;
use crate::registry::{FieldCatalog, FieldValidation, RegistryData};
use crate::report::Severity;
use crate::schema::SchemaRegistry;
use crate::suggest;
use crate::validate::rules::schema_domain;
use crate::write::{write_cascade_token, WriteCascadeTokenInput};

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
    /// Dataset `specVersion` string to stamp as `introduced` on the new token.
    ///
    /// When `None`, the crate's `SPEC_VERSION` constant is used as a safe
    /// fallback.  CLI and MCP surfaces (B5/B6) should supply the value
    /// they read from the active dataset config.
    pub spec_version: Option<String>,
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

/// Validate a prospective classification against the fields/ catalog and their registries.
///
/// Returns `Ok(diagnostics)` where `diagnostics` holds advisory warnings, or `Err(msg)`
/// if a hard violation is found (unknown field key or out-of-vocab value on a
/// `strict`-validation field).
///
/// Rules applied:
/// - A field key absent from the catalog is always an error (authoring-workflow.md L244).
/// - For registry-backed `advisory` fields, an unknown value produces a warning.
/// - For registry-backed `strict` fields, an unknown value produces an error.
/// - Domain-scoped fields on an incompatible token schema produce a SPEC-042 warning.
///   The scope check is skipped when `schema_url` is `None` (schema not yet chosen).
pub fn validate_classification(
    property: &str,
    name_fields: &[(String, String)],
    schema_url: Option<&str>,
    catalog: &FieldCatalog,
    registry: &RegistryData,
) -> Result<Vec<FieldDiagnostic>, String> {
    let mut diagnostics: Vec<FieldDiagnostic> = Vec::new();

    // --- validate property ------------------------------------------------
    // `property` is advisory + registry-backed; an unknown value is a warning.
    if !property.is_empty() {
        if let Some(entry) = catalog.get("property") {
            if entry.has_registry {
                if let Some(vocab) = registry.for_field("property") {
                    if !vocab.contains(property) {
                        let msg = format!(
                            "\"{property}\" is not a known property term; use a value from the \
                             property-terms registry"
                        );
                        match entry.validation {
                            FieldValidation::Strict => return Err(msg),
                            FieldValidation::Advisory => diagnostics.push(FieldDiagnostic {
                                field: "property".into(),
                                severity: Severity::Warning,
                                message: msg,
                            }),
                            FieldValidation::None => {}
                        }
                    }
                }
            }
        }
    }

    // --- validate each name field -----------------------------------------
    for (key, value) in name_fields {
        let entry = catalog.get(key).ok_or_else(|| {
            format!(
                "\"{key}\" is not a recognized name-object field (not in the fields/ catalog; \
                 authoring-workflow.md L244)"
            )
        })?;

        // Registry-vocab check is only attempted for fields that have a registry.
        // Currently no strict field has has_registry=true (colorScheme/scale/contrast
        // are strict but registry-less mode-set fields).  The Strict arm below is
        // correct for any future strict+registry field; mode-set value validation for
        // the current strict no-registry fields is deferred to B3 (122.3).
        if !value.is_empty() && entry.has_registry {
            if let Some(vocab) = registry.for_field(key) {
                if !vocab.contains(value.as_str()) {
                    let msg = format!("\"{value}\" is not a known value for the \"{key}\" field");
                    match entry.validation {
                        FieldValidation::Strict => return Err(msg),
                        FieldValidation::Advisory => diagnostics.push(FieldDiagnostic {
                            field: key.clone(),
                            severity: Severity::Warning,
                            message: msg,
                        }),
                        FieldValidation::None => {}
                    }
                }
            }
        }

        // SPEC-042: domain-scoped field on an incompatible token schema.
        // Skipped if no schema has been chosen yet.
        if let (Some(field_scope), Some(schema)) = (entry.scope, schema_url) {
            if let Some(token_domain) = schema_domain(schema) {
                if token_domain != field_scope {
                    diagnostics.push(FieldDiagnostic {
                        field: key.clone(),
                        severity: Severity::Warning,
                        message: format!(
                            "field \"{key}\" is scoped to \"{field_scope}\" tokens but the \
                             selected schema is for \"{token_domain}\" tokens (SPEC-042)"
                        ),
                    });
                }
            }
        }
    }

    Ok(diagnostics)
}

/// Update classification fields (layer, property, name-object fields).
///
/// Validates the field set against the fields/ catalog:
/// - Unknown field keys are rejected (authoring-workflow.md L244).
/// - Out-of-vocab values on `strict` fields are rejected.
/// - Out-of-vocab values on `advisory` fields and SPEC-042 scope mismatches
///   produce advisory diagnostics attached to the returned draft.
pub fn step_classification(
    session_id: &str,
    layer: Layer,
    property: &str,
    name_fields: Vec<(String, String)>,
) -> Result<SessionDraft, String> {
    let mut session =
        get_session(session_id).ok_or_else(|| format!("session not found: {session_id}"))?;

    let catalog = FieldCatalog::embedded();
    let registry = RegistryData::embedded();
    let schema_url = session.wizard.schema_url.as_deref();

    let diagnostics =
        validate_classification(property, &name_fields, schema_url, catalog, registry)?;

    session.wizard.classification = ClassificationDraftDto {
        layer,
        property: property.to_string(),
        name_fields: name_fields
            .into_iter()
            .map(|(key, value)| NameFieldDto { key, value })
            .collect(),
        diagnostics,
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

/// Build and write the token to the cascade target, then delete the session on success.
///
/// Writes to the cascade `*.tokens.json` array format introduced in Phase B / B1.
/// The legacy `write_token` path (object-map files + `product-context.json`) is no
/// longer used by this commit path; `CommitInput.product_context` and
/// `CommitInput.is_override` are accepted for API compatibility but have no effect
/// until the CLI/TUI surfaces are updated in B5.
pub fn commit_session(
    input: CommitInput,
    registry: &SchemaRegistry,
) -> Result<CommitResult, String> {
    let session = get_session(&input.session_id)
        .ok_or_else(|| format!("session not found: {}", input.session_id))?;

    let spec_version = input
        .spec_version
        .as_deref()
        .unwrap_or(SPEC_VERSION)
        .to_string();

    let wizard = &session.wizard;
    let token = build_token_value(wizard, &input.schema_url, &input.rationale, &spec_version);

    let rationale_opt = if input.rationale.is_empty() {
        None
    } else {
        Some(input.rationale.clone())
    };

    let write_input = WriteCascadeTokenInput {
        token,
        target: input.target.clone(),
        rationale: rationale_opt,
    };

    let result = write_cascade_token(write_input, registry)
        .map_err(|e| format!("write_cascade_token failed: {e}"))?;

    cancel_session(&input.session_id);

    Ok(CommitResult {
        session_id: input.session_id,
        written_to: result.written_to,
        product_context_updated: result.product_context_updated,
    })
}

/// Construct the token JSON value from wizard state.
///
/// A single row with an empty `mode_combo` produces a flat `value`/`$ref` field.
/// Multiple rows, or rows with mode conditions, produce a nested `sets` structure
/// keyed by each row's first-dimension mode value (recursively for deeper combos).
fn build_token_value(
    wizard: &WizardDraft,
    schema_url: &str,
    rationale: &str,
    spec_version: &str,
) -> serde_json::Value {
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

    // authoring-workflow.md L71: MUST stamp `introduced` with the active dataset
    // specVersion at creation time.
    obj.insert(
        "introduced".into(),
        serde_json::Value::String(spec_version.to_string()),
    );

    serde_json::Value::Object(obj)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::Layer;
    use crate::registry::{FieldCatalog, RegistryData};
    use crate::report::Severity;
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

    // ── B4: catalog-aware validation ──────────────────────────────────────

    #[test]
    fn validate_classification_rejects_unknown_field_key() {
        let catalog = FieldCatalog::embedded();
        let registry = RegistryData::embedded();
        let result = validate_classification(
            "background-color",
            &[("unknownFoo".into(), "bar".into())],
            None,
            &catalog,
            &registry,
        );
        assert!(result.is_err(), "unknown field key must be rejected");
        let msg = result.unwrap_err();
        assert!(
            msg.contains("unknownFoo"),
            "error message should name the unknown field; got: {msg}"
        );
        assert!(
            msg.contains("fields/ catalog"),
            "error message should mention the fields/ catalog; got: {msg}"
        );
    }

    #[test]
    fn validate_classification_advisory_out_of_vocab_is_warning_not_error() {
        // colorFamily is advisory + registry-backed.  An unknown value should
        // succeed and produce exactly one warning, not an Err.
        let catalog = FieldCatalog::embedded();
        let registry = RegistryData::embedded();
        let result = validate_classification(
            "background-color",
            &[("colorFamily".into(), "not-a-real-family".into())],
            None,
            &catalog,
            &registry,
        );
        assert!(result.is_ok(), "advisory out-of-vocab must not return Err");
        let diags = result.unwrap();
        assert_eq!(diags.len(), 1, "expected exactly one advisory diagnostic");
        assert_eq!(
            diags[0].field, "colorFamily",
            "diagnostic should name the offending field"
        );
        assert_eq!(diags[0].severity, Severity::Warning);
    }

    #[test]
    fn validate_classification_known_value_produces_no_diagnostic() {
        // A valid catalog field with a known registry value → no diagnostics.
        let catalog = FieldCatalog::embedded();
        let registry = RegistryData::embedded();
        let result = validate_classification(
            "background-color",
            &[("variant".into(), "accent".into())],
            None,
            &catalog,
            &registry,
        );
        assert!(result.is_ok());
        assert!(
            result.unwrap().is_empty(),
            "known value must not produce diagnostics"
        );
    }

    #[test]
    fn validate_classification_scope_mismatch_is_warning() {
        // colorFamily is scoped to "color".  A typography schema URL should
        // produce a SPEC-042 warning, not an error.
        let catalog = FieldCatalog::embedded();
        let registry = RegistryData::embedded();
        let typography_schema =
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/font-family.json";
        let result = validate_classification(
            "background-color",
            &[("colorFamily".into(), "blue".into())],
            Some(typography_schema),
            &catalog,
            &registry,
        );
        assert!(result.is_ok(), "SPEC-042 violation must not return Err");
        let diags = result.unwrap();
        // Exactly one warning for the scope mismatch.
        let scope_warnings: Vec<_> = diags
            .iter()
            .filter(|d| d.message.contains("SPEC-042"))
            .collect();
        assert_eq!(
            scope_warnings.len(),
            1,
            "expected one SPEC-042 scope warning; got: {diags:?}"
        );
    }

    #[test]
    fn validate_classification_compatible_scope_no_warning() {
        // colorFamily on a color token schema → no scope warning.
        let catalog = FieldCatalog::embedded();
        let registry = RegistryData::embedded();
        let color_schema =
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json";
        let result = validate_classification(
            "background-color",
            &[("colorFamily".into(), "blue".into())],
            Some(color_schema),
            &catalog,
            &registry,
        );
        assert!(result.is_ok());
        let diags = result.unwrap();
        let scope_warnings: Vec<_> = diags
            .iter()
            .filter(|d| d.message.contains("SPEC-042"))
            .collect();
        assert!(
            scope_warnings.is_empty(),
            "compatible scope must not produce a SPEC-042 warning; got: {scope_warnings:?}"
        );
    }

    #[test]
    fn validate_classification_empty_name_fields_with_known_property_is_clean() {
        // An empty name_fields list with a valid property → clean.
        let catalog = FieldCatalog::embedded();
        let registry = RegistryData::embedded();
        let result = validate_classification("background-color", &[], None, &catalog, &registry);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
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
                diagnostics: vec![],
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
        let token = build_token_value(
            &wizard,
            "https://example.com/schema.json",
            "because",
            "1.0.0-draft",
        );
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
                    spec_version: None,
                },
                &registry,
            );
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("not found"));
        });
    }
}
