// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Slim solve-only engine: `design_data_core::visual::solve` over one precompiled variant, with
//! no token graph or dataset. All layout lives in core; this crate only parses and serializes.

use design_data_core::visual::{scene_to_svg, solve, CompiledVariant, RenderRequest, Scene};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine(CompiledVariant);

#[wasm_bindgen]
impl Engine {
    /// `variant_json` is one variant: `{ root, optionDefaults, parts, drawings }`
    /// (`CompiledVariant::to_value`).
    #[wasm_bindgen(constructor)]
    pub fn new(variant_json: &str) -> Result<Engine, JsError> {
        let v = serde_json::from_str(variant_json)?;
        Ok(Engine(CompiledVariant::from_value(&v).map_err(js)?))
    }

    /// One variant out of a whole compiled component (`data.json` `compiled[name]`), by its
    /// `size|colorScheme|scale` key.
    #[wasm_bindgen(js_name = "fromCompiled")]
    pub fn from_compiled(compiled_json: &str, key: &str) -> Result<Engine, JsError> {
        let v = serde_json::from_str(compiled_json)?;
        Ok(Engine(CompiledVariant::from_compiled(&v, key).map_err(js)?))
    }

    /// The SVG for a `RenderRequest` as JSON (`component`, `size`, `states`, `options`,
    /// `mode`, `label`, `width`, `icon`, `textMetrics`); `size` and `mode` must be the variant's.
    pub fn svg(&self, request_json: &str) -> Result<String, JsError> {
        Ok(scene_to_svg(&self.solve(request_json)?))
    }

    /// The solved scene (with its `diagnostics`) as JSON.
    pub fn scene(&self, request_json: &str) -> Result<String, JsError> {
        Ok(serde_json::to_string(&self.solve(request_json)?)?)
    }
}

impl Engine {
    fn solve(&self, request_json: &str) -> Result<Scene, JsError> {
        let req: RenderRequest = serde_json::from_str(request_json)?;
        solve(&self.0, &req).map_err(js)
    }
}

fn js(e: String) -> JsError {
    JsError::new(&e)
}
