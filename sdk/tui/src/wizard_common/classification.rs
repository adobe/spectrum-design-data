// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Screen 2 (Classification) data types and helpers shared between the
//! authoring wizard (`wizard.rs`) and the naming wizard (`naming.rs`).

use design_data_core::authoring::draft::{derive_token_key_from_parts, FieldDiagnostic};
use design_data_core::authoring::session::validate_classification;
use design_data_core::graph::Layer;
use design_data_core::query::TokenIndex;
use design_data_core::registry::{FieldCatalog, RegistryData};
use tui_input::Input;

use super::facet::{field_suggestions, FacetOption};

/// An additional name-object field (key + editable value).
pub struct NameField {
    pub key: String,
    pub value: Input,
    /// Registry-driven autocomplete options for this field's value.
    pub suggestions: Vec<FacetOption>,
}

impl NameField {
    pub fn new(key: &str) -> Self {
        Self {
            key: key.to_string(),
            value: Input::default(),
            suggestions: Vec::new(),
        }
    }
}

/// State for Screen 2 (Classification).
///
/// `focused_field` index: 0 = layer selector, 1 = property, 2..= name_fields[i-2].
pub struct ClassificationDraft {
    pub layer: Layer,
    pub property: Input,
    /// Autocomplete options for the `property` field.
    pub property_suggestions: Vec<FacetOption>,
    pub name_fields: Vec<NameField>,
    pub focused_field: usize,
    /// Advisory and strict diagnostics from catalog/registry validation.
    /// Advisory = warning (non-blocking); strict / unknown key = error.
    pub diagnostics: Vec<FieldDiagnostic>,
}

impl ClassificationDraft {
    pub fn new() -> Self {
        Self {
            layer: Layer::Foundation,
            property: Input::default(),
            property_suggestions: Vec::new(),
            name_fields: Vec::new(),
            focused_field: 0,
            diagnostics: Vec::new(),
        }
    }

    pub fn field_count(&self) -> usize {
        2 + self.name_fields.len() // layer + property + name_fields
    }

    /// Refresh autocomplete suggestions for the currently focused field and
    /// run catalog/registry validation over the current classification state.
    ///
    /// `schema_url` is forwarded to `validate_classification` for SPEC-042
    /// domain-scope checks; pass `None` if not yet set.
    pub fn refresh(&mut self, index: &TokenIndex, schema_url: Option<&str>) {
        // — Suggestions for the focused field —
        match self.focused_field {
            0 => {} // layer selector — no text completion
            1 => {
                let typed = self.property.value().trim().to_lowercase();
                self.property_suggestions = field_suggestions("property", &typed, index, None);
            }
            n => {
                let i = n - 2;
                if let Some(nf) = self.name_fields.get_mut(i) {
                    let typed = nf.value.value().trim().to_lowercase();
                    let key = nf.key.clone();
                    nf.suggestions = field_suggestions(&key, &typed, index, None);
                }
            }
        }

        // — Validation diagnostics —
        let property = self.property.value().trim();
        let name_fields: Vec<(String, String)> = self
            .name_fields
            .iter()
            .map(|f| (f.key.clone(), f.value.value().trim().to_string()))
            .collect();

        self.diagnostics = match validate_classification(
            property,
            &name_fields,
            schema_url,
            FieldCatalog::embedded(),
            RegistryData::embedded(),
        ) {
            Ok(diags) => diags,
            // Strict violations come back as Err — surface as a single error diagnostic.
            Err(msg) => vec![design_data_core::authoring::draft::FieldDiagnostic {
                field: property.to_string(),
                severity: design_data_core::report::Severity::Error,
                message: msg,
            }],
        };
    }

    /// Whether any diagnostic has Error severity (blocks advancing to Screen 3).
    pub fn has_errors(&self) -> bool {
        self.diagnostics
            .iter()
            .any(|d| matches!(d.severity, design_data_core::report::Severity::Error))
    }

    /// Suggestions for the focused field (property or the active name_field).
    pub fn focused_suggestions(&self) -> &[FacetOption] {
        match self.focused_field {
            1 => &self.property_suggestions,
            n if n >= 2 => {
                let i = n - 2;
                self.name_fields
                    .get(i)
                    .map(|f| f.suggestions.as_slice())
                    .unwrap_or(&[])
            }
            _ => &[],
        }
    }
}

impl Default for ClassificationDraft {
    fn default() -> Self {
        Self::new()
    }
}

impl ClassificationDraft {
    /// Handle a raw keypress on the classification screen, mirroring the logic in
    /// `wizard.rs::handle_classification_key`.  Does **not** call `refresh`; the
    /// caller is responsible for refreshing suggestions/diagnostics after the key
    /// is processed.
    ///
    /// Returns `true` if the key was consumed (caller should not advance the
    /// screen); `false` if the key was `Enter` (caller should advance).
    pub fn handle_key_event(&mut self, key: crossterm::event::KeyEvent) -> bool {
        use crossterm::event::KeyCode;
        use tui_input::backend::crossterm::EventHandler as _;
        match key.code {
            KeyCode::Enter => return false,
            KeyCode::Tab => {
                let count = self.field_count();
                self.focused_field = (self.focused_field + 1) % count;
            }
            KeyCode::BackTab => {
                let count = self.field_count();
                self.focused_field = if self.focused_field == 0 {
                    count - 1
                } else {
                    self.focused_field - 1
                };
            }
            KeyCode::Left | KeyCode::Char('h') if self.focused_field == 0 => {
                self.layer = crate::wizard_common::classification::cycle_layer_backward(self.layer);
            }
            KeyCode::Right | KeyCode::Char('l') if self.focused_field == 0 => {
                self.layer = crate::wizard_common::classification::cycle_layer_forward(self.layer);
            }
            KeyCode::Char('+') => {
                self.name_fields.push(NameField::new("key"));
            }
            _ => {
                let focused = self.focused_field;
                if focused == 1 {
                    self.property
                        .handle_event(&crossterm::event::Event::Key(key));
                } else if focused >= 2 {
                    let idx = focused - 2;
                    if let Some(field) = self.name_fields.get_mut(idx) {
                        field.value.handle_event(&crossterm::event::Event::Key(key));
                    }
                }
            }
        }
        true
    }
}

/// Assemble a token name from classification fields (property + name fields).
/// Shared by the authoring and naming wizards.
///
/// Returns `""` when no fields are filled in — the TUI uses this to gate
/// [`WizardState::build_write_input`] (which rejects on empty key) and to show a
/// blank name preview rather than the `"unnamed-token"` sentinel that the MCP
/// session uses.  The shared join rule lives in
/// [`design_data_core::authoring::draft::derive_token_key_from_parts`].
pub fn assemble_name_from_classification(classification: &ClassificationDraft) -> String {
    derive_token_key_from_parts(
        classification.property.value().trim(),
        classification
            .name_fields
            .iter()
            .map(|f| f.value.value().trim()),
    )
    .unwrap_or_default()
}

pub fn cycle_layer_forward(layer: Layer) -> Layer {
    match layer {
        Layer::Foundation => Layer::Platform,
        Layer::Platform => Layer::Product,
        Layer::Product => Layer::Foundation,
    }
}

pub fn cycle_layer_backward(layer: Layer) -> Layer {
    match layer {
        Layer::Foundation => Layer::Product,
        Layer::Platform => Layer::Foundation,
        Layer::Product => Layer::Platform,
    }
}
