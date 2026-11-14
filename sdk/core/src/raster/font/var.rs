// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! OpenType font variations for `glyf` fonts: `fvar` axes, `avar` remapping, `gvar` glyph
//! deltas (with interpolation of untouched points) and `HVAR` advance deltas.
//!
//! Coordinates are normalized per axis to -1..=1 and rounded to F2Dot14, as browsers do, so
//! a weight lands on the same outline here as in a page.

use super::{i16_at, u16_at, u32_at, Font, OutlinePoint};

#[derive(Debug, Clone, PartialEq)]
pub struct Axis {
    pub tag: [u8; 4],
    pub min: f64,
    pub default: f64,
    pub max: f64,
}

impl Axis {
    pub fn tag_str(&self) -> String {
        String::from_utf8_lossy(&self.tag).into_owned()
    }
}

fn f2dot14(d: &[u8], o: usize) -> Option<f64> {
    Some(f64::from(i16_at(d, o)?) / 16384.0)
}

impl Font {
    /// True when the font has the tables to change an outline with an axis value.
    pub fn is_variable(&self) -> bool {
        self.has_table(b"fvar") && self.has_table(b"gvar")
    }

    /// The design axes; empty for a static font.
    pub fn axes(&self) -> Vec<Axis> {
        let Some((base, _)) = self.table(b"fvar") else {
            return vec![];
        };
        let d = &self.data;
        let read = || -> Option<Vec<Axis>> {
            let (off, count, size) = (
                u16_at(d, base + 4)? as usize,
                u16_at(d, base + 8)? as usize,
                u16_at(d, base + 10)? as usize,
            );
            (0..count)
                .map(|i| {
                    let a = base + off + i * size;
                    let fixed = |o: usize| Some(f64::from(u32_at(d, o)? as i32) / 65536.0);
                    Some(Axis {
                        tag: d.get(a..a + 4)?.try_into().ok()?,
                        min: fixed(a + 4)?,
                        default: fixed(a + 8)?,
                        max: fixed(a + 12)?,
                    })
                })
                .collect()
        };
        read().unwrap_or_default()
    }

    /// Normalized coordinates, one per axis, for the requested `(tag, value)` pairs; an axis
    /// not named keeps its default. Values outside an axis's range are clamped to it.
    pub fn normalize(&self, wanted: &[(&str, f64)]) -> Vec<f64> {
        let axes = self.axes();
        let avar = self.avar_maps(axes.len());
        axes.iter()
            .enumerate()
            .map(|(i, a)| {
                let v = wanted
                    .iter()
                    .find(|(t, _)| t.as_bytes() == a.tag)
                    .map_or(a.default, |w| w.1)
                    .clamp(a.min, a.max);
                let n = normalize_axis(v, a);
                let mapped = avar.get(i).map_or(n, |m| remap(m, n));
                (mapped.clamp(-1.0, 1.0) * 16384.0).round() / 16384.0
            })
            .collect()
    }

    /// Per-axis `avar` segment maps (`from -> to`), empty when the font has none.
    fn avar_maps(&self, axes: usize) -> Vec<Vec<(f64, f64)>> {
        let Some((base, _)) = self.table(b"avar") else {
            return vec![];
        };
        let d = &self.data;
        let read = || -> Option<Vec<Vec<(f64, f64)>>> {
            if u16_at(d, base)? != 1 || u16_at(d, base + 6)? as usize != axes {
                return None;
            }
            let mut p = base + 8;
            let mut maps = Vec::with_capacity(axes);
            for _ in 0..axes {
                let n = u16_at(d, p)? as usize;
                p += 2;
                let mut m = Vec::with_capacity(n);
                for _ in 0..n {
                    m.push((f2dot14(d, p)?, f2dot14(d, p + 2)?));
                    p += 4;
                }
                maps.push(m);
            }
            Some(maps)
        };
        read().unwrap_or_default()
    }

