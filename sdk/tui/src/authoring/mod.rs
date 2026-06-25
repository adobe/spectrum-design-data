// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token authoring action-picker modal state machine (Phase B / si6.2 + si6.3).
//!
//! `AuthoringMenuState` drives lifecycle op flow:
//! PickAction → PickToken → Form → Confirm
//!
//! For `replaced_by` (deprecate), `new_ref` (rewire), or `replaced_by_target`
//! (rename), a second PickToken screen is pushed mid-form; the interrupted form is
//! stashed in `saved_form` and restored after the sub-pick.
//!
//! The modal never touches the filesystem. `AuthoringEvent::Execute(op)` is
//! returned on confirm; the `update` handler converts it to a `Task::cmd`.

pub mod forms;
pub mod mode_set;
mod mode_set_handlers;

use std::path::{Path, PathBuf};

use crossterm::event::{KeyCode, KeyEvent};
use design_data_core::authoring::lifecycle::RemoveTokenInput;
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph};
use ratatui::widgets::TableState;
use serde_json::Value;
use tui_input::{backend::crossterm::EventHandler, Input};

pub use forms::{
    DeprecateFocus, DeprecateFormState, EditFieldRow, EditFocus, EditFormState, RenameFocus,
    RenameFormState, RewireFocus, RewireFormState,
};
pub use mode_set::{
    AddModeFocus, AddModeFormState, CreateModeRow, CreateModeSetFocus, CreateModeSetFormState,
    ModeSetExecute, ModeSetFileInfo, ModeSetOp, ModeSetPickerState, RenameModeFormState,
};

// ── Constants ──────────────────────────────────────────────────────────────────

/// Action menu entries: (label, enabled).  Disabled entries are shown dimmed.
pub const ACTIONS: &[(&str, bool)] = &[
    ("Create", true),
    ("Edit", true),
    ("Deprecate", true),
    ("Rename", true),
    ("Rewire alias", true),
    ("Remove", true),
    ("Mode-sets\u{2026}", true),
];

pub const MODE_SET_ACTIONS: &[&str] = &[
    "Add mode",
    "Rename mode",
    "Remove mode",
    "Create mode-set",
    "Remove mode-set",
];

// ── Shared data ────────────────────────────────────────────────────────────────

/// A token resolved from the picker (owned data needed by op inputs).
pub struct PickedToken {
    pub uuid: String,
    pub name: String,
    pub source_path: PathBuf,
    pub raw: Value,
}

/// One row in the [`TokenPickerState`] list.
pub struct PickerRow {
    pub uuid: String,
    pub name: String,
    pub layer: String,
    pub source_path: PathBuf,
    pub raw: Value,
}

fn layer_label(layer: Layer) -> &'static str {
    match layer {
        Layer::Foundation => "foundation",
        Layer::Platform => "platform",
        Layer::Product => "product",
    }
}

// ── Token-picker screen ────────────────────────────────────────────────────────

pub struct TokenPickerState {
    pub filter: Input,
    pub rows: Vec<PickerRow>,
    /// Indices into `rows` that match the current filter.
    pub filtered: Vec<usize>,
    pub table_state: TableState,
}

impl TokenPickerState {
    pub fn new(rows: Vec<PickerRow>) -> Self {
        let n = rows.len();
        let mut ts = TableState::default();
        if n > 0 {
            ts.select(Some(0));
        }
        Self {
            filter: Input::default(),
            rows,
            filtered: (0..n).collect(),
            table_state: ts,
        }
    }

    pub fn apply_filter(&mut self) {
        let q = self.filter.value().to_lowercase();
        self.filtered = if q.is_empty() {
            (0..self.rows.len()).collect()
        } else {
            self.rows
                .iter()
                .enumerate()
                .filter(|(_, r)| r.name.to_lowercase().contains(&q))
                .map(|(i, _)| i)
                .collect()
        };
        let max = self.filtered.len().saturating_sub(1);
        let sel = self.table_state.selected().unwrap_or(0).min(max);
        if self.filtered.is_empty() {
            self.table_state.select(None);
        } else {
            self.table_state.select(Some(sel));
        }
    }

    pub fn selected_row(&self) -> Option<&PickerRow> {
        let idx = self.table_state.selected()?;
        self.rows.get(*self.filtered.get(idx)?)
    }

