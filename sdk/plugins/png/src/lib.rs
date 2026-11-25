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
//! bytes (the `fallback-font` feature bundles one open font for callers that supply none).

pub mod canvas;
pub mod font;
pub mod path;
pub mod png;
// Font discovery reads the disk, which wasm32 cannot, so the renderer plugin is native only.
#[cfg(not(target_arch = "wasm32"))]
pub mod renderer;
pub mod shape;
#[cfg(test)]
mod testutil;

use canvas::{parse_color, Canvas, Rgba};
pub use design_data_core::scene_render::FontSource;
use design_data_core::visual::{icon_fit, Scene, SceneNode};
use font::{contour_polygon, Font};
#[cfg(not(target_arch = "wasm32"))]
pub use renderer::{layout_metrics, PngRenderer};
use serde_json::Value;
use shape::{paint, paint_with, rrect_sdf, Paint, Xf};

/// Pixels allowed in one image, so a bad `scale` cannot allocate without bound.
const MAX_PIXELS: f64 = 64.0e6;

/// The bundled text font: Source Sans 3 (SIL Open Font License, `fonts/OFL-SourceSans3.txt`).
#[cfg(feature = "fallback-font")]
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
    let press_xf = |p: &design_data_core::visual::Press| base.pressed(p.scale, p.cx, p.cy);
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

/// Signed distance (negative inside) to the squares of a checkerboard that are not the
/// top-left one, relative to its origin: the distance to the nearest cell edge, signed by parity.
fn checker_sdf(u: f64, v: f64, size: f64) -> f64 {
    let (cu, cv) = ((u / size).floor(), (v / size).floor());
    let edge = |t: f64| {
        let m = t.rem_euclid(size);
        m.min(size - m)
    };
    let d = edge(u).min(edge(v));
    if (cu + cv).rem_euclid(2.0) == 1.0 {
        -d
    } else {
        d
    }
}

