// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token authoring action-picker modal state machine (Phase B / si6.2).
//!
//! `AuthoringMenuState` drives the lifecycle op flow:
//!   PickAction → PickToken → Form → Confirm
//!
//! For `replaced_by` (deprecate), `new_ref` (rewire), or `replaced_by_target`
//! (rename), a second PickToken screen is pushed mid-form; the interrupted form
//! is stashed in `saved_form` and restored after the sub-pick.
//!
//! The modal never touches the filesystem.  `AuthoringEvent::Execute(op)` is
//! returned on confirm; the `update` handler converts it to a `Task::cmd`.

use std::path::{Path, PathBuf};

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::authoring::lifecycle::{
    DeprecateTokenInput, EditTokenInput, RemoveTokenInput, RenameTokenInput, RewireAliasInput,
};
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph};
use ratatui::widgets::TableState;
use serde_json::{Map, Value};
use tui_input::{backend::crossterm::EventHandler, Input};

use crate::wizard_common::classification::ClassificationDraft;

// ── Constants ──────────────────────────────────────────────────────────────────

/// Action menu entries: (label, enabled).  Disabled entries are shown dimmed.
pub const ACTIONS: &[(&str, bool)] = &[
    ("Create", true),
    ("Edit", true),
    ("Deprecate", true),
    ("Rename", true),
    ("Rewire alias", true),
    ("Remove", true),
    ("Mode-sets\u{2026} (si6.3)", false), // coming next phase
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

    fn move_sel(&mut self, delta: i32) {
        let n = self.filtered.len();
        if n == 0 {
            return;
        }
        let cur = self.table_state.selected().unwrap_or(0) as i32;
        let next = (cur + delta).clamp(0, n as i32 - 1) as usize;
        self.table_state.select(Some(next));
    }
}

// ── Edit form ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditFocus {
    Fields,
    Rationale,
}

pub struct EditFieldRow {
    pub key: String,
    pub key_input: Input, // used when `editing_key` is true (new rows)
    pub value: Input,
    pub editing_key: bool,
}

pub struct EditFormState {
    pub token: PickedToken,
    pub fields: Vec<EditFieldRow>,
    pub selected_idx: usize,
    pub editing: bool,
    pub rationale: Input,
    pub focus: EditFocus,
}

impl EditFormState {
    pub fn from_token(token: PickedToken) -> Self {
        let mut fields = Vec::new();
        let mut rationale_str = String::new();
        if let Value::Object(ref obj) = token.raw {
            for (k, v) in obj {
                if k == "uuid" {
                    continue;
                }
                if k == "rationale" {
                    rationale_str = v.as_str().unwrap_or("").to_string();
                    continue;
                }
                let v_str = if v.is_string() {
                    v.as_str().unwrap_or("").to_string()
                } else {
                    v.to_string()
                };
                fields.push(EditFieldRow {
                    key: k.clone(),
                    key_input: Input::default(),
                    value: Input::from(v_str),
                    editing_key: false,
                });
            }
        }
        Self {
            token,
            fields,
            selected_idx: 0,
            editing: false,
            rationale: Input::from(rationale_str),
            focus: EditFocus::Fields,
        }
    }
}

// ── Deprecate form ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeprecateFocus {
    SpecVersion,
    Comment,
    ReplacedBy,
    PlannedRemoval,
    Rationale,
}

impl DeprecateFocus {
    fn next(self) -> Self {
        match self {
            Self::SpecVersion => Self::Comment,
            Self::Comment => Self::ReplacedBy,
            Self::ReplacedBy => Self::PlannedRemoval,
            Self::PlannedRemoval => Self::Rationale,
            Self::Rationale => Self::Rationale,
        }
    }
    fn prev(self) -> Self {
        match self {
            Self::SpecVersion => Self::SpecVersion,
            Self::Comment => Self::SpecVersion,
            Self::ReplacedBy => Self::Comment,
            Self::PlannedRemoval => Self::ReplacedBy,
            Self::Rationale => Self::PlannedRemoval,
        }
    }
}

pub struct DeprecateFormState {
    pub token: PickedToken,
    pub spec_version: Input,
    pub deprecated_comment: Input,
    pub replaced_by: Option<PickedToken>,
    pub planned_removal: Input,
    pub rationale: Input,
    pub focus: DeprecateFocus,
}

