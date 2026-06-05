// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use design_data_core::CoreError;
use js_sys::Error;
use wasm_bindgen::JsValue;

/// Convert a [`CoreError`] into a JS `Error` object.
pub(crate) fn to_js_error(e: CoreError) -> JsValue {
    Error::new(&e.to_string()).into()
}

/// Convert any `Display`-able value into a JS `Error` object.
pub(crate) fn js_err(msg: impl std::fmt::Display) -> JsValue {
    Error::new(&msg.to_string()).into()
}
