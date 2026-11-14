// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Rasterize a visual-recipe [`Scene`] to pixels or a PNG, with no external crates.
//!
//! The scene is already laid out, so this is only painting: [`shape`] turns signed distances
//! into anti-aliased coverage and [`png`] writes the result. Arithmetic is plain `f64`, so
//! the same scene gives the same pixels on every target. Fonts are supplied by the caller as
//! bytes (this crate never reads the filesystem or embeds one).

pub mod canvas;
pub mod png;
pub mod shape;

use crate::visual::{Scene, SceneNode};
use canvas::{parse_color, Canvas, Rgba};
use shape::{paint, rrect_sdf, Paint, Xf};

/// Pixels allowed in one image, so a bad `scale` cannot allocate without bound.
const MAX_PIXELS: f64 = 64.0e6;

/// A font file the caller supplies. `origin` says where it came from (a path, or `bundled`)
/// for diagnostics.
#[derive(Debug, Clone)]
pub struct FontSource {
    pub data: Vec<u8>,
    pub origin: String,
}

#[derive(Debug, Clone)]
pub struct RasterOptions {
    /// Pixels per scene unit; 2 matches the platform-capture default.
    pub scale: f64,
    /// A CSS color drawn behind the scene; transparent when unset.
    pub background: Option<String>,
}

