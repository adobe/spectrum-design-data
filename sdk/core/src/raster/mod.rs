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
pub mod font;
pub mod path;
pub mod png;
pub mod shape;

use crate::visual::{icon_fit, Scene, SceneNode};
use canvas::{parse_color, Canvas, Rgba};
use font::{contour_polygon, Font};
use serde_json::Value;
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

/// The bundled text font: Source Sans 3 (SIL Open Font License, `fonts/OFL-SourceSans3.txt`).
#[cfg(feature = "raster-fallback-font")]
pub fn fallback_font() -> FontSource {
    FontSource {
        data: include_bytes!("fonts/SourceSans3VF-Upright.ttf").to_vec(),
        origin: "bundled Source Sans 3".into(),
    }
}

/// A parsed font and the family name scene nodes are matched against.
struct Loaded {
    font: Font,
    origin: String,
    key: String,
}

/// Lowercase letters and digits only, so `Adobe Clean Spectrum VF` matches
/// `adobe-clean-spectrum-vf`.
pub fn family_key(name: &str) -> String {
    name.chars()
        .filter(char::is_ascii_alphanumeric)
        .map(|c| c.to_ascii_lowercase())
        .collect()
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
    fonts: &[FontSource],
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
    let mut loaded = Vec::new();
    for f in fonts {
        match Font::parse(f.data.clone()) {
            Ok(font) => loaded.push(Loaded {
                key: family_key(&font.family().unwrap_or_default()),
                font,
                origin: f.origin.clone(),
            }),
            Err(e) => diags.push(format!("font {}: {e}; ignored", f.origin)),
        }
    }
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
        draw_node(&mut cv, xf, n, &loaded, &mut diags);
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

fn draw_node(cv: &mut Canvas, xf: Xf, n: &SceneNode, fonts: &[Loaded], diags: &mut Vec<String>) {
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
        "text" => draw_text(cv, xf, n, fonts, diags),
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
        "icon" => draw_icon(cv, xf, n, diags),
        _ => {}
    }
}

/// A CSS `font-weight` as a number; anything unreadable is 400, as the layout measures it.
fn css_weight(w: Option<&str>) -> f64 {
    Some(crate::visual::css_font_weight(w))
        .filter(|w| w.bytes().all(|b| b.is_ascii_digit() || b == b'.'))
        .and_then(|w| w.parse().ok())
        .unwrap_or(400.0)
}

/// The font for `n`: the first family in its stack that a supplied font matches, else the
/// first supplied font.
fn pick_font<'a>(
    fonts: &'a [Loaded],
    n: &SceneNode,
    diags: &mut Vec<String>,
) -> Option<&'a Loaded> {
    let wanted: Vec<String> = n
        .font_family
        .as_deref()
        .unwrap_or("")
        .split(',')
        .map(|f| family_key(f.trim_matches(|c: char| c == '\'' || c == '"' || c.is_whitespace())))
        .filter(|k| !k.is_empty())
        .collect();
    let hit = wanted
        .iter()
        .find_map(|w| fonts.iter().find(|f| &f.key == w));
    let chosen = hit.or_else(|| fonts.first())?;
    if hit.is_none() && !wanted.is_empty() {
        note(
            diags,
            format!(
                "{}: no supplied font matches '{}'; text uses {} ({})",
                n.part,
                n.font_family.as_deref().unwrap_or_default(),
                chosen.font.family().unwrap_or_default(),
                chosen.origin
            ),
        );
    }
    Some(chosen)
}

