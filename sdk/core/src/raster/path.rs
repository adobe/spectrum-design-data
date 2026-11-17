// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SVG path data to polygons, and an anti-aliased polygon fill.
//!
//! [`flatten`] reads path data (`MmLlHhVvCcSsQqTtAaZz`) into closed polylines. [`fill`]
//! accumulates each edge's signed area per pixel, so the edge pixels get exact partial
//! coverage and a row sums to the winding number: non-zero clamps it, even-odd folds it.

use super::canvas::{Canvas, Rgba};
use std::f64::consts::PI;

pub type Pt = [f64; 2];

/// How overlapping or nested contours decide what is inside.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Rule {
    NonZero,
    EvenOdd,
}

impl Rule {
    /// The SVG `fill-rule` value; anything but `evenodd` is non-zero.
    pub fn parse(s: Option<&str>) -> Rule {
        if s == Some("evenodd") {
            Rule::EvenOdd
        } else {
            Rule::NonZero
        }
    }
}

struct Lexer<'a> {
    s: &'a [u8],
    i: usize,
}

impl Lexer<'_> {
    fn skip_sep(&mut self) {
        while self.i < self.s.len()
            && (self.s[self.i].is_ascii_whitespace() || self.s[self.i] == b',')
        {
            self.i += 1;
        }
    }

    fn at_number(&mut self) -> bool {
        self.skip_sep();
        self.s
            .get(self.i)
            .is_some_and(|c| c.is_ascii_digit() || matches!(c, b'.' | b'-' | b'+'))
    }

    fn number(&mut self) -> Result<f64, String> {
        self.skip_sep();
        let start = self.i;
        let digits = |l: &mut Self| {
            let from = l.i;
            while l.s.get(l.i).is_some_and(u8::is_ascii_digit) {
                l.i += 1;
            }
            l.i - from
        };
        if matches!(self.s.get(self.i), Some(b'-' | b'+')) {
            self.i += 1;
        }
        let mut n = digits(self);
        if self.s.get(self.i) == Some(&b'.') {
            self.i += 1;
            n += digits(self);
        }
        if n == 0 {
            return Err(format!("expected a number at offset {start}"));
        }
        if matches!(self.s.get(self.i), Some(b'e' | b'E')) {
            let save = self.i;
            self.i += 1;
            if matches!(self.s.get(self.i), Some(b'-' | b'+')) {
                self.i += 1;
            }
            if digits(self) == 0 {
                self.i = save;
            }
        }
        std::str::from_utf8(&self.s[start..self.i])
            .ok()
            .and_then(|t| t.parse().ok())
            .filter(|v: &f64| v.is_finite())
            .ok_or_else(|| format!("bad number at offset {start}"))
    }

    /// An arc flag is one `0` or `1` character, with no separator needed after it.
    fn flag(&mut self) -> Result<bool, String> {
        self.skip_sep();
        match self.s.get(self.i) {
            Some(b'0') => (self.i += 1, Ok(false)).1,
            Some(b'1') => (self.i += 1, Ok(true)).1,
            _ => Err(format!("expected an arc flag at offset {}", self.i)),
        }
    }
}