// ── Rename form ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RenameFocus {
    Classification,
    Rationale,
    ReplacedByTarget,
}

pub struct RenameFormState {
    pub token: PickedToken,
    pub classification: ClassificationDraft,
    pub rationale: Input,
    pub replaced_by_target: Option<PickedToken>,
    pub focus: RenameFocus,
}

// ── Rewire form ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RewireFocus {
    NewRef,
    Rationale,
}

pub struct RewireFormState {
    pub token: PickedToken,
    pub new_ref: Option<PickedToken>,
    pub rationale: Input,
    pub focus: RewireFocus,
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
enum SavedForm {
    Deprecate(DeprecateFormState),
    Rewire(RewireFormState),
    Rename(RenameFormState),
}

/// The owned op input returned to the update handler.
pub enum LifecycleExecute {
    Edit(EditTokenInput),
    Deprecate(DeprecateTokenInput),
    Rename(RenameTokenInput),
    Rewire(RewireAliasInput),
    Remove(RemoveTokenInput),
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
    saved_form: Option<SavedForm>,
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
    ) -> AuthoringEvent {
        self.error = None;
        let screen = std::mem::replace(
            &mut self.screen,
            AuthoringScreen::PickAction { selected: 0 },
        );
        let (new_screen, event) = self.dispatch(screen, key, graph, dataset_path);
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
    ) -> (AuthoringScreen, AuthoringEvent) {
        match screen {
            AuthoringScreen::PickAction { selected } => {
                self.handle_pick_action(selected, key, graph)
            }
            AuthoringScreen::PickToken {
                picker,
                action,
                sub_kind,
            } => self.handle_pick_token(picker, action, sub_kind, key, graph, dataset_path),
            AuthoringScreen::EditForm(f) => self.handle_edit_form(f, key, graph, dataset_path),
            AuthoringScreen::DeprecateForm(f) => self.handle_deprecate_form(f, key, graph),
            AuthoringScreen::RenameForm(f) => self.handle_rename_form(f, key, graph),
            AuthoringScreen::RewireForm(f) => self.handle_rewire_form(f, key, graph, dataset_path),
            AuthoringScreen::RemoveConfirm { token } => {
                self.handle_remove_confirm(token, key, dataset_path)
            }
            AuthoringScreen::Confirm { summary, execute } => {
                self.handle_confirm(summary, execute, key)
            }
        }
    }

    // ── PickAction ────────────────────────────────────────────────────────────

