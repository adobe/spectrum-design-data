// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The compiled-in plugin seam for scene renderers: a solved visual-recipe
//! [`Scene`] in, one output format's bytes out. SVG and scene JSON live here;
//! other formats (PNG, ...) implement the trait from `sdk/plugins/`. Options a
//! format needs (fonts, pixel ratio) belong to the renderer value, not the trait.

use crate::visual::{scene_to_svg, Scene};

#[cfg(test)]
use crate::visual::Layout;

pub trait SceneRenderer {
    /// Stable identifier matched against a CLI `--format <id>` flag.
    fn format_id(&self) -> &'static str;

    /// MIME type of the bytes `render` returns.
    fn media_type(&self) -> &'static str;

    fn render(&self, scene: &Scene) -> Result<Vec<u8>, String>;
}

pub struct SvgRenderer;

impl SceneRenderer for SvgRenderer {
    fn format_id(&self) -> &'static str {
        "svg"
    }
    fn media_type(&self) -> &'static str {
        "image/svg+xml"
    }
    fn render(&self, scene: &Scene) -> Result<Vec<u8>, String> {
        Ok(scene_to_svg(scene).into_bytes())
    }
}

/// The scene as pretty JSON, for debugging and tooling.
pub struct SceneJsonRenderer;

impl SceneRenderer for SceneJsonRenderer {
    fn format_id(&self) -> &'static str {
        "scene"
    }
    fn media_type(&self) -> &'static str {
        "application/json"
    }
    fn render(&self, scene: &Scene) -> Result<Vec<u8>, String> {
        serde_json::to_vec_pretty(scene).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_scene() -> Scene {
        Scene {
            component: "test".into(),
            width: 10.0,
            height: 5.0,
            press: None,
            opacity: None,
            nodes: vec![],
            layout: Layout {
                gap: None,
                padding: [0.0; 4],
            },
            measurements: vec![],
            diagnostics: vec![],
        }
    }

    #[test]
    fn svg_renderer_matches_scene_to_svg() {
        let scene = empty_scene();
        let out = SvgRenderer.render(&scene).unwrap();
        assert_eq!(out, scene_to_svg(&scene).into_bytes());
    }

    #[test]
    fn scene_json_renderer_emits_json() {
        let out = SceneJsonRenderer.render(&empty_scene()).unwrap();
        assert!(serde_json::from_slice::<serde_json::Value>(&out).is_ok());
    }
}
