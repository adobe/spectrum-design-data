// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Font helpers for PNG rendering. WebAssembly cannot read the disk, so the caller finds font
//! files itself; these functions let it identify a file from just its `name` table and pick
//! the right one, with the same rules and wording as the native CLI.

use design_data_core::raster::font::names_in_table;
use design_data_core::raster::font::resolve::{Resolver, TARGET_FAMILY};
use design_data_core::raster::font::{Flavor, Inspect};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::error::js_err;

/// What the caller learned about one font file.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Candidate {
    origin: String,
    #[serde(flatten)]
    info: Inspect,
}

fn to_js<T: Serialize>(v: &T) -> Result<JsValue, JsValue> {
    v.serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(js_err)
}

/// Identify a font file from its `name` table (the table's own bytes). `isCff` is whether the
/// file starts with `OTTO`, `isVariable` whether its table directory lists `fvar`.
/// Returns `{ flavor, family, subfamily, variable }`.
#[wasm_bindgen(js_name = "describeFont")]
pub fn describe_font(
    name_table: &[u8],
    is_cff: bool,
    is_variable: bool,
) -> Result<JsValue, JsValue> {
    let (family, subfamily) = names_in_table(name_table);
    to_js(&Inspect {
        flavor: if is_cff {
            Flavor::Cff
        } else {
            Flavor::TrueType
        },
        family,
        subfamily,
        variable: is_variable,
    })
}

/// Pick the text font from `candidates` (`[{ origin, flavor, family, subfamily, variable }]`,
/// each from `describeFont`). `fallbackName` names the font the caller will use when none
/// matches (for the message), or is omitted when there is none. Returns the status:
/// `{ target, found, using, fallback, rejected, related, searched, help }`.
#[wasm_bindgen(js_name = "chooseFont")]
pub fn choose_font(
    candidates: JsValue,
    target: Option<String>,
    fallback_name: Option<String>,
) -> Result<JsValue, JsValue> {
    let candidates: Vec<Candidate> = serde_wasm_bindgen::from_value(candidates).map_err(js_err)?;
    let mut resolver = Resolver::new(target.as_deref().unwrap_or(TARGET_FAMILY));
    for c in &candidates {
        resolver.offer_info(&c.origin, &c.info);
    }
    let fallback = fallback_name.map(|origin| design_data_core::raster::FontSource {
        data: vec![],
        origin,
    });
    to_js(&resolver.finish(fallback).status)
}