    fn handle_pick_action(
        &mut self,
        mut sel: usize,
        key: KeyEvent,
        graph: &TokenGraph,
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
                if sel > 0 {
                    sel -= 1;
                }
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
                // Sub-pick cancelled: restore the saved form.
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
                            }
                        }
                        Some(SubPickKind::RewireNewRef) => {
                            if let Some(SavedForm::Rewire(mut f)) = self.saved_form.take() {
                                f.new_ref = Some(picked);
                                return (AuthoringScreen::RewireForm(f), AuthoringEvent::Continue);
                            }
                        }
                        Some(SubPickKind::RenameReplacedByTarget) => {
                            if let Some(SavedForm::Rename(mut f)) = self.saved_form.take() {
                                f.replaced_by_target = Some(picked);
                                return (AuthoringScreen::RenameForm(f), AuthoringEvent::Continue);
                            }
                        }
                        None => {
                            let screen =
                                self.build_form_for_action(action.unwrap(), picked, dataset_path);
                            return (screen, AuthoringEvent::Continue);
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

    // ── Edit form ─────────────────────────────────────────────────────────────

    fn handle_edit_form(
        &mut self,
        mut f: EditFormState,
        key: KeyEvent,
        _graph: &TokenGraph,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        match f.focus {
            EditFocus::Fields => {
                if f.editing {
                    match key.code {
                        KeyCode::Esc => {
                            f.editing = false;
                            if f.fields[f.selected_idx].editing_key {
                                // Commit the key.
                                let new_key = f.fields[f.selected_idx]
                                    .key_input
                                    .value()
                                    .trim()
                                    .to_string();
                                if !new_key.is_empty() {
                                    f.fields[f.selected_idx].key = new_key;
                                }
                                f.fields[f.selected_idx].editing_key = false;
                            }
                        }
                        KeyCode::Tab | KeyCode::Enter if f.fields[f.selected_idx].editing_key => {
                            // Move from editing key → editing value.
                            let new_key = f.fields[f.selected_idx]
                                .key_input
                                .value()
                                .trim()
                                .to_string();
                            if !new_key.is_empty() {
                                f.fields[f.selected_idx].key = new_key;
                            }
                            f.fields[f.selected_idx].editing_key = false;
                        }
                        _ => {
                            let row = &mut f.fields[f.selected_idx];
                            if row.editing_key {
                                row.key_input
                                    .handle_event(&crossterm::event::Event::Key(key));
                            } else {
                                row.value.handle_event(&crossterm::event::Event::Key(key));
                            }
                        }
                    }
                } else {
                    match key.code {
                        KeyCode::Esc => {
                            return (
                                AuthoringScreen::PickAction { selected: 0 },
                                AuthoringEvent::Cancel,
                            )
                        }
                        KeyCode::Up | KeyCode::Char('k') => {
                            if f.selected_idx > 0 {
                                f.selected_idx -= 1;
                            }
                        }
                        KeyCode::Down | KeyCode::Char('j') => {
                            if f.selected_idx + 1 < f.fields.len() {
                                f.selected_idx += 1;
                            }
                        }
                        KeyCode::Enter => {
                            if !f.fields.is_empty() {
                                f.editing = true;
                            }
                        }
                        KeyCode::Tab => {
                            f.focus = EditFocus::Rationale;
                        }
                        KeyCode::Char('+') => {
                            f.fields.push(EditFieldRow {
                                key: "new_key".to_string(),
                                key_input: Input::default(),
                                value: Input::default(),
                                editing_key: true,
                            });
                            f.selected_idx = f.fields.len() - 1;
                            f.editing = true;
                        }
                        KeyCode::Char('d') if ctrl => {
                            if !f.fields.is_empty() {
                                f.fields.remove(f.selected_idx);
                                if f.selected_idx >= f.fields.len() && f.selected_idx > 0 {
                                    f.selected_idx -= 1;
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            EditFocus::Rationale => match key.code {
                KeyCode::Esc => {
                    return (
                        AuthoringScreen::PickAction { selected: 0 },
                        AuthoringEvent::Cancel,
                    )
                }
                KeyCode::BackTab => {
                    f.focus = EditFocus::Fields;
                }
                KeyCode::Enter => match self.build_edit_execute(&f, dataset_path) {
                    Ok(exec) => {
                        let summary = format!("Edit token: {}", f.token.name);
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
                    f.rationale.handle_event(&crossterm::event::Event::Key(key));
                }
            },
        }
        (AuthoringScreen::EditForm(f), AuthoringEvent::Continue)
    }

    // ── Deprecate form ────────────────────────────────────────────────────────

    fn handle_deprecate_form(
        &mut self,
        mut f: DeprecateFormState,
        key: KeyEvent,
        graph: &TokenGraph,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Cancel,
                )
            }
            KeyCode::Tab => {
                f.focus = f.focus.next();
            }
            KeyCode::BackTab => {
                f.focus = f.focus.prev();
            }
            KeyCode::Enter if f.focus == DeprecateFocus::ReplacedBy => {
                // Enter sub-pick for replaced_by.
                let picker = TokenPickerState::new(Self::build_picker_rows(graph));
                self.saved_form = Some(SavedForm::Deprecate(f));
                return (
                    AuthoringScreen::PickToken {
                        picker,
                        action: None,
                        sub_kind: Some(SubPickKind::DeprecateReplacedBy),
                    },
                    AuthoringEvent::Continue,
                );
            }
            KeyCode::Enter if f.focus == DeprecateFocus::Rationale => {
                match self.build_deprecate_execute(&f) {
                    Ok(exec) => {
                        let summary = format!("Deprecate token: {}", f.token.name);
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
            KeyCode::Char('c')
                if key.modifiers.contains(KeyModifiers::CONTROL)
                    && f.focus == DeprecateFocus::ReplacedBy =>
            {
                f.replaced_by = None;
            }
            _ => {
                match f.focus {
                    DeprecateFocus::SpecVersion => {
                        f.spec_version
                            .handle_event(&crossterm::event::Event::Key(key));
                    }
                    DeprecateFocus::Comment => {
                        f.deprecated_comment
                            .handle_event(&crossterm::event::Event::Key(key));
                    }
                    DeprecateFocus::ReplacedBy => {} // only Enter opens picker
                    DeprecateFocus::PlannedRemoval => {
                        f.planned_removal
                            .handle_event(&crossterm::event::Event::Key(key));
                    }
                    DeprecateFocus::Rationale => {
                        f.rationale.handle_event(&crossterm::event::Event::Key(key));
                    }
                }
            }
        }
        (AuthoringScreen::DeprecateForm(f), AuthoringEvent::Continue)
    }

    // ── Rename form ───────────────────────────────────────────────────────────

    fn handle_rename_form(
        &mut self,
        mut f: RenameFormState,
        key: KeyEvent,
        graph: &TokenGraph,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Cancel,
                )
            }
            KeyCode::Tab => {
                f.focus = match f.focus {
                    RenameFocus::Classification => RenameFocus::Rationale,
                    RenameFocus::Rationale => RenameFocus::ReplacedByTarget,
                    RenameFocus::ReplacedByTarget => RenameFocus::Classification,
                };
            }
            KeyCode::BackTab => {
                f.focus = match f.focus {
                    RenameFocus::Classification => RenameFocus::ReplacedByTarget,
                    RenameFocus::Rationale => RenameFocus::Classification,
                    RenameFocus::ReplacedByTarget => RenameFocus::Rationale,
                };
            }
            KeyCode::Enter if f.focus == RenameFocus::ReplacedByTarget => {
                let picker = TokenPickerState::new(Self::build_picker_rows(graph));
                self.saved_form = Some(SavedForm::Rename(f));
                return (
                    AuthoringScreen::PickToken {
                        picker,
                        action: None,
                        sub_kind: Some(SubPickKind::RenameReplacedByTarget),
                    },
                    AuthoringEvent::Continue,
                );
            }
            KeyCode::Enter if f.focus == RenameFocus::Rationale => {
                match self.build_rename_execute(&f) {
                    Ok(exec) => {
                        let summary = format!("Rename token: {}", f.token.name);
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
            _ => match f.focus {
                RenameFocus::Classification => {
                    f.classification.handle_key_event(key);
                    let index = design_data_core::query::TokenIndex::build(graph);
                    f.classification.refresh(&index, None);
                }
                RenameFocus::Rationale => {
                    f.rationale.handle_event(&crossterm::event::Event::Key(key));
                }
                RenameFocus::ReplacedByTarget => {}
            },
        }
        (AuthoringScreen::RenameForm(f), AuthoringEvent::Continue)
    }

    // ── Rewire form ───────────────────────────────────────────────────────────

    fn handle_rewire_form(
        &mut self,
        mut f: RewireFormState,
        key: KeyEvent,
        graph: &TokenGraph,
        dataset_path: Option<&Path>,
    ) -> (AuthoringScreen, AuthoringEvent) {
        match key.code {
            KeyCode::Esc => {
                return (
                    AuthoringScreen::PickAction { selected: 0 },
                    AuthoringEvent::Cancel,
                )
            }
            KeyCode::Tab => {
                f.focus = match f.focus {
                    RewireFocus::NewRef => RewireFocus::Rationale,
                    RewireFocus::Rationale => RewireFocus::NewRef,
                };
            }
            KeyCode::BackTab => {
                f.focus = match f.focus {
                    RewireFocus::NewRef => RewireFocus::Rationale,
                    RewireFocus::Rationale => RewireFocus::NewRef,
                };
            }
            KeyCode::Enter if f.focus == RewireFocus::NewRef => {
                let picker = TokenPickerState::new(Self::build_picker_rows(graph));
                self.saved_form = Some(SavedForm::Rewire(f));
                return (
                    AuthoringScreen::PickToken {
                        picker,
                        action: None,
                        sub_kind: Some(SubPickKind::RewireNewRef),
                    },
                    AuthoringEvent::Continue,
                );
            }
            KeyCode::Enter if f.focus == RewireFocus::Rationale => {
                match self.build_rewire_execute(&f, dataset_path) {
                    Ok(exec) => {
                        let summary = format!("Rewire alias: {}", f.token.name);
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
            _ => {
                if f.focus == RewireFocus::Rationale {
                    f.rationale.handle_event(&crossterm::event::Event::Key(key));
                }
            }
        }
        (AuthoringScreen::RewireForm(f), AuthoringEvent::Continue)
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

    fn build_picker_rows(graph: &TokenGraph) -> Vec<PickerRow> {
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

    fn build_edit_execute(
        &self,
        f: &EditFormState,
        dataset_path: Option<&Path>,
    ) -> Result<Box<LifecycleExecute>, String> {
        let mut updates = Map::new();
        for row in &f.fields {
            let v: Value = serde_json::from_str(row.value.value().trim())
                .unwrap_or_else(|_| Value::String(row.value.value().trim().to_string()));
            updates.insert(row.key.clone(), v);
        }
        let tokens_root = if updates.contains_key("$ref") {
            Some(
                dataset_path
                    .ok_or("tokens_root required for $ref update — pass --dataset")?
                    .join("tokens"),
            )
        } else {
            None
        };
        Ok(Box::new(LifecycleExecute::Edit(EditTokenInput {
            uuid: f.token.uuid.clone(),
            target: f.token.source_path.clone(),
            updates,
            rationale: Some(f.rationale.value().trim().to_string()).filter(|s| !s.is_empty()),
            tokens_root,
        })))
    }

    fn build_deprecate_execute(
        &self,
        f: &DeprecateFormState,
    ) -> Result<Box<LifecycleExecute>, String> {
        let spec_version = f.spec_version.value().trim();
        if spec_version.is_empty() {
            return Err("spec_version is required for deprecate".to_string());
        }
        Ok(Box::new(LifecycleExecute::Deprecate(DeprecateTokenInput {
            uuid: f.token.uuid.clone(),
            target: f.token.source_path.clone(),
            spec_version: spec_version.to_string(),
            deprecated_comment: Some(f.deprecated_comment.value().trim().to_string())
                .filter(|s| !s.is_empty()),
            replaced_by: f
                .replaced_by
                .as_ref()
                .map(|t| Value::String(t.uuid.clone())),
            planned_removal: Some(f.planned_removal.value().trim().to_string())
                .filter(|s| !s.is_empty()),
            rationale: Some(f.rationale.value().trim().to_string()).filter(|s| !s.is_empty()),
        })))
    }

    fn build_rename_execute(&self, f: &RenameFormState) -> Result<Box<LifecycleExecute>, String> {
        let new_name = Self::classification_to_name_value(&f.classification);
        if !new_name.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
            return Err("new name fields are required for rename".to_string());
        }
        Ok(Box::new(LifecycleExecute::Rename(RenameTokenInput {
            uuid: f.token.uuid.clone(),
            target: f.token.source_path.clone(),
            new_name,
            replaced_by_target: f.replaced_by_target.as_ref().map(|t| t.uuid.clone()),
            rationale: Some(f.rationale.value().trim().to_string()).filter(|s| !s.is_empty()),
        })))
    }

    fn build_rewire_execute(
        &self,
        f: &RewireFormState,
        dataset_path: Option<&Path>,
    ) -> Result<Box<LifecycleExecute>, String> {
        let new_ref_token = f
            .new_ref
            .as_ref()
            .ok_or("new_ref is required — pick a target token")?;
        // tokens_root: prefer dataset_path/tokens (authoritative); fall back to
        // the parent of the source file (works when the token is directly in tokens/).
        let tokens_root = dataset_path
            .map(|p| p.join("tokens"))
            .or_else(|| f.token.source_path.parent().map(|p| p.to_path_buf()))
            .ok_or("tokens_root required for rewire — pass --dataset")?;
        Ok(Box::new(LifecycleExecute::Rewire(RewireAliasInput {
            uuid: f.token.uuid.clone(),
            target: f.token.source_path.clone(),
            new_ref: new_ref_token.uuid.clone(),
            tokens_root,
            rationale: Some(f.rationale.value().trim().to_string()).filter(|s| !s.is_empty()),
        })))
    }

    fn classification_to_name_value(draft: &ClassificationDraft) -> Value {
        let mut obj = serde_json::Map::new();
        let property = draft.property.value().trim();
        if !property.is_empty() {
            obj.insert("property".to_string(), Value::String(property.to_string()));
        }
        for field in &draft.name_fields {
            let val = field.value.value().trim();
            if !val.is_empty() {
                obj.insert(field.key.clone(), Value::String(val.to_string()));
            }
        }
        Value::Object(obj)
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
        }
    }
}
