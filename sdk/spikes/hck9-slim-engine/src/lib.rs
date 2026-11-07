// Copyright 2026 Adobe. All rights reserved.
// SPIKE (hck9): slim solve-only engine. Not merged.
use design_data_core::visual::{scene_to_svg, solve, CompiledVariant, RenderRequest};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine(CompiledVariant);

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new(compiled_json: &str, key: &str) -> Result<Engine, JsError> {
        let v: serde_json::Value = serde_json::from_str(compiled_json)?;
        Ok(Engine(CompiledVariant::from_compiled(&v, key).map_err(|e| JsError::new(&e))?))
    }
    pub fn svg(&self, req_json: &str) -> Result<String, JsError> {
        let req: RenderRequest = serde_json::from_str(req_json)?;
        let scene = solve(&self.0, &req).map_err(|e| JsError::new(&e))?;
        Ok(scene_to_svg(&scene))
    }
}
