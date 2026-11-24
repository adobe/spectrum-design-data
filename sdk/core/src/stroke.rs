// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Dashed and per-side strokes (spec/component-visuals.md, Dashed and per-side strokes).
//!
//! A node whose recipe binds `strokeDash`, `strokeSides` or both carries a [`StrokeStyle`].
//! [`node_runs`] turns it into the centerline of the stroke as runs of lines and quarter arcs,
//! and both the SVG writer and the rasterizer draw those runs, so they cannot disagree on
//! which sides, corners and dashes are drawn.

use std::fmt::Write;

use serde::Serialize;

use crate::visual::SceneNode;

/// How a node's stroke differs from a plain border. Unset fields keep the plain behavior.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct StrokeStyle {
    /// `[dash, gap]` in px. Unset draws a solid line.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dash: Option<[f64; 2]>,
    /// Dashes end in round caps instead of flat ones.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub round_cap: bool,
    /// `[top, right, bottom, left]`: the sides drawn. Unset draws all four.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sides: Option<[bool; 4]>,
    /// The dash pattern of a straight side is anchored to the scene's x (top, bottom) or y
    /// (left, right) axis, so boxes that touch continue each other's pattern.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub scene_anchor: bool,
}

/// One piece of a stroke's centerline.
#[derive(Debug, Clone, PartialEq)]
pub enum Seg {
    Line([f64; 2], [f64; 2]),
    /// A clockwise quarter arc (on screen) of `r` around `c` at corner `k` (0 top-left, 1
    /// top-right, 2 bottom-right, 3 bottom-left).
    Arc {
        c: [f64; 2],
        r: f64,
        k: u8,
    },
}

/// A chain of connected pieces drawn with one dash pattern, starting `offset` px into it.
#[derive(Debug, Clone, PartialEq)]
pub struct Run {
    pub segs: Vec<Seg>,
    pub offset: f64,
}

/// Unit vectors from the center of a circle to its top, right, bottom and left; also the
/// clockwise direction of the sides that start at corners 3, 0, 1 and 2.
const DIRS: [[f64; 2]; 4] = [[0.0, -1.0], [1.0, 0.0], [0.0, 1.0], [-1.0, 0.0]];

impl Seg {
    pub fn start(&self) -> [f64; 2] {
        match self {
            Seg::Line(a, _) => *a,
            Seg::Arc { c, r, k } => at(*c, *r, DIRS[(usize::from(*k) + 3) % 4]),
        }
    }

    pub fn end(&self) -> [f64; 2] {
        match self {
            Seg::Line(_, b) => *b,
            Seg::Arc { c, r, k } => at(*c, *r, DIRS[usize::from(*k)]),
        }
    }
}

fn at(c: [f64; 2], r: f64, d: [f64; 2]) -> [f64; 2] {
    [c[0] + r * d[0], c[1] + r * d[1]]
}

/// The stroke of `n` as runs, or `None` when `n` has no styled stroke to draw. A `box` strokes
/// the band just inside its bounds; a `ring` strokes its own rectangle.
pub fn node_runs(n: &SceneNode) -> Option<Vec<Run>> {
    let st = n.stroke_style.as_ref()?;
    let radii = n.radii.unwrap_or([n.radius; 4]);
    let i = if n.kind == "ring" {
        0.0
    } else {
        n.stroke_width / 2.0
    };
    let (w, h) = (n.w - 2.0 * i, n.h - 2.0 * i);
    (n.stroke_width > 0.0 && w > 0.0 && h > 0.0).then(|| {
        runs(
            (n.x + i, n.y + i, w, h),
            radii.map(|v| (v - i).max(0.0)),
            i,
            st,
        )
    })
}