    /// Horizontal advance of `glyph` at normalized `coords` (from [`Font::normalize`]), using
    /// `HVAR`. A font without `HVAR` keeps its default advances.
    pub fn advance_at(&self, glyph: u16, coords: &[f64]) -> f64 {
        let base = self.advance(glyph);
        if coords.iter().all(|c| *c == 0.0) {
            return base;
        }
        base + self.hvar_delta(glyph, coords).unwrap_or(0.0)
    }

    /// Whether advances change with the axes (`HVAR` present).
    pub fn has_advance_variations(&self) -> bool {
        self.has_table(b"HVAR")
    }

    fn hvar_delta(&self, glyph: u16, coords: &[f64]) -> Option<f64> {
        let (h, _) = self.table(b"HVAR")?;
        let d = &self.data;
        let store = h + u32_at(d, h + 4)? as usize;
        let map = u32_at(d, h + 8)? as usize;
        let (outer, inner) = if map == 0 {
            (0, glyph as usize)
        } else {
            let o = h + map;
            let (format, entry) = (*d.get(o)?, *d.get(o + 1)?);
            let (count, mut p) = if format == 0 {
                (u16_at(d, o + 2)? as usize, o + 4)
            } else {
                (u32_at(d, o + 2)? as usize, o + 6)
            };
            let (inner_bits, size) = (
                u32::from(entry & 0xF) + 1,
                usize::from((entry >> 4) & 3) + 1,
            );
            p += (glyph as usize).min(count.checked_sub(1)?) * size;
            let v = d
                .get(p..p + size)?
                .iter()
                .fold(0usize, |a, b| (a << 8) | usize::from(*b));
            (v >> inner_bits, v & ((1usize << inner_bits) - 1))
        };
        let region_list = store + u32_at(d, store + 2)? as usize;
        if outer >= u16_at(d, store + 6)? as usize {
            return None;
        }
        let data = store + u32_at(d, store + 8 + 4 * outer)? as usize;
        let (items, raw_words, regions) = (
            u16_at(d, data)? as usize,
            u16_at(d, data + 2)?,
            u16_at(d, data + 4)? as usize,
        );
        let (long, words) = (raw_words & 0x8000 != 0, (raw_words & 0x7FFF) as usize);
        if inner >= items || words > regions {
            return None;
        }
        let (wide, narrow) = if long { (4, 2) } else { (2, 1) };
        let row = data + 6 + 2 * regions + inner * (wide * words + narrow * (regions - words));
        let axes = u16_at(d, region_list)? as usize;
        if axes != coords.len() {
            return None;
        }
        let mut total = 0.0;
        let mut p = row;
        for k in 0..regions {
            let delta = if k < words {
                let v = if long {
                    f64::from(u32_at(d, p)? as i32)
                } else {
                    f64::from(i16_at(d, p)?)
                };
                p += wide;
                v
            } else {
                let v = if long {
                    f64::from(i16_at(d, p)?)
                } else {
                    f64::from(*d.get(p)? as i8)
                };
                p += narrow;
                v
            };
            let region = region_list + 4 + usize::from(u16_at(d, data + 6 + 2 * k)?) * axes * 6;
            let mut scalar = 1.0;
            for (a, c) in coords.iter().enumerate() {
                let r = region + a * 6;
                let (start, peak, end) = (f2dot14(d, r)?, f2dot14(d, r + 2)?, f2dot14(d, r + 4)?);
                scalar *= axis_scalar(*c, start, peak, end);
            }
            total += delta * scalar;
        }
        Some(total)
    }

