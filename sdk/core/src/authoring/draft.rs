// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Serializable wizard draft DTOs — shared between the TUI wizard and the
//! MCP authoring-session state machine.
//!
//! These types own their data (no `tui_input::Input`, no rendering state) so
//! they can live in core without pulling in any TUI-specific dependencies.
//! `tui_input::Input` collapses to `String` on the boundary.

use serde::{Deserialize, Serialize};

use crate::graph::Layer;

// ── Screen and path enums ─────────────────────────────────────────────────────

/// The four screens of the token authoring wizard (RFC #973 §3.10–§3.15).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WizardScreen {
    Intent,
    Classification,
    Values,
    Confirm,
}

impl WizardScreen {
    pub fn number(self) -> u8 {
        match self {
            WizardScreen::Intent => 1,
            WizardScreen::Classification => 2,
            WizardScreen::Values => 3,
            WizardScreen::Confirm => 4,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            WizardScreen::Intent => "Intent",
            WizardScreen::Classification => "Classification",
            WizardScreen::Values => "Values",
            WizardScreen::Confirm => "Confirm",
        }
    }
}

/// Whether the user is creating a new token or aliasing an existing one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WizardPath {
    CreateNew,
    AliasToExisting(String),
}

/// Whether a value row holds an alias or a literal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValueKind {
    Alias,
    Literal,
}

// ── DTOs (serializable mirror of TUI wizard state) ────────────────────────────

/// Serializable snapshot of the full wizard state.
///
/// `tui_input::Input` fields are collapsed to `String`; rehydrate via
/// `Input::from(s)` on the TUI side. Transient fields
/// (`suggestions`, `diff_preview`, `diff_scroll`, `error`,
/// `editing_schema_url`, `ValuesDraft.editing`) are intentionally omitted.
///
/// **Schema compatibility note:** Add new optional fields with `#[serde(default)]`
/// so old drafts remain loadable after field additions.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WizardDraft {
    pub screen: WizardScreen,
    pub intent: String,
    pub selected_suggestion: usize,
    pub chosen_path: WizardPath,
    pub classification: ClassificationDraftDto,
    pub values: ValuesDraftDto,
    pub rationale: String,
    pub schema_url: Option<String>,
    pub schema_url_input: String,
}

impl WizardDraft {
    /// Fresh draft with all fields at their default starting values.
    pub fn new() -> Self {
        Self {
            screen: WizardScreen::Intent,
            intent: String::new(),
            selected_suggestion: 0,
            chosen_path: WizardPath::CreateNew,
            classification: ClassificationDraftDto {
                layer: Layer::Foundation,
                property: String::new(),
                name_fields: Vec::new(),
                focused_field: 0,
            },
            values: ValuesDraftDto {
                rows: Vec::new(),
                selected: 0,
            },
            rationale: String::new(),
            schema_url: None,
            schema_url_input: String::new(),
        }
    }
}

impl Default for WizardDraft {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClassificationDraftDto {
    pub layer: Layer,
    pub property: String,
    pub name_fields: Vec<NameFieldDto>,
    /// TUI-only cursor position; not meaningful for MCP sessions.
    #[serde(skip)]
    pub focused_field: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NameFieldDto {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValuesDraftDto {
    pub rows: Vec<ValueRowDto>,
    /// TUI-only cursor position; not meaningful for MCP sessions.
    #[serde(skip)]
    pub selected: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueRowDto {
    pub mode_combo: Vec<(String, String)>,
    pub kind: ValueKind,
    pub alias_target: String,
    pub literal: String,
}
