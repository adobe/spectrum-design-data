// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `:preview <component>`: draw a component's visual recipe in the terminal.
//!
//! The recipe is solved and rasterized by `design-data-core`'s PNG renderer (the same one
//! behind `design-data render --format png`), so the picture is the one a PNG would show.
//! It is drawn with half-block characters (`▀`, one pixel on top and one below in each
//! cell's two colors), which every truecolor terminal can show and which lives in ratatui's
//! own buffer, so it works inside tmux and is testable without a terminal. This module is
//! the data side; `view/preview.rs` paints it.
//!
//! Recipes, relationships and icons are not part of the TUI's cached token graph, so the
//! first preview loads them and later previews reuse them. Text uses Adobe Clean Spectrum VF
//! when it is installed (`design-data fonts` says where it looked) and a bundled open font
//! otherwise; the preview says which.

use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock};

use design_data_core::data_source::ResolvedData;
use design_data_core::graph::TokenGraph;
use design_data_core::manifest;
use design_data_core::raster::font::resolve::{Resolved, TARGET_FAMILY};
use design_data_core::raster::font::{discover, Font};
use design_data_core::raster::{self, FontSource, RasterOptions};
use design_data_core::visual::{build_scene, RenderRequest};
use serde::{Deserialize, Serialize};

/// Pixels per scene unit the picture is rasterized at. Drawing resamples from this, so a
/// large terminal gets crisp text and a small one a clean downsample.
const CAPTURE_RATIO: f64 = 4.0;
/// The most a component is enlarged to fill the pane, in pixels per scene unit.
const MAX_ZOOM: f64 = 3.0;
const STATES: [&str; 4] = ["", "hover", "down", "keyboard-focus"];

/// What to draw.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PreviewRequest {
    pub component: String,
    /// Empty means the recipe's default (`m`, else its first size).
    pub size: String,
    pub states: Vec<String>,
    pub color_scheme: String,
    pub scale: String,
}

impl PreviewRequest {
    /// Parse the palette arguments: `<component> [size=m] [state=hover] [scheme=dark] [scale=mobile]`.
    pub fn parse(rest: &str) -> Result<Self, String> {
        let mut parts = rest.split_whitespace();
        let component = parts
            .next()
            .ok_or("preview: component ID required, e.g. `preview button`")?;
        if !component
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_lowercase())
            || !component
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        {
            return Err(format!("invalid component ID '{component}'"));
        }
        let mut req = Self {
            component: component.into(),
            size: String::new(),
            states: vec![],
            color_scheme: "light".into(),
            scale: "desktop".into(),
        };
        for part in parts {
            let (key, value) = part
                .split_once('=')
                .filter(|(_, v)| !v.is_empty())
                .ok_or_else(|| format!("preview: expected name=value, got '{part}'"))?;
            match key {
                "size" => req.size = value.into(),
                "state" => req.states = value.split(',').map(str::to_owned).collect(),
                "scheme" => req.color_scheme = value.into(),
                "scale" => req.scale = value.into(),
                _ => {
                    return Err(format!(
                        "preview: unknown option '{key}' (use size, state, scheme or scale)"
                    ))
                }
            }
        }
        Ok(req)
    }

    pub fn toggle_scheme(&self) -> Self {
        let dark = self.color_scheme != "dark";
        Self {
            color_scheme: if dark { "dark" } else { "light" }.into(),
            ..self.clone()
        }
    }

    /// The next size in `sizes`, wrapping.
    pub fn next_size(&self, sizes: &[String]) -> Self {
        let at = sizes.iter().position(|s| *s == self.size);
        let next = sizes.get(at.map_or(0, |i| (i + 1) % sizes.len().max(1)));
        Self {
            size: next.cloned().unwrap_or_else(|| self.size.clone()),
            ..self.clone()
        }
    }

    /// Cycle none, hover, down, keyboard-focus.
    pub fn next_state(&self) -> Self {
        let now = self.states.first().map_or("", String::as_str);
        let at = STATES.iter().position(|s| *s == now).unwrap_or(0);
        let next = STATES[(at + 1) % STATES.len()];
        Self {
            states: if next.is_empty() {
                vec![]
            } else {
                vec![next.into()]
            },
            ..self.clone()
        }
    }
}