/// Flatten path data into closed polylines in the path's own units. `tol` is the largest
/// distance a flattened curve may stray from the true one, in those units.
pub fn flatten(d: &str, tol: f64) -> Result<Vec<Vec<Pt>>, String> {
    let tol = tol.max(1e-6);
    let mut lx = Lexer {
        s: d.as_bytes(),
        i: 0,
    };
    let (mut polys, mut cur): (Vec<Vec<Pt>>, Vec<Pt>) = (vec![], vec![]);
    let (mut p, mut start) = ([0.0f64; 2], [0.0f64; 2]);
    // The previous segment's last control point, for the smooth commands S and T.
    let (mut ctrl, mut prev) = ([0.0f64; 2], b' ');
    let finish = |polys: &mut Vec<Vec<Pt>>, cur: &mut Vec<Pt>| {
        if cur.len() >= 3 {
            polys.push(std::mem::take(cur));
        } else {
            cur.clear();
        }
    };
    loop {
        lx.skip_sep();
        let Some(&cmd) = lx.s.get(lx.i) else { break };
        if !cmd.is_ascii_alphabetic() {
            return Err(format!("expected a command at offset {}", lx.i));
        }
        lx.i += 1;
        let rel = cmd.is_ascii_lowercase();
        let up = cmd.to_ascii_uppercase();
        if !b"MLHVCSQTAZ".contains(&up) {
            return Err(format!("unknown path command '{}'", cmd as char));
        }
        if up == b'Z' {
            finish(&mut polys, &mut cur);
            p = start;
            prev = b'Z';
            continue;
        }
        if up != b'M' && prev == b' ' {
            return Err("path data must start with a move".into());
        }
        let mut first = true;
        while first || lx.at_number() {
            let off = if rel { p } else { [0.0, 0.0] };
            let mut nums =
                |n: usize| -> Result<Vec<f64>, String> { (0..n).map(|_| lx.number()).collect() };
            let mut kind = up;
            match up {
                b'M' => {
                    let v = nums(2)?;
                    if first {
                        finish(&mut polys, &mut cur);
                        p = [off[0] + v[0], off[1] + v[1]];
                        start = p;
                        cur.push(p);
                    } else {
                        // Further pairs after a move are implicit lines.
                        kind = b'L';
                        p = [off[0] + v[0], off[1] + v[1]];
                        cur.push(p);
                    }
                }
                b'L' => {
                    let v = nums(2)?;
                    p = [off[0] + v[0], off[1] + v[1]];
                    begin(&mut cur, start, p, prev);
                    cur.push(p);
                }
                b'H' => {
                    let v = nums(1)?;
                    p = [off[0] + v[0], p[1]];
                    begin(&mut cur, start, p, prev);
                    cur.push(p);
                }
                b'V' => {
                    let v = nums(1)?;
                    p = [p[0], off[1] + v[0]];
                    begin(&mut cur, start, p, prev);
                    cur.push(p);
                }
                b'C' | b'S' => {
                    let (c1, c2, e);
                    if up == b'C' {
                        let v = nums(6)?;
                        c1 = [off[0] + v[0], off[1] + v[1]];
                        c2 = [off[0] + v[2], off[1] + v[3]];
                        e = [off[0] + v[4], off[1] + v[5]];
                    } else {
                        let v = nums(4)?;
                        c1 = if matches!(prev, b'C' | b'S') {
                            [2.0 * p[0] - ctrl[0], 2.0 * p[1] - ctrl[1]]
                        } else {
                            p
                        };
                        c2 = [off[0] + v[0], off[1] + v[1]];
                        e = [off[0] + v[2], off[1] + v[3]];
                    }
                    begin(&mut cur, start, p, prev);
                    cubic(&mut cur, p, c1, c2, e, tol);
                    ctrl = c2;
                    p = e;
                    kind = b'C';
                }
                b'Q' | b'T' => {
                    let (c, e);
                    if up == b'Q' {
                        let v = nums(4)?;
                        c = [off[0] + v[0], off[1] + v[1]];
                        e = [off[0] + v[2], off[1] + v[3]];
                    } else {
                        let v = nums(2)?;
                        c = if matches!(prev, b'Q' | b'T') {
                            [2.0 * p[0] - ctrl[0], 2.0 * p[1] - ctrl[1]]
                        } else {
                            p
                        };
                        e = [off[0] + v[0], off[1] + v[1]];
                    }
                    begin(&mut cur, start, p, prev);
                    // A quadratic is the cubic with its controls two thirds along.
                    let c1 = [
                        p[0] + 2.0 / 3.0 * (c[0] - p[0]),
                        p[1] + 2.0 / 3.0 * (c[1] - p[1]),
                    ];
                    let c2 = [
                        e[0] + 2.0 / 3.0 * (c[0] - e[0]),
                        e[1] + 2.0 / 3.0 * (c[1] - e[1]),
                    ];
                    cubic(&mut cur, p, c1, c2, e, tol);
                    ctrl = c;
                    p = e;
                    kind = b'Q';
                }
                _ => {
                    let (rx, ry, rot) = (lx.number()?, lx.number()?, lx.number()?);
                    let (large, sweep) = (lx.flag()?, lx.flag()?);
                    let (x, y) = (lx.number()?, lx.number()?);
                    let e = [off[0] + x, off[1] + y];
                    begin(&mut cur, start, p, prev);
                    arc(&mut cur, p, rx, ry, rot, large, sweep, e, tol);
                    p = e;
                }
            }
            prev = kind;
            first = false;
        }
    }
    finish(&mut polys, &mut cur);
    Ok(polys)
}

