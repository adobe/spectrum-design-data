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
//! other formats (PNG, ...) implement the trait from `sdk/plugins/`.
//!
//! A host calls [`SceneRenderer::prepare`] before it lays the scene out (a format
//! that draws text may need to choose its font first, because the font sets the
//! text widths), then [`SceneRenderer::render`] with the options `prepare` returned.

use crate::text_metrics::TextMetrics;
use crate::visual::{scene_to_svg, Scene};

#[cfg(test)]
use crate::visual::Layout;

/// A font file the caller supplies. `origin` says where it came from (a path, or
/// `bundled`) for diagnostics.
#[derive(Debug, Clone)]
pub struct FontSource {
    pub data: Vec<u8>,
    pub origin: String,
}

/// What a renderer may be asked for beyond the scene. Formats ignore what they do
/// not use.
#[derive(Debug, Clone)]
pub struct RenderOptions {
    /// Pixels per scene unit, for raster formats.
    pub pixel_ratio: f64,
    /// Fonts the user chose. Empty lets the renderer look for one itself.
    pub fonts: Vec<FontSource>,
}

impl Default for RenderOptions {
    fn default() -> Self {
        Self {
            pixel_ratio: 2.0,
            fonts: Vec::new(),
        }
    }
}

/// The result of [`SceneRenderer::prepare`].
#[derive(Debug, Clone, Default)]
pub struct Prepared {
    /// The options to pass to `render`, with the font choice filled in.
    pub options: RenderOptions,
    /// Text-measurement table for the font the renderer will draw with, so layout
    /// matches it. `None` keeps the committed default table.
    pub text_metrics: Option<TextMetrics>,
    /// Things the user should hear about before the render (such as a font fallback).
    pub diagnostics: Vec<String>,
}

/// The bytes a renderer produced and what it could not draw faithfully.
#[derive(Debug, Clone, Default)]
pub struct Rendered {
    pub bytes: Vec<u8>,
    pub diagnostics: Vec<String>,
}

pub trait SceneRenderer {
    /// Stable identifier matched against a CLI `--format <id>` flag.
    fn format_id(&self) -> &'static str;

    /// MIME type of the bytes `render` returns.
    fn media_type(&self) -> &'static str;

    /// True when the bytes are not text, so a host must not write them to a terminal.
    fn binary(&self) -> bool {
        false
    }

    /// Settle the options (choose a font, say) before the scene is laid out.
    fn prepare(&self, options: RenderOptions) -> Result<Prepared, String> {
        Ok(Prepared {
            options,
            ..Prepared::default()
        })
    }

    fn render(&self, scene: &Scene, options: &RenderOptions) -> Result<Rendered, String>;
}

pub struct SvgRenderer;

impl SceneRenderer for SvgRenderer {
    fn format_id(&self) -> &'static str {
        "svg"
    }
    fn media_type(&self) -> &'static str {
        "image/svg+xml"
    }
    fn render(&self, scene: &Scene, _: &RenderOptions) -> Result<Rendered, String> {
        Ok(Rendered {
            bytes: scene_to_svg(scene).into_bytes(),
            ..Rendered::default()
        })
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
    fn render(&self, scene: &Scene, _: &RenderOptions) -> Result<Rendered, String> {
        Ok(Rendered {
            bytes: serde_json::to_vec_pretty(scene).map_err(|e| e.to_string())?,
            ..Rendered::default()
        })
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
        let out = SvgRenderer
            .render(&scene, &RenderOptions::default())
            .unwrap()
            .bytes;
        assert_eq!(out, scene_to_svg(&scene).into_bytes());
    }

    #[test]
    fn scene_json_renderer_matches_pretty_json() {
        let scene = empty_scene();
        let out = SceneJsonRenderer
            .render(&scene, &RenderOptions::default())
            .unwrap()
            .bytes;
        assert_eq!(
            out,
            serde_json::to_string_pretty(&scene).unwrap().into_bytes()
        );
    }

    #[test]
    fn renderers_report_stable_ids_and_media_types() {
        let ids: Vec<_> = [&SvgRenderer as &dyn SceneRenderer, &SceneJsonRenderer]
            .iter()
            .map(|r| (r.format_id(), r.media_type()))
            .collect();
        assert_eq!(
            ids,
            [("svg", "image/svg+xml"), ("scene", "application/json")]
        );
    }
}
