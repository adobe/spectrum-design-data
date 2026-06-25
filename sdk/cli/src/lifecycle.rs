// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `lifecycle` and `mode-set` subcommands — CLI surface for token lifecycle and
//! mode-set mutation operations introduced in Phase B / B2–B3.
//!
//! All output is JSON written to stdout; exit code 1 on error.
//!
//! Lifecycle ops (edit/deprecate/rename/rewire-alias/remove) operate on already-
//! committed cascade tokens in `packages/design-data/tokens/*.tokens.json`.
//!
//! Mode-set ops (add-mode/rename-mode/remove-mode/create-mode-set/remove-mode-set)
//! operate on mode-set files in `packages/design-data/mode-sets/`.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use clap::Subcommand;
use design_data_core::authoring::lifecycle::{
    deprecate_token, edit_token, remove_token, rename_token, rewire_alias, DeprecateTokenInput,
    EditTokenInput, RemoveTokenInput, RenameTokenInput, RewireAliasInput,
};
use design_data_core::authoring::mode_set::{
    add_mode, create_mode_set, remove_mode, remove_mode_set, rename_mode, AddModeInput,
    CreateModeSetInput, RemoveModeInput, RemoveModeSetInput, RenameModeInput,
};
use design_data_core::schema::SchemaRegistry;
use serde_json::Map;

// ── Token lifecycle subcommands ───────────────────────────────────────────────

/// Mutate already-committed cascade tokens by UUID.
#[derive(Subcommand, Debug)]
pub enum LifecycleCommand {
    /// Update a token's fields, value, or alias target in place.
    ///
    /// Merges `--updates` into the token object, re-validates (Layer 1), then
    /// persists.  The `uuid` field is silently ignored if included in `--updates`
    /// (UUID stability contract, authoring-workflow.md L69).
    Edit {
        /// UUID of the token to edit.
        #[arg(long)]
        uuid: String,
        /// Path to the `*.tokens.json` cascade file that contains this token.
        #[arg(long)]
        target: PathBuf,
        /// Fields to merge as a JSON object (e.g. `'{"value": "#ff0000"}'`).
        #[arg(long)]
        updates: String,
        /// Why this token was changed.
        #[arg(long, default_value = "")]
        rationale: String,
        /// Tokens directory root — required when `--updates` contains `"$ref"`.
        #[arg(long)]
        tokens_root: Option<PathBuf>,
        /// Schemas directory for validation (default: auto-resolved from `--target`).
        #[arg(long)]
        schema_path: Option<PathBuf>,
    },
    /// Stamp a deprecation marker and optional replacement guidance onto a token.
    Deprecate {
        /// UUID of the token to deprecate.
        #[arg(long)]
        uuid: String,
        /// Path to the `*.tokens.json` cascade file that contains this token.
        #[arg(long)]
        target: PathBuf,
        /// Dataset `specVersion` string to stamp as the `deprecated` value (e.g. `"1.0.0"`).
        #[arg(long)]
        spec_version: String,
        /// Human-readable deprecation explanation / migration guidance.
        #[arg(long)]
        deprecated_comment: Option<String>,
        /// Replacement token UUID (string) or UUIDs as a JSON array.
        #[arg(long)]
        replaced_by: Option<String>,
        /// Spec version at which the token will be removed (semver string).
        #[arg(long)]
        planned_removal: Option<String>,
        /// Why this token was deprecated.
        #[arg(long, default_value = "")]
        rationale: String,
        /// Schemas directory for validation (default: auto-resolved from `--target`).
        #[arg(long)]
        schema_path: Option<PathBuf>,
    },
    /// Assign a new name object to a token, preserving its UUID.
    Rename {
        /// UUID of the token to rename.
        #[arg(long)]
        uuid: String,
        /// Path to the `*.tokens.json` cascade file that contains this token.
        #[arg(long)]
        target: PathBuf,
        /// New name as a JSON object (`{"property":"…","component":"…"}`) or a
        /// SPEC-017 plain string.
        #[arg(long)]
        new_name: String,
        /// UUID of a token that should receive a `replaced_by` pointer to this token
        /// (the "retire old name" step, authoring-workflow.md L64).
        #[arg(long)]
        replaced_by_target: Option<String>,
        /// Why this token was renamed.
        #[arg(long, default_value = "")]
        rationale: String,
        /// Schemas directory for validation (default: auto-resolved from `--target`).
        #[arg(long)]
        schema_path: Option<PathBuf>,
    },
    /// Change the `$ref` target on an alias token.
    #[command(name = "rewire-alias")]
    RewireAlias {
        /// UUID of the alias token whose `$ref` should be changed.
        #[arg(long)]
        uuid: String,
        /// Path to the `*.tokens.json` cascade file that contains this token.
        #[arg(long)]
        target: PathBuf,
        /// New `$ref` value — must be a UUID that resolves in the cascade.
        #[arg(long)]
        new_ref: String,
        /// Root of the tokens directory for ref-resolution verification.
        #[arg(long)]
        tokens_root: PathBuf,
        /// Why the alias target was changed.
        #[arg(long, default_value = "")]
        rationale: String,
        /// Schemas directory for validation (default: auto-resolved from `--target`).
        #[arg(long)]
        schema_path: Option<PathBuf>,
    },
    /// Delete a token from its cascade file.
    ///
    /// Aborts if any other token in the dataset holds a `$ref` to this UUID.
    Remove {
        /// UUID of the token to delete.
        #[arg(long)]
        uuid: String,
        /// Path to the `*.tokens.json` cascade file that contains this token.
        #[arg(long)]
        target: PathBuf,
        /// Root of the tokens directory for inbound-ref scanning.
        #[arg(long)]
        tokens_root: PathBuf,
    },
}