    /// `gvar` deltas for a glyph: one `(dx, dy)` per point plus four phantom points. `orig` are
    /// the glyph's points (or composite component offsets) and `ends` the contour end
    /// indices of a simple glyph, used to interpolate points a tuple leaves untouched.
    pub(super) fn glyph_deltas(
        &self,
        glyph: u16,
        coords: &[f64],
        orig: &[(f64, f64)],
        ends: Option<&[usize]>,
    ) -> Option<(Vec<f64>, Vec<f64>)> {
        if coords.iter().all(|c| *c == 0.0) {
            return None;
        }
        let (g, _) = self.table(b"gvar")?;
        let d = &self.data;
        let axes = u16_at(d, g + 4)? as usize;
        if axes != coords.len() || glyph >= u16_at(d, g + 12)? {
            return None;
        }
        let (shared_n, shared_at) = (u16_at(d, g + 6)? as usize, g + u32_at(d, g + 8)? as usize);
        let long = u16_at(d, g + 14)? & 1 != 0;
        let array = g + u32_at(d, g + 16)? as usize;
        let offset = |i: usize| -> Option<usize> {
            Some(if long {
                u32_at(d, g + 20 + 4 * i)? as usize
            } else {
                u16_at(d, g + 20 + 2 * i)? as usize * 2
            })
        };
        let (a, b) = (offset(glyph as usize)?, offset(glyph as usize + 1)?);
        if a >= b || array + b > d.len() {
            return None;
        }
        let base = array + a;
        let field = u16_at(d, base)?;
        let (count, has_shared) = ((field & 0x0FFF) as usize, field & 0x8000 != 0);
        let mut data_at = base + u16_at(d, base + 2)? as usize;
        let mut head = base + 4;
        let total = orig.len() + 4;
        let shared_points = if has_shared {
            let (pts, used) = read_points(d, data_at, total)?;
            data_at += used;
            Some(pts)
        } else {
            None
        };
        let (mut dx, mut dy) = (vec![0.0; total], vec![0.0; total]);
        for _ in 0..count {
            let (size, index) = (u16_at(d, head)? as usize, u16_at(d, head + 2)?);
            head += 4;
            let tuple = |at: usize| -> Option<Vec<f64>> {
                (0..axes).map(|i| f2dot14(d, at + 2 * i)).collect()
            };
            let peak = if index & 0x8000 != 0 {
                let t = tuple(head)?;
                head += 2 * axes;
                t
            } else {
                let i = (index & 0x0FFF) as usize;
                if i >= shared_n {
                    return None;
                }
                tuple(shared_at + 2 * axes * i)?
            };
            let region = if index & 0x4000 != 0 {
                let r = (tuple(head)?, tuple(head + 2 * axes)?);
                head += 4 * axes;
                Some(r)
            } else {
                None
            };
            let (mut p, tuple_end) = (data_at, data_at + size);
            data_at = tuple_end;
            let mut scalar = 1.0;
            for (i, c) in coords.iter().enumerate() {
                let (start, end) = region
                    .as_ref()
                    .map_or((peak[i].min(0.0), peak[i].max(0.0)), |r| (r.0[i], r.1[i]));
                scalar *= if peak[i] == 0.0 {
                    1.0
                } else {
                    axis_scalar(*c, start, peak[i], end)
                };
            }
            if scalar == 0.0 {
                continue;
            }
            let points = if index & 0x2000 != 0 {
                let (pts, used) = read_points(d, p, total)?;
                p += used;
                pts
            } else {
                shared_points.clone()?
            };
            let xs = read_deltas(d, &mut p, points.len(), tuple_end)?;
            let ys = read_deltas(d, &mut p, points.len(), tuple_end)?;
            let (mut tx, mut ty, mut touched) =
                (vec![0.0; total], vec![0.0; total], vec![false; total]);
            for (k, &pi) in points.iter().enumerate() {
                if pi < total {
                    (tx[pi], ty[pi], touched[pi]) = (xs[k], ys[k], true);
                }
            }
            if let (Some(ends), true) = (ends, points.len() < total) {
                let mut start = 0;
                for &end in ends {
                    let range = start..=end;
                    let xo: Vec<f64> = orig[range.clone()].iter().map(|p| p.0).collect();
                    let yo: Vec<f64> = orig[range.clone()].iter().map(|p| p.1).collect();
                    iup(&xo, &mut tx[range.clone()], &touched[range.clone()]);
                    iup(&yo, &mut ty[range.clone()], &touched[range.clone()]);
                    start = end + 1;
                }
            }
            for i in 0..total {
                dx[i] += scalar * tx[i];
                dy[i] += scalar * ty[i];
            }
        }
        Some((dx, dy))
    }
}

