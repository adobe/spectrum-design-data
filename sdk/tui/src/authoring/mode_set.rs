// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Mode-set op form states and handlers (Phase B / si6.3).

use std::path::{Path, PathBuf};

use crossterm::event::{KeyCode, KeyEvent};
use ratatui::widgets::ListState;
use tui_input::{backend::crossterm::EventHandler, Input};

use super::{AuthoringEvent, AuthoringMenuState, AuthoringScreen, LifecycleExecute};

// ── Operation enum ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModeSetOp {
    AddMode,
    RenameMode,
    RemoveMode,
    CreateModeSet,
    RemoveModeSet,
}

// ── Mode-set file info ─────────────────────────────────────────────────────────

pub struct ModeSetFileInfo {
    pub path: PathBuf,
    pub name: String,
    pub modes: Vec<String>,
    pub default: String,
    pub description: String,
}

// ── Mode-set file picker ───────────────────────────────────────────────────────

pub struct ModeSetPickerState {
    pub files: Vec<ModeSetFileInfo>,
    pub filtered: Vec<usize>,
    pub filter: Input,
    pub list_state: ListState,
}

impl ModeSetPickerState {
    pub fn new(mode_sets_dir: &Path) -> Result<Self, String> {
        let mut files = Vec::new();
        let entries =
            std::fs::read_dir(mode_sets_dir).map_err(|e| format!("reading mode-sets dir: {e}"))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("dir entry: {e}"))?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            match parse_mode_set_file(&path) {
                Ok(info) => files.push(info),
                Err(_) => continue,
            }
        }
        files.sort_by(|a, b| a.name.cmp(&b.name));
        let n = files.len();
        let mut list_state = ListState::default();
        if n > 0 {
            list_state.select(Some(0));
        }
        Ok(Self {
            filtered: (0..n).collect(),
            files,
            filter: Input::default(),
            list_state,
        })
    }

    pub fn apply_filter(&mut self) {
        let q = self.filter.value().to_lowercase();
        self.filtered = if q.is_empty() {
            (0..self.files.len()).collect()
        } else {
            self.files
                .iter()
                .enumerate()
                .filter(|(_, f)| f.name.to_lowercase().contains(&q))
                .map(|(i, _)| i)
                .collect()
        };
        let max = self.filtered.len().saturating_sub(1);
        let sel = self.list_state.selected().unwrap_or(0).min(max);
        if self.filtered.is_empty() {
            self.list_state.select(None);
        } else {
            self.list_state.select(Some(sel));
        }
    }

    pub fn selected_file(&self) -> Option<&ModeSetFileInfo> {
        let idx = self.list_state.selected()?;
        self.files.get(*self.filtered.get(idx)?)
    }

    fn move_sel(&mut self, delta: i32) {
        let n = self.filtered.len();
        if n == 0 {
            return;
        }
        let cur = self.list_state.selected().unwrap_or(0) as i32;
        let next = (cur + delta).clamp(0, n as i32 - 1) as usize;
        self.list_state.select(Some(next));
    }
}

fn parse_mode_set_file(path: &Path) -> Result<ModeSetFileInfo, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let obj = value
        .as_object()
        .ok_or_else(|| format!("{}: not a JSON object", path.display()))?;
    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("{}: missing 'name'", path.display()))?
        .to_string();
    let default = obj
        .get("default")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let description = obj
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let modes = obj
        .get("modes")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    Ok(ModeSetFileInfo {
        path: path.to_path_buf(),
        name,
        modes,
        default,
        description,
    })
}

// ── Form focus enums ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AddModeFocus {
    Mode,
    MakeDefault,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CreateModeSetFocus {
    Name,
    Modes,
    Description,
}

// ── Form state structs ────────────────────────────────────────────────────────

pub struct AddModeFormState {
    pub file: ModeSetFileInfo,
    pub mode: Input,
    pub make_default: bool,
    pub focus: AddModeFocus,
}