/// A rendered preview: the picture and what the footer says about it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewState {
    pub request: PreviewRequest,
    /// Sizes the recipe offers, for the `s` key.
    pub sizes: Vec<String>,
    pub width: u32,
    pub height: u32,
    /// Straight-alpha RGBA, `width * height * 4` bytes, at [`CAPTURE_RATIO`].
    pub rgba: Vec<u8>,
    /// The component's size in scene units, which sets how big it is drawn.
    pub scene_width: f64,
    pub scene_height: f64,
    /// The font text was drawn with, and whether it is the bundled fallback.
    pub font: String,
    pub font_fallback: bool,
    /// Things the renderer could not draw faithfully, and errors from a failed re-render.
    pub notes: Vec<String>,
}

/// Where previews come from: the dataset, loaded on first use.
pub struct PreviewSource {
    path: PathBuf,
    resolved: Arc<ResolvedData>,
    env: discover::Env,
    graph: OnceLock<Result<TokenGraph, String>>,
    font: OnceLock<Resolved>,
}

impl PreviewSource {
    pub fn new(path: PathBuf, resolved: Arc<ResolvedData>) -> Self {
        Self {
            path,
            resolved,
            env: discover::Env::current(),
            graph: OnceLock::new(),
            font: OnceLock::new(),
        }
    }

    /// Search these font folders instead of the machine's (tests).
    pub fn with_font_env(mut self, env: discover::Env) -> Self {
        self.env = env;
        self
    }

    fn graph(&self) -> Result<&TokenGraph, String> {
        self.graph
            .get_or_init(|| self.load_graph())
            .as_ref()
            .map_err(Clone::clone)
    }

    /// The token graph with relationships, icons and recipes, as `design-data render` builds it.
    fn load_graph(&self) -> Result<TokenGraph, String> {
        let r = &*self.resolved;
        let mut graph = TokenGraph::from_json_dir_with_catalogs(
            &self.path,
            r.mode_sets.as_deref(),
            r.components.as_deref(),
        )
        .map_err(|e| format!("preview: failed to load tokens: {e}"))?;
        if let Some(dir) = r.relationships.as_deref() {
            let rels = TokenGraph::load_spec_relationships(dir)
                .map_err(|e| format!("preview: failed to load relationships: {e}"))?;
            graph = graph.with_relationships(rels);
        }
        if let Some(dir) = r.icons.as_deref() {
            let icons = TokenGraph::load_spec_icons(dir)
                .map_err(|e| format!("preview: failed to load icons: {e}"))?;
            graph = graph.with_icons(icons);
        }
        let sibling = |p: &Path| p.parent().map(|d| d.join("visuals"));
        let visuals = [
            Some(self.path.join("visuals")),
            sibling(&self.path),
            r.components.as_deref().and_then(sibling),
        ]
        .into_iter()
        .flatten()
        .find(|d| d.is_dir());
        if let Some(dir) = visuals {
            graph.visuals = TokenGraph::load_spec_visuals(&dir).map_err(|e| {
                format!(
                    "preview: failed to load recipes from {}: {e}",
                    dir.display()
                )
            })?;
        }
        manifest::apply_configured(&mut graph, r)
            .map_err(|e| format!("preview: failed to apply the platform manifest: {e}"))?;
        Ok(graph)
    }

    /// The text font, chosen once: the installed Adobe Clean Spectrum VF, else the bundled fallback.
    fn font(&self) -> &Resolved {
        self.font.get_or_init(|| {
            discover::discover(TARGET_FAMILY, &self.env, Some(raster::fallback_font()))
        })
    }