/// `v` as -1..=1 about the axis default: 0 at the default, -1 at the minimum, 1 at the maximum.
fn normalize_axis(v: f64, a: &Axis) -> f64 {
    let n = if v < a.default {
        (v - a.default) / (a.default - a.min)
    } else if v > a.default {
        (v - a.default) / (a.max - a.default)
    } else {
        0.0
    };
    if n.is_finite() {
        n
    } else {
        0.0
    }
}

fn remap(map: &[(f64, f64)], v: f64) -> f64 {
    for w in map.windows(2) {
        let ((f0, t0), (f1, t1)) = (w[0], w[1]);
        if v >= f0 && v <= f1 {
            return if f1 == f0 {
                t0
            } else {
                t0 + (t1 - t0) * (v - f0) / (f1 - f0)
            };
        }
    }
    v
}

/// How much a region (`start`, `peak`, `end`) applies at coordinate `c`; 1 at the peak, 0
/// outside it.
fn axis_scalar(c: f64, start: f64, peak: f64, end: f64) -> f64 {
    if peak == 0.0 || start > peak || peak > end || (start < 0.0 && end > 0.0) {
        return 1.0;
    }
    if c == peak {
        1.0
    } else if c <= start || c >= end {
        0.0
    } else if c < peak {
        (c - start) / (peak - start)
    } else {
        (end - c) / (end - peak)
    }
}

/// Packed point numbers; returns the indices and the bytes used. A count of zero means every point.
fn read_points(d: &[u8], at: usize, total: usize) -> Option<(Vec<usize>, usize)> {
    let b0 = *d.get(at)?;
    let (count, mut p) = if b0 & 0x80 != 0 {
        (
            (usize::from(b0 & 0x7F) << 8) | usize::from(*d.get(at + 1)?),
            at + 2,
        )
    } else {
        (usize::from(b0), at + 1)
    };
    if count == 0 {
        return Some(((0..total).collect(), p - at));
    }
    let (mut pts, mut last) = (Vec::with_capacity(count), 0usize);
    while pts.len() < count {
        let control = *d.get(p)?;
        p += 1;
        for _ in 0..=(control & 0x7F) {
            if pts.len() == count {
                break;
            }
            if control & 0x80 != 0 {
                last += u16_at(d, p)? as usize;
                p += 2;
            } else {
                last += usize::from(*d.get(p)?);
                p += 1;
            }
            pts.push(last);
        }
    }
    Some((pts, p - at))
}

/// Packed deltas (zero runs, byte runs, word runs), reading at most up to `limit`.
fn read_deltas(d: &[u8], p: &mut usize, count: usize, limit: usize) -> Option<Vec<f64>> {
    let mut out = Vec::with_capacity(count);
    while out.len() < count {
        let control = *d.get(*p).filter(|_| *p < limit)?;
        *p += 1;
        for _ in 0..=(control & 0x3F) {
            let v = if control & 0x80 != 0 {
                0.0
            } else if control & 0x40 != 0 {
                *p += 2;
                f64::from(i16_at(d, *p - 2)?)
            } else {
                *p += 1;
                f64::from(*d.get(*p - 1)? as i8)
            };
            if out.len() < count {
                out.push(v);
            }
        }
        if *p > limit {
            return None;
        }
    }
    Some(out)
}

