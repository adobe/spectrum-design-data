// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Convert legacy Spectrum token files into a Figma Variables POST payload.
//!
//! Targets the `.Color theme` and `.Platform scale` collections, which use
//! `{camelCasePrefix}/{kebab-case-token-name}` naming — matching legacy token
//! names 1:1.
//!
//! Split into submodules by responsibility: [`routing`] decides which Figma
//! collection a token targets and resolves that collection against a real
//! Figma file; [`convert`] converts a single token into the variable/mode-value
//! actions that make up a payload; [`payload`] is the public entry point that
//! ties the two together.

mod convert;
mod payload;
mod routing;
#[cfg(test)]
mod tests;

pub(crate) use convert::figma_opacity_to_fraction;
pub use convert::load_all_tokens;
pub use payload::{
    build_export_payload, build_export_payload_with_platform_formats, summarize_variables,
    CollectionSummary, ExportSummary,
};
pub(crate) use routing::{FONT_STYLE, FONT_WEIGHT, OPACITY};