    /// Solve and rasterize `request`. Slow the first time (it loads the dataset), so call it
    /// off the UI thread.
    pub fn render(&self, request: &PreviewRequest) -> Result<PreviewState, String> {
        let graph = self.graph()?;
        let recipe = graph.visual_recipe(&request.component).ok_or_else(|| {
            let names: Vec<&str> = graph.visuals.iter().map(|v| v.component.as_str()).collect();
            if names.is_empty() {
                "preview: no visual recipes found (expected a visuals/ directory next to the tokens)"
                    .to_string()
            } else {
                format!(
                    "no visual recipe for '{}' — available: {}",
                    request.component,
                    names.join(", ")
                )
            }
        })?;
        let sizes: Vec<String> = recipe
            .raw
            .get("sizeScale")
            .and_then(|v| v.as_object())
            .map(|o| o.keys().cloned().collect())
            .unwrap_or_default();
        let size = if !request.size.is_empty() {
            request.size.clone()
        } else if sizes.iter().any(|s| s == "m") {
            "m".into()
        } else {
            sizes.first().cloned().unwrap_or_else(|| "m".into())
        };

        let font = self.font();
        // A chosen font also sets the layout widths, so boxes fit their text; the fallback is
        // the default table's own font.
        let text_metrics = font
            .font
            .as_ref()
            .filter(|_| !font.status.fallback)
            .and_then(|f| Font::parse(f.data.clone()).ok())
            .and_then(|f| f.text_metrics().ok());
        let render = RenderRequest {
            component: graph.canonical_component(&request.component).to_string(),
            size: size.clone(),
            states: request.states.clone(),
            mode: [
                ("colorScheme".to_string(), request.color_scheme.clone()),
                ("scale".to_string(), request.scale.clone()),
            ]
            .into(),
            label: "Label".into(),
            text_metrics,
            ..Default::default()
        };
        let scene = build_scene(graph, &recipe.raw, &render)?;
        let fonts: Vec<FontSource> = font.font.iter().cloned().collect();
        let opts = RasterOptions {
            scale: CAPTURE_RATIO,
            background: None,
        };
        let (image, raster_notes) =
            raster::rasterize(&scene, &fonts, &opts).map_err(|e| e.to_string())?;
        let mut notes = scene.diagnostics.clone();
        notes.extend(raster_notes);
        Ok(PreviewState {
            request: PreviewRequest {
                size,
                ..request.clone()
            },
            sizes,
            width: image.width,
            height: image.height,
            rgba: image.rgba,
            scene_width: scene.width,
            scene_height: scene.height,
            font: font_label(font),
            font_fallback: font.status.fallback,
            notes,
        })
    }
}

fn font_label(font: &Resolved) -> String {
    if font.status.fallback {
        return format!(
            "{} (Adobe Clean Spectrum VF not found; run `design-data fonts`)",
            font.status.using
        );
    }
    Path::new(&font.status.using).file_name().map_or_else(
        || font.status.using.clone(),
        |n| n.to_string_lossy().into_owned(),
    )
}

/// The canvas color behind a preview: a transparent PNG shows the scheme's background.
pub fn canvas_color(color_scheme: &str) -> [u8; 3] {
    if color_scheme == "dark" {
        [29, 29, 29]
    } else {
        [255, 255, 255]
    }
}

/// Cells (columns, rows) to draw a `scene_w` x `scene_h` component in a `cols` x `rows` pane,
/// as large as fits (up to [`MAX_ZOOM`]) and always at least one cell. A cell is one pixel
/// wide and two tall.
pub fn fit(scene_w: f64, scene_h: f64, cols: u16, rows: u16) -> (usize, usize) {
    let (pw, ph) = (f64::from(cols), f64::from(rows) * 2.0);
    if !(scene_w > 0.0 && scene_h > 0.0) || pw < 1.0 || ph < 2.0 {
        return (usize::from(cols.min(1)), usize::from(rows.min(1)));
    }
    let zoom = (pw / scene_w).min(ph / scene_h).min(MAX_ZOOM);
    let w = ((scene_w * zoom).round() as usize).clamp(1, usize::from(cols));
    let h = (((scene_h * zoom) / 2.0).round() as usize).clamp(1, usize::from(rows));
    (w, h)
}