impl Default for RasterOptions {
    fn default() -> Self {
        Self {
            scale: 2.0,
            background: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RasterError(pub String);

impl std::fmt::Display for RasterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for RasterError {}

/// Straight-alpha RGBA pixels.
#[derive(Debug, Clone)]
pub struct Image {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

/// An image plus what the renderer could not draw faithfully.
#[derive(Debug, Clone)]
pub struct RasterOutput {
    pub png: Vec<u8>,
    pub diagnostics: Vec<String>,
}

/// Draw `scene` at `opts.scale`. Diagnostics list what was approximated or skipped.
pub fn rasterize(
    scene: &Scene,
    _fonts: &[FontSource],
    opts: &RasterOptions,
) -> Result<(Image, Vec<String>), RasterError> {
    if !(opts.scale.is_finite() && opts.scale > 0.0) {
        return Err(RasterError(format!(
            "scale must be positive, got {}",
            opts.scale
        )));
    }
    let size = |v: f64| if v.is_finite() && v > 0.0 { v } else { 0.0 };
    let (w, h) = (
        (size(scene.width) * opts.scale).ceil(),
        (size(scene.height) * opts.scale).ceil(),
    );
    if w * h > MAX_PIXELS {
        return Err(RasterError(format!(
            "image would be {w}x{h} pixels (limit {MAX_PIXELS}); lower the scale"
        )));
    }
    let background = match opts.background.as_deref() {
        None => None,
        Some(b) => Some(
            parse_color(b).ok_or_else(|| RasterError(format!("unknown background color '{b}'")))?,
        ),
    };

    let mut cv = Canvas::new(w as usize, h as usize);
    let mut diags: Vec<String> = Vec::new();
    let base = Xf::scale(opts.scale);
    let press_xf = |p: &crate::visual::Press| base.pressed(p.scale, p.cx, p.cy);
    let global = scene.press.as_ref().filter(|p| p.part.is_none());
    let whole = global.map_or(base, press_xf);
    // The scaled span wraps the target part and the nodes nested in it, which follow it.
    let span = scene.press.as_ref().and_then(|p| {
        let start = scene
            .nodes
            .iter()
            .position(|n| Some(n.part.as_str()) == p.part.as_deref())?;
        let len = scene.nodes[start + 1..]
            .iter()
            .take_while(|n| p.nested.contains(&n.part))
            .count();
        Some((start, start + len, press_xf(p)))
    });
    for (i, n) in scene.nodes.iter().enumerate() {
        let xf = match span {
            Some((a, b, pressed)) if (a..=b).contains(&i) => pressed,
            _ => whole,
        };
        draw_node(&mut cv, xf, n, &mut diags);
    }
    if let Some(o) = scene.opacity {
        cv.scale_opacity(o.clamp(0.0, 1.0) as f32);
    }
    if let Some(b) = background {
        cv.fill_behind(b);
    }
    Ok((
        Image {
            width: w as u32,
            height: h as u32,
            rgba: cv.to_rgba8(),
        },
        diags,
    ))
}

/// [`rasterize`] and encode the result as a PNG.
pub fn scene_to_png(
    scene: &Scene,
    fonts: &[FontSource],
    opts: &RasterOptions,
) -> Result<RasterOutput, RasterError> {
    let (img, diagnostics) = rasterize(scene, fonts, opts)?;
    Ok(RasterOutput {
        png: png::encode(img.width, img.height, &img.rgba),
        diagnostics,
    })
}

fn note(diags: &mut Vec<String>, msg: String) {
    if !diags.contains(&msg) {
        diags.push(msg);
    }
}

fn color_of(s: Option<&str>, what: &str, part: &str, diags: &mut Vec<String>) -> Option<Rgba> {
    let s = s?;
    let c = parse_color(s);
    if c.is_none() {
        note(
            diags,
            format!("{part}: {what} color '{s}' is not a color the PNG renderer reads; skipped"),
        );
    }
    c
}

fn corner_radii(n: &SceneNode) -> [f64; 4] {
    n.radii.unwrap_or([n.radius; 4])
}

fn draw_node(cv: &mut Canvas, xf: Xf, n: &SceneNode, diags: &mut Vec<String>) {
    let bounds = |pad: f64| (n.x - pad, n.y - pad, n.x + n.w + pad, n.y + n.h + pad);
    match n.kind.as_str() {
        "box" => {
            if let Some(c) = color_of(n.fill.as_deref(), "fill", &n.part, diags) {
                let r = corner_radii(n);
                paint(cv, xf, bounds(0.0), c, Paint::Fill, |x, y| {
                    rrect_sdf(x, y, n.x, n.y, n.w, n.h, r)
                });
            }
            if n.stroke_width > 0.0 {
                if let Some(c) = color_of(n.stroke.as_deref(), "stroke", &n.part, diags) {
                    // The SVG strokes the box inset by half the width, so the band is inside it.
                    let i = n.stroke_width / 2.0;
                    let r = corner_radii(n).map(|v| (v - i).max(0.0));
                    paint(cv, xf, bounds(0.0), c, Paint::Band(i), |x, y| {
                        rrect_sdf(
                            x,
                            y,
                            n.x + i,
                            n.y + i,
                            n.w - n.stroke_width,
                            n.h - n.stroke_width,
                            r,
                        )
                    });
                }
            }
        }
        "ring" => {
            if let Some(c) = color_of(n.stroke.as_deref(), "stroke", &n.part, diags) {
                let hw = n.stroke_width / 2.0;
                paint(cv, xf, bounds(hw), c, Paint::Band(hw), |x, y| {
                    rrect_sdf(x, y, n.x, n.y, n.w, n.h, [n.radius; 4])
                });
            }
        }
        "text" => {
            note(
                diags,
                "text is drawn as placeholder bars: no font is loaded".into(),
            );
            let Some(text) = n.text.as_deref().filter(|t| !t.trim().is_empty()) else {
                return;
            };
            let c = color_of(n.color.as_deref(), "text", &n.part, diags).unwrap_or(Rgba::BLACK);
            let width = if n.w > 0.0 {
                n.w
            } else {
                text.chars().count() as f64 * n.font_size * 0.5
            };
            let (bh, cy) = (n.font_size * 0.45, n.y + n.h / 2.0);
            let (x, y) = (n.x, cy - bh / 2.0);
            paint(
                cv,
                xf,
                (x, y, x + width, y + bh),
                c.with_alpha(0.55),
                Paint::Fill,
                |px, py| rrect_sdf(px, py, x, y, width, bh, [bh / 2.0; 4]),
            );
        }
        "progress" => {
            let (cx, cy) = (n.x + n.w / 2.0, n.y + n.h / 2.0);
            let side = n.w.min(n.h);
            let (r, sw) = (side / 2.0 - side / 18.0, (side / 9.0).max(1.0));
            let reach = (r + sw) * 2.0;
            let bb = (
                cx - reach / 2.0,
                cy - reach / 2.0,
                cx + reach / 2.0,
                cy + reach / 2.0,
            );
            if let Some(c) = color_of(n.stroke.as_deref(), "stroke", &n.part, diags) {
                paint(cv, xf, bb, c, Paint::Band(sw / 2.0), |x, y| {
                    (x - cx).hypot(y - cy) - r
                });
            }
            if let Some(c) = color_of(n.color.as_deref(), "color", &n.part, diags) {
                // A quarter arc from the top to the right, clockwise, with round caps.
                paint(cv, xf, bb, c, Paint::Band(sw / 2.0), |x, y| {
                    let (qx, qy) = (x - cx, y - cy);
                    if qx >= 0.0 && qy <= 0.0 {
                        qx.hypot(qy) - r
                    } else {
                        qx.hypot(qy + r).min((qx - r).hypot(qy))
                    }
                });
            }
        }
        "icon" => note(diags, "icons are not drawn yet".into()),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::visual::{Layout, Press};

    fn node(kind: &str, part: &str, x: f64, y: f64, w: f64, h: f64) -> SceneNode {
        SceneNode {
            part: part.into(),
            kind: kind.into(),
            x,
            y,
            w,
            h,
            fill: None,
            stroke: None,
            stroke_width: 0.0,
            radius: 0.0,
            radii: None,
            text: None,
            font_size: 14.0,
            font_weight: None,
            font_family: None,
            color: None,
            icon: None,
            rotation: None,
            tokens: vec![],
        }
    }

    fn scene(w: f64, h: f64, nodes: Vec<SceneNode>) -> Scene {
        Scene {
            component: "t".into(),
            width: w,
            height: h,
            press: None,
            opacity: None,
            nodes,
            layout: Layout {
                gap: None,
                padding: [0.0; 4],
            },
            measurements: vec![],
            diagnostics: vec![],
        }
    }

    fn render(s: &Scene, scale: f64) -> (Image, Vec<String>) {
        let o = RasterOptions {
            scale,
            background: None,
        };
        rasterize(s, &[], &o).unwrap()
    }

    fn at(img: &Image, x: u32, y: u32) -> [u8; 4] {
        let i = ((y * img.width + x) * 4) as usize;
        img.rgba[i..i + 4].try_into().unwrap()
    }

    fn filled(fill: &str) -> SceneNode {
        let mut n = node("box", "root", 2.0, 2.0, 16.0, 8.0);
        n.fill = Some(fill.into());
        n
    }

    #[test]
    fn fills_a_box_at_the_requested_scale() {
        let (img, d) = render(&scene(20.0, 12.0, vec![filled("#ff0000")]), 2.0);
        assert_eq!((img.width, img.height), (40, 24));
        assert_eq!(at(&img, 20, 12), [255, 0, 0, 255]);
        assert_eq!(at(&img, 2, 12), [0, 0, 0, 0]);
        assert_eq!(at(&img, 4, 12), [255, 0, 0, 255]);
        assert!(d.is_empty());
    }

    #[test]
    fn rounds_corners_and_strokes_inside_the_box() {
        let mut n = filled("#ffffff");
        n.radius = 4.0;
        n.stroke = Some("#0000ff".into());
        n.stroke_width = 2.0;
        let (img, _) = render(&scene(20.0, 12.0, vec![n]), 4.0);
        // The corner pixel is outside the rounded shape, the middle of the left edge is stroke.
        assert_eq!(at(&img, 8, 8)[3], 0);
        assert_eq!(at(&img, 10, 24), [0, 0, 255, 255]);
        assert_eq!(at(&img, 40, 24), [255, 255, 255, 255]);
    }

    #[test]
    fn per_corner_radii_round_only_that_corner() {
        let mut n = filled("#000000");
        n.radii = Some([0.0, 6.0, 0.0, 0.0]);
        let (img, _) = render(&scene(20.0, 12.0, vec![n]), 4.0);
        assert_eq!(at(&img, 9, 9)[3], 255);
        assert_eq!(at(&img, 70, 9)[3], 0);
    }

    #[test]
    fn ring_straddles_its_edge() {
        let mut n = node("ring", "focus", 4.0, 4.0, 12.0, 6.0);
        n.stroke = Some("#00ff00".into());
        n.stroke_width = 2.0;
        n.radius = 2.0;
        let (img, _) = render(&scene(20.0, 14.0, vec![n]), 4.0);
        assert_eq!(at(&img, 16, 28), [0, 255, 0, 255]);
        assert_eq!(at(&img, 14, 28), [0, 255, 0, 255]);
        assert_eq!(at(&img, 40, 28)[3], 0);
        assert_eq!(at(&img, 2, 28)[3], 0);
    }

    #[test]
    fn opacity_press_and_background() {
        let mut s = scene(20.0, 12.0, vec![filled("#ff0000")]);
        s.opacity = Some(0.5);
        assert_eq!(at(&render(&s, 1.0).0, 10, 6), [255, 0, 0, 128]);

        let mut s = scene(20.0, 12.0, vec![filled("#ff0000")]);
        s.press = Some(Press {
            part: None,
            nested: vec![],
            scale: 0.5,
            cx: 10.0,
            cy: 6.0,
        });
        let img = render(&s, 1.0).0;
        // The box spans x 2..18; at half size about its center it spans 6..14.
        assert_eq!(at(&img, 3, 6)[3], 0);
        assert_eq!(at(&img, 8, 6), [255, 0, 0, 255]);

        let o = RasterOptions {
            scale: 1.0,
            background: Some("#ffffff".into()),
        };
        let img = rasterize(&scene(20.0, 12.0, vec![]), &[], &o).unwrap().0;
        assert_eq!(at(&img, 0, 0), [255, 255, 255, 255]);
    }

    #[test]
    fn press_on_a_part_scales_it_and_its_nested_parts_only() {
        let mut a = filled("#ff0000");
        a.part = "a".into();
        let mut b = node("box", "inner", 4.0, 4.0, 4.0, 4.0);
        b.fill = Some("#00ff00".into());
        let mut c = node("box", "other", 12.0, 4.0, 4.0, 4.0);
        c.fill = Some("#0000ff".into());
        let mut s = scene(20.0, 12.0, vec![a, b, c]);
        s.press = Some(Press {
            part: Some("a".into()),
            nested: vec!["inner".into()],
            scale: 0.5,
            cx: 10.0,
            cy: 6.0,
        });
        let img = render(&s, 1.0).0;
        // `other` sits on top of the red box and is not scaled, so it keeps its place.
        assert_eq!(at(&img, 13, 5), [0, 0, 255, 255]);
        // The red box shrank to x 6..14, so its old left edge is now empty.
        assert_eq!(at(&img, 3, 6)[3], 0);
        // `inner` moved with it: (4,4) maps to (7,5).
        assert_eq!(at(&img, 7, 5), [0, 255, 0, 255]);
    }

    #[test]
    fn progress_draws_a_track_and_a_quarter_arc() {
        let mut n = node("progress", "p", 0.0, 0.0, 36.0, 36.0);
        n.stroke = Some("#cccccc".into());
        n.color = Some("#0000ff".into());
        let (img, _) = render(&scene(36.0, 36.0, vec![n]), 2.0);
        // Radius is 16 about (18, 18): the top of the ring is the arc, the bottom the track.
        assert_eq!(at(&img, 36, 4)[2], 255);
        assert_eq!(at(&img, 36, 4)[0], 0);
        assert_eq!(at(&img, 36, 68), [204, 204, 204, 255]);
        assert_eq!(at(&img, 36, 36)[3], 0);
    }

    #[test]
    fn text_is_a_bar_with_a_diagnostic_and_icons_are_skipped() {
        let mut t = node("text", "label", 2.0, 0.0, 20.0, 12.0);
        t.text = Some("Hi".into());
        t.color = Some("#000000".into());
        let i = node("icon", "icon", 0.0, 0.0, 8.0, 8.0);
        let (img, d) = render(&scene(24.0, 12.0, vec![t, i]), 2.0);
        assert!(at(&img, 20, 12)[3] > 100);
        assert_eq!(d.len(), 2, "{d:?}");
        assert!(d.iter().any(|m| m.contains("placeholder bars")));
        assert!(d.iter().any(|m| m.contains("icons")));
    }

    #[test]
    fn a_color_it_cannot_read_is_reported_not_dropped_silently() {
        let (img, d) = render(&scene(20.0, 12.0, vec![filled("hotpink")]), 1.0);
        assert_eq!(at(&img, 10, 6)[3], 0);
        assert_eq!(d.len(), 1);
        assert!(d[0].contains("hotpink"));
    }

    #[test]
    fn png_output_decodes_to_the_same_pixels() {
        let s = scene(20.0, 12.0, vec![filled("#336699")]);
        let out = scene_to_png(&s, &[], &RasterOptions::default()).unwrap();
        let dec = png::decode(&out.png).unwrap();
        let (img, _) = rasterize(&s, &[], &RasterOptions::default()).unwrap();
        assert_eq!(
            (dec.width, dec.height, dec.rgba),
            (img.width, img.height, img.rgba)
        );
    }

    #[test]
    fn rejects_bad_scale_background_and_huge_images() {
        let s = scene(20.0, 12.0, vec![]);
        let with = |scale, background: Option<&str>| {
            rasterize(
                &s,
                &[],
                &RasterOptions {
                    scale,
                    background: background.map(Into::into),
                },
            )
        };
        assert!(with(0.0, None).is_err());
        assert!(with(f64::NAN, None).is_err());
        assert!(with(1.0, Some("nope")).is_err());
        assert!(with(1.0e6, None).unwrap_err().0.contains("lower the scale"));
        // A scene with no size is an empty image, not a panic.
        let empty = scene(f64::NAN, -1.0, vec![]);
        assert_eq!(
            rasterize(&empty, &[], &RasterOptions::default())
                .unwrap()
                .0
                .width,
            0
        );
    }
}