/// The color of `g` at the scene point `(x, y)` of the box `(bx, by, bw, bh)`: the point's
/// projection on the gradient line, in pixels, picks the segment, and the two stops' colors mix
/// (not premultiplied, as SVG does). Working in pixels keeps the bands square to the line.
fn gradient_color(
    g: &design_data_core::visual::Gradient,
    stops: &[(f64, Rgba)],
    (bx, by, bw, bh): (f64, f64, f64, f64),
    (x, y): (f64, f64),
) -> Rgba {
    let (fx, fy) = (bx + g.from[0] * bw, by + g.from[1] * bh);
    let (dx, dy) = (bx + g.to[0] * bw - fx, by + g.to[1] * bh - fy);
    let len2 = dx * dx + dy * dy;
    let t = if len2 > 0.0 {
        (((x - fx) * dx + (y - fy) * dy) / len2).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let (first, last) = (stops[0], stops[stops.len() - 1]);
    if t <= first.0 {
        return first.1;
    }
    if t >= last.0 {
        return last.1;
    }
    let i = stops
        .iter()
        .rposition(|s| s.0 <= t)
        .unwrap_or(0)
        .min(stops.len() - 2);
    let ((o0, c0), (o1, c1)) = (stops[i], stops[i + 1]);
    let k = if o1 > o0 {
        ((t - o0) / (o1 - o0)) as f32
    } else {
        1.0
    };
    let mix = |a: f32, b: f32| a + (b - a) * k;
    Rgba {
        r: mix(c0.r, c1.r),
        g: mix(c0.g, c1.g),
        b: mix(c0.b, c1.b),
        a: mix(c0.a, c1.a),
    }
}

fn corner_radii(n: &SceneNode) -> [f64; 4] {
    n.radii.unwrap_or([n.radius; 4])
}

/// The node's stroke color with `strokeOpacity` multiplied into its alpha.
fn stroke_color(n: &SceneNode, diags: &mut Vec<String>) -> Option<Rgba> {
    let c = color_of(n.stroke.as_deref(), "stroke", &n.part, diags)?;
    let o = n.stroke_opacity.unwrap_or(1.0).clamp(0.0, 1.0) as f32;
    Some(c.with_alpha(o))
}

/// Signed distance from `(x, y)` to a stroke of half-width `hw` along `poly`: round caps and
/// joins, or flat caps with round joins inside the polyline.
fn dash_sdf(poly: &[[f64; 2]], x: f64, y: f64, hw: f64, round_cap: bool) -> f64 {
    let mut best = f64::INFINITY;
    for (i, w) in poly.windows(2).enumerate() {
        let (a, b) = (w[0], w[1]);
        let (dx, dy) = (b[0] - a[0], b[1] - a[1]);
        let len = dx.hypot(dy).max(1e-12);
        let t = ((x - a[0]) * dx + (y - a[1]) * dy) / len;
        let perp = ((x - a[0]) * dy - (y - a[1]) * dx).abs() / len;
        let d = if round_cap {
            let to_segment = if t < 0.0 {
                (x - a[0]).hypot(y - a[1])
            } else if t > len {
                (x - b[0]).hypot(y - b[1])
            } else {
                perp
            };
            to_segment - hw
        } else {
            let flat = (perp - hw).max((-t).max(t - len));
            if i > 0 {
                flat.min((x - a[0]).hypot(y - a[1]) - hw)
            } else {
                flat
            }
        };
        best = best.min(d);
    }
    best
}

/// A dashed or per-side stroke: the runs of `stroke::node_runs`, cut into dashes and drawn as
/// one shape, so overlapping pieces do not blend twice.
fn draw_styled_stroke(cv: &mut Canvas, xf: Xf, n: &SceneNode, color: Rgba) {
    let (Some(st), Some(runs)) = (&n.stroke_style, design_data_core::stroke::node_runs(n)) else {
        return;
    };
    let hw = n.stroke_width / 2.0;
    let pieces: Vec<(Vec<[f64; 2]>, [f64; 4])> = runs
        .iter()
        .flat_map(|r| {
            design_data_core::stroke::dashes(
                &design_data_core::stroke::flatten(r),
                st.dash,
                r.offset,
            )
        })
        .filter(|p| p.len() > 1)
        .map(|p| {
            let bb = p
                .iter()
                .fold([f64::MAX, f64::MAX, f64::MIN, f64::MIN], |b, q| {
                    [
                        b[0].min(q[0]),
                        b[1].min(q[1]),
                        b[2].max(q[0]),
                        b[3].max(q[1]),
                    ]
                });
            (p, bb)
        })
        .collect();
    let reach = hw + 1.0 / xf.s.max(1e-3);
    let sdf = |x: f64, y: f64| {
        pieces
            .iter()
            .filter(|(_, b)| {
                x >= b[0] - reach && x <= b[2] + reach && y >= b[1] - reach && y <= b[3] + reach
            })
            .map(|(p, _)| dash_sdf(p, x, y, hw, st.round_cap))
            .fold(f64::INFINITY, f64::min)
    };
    paint(
        cv,
        xf,
        (n.x - hw, n.y - hw, n.x + n.w + hw, n.y + n.h + hw),
        color,
        Paint::Fill,
        sdf,
    );
}

fn draw_node(cv: &mut Canvas, xf: Xf, n: &SceneNode, fonts: &[Loaded], diags: &mut Vec<String>) {
    let bounds = |pad: f64| (n.x - pad, n.y - pad, n.x + n.w + pad, n.y + n.h + pad);
    match n.kind.as_str() {
        "box" if n.path.is_some() => draw_path_box(cv, xf, n, diags),
        "box" => {
            for sh in n.shadow.iter().rev() {
                if let Some(c) = color_of(Some(sh.color.as_str()), "shadow", &n.part, diags) {
                    shape::paint_shadow(
                        cv,
                        xf,
                        (n.x, n.y, n.w, n.h),
                        corner_radii(n),
                        (sh.x, sh.y, sh.blur, sh.spread),
                        c,
                    );
                }
            }
            let gradient = n.gradient.as_ref().and_then(|g| {
                let stops: Option<Vec<(f64, Rgba)>> = g
                    .stops
                    .iter()
                    .map(|s| {
                        Some((
                            s.offset,
                            color_of(Some(s.color.as_str()), "gradient", &n.part, diags)?,
                        ))
                    })
                    .collect();
                Some((g, stops?))
            });
            if let Some((g, stops)) = gradient {
                let r = corner_radii(n);
                paint_with(
                    cv,
                    xf,
                    bounds(0.0),
                    Paint::Fill,
                    |x, y| rrect_sdf(x, y, n.x, n.y, n.w, n.h, r),
                    |x, y| gradient_color(g, &stops, (n.x, n.y, n.w, n.h), (x, y)),
                );
            } else if let Some(c) = color_of(n.fill.as_deref(), "fill", &n.part, diags) {
                let r = corner_radii(n);
                paint(cv, xf, bounds(0.0), c, Paint::Fill, |x, y| {
                    rrect_sdf(x, y, n.x, n.y, n.w, n.h, r)
                });
            }
            if let Some(p) = &n.pattern {
                if let Some(c) = color_of(Some(p.alt.as_str()), "patternFill", &n.part, diags) {
                    let r = corner_radii(n);
                    paint(cv, xf, bounds(0.0), c, Paint::Fill, |x, y| {
                        rrect_sdf(x, y, n.x, n.y, n.w, n.h, r).max(checker_sdf(
                            x - n.x,
                            y - n.y,
                            p.size,
                        ))
                    });
                }
            }
            if let Some(img) = n.image.as_ref().filter(|i| !i.href.is_empty()) {
                draw_image(cv, xf, n, img, diags);
            }
            if n.stroke_style.is_some() {
                if let Some(c) = stroke_color(n, diags) {
                    draw_styled_stroke(cv, xf, n, c);
                }
            } else if n.stroke_width > 0.0 {
                if let Some(c) = stroke_color(n, diags) {
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
        "ring" if n.stroke_style.is_some() => {
            if let Some(c) = stroke_color(n, diags) {
                draw_styled_stroke(cv, xf, n, c);
            }
        }
        "ring" => {
            if let Some(c) = stroke_color(n, diags) {
                let hw = n.stroke_width / 2.0;
                paint(cv, xf, bounds(hw), c, Paint::Band(hw), |x, y| {
                    rrect_sdf(x, y, n.x, n.y, n.w, n.h, [n.radius; 4])
                });
            }
        }
        "text" => {
            draw_text(cv, xf, n, fonts, diags);
            draw_underline(cv, xf, n, diags);
        }
        "progress" => {
            let (cx, cy, r, sw) = design_data_core::visual::progress_geometry(n);
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
            let sweep = n.sweep.unwrap_or(0.25);
            if let (true, Some(c)) = (
                sweep > 0.0,
                color_of(n.color.as_deref(), "color", &n.part, diags),
            ) {
                // An arc from the top, clockwise, with round caps; no sweep is a quarter.
                let end = sweep * std::f64::consts::TAU;
                let (ex, ey) = (cx + r * end.sin(), cy - r * end.cos());
                paint(cv, xf, bb, c, Paint::Band(sw / 2.0), |x, y| {
                    let (qx, qy) = (x - cx, y - cy);
                    let a = qx.atan2(-qy).rem_euclid(std::f64::consts::TAU);
                    if sweep >= 1.0 || a <= end {
                        qx.hypot(qy) - r
                    } else {
                        (x - cx).hypot(y - (cy - r)).min((x - ex).hypot(y - ey))
                    }
                });
            }
        }
        "icon" => draw_icon(cv, xf, n, diags),
        _ => {}
    }
}

/// The box's image, sampled bilinearly (as the SVG renderers scale) from the pixels the scene
/// builder already accepted, and clipped to the box's rounded shape and to the image's own edge.
fn draw_image(
    cv: &mut Canvas,
    xf: Xf,
    n: &SceneNode,
    img: &design_data_core::visual::ImageFill,
    diags: &mut Vec<String>,
) {
    let px = match design_data_core::image::decode_data_uri(&img.href) {
        Ok(p) => p,
        Err(e) => {
            diags.push(format!("part '{}': image not drawn: {e}", n.part));
            return;
        }
    };
    let [dx, dy, dw, dh] = img.dest;
    let (ix, iy) = (n.x + dx, n.y + dy);
    let (iw, ih) = (px.width as usize, px.height as usize);
    let r = corner_radii(n);
    let texel = |tx: isize, ty: isize| -> [f32; 4] {
        let (x, y) = (
            tx.clamp(0, iw as isize - 1) as usize,
            ty.clamp(0, ih as isize - 1) as usize,
        );
        let p = &px.rgba[(y * iw + x) * 4..][..4];
        let a = f32::from(p[3]) / 255.0;
        [
            f32::from(p[0]) / 255.0 * a,
            f32::from(p[1]) / 255.0 * a,
            f32::from(p[2]) / 255.0 * a,
            a,
        ]
    };
    paint_with(
        cv,
        xf,
        (n.x, n.y, n.x + n.w, n.y + n.h),
        Paint::Fill,
        |x, y| {
            rrect_sdf(x, y, n.x, n.y, n.w, n.h, r).max(rrect_sdf(x, y, ix, iy, dw, dh, [0.0; 4]))
        },
        |x, y| {
            let (u, v) = (
                (x - ix) / dw * iw as f64 - 0.5,
                (y - iy) / dh * ih as f64 - 0.5,
            );
            let (x0, y0) = (u.floor(), v.floor());
            let (fx, fy) = ((u - x0) as f32, (v - y0) as f32);
            let (x0, y0) = (x0 as isize, y0 as isize);
            let mut m = [0f32; 4];
            for (tx, ty, wgt) in [
                (x0, y0, (1.0 - fx) * (1.0 - fy)),
                (x0 + 1, y0, fx * (1.0 - fy)),
                (x0, y0 + 1, (1.0 - fx) * fy),
                (x0 + 1, y0 + 1, fx * fy),
            ] {
                let t = texel(tx, ty);
                (0..4).for_each(|i| m[i] += t[i] * wgt);
            }
            match m[3] > 0.0 {
                true => Rgba {
                    r: m[0] / m[3],
                    g: m[1] / m[3],
                    b: m[2] / m[3],
                    a: m[3],
                },
                false => Rgba {
                    r: 0.0,
                    g: 0.0,
                    b: 0.0,
                    a: 0.0,
                },
            }
        },
    );
}

/// A box with a `path`: the shape filled (and checkered), stroked on its outline with round
/// joins, and shadowed by its blurred silhouette (spread is not applied to a shape).
fn draw_path_box(cv: &mut Canvas, xf: Xf, n: &SceneNode, diags: &mut Vec<String>) {
    let Some(shape) = &n.path else { return };
    let polys = match path::flatten(&shape.d, 0.25 / xf.s.max(1e-3)) {
        Ok(p) => p,
        Err(e) => return note(diags, format!("{}: path: {e}; skipped", n.part)),
    };
    let rule = if shape.even_odd {
        path::Rule::EvenOdd
    } else {
        path::Rule::NonZero
    };
    let at = |dx: f64, dy: f64| -> Vec<Vec<path::Pt>> {
        polys
            .iter()
            .map(|p| {
                p.iter()
                    .map(|q| {
                        [
                            (q[0] + n.x + dx) * xf.s + xf.tx,
                            (q[1] + n.y + dy) * xf.s + xf.ty,
                        ]
                    })
                    .collect()
            })
            .collect()
    };
    let big = |ok: bool, what: &str, diags: &mut Vec<String>| {
        if !ok {
            note(
                diags,
                format!("{}: path {what} is too large to draw; skipped", n.part),
            );
        }
    };
    let own = at(0.0, 0.0);
    for sh in n.shadow.iter().rev() {
        if let Some(c) = color_of(Some(sh.color.as_str()), "shadow", &n.part, diags) {
            let sigma = sh.blur.min(design_data_core::visual::MAX_SHADOW_BLUR) / 2.0 * xf.s;
            big(
                path::paint_shadow(cv, &at(sh.x, sh.y), &own, rule, sigma, c),
                "shadow",
                diags,
            );
        }
    }
    if let Some(c) = color_of(n.fill.as_deref(), "fill", &n.part, diags) {
        big(path::fill(cv, &own, rule, c), "fill", diags);
    }
    if let Some(p) = &n.pattern {
        if let Some(c) = color_of(Some(p.alt.as_str()), "patternFill", &n.part, diags) {
            let ok = path::fill_cov(&own, rule, &mut |x, y, cov| {
                let (sx, sy) = (
                    ((x as f64 + 0.5) - xf.tx) / xf.s - n.x,
                    ((y as f64 + 0.5) - xf.ty) / xf.s - n.y,
                );
                let chk = (0.5 - checker_sdf(sx, sy, p.size) * xf.s).clamp(0.0, 1.0) as f32;
                cv.blend(x, y, c, cov * chk);
            });
            big(ok, "pattern", diags);
        }
    }
    if n.stroke_width > 0.0 {
        if let Some(c) = stroke_color(n, diags) {
            let hw = n.stroke_width / 2.0;
            let scene: Vec<Vec<path::Pt>> = polys
                .iter()
                .map(|p| p.iter().map(|q| [q[0] + n.x, q[1] + n.y]).collect())
                .collect();
            if let Some(o) = path::Outline::new(&scene, hw + 1.0 / xf.s) {
                let pad = hw + 1.0;
                paint(
                    cv,
                    xf,
                    (n.x - pad, n.y - pad, n.x + n.w + pad, n.y + n.h + pad),
                    c,
                    Paint::Band(hw),
                    |x, y| o.dist(x, y),
                );
            }
        }
    }
}

/// A CSS `font-weight` as a number; anything unreadable is 400, as the layout measures it.
fn css_weight(w: Option<&str>) -> f64 {
    Some(design_data_core::visual::css_font_weight(w))
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

/// The line under a text node that binds `textDecoration: underline`, in the text's color.
fn draw_underline(cv: &mut Canvas, xf: Xf, n: &SceneNode, diags: &mut Vec<String>) {
    let Some(u) = n.underline else { return };
    let color = color_of(n.color.as_deref(), "text", &n.part, diags).unwrap_or(Rgba::BLACK);
    let (x, y, w, h) = u.rect(n);
    paint(
        cv,
        xf,
        (x, y, x + w, y + h),
        color,
        Paint::Fill,
        |px, py| rrect_sdf(px, py, x, y, w, h, [0.0; 4]),
    );
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
    use design_data_core::visual::{Layout, Press};

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
            sweep: None,
            radius: 0.0,
            radii: None,
            text: None,
            font_size: 14.0,
            font_weight: None,
            font_family: None,
            color: None,
            icon: None,
            rotation: None,
            underline: None,
            pattern: None,
            gradient: None,
            image: None,
            shadow: Vec::new(),
            path: None,
            stroke_opacity: None,
            tokens: vec![],
            stroke_style: None,
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
    fn a_drop_shadow_blurs_outside_the_box_and_never_inside_it() {
        let mut n = node("box", "root", 20.0, 20.0, 20.0, 20.0);
        n.fill = Some("rgba(255, 255, 255, 0)".into());
        n.shadow = vec![design_data_core::visual::Shadow {
            x: 0.0,
            y: 4.0,
            blur: 8.0,
            spread: 0.0,
            color: "#000000".into(),
        }];
        let s = scene(60.0, 60.0, vec![n]);
        let (img, d) = render(&s, 1.0);
        assert!(d.is_empty(), "{d:?}");
        // Inside the box nothing is drawn, though the shadow lies beneath it.
        assert_eq!(at(&img, 30, 30)[3], 0);
        // Below the box the shadow is partial: darker near the box than farther away.
        let (near, far) = (at(&img, 30, 41)[3], at(&img, 30, 47)[3]);
        assert!(near > far && far > 0, "{near} {far}");
        // Above it the shadow is weaker than below (offset down), and left/right mirror.
        assert!(at(&img, 30, 17)[3] < near);
        assert_eq!(at(&img, 14, 41), at(&img, 45, 41));
        // Far outside there is none, and the render is deterministic.
        assert_eq!(at(&img, 2, 2)[3], 0);
        assert_eq!(render(&s, 1.0).0.rgba, img.rgba);
    }

    fn shadow(x: f64, y: f64, blur: f64, color: &str) -> design_data_core::visual::Shadow {
        design_data_core::visual::Shadow {
            x,
            y,
            blur,
            spread: 0.0,
            color: color.into(),
        }
    }

    #[test]
    fn the_blur_edge_follows_a_gaussian_of_half_the_blur() {
        // Beside a wide box the edge is a half-plane: at distance d the alpha is
        // Phi(-d / sigma). Blur 8 is sigma 4; the rows sampled are 4.5 and 8.5px below the
        // edge: Phi(-1.125) = 0.130 (33/255) and Phi(-2.125) = 0.017 (4/255). A doubled or
        // halved sigma misses both.
        let mut n = node("box", "root", 20.0, 20.0, 200.0, 20.0);
        n.shadow = vec![shadow(0.0, 0.0, 8.0, "#000000")];
        let (img, _) = render(&scene(240.0, 80.0, vec![n]), 1.0);
        let (a4, a8) = (at(&img, 120, 44)[3] as i32, at(&img, 120, 48)[3] as i32);
        assert!((a4 - 33).abs() <= 2, "{a4}");
        assert!((a8 - 4).abs() <= 2, "{a8}");
    }

    #[test]
    fn the_first_shadow_layer_is_drawn_on_top() {
        let mut n = node("box", "root", 10.0, 10.0, 10.0, 10.0);
        n.shadow = vec![
            shadow(12.0, 0.0, 0.0, "#0000ff"),
            shadow(16.0, 0.0, 0.0, "#ff0000"),
        ];
        let (img, _) = render(&scene(50.0, 30.0, vec![n]), 1.0);
        // x 28..32 is covered by both layers: the first (blue) wins.
        assert_eq!(at(&img, 30, 15), [0, 0, 255, 255]);
        assert_eq!(at(&img, 35, 15), [255, 0, 0, 255]);
    }

    #[test]
    fn a_huge_blur_or_offset_neither_panics_nor_exhausts_memory() {
        let mut n = node("box", "root", 10.0, 10.0, 10.0, 10.0);
        n.shadow = vec![
            shadow(0.0, 0.0, 1e9, "#000000"),
            shadow(1e9, -1e9, 8.0, "#000000"),
        ];
        let (img, _) = render(&scene(30.0, 30.0, vec![n]), 2.0);
        assert_eq!(img.width, 60);
    }

    #[test]
    fn node_opacity_dims_the_shadow_with_the_node() {
        let mut n = node("box", "root", 10.0, 10.0, 10.0, 10.0);
        n.shadow = vec![shadow(12.0, 0.0, 0.0, "#000000")];
        let mut s = scene(40.0, 30.0, vec![n]);
        s.opacity = Some(0.5);
        let (img, _) = render(&s, 1.0);
        assert_eq!(at(&img, 26, 15)[3], 128);
    }

    #[test]
    fn a_drop_shadow_with_no_blur_is_a_hard_offset_copy() {
        let mut n = node("box", "root", 10.0, 10.0, 10.0, 10.0);
        n.shadow = vec![design_data_core::visual::Shadow {
            x: 5.0,
            y: 0.0,
            blur: 0.0,
            spread: 0.0,
            color: "#000000".into(),
        }];
        let (img, _) = render(&scene(30.0, 30.0, vec![n]), 1.0);
        assert_eq!(at(&img, 22, 15), [0, 0, 0, 255]);
        assert_eq!(at(&img, 26, 15)[3], 0);
        assert_eq!(at(&img, 12, 15)[3], 0);
    }

    #[test]
    fn a_gradient_mixes_its_stops_along_the_line() {
        let color = |s: &str| parse_color(s).unwrap();
        let stops = [
            (0.0, color("#ff0000")),
            (0.5, color("#0000ff")),
            (1.0, color("#00ff00")),
        ];
        let g = design_data_core::visual::Gradient {
            from: [0.0, 0.5],
            to: [1.0, 0.5],
            stops: Vec::new(),
        };
        let at = |u: f64, v: f64| gradient_color(&g, &stops, (0.0, 0.0, 1.0, 1.0), (u, v));
        // The ends and the middle stop are the stops; a quarter is half way to the next one.
        assert_eq!((at(0.0, 0.5).r, at(0.0, 0.5).b), (1.0, 0.0));
        assert_eq!((at(0.5, 0.0).b, at(0.5, 1.0).b), (1.0, 1.0));
        assert_eq!((at(1.0, 0.5).g, at(1.0, 0.5).r), (1.0, 0.0));
        let q = at(0.25, 0.5);
        assert!(
            (q.r - 0.5).abs() < 1e-6 && (q.b - 0.5).abs() < 1e-6,
            "{q:?}"
        );
        // Outside the line the end colors hold.
        assert_eq!(at(-3.0, 0.5).r, 1.0);
        assert_eq!(at(9.0, 0.5).g, 1.0);
    }

    #[test]
    fn a_pattern_alternates_squares_starting_with_the_fill() {
        let mut n = node("box", "root", 0.0, 0.0, 16.0, 16.0);
        n.fill = Some("#ffffff".into());
        n.pattern = Some(design_data_core::visual::Pattern {
            alt: "#000000".into(),
            size: 4.0,
        });
        let (img, d) = render(&scene(16.0, 16.0, vec![n]), 1.0);
        // Pixel centers inside the four cells of one tile: fill, alt / alt, fill.
        assert_eq!(at(&img, 2, 2), [255, 255, 255, 255]);
        assert_eq!(at(&img, 6, 2), [0, 0, 0, 255]);
        assert_eq!(at(&img, 2, 6), [0, 0, 0, 255]);
        assert_eq!(at(&img, 6, 6), [255, 255, 255, 255]);
        assert_eq!(at(&img, 10, 2), [255, 255, 255, 255]);
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
    fn a_dashed_stroke_alternates_dashes_and_gaps_on_the_sides_it_draws() {
        let mut n = node("box", "root", 0.0, 0.0, 24.0, 10.0);
        n.stroke = Some("#ff0000".into());
        n.stroke_width = 2.0;
        n.stroke_style = Some(design_data_core::stroke::StrokeStyle {
            dash: Some([4.0, 4.0]),
            round_cap: false,
            sides: Some([true, false, true, false]),
            scene_anchor: false,
        });
        let (img, d) = render(&scene(24.0, 10.0, vec![n]), 1.0);
        assert!(d.is_empty(), "{d:?}");
        // Top edge: dash over x 0..4, gap 4..8, dash 8..12.
        assert_eq!(at(&img, 2, 1), [255, 0, 0, 255]);
        assert_eq!(at(&img, 6, 1), [0, 0, 0, 0]);
        assert_eq!(at(&img, 10, 1), [255, 0, 0, 255]);
        // The bottom edge is drawn too (its pattern starts at the right end, going clockwise),
        // the left and right sides are not.
        assert_eq!(at(&img, 21, 8), [255, 0, 0, 255]);
        assert_eq!(at(&img, 17, 8), [0, 0, 0, 0]);
        assert_eq!(at(&img, 0, 5), [0, 0, 0, 0]);
        assert_eq!(at(&img, 23, 5), [0, 0, 0, 0]);
    }

    #[test]
    fn a_styled_stroke_follows_the_rounded_corner_arc() {
        let mut n = node("box", "root", 0.0, 0.0, 24.0, 12.0);
        n.radius = 6.0;
        n.stroke = Some("#ff0000".into());
        n.stroke_width = 2.0;
        n.stroke_style = Some(design_data_core::stroke::StrokeStyle {
            dash: Some([200.0, 1.0]),
            round_cap: false,
            sides: Some([true, false, true, true]),
            scene_anchor: false,
        });
        let (img, _) = render(&scene(24.0, 12.0, vec![n]), 1.0);
        // The top-left arc is centered on (6, 6) with radius 5: its 45 degree point is drawn,
        // and the inside of the corner and the cell's outer corner are not.
        assert_eq!(at(&img, 2, 2), [255, 0, 0, 255]);
        assert_eq!(at(&img, 4, 4), [0, 0, 0, 0]);
        assert_eq!(at(&img, 0, 0)[3], 0);
        // The same at the bottom-left, and the undrawn right side stays empty.
        assert_eq!(at(&img, 2, 9), [255, 0, 0, 255]);
        assert_eq!(at(&img, 23, 6)[3], 0);
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
    fn progress_sweep_fills_that_share_of_the_ring_clockwise_from_the_top() {
        let mut n = node("progress", "p", 0.0, 0.0, 36.0, 36.0);
        n.stroke = Some("#cccccc".into());
        n.color = Some("#0000ff".into());
        n.sweep = Some(0.5);
        let (img, _) = render(&scene(36.0, 36.0, vec![n.clone()]), 2.0);
        // Right half is the arc, the left half the track.
        assert_eq!(at(&img, 68, 36)[2], 255);
        assert_eq!(at(&img, 68, 36)[0], 0);
        assert_eq!(at(&img, 4, 36), [204, 204, 204, 255]);
        // No sweep draws no arc at all.
        n.sweep = Some(0.0);
        let (img, _) = render(&scene(36.0, 36.0, vec![n]), 2.0);
        assert_eq!(at(&img, 68, 36), [204, 204, 204, 255]);
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
    fn stroke_opacity_multiplies_the_stroke_alpha() {
        let mut n = node("box", "frame", 2.0, 2.0, 12.0, 12.0);
        n.stroke = Some("#000000".into());
        n.stroke_width = 2.0;
        n.stroke_opacity = Some(0.5);
        let (img, _) = render(&scene(16.0, 16.0, vec![n]), 1.0);
        let a = at(&img, 8, 2)[3];
        assert!((127..=129).contains(&a), "{a}");
        assert_eq!(at(&img, 8, 8)[3], 0);
    }

    #[test]
    fn underline_is_a_line_under_the_text_in_its_color() {
        let mut n = node("text", "label", 2.0, 2.0, 20.0, 12.0);
        n.text = Some("Hi".into());
        n.font_size = 10.0;
        n.color = Some("#ff0000".into());
        n.underline = Some(design_data_core::visual::Underline {
            thickness: 2.0,
            offset: 1.0,
        });
        // Baseline: 2 + 6 + 3.5 = 11.5, so the line covers y 12.5 to 14.5.
        assert_eq!(n.underline.unwrap().rect(&n), (2.0, 12.5, 20.0, 2.0));
        let (img, _) = render(&scene(24.0, 16.0, vec![n]), 1.0);
        assert_eq!(at(&img, 10, 13), [255, 0, 0, 255]);
        assert_eq!(at(&img, 10, 15)[3], 0);
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
        n.icon = Some(design_data_core::visual::IconRef {
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
    fn an_icon_honors_even_odd_fill_rule() {
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

    fn path_node(d: &str, fill: Option<&str>) -> SceneNode {
        let mut n = node("box", "p", 10.0, 10.0, 20.0, 20.0);
        n.fill = fill.map(String::from);
        n.path = Some(design_data_core::visual::PathShape {
            d: d.into(),
            even_odd: false,
        });
        n
    }

    const NESTED: &str = "M0 0L20 0L20 20L0 20ZM5 5L15 5L15 15L5 15Z";

    #[test]
    fn a_path_fills_with_exact_edge_coverage_and_the_fill_rule() {
        let s = scene(
            40.0,
            40.0,
            vec![path_node("M0 0L20 0L0 20Z", Some("#ff0000"))],
        );
        let (img, d) = render(&s, 1.0);
        assert!(d.is_empty(), "{d:?}");
        // Inside, outside, and the hypotenuse pixel (x + y = 20 crosses it at half coverage).
        assert_eq!(at(&img, 12, 12), [255, 0, 0, 255]);
        assert_eq!(at(&img, 28, 28), [0, 0, 0, 0]);
        assert_eq!(at(&img, 9, 12), [0, 0, 0, 0]);
        let a = at(&img, 20, 19)[3];
        assert!((120..=135).contains(&a), "{a}");
        assert_eq!(render(&s, 1.0).0.rgba, img.rgba);
        // Two same-direction squares: non-zero fills the hole, even-odd leaves it empty.
        let mut n = path_node(NESTED, Some("#00ff00"));
        let (img, _) = render(&scene(40.0, 40.0, vec![n.clone()]), 1.0);
        assert_eq!(at(&img, 20, 20), [0, 255, 0, 255]);
        n.path.as_mut().unwrap().even_odd = true;
        let (img, _) = render(&scene(40.0, 40.0, vec![n]), 1.0);
        assert_eq!(at(&img, 20, 20)[3], 0);
        assert_eq!(at(&img, 12, 20), [0, 255, 0, 255]);
    }

    #[test]
    fn a_path_scales_with_the_image() {
        let s = scene(
            40.0,
            40.0,
            vec![path_node("M0 0L20 0L20 20L0 20Z", Some("#ff0000"))],
        );
        let (img, _) = render(&s, 2.0);
        assert_eq!((img.width, img.height), (80, 80));
        assert_eq!(at(&img, 21, 21), [255, 0, 0, 255]);
        assert_eq!(at(&img, 19, 21)[3], 0);
        assert_eq!(at(&img, 59, 59), [255, 0, 0, 255]);
        assert_eq!(at(&img, 60, 60)[3], 0);
    }

    #[test]
    fn a_path_stroke_is_centered_on_the_outline_with_round_joins() {
        let mut n = path_node("M0 0L20 0L20 20L0 20Z", None);
        (n.stroke, n.stroke_width) = (Some("#0000ff".into()), 4.0);
        let (img, d) = render(&scene(40.0, 40.0, vec![n]), 1.0);
        assert!(d.is_empty(), "{d:?}");
        // The left edge is at x 10: the band covers 8 to 12, so 8 and 11 are ink, 7 and 12 are not.
        assert_eq!(at(&img, 8, 20), [0, 0, 255, 255]);
        assert_eq!(at(&img, 11, 20), [0, 0, 255, 255]);
        assert_eq!(at(&img, 7, 20)[3], 0);
        assert_eq!(at(&img, 12, 20)[3], 0);
        // The middle is empty (no fill), and a round join leaves the corner's outer pixel half
        // empty where a miter would fill it.
        assert_eq!(at(&img, 20, 20)[3], 0);
        let corner = at(&img, 8, 8)[3];
        assert!((80..=115).contains(&corner), "{corner}");
        assert_eq!(at(&img, 9, 9)[3], 255);
    }

    #[test]
    fn a_path_shadow_follows_the_shape_and_never_shows_inside_it() {
        let mut n = path_node("M0 0L20 0L0 20Z", Some("rgba(255, 255, 255, 0)"));
        n.shadow = vec![shadow(0.0, 6.0, 4.0, "#000000")];
        let (img, d) = render(&scene(50.0, 50.0, vec![n]), 1.0);
        assert!(d.is_empty(), "{d:?}");
        // Inside the triangle: nothing. Below its hypotenuse: shadow. Past the empty corner,
        // beyond the offset and blur reach: none. The shadow of a triangle is not a box's.
        assert_eq!(at(&img, 13, 13)[3], 0);
        assert!(at(&img, 22, 22)[3] > 60, "{}", at(&img, 22, 22)[3]);
        assert_eq!(at(&img, 40, 10)[3], 0);
        assert!(at(&img, 26, 24)[3] < at(&img, 22, 22)[3]);
    }

    #[test]
    fn a_path_pattern_is_clipped_to_the_shape() {
        let mut n = path_node("M0 0L20 0L0 20Z", Some("#ffffff"));
        n.pattern = Some(design_data_core::visual::Pattern {
            alt: "#cccccc".into(),
            size: 4.0,
        });
        let (img, _) = render(&scene(40.0, 40.0, vec![n]), 1.0);
        // Cell (0,0) is the fill, cell (1,0) the alt color; outside the triangle: empty.
        assert_eq!(at(&img, 11, 11), [255, 255, 255, 255]);
        assert_eq!(at(&img, 15, 11), [204, 204, 204, 255]);
        assert_eq!(at(&img, 28, 28)[3], 0);
    }

    #[test]
    fn a_bad_or_huge_path_is_skipped_with_a_diagnostic_and_never_panics() {
        for d in ["bogus", "M0 0L1e300 1e300L0 5Z"] {
            let mut n = path_node(d, Some("#ff0000"));
            n.stroke = Some("#000000".into());
            n.stroke_width = 2.0;
            n.shadow = vec![shadow(0.0, 2.0, 4.0, "#000000")];
            let (img, diags) = render(&scene(40.0, 40.0, vec![n]), 1.0);
            assert_eq!((img.width, img.height), (40, 40));
            assert!(!diags.is_empty(), "{d}");
        }
    }

    mod image_fill {
        use super::*;
        use crate::testutil::{test_png, test_uri};
        use design_data_core::graph::TokenGraph;
        use design_data_core::visual::{build_scene, RenderRequest};
        use serde_json::{json, Value};

        const RED: [u8; 4] = [255, 0, 0, 255];
        const BLUE: [u8; 4] = [0, 0, 255, 255];
        const WHITE: [u8; 4] = [255, 255, 255, 255];

        /// 4x2 pixels: red in the two left columns, blue in the two right.
        fn photo() -> String {
            test_uri(&test_png(4, 2, 6, &|x, _| {
                if x < 2 {
                    RED.to_vec()
                } else {
                    BLUE.to_vec()
                }
            }))
        }

        /// A 40x40 white box with `image` (and a corner radius), at scale 1; the pixel
        /// (0, 0) of the returned image is the box's top-left corner.
        fn draw(image: Value, src: Option<Value>, radius: u32) -> (Image, Vec<String>, Scene) {
            draw_with(image, src, radius, json!({}))
        }

        fn draw_with(
            image: Value,
            src: Option<Value>,
            radius: u32,
            extra: Value,
        ) -> (Image, Vec<String>, Scene) {
            let lit = |v: Value| json!({ "value": v });
            let mut props = json!({
                "width": lit(40.into()), "height": lit(40.into()),
                "fill": lit("#ffffff".into()), "cornerRadius": lit(radius.into()) });
            props
                .as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            let recipe = json!({
                "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
                "parts": { "r": { "kind": "box", "image": image, "props": props } }
            });
            let mut req = RenderRequest {
                component: "action-button".into(),
                size: "m".into(),
                ..Default::default()
            };
            if let Some(v) = src {
                req.options.insert("src".into(), v);
            }
            let mut scene = build_scene(&TokenGraph::default(), &recipe, &req).unwrap();
            let (dx, dy) = (scene.nodes[0].x, scene.nodes[0].y);
            for n in scene.nodes.iter_mut() {
                n.x -= dx;
                n.y -= dy;
            }
            scene.width = 40.0;
            scene.height = 40.0;
            let (img, d) = render(&scene, 1.0);
            (img, d, scene)
        }

        fn src() -> Value {
            json!({ "source": { "option": "src" } })
        }

        fn with(extra: Value) -> Value {
            let mut v = src();
            v.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            v
        }

        #[test]
        fn cover_fills_the_box_and_crops_the_overflow() {
            // 4x2 scaled to 80x40: the box shows the middle two columns (red then blue).
            let (img, d, scene) = draw(src(), Some(photo().into()), 0);
            assert!(d.is_empty(), "{d:?}");
            let im = scene.nodes[0].image.as_ref().unwrap();
            assert_eq!(im.dest, [-20.0, 0.0, 80.0, 40.0]);
            assert_eq!(at(&img, 5, 20), RED);
            assert_eq!(at(&img, 35, 20), BLUE);
            // Aligned to the start the box shows only the red columns.
            let (img, _, _) = draw(with(json!({ "position": [0, 0] })), Some(photo().into()), 0);
            assert_eq!((at(&img, 5, 20), at(&img, 25, 20)), (RED, RED));
        }

        #[test]
        fn contain_letterboxes_over_the_box_fill_and_position_moves_it() {
            let (img, _, scene) = draw(with(json!({ "fit": "contain" })), Some(photo().into()), 0);
            assert_eq!(
                scene.nodes[0].image.as_ref().unwrap().dest,
                [0.0, 10.0, 40.0, 20.0]
            );
            assert_eq!(at(&img, 5, 20), RED);
            assert_eq!(at(&img, 35, 20), BLUE);
            assert_eq!(at(&img, 5, 5), WHITE);
            assert_eq!(at(&img, 5, 35), WHITE);
            let (img, _, _) = draw(
                with(json!({ "fit": "contain", "position": [0.5, 0] })),
                Some(photo().into()),
                0,
            );
            assert_eq!((at(&img, 5, 10), at(&img, 5, 30)), (RED, WHITE));
        }

        #[test]
        fn fill_stretches_and_none_keeps_the_natural_size() {
            let (img, _, scene) = draw(with(json!({ "fit": "fill" })), Some(photo().into()), 0);
            assert_eq!(
                scene.nodes[0].image.as_ref().unwrap().dest,
                [0.0, 0.0, 40.0, 40.0]
            );
            assert_eq!((at(&img, 5, 2), at(&img, 35, 38)), (RED, BLUE));
            let (img, _, scene) = draw(with(json!({ "fit": "none" })), Some(photo().into()), 0);
            assert_eq!(
                scene.nodes[0].image.as_ref().unwrap().dest,
                [18.0, 19.0, 4.0, 2.0]
            );
            assert_eq!(at(&img, 18, 19), RED);
            assert_eq!(at(&img, 21, 20), BLUE);
            assert_eq!(at(&img, 5, 5), WHITE);
        }

        #[test]
        fn the_picture_follows_the_corner_radius() {
            let (img, _, _) = draw(src(), Some(photo().into()), 20);
            // The corner is outside the rounded box, so neither fill nor picture reach it.
            assert_eq!(at(&img, 0, 0)[3], 0);
            assert_eq!(at(&img, 20, 20)[3], 255);
            let (img, _, _) = draw(src(), Some(photo().into()), 0);
            assert_eq!(at(&img, 0, 0), RED);
        }

        #[test]
        fn no_source_draws_the_checkerboard_placeholder_without_a_diagnostic() {
            for source in [None, Some(Value::Null), Some(json!(""))] {
                let (img, d, scene) = draw(src(), source, 0);
                assert!(d.is_empty(), "{d:?}");
                assert!(scene.nodes[0].image.as_ref().unwrap().placeholder);
                assert_eq!(at(&img, 2, 2), [0xd5, 0xd5, 0xd5, 255]);
                assert_eq!(at(&img, 10, 2), [0xeb, 0xeb, 0xeb, 255]);
                assert_eq!(at(&img, 10, 10), [0xd5, 0xd5, 0xd5, 255]);
                // The squares are 8 px: the second begins at x = 8 and the third at 16.
                assert_eq!(at(&img, 7, 2), [0xd5, 0xd5, 0xd5, 255]);
                assert_eq!(at(&img, 8, 2), [0xeb, 0xeb, 0xeb, 255]);
                assert_eq!(at(&img, 15, 2), [0xeb, 0xeb, 0xeb, 255]);
                assert_eq!(at(&img, 16, 2), [0xd5, 0xd5, 0xd5, 255]);
            }
        }

        #[test]
        fn a_source_that_cannot_be_drawn_gets_the_placeholder_and_a_diagnostic_fast() {
            let ok = photo();
            let mut huge = test_png(1, 1, 6, &|_, _| vec![0; 4]);
            huge[16..24].copy_from_slice(&[0, 0, 0x4e, 0x20, 0, 0, 0x4e, 0x20]);
            let cases: Vec<(&str, Value, &str)> = vec![
                ("https", json!("https://example.com/a.png"), "data: URI"),
                ("path", json!("/tmp/a.png"), "data: URI"),
                (
                    "jpeg",
                    json!("data:image/jpeg;base64,/9j/4AAQ"),
                    "image/png",
                ),
                ("gif", json!("data:image/gif;base64,R0lGODlh"), "image/png"),
                (
                    "svg",
                    json!("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
                    "image/png",
                ),
                ("base64", json!("data:image/png;base64,%%%%"), "malformed"),
                ("truncated", json!(ok[..ok.len() - 24]), "truncated"),
                ("20000x20000", json!(test_uri(&huge)), "20000x20000"),
                (
                    "50 MB",
                    json!(format!("data:image/png;base64,{}", "A".repeat(50_000_000))),
                    "over the limit",
                ),
                ("number", json!(7), "not a string"),
                ("bool", json!(true), "not a string"),
            ];
            for (name, v, why) in cases {
                let t = std::time::Instant::now();
                let (img, d, scene) = draw(src(), Some(v), 0);
                assert!(t.elapsed().as_secs() < 5, "{name} took {:?}", t.elapsed());
                assert!(
                    d.iter().any(|m| m.contains(why))
                        || scene.diagnostics.iter().any(|m| m.contains(why)),
                    "{name}: {d:?} {:?}",
                    scene.diagnostics
                );
                assert!(scene.nodes[0].image.as_ref().unwrap().placeholder, "{name}");
                assert_eq!(at(&img, 2, 2), [0xd5, 0xd5, 0xd5, 255], "{name}");
            }
        }

        #[test]
        fn the_picture_draws_over_the_gradient_and_the_pattern() {
            // Left half opaque red, right half transparent, stretched over the box, which has
            // a green-to-blue gradient fill and a black checkerboard of 8 px squares.
            let half = test_uri(&test_png(2, 1, 6, &|x, _| {
                if x == 0 {
                    RED.to_vec()
                } else {
                    vec![0, 0, 0, 0]
                }
            }));
            let lit = |v: Value| json!({ "value": v });
            let extra = json!({
                "patternFill": lit("#000000".into()), "patternSize": lit(8.into()),
                "fill": { "gradient": { "from": [0, 0], "to": [1, 0], "stops": [
                    { "color": lit("#00ff00".into()), "offset": lit(0.into()) },
                    { "color": lit("#0000ff".into()), "offset": lit(1.into()) } ] } }
            });
            let (img, d, scene) =
                draw_with(with(json!({ "fit": "fill" })), Some(half.into()), 0, extra);
            assert!(
                d.is_empty() && scene.diagnostics.is_empty(),
                "{d:?} {:?}",
                scene.diagnostics
            );
            assert!(scene.nodes[0].gradient.is_some() && scene.nodes[0].pattern.is_some());
            // Over the opaque half: the picture hides both (x = 9 is a pattern square).
            assert_eq!((at(&img, 4, 4), at(&img, 9, 4)), (RED, RED));
            // Through the transparent half: the pattern square (x = 30) over the gradient,
            // and the gradient alone where there is no square (x = 38, near the blue end).
            assert_eq!(at(&img, 30, 4), [0, 0, 0, 255]);
            let g = at(&img, 38, 4);
            assert!(
                g[0] == 0 && g[1] <= 14 && g[2] >= 240 && g[3] == 255,
                "{g:?}"
            );
            // Without the picture the same pixels are the pattern and the gradient: the
            // picture, not the fill, made (9, 4) red.
            let (bare, _, _) = draw_with(json!({ "source": { "value": "" } }), None, 0, json!({}));
            assert_ne!(at(&bare, 9, 4), RED);
        }

        #[test]
        fn a_one_pixel_image_fills_the_box() {
            let one = test_uri(&test_png(1, 1, 6, &|_, _| vec![0, 255, 0, 255]));
            let (img, d, _) = draw(src(), Some(one.into()), 0);
            assert!(d.is_empty(), "{d:?}");
            assert_eq!(
                (at(&img, 1, 1), at(&img, 38, 20)),
                ([0, 255, 0, 255], [0, 255, 0, 255])
            );
        }

        #[test]
        fn a_bad_fit_or_position_falls_back_with_a_diagnostic() {
            let (_, _, scene) = draw(with(json!({ "fit": "stretch" })), Some(photo().into()), 0);
            assert_eq!(scene.nodes[0].image.as_ref().unwrap().fit, "cover");
            assert!(
                scene.diagnostics.iter().any(|d| d.contains("stretch")),
                "{:?}",
                scene.diagnostics
            );
            let (_, _, scene) = draw(
                with(json!({ "position": [null, 1] })),
                Some(photo().into()),
                0,
            );
            assert_eq!(scene.nodes[0].image.as_ref().unwrap().position, [0.5, 0.5]);
            assert!(scene.diagnostics.iter().any(|d| d.contains("position")));
        }

        #[test]
        fn the_svg_clips_the_image_to_the_rounded_box() {
            let (_, _, scene) = draw(src(), Some(photo().into()), 12);
            let svg = design_data_core::visual::scene_to_svg(&scene);
            assert_eq!(svg.matches("<image ").count(), 1, "{svg}");
            assert!(svg.contains("preserveAspectRatio=\"none\""));
            assert!(svg.contains("<clipPath id=\"image-clip-") && svg.contains("rx=\"12\""));
            assert!(
                svg.contains("x=\"-20\"") && svg.contains("width=\"80\""),
                "{svg}"
            );
        }

        /// SVG and PNG draw the same picture: rasterize the SVG with resvg (when installed)
        /// and compare to the rasterizer within a small RMSE.
        #[test]
        fn png_and_svg_agree_within_a_small_rmse() {
            let Ok(out) = std::process::Command::new("resvg")
                .arg("--version")
                .output()
            else {
                eprintln!("resvg not installed; parity not checked");
                return;
            };
            assert!(out.status.success());
            let dir = std::env::temp_dir().join(format!("image-parity-{}", std::process::id()));
            std::fs::create_dir_all(&dir).unwrap();
            let gradient = test_uri(&test_png(16, 16, 6, &|x, y| {
                vec![(x * 16) as u8, (y * 16) as u8, 90, 255]
            }));
            for (fit, radius) in [("cover", 0), ("contain", 12), ("fill", 20), ("none", 6)] {
                let (img, _, scene) = draw(
                    with(json!({ "fit": fit })),
                    Some(gradient.clone().into()),
                    radius,
                );
                let svg = dir.join("a.svg");
                let png = dir.join("a.png");
                std::fs::write(&svg, design_data_core::visual::scene_to_svg(&scene)).unwrap();
                let st = std::process::Command::new("resvg")
                    .args([svg.to_str().unwrap(), png.to_str().unwrap()])
                    .status()
                    .unwrap();
                assert!(st.success());
                let theirs = design_data_core::image::decode_data_uri(&test_uri(
                    &std::fs::read(&png).unwrap(),
                ))
                .unwrap();
                assert_eq!((theirs.width, theirs.height), (img.width, img.height));
                // Edge pixels of a rounded box differ by each renderer's anti-aliasing, so the
                // interior (opaque in both) is held to a tighter bound than the whole image.
                let (mut sq, mut isq, mut inner) = (0.0f64, 0.0f64, 0usize);
                for (a, b) in img.rgba.chunks(4).zip(theirs.rgba.chunks(4)) {
                    let d: f64 = (0..4)
                        .map(|i| (f64::from(a[i]) - f64::from(b[i])).powi(2))
                        .sum();
                    sq += d;
                    if a[3] == 255 && b[3] == 255 {
                        isq += d;
                        inner += 1;
                    }
                }
                let rmse = (sq / img.rgba.len() as f64).sqrt();
                let irmse = (isq / (inner * 4) as f64).sqrt();
                eprintln!("{fit} radius {radius}: rmse {rmse:.2}, interior {irmse:.2} of 255");
                assert!(
                    rmse < 10.0 && irmse < 3.0,
                    "{fit}: rmse {rmse}, interior {irmse}"
                );
            }
            let _ = std::fs::remove_dir_all(&dir);
        }
    }
}