/// Interpolate the deltas of untouched points in one contour from its touched points
/// (the "inferred deltas" step), one axis at a time.
fn iup(orig: &[f64], delta: &mut [f64], touched: &[bool]) {
    let t: Vec<usize> = (0..orig.len()).filter(|&i| touched[i]).collect();
    match t.len() {
        0 => return,
        1 => {
            let v = delta[t[0]];
            delta.iter_mut().for_each(|d| *d = v);
            return;
        }
        _ => {}
    }
    let n = orig.len();
    for w in 0..t.len() {
        let (a, b) = (t[w], t[(w + 1) % t.len()]);
        let mut i = (a + 1) % n;
        while i != b {
            delta[i] = infer(orig[i], orig[a], orig[b], delta[a], delta[b]);
            i = (i + 1) % n;
        }
    }
}

fn infer(x: f64, x1: f64, x2: f64, d1: f64, d2: f64) -> f64 {
    if x1 == x2 {
        return if d1 == d2 { d1 } else { 0.0 };
    }
    let (lo, hi, dlo, dhi) = if x1 < x2 {
        (x1, x2, d1, d2)
    } else {
        (x2, x1, d2, d1)
    };
    if x <= lo {
        dlo
    } else if x >= hi {
        dhi
    } else {
        dlo + (dhi - dlo) * (x - lo) / (hi - lo)
    }
}

