// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! WebAssembly bindings for `design-data-core`.
//!
//! Exposes query, validate, resolve, diff, and registry helpers to JavaScript/TypeScript
//! via `wasm-bindgen`. TypeScript types are generated from the Rust types via `tsify-next`,
//! so the published `.d.ts` is derived directly from the Rust structs — no hand-maintained
//! parallel type surface.
//!
//! # Data loading
//!
//! Use [`Dataset::embedded()`] for the canonical embedded Spectrum dataset (self-contained,
//! no external data needed). Use [`Dataset::from_tokens()`] to query arbitrary token data
//! passed in as a JS array.

use wasm_bindgen::prelude::*;

mod dataset;
mod error;
mod registry;
mod types;

pub use dataset::Dataset;
pub use registry::{find_value, get_active_values, get_default, get_values, has_value};

/// Initialise the panic hook so that Rust panics are forwarded to the browser console.
///
/// Call this once when the wasm module loads. Idempotent.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}