/// After a close, drawing continues from the subpath's start with a new contour.
fn begin(cur: &mut Vec<Pt>, start: Pt, p: Pt, prev: u8) {
    if prev == b'Z' && cur.is_empty() {
        cur.push(start);
    } else if cur.is_empty() {
        cur.push(p);
    }
}

fn cubic(out: &mut Vec<Pt>, p0: Pt, p1: Pt, p2: Pt, p3: Pt, tol: f64) {
    let dist = |a: Pt, b: Pt| (a[0] - b[0]).hypot(a[1] - b[1]);
    let len = dist(p0, p1) + dist(p1, p2) + dist(p2, p3);
    let n = ((len / tol).sqrt() * 0.5).ceil().clamp(2.0, 200.0) as usize;
    for i in 1..=n {
        let t = i as f64 / n as f64;
        let u = 1.0 - t;
        let (a, b, c, d) = (u * u * u, 3.0 * u * u * t, 3.0 * u * t * t, t * t * t);
        out.push([
            a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
        ]);
    }
}

/// SVG implementation notes F.6.5: endpoint to center parameterization, then sample.
#[allow(clippy::too_many_arguments)]
fn arc(
    out: &mut Vec<Pt>,
    from: Pt,
    rx: f64,
    ry: f64,
    rot: f64,
    large: bool,
    sweep: bool,
    to: Pt,
    tol: f64,
) {
    if from == to {
        return;
    }
    let (mut rx, mut ry) = (rx.abs(), ry.abs());
    if rx == 0.0 || ry == 0.0 {
        out.push(to);
        return;
    }
    let phi = rot.to_radians();
    let (sp, cp) = phi.sin_cos();
    let (dx, dy) = ((from[0] - to[0]) / 2.0, (from[1] - to[1]) / 2.0);
    let (x1, y1) = (cp * dx + sp * dy, -sp * dx + cp * dy);
    let lambda = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
    if lambda > 1.0 {
        let s = lambda.sqrt();
        rx *= s;
        ry *= s;
    }
    let num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    let den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
    let coef = if large == sweep { -1.0 } else { 1.0 } * (num / den).max(0.0).sqrt();
    let (cxp, cyp) = (coef * rx * y1 / ry, -coef * ry * x1 / rx);
    let (cx, cy) = (
        cp * cxp - sp * cyp + (from[0] + to[0]) / 2.0,
        sp * cxp + cp * cyp + (from[1] + to[1]) / 2.0,
    );
    let ang = |ux: f64, uy: f64, vx: f64, vy: f64| (ux * vy - uy * vx).atan2(ux * vx + uy * vy);
    let (ux, uy) = ((x1 - cxp) / rx, (y1 - cyp) / ry);
    let theta = ang(1.0, 0.0, ux, uy);
    let mut dtheta = ang(ux, uy, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if !sweep && dtheta > 0.0 {
        dtheta -= 2.0 * PI;
    } else if sweep && dtheta < 0.0 {
        dtheta += 2.0 * PI;
    }
    let r = rx.max(ry);
    let step = if tol >= r {
        PI / 2.0
    } else {
        (2.0 * (1.0 - tol / r).acos()).clamp(0.02, PI / 2.0)
    };
    let n = (dtheta.abs() / step).ceil().max(1.0) as usize;
    for i in 1..n {
        let t = theta + dtheta * i as f64 / n as f64;
        let (st, ct) = t.sin_cos();
        out.push([
            cx + rx * cp * ct - ry * sp * st,
            cy + rx * sp * ct + ry * cp * st,
        ]);
    }
    out.push(to);
}

/// Pixels a fill buffer may span, so a runaway path cannot allocate without bound.
const MAX_FILL_PIXELS: f64 = 16.0e6;

/// Fill closed polygons (already in pixel coordinates) with `color`. Returns false when the
/// shape was too large to draw.
pub fn fill(cv: &mut Canvas, polys: &[Vec<Pt>], rule: Rule, color: Rgba) -> bool {
    let pts = || polys.iter().flatten();
    if pts().any(|p| !p[0].is_finite() || !p[1].is_finite()) {
        return false;
    }
    let min = |i: usize| pts().map(|p| p[i]).fold(f64::INFINITY, f64::min);
    let max = |i: usize| pts().map(|p| p[i]).fold(f64::NEG_INFINITY, f64::max);
    if polys.is_empty() {
        return true;
    }
    let (bx0, by0) = (min(0).floor().max(-1.0e7), min(1).floor().max(-1.0e7));
    let (bx1, by1) = (max(0).ceil().min(1.0e7), max(1).ceil().min(1.0e7));
    // One spare column: an edge on the right border writes a pixel past it.
    let (w, h) = ((bx1 - bx0) as usize + 2, (by1 - by0) as usize);
    if (w * h) as f64 > MAX_FILL_PIXELS {
        return false;
    }
    let mut acc = vec![0.0f32; w * h + 1];
    for poly in polys {
        for i in 0..poly.len() {
            let (a, b) = (poly[i], poly[(i + 1) % poly.len()]);
            line(
                &mut acc,
                w,
                h,
                [a[0] - bx0, a[1] - by0],
                [b[0] - bx0, b[1] - by0],
            );
        }
    }
    for y in 0..h {
        let mut sum = 0.0f32;
        for x in 0..w {
            sum += acc[y * w + x];
            let cov = match rule {
                Rule::NonZero => sum.abs().min(1.0),
                Rule::EvenOdd => {
                    let t = sum.abs() % 2.0;
                    if t > 1.0 {
                        2.0 - t
                    } else {
                        t
                    }
                }
            };
            let (px, py) = (bx0 as i64 + x as i64, by0 as i64 + y as i64);
            if cov > 0.0 && px >= 0 && py >= 0 {
                cv.blend(px as usize, py as usize, color, cov);
            }
        }
    }
    true
}

/// Add one edge's signed area to the accumulation buffer (`w` wide, `h` tall).
fn line(acc: &mut [f32], w: usize, h: usize, p0: Pt, p1: Pt) {
    if p0[1] == p1[1] {
        return;
    }
    let (dir, p0, p1) = if p0[1] < p1[1] {
        (1.0f32, p0, p1)
    } else {
        (-1.0, p1, p0)
    };
    let dxdy = (p1[0] - p0[0]) / (p1[1] - p0[1]);
    let mut x = p0[0];
    if p0[1] < 0.0 {
        x -= p0[1] * dxdy;
    }
    let y_first = p0[1].max(0.0) as usize;
    let y_last = h.min(p1[1].ceil().max(0.0) as usize);
    for y in y_first..y_last {
        let row = y * w;
        let dy = ((y + 1) as f64).min(p1[1]) - (y as f64).max(p0[1]);
        let xnext = x + dxdy * dy;
        let d = (dy as f32) * dir;
        let (x0, x1) = if x < xnext { (x, xnext) } else { (xnext, x) };
        let x0f = x0.floor();
        let (x0i, x1c) = (x0f as usize, x1.ceil());
        let x1i = x1c as usize;
        if x1i <= x0i + 1 {
            let xmf = (0.5 * (x + xnext) - x0f) as f32;
            acc[row + x0i] += d - d * xmf;
            acc[row + x0i + 1] += d * xmf;
        } else {
            let s = (1.0 / (x1 - x0)) as f32;
            let x0fr = (x0 - x0f) as f32;
            let a0 = 0.5 * s * (1.0 - x0fr) * (1.0 - x0fr);
            let x1fr = (x1 - x1c + 1.0) as f32;
            let am = 0.5 * s * x1fr * x1fr;
            acc[row + x0i] += d * a0;
            if x1i == x0i + 2 {
                acc[row + x0i + 1] += d * (1.0 - a0 - am);
            } else {
                let a1 = s * (1.5 - x0fr);
                acc[row + x0i + 1] += d * (a1 - a0);
                for xi in x0i + 2..x1i - 1 {
                    acc[row + xi] += d * s;
                }
                let a2 = a1 + (x1i - x0i - 3) as f32 * s;
                acc[row + x1i - 1] += d * (1.0 - a2 - am);
            }
            acc[row + x1i] += d * am;
        }
        x = xnext;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const RED: Rgba = Rgba {
        r: 1.0,
        g: 0.0,
        b: 0.0,
        a: 1.0,
    };

    fn polys(d: &str) -> Vec<Vec<Pt>> {
        flatten(d, 0.01).unwrap_or_else(|e| panic!("{d}: {e}"))
    }

    fn alpha_row(d: &str, rule: Rule, w: usize, h: usize, row: usize) -> Vec<u8> {
        let mut cv = Canvas::new(w, h);
        assert!(fill(&mut cv, &polys(d), rule, RED));
        cv.to_rgba8()
            .chunks(4)
            .skip(row * w)
            .take(w)
            .map(|p| p[3])
            .collect()
    }

    #[test]
    fn lexer_reads_the_compact_forms_icon_data_uses() {
        // Signs and dots separate numbers; arc flags need no separator.
        assert_eq!(
            polys("M.5.5l-1-1 2 0 0 2z"),
            vec![vec![[0.5, 0.5], [-0.5, -0.5], [1.5, -0.5], [1.5, 1.5]]]
        );
        let a = polys("M0 0a1 1 0 00.5.5 1 1 0 01.5-.5z");
        assert!(a[0].len() > 4);
        assert_eq!(polys("M1e1 0 L2E-1 0 0 1z")[0][0], [10.0, 0.0]);
        assert_eq!(polys("M0,0,10,0,10,10z")[0].len(), 3);
    }

    #[test]
    fn relative_absolute_and_close_semantics() {
        assert_eq!(
            polys("M2 2h4v4H2z")[0],
            vec![[2.0, 2.0], [6.0, 2.0], [6.0, 6.0], [2.0, 6.0]]
        );
        // After a close, a line starts a new contour from the subpath start.
        let p = polys("M0 0h4v4z l4 0 0 4z");
        assert_eq!(p.len(), 2);
        assert_eq!(p[1][0], [0.0, 0.0]);
        // Contours of fewer than three points draw nothing.
        assert!(polys("M0 0L5 5z").is_empty());
    }

    #[test]
    fn curves_end_where_they_say_and_smooth_commands_reflect() {
        let c = polys("M0 0C0 10 10 10 10 0z");
        assert_eq!(*c[0].last().unwrap(), [10.0, 0.0]);
        // The mid-point of the cubic is (5, 7.5).
        assert!(c[0]
            .iter()
            .any(|p| (p[0] - 5.0).abs() < 0.5 && (p[1] - 7.5).abs() < 0.2));
        // S reflects the previous control point: this equals the explicit cubic.
        let s = polys("M0 0C0 4 4 4 4 0S8 -4 8 0z");
        let e = polys("M0 0C0 4 4 4 4 0C4 -4 8 -4 8 0z");
        assert_eq!(s, e);
        let q = polys("M0 0Q5 10 10 0z");
        assert!(q[0]
            .iter()
            .any(|p| (p[0] - 5.0).abs() < 0.3 && (p[1] - 5.0).abs() < 0.2));
    }

    #[test]
    fn arcs_follow_the_circle_and_pick_the_requested_side() {
        // The upper half of a radius-5 circle about (5, 0): sweep 1 goes clockwise (y down).
        let up = polys("M0 0A5 5 0 0 1 10 0z");
        assert!(up[0].iter().all(|p| p[1] <= 1e-9));
        assert!(up[0]
            .iter()
            .all(|p| ((p[0] - 5.0).hypot(p[1]) - 5.0).abs() < 0.02 || p[1] == 0.0));
        assert!(up[0].iter().any(|p| (p[1] + 5.0).abs() < 0.02));
        let down = polys("M0 0A5 5 0 0 0 10 0z");
        assert!(down[0].iter().all(|p| p[1] >= -1e-9));
        // Radii too small for the endpoints scale up to a half circle.
        assert!(polys("M0 0A1 1 0 0 1 10 0z")[0]
            .iter()
            .any(|p| (p[1] + 5.0).abs() < 0.02));
    }

    #[test]
    fn bad_path_data_is_an_error() {
        for d in [
            "L1 1",
            "M0 0X1",
            "M0",
            "M0 0 a1 1 0 2 0 1 1",
            "hello",
            "M0 0 L1 z 5",
        ] {
            assert!(flatten(d, 0.1).is_err(), "{d}");
        }
        assert!(flatten("", 0.1).unwrap().is_empty());
    }

    #[test]
    fn whole_and_half_pixels() {
        assert_eq!(
            alpha_row("M1 0h2v2h-2z", Rule::NonZero, 4, 2, 0),
            vec![0, 255, 255, 0]
        );
        // Edges at 1.5 and 3.5: half coverage at both ends.
        let r = alpha_row("M1.5 0H3.5V2H1.5z", Rule::NonZero, 5, 2, 1);
        assert_eq!((r[0], r[4]), (0, 0));
        assert!(
            (126..=129).contains(&r[1]) && (126..=129).contains(&r[3]),
            "{r:?}"
        );
        assert_eq!(r[2], 255);
    }

    #[test]
    fn a_diagonal_edge_covers_half_of_its_pixels() {
        let mut cv = Canvas::new(8, 8);
        assert!(fill(&mut cv, &polys("M0 0L8 0L0 8z"), Rule::NonZero, RED));
        let px = cv.to_rgba8();
        let a = |x: usize, y: usize| px[(y * 8 + x) * 4 + 3];
        assert_eq!(a(0, 0), 255);
        assert_eq!(a(7, 7), 0);
        assert!((120..=135).contains(&a(3, 4)), "{}", a(3, 4));
    }

    #[test]
    fn fill_rules_differ_on_nested_contours() {
        let hole_same_dir = "M0 0h8v8H0zM2 2h4v4H2z";
        let hole_opposite = "M0 0h8v8H0zM2 2v4h4V2z";
        let mid = |d, rule| alpha_row(d, rule, 8, 8, 4)[4];
        assert_eq!(mid(hole_same_dir, Rule::NonZero), 255);
        assert_eq!(mid(hole_same_dir, Rule::EvenOdd), 0);
        assert_eq!(mid(hole_opposite, Rule::NonZero), 0);
        assert_eq!(mid(hole_opposite, Rule::EvenOdd), 0);
        assert_eq!(alpha_row(hole_opposite, Rule::NonZero, 8, 8, 4)[0], 255);
        assert_eq!(Rule::parse(Some("evenodd")), Rule::EvenOdd);
        assert_eq!(Rule::parse(None), Rule::NonZero);
    }

    #[test]
    fn shapes_off_the_canvas_clip_and_huge_ones_are_refused() {
        let mut cv = Canvas::new(4, 4);
        let big = vec![vec![
            [-100.0, -100.0],
            [100.0, -100.0],
            [100.0, 100.0],
            [-100.0, 100.0],
        ]];
        assert!(fill(&mut cv, &big, Rule::NonZero, RED));
        assert!(cv.to_rgba8().chunks(4).all(|p| p[3] == 255));
        let huge = vec![vec![[0.0, 0.0], [1.0e6, 0.0], [1.0e6, 1.0e6]]];
        assert!(!fill(&mut cv, &huge, Rule::NonZero, RED));
        let nan = vec![vec![[0.0, 0.0], [f64::NAN, 0.0], [1.0, 1.0]]];
        assert!(!fill(&mut cv, &nan, Rule::NonZero, RED));
    }
}