impl Font {
    pub(super) fn apply_simple(
        &self,
        glyph: u16,
        coords: &[f64],
        contours: &mut [Vec<OutlinePoint>],
    ) {
        let orig: Vec<(f64, f64)> = contours.iter().flatten().map(|p| (p.x, p.y)).collect();
        let mut ends = Vec::with_capacity(contours.len());
        let mut n = 0;
        for c in contours.iter().filter(|c| !c.is_empty()) {
            n += c.len();
            ends.push(n - 1);
        }
        if let Some((dx, dy)) = self.glyph_deltas(glyph, coords, &orig, Some(&ends)) {
            for (i, p) in contours.iter_mut().flatten().enumerate() {
                p.x += dx[i];
                p.y += dy[i];
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::tests::font;
    use super::*;

    /// Outlines and advances of Source Sans 3 VF at wght 400, 700 and 900, made by
    /// fontTools' `instancer` (an independent implementation of avar/gvar/HVAR).
    const INSTANCES: &str = include_str!("testdata/ss3-instances.json");

    fn axis(min: f64, default: f64, max: f64) -> Axis {
        Axis {
            tag: *b"test",
            min,
            default,
            max,
        }
    }

    #[test]
    fn reads_the_axes_and_normalizes_through_avar() {
        let f = font();
        assert!(f.is_variable() && f.has_advance_variations());
        assert_eq!(
            f.axes(),
            vec![Axis {
                tag: *b"wght",
                min: 200.0,
                default: 200.0,
                max: 900.0
            }]
        );
        assert_eq!(f.axes()[0].tag_str(), "wght");
        assert_eq!(f.normalize(&[]), vec![0.0]);
        assert_eq!(f.normalize(&[("wght", 200.0)]), vec![0.0]);
        assert_eq!(f.normalize(&[("wght", 900.0)]), vec![1.0]);
        assert_eq!(f.normalize(&[("wght", 5000.0)]), vec![1.0]);
        assert_eq!(f.normalize(&[("wght", 1.0)]), vec![0.0]);
        // 400 is 0.2857 along the axis, which avar maps to about 0.368: not linear.
        let n = f.normalize(&[("wght", 400.0), ("wdth", 100.0)])[0];
        assert!((n - 0.368).abs() < 0.001, "{n}");
        assert!(f.normalize(&[("wght", f64::NAN)])[0] == 0.0);
    }

    #[test]
    fn axis_normalization_handles_defaults_at_an_extreme() {
        // Adobe Clean Spectrum VF: both axes default to their minimum, so an unset width is
        // the narrowest and 100 must be asked for.
        let wdth = axis(62.5, 62.5, 125.0);
        assert_eq!(normalize_axis(62.5, &wdth), 0.0);
        assert_eq!(normalize_axis(100.0, &wdth), 0.6);
        assert_eq!(normalize_axis(125.0, &wdth), 1.0);
        let wght = axis(100.0, 100.0, 900.0);
        assert_eq!(normalize_axis(400.0, &wght), 0.375);
        // An axis with a default inside its range goes negative below it.
        assert_eq!(normalize_axis(50.0, &axis(0.0, 100.0, 200.0)), -0.5);
        // A degenerate axis does not produce NaN.
        assert_eq!(normalize_axis(5.0, &axis(1.0, 1.0, 1.0)), 0.0);
    }

    #[test]
    fn outlines_and_advances_match_fonttools_at_three_weights() {
        let f = font();
        let expected: serde_json::Value = serde_json::from_str(INSTANCES).unwrap();
        for weight in [400, 700, 900] {
            let coords = f.normalize(&[("wght", f64::from(weight))]);
            for ch in ['H', 'o', 'é'] {
                let want = &expected[format!("{ch}{weight}")];
                let g = f.glyph_index(ch);
                let got: Vec<OutlinePoint> = f
                    .outline_at(g, &coords)
                    .unwrap()
                    .into_iter()
                    .flatten()
                    .collect();
                let pts = want["pts"].as_array().unwrap();
                assert_eq!(got.len(), pts.len(), "{ch} {weight}: point count");
                for (i, (p, w)) in got.iter().zip(pts).enumerate() {
                    let (wx, wy) = (w[0].as_f64().unwrap(), w[1].as_f64().unwrap());
                    assert!(
                        (p.x - wx).abs() <= 1.0 && (p.y - wy).abs() <= 1.0,
                        "{ch} {weight} point {i}: got ({}, {}), want ({wx}, {wy})",
                        p.x,
                        p.y
                    );
                    assert_eq!(
                        p.on,
                        want["on"][i] == 1,
                        "{ch} {weight} point {i}: on-curve"
                    );
                }
                let adv = f.advance_at(g, &coords);
                let w = want["adv"].as_f64().unwrap();
                assert!(
                    (adv - w).abs() <= 1.0,
                    "{ch} {weight}: advance {adv}, want {w}"
                );
            }
        }
    }

    #[test]
    fn the_default_instance_is_the_plain_outline_and_weight_changes_the_glyph() {
        let f = font();
        let g = f.glyph_index('H');
        assert_eq!(
            f.outline_at(g, &f.normalize(&[("wght", 200.0)])).unwrap(),
            f.outline(g).unwrap()
        );
        assert_eq!(f.outline_at(g, &[]).unwrap(), f.outline(g).unwrap());
        let adv = |w: f64| f.advance_at(g, &f.normalize(&[("wght", w)]));
        assert!(adv(200.0) < adv(400.0) && adv(400.0) < adv(700.0) && adv(700.0) < adv(900.0));
        // Coordinates for a different number of axes are ignored, not misapplied.
        assert_eq!(f.outline_at(g, &[0.5, 0.5]).unwrap(), f.outline(g).unwrap());
        assert_eq!(f.advance_at(g, &[0.5, 0.5]), f.advance(g));
    }

    #[test]
    fn packed_point_numbers_and_deltas() {
        // Three byte-sized deltas 1, 2, 3 accumulate to 1, 3, 6.
        assert_eq!(
            read_points(&[3, 0x02, 1, 2, 3], 0, 9),
            Some((vec![1, 3, 6], 5))
        );
        // Two word-sized: 5 then +256.
        assert_eq!(
            read_points(&[2, 0x81, 0, 5, 1, 0], 0, 9),
            Some((vec![5, 261], 6))
        );
        // A count of zero is every point; a two-byte count works.
        assert_eq!(read_points(&[0], 0, 3), Some((vec![0, 1, 2], 1)));
        assert_eq!(read_points(&[0x80, 1, 0x00, 7], 0, 9), Some((vec![7], 4)));
        assert_eq!(read_points(&[3, 0x02, 1], 0, 9), None, "truncated");

        let mut p = 0;
        assert_eq!(read_deltas(&[0x82], &mut p, 3, 1), Some(vec![0.0; 3]));
        p = 0;
        assert_eq!(
            read_deltas(&[0x01, 5, 0xFB], &mut p, 2, 3),
            Some(vec![5.0, -5.0])
        );
        p = 0;
        assert_eq!(
            read_deltas(&[0x41, 1, 0, 0xFF, 0xFF], &mut p, 2, 5),
            Some(vec![256.0, -1.0])
        );
        // A run longer than asked is cut, and one past the tuple's data is refused.
        p = 0;
        assert_eq!(
            read_deltas(&[0x02, 1, 2, 3], &mut p, 2, 4),
            Some(vec![1.0, 2.0])
        );
        p = 0;
        assert_eq!(read_deltas(&[0x02, 1, 2, 3], &mut p, 3, 2), None);
    }

    #[test]
    fn untouched_points_are_interpolated_between_touched_ones() {
        // Points at x 0, 10, 20, 30; the ends move 0 and 6, so the middle ones move 2 and 4.
        let mut d = [0.0, 0.0, 0.0, 6.0];
        iup(
            &[0.0, 10.0, 20.0, 30.0],
            &mut d,
            &[true, false, false, true],
        );
        assert_eq!(d, [0.0, 2.0, 4.0, 6.0]);
        // One touched point moves the whole contour; none leaves it alone.
        let mut d = [0.0, 3.0, 0.0];
        iup(&[0.0, 5.0, 9.0], &mut d, &[false, true, false]);
        assert_eq!(d, [3.0, 3.0, 3.0]);
        let mut d = [1.0, 2.0];
        iup(&[0.0, 5.0], &mut d, &[false, false]);
        assert_eq!(d, [1.0, 2.0]);
        // Outside the touched range a point takes the nearer end's delta.
        assert_eq!(infer(-5.0, 0.0, 10.0, 1.0, 3.0), 1.0);
        assert_eq!(infer(15.0, 10.0, 0.0, 3.0, 1.0), 3.0);
        assert_eq!(infer(5.0, 4.0, 4.0, 2.0, 9.0), 0.0);
        assert_eq!(infer(5.0, 4.0, 4.0, 2.0, 2.0), 2.0);
    }

    #[test]
    fn region_scalars() {
        assert_eq!(axis_scalar(0.5, 0.0, 1.0, 1.0), 0.5);
        assert_eq!(axis_scalar(1.0, 0.0, 1.0, 1.0), 1.0);
        assert_eq!(axis_scalar(0.0, 0.0, 1.0, 1.0), 0.0);
        assert_eq!(axis_scalar(-0.5, 0.0, 1.0, 1.0), 0.0);
        assert_eq!(axis_scalar(0.75, 0.0, 0.5, 1.0), 0.5);
        assert_eq!(
            axis_scalar(0.3, -1.0, 0.0, 1.0),
            1.0,
            "peak 0 ignores the axis"
        );
        assert_eq!(
            remap(&[(-1.0, -1.0), (0.0, 0.0), (0.5, 0.8), (1.0, 1.0)], 0.25),
            0.4
        );
        assert_eq!(remap(&[], 0.3), 0.3);
    }

    #[test]
    fn damaged_variation_tables_never_panic() {
        let f = font();
        for tag in [b"gvar", b"HVAR", b"avar"] {
            let (off, len) = f.table(tag).unwrap();
            for fill in [0xFFu8, 0x00, 0x7F] {
                let mut bytes = f.data.clone();
                bytes[off + 8.min(len)..off + len].fill(fill);
                let Ok(broken) = Font::parse(bytes) else {
                    continue;
                };
                let coords = broken.normalize(&[("wght", 700.0)]);
                for g in 0..300 {
                    let _ = broken.outline_at(g, &coords);
                    let _ = broken.advance_at(g, &coords);
                }
            }
        }
    }
}