/// The runs of a stroke along the rectangle `(x, y, w, h)` with corner radii `r` (top-left,
/// top-right, bottom-right, bottom-left), `ext` being half the stroke width of a box (0 on a
/// ring). A side is drawn when `st.sides` lists it; a corner arc is drawn when both sides that
/// meet there are.
pub fn runs(
    (x, y, w, h): (f64, f64, f64, f64),
    r: [f64; 4],
    ext: f64,
    st: &StrokeStyle,
) -> Vec<Run> {
    let r = r.map(|v| v.clamp(0.0, w.min(h) / 2.0));
    let on = st.sides.unwrap_or([true; 4]);
    let corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    // With a scene anchor the straight sides run in the positive axis direction, so the
    // pattern offset is the coordinate; otherwise the pattern flows clockwise.
    let anchored = st.scene_anchor && st.dash.is_some();
    // Element `i` clockwise from the top: even is side `i / 2`, odd the arc at corner
    // `(i + 1) / 2 % 4`.
    let included = |i: usize| on[i / 2] && (i % 2 == 0 || on[(i / 2 + 1) % 4]);
    let seg = |i: usize| -> Option<(Seg, f64)> {
        let k = i / 2;
        if i % 2 == 1 {
            let k = (k + 1) % 4;
            let to_center = at(DIRS[(k + 1) % 4], -1.0, DIRS[k]);
            return (r[k] > 0.0).then(|| {
                (
                    Seg::Arc {
                        c: at(corners[k], r[k], to_center),
                        r: r[k],
                        k: k as u8,
                    },
                    0.0,
                )
            });
        }
        // A square corner with no side drawn beyond it is reached to the outer edge (`ext`
        // further), so the side of a box that touches this one continues into it.
        let reach = |corner: usize, other: usize| {
            r[corner]
                - if r[corner] == 0.0 && !on[other] {
                    ext
                } else {
                    0.0
                }
        };
        let (c0, c1, u) = (
            (k, (k + 3) % 4),
            ((k + 1) % 4, (k + 1) % 4),
            DIRS[(k + 1) % 4],
        );
        let mut a = at(corners[k], reach(c0.0, c0.1), u);
        let mut b = at(corners[c1.0], -reach(c1.0, c1.1), u);
        if anchored && k >= 2 {
            std::mem::swap(&mut a, &mut b);
        }
        let offset = if anchored { a[k % 2] } else { 0.0 };
        ((a[0] - b[0]).hypot(a[1] - b[1]) > 1e-9).then_some((Seg::Line(a, b), offset))
    };
    let all = (0..8).all(included);
    let mut out = Vec::new();
    let Some(first) = (0..8).find(|i| included(*i) && (all || !included((i + 7) % 8))) else {
        return out;
    };
    let mut segs = Vec::new();
    for i in (first..first + 8).map(|j| j % 8) {
        if included(i) {
            if let Some((s, offset)) = seg(i) {
                if anchored {
                    out.push(Run {
                        segs: vec![s],
                        offset,
                    });
                } else {
                    segs.push(s);
                }
            }
        } else if !segs.is_empty() {
            out.push(Run {
                segs: std::mem::take(&mut segs),
                offset: 0.0,
            });
        }
    }
    if !segs.is_empty() {
        out.push(Run { segs, offset: 0.0 });
    }
    out
}

/// SVG path data of a run: `M`, `L` and `A` commands.
pub fn svg_d(run: &Run) -> String {
    let mut d = String::new();
    let pt = |d: &mut String, cmd: &str, p: [f64; 2]| {
        let _ = write!(d, "{cmd}{} {}", round(p[0]), round(p[1]));
    };
    for (i, s) in run.segs.iter().enumerate() {
        if i == 0 {
            pt(&mut d, "M", s.start());
        }
        match s {
            Seg::Line(..) => pt(&mut d, "L", s.end()),
            Seg::Arc { r, .. } => {
                let _ = write!(d, "A{r} {r} 0 0 1 ");
                pt(&mut d, "", s.end());
            }
        }
    }
    d
}

fn round(v: f64) -> f64 {
    (v * 1e4 + 0.5).floor() / 1e4
}

/// The SVG elements of a styled stroke: one `<path>` per run, in `color`.
pub fn write_svg(s: &mut String, n: &SceneNode, color: &str, opacity: &str) {
    let (Some(st), Some(runs)) = (&n.stroke_style, node_runs(n)) else {
        return;
    };
    for run in runs {
        let mut dash = String::new();
        if let Some([d, g]) = st.dash {
            let o = run.offset - (run.offset / (d + g)).floor() * (d + g);
            let cap = if st.round_cap { "round" } else { "butt" };
            let _ = write!(
                dash,
                " stroke-dasharray=\"{d} {g}\" stroke-dashoffset=\"{}\" stroke-linecap=\"{cap}\"",
                round(o)
            );
        }
        let _ = write!(
            s,
            "<path d=\"{}\" fill=\"none\" stroke=\"{color}\" stroke-width=\"{}\" stroke-linejoin=\"round\"{dash}{opacity}/>",
            svg_d(&run),
            n.stroke_width
        );
    }
}

/// A run as a polyline, arcs flattened to steps of at most half a pixel.
pub fn flatten(run: &Run) -> Vec<[f64; 2]> {
    let mut pts: Vec<[f64; 2]> = Vec::new();
    for s in &run.segs {
        match s {
            Seg::Line(a, b) => {
                if pts.is_empty() {
                    pts.push(*a);
                }
                pts.push(*b);
            }
            Seg::Arc { c, r, k } => {
                let a0 = (f64::from(*k) - 1.0) * std::f64::consts::FRAC_PI_2;
                let steps = ((r * std::f64::consts::FRAC_PI_2) / 0.5).ceil().max(4.0) as usize;
                for i in 0..=steps {
                    let a = a0 + std::f64::consts::FRAC_PI_2 * i as f64 / steps as f64;
                    if i > 0 || pts.is_empty() {
                        pts.push([c[0] + r * a.cos(), c[1] + r * a.sin()]);
                    }
                }
            }
        }
    }
    pts
}