    pub(super) fn move_sel(&mut self, delta: i32) {
        let n = self.filtered.len();
        if n == 0 {
            return;
        }
        let cur = self.table_state.selected().unwrap_or(0) as i32;
        let next = (cur + delta).clamp(0, n as i32 - 1) as usize;
        self.table_state.select(Some(next));
    }
}

// ── State machine core ─────────────────────────────────────────────────────────

/// Which lifecycle action the user selected in PickAction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthoringAction {
    Edit,
    Deprecate,
    Rename,
    Rewire,
    Remove,
}

pub enum SubPickKind {
    DeprecateReplacedBy,
    RewireNewRef,
    RenameReplacedByTarget,
}

/// The interrupted form stashed while a sub-pick is in progress.
pub(super) enum SavedForm {
    Deprecate(DeprecateFormState),
    Rewire(RewireFormState),
    Rename(RenameFormState),
}

/// The owned op input returned to the update handler.
pub enum LifecycleExecute {
    Edit(design_data_core::authoring::lifecycle::EditTokenInput),
    Deprecate(design_data_core::authoring::lifecycle::DeprecateTokenInput),
    Rename(design_data_core::authoring::lifecycle::RenameTokenInput),
    Rewire(design_data_core::authoring::lifecycle::RewireAliasInput),
    Remove(RemoveTokenInput),
    ModeSet(ModeSetExecute),
}

/// Screens for [`AuthoringMenuState`].
pub enum AuthoringScreen {
    PickAction {
        selected: usize,
    },
    PickToken {
        picker: TokenPickerState,
        action: Option<AuthoringAction>,
        sub_kind: Option<SubPickKind>,
    },
    EditForm(EditFormState),
    DeprecateForm(DeprecateFormState),
    RenameForm(RenameFormState),
    RewireForm(RewireFormState),
    RemoveConfirm {
        token: PickedToken,
    },
    Confirm {
        summary: String,
        execute: Box<LifecycleExecute>,
    },
    // ── Mode-set screens ──
    ModeSetMenu {
        selected: usize,
    },
    ModeSetPickFile {
        picker: ModeSetPickerState,
        op: ModeSetOp,
    },
    ModeSetPickMode {
        modes: Vec<String>,
        selected: usize,
        op: ModeSetOp,
        file: ModeSetFileInfo,
    },
    AddModeForm(AddModeFormState),
    RenameModeForm(RenameModeFormState),
    CreateModeSetForm(CreateModeSetFormState),
}

/// Events returned by [`AuthoringMenuState::handle_key`].
pub enum AuthoringEvent {
    Continue,
    Cancel,
    /// Swap this modal for the token-create wizard.
    OpenWizard,
    /// Execute the op; the update handler builds the `Task::cmd`.
    Execute(Box<LifecycleExecute>),
}

pub struct AuthoringMenuState {
    pub screen: AuthoringScreen,
    pub(super) saved_form: Option<SavedForm>,
    pub error: Option<String>,
}

impl Default for AuthoringMenuState {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthoringMenuState {
    pub fn new() -> Self {
        Self {
            screen: AuthoringScreen::PickAction { selected: 0 },
            saved_form: None,
            error: None,
        }
    }

    pub fn handle_key(
        &mut self,
        key: KeyEvent,
        graph: &TokenGraph,
        dataset_path: Option<&Path>,
        mode_sets_dir: Option<&Path>,
    ) -> AuthoringEvent {
        self.error = None;
        let screen = std::mem::replace(
            &mut self.screen,
            AuthoringScreen::PickAction { selected: 0 },
        );
        let (new_screen, event) = self.dispatch(screen, key, graph, dataset_path, mode_sets_dir);
        self.screen = new_screen;
        event
    }

    // ── Dispatcher ────────────────────────────────────────────────────────────

