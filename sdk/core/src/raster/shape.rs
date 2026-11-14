// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Anti-aliased shapes from signed distances. A distance is in scene units, negative inside.
//! The scene-to-pixel map is a uniform scale plus a shift, so a distance times `scale` is the
//! distance in pixels and `0.5 - px_distance` is the pixel's coverage.

use super::canvas::{Canvas, Rgba};

/// Scene point `p` lands on pixel `p * s + (tx, ty)`.
#[derive(Debug, Clone, Copy)]
pub struct Xf {
    pub s: f64,
    pub tx: f64,
    pub ty: f64,
}

impl Xf {
    pub fn scale(s: f64) -> Self {
        Self {
            s,
            tx: 0.0,
            ty: 0.0,
        }
    }

    /// `self` after a scale `k` about scene point `(cx, cy)`: the press effect.
    pub fn pressed(self, k: f64, cx: f64, cy: f64) -> Self {
        Self {
            s: self.s * k,
            tx: self.tx + self.s * cx * (1.0 - k),
            ty: self.ty + self.s * cy * (1.0 - k),
        }
    }
}

/// How a distance field turns into coverage.
#[derive(Debug, Clone, Copy)]
pub enum Paint {
    /// Everything inside the shape.
    Fill,
    /// The band within `half_width` of the shape's edge.
    Band(f64),
}

/// Signed distance to a rounded box; `r` is `[top-left, top-right, bottom-right, bottom-left]`.
pub fn rrect_sdf(px: f64, py: f64, x: f64, y: f64, w: f64, h: f64, r: [f64; 4]) -> f64 {
    let (hx, hy) = (w / 2.0, h / 2.0);
    let (qx, qy) = (px - (x + hx), py - (y + hy));
    let r = match (qx > 0.0, qy > 0.0) {
        (false, false) => r[0],
        (true, false) => r[1],
        (true, true) => r[2],
        (false, true) => r[3],
    }
    .min(hx.min(hy))
    .max(0.0);
    let (dx, dy) = (qx.abs() - hx + r, qy.abs() - hy + r);
    dx.max(dy).min(0.0) + dx.max(0.0).hypot(dy.max(0.0)) - r
}

/// Fill or stroke the shape whose signed distance is `sdf`, inside the scene box
/// `(x0, y0, x1, y1)` (padded here for the anti-aliased edge).
pub fn paint(
    cv: &mut Canvas,
    xf: Xf,
    bounds: (f64, f64, f64, f64),
    color: Rgba,
    how: Paint,
    sdf: impl Fn(f64, f64) -> f64,
) {
    if color.a <= 0.0 || xf.s <= 0.0 {
        return;
    }
    let (x0, y0, x1, y1) = bounds;
    let clamp = |v: f64, hi: usize| v.floor().clamp(0.0, hi as f64) as usize;
    let (px0, px1) = (
        clamp(x0 * xf.s + xf.tx - 1.0, cv.width),
        clamp((x1 * xf.s + xf.tx).ceil() + 1.0, cv.width),
    );
    let (py0, py1) = (
        clamp(y0 * xf.s + xf.ty - 1.0, cv.height),
        clamp((y1 * xf.s + xf.ty).ceil() + 1.0, cv.height),
    );
    for py in py0..py1 {
        for px in px0..px1 {
            let (sx, sy) = (
                ((px as f64 + 0.5) - xf.tx) / xf.s,
                ((py as f64 + 0.5) - xf.ty) / xf.s,
            );
            let d = sdf(sx, sy);
            let d = match how {
                Paint::Fill => d,
                Paint::Band(hw) => d.abs() - hw,
            };
            let cov = (0.5 - d * xf.s).clamp(0.0, 1.0);
            if cov > 0.0 {
                cv.blend(px, py, color, cov as f32);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounded_box_distance() {
        let d = |x, y, r| rrect_sdf(x, y, 0.0, 0.0, 20.0, 10.0, r);
        assert_eq!(d(10.0, 5.0, [0.0; 4]), -5.0);
        assert_eq!(d(-3.0, 5.0, [0.0; 4]), 3.0);
        // The square corner is inside the box, the rounded one is outside it.
        assert!(d(0.2, 0.2, [0.0; 4]) < 0.0);
        assert!(d(0.2, 0.2, [5.0; 4]) > 0.0);
        // A radius past half the short side clamps to a pill.
        assert_eq!(d(10.0, 5.0, [99.0; 4]), d(10.0, 5.0, [5.0; 4]));
        // Only the named corner rounds.
        assert!(d(19.8, 0.2, [0.0, 5.0, 0.0, 0.0]) > 0.0);
        assert!(d(0.2, 0.2, [0.0, 5.0, 0.0, 0.0]) < 0.0);
    }

    #[test]
    fn press_scales_about_a_point() {
        let x = Xf::scale(2.0).pressed(0.5, 10.0, 10.0);
        // The center stays put; a point 10 away from it moves to 5 away, at 2px per unit.
        assert_eq!((10.0 * x.s + x.tx, 10.0 * x.s + x.ty), (20.0, 20.0));
        assert_eq!(20.0 * x.s + x.tx, 30.0);
    }

    #[test]
    fn edge_pixels_get_partial_coverage() {
        let mut cv = Canvas::new(8, 4);
        let col = Rgba {
            r: 1.0,
            g: 1.0,
            b: 1.0,
            a: 1.0,
        };
        // A box from x=1.5: pixel 1 is half covered.
        paint(
            &mut cv,
            Xf::scale(1.0),
            (1.5, 0.0, 6.0, 4.0),
            col,
            Paint::Fill,
            |x, y| rrect_sdf(x, y, 1.5, 0.0, 4.5, 4.0, [0.0; 4]),
        );
        let px = cv.to_rgba8();
        let a = |x: usize, y: usize| px[(y * 8 + x) * 4 + 3];
        assert_eq!(a(0, 2), 0);
        assert!((120..=135).contains(&a(1, 2)), "{}", a(1, 2));
        assert_eq!(a(3, 2), 255);
        assert_eq!(a(7, 2), 0);
    }
}