// ── Mode-set subcommands ──────────────────────────────────────────────────────

/// Manage cascade dimension files in `packages/design-data/mode-sets/`.
#[derive(Subcommand, Debug)]
pub enum ModeSetCommand {
    /// Add a new mode to an existing mode-set file.
    #[command(name = "add-mode")]
    AddMode {
        /// Path to the mode-set JSON file.
        #[arg(long)]
        mode_set_file: PathBuf,
        /// New mode string to append (e.g. `"wireframe"`).
        #[arg(long)]
        mode: String,
        /// Also set the new mode as the `default`.
        #[arg(long)]
        make_default: bool,
    },
    /// Rename a mode and propagate the change to all token name fields.
    #[command(name = "rename-mode")]
    RenameMode {
        /// Path to the mode-set JSON file.
        #[arg(long)]
        mode_set_file: PathBuf,
        /// Root of the tokens directory for propagation.
        #[arg(long)]
        tokens_root: PathBuf,
        /// Existing mode name.
        #[arg(long)]
        old: String,
        /// Replacement mode name.
        #[arg(long = "new")]
        new_mode: String,
    },
    /// Remove an unreferenced mode from a mode-set.
    #[command(name = "remove-mode")]
    RemoveMode {
        /// Path to the mode-set JSON file.
        #[arg(long)]
        mode_set_file: PathBuf,
        /// Root of the tokens directory for the reference guard check.
        #[arg(long)]
        tokens_root: PathBuf,
        /// Mode string to remove.
        #[arg(long)]
        mode: String,
    },
    /// Author a new mode-set file (a new cascade dimension).
    #[command(name = "create-mode-set")]
    CreateModeSet {
        /// Destination file path (must not already exist).
        #[arg(long)]
        mode_set_file: PathBuf,
        /// Logical name used as the key in token `name` objects (e.g. `"colorScheme"`).
        #[arg(long)]
        name: String,
        /// Ordered modes as a JSON array of strings (e.g. `'["light","dark"]'`).
        #[arg(long)]
        modes: String,
        /// Default mode — must be a member of `--modes`.
        #[arg(long)]
        default: String,
        /// Human-readable description written into the file.
        #[arg(long, default_value = "")]
        description: String,
    },
    /// Delete a mode-set file when no tokens reference the dimension.
    #[command(name = "remove-mode-set")]
    RemoveModeSet {
        /// Path to the mode-set JSON file to delete.
        #[arg(long)]
        mode_set_file: PathBuf,
        /// Root of the tokens directory for the reference guard check.
        #[arg(long)]
        tokens_root: PathBuf,
    },
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

pub fn run_lifecycle(cmd: LifecycleCommand) -> ExitCode {
    match run_lifecycle_inner(cmd) {
        Ok(()) => ExitCode::SUCCESS,
        Err(msg) => {
            eprintln!("lifecycle error: {msg}");
            ExitCode::FAILURE
        }
    }
}

pub fn run_mode_set(cmd: ModeSetCommand) -> ExitCode {
    match run_mode_set_inner(cmd) {
        Ok(()) => ExitCode::SUCCESS,
        Err(msg) => {
            eprintln!("mode-set error: {msg}");
            ExitCode::FAILURE
        }
    }
}

fn run_lifecycle_inner(cmd: LifecycleCommand) -> Result<(), String> {
    match cmd {
        LifecycleCommand::Edit {
            uuid,
            target,
            updates,
            rationale,
            tokens_root,
            schema_path,
        } => {
            let updates_val: serde_json::Value = serde_json::from_str(&updates)
                .map_err(|e| format!("--updates is not valid JSON: {e}"))?;
            let updates_map: Map<String, serde_json::Value> = updates_val
                .as_object()
                .ok_or("--updates must be a JSON object")?
                .clone();

            let schema_dir = resolve_schema_path(schema_path.as_deref(), &target);
            let registry = load_registry(&schema_dir)?;

            let result = edit_token(
                EditTokenInput {
                    uuid,
                    target,
                    updates: updates_map,
                    rationale: non_empty(rationale),
                    tokens_root,
                },
                &registry,
            )?;
            print_json(&result)
        }

        LifecycleCommand::Deprecate {
            uuid,
            target,
            spec_version,
            deprecated_comment,
            replaced_by,
            planned_removal,
            rationale,
            schema_path,
        } => {
            let replaced_by_val: Option<serde_json::Value> = replaced_by
                .as_deref()
                .map(|s| {
                    serde_json::from_str(s)
                        .map_err(|e| format!("--replaced-by is not valid JSON: {e}"))
                })
                .transpose()?;

            let schema_dir = resolve_schema_path(schema_path.as_deref(), &target);
            let registry = load_registry(&schema_dir)?;

            let result = deprecate_token(
                DeprecateTokenInput {
                    uuid,
                    target,
                    spec_version,
                    deprecated_comment,
                    replaced_by: replaced_by_val,
                    planned_removal,
                    rationale: non_empty(rationale),
                },
                &registry,
            )?;
            print_json(&result)
        }

        LifecycleCommand::Rename {
            uuid,
            target,
            new_name,
            replaced_by_target,
            rationale,
            schema_path,
        } => {
            let new_name_val: serde_json::Value = serde_json::from_str(&new_name)
                .map_err(|e| format!("--new-name is not valid JSON: {e}"))?;

            let schema_dir = resolve_schema_path(schema_path.as_deref(), &target);
            let registry = load_registry(&schema_dir)?;

            let result = rename_token(
                RenameTokenInput {
                    uuid,
                    target,
                    new_name: new_name_val,
                    replaced_by_target,
                    rationale: non_empty(rationale),
                },
                &registry,
            )?;
            print_json(&result)
        }

        LifecycleCommand::RewireAlias {
            uuid,
            target,
            new_ref,
            tokens_root,
            rationale,
            schema_path,
        } => {
            let schema_dir = resolve_schema_path(schema_path.as_deref(), &target);
            let registry = load_registry(&schema_dir)?;

            let result = rewire_alias(
                RewireAliasInput {
                    uuid,
                    target,
                    new_ref,
                    tokens_root,
                    rationale: non_empty(rationale),
                },
                &registry,
            )?;
            print_json(&result)
        }

        LifecycleCommand::Remove {
            uuid,
            target,
            tokens_root,
        } => {
            remove_token(RemoveTokenInput {
                uuid: uuid.clone(),
                target: target.clone(),
                tokens_root,
            })?;
            print_json(&serde_json::json!({ "ok": true, "uuid": uuid, "removed_from": target }))
        }
    }
}

fn run_mode_set_inner(cmd: ModeSetCommand) -> Result<(), String> {
    match cmd {
        ModeSetCommand::AddMode {
            mode_set_file,
            mode,
            make_default,
        } => {
            let result = add_mode(AddModeInput {
                mode_set_file,
                mode,
                make_default,
            })?;
            print_json(&result)
        }

        ModeSetCommand::RenameMode {
            mode_set_file,
            tokens_root,
            old,
            new_mode,
        } => {
            let result = rename_mode(RenameModeInput {
                mode_set_file,
                tokens_root,
                old,
                new: new_mode,
            })?;
            print_json(&result)
        }

        ModeSetCommand::RemoveMode {
            mode_set_file,
            tokens_root,
            mode,
        } => {
            let result = remove_mode(RemoveModeInput {
                mode_set_file,
                tokens_root,
                mode,
            })?;
            print_json(&result)
        }

        ModeSetCommand::CreateModeSet {
            mode_set_file,
            name,
            modes,
            default,
            description,
        } => {
            let modes_vec: Vec<String> = serde_json::from_str::<Vec<serde_json::Value>>(&modes)
                .map_err(|e| format!("--modes is not valid JSON array: {e}"))?
                .into_iter()
                .enumerate()
                .map(|(i, v)| {
                    v.as_str()
                        .map(str::to_string)
                        .ok_or_else(|| format!("--modes[{i}] must be a string"))
                })
                .collect::<Result<Vec<_>, _>>()?;

            let result = create_mode_set(CreateModeSetInput {
                mode_set_file,
                name,
                modes: modes_vec,
                default,
                description,
            })?;
            print_json(&result)
        }

        ModeSetCommand::RemoveModeSet {
            mode_set_file,
            tokens_root,
        } => {
            let result = remove_mode_set(RemoveModeSetInput {
                mode_set_file,
                tokens_root,
            })?;
            print_json(&result)
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn print_json<T: serde::Serialize>(value: &T) -> Result<(), String> {
    let json = serde_json::to_string_pretty(value)
        .map_err(|e| format!("JSON serialization failed: {e}"))?;
    println!("{json}");
    Ok(())
}

fn load_registry(schema_dir: &Path) -> Result<SchemaRegistry, String> {
    SchemaRegistry::load_legacy_token_schemas(schema_dir)
        .map_err(|e| format!("failed to load schema registry from {schema_dir:?}: {e}"))
}

/// Resolve the schema directory, defaulting to `packages/tokens/schemas` two
/// levels above the target file (same heuristic as `authoring.rs`).
fn resolve_schema_path(explicit: Option<&Path>, target: &Path) -> PathBuf {
    if let Some(p) = explicit {
        return p.to_path_buf();
    }
    target
        .parent()
        .and_then(|p| p.parent())
        .map(|r| r.join("schemas"))
        .unwrap_or_else(|| PathBuf::from("packages/tokens/schemas"))
}

/// Convert an empty string to `None` (clap `default_value = ""` sentinel).
fn non_empty(s: String) -> Option<String> {
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}
