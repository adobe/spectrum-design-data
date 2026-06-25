// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `AuthoringMenuState` handler and builder methods for mode-set operations.
//!
//! Extracted from `mode_set.rs` to stay under the 800-LOC budget cap.

use std::path::Path;

use crossterm::event::{KeyCode, KeyEvent};
use tui_input::{backend::crossterm::EventHandler, Input};

use super::mode_set::{
    kebab_from_name, AddModeFocus, AddModeFormState, CreateModeRow, CreateModeSetFocus,
    CreateModeSetFormState, ModeSetExecute, ModeSetFileInfo, ModeSetOp, ModeSetPickerState,
    RenameModeFormState,
};
use super::{
    AuthoringEvent, AuthoringMenuState, AuthoringScreen, LifecycleExecute, MODE_SET_ACTIONS,
};

// ── Handlers on AuthoringMenuState ────────────────────────────────────────────

impl AuthoringMenuState {
    pub(super) fn handle_mode_set_menu(
        &mut self,
        mut selected: usize,
        key: KeyEvent,
        mode_sets_dir: Option<&Path>,
        _dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        let len = MODE_SET_ACTIONS.len();
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Continue,
                )
            }
            KeyCode::Up | KeyCode::Char('k') => {
                selected = selected.saturating_sub(1);
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if selected + 1 < len {
                    selected += 1;
                }
            }
            KeyCode::Enter => {
                let msd = match mode_sets_dir {
                    Some(d) => d,
                    None => {
                        self.error = Some("no mode-sets directory — pass --dataset".to_string());
                        return (
                            AuthoringScreen::ModeSetMenu { selected },
                            AuthoringEvent::Continue,
                        );
                    }
                };
                let op = match selected {
                    0 => ModeSetOp::AddMode,
                    1 => ModeSetOp::RenameMode,
                    2 => ModeSetOp::RemoveMode,
                    3 => {
                        // CreateModeSet doesn't need a file picker — go to form directly.
                        let state = CreateModeSetFormState {
                            name: Input::default(),
                            modes: vec![CreateModeRow {
                                value: Input::default(),
                            }],
                            default_idx: 0,
                            description: Input::default(),
                            focus: CreateModeSetFocus::Name,
                            selected_mode_idx: 0,
                            mode_sets_dir: Some(msd.to_path_buf()),
                        };
                        return (
                            AuthoringScreen::CreateModeSetForm(state),
                            AuthoringEvent::Continue,
                        );
                    }
                    4 => ModeSetOp::RemoveModeSet,
                    _ => {
                        return (
                            AuthoringScreen::ModeSetMenu { selected },
                            AuthoringEvent::Continue,
                        )
                    }
                };
                match ModeSetPickerState::new(msd) {
                    Ok(picker) => {
                        return (
                            AuthoringScreen::ModeSetPickFile { picker, op },
                            AuthoringEvent::Continue,
                        )
                    }
                    Err(e) => {
                        self.error = Some(e);
                    }
                }
            }
            _ => {}
        }
        (
            AuthoringScreen::ModeSetMenu { selected },
            AuthoringEvent::Continue,
        )
    }

    pub(super) fn handle_mode_set_pick_file(
        &mut self,
        mut picker: ModeSetPickerState,
        op: ModeSetOp,
        key: KeyEvent,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::ModeSetMenu { selected: 0 },
                    AuthoringEvent::Continue,
                )
            }
            KeyCode::Up | KeyCode::Char('k') => {
                picker.move_sel(-1);
            }
            KeyCode::Down | KeyCode::Char('j') => {
                picker.move_sel(1);
            }
            KeyCode::Enter => {
                if let Some(file_info) = picker.selected_file() {
                    let tokens_root = dataset_path.map(|p| p.join("tokens"));
                    match op {
                        ModeSetOp::AddMode => {
                            let file = file_info.clone();
                            return (
                                AuthoringScreen::AddModeForm(AddModeFormState {
                                    file,
                                    mode: Input::default(),
                                    make_default: false,
                                    focus: AddModeFocus::Mode,
                                }),
                                AuthoringEvent::Continue,
                            );
                        }
                        ModeSetOp::RenameMode | ModeSetOp::RemoveMode => {
                            let modes = file_info.modes.clone();
                            let file = file_info.clone();
                            return (
                                AuthoringScreen::ModeSetPickMode {
                                    modes,
                                    selected: 0,
                                    op,
                                    file,
                                },
                                AuthoringEvent::Continue,
                            );
                        }
                        ModeSetOp::RemoveModeSet => {
                            let Some(tokens_root) = tokens_root else {
                                self.error =
                                    Some("tokens_root required — pass --dataset".to_string());
                                return (
                                    AuthoringScreen::ModeSetPickFile { picker, op },
                                    AuthoringEvent::Continue,
                                );
                            };
                            let exec =
                                Box::new(LifecycleExecute::ModeSet(ModeSetExecute::RemoveModeSet(
                                    design_data_core::authoring::mode_set::RemoveModeSetInput {
                                        mode_set_file: file_info.path.clone(),
                                        tokens_root,
                                    },
                                )));
                            let summary = format!(
                                "Remove mode-set: {}",
                                file_info
                                    .path
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("?")
                            );
                            return (
                                AuthoringScreen::Confirm {
                                    summary,
                                    execute: exec,
                                },
                                AuthoringEvent::Continue,
                            );
                        }
                        ModeSetOp::CreateModeSet => {
                            // handled in menu
                        }
                    }
                }
            }
            _ => {
                picker
                    .filter
                    .handle_event(&crossterm::event::Event::Key(key));
                picker.apply_filter();
            }
        }
        (
            AuthoringScreen::ModeSetPickFile { picker, op },
            AuthoringEvent::Continue,
        )
    }

    pub(super) fn handle_mode_set_pick_mode(
        &mut self,
        modes: Vec<String>,
        mut selected: usize,
        op: ModeSetOp,
        file: ModeSetFileInfo,
        key: KeyEvent,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::ModeSetMenu { selected: 0 },
                    AuthoringEvent::Continue,
                )
            }
            KeyCode::Up | KeyCode::Char('k') => {
                selected = selected.saturating_sub(1);
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if selected + 1 < modes.len() {
                    selected += 1;
                }
            }
            KeyCode::Enter => {
                if let Some(mode) = modes.get(selected) {
                    match op {
                        ModeSetOp::RenameMode => {
                            return (
                                AuthoringScreen::RenameModeForm(RenameModeFormState {
                                    old_mode: mode.clone(),
                                    new_mode: Input::default(),
                                    tokens_root: dataset_path.map(|p| p.join("tokens")),
                                    file,
                                }),
                                AuthoringEvent::Continue,
                            );
                        }
                        ModeSetOp::RemoveMode => {
                            let Some(tokens_root) = dataset_path.map(|p| p.join("tokens")) else {
                                self.error =
                                    Some("tokens_root required — pass --dataset".to_string());
                                return (
                                    AuthoringScreen::ModeSetPickMode {
                                        modes,
                                        selected,
                                        op,
                                        file,
                                    },
                                    AuthoringEvent::Continue,
                                );
                            };
                            let exec =
                                Box::new(LifecycleExecute::ModeSet(ModeSetExecute::RemoveMode(
                                    design_data_core::authoring::mode_set::RemoveModeInput {
                                        mode_set_file: file.path.clone(),
                                        tokens_root,
                                        mode: mode.clone(),
                                    },
                                )));
                            let summary = format!("Remove mode '{}' from {}", mode, file.name);
                            return (
                                AuthoringScreen::Confirm {
                                    summary,
                                    execute: exec,
                                },
                                AuthoringEvent::Continue,
                            );
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
        (
            AuthoringScreen::ModeSetPickMode {
                modes,
                selected,
                op,
                file,
            },
            AuthoringEvent::Continue,
        )
    }

    pub(super) fn handle_add_mode_form(
        &mut self,
        mut f: AddModeFormState,
        key: KeyEvent,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                // Go back one step to the file picker, reconstructing it from
                // the file's parent dir.  Fall back to the menu if that fails.
                if let Some(dir) = f.file.path.parent() {
                    match ModeSetPickerState::new(dir) {
                        Ok(picker) => {
                            return (
                                AuthoringScreen::ModeSetPickFile {
                                    picker,
                                    op: ModeSetOp::AddMode,
                                },
                                AuthoringEvent::Continue,
                            )
                        }
                        Err(e) => self.error = Some(e),
                    }
                }
                return (
                    AuthoringScreen::ModeSetMenu { selected: 0 },
                    AuthoringEvent::Continue,
                );
            }
            KeyCode::Tab => {
                f.focus = match f.focus {
                    AddModeFocus::Mode => AddModeFocus::MakeDefault,
                    AddModeFocus::MakeDefault => AddModeFocus::Mode,
                };
            }
            KeyCode::BackTab => {
                f.focus = match f.focus {
                    AddModeFocus::Mode => AddModeFocus::MakeDefault,
                    AddModeFocus::MakeDefault => AddModeFocus::Mode,
                };
            }
            KeyCode::Char(' ') if f.focus == AddModeFocus::MakeDefault => {
                f.make_default = !f.make_default;
            }
            KeyCode::Enter
                if f.focus == AddModeFocus::MakeDefault || f.focus == AddModeFocus::Mode =>
            {
                if f.mode.value().trim().is_empty() {
                    // Redirect to Mode so the user sees which field to fix.
                    self.error = Some("mode name is required".to_string());
                    f.focus = AddModeFocus::Mode;
                } else if f.focus == AddModeFocus::Mode {
                    // Advance to make_default toggle on first Enter from Mode.
                    f.focus = AddModeFocus::MakeDefault;
                } else {
                    match Self::build_add_mode_execute(
                        &f.file,
                        f.mode.value().trim(),
                        f.make_default,
                    ) {
                        Ok(exec) => {
                            let summary =
                                format!("Add mode '{}' to {}", f.mode.value().trim(), f.file.name);
                            return (
                                AuthoringScreen::Confirm {
                                    summary,
                                    execute: exec,
                                },
                                AuthoringEvent::Continue,
                            );
                        }
                        Err(e) => {
                            self.error = Some(e);
                        }
                    }
                }
            }
            _ => {
                if f.focus == AddModeFocus::Mode {
                    f.mode.handle_event(&crossterm::event::Event::Key(key));
                }
            }
        }
        (AuthoringScreen::AddModeForm(f), AuthoringEvent::Continue)
    }

    pub(super) fn handle_rename_mode_form(
        &mut self,
        mut f: RenameModeFormState,
        key: KeyEvent,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                // Go back one step to the mode picker.
                let selected = f
                    .file
                    .modes
                    .iter()
                    .position(|m| m == &f.old_mode)
                    .unwrap_or(0);
                return (
                    AuthoringScreen::ModeSetPickMode {
                        modes: f.file.modes.clone(),
                        selected,
                        op: ModeSetOp::RenameMode,
                        file: f.file,
                    },
                    AuthoringEvent::Continue,
                );
            }
            KeyCode::Enter => match Self::build_rename_mode_execute(&f) {
                Ok(exec) => {
                    let summary = format!(
                        "Rename mode '{}' → '{}' in {}",
                        f.old_mode,
                        f.new_mode.value().trim(),
                        f.file.name
                    );
                    return (
                        AuthoringScreen::Confirm {
                            summary,
                            execute: exec,
                        },
                        AuthoringEvent::Continue,
                    );
                }
                Err(e) => {
                    self.error = Some(e);
                }
            },
            _ => {
                f.new_mode.handle_event(&crossterm::event::Event::Key(key));
            }
        }
        (AuthoringScreen::RenameModeForm(f), AuthoringEvent::Continue)
    }

    pub(super) fn handle_create_mode_set_form(
        &mut self,
        mut f: CreateModeSetFormState,
        key: KeyEvent,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::ModeSetMenu { selected: 0 },
                    AuthoringEvent::Continue,
                )
            }
            KeyCode::Tab => {
                f.focus = match f.focus {
                    CreateModeSetFocus::Name => CreateModeSetFocus::Modes,
                    CreateModeSetFocus::Modes => CreateModeSetFocus::Description,
                    CreateModeSetFocus::Description => CreateModeSetFocus::Name,
                };
            }
            KeyCode::BackTab => {
                f.focus = match f.focus {
                    CreateModeSetFocus::Name => CreateModeSetFocus::Description,
                    CreateModeSetFocus::Modes => CreateModeSetFocus::Name,
                    CreateModeSetFocus::Description => CreateModeSetFocus::Modes,
                };
            }
            KeyCode::Enter if f.focus == CreateModeSetFocus::Description => {
                match Self::build_create_mode_set_execute(&f) {
                    Ok(exec) => {
                        let summary = format!("Create mode-set '{}'", f.name.value().trim());
                        return (
                            AuthoringScreen::Confirm {
                                summary,
                                execute: exec,
                            },
                            AuthoringEvent::Continue,
                        );
                    }
                    Err(e) => {
                        self.error = Some(e);
                    }
                }
            }
            KeyCode::Char('+') if f.focus == CreateModeSetFocus::Modes => {
                f.modes.push(CreateModeRow {
                    value: Input::default(),
                });
            }
            KeyCode::Up | KeyCode::Char('k') if f.focus == CreateModeSetFocus::Modes => {
                if f.selected_mode_idx > 0 {
                    f.selected_mode_idx -= 1;
                }
            }
            KeyCode::Down | KeyCode::Char('j') if f.focus == CreateModeSetFocus::Modes => {
                if f.selected_mode_idx + 1 < f.modes.len() {
                    f.selected_mode_idx += 1;
                }
            }
            KeyCode::Char('d')
                if f.focus == CreateModeSetFocus::Modes
                    && key
                        .modifiers
                        .contains(crossterm::event::KeyModifiers::CONTROL) =>
            {
                if f.modes.len() > 1 {
                    f.modes.remove(f.selected_mode_idx);
                    if f.selected_mode_idx >= f.modes.len() && f.selected_mode_idx > 0 {
                        f.selected_mode_idx -= 1;
                    }
                }
            }
            _ => match f.focus {
                CreateModeSetFocus::Name => {
                    f.name.handle_event(&crossterm::event::Event::Key(key));
                }
                CreateModeSetFocus::Modes => {
                    if let Some(row) = f.modes.get_mut(f.selected_mode_idx) {
                        row.value.handle_event(&crossterm::event::Event::Key(key));
                    }
                }
                CreateModeSetFocus::Description => {
                    f.description
                        .handle_event(&crossterm::event::Event::Key(key));
                }
            },
        }
        (
            AuthoringScreen::CreateModeSetForm(f),
            AuthoringEvent::Continue,
        )
    }

    // ── Build execute helpers ─────────────────────────────────────────────────

    pub(super) fn build_add_mode_execute(
        file: &ModeSetFileInfo,
        mode: &str,
        make_default: bool,
    ) -> Result<Box<LifecycleExecute>, String> {
        if mode.is_empty() {
            return Err("mode name is required".to_string());
        }
        Ok(Box::new(LifecycleExecute::ModeSet(
            ModeSetExecute::AddMode(design_data_core::authoring::mode_set::AddModeInput {
                mode_set_file: file.path.clone(),
                mode: mode.to_string(),
                make_default,
            }),
        )))
    }

    pub(super) fn build_rename_mode_execute(
        f: &RenameModeFormState,
    ) -> Result<Box<LifecycleExecute>, String> {
        let new_mode = f.new_mode.value().trim();
        if new_mode.is_empty() {
            return Err("new mode name is required".to_string());
        }
        let tokens_root = f
            .tokens_root
            .clone()
            .ok_or("tokens_root required — pass --dataset")?;
        Ok(Box::new(LifecycleExecute::ModeSet(
            ModeSetExecute::RenameMode(design_data_core::authoring::mode_set::RenameModeInput {
                mode_set_file: f.file.path.clone(),
                tokens_root,
                old: f.old_mode.clone(),
                new: new_mode.to_string(),
            }),
        )))
    }

    pub(super) fn build_create_mode_set_execute(
        f: &CreateModeSetFormState,
    ) -> Result<Box<LifecycleExecute>, String> {
        let name = f.name.value().trim().to_string();
        if name.is_empty() {
            return Err("mode-set name is required".to_string());
        }
        let modes: Vec<String> = f
            .modes
            .iter()
            .map(|r| r.value.value().trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if modes.is_empty() {
            return Err("at least one mode is required".to_string());
        }
        let default = modes
            .get(f.default_idx)
            .cloned()
            .unwrap_or_else(|| modes[0].clone());
        let description = f.description.value().trim().to_string();
        let dir = f
            .mode_sets_dir
            .as_ref()
            .ok_or("mode-sets directory unknown — pass --dataset")?;
        let file_name = format!("{}.json", kebab_from_name(&name));
        let mode_set_file = dir.join(&file_name);
        Ok(Box::new(LifecycleExecute::ModeSet(
            ModeSetExecute::CreateModeSet(
                design_data_core::authoring::mode_set::CreateModeSetInput {
                    mode_set_file,
                    name,
                    modes,
                    default,
                    description,
                },
            ),
        )))
    }
}
