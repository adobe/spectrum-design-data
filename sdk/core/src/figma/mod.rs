// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Figma Variables REST API integration — read existing variables and export
//! cascade tokens as Figma Variables.

pub mod api;
pub mod color;
pub mod mapping;
pub mod types;

/// Errors specific to Figma API integration.
#[derive(Debug, thiserror::Error)]
pub enum FigmaError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Figma API error (status {status}): {message}")]
    Api { status: u16, message: String },
    #[error("unsupported color format: {0}")]
    UnsupportedColorFormat(String),
}