/// Text from the font's outlines, left aligned at the node's `x` and vertically centered on
/// the node's box the way the SVG backend's `dominant-baseline="central"` does.
fn draw_text(cv: &mut Canvas, xf: Xf, n: &SceneNode, fonts: &[Loaded], diags: &mut Vec<String>) {
    let Some(text) = n.text.as_deref().filter(|t| !t.trim().is_empty()) else {
        return;
    };
    let color = color_of(n.color.as_deref(), "text", &n.part, diags).unwrap_or(Rgba::BLACK);
    let Some(f) = pick_font(fonts, n, diags) else {
        note(
            diags,
            "text is drawn as placeholder bars: no font is loaded".into(),
        );
        let width = if n.w > 0.0 {
            n.w
        } else {
            text.chars().count() as f64 * n.font_size * 0.5
        };
        let (bh, cy) = (n.font_size * 0.45, n.y + n.h / 2.0);
        let y = cy - bh / 2.0;
        paint(
            cv,
            xf,
            (n.x, y, n.x + width, y + bh),
            color.with_alpha(0.55),
            Paint::Fill,
            |px, py| rrect_sdf(px, py, n.x, y, width, bh, [bh / 2.0; 4]),
        );
        return;
    };
    // The recipe's weight sets `wght`. `wdth` is always 100: a variable font's own default
    // can be an extreme (Adobe Clean Spectrum VF defaults to its narrowest, 62.5).
    let weight = css_weight(n.font_weight.as_deref());
    let coords = f.font.normalize(&[("wght", weight), ("wdth", 100.0)]);
    if !f.font.axes().iter().any(|a| &a.tag == b"wght") && weight != 400.0 {
        note(
            diags,
            format!(
                "{}: {} has no weight axis; text is drawn at the font's own weight, not {weight}",
                n.part, f.origin
            ),
        );
    }
    let em = n.font_size / f.font.units_per_em();
    if !(em.is_finite() && em > 0.0) {
        return;
    }
    let (ascent, descent) = f.font.ascent_descent();
    let baseline = n.y + n.h / 2.0 + (ascent + descent) / 2.0 * em;
    let tol = 0.1 / (em * xf.s);
    let (mut pen, mut polys) = (n.x, Vec::new());
    for ch in text.chars().filter(|c| !c.is_control()) {
        let g = f.font.glyph_index(ch);
        if g == 0 {
            note(
                diags,
                format!(
                    "{}: {} has no glyph for U+{:04X}",
                    n.part,
                    f.origin,
                    u32::from(ch)
                ),
            );
        }
        match f.font.outline_at(g, &coords) {
            Ok(contours) => {
                for c in &contours {
                    polys.push(
                        contour_polygon(c, tol)
                            .iter()
                            .map(|p| {
                                [
                                    (pen + p[0] * em) * xf.s + xf.tx,
                                    (baseline - p[1] * em) * xf.s + xf.ty,
                                ]
                            })
                            .collect(),
                    );
                }
            }
            Err(e) => note(
                diags,
                format!("{}: glyph for U+{:04X}: {e}", n.part, u32::from(ch)),
            ),
        }
        pen += f.font.advance_at(g, &coords) * em;
    }
    if !path::fill(cv, &polys, path::Rule::NonZero, color) {
        note(
            diags,
            format!("{}: text is too large to draw; skipped", n.part),
        );
    }
}