    fn dispatch(
        &mut self,
        screen: AuthoringScreen,
        key: KeyEvent,
        graph: &TokenGraph,
        dataset_path: Option<&Path>,
        mode_sets_dir: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match screen {
            AuthoringScreen::PickAction { selected } => {
                self.handle_pick_action(selected, key, graph, mode_sets_dir)
            }
            AuthoringScreen::PickToken {
                picker,
                action,
                sub_kind,
            } => self.handle_pick_token(picker, action, sub_kind, key, graph, dataset_path),
            AuthoringScreen::EditForm(f) => self.handle_edit_form(f, key, dataset_path),
            AuthoringScreen::DeprecateForm(f) => self.handle_deprecate_form(f, key, graph),
            AuthoringScreen::RenameForm(f) => self.handle_rename_form(f, key, graph),
            AuthoringScreen::RewireForm(f) => self.handle_rewire_form(f, key, graph, dataset_path),
            AuthoringScreen::RemoveConfirm { token } => {
                self.handle_remove_confirm(token, key, dataset_path)
            }
            AuthoringScreen::Confirm { summary, execute } => {
                self.handle_confirm(summary, execute, key)
            }
            // ── Mode-set screens ──
            AuthoringScreen::ModeSetMenu { selected } => {
                self.handle_mode_set_menu(selected, key, mode_sets_dir, dataset_path)
            }
            AuthoringScreen::ModeSetPickFile { picker, op } => {
                self.handle_mode_set_pick_file(picker, op, key, dataset_path)
            }
            AuthoringScreen::ModeSetPickMode {
                modes,
                selected,
                op,
                file,
            } => self.handle_mode_set_pick_mode(modes, selected, op, file, key, dataset_path),
            AuthoringScreen::AddModeForm(f) => self.handle_add_mode_form(f, key),
            AuthoringScreen::RenameModeForm(f) => self.handle_rename_mode_form(f, key),
            AuthoringScreen::CreateModeSetForm(f) => self.handle_create_mode_set_form(f, key),
        }
    }

    // ── PickAction ────────────────────────────────────────────────────────────