/// Resample `rgba` (`sw` x `sh`, straight alpha) to `cols` x `rows` cells, each cell a top and
/// a bottom pixel, composited over `bg`. Each target pixel is the average of the source
/// pixels it covers, so text stays readable when shrunk.
pub fn half_blocks(
    rgba: &[u8],
    sw: usize,
    sh: usize,
    bg: [u8; 3],
    cols: usize,
    rows: usize,
) -> Vec<Vec<([u8; 3], [u8; 3])>> {
    if sw == 0 || sh == 0 || cols == 0 || rows == 0 || rgba.len() < sw * sh * 4 {
        return vec![vec![(bg, bg); cols]; rows];
    }
    let pixel = |tx: usize, ty: usize, th: usize| -> [u8; 3] {
        let (x0, x1) = (
            tx * sw / cols,
            ((tx + 1) * sw / cols).max(tx * sw / cols + 1),
        );
        let (y0, y1) = (ty * sh / th, ((ty + 1) * sh / th).max(ty * sh / th + 1));
        let (mut sum, mut alpha, mut n) = ([0.0f64; 3], 0.0f64, 0.0f64);
        for y in y0..y1.min(sh) {
            for x in x0..x1.min(sw) {
                let p = &rgba[(y * sw + x) * 4..][..4];
                let a = f64::from(p[3]) / 255.0;
                for (s, c) in sum.iter_mut().zip(p) {
                    *s += f64::from(*c) * a;
                }
                alpha += a;
                n += 1.0;
            }
        }
        if n == 0.0 {
            return bg;
        }
        let a = alpha / n;
        let mut out = [0u8; 3];
        for i in 0..3 {
            out[i] = (sum[i] / n + f64::from(bg[i]) * (1.0 - a))
                .round()
                .clamp(0.0, 255.0) as u8;
        }
        out
    };
    (0..rows)
        .map(|r| {
            (0..cols)
                .map(|c| (pixel(c, 2 * r, 2 * rows), pixel(c, 2 * r + 1, 2 * rows)))
                .collect()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_the_palette_arguments() {
        let r =
            PreviewRequest::parse("button size=l state=hover scheme=dark scale=mobile").unwrap();
        assert_eq!(
            (
                r.component.as_str(),
                r.size.as_str(),
                r.color_scheme.as_str(),
                r.scale.as_str()
            ),
            ("button", "l", "dark", "mobile")
        );
        assert_eq!(r.states, vec!["hover"]);
        let d = PreviewRequest::parse("action-button").unwrap();
        assert_eq!(
            (d.size.as_str(), d.color_scheme.as_str(), d.scale.as_str()),
            ("", "light", "desktop")
        );
        assert!(d.states.is_empty());
        assert_eq!(
            PreviewRequest::parse("a state=hover,down").unwrap().states,
            vec!["hover", "down"]
        );
        for bad in [
            "",
            "Button",
            "9lives",
            "bu_tton",
            "button size",
            "button size=",
            "button color=red",
        ] {
            assert!(PreviewRequest::parse(bad).is_err(), "{bad}");
        }
        assert!(PreviewRequest::parse("button color=red")
            .unwrap_err()
            .contains("unknown option"));
    }

    #[test]
    fn keys_step_through_scheme_size_and_state() {
        let r = PreviewRequest::parse("button").unwrap();
        assert_eq!(r.toggle_scheme().color_scheme, "dark");
        assert_eq!(r.toggle_scheme().toggle_scheme().color_scheme, "light");
        let sizes: Vec<String> = ["s", "m", "l"].map(Into::into).into();
        let m = PreviewRequest {
            size: "m".into(),
            ..r.clone()
        };
        assert_eq!(m.next_size(&sizes).size, "l");
        assert_eq!(m.next_size(&sizes).next_size(&sizes).size, "s");
        assert_eq!(
            r.next_size(&sizes).size,
            "s",
            "an unset size starts at the first"
        );
        assert_eq!(r.next_size(&[]).size, "");
        let states: Vec<Vec<String>> = (0..5)
            .scan(r.clone(), |cur, _| {
                *cur = cur.next_state();
                Some(cur.states.clone())
            })
            .collect();
        assert_eq!(states[0], vec!["hover"]);
        assert_eq!(states[2], vec!["keyboard-focus"]);
        assert!(states[3].is_empty() && states[4] == vec!["hover"]);
    }

    #[test]
    fn a_component_is_fitted_to_the_pane_without_distortion() {
        // 100x32 units in a 120x40 cell pane (120x80 pixels): the width limits it, zoom 1.2.
        assert_eq!(fit(100.0, 32.0, 120, 40), (120, 19));
        let (w, h) = fit(100.0, 32.0, 300, 100);
        assert_eq!((w, h), (300, 48), "capped at the maximum zoom of 3");
        // Shrinks to fit a small pane, keeping the aspect (a cell is one pixel by two).
        let (w, h) = fit(100.0, 40.0, 50, 40);
        assert_eq!((w, h), (50, 10));
        // Degenerate sizes still give one cell, and never more than the pane.
        assert_eq!(fit(0.0, 10.0, 20, 5), (1, 1));
        assert_eq!(fit(10.0, 10.0, 0, 0), (0, 0));
        let (w, h) = fit(1.0e6, 1.0e6, 7, 3);
        assert!(w <= 7 && h <= 3 && w >= 1 && h >= 1);
    }

    #[test]
    fn half_blocks_pair_the_top_and_bottom_pixels_of_each_cell() {
        // 2x2 image: top row red, bottom row blue, drawn as one column of one cell each.
        let img = [
            255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255,
        ];
        let g = half_blocks(&img, 2, 2, [255; 3], 2, 1);
        assert_eq!(g, vec![vec![([255, 0, 0], [0, 0, 255]); 2]]);
        // Transparent pixels show the canvas.
        let clear = [0u8; 16];
        assert_eq!(
            half_blocks(&clear, 2, 2, [29; 3], 1, 1),
            vec![vec![([29; 3], [29; 3])]]
        );
        // Half-covered pixels blend with it: black at half alpha over white is mid-gray.
        let half = [0, 0, 0, 128, 0, 0, 0, 128, 0, 0, 0, 128, 0, 0, 0, 128];
        let px = half_blocks(&half, 2, 2, [255; 3], 1, 1)[0][0].0;
        assert!((126..=129).contains(&px[0]), "{px:?}");
    }

    #[test]
    fn half_blocks_average_what_they_shrink_and_survive_bad_input() {
        // A 4x4 checkerboard of black and white squeezed into one pixel pair is mid-gray.
        let mut img = Vec::new();
        for y in 0..4 {
            for x in 0..4 {
                let v = if (x + y) % 2 == 0 { 0 } else { 255 };
                img.extend_from_slice(&[v, v, v, 255]);
            }
        }
        let (top, bottom) = half_blocks(&img, 4, 4, [0; 3], 1, 1)[0][0];
        assert!(
            (126..=129).contains(&top[0]) && (126..=129).contains(&bottom[0]),
            "{top:?} {bottom:?}"
        );
        // An empty or short buffer gives the canvas, not a panic.
        assert_eq!(
            half_blocks(&[], 0, 0, [7; 3], 2, 2),
            vec![vec![([7; 3], [7; 3]); 2]; 2]
        );
        assert_eq!(
            half_blocks(&[1, 2, 3], 4, 4, [7; 3], 1, 1),
            vec![vec![([7; 3], [7; 3])]]
        );
        assert!(half_blocks(&img, 4, 4, [0; 3], 0, 3)
            .iter()
            .all(Vec::is_empty));
    }

    #[test]
    fn the_canvas_follows_the_color_scheme() {
        assert_eq!(canvas_color("light"), [255; 3]);
        assert_eq!(canvas_color("dark"), [29; 3]);
        assert_eq!(canvas_color("anything"), [255; 3]);
    }
}
