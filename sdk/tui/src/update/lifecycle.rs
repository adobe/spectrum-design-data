// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Deferred `Task::cmd` dispatch for token lifecycle mutation ops (Phase B / si6.2).
//!
//! Each of the five lifecycle ops runs entirely in a background task so the event
//! loop is never blocked by disk I/O.  The pattern mirrors the create-wizard write
//! path (`WriteDone`) and the `validate` scan (`ValidateDone`).

use std::path::PathBuf;
use std::sync::Arc;

use design_data_core::authoring::lifecycle::{
    deprecate_token, edit_token, remove_token, rename_token, rewire_alias,
};
use design_data_core::schema::SchemaRegistry;

use crate::app::{Modal, StatusMessage};
use crate::authoring::LifecycleExecute;
use crate::message::Message;
use crate::model::Model;
use crate::task::Task;

/// Build a deferred `Task::cmd` that runs the appropriate lifecycle op and
/// returns `Message::LifecycleDone`.
///
/// `registry` is required for edit / deprecate / rename / rewire; `None` is only
/// valid for remove.  `_dataset_path` is reserved for future ops that need it.
pub(super) fn build_lifecycle_task(
    op: LifecycleExecute,
    registry: Option<Arc<SchemaRegistry>>,
    _dataset_path: Option<PathBuf>,
) -> Task<Message> {
    Task::cmd(move || {
        let result: Result<(String, PathBuf), String> = run_op(op, registry);
        Message::LifecycleDone(result)
    })
}

fn run_op(
    op: LifecycleExecute,
    registry: Option<Arc<SchemaRegistry>>,
) -> Result<(String, PathBuf), String> {
    match op {
        LifecycleExecute::Edit(input) => {
            let reg = registry
                .as_deref()
                .ok_or_else(|| "schema registry required for edit".to_string())?;
            let name = name_hint(&input.uuid);
            edit_token(input, reg).map(|r| (format!("edited {name}"), r.written_to))
        }
        LifecycleExecute::Deprecate(input) => {
            let reg = registry
                .as_deref()
                .ok_or_else(|| "schema registry required for deprecate".to_string())?;
            let name = name_hint(&input.uuid);
            deprecate_token(input, reg).map(|r| (format!("deprecated {name}"), r.written_to))
        }
        LifecycleExecute::Rename(input) => {
            let reg = registry
                .as_deref()
                .ok_or_else(|| "schema registry required for rename".to_string())?;
            let name = name_hint(&input.uuid);
            rename_token(input, reg).map(|r| (format!("renamed {name}"), r.written_to))
        }
        LifecycleExecute::Rewire(input) => {
            let reg = registry
                .as_deref()
                .ok_or_else(|| "schema registry required for rewire".to_string())?;
            let name = name_hint(&input.uuid);
            rewire_alias(input, reg).map(|r| (format!("rewired {name}"), r.written_to))
        }
        LifecycleExecute::Remove(input) => {
            let target = input.target.clone();
            let name = name_hint(&input.uuid);
            remove_token(input).map(|()| (format!("removed {name}"), target))
        }
        LifecycleExecute::ModeSet(ms_op) => {
            use crate::authoring::mode_set::ModeSetExecute;
            use design_data_core::authoring::mode_set::*;
            match ms_op {
                ModeSetExecute::AddMode(input) => {
                    let mode = input.mode.clone();
                    add_mode(input).map(|r| (format!("added mode {mode}"), r.written_to))
                }
                ModeSetExecute::RenameMode(input) => {
                    let old = input.old.clone();
                    rename_mode(input).map(|r| (format!("renamed mode {old}"), r.written_to))
                }
                ModeSetExecute::RemoveMode(input) => {
                    let mode = input.mode.clone();
                    remove_mode(input).map(|r| (format!("removed mode {mode}"), r.written_to))
                }
                ModeSetExecute::CreateModeSet(input) => {
                    let name = input.name.clone();
                    create_mode_set(input)
                        .map(|r| (format!("created mode-set {name}"), r.written_to))
                }
                ModeSetExecute::RemoveModeSet(input) => {
                    let path = input.mode_set_file.clone();
                    remove_mode_set(input).map(|r| {
                        (
                            format!(
                                "removed mode-set {}",
                                path.file_name().and_then(|n| n.to_str()).unwrap_or("?")
                            ),
                            r.written_to,
                        )
                    })
                }
            }
        }
    }
}

/// Short human-readable hint from a UUID (first 8 chars).
fn name_hint(uuid: &str) -> String {
    uuid.get(..8).unwrap_or(uuid).to_string()
}

/// Handle a `Message::LifecycleDone` result in the update function.
///
/// On success: close the modal and set an info status message.
/// On failure: surface the error inline on the authoring modal (keeping it open),
/// or fall back to a status-bar error if the modal has already been closed.
pub(super) fn handle_lifecycle_done(
    model: &mut Model,
    result: Result<(String, std::path::PathBuf), String>,
) {
    match result {
        Ok((summary, path)) => {
            model.close_modal();
            model.status_message = Some(StatusMessage::info(format!(
                "{summary} → {}",
                path.display()
            )));
        }
        Err(e) => {
            if let Some(Modal::Authoring(ref mut am)) = model.modal_mut() {
                am.error = Some(e);
            } else {
                model.status_message = Some(StatusMessage::error(e));
            }
        }
    }
}