pub struct RenameModeFormState {
    pub file: ModeSetFileInfo,
    pub old_mode: String,
    pub new_mode: Input,
    pub tokens_root: Option<PathBuf>,
}

pub struct CreateModeRow {
    pub value: Input,
}

pub struct CreateModeSetFormState {
    pub name: Input,
    pub modes: Vec<CreateModeRow>,
    pub default_idx: usize,
    pub description: Input,
    pub focus: CreateModeSetFocus,
    pub selected_mode_idx: usize,
    pub mode_sets_dir: Option<PathBuf>,
}

// ── Execute enum ──────────────────────────────────────────────────────────────

pub enum ModeSetExecute {
    AddMode(design_data_core::authoring::mode_set::AddModeInput),
    RenameMode(design_data_core::authoring::mode_set::RenameModeInput),
    RemoveMode(design_data_core::authoring::mode_set::RemoveModeInput),
    CreateModeSet(design_data_core::authoring::mode_set::CreateModeSetInput),
    RemoveModeSet(design_data_core::authoring::mode_set::RemoveModeSetInput),
}

// ── kebab helper ──────────────────────────────────────────────────────────────

pub fn kebab_from_name(name: &str) -> String {
    let mut result = String::new();
    for (i, ch) in name.chars().enumerate() {
        if ch.is_uppercase() && i > 0 {
            result.push('-');
        }
        result.push(ch.to_lowercase().next().unwrap_or(ch));
    }
    result.replace(' ', "-")
}

// ── Handlers on AuthoringMenuState ────────────────────────────────────────────

impl AuthoringMenuState {
    pub(super) fn handle_mode_set_menu(
        &mut self,
        mut selected: usize,
        key: KeyEvent,
        mode_sets_dir: Option<&Path>,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        use super::MODE_SET_ACTIONS;
        let len = MODE_SET_ACTIONS.len();
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Continue,
                )
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if selected > 0 {
                    selected -= 1;
                }
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
                        let tokens_root = dataset_path.map(|p| p.join("tokens"));
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
                        let _ = tokens_root; // stored in form if needed
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
                            let file = build_file_info(file_info);
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
                            let file = build_file_info(file_info);
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
                            let tokens_root = match tokens_root {
                                Some(r) => r,
                                None => {
                                    self.error =
                                        Some("tokens_root required — pass --dataset".to_string());
                                    return (
                                        AuthoringScreen::ModeSetPickFile { picker, op },
                                        AuthoringEvent::Continue,
                                    );
                                }
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
                if selected > 0 {
                    selected -= 1;
                }
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
                            let tokens_root = dataset_path.map(|p| p.join("tokens"));
                            return (
                                AuthoringScreen::RenameModeForm(RenameModeFormState {
                                    old_mode: mode.clone(),
                                    new_mode: Input::default(),
                                    tokens_root,
                                    file,
                                }),
                                AuthoringEvent::Continue,
                            );
                        }
                        ModeSetOp::RemoveMode => {
                            let tokens_root = match dataset_path.map(|p| p.join("tokens")) {
                                Some(r) => r,
                                None => {
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
                                }
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
                return (
                    AuthoringScreen::ModeSetMenu { selected: 0 },
                    AuthoringEvent::Continue,
                )
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
                if f.focus == AddModeFocus::Mode && !f.mode.value().trim().is_empty() {
                    // Move to make_default field on first Enter from Mode.
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
                return (
                    AuthoringScreen::ModeSetMenu { selected: 0 },
                    AuthoringEvent::Continue,
                )
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

/// Clone a ModeSetFileInfo (used when the picker consumes it).
fn build_file_info(info: &ModeSetFileInfo) -> ModeSetFileInfo {
    ModeSetFileInfo {
        path: info.path.clone(),
        name: info.name.clone(),
        modes: info.modes.clone(),
        default: info.default.clone(),
        description: info.description.clone(),
    }
}
