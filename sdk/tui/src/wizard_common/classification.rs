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

use design_data_core::graph::Layer;
use tui_input::Input;

/// An additional name-object field (key + editable value).
pub struct NameField {
    pub key: String,
    pub value: Input,
}

/// State for Screen 2 (Classification).
///
/// `focused_field` index: 0 = layer selector, 1 = property, 2..= name_fields[i-2].
pub struct ClassificationDraft {
    pub layer: Layer,
    pub property: Input,
    pub name_fields: Vec<NameField>,
    pub focused_field: usize,
}

impl ClassificationDraft {
    pub fn new() -> Self {
        Self {
            layer: Layer::Foundation,
            property: Input::default(),
            name_fields: Vec::new(),
            focused_field: 0,
        }
    }

    pub fn field_count(&self) -> usize {
        2 + self.name_fields.len() // layer + property + name_fields
    }
}

impl Default for ClassificationDraft {
    fn default() -> Self {
        Self::new()
    }
}

/// Assemble a token name from classification fields (property + name fields).
/// Shared by the authoring and naming wizards.
pub fn assemble_name_from_classification(classification: &ClassificationDraft) -> String {
    let mut parts: Vec<String> = Vec::new();
    let prop = classification.property.value().trim().to_string();
    if !prop.is_empty() {
        parts.push(prop);
    }
    for field in &classification.name_fields {
        let v = field.value.value().trim().to_string();
        if !v.is_empty() {
            parts.push(v);
        }
    }
    parts.join("-")
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
