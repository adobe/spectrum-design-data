// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `authoring-session` subcommand — CLI surface for the MCP authoring session
//! state machine (RFC #973 Q4).
//!
//! All output is JSON written to stdout; exit code 1 on error.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use clap::Subcommand;
use design_data_core::authoring::session::{
    CommitInput, ValueRowInput, cancel_session, commit_session, get_session, list_sessions,
    start_session, step_classification, step_intent, step_values,
};
use design_data_core::graph::Layer;
use design_data_core::schema::SchemaRegistry;

// ── Clap argument types ───────────────────────────────────────────────────────

#[derive(clap::ValueEnum, Clone, Debug)]
pub enum LayerArg {
    Foundation,
    Platform,
    Product,
}

impl From<LayerArg> for Layer {
    fn from(a: LayerArg) -> Self {
        match a {
            LayerArg::Foundation => Layer::Foundation,
            LayerArg::Platform => Layer::Platform,
            LayerArg::Product => Layer::Product,
        }
    }
}

/// Screen that `step` operates on.
#[derive(Subcommand, Debug)]
pub enum StepCommand {
    /// Update the intent field and refresh token suggestions.
    Intent {
        #[arg(long)]
        session_id: String,
        /// Natural-language description of what the token is for.
        #[arg(long)]
        intent: String,
    },
    /// Set layer, property, and name-object fields.
    Classification {
        #[arg(long)]
        session_id: String,
        #[arg(long, value_enum)]
        layer: LayerArg,
        #[arg(long)]
        property: String,
        /// Additional name-object fields in `key=value` form (repeatable).
        #[arg(long = "name-field", value_name = "KEY=VALUE")]
        name_fields: Vec<String>,
    },
    /// Set value rows as a JSON array of `ValueRowInput` objects.
    ///
    /// Each element: `{ "mode_combo": [], "kind": "Literal", "alias_target": "", "literal": "rgb(…)" }`
    Values {
        #[arg(long)]
        session_id: String,
        /// JSON array of value rows.
        #[arg(long)]
        rows: String,
    },
}

#[derive(Subcommand, Debug)]
pub enum AuthoringSessionCommand {
    /// Start a new authoring session for the given dataset directory.
    Start {
        /// Path to the token dataset directory.
        dataset_path: PathBuf,
    },
    /// Advance a session through one wizard screen.
    Step {
        #[command(subcommand)]
        screen: StepCommand,
    },
    /// Build and write the token, then remove the session.
    Commit {
        #[arg(long)]
        session_id: String,
        #[arg(long, default_value = "")]
        rationale: String,
        /// Target legacy JSON file to write to (created if absent, merged if present).
        #[arg(long)]
        target: PathBuf,
        /// `$schema` URL for the new token (e.g. `.../color.json`).
        #[arg(long)]
        schema_url: String,
        /// Schemas directory for validation (default: `packages/tokens/schemas`
        /// relative to the target's parent).
        #[arg(long)]
        schema_path: Option<PathBuf>,
        /// Path to `product-context.json` for rationale capture.
        #[arg(long)]
        product_context: Option<PathBuf>,
        /// Token overrides an existing foundation/platform token.
        #[arg(long)]
        is_override: bool,
    },
    /// Cancel a session and delete its on-disk file.
    Cancel {
        #[arg(long)]
        session_id: String,
    },
    /// Print the current state of a session as JSON.
    Get {
        #[arg(long)]
        session_id: String,
    },
    /// List all active sessions.
    List,
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

pub fn run(cmd: AuthoringSessionCommand) -> ExitCode {
    match run_inner(cmd) {
        Ok(()) => ExitCode::SUCCESS,
        Err(msg) => {
            eprintln!("authoring-session error: {msg}");
            ExitCode::FAILURE
        }
    }
}

fn run_inner(cmd: AuthoringSessionCommand) -> Result<(), String> {
    match cmd {
        AuthoringSessionCommand::Start { dataset_path } => {
            let session = start_session(
                dataset_path.to_str().ok_or("dataset_path is not valid UTF-8")?,
            )?;
            print_json(&session)?;
        }

        AuthoringSessionCommand::Step { screen } => match screen {
            StepCommand::Intent { session_id, intent } => {
                let result = step_intent(&session_id, &intent)?;
                print_json(&result)?;
            }
            StepCommand::Classification { session_id, layer, property, name_fields } => {
                let parsed_fields = parse_name_fields(&name_fields)?;
                let session = step_classification(&session_id, layer.into(), &property, parsed_fields)?;
                print_json(&session)?;
            }
            StepCommand::Values { session_id, rows } => {
                let parsed: Vec<ValueRowInput> = serde_json::from_str(&rows)
                    .map_err(|e| format!("--rows is not valid JSON: {e}"))?;
                let session = step_values(&session_id, parsed)?;
                print_json(&session)?;
            }
        },

        AuthoringSessionCommand::Commit {
            session_id,
            rationale,
            target,
            schema_url,
            schema_path,
            product_context,
            is_override,
        } => {
            let schema_dir = resolve_schema_path(schema_path.as_deref(), &target);
            let registry = SchemaRegistry::load_legacy_token_schemas(&schema_dir)
                .map_err(|e| format!("failed to load schema registry from {schema_dir:?}: {e}"))?;

            let result = commit_session(
                CommitInput {
                    session_id,
                    rationale,
                    target,
                    schema_url,
                    schema_path: Some(schema_dir),
                    product_context,
                    is_override,
                },
                &registry,
            )?;
            print_json(&result)?;
        }

        AuthoringSessionCommand::Cancel { session_id } => {
            cancel_session(&session_id);
            print_json(&serde_json::json!({ "ok": true, "session_id": session_id }))?;
        }

        AuthoringSessionCommand::Get { session_id } => {
            let session = get_session(&session_id)
                .ok_or_else(|| format!("session not found: {session_id}"))?;
            print_json(&session)?;
        }

        AuthoringSessionCommand::List => {
            print_json(&list_sessions())?;
        }
    }
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn print_json<T: serde::Serialize>(value: &T) -> Result<(), String> {
    let json = serde_json::to_string_pretty(value)
        .map_err(|e| format!("JSON serialization failed: {e}"))?;
    println!("{json}");
    Ok(())
}

fn parse_name_fields(raw: &[String]) -> Result<Vec<(String, String)>, String> {
    raw.iter()
        .map(|s| {
            let (k, v) = s
                .split_once('=')
                .ok_or_else(|| format!("--name-field must be key=value, got: {s:?}"))?;
            Ok((k.to_string(), v.to_string()))
        })
        .collect()
}

/// Resolve the schema directory, defaulting to `packages/tokens/schemas` two
/// levels above the target file (matching the existing `write-token` pattern).
fn resolve_schema_path(explicit: Option<&Path>, target: &Path) -> PathBuf {
    if let Some(p) = explicit {
        return p.to_path_buf();
    }
    // Walk up from target's parent to find the workspace root.
    target
        .parent()
        .and_then(|p| p.parent())
        .map(|r| r.join("schemas"))
        .unwrap_or_else(|| PathBuf::from("packages/tokens/schemas"))
}
