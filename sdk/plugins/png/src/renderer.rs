// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The PNG [`SceneRenderer`]: the compiled-in plugin the CLI registers as `--format png`.

use crate::font::resolve::TARGET_FAMILY;
use crate::font::{discover, Font};
use crate::{scene_to_png, RasterOptions};
use design_data_core::scene_render::{
    FontSource, Prepared, RenderOptions, Rendered, SceneRenderer,
};
use design_data_core::text_metrics::TextMetrics;
use design_data_core::visual::Scene;

pub struct PngRenderer;

/// Text-measurement table of `font`, so layout widths match the text drawn in it. Any
/// format may use it: a font the user supplies sets the layout for SVG and scene output too.
pub fn layout_metrics(font: &FontSource) -> Result<TextMetrics, String> {
    let err = |e: String| format!("--font {}: {e}", font.origin);
    Font::parse(font.data.clone())
        .map_err(|e| err(e.to_string()))?
        .text_metrics()
        .map_err(|e| err(e.to_string()))
}

#[cfg(feature = "fallback-font")]
fn bundled() -> Option<FontSource> {
    Some(crate::fallback_font())
}

#[cfg(not(feature = "fallback-font"))]
fn bundled() -> Option<FontSource> {
    None
}

impl SceneRenderer for PngRenderer {
    fn format_id(&self) -> &'static str {
        "png"
    }

    fn media_type(&self) -> &'static str {
        "image/png"
    }

    fn binary(&self) -> bool {
        true
    }

    /// Without a user-chosen font, looks for Adobe Clean Spectrum VF on this machine and
    /// falls back to the bundled Source Sans 3 (saying so). A font that is not the bundled
    /// one also sets the layout widths, so boxes fit the text drawn in them.
    fn prepare(&self, mut options: RenderOptions) -> Result<Prepared, String> {
        let mut diagnostics = Vec::new();
        let mut chosen = true;
        if options.fonts.is_empty() {
            let found = discover::discover(TARGET_FAMILY, &discover::Env::current(), bundled());
            options.fonts.extend(found.font);
            chosen = found.status.installed;
            if found.status.fallback {
                diagnostics.push(found.status.help);
            }
        }
        let mut text_metrics = None;
        if chosen {
            if let Some(first) = options.fonts.first() {
                text_metrics = Some(layout_metrics(first)?);
            }
        }
        Ok(Prepared {
            options,
            text_metrics,
            diagnostics,
        })
    }

    fn render(&self, scene: &Scene, options: &RenderOptions) -> Result<Rendered, String> {
        let opts = RasterOptions {
            scale: options.pixel_ratio,
            background: None,
        };
        let out = scene_to_png(scene, &options.fonts, &opts).map_err(|e| e.to_string())?;
        Ok(Rendered {
            bytes: out.png,
            diagnostics: out.diagnostics,
        })
    }
}
