// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Form state types and handlers for token lifecycle edit / deprecate / rename / rewire.

use std::path::Path;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::authoring::lifecycle::{
    DeprecateTokenInput, EditTokenInput, RenameTokenInput, RewireAliasInput,
};
use serde_json::{Map, Value};
use tui_input::{backend::crossterm::EventHandler, Input};

use crate::wizard_common::classification::ClassificationDraft;

use super::{
    AuthoringEvent, AuthoringMenuState, AuthoringScreen, LifecycleExecute, PickedToken, SavedForm,
    SubPickKind, TokenPickerState,
};

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
    pub fn next(self) -> Self {
        match self {
            Self::SpecVersion => Self::Comment,
            Self::Comment => Self::ReplacedBy,
            Self::ReplacedBy => Self::PlannedRemoval,
            Self::PlannedRemoval => Self::Rationale,
            Self::Rationale => Self::Rationale,
        }
    }
    pub fn prev(self) -> Self {
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

// ── Form handlers on AuthoringMenuState ───────────────────────────────────────

impl AuthoringMenuState {
    pub(super) fn handle_edit_form(
        &mut self,
        mut f: EditFormState,
        key: KeyEvent,
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

    pub(super) fn handle_deprecate_form(
        &mut self,
        mut f: DeprecateFormState,
        key: KeyEvent,
        graph: &design_data_core::graph::TokenGraph,
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
            _ => match f.focus {
                DeprecateFocus::SpecVersion => {
                    f.spec_version
                        .handle_event(&crossterm::event::Event::Key(key));
                }
                DeprecateFocus::Comment => {
                    f.deprecated_comment
                        .handle_event(&crossterm::event::Event::Key(key));
                }
                DeprecateFocus::ReplacedBy => {}
                DeprecateFocus::PlannedRemoval => {
                    f.planned_removal
                        .handle_event(&crossterm::event::Event::Key(key));
                }
                DeprecateFocus::Rationale => {
                    f.rationale.handle_event(&crossterm::event::Event::Key(key));
                }
            },
        }
        (AuthoringScreen::DeprecateForm(f), AuthoringEvent::Continue)
    }

    pub(super) fn handle_rename_form(
        &mut self,
        mut f: RenameFormState,
        key: KeyEvent,
        graph: &design_data_core::graph::TokenGraph,
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

    pub(super) fn handle_rewire_form(
        &mut self,
        mut f: RewireFormState,
        key: KeyEvent,
        graph: &design_data_core::graph::TokenGraph,
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

    // ── Build helpers ─────────────────────────────────────────────────────────

    pub(super) fn build_edit_execute(
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

    pub(super) fn build_deprecate_execute(
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

    pub(super) fn build_rename_execute(
        &self,
        f: &RenameFormState,
    ) -> Result<Box<LifecycleExecute>, String> {
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

    pub(super) fn build_rewire_execute(
        &self,
        f: &RewireFormState,
        dataset_path: Option<&Path>,
    ) -> Result<Box<LifecycleExecute>, String> {
        let new_ref_token = f
            .new_ref
            .as_ref()
            .ok_or("new_ref is required — pick a target token")?;
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

    pub(super) fn classification_to_name_value(draft: &ClassificationDraft) -> Value {
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
}