/// The icon's drawing (its paths filled in the node's color), or the plus-sign placeholder
/// the SVG backend draws when the recipe compile found no drawing for it.
fn draw_icon(cv: &mut Canvas, xf: Xf, n: &SceneNode, diags: &mut Vec<String>) {
    let color = color_of(n.color.as_deref(), "icon", &n.part, diags)
        .or_else(|| n.color.is_none().then_some(Rgba::BLACK));
    let Some(color) = color else { return };
    let drawing = n.icon.as_ref().and_then(|i| i.drawing.as_ref());
    let fit = drawing.and_then(|d| {
        let fit = icon_fit(d.get("viewBox")?.as_str()?, n.x, n.y, n.w, n.h)?;
        Some((fit, d.get("paths")?.as_array()?))
    });
    let Some(((k, tx, ty), paths)) = fit else {
        let (cx, cy) = (n.x + n.w / 2.0, n.y + n.h / 2.0);
        let (r, hw) = (n.w.min(n.h) * 0.35, (n.w / 10.0).max(1.0) / 2.0);
        let bb = (cx - r - hw, cy - r - hw, cx + r + hw, cy + r + hw);
        paint(cv, xf, bb, color, Paint::Fill, |x, y| {
            let bar = |dx: f64, dy: f64| {
                let (px, py) = ((x - cx).abs(), (y - cy).abs());
                (px - dx).max(0.0).hypot((py - dy).max(0.0))
            };
            bar(r, 0.0).min(bar(0.0, r)) - hw
        });
        return;
    };
    // Clockwise about the node's center, as the SVG backend's `rotate(deg cx cy)`.
    let (sin, cos) = n.rotation.unwrap_or(0.0).to_radians().sin_cos();
    let (cx, cy) = (n.x + n.w / 2.0, n.y + n.h / 2.0);
    let to_device = |p: path::Pt| {
        let (x, y) = (p[0] * k + tx - cx, p[1] * k + ty - cy);
        [
            (cx + x * cos - y * sin) * xf.s + xf.tx,
            (cy + x * sin + y * cos) * xf.s + xf.ty,
        ]
    };
    for p in paths {
        let d = p.get("d").and_then(Value::as_str).unwrap_or_default();
        let rule = path::Rule::parse(p.get("fillRule").and_then(Value::as_str));
        match path::flatten(d, 0.1 / (k * xf.s)) {
            Ok(polys) => {
                let polys: Vec<Vec<path::Pt>> = polys
                    .iter()
                    .map(|poly| poly.iter().map(|&q| to_device(q)).collect())
                    .collect();
                if !path::fill(cv, &polys, rule, color) {
                    note(
                        diags,
                        format!("{}: icon path is too large to draw; skipped", n.part),
                    );
                }
            }
            Err(e) => note(
                diags,
                format!(
                    "{}: icon path is not valid SVG path data ({e}); skipped",
                    n.part
                ),
            ),
        }
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
    fn text_is_a_bar_with_a_diagnostic() {
        let mut t = node("text", "label", 2.0, 0.0, 20.0, 12.0);
        t.text = Some("Hi".into());
        t.color = Some("#000000".into());
        let (img, d) = render(&scene(24.0, 12.0, vec![t]), 2.0);
        assert!(at(&img, 20, 12)[3] > 100);
        assert_eq!(d.len(), 1, "{d:?}");
        assert!(d[0].contains("placeholder bars"));
    }

    fn source_sans() -> FontSource {
        FontSource {
            data: include_bytes!("fonts/SourceSans3VF-Upright.ttf").to_vec(),
            origin: "test".into(),
        }
    }

    fn text(s: &str, size: f64) -> SceneNode {
        let mut n = node("text", "label", 0.0, 0.0, 200.0, 100.0);
        n.text = Some(s.into());
        n.font_size = size;
        n.color = Some("#000000".into());
        n
    }

    fn render_text(n: SceneNode) -> (Image, Vec<String>) {
        let o = RasterOptions {
            scale: 1.0,
            background: None,
        };
        rasterize(&scene(200.0, 100.0, vec![n]), &[source_sans()], &o).unwrap()
    }

    /// Separate ink runs along a row.
    fn runs(img: &Image, y: u32) -> usize {
        let mut prev = false;
        (0..img.width)
            .filter(|&x| {
                let on = at(img, x, y)[3] > 127;
                let start = on && !prev;
                prev = on;
                start
            })
            .count()
    }

    fn ink_rows(img: &Image) -> Option<(u32, u32)> {
        let rows: Vec<u32> = (0..img.height)
            .filter(|&y| (0..img.width).any(|x| at(img, x, y)[3] > 127))
            .collect();
        Some((*rows.first()?, *rows.last()?))
    }

    #[test]
    fn text_draws_glyph_outlines_and_advances_the_pen() {
        let (img, d) = render_text(text("H", 80.0));
        let (top, bottom) = ink_rows(&img).expect("H has ink");
        let near_top = top + (bottom - top) / 5;
        // Two stems above the crossbar, and some row where the crossbar joins them.
        assert_eq!(runs(&img, near_top), 2);
        assert!(
            (top..=bottom).any(|y| runs(&img, y) == 1),
            "no crossbar row"
        );
        assert!(d.is_empty(), "{d:?}");
        let (two, _) = render_text(text("HH", 80.0));
        assert_eq!(runs(&two, near_top), 4);
    }

    #[test]
    fn text_is_centered_on_its_box_like_dominant_baseline_central() {
        let (img, _) = render_text(text("H", 40.0));
        let (top, bottom) = ink_rows(&img).unwrap();
        let center = f64::from(top + bottom) / 2.0;
        assert!((center - 50.0).abs() < 8.0, "ink center {center}");
        assert!(bottom - top > 20, "cap height at 40px is about 26px");
    }

    #[test]
    fn text_follows_scale_and_position() {
        let mut n = text("H", 40.0);
        n.x = 100.0;
        let (img, _) = render_text(n);
        assert!((0..100).all(|x| (0..img.height).all(|y| at(&img, x, y)[3] == 0)));
        assert!((100..200).any(|x| (0..img.height).any(|y| at(&img, x, y)[3] > 0)));
        let o = RasterOptions {
            scale: 2.0,
            background: None,
        };
        let big = rasterize(
            &scene(200.0, 100.0, vec![text("H", 40.0)]),
            &[source_sans()],
            &o,
        )
        .unwrap()
        .0;
        assert_eq!((big.width, big.height), (400, 200));
        let (top, bottom) = ink_rows(&big).unwrap();
        assert!(bottom - top > 45, "twice the cap height");
    }

    #[test]
    fn text_reports_a_missing_glyph_and_an_unmatched_family() {
        let (_, d) = render_text(text("\u{10FFFF}", 40.0));
        assert!(
            d.iter().any(|m| m.contains("no glyph for U+10FFFF")),
            "{d:?}"
        );
        let mut n = text("H", 40.0);
        n.font_family = Some("Adobe Clean, sans-serif".into());
        let (img, d) = render_text(n);
        assert!(ink_rows(&img).is_some(), "falls back to the supplied font");
        assert!(
            d.iter().any(|m| m.contains("no supplied font matches")),
            "{d:?}"
        );
        let mut n = text("H", 40.0);
        n.font_family = Some("'Source Sans 3 VF', serif".into());
        assert!(render_text(n).1.is_empty());
    }

    #[test]
    fn an_unreadable_font_is_reported_and_text_falls_back_to_bars() {
        let junk = FontSource {
            data: b"OTTO....".to_vec(),
            origin: "adobe.otf".into(),
        };
        let o = RasterOptions {
            scale: 1.0,
            background: None,
        };
        let (img, d) =
            rasterize(&scene(200.0, 100.0, vec![text("Hi", 40.0)]), &[junk], &o).unwrap();
        assert!(
            d.iter()
                .any(|m| m.contains("adobe.otf") && m.contains("CFF") && m.contains("ignored")),
            "{d:?}"
        );
        assert!(d.iter().any(|m| m.contains("placeholder bars")));
        assert!(ink_rows(&img).is_some());
    }

    #[test]
    fn the_recipe_weight_changes_the_glyphs() {
        let ink = |weight: &str| {
            let mut n = text("H", 80.0);
            n.font_weight = Some(weight.into());
            let (img, d) = render_text(n);
            assert!(d.is_empty(), "{d:?}");
            img.rgba.chunks(4).map(|p| u64::from(p[3])).sum::<u64>()
        };
        let (light, regular, bold, black) = (ink("200"), ink("400"), ink("700"), ink("900"));
        assert!(
            light < regular && regular < bold && bold < black,
            "{light} {regular} {bold} {black}"
        );
        assert_eq!(ink("bold"), bold);
        assert_eq!(ink("nonsense"), regular, "an unreadable weight is 400");
    }

    #[test]
    fn family_keys_ignore_case_spaces_and_hyphens() {
        assert_eq!(
            family_key("Adobe Clean Spectrum VF"),
            family_key("adobe-clean-spectrum-vf")
        );
        assert_ne!(family_key("Adobe Clean"), family_key("Adobe Clean Serif"));
    }

    fn icon(drawing: Option<serde_json::Value>, color: &str) -> SceneNode {
        let mut n = node("icon", "mark", 0.0, 0.0, 10.0, 10.0);
        n.color = Some(color.into());
        n.icon = Some(crate::visual::IconRef {
            set: "ui".into(),
            name: "t".into(),
            drawing,
        });
        n
    }

    fn drawing(d: &str, rule: Option<&str>) -> serde_json::Value {
        let mut p = serde_json::json!({ "d": d });
        if let Some(r) = rule {
            p["fillRule"] = r.into();
        }
        serde_json::json!({ "viewBox": "0 0 10 10", "paths": [p] })
    }

    #[test]
    fn an_icon_fills_its_paths_scaled_into_its_box() {
        // Drawn at 20 units from a 10-unit viewBox: the 10x4 strip becomes 20x8.
        let mut n = icon(Some(drawing("M0 0h10v4H0z", None)), "#0000ff");
        n.w = 20.0;
        n.h = 20.0;
        let (img, d) = render(&scene(20.0, 20.0, vec![n]), 1.0);
        assert_eq!(at(&img, 10, 4), [0, 0, 255, 255]);
        assert_eq!(at(&img, 10, 12)[3], 0);
        assert!(d.is_empty());
    }

    #[test]
    fn an_icon_rotates_clockwise_about_its_center() {
        let mut n = icon(Some(drawing("M0 0h10v4H0z", None)), "#000000");
        n.rotation = Some(90.0);
        let (img, _) = render(&scene(10.0, 10.0, vec![n]), 1.0);
        // The top strip turns into the right-hand strip.
        assert_eq!(at(&img, 8, 5)[3], 255);
        assert_eq!(at(&img, 5, 2)[3], 0);
        assert_eq!(at(&img, 1, 5)[3], 0);
    }

    #[test]
    fn an_icon_honours_even_odd_fill_rule() {
        let d = "M0 0h10v10H0zM3 3h4v4H3z";
        let center = |rule| {
            let n = icon(Some(drawing(d, rule)), "#000000");
            at(&render(&scene(10.0, 10.0, vec![n]), 1.0).0, 5, 5)[3]
        };
        assert_eq!(center(None), 255);
        assert_eq!(center(Some("evenodd")), 0);
    }

    #[test]
    fn an_icon_without_a_drawing_is_a_plus_and_bad_path_data_is_reported() {
        let (img, d) = render(&scene(10.0, 10.0, vec![icon(None, "#ff0000")]), 4.0);
        assert_eq!(at(&img, 20, 20), [255, 0, 0, 255]);
        assert_eq!(at(&img, 20, 5), [255, 0, 0, 255]);
        assert_eq!(at(&img, 4, 4)[3], 0);
        assert!(d.is_empty());

        let (img, d) = render(
            &scene(
                10.0,
                10.0,
                vec![icon(Some(drawing("L1 1", None)), "#000000")],
            ),
            1.0,
        );
        assert_eq!(at(&img, 5, 5)[3], 0);
        assert!(d[0].contains("not valid SVG path data"), "{d:?}");
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