    fn handle_pick_action(
        &mut self,
        mut sel: usize,
        key: KeyEvent,
        graph: &TokenGraph,
        mode_sets_dir: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        let enabled_len = ACTIONS.len();
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: sel },
                    AuthoringEvent::Cancel,
                )
            }
            KeyCode::Up | KeyCode::Char('k') => {
                sel = sel.saturating_sub(1);
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if sel + 1 < enabled_len {
                    sel += 1;
                }
            }
            KeyCode::Enter => {
                let (label, enabled) = ACTIONS[sel];
                if !enabled {
                    return (
                        AuthoringScreen::PickAction { selected: sel },
                        AuthoringEvent::Continue,
                    );
                }
                if label == "Create" {
                    return (
                        AuthoringScreen::PickAction { selected: sel },
                        AuthoringEvent::OpenWizard,
                    );
                }
                if label == "Mode-sets\u{2026}" {
                    if mode_sets_dir.is_none() {
                        self.error = Some("no mode-sets directory — pass --dataset".to_string());
                        return (
                            AuthoringScreen::PickAction { selected: sel },
                            AuthoringEvent::Continue,
                        );
                    }
                    return (
                        AuthoringScreen::ModeSetMenu { selected: 0 },
                        AuthoringEvent::Continue,
                    );
                }
                let action = match label {
                    "Edit" => AuthoringAction::Edit,
                    "Deprecate" => AuthoringAction::Deprecate,
                    "Rename" => AuthoringAction::Rename,
                    "Rewire alias" => AuthoringAction::Rewire,
                    "Remove" => AuthoringAction::Remove,
                    _ => {
                        return (
                            AuthoringScreen::PickAction { selected: sel },
                            AuthoringEvent::Continue,
                        )
                    }
                };
                let picker = TokenPickerState::new(Self::build_picker_rows(graph));
                return (
                    AuthoringScreen::PickToken {
                        picker,
                        action: Some(action),
                        sub_kind: None,
                    },
                    AuthoringEvent::Continue,
                );
            }
            _ => {}
        }
        (
            AuthoringScreen::PickAction { selected: sel },
            AuthoringEvent::Continue,
        )
    }

    // ── PickToken ─────────────────────────────────────────────────────────────

    fn handle_pick_token(
        &mut self,
        mut picker: TokenPickerState,
        action: Option<AuthoringAction>,
        sub_kind: Option<SubPickKind>,
        key: KeyEvent,
        _graph: &TokenGraph,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                if let Some(saved) = self.saved_form.take() {
                    let screen = Self::saved_form_to_screen(saved);
                    return (screen, AuthoringEvent::Continue);
                }
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Continue,
                );
            }
            KeyCode::Up | KeyCode::Char('k') => {
                picker.move_sel(-1);
            }
            KeyCode::Down | KeyCode::Char('j') => {
                picker.move_sel(1);
            }
            KeyCode::Enter => {
                if let Some(row) = picker.selected_row() {
                    let picked = PickedToken {
                        uuid: row.uuid.clone(),
                        name: row.name.clone(),
                        source_path: row.source_path.clone(),
                        raw: row.raw.clone(),
                    };
                    match sub_kind {
                        Some(SubPickKind::DeprecateReplacedBy) => {
                            if let Some(SavedForm::Deprecate(mut f)) = self.saved_form.take() {
                                f.replaced_by = Some(picked);
                                return (
                                    AuthoringScreen::DeprecateForm(f),
                                    AuthoringEvent::Continue,
                                );
                            } else {
                                self.error =
                                    Some("internal state error — press Esc to restart".to_string());
                            }
                        }
                        Some(SubPickKind::RewireNewRef) => {
                            if let Some(SavedForm::Rewire(mut f)) = self.saved_form.take() {
                                f.new_ref = Some(picked);
                                return (AuthoringScreen::RewireForm(f), AuthoringEvent::Continue);
                            } else {
                                self.error =
                                    Some("internal state error — press Esc to restart".to_string());
                            }
                        }
                        Some(SubPickKind::RenameReplacedByTarget) => {
                            if let Some(SavedForm::Rename(mut f)) = self.saved_form.take() {
                                f.replaced_by_target = Some(picked);
                                return (AuthoringScreen::RenameForm(f), AuthoringEvent::Continue);
                            } else {
                                self.error =
                                    Some("internal state error — press Esc to restart".to_string());
                            }
                        }
                        None => {
                            if let Some(a) = action {
                                let screen = self.build_form_for_action(a, picked, dataset_path);
                                return (screen, AuthoringEvent::Continue);
                            }
                            // Ghost state: sub_kind=None but action=None — shouldn't happen
                            // in normal flow, but guard instead of panicking.
                            self.error =
                                Some("internal state error — press Esc to restart".to_string());
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
            AuthoringScreen::PickToken {
                picker,
                action,
                sub_kind,
            },
            AuthoringEvent::Continue,
        )
    }

    fn build_form_for_action(
        &self,
        action: AuthoringAction,
        token: PickedToken,
        _dataset_path: Option<&Path>,
    ) -> AuthoringScreen {
        use crate::wizard_common::classification::ClassificationDraft;
        use forms::{
            DeprecateFocus, DeprecateFormState, EditFormState, RenameFocus, RenameFormState,
            RewireFocus, RewireFormState,
        };
        use tui_input::Input;
        match action {
            AuthoringAction::Edit => AuthoringScreen::EditForm(EditFormState::from_token(token)),
            AuthoringAction::Deprecate => AuthoringScreen::DeprecateForm(DeprecateFormState {
                token,
                spec_version: Input::default(),
                deprecated_comment: Input::default(),
                replaced_by: None,
                planned_removal: Input::default(),
                rationale: Input::default(),
                focus: DeprecateFocus::SpecVersion,
            }),
            AuthoringAction::Rename => AuthoringScreen::RenameForm(RenameFormState {
                token,
                classification: ClassificationDraft::new(),
                rationale: Input::default(),
                replaced_by_target: None,
                focus: RenameFocus::Classification,
            }),
            AuthoringAction::Rewire => AuthoringScreen::RewireForm(RewireFormState {
                token,
                new_ref: None,
                rationale: Input::default(),
                focus: RewireFocus::NewRef,
            }),
            AuthoringAction::Remove => AuthoringScreen::RemoveConfirm { token },
        }
    }

    // ── Remove confirm ────────────────────────────────────────────────────────

    fn handle_remove_confirm(
        &mut self,
        token: PickedToken,
        key: KeyEvent,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Cancel,
                )
            }
            KeyCode::Enter => match dataset_path {
                None => {
                    self.error =
                        Some("no dataset path — pass --dataset to enable writes".to_string());
                }
                Some(dp) => {
                    let exec = Box::new(LifecycleExecute::Remove(RemoveTokenInput {
                        uuid: token.uuid.clone(),
                        target: token.source_path.clone(),
                        tokens_root: dp.join("tokens"),
                    }));
                    let summary = format!("Remove token: {}", token.name);
                    return (
                        AuthoringScreen::Confirm {
                            summary,
                            execute: exec,
                        },
                        AuthoringEvent::Continue,
                    );
                }
            },
            _ => {}
        }
        (
            AuthoringScreen::RemoveConfirm { token },
            AuthoringEvent::Continue,
        )
    }

    // ── Confirm ───────────────────────────────────────────────────────────────

    fn handle_confirm(
        &mut self,
        summary: String,
        execute: Box<LifecycleExecute>,
        key: KeyEvent,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Enter => (
                AuthoringScreen::PickAction { selected: 0 },
                AuthoringEvent::Execute(execute),
            ),
            KeyCode::Esc => (
                AuthoringScreen::PickAction { selected: 0 },
                AuthoringEvent::Cancel,
            ),
            _ => (
                AuthoringScreen::Confirm { summary, execute },
                AuthoringEvent::Continue,
            ),
        }
    }

    // ── Build helpers ─────────────────────────────────────────────────────────

    pub(super) fn build_picker_rows(graph: &TokenGraph) -> Vec<PickerRow> {
        let mut rows: Vec<PickerRow> = graph
            .tokens
            .values()
            .filter_map(|r| {
                r.uuid.as_ref().map(|uuid| PickerRow {
                    uuid: uuid.clone(),
                    name: display_name(r),
                    layer: layer_label(r.layer).to_string(),
                    source_path: r.file.clone(),
                    raw: r.raw.clone(),
                })
            })
            .collect();
        rows.sort_by(|a, b| a.name.cmp(&b.name));
        rows
    }

    fn saved_form_to_screen(saved: SavedForm) -> AuthoringScreen {
        match saved {
            SavedForm::Deprecate(f) => AuthoringScreen::DeprecateForm(f),
            SavedForm::Rewire(f) => AuthoringScreen::RewireForm(f),
            SavedForm::Rename(f) => AuthoringScreen::RenameForm(f),
        }
    }

    /// The current screen label for the modal title breadcrumb.
    pub fn screen_label(&self) -> String {
        match &self.screen {
            AuthoringScreen::PickAction { .. } => "Authoring — Action".to_string(),
            AuthoringScreen::PickToken { action, .. } => {
                let op = action
                    .map(|a| match a {
                        AuthoringAction::Edit => "Edit",
                        AuthoringAction::Deprecate => "Deprecate",
                        AuthoringAction::Rename => "Rename",
                        AuthoringAction::Rewire => "Rewire",
                        AuthoringAction::Remove => "Remove",
                    })
                    .unwrap_or("Pick ref");
                format!("Authoring — {op}: pick token")
            }
            AuthoringScreen::EditForm(_) => "Authoring — Edit: fields".to_string(),
            AuthoringScreen::DeprecateForm(_) => "Authoring — Deprecate: details".to_string(),
            AuthoringScreen::RenameForm(_) => "Authoring — Rename: new name".to_string(),
            AuthoringScreen::RewireForm(_) => "Authoring — Rewire: new ref".to_string(),
            AuthoringScreen::RemoveConfirm { .. } => "Authoring — Remove: confirm".to_string(),
            AuthoringScreen::Confirm { .. } => "Authoring — Confirm".to_string(),
            AuthoringScreen::ModeSetMenu { .. } => "Authoring — Mode-sets".to_string(),
            AuthoringScreen::ModeSetPickFile { op, .. } => {
                let label = match op {
                    ModeSetOp::AddMode => "Add mode",
                    ModeSetOp::RenameMode => "Rename mode",
                    ModeSetOp::RemoveMode => "Remove mode",
                    ModeSetOp::RemoveModeSet => "Remove mode-set",
                    ModeSetOp::CreateModeSet => "Create mode-set",
                };
                format!("Authoring — {label}: pick file")
            }
            AuthoringScreen::ModeSetPickMode { op, .. } => {
                let label = match op {
                    ModeSetOp::RenameMode => "Rename mode",
                    ModeSetOp::RemoveMode => "Remove mode",
                    _ => "Pick mode",
                };
                format!("Authoring — {label}: pick mode")
            }
            AuthoringScreen::AddModeForm(_) => "Authoring — Add mode".to_string(),
            AuthoringScreen::RenameModeForm(_) => "Authoring — Rename mode".to_string(),
            AuthoringScreen::CreateModeSetForm(_) => "Authoring — Create mode-set".to_string(),
        }
    }
}