/// Cut a polyline into dashes: `dash` px drawn, `gap` px skipped, the pattern starting
/// `offset` px in. With no `dash` the polyline is returned whole.
pub fn dashes(poly: &[[f64; 2]], dash: Option<[f64; 2]>, offset: f64) -> Vec<Vec<[f64; 2]>> {
    let Some([d, g]) = dash else {
        return vec![poly.to_vec()];
    };
    let period = d + g;
    let pos = offset - (offset / period).floor() * period;
    let mut out: Vec<Vec<[f64; 2]>> = Vec::new();
    let mut cur: Vec<[f64; 2]> = Vec::new();
    // `pos` is the distance into the current dash (drawing) or gap (not drawing).
    let mut drawing = pos < d;
    let mut left = if drawing { d - pos } else { period - pos };
    if drawing {
        cur.push(poly[0]);
    }
    for w in poly.windows(2) {
        let (a, b) = (w[0], w[1]);
        let len = (b[0] - a[0]).hypot(b[1] - a[1]);
        let mut at = 0.0;
        while len - at > left {
            at += left;
            let t = at / len;
            let p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
            if drawing {
                cur.push(p);
                out.push(std::mem::take(&mut cur));
            } else {
                cur.push(p);
            }
            drawing = !drawing;
            left = if drawing { d } else { g };
        }
        left -= len - at;
        if drawing {
            cur.push(b);
        }
    }
    if cur.len() > 1 {
        out.push(cur);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st(dash: Option<[f64; 2]>, sides: Option<[bool; 4]>, anchor: bool) -> StrokeStyle {
        StrokeStyle {
            dash,
            round_cap: false,
            sides,
            scene_anchor: anchor,
        }
    }

    #[test]
    fn all_sides_make_one_closed_run_and_a_missing_side_opens_it() {
        let all = runs(
            (0.0, 0.0, 20.0, 10.0),
            [4.0; 4],
            0.5,
            &st(None, None, false),
        );
        assert_eq!((all.len(), all[0].segs.len()), (1, 8));
        // No right side: the right corners go too, leaving one run from the top to the bottom.
        let u = runs(
            (0.0, 0.0, 20.0, 10.0),
            [4.0; 4],
            0.5,
            &st(None, Some([true, false, true, true]), false),
        );
        assert_eq!(u.len(), 1);
        // top, bottom-left corner, left side, top-left corner, so 5 pieces (bottom, BL, left, TL, top)
        assert_eq!(u[0].segs.len(), 5);
        assert_eq!(u[0].segs[0].start(), [16.0, 10.0]);
    }

    #[test]
    fn opposite_sides_are_two_runs_without_corners() {
        let r = runs(
            (0.0, 0.0, 20.0, 10.0),
            [5.0; 4],
            0.5,
            &st(None, Some([true, false, true, false]), false),
        );
        assert_eq!(r.len(), 2);
        assert!(r.iter().all(|r| r.segs.len() == 1));
    }

    #[test]
    fn a_scene_anchored_dash_starts_each_side_at_its_coordinate() {
        let r = runs(
            (10.5, 0.5, 19.0, 9.0),
            [0.0; 4],
            0.5,
            &st(Some([4.0, 4.0]), Some([true, false, true, false]), true),
        );
        assert_eq!(r.iter().map(|r| r.offset).collect::<Vec<_>>(), [10.0, 10.0]);
        // Both sides run left to right whatever their clockwise direction.
        assert!(r.iter().all(|r| r.segs[0].start()[0] < r.segs[0].end()[0]));
    }

    #[test]
    fn dashes_cut_a_polyline_by_the_pattern() {
        let p = [[0.0, 0.0], [20.0, 0.0]];
        let d = dashes(&p, Some([4.0, 4.0]), 0.0);
        let xs: Vec<(f64, f64)> = d.iter().map(|s| (s[0][0], s.last().unwrap()[0])).collect();
        assert_eq!(xs, [(0.0, 4.0), (8.0, 12.0), (16.0, 20.0)]);
        // Starting 2px into the pattern shortens the first dash.
        let d = dashes(&p, Some([4.0, 4.0]), 2.0);
        assert_eq!((d[0][0][0], d[0].last().unwrap()[0]), (0.0, 2.0));
        // A solid stroke is not cut.
        assert_eq!(dashes(&p, None, 0.0).len(), 1);
    }
}
