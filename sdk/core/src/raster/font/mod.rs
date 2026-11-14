// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A TrueType (`glyf`) font reader: character mapping, advances and glyph outlines.
//!
//! Only what drawing text needs: `head`, `hhea`, `hmtx`, `maxp`, `cmap` (formats 4 and 12),
//! `loca`, `glyf` (simple and composite glyphs) and `name`. CFF/CFF2 (`OTTO`) and WOFF files
//! are refused with a message that says so, rather than misread.

use super::path::Pt;
use super::{family_key, FontSource};

#[cfg(not(target_arch = "wasm32"))]
pub mod discover;
pub mod metrics;
pub mod resolve;
pub mod var;
pub use var::Axis;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FontError(pub String);

impl std::fmt::Display for FontError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for FontError {}

fn bad(what: &str) -> FontError {
    FontError(format!("font data is truncated or malformed ({what})"))
}

/// One outline point: font units, y up. `on` is false for a quadratic control point.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OutlinePoint {
    pub x: f64,
    pub y: f64,
    pub on: bool,
}

pub type Contour = Vec<OutlinePoint>;

/// Deepest composite-glyph nesting followed, so a malicious font cannot recurse forever.
const MAX_COMPOSITE_DEPTH: usize = 6;
/// Components one composite glyph may pull in, across all nesting.
const MAX_COMPONENTS: usize = 256;

/// How a font file stores its outlines.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Flavor {
    /// `glyf` quadratic outlines (`.ttf`), which this renderer reads.
    TrueType,
    /// PostScript `CFF`/`CFF2` outlines (often `.otf`), which it does not.
    Cff,
}

/// What a font file says about itself, read without checking its outlines.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct Inspect {
    pub flavor: Flavor,
    pub family: Option<String>,
    pub subfamily: Option<String>,
    /// Has `fvar` axes.
    pub variable: bool,
}

#[derive(Debug, Clone)]
pub struct Font {
    data: Vec<u8>,
    tables: Vec<([u8; 4], usize, usize)>,
    units_per_em: u16,
    num_glyphs: u16,
    long_loca: bool,
    num_h_metrics: u16,
    ascender: i16,
    descender: i16,
    cmap: (usize, u16),
}

fn u16_at(d: &[u8], o: usize) -> Option<u16> {
    Some(u16::from_be_bytes(
        d.get(o..o.checked_add(2)?)?.try_into().ok()?,
    ))
}
fn i16_at(d: &[u8], o: usize) -> Option<i16> {
    u16_at(d, o).map(|v| v as i16)
}
fn u32_at(d: &[u8], o: usize) -> Option<u32> {
    Some(u32::from_be_bytes(
        d.get(o..o.checked_add(4)?)?.try_into().ok()?,
    ))
}

impl Font {
    /// The table directory of a TrueType or CFF font, with no outline data checked.
    fn open(data: Vec<u8>) -> Result<(Flavor, Font), FontError> {
        let flavor = match data.get(..4) {
            Some([0, 1, 0, 0]) | Some(b"true") => Flavor::TrueType,
            Some(b"OTTO") => Flavor::Cff,
            Some(b"wOFF") | Some(b"wOF2") => {
                return Err(FontError(
                    "WOFF fonts are not supported; use the .ttf file".into(),
                ))
            }
            Some(b"ttcf") => {
                return Err(FontError(
                    "font collections (.ttc) are not supported".into(),
                ))
            }
            _ => return Err(FontError("not a TrueType font file".into())),
        };
        let count = u16_at(&data, 4).ok_or_else(|| bad("table directory"))? as usize;
        let mut tables = Vec::with_capacity(count);
        for i in 0..count {
            let rec = 12 + 16 * i;
            let tag: [u8; 4] = data
                .get(rec..rec + 4)
                .ok_or_else(|| bad("table directory"))?
                .try_into()
                .unwrap();
            let (off, len) = (
                u32_at(&data, rec + 8).ok_or_else(|| bad("table directory"))? as usize,
                u32_at(&data, rec + 12).ok_or_else(|| bad("table directory"))? as usize,
            );
            if off.checked_add(len).is_none_or(|end| end > data.len()) {
                return Err(bad(&format!(
                    "table '{}' runs past the end",
                    String::from_utf8_lossy(&tag)
                )));
            }
            tables.push((tag, off, len));
        }
        let font = Font {
            data,
            tables,
            units_per_em: 0,
            num_glyphs: 0,
            long_loca: false,
            num_h_metrics: 0,
            ascender: 0,
            descender: 0,
            cmap: (0, 0),
        };
        Ok((flavor, font))
    }

    /// Read a font file. Fails with a message for CFF, WOFF and damaged files.
    pub fn parse(data: Vec<u8>) -> Result<Font, FontError> {
        // Said before the directory is read, so even a damaged CFF file gets the useful message.
        if data.get(..4) == Some(b"OTTO") {
            return Err(FontError(
                "CFF/CFF2 fonts (.otf with PostScript outlines) are not supported; use the TrueType (.ttf) file".into(),
            ));
        }
        let (_, mut font) = Self::open(data)?;
        for tag in [
            b"head", b"hhea", b"maxp", b"hmtx", b"cmap", b"loca", b"glyf",
        ] {
            font.table(tag).ok_or_else(|| {
                FontError(format!(
                    "font has no '{}' table",
                    String::from_utf8_lossy(tag)
                ))
            })?;
        }
        let head = font.table(b"head").unwrap();
        font.units_per_em = u16_at(font.data.as_slice(), head.0 + 18).ok_or_else(|| bad("head"))?;
        font.long_loca = i16_at(&font.data, head.0 + 50).ok_or_else(|| bad("head"))? != 0;
        let hhea = font.table(b"hhea").unwrap().0;
        font.ascender = i16_at(&font.data, hhea + 4).ok_or_else(|| bad("hhea"))?;
        font.descender = i16_at(&font.data, hhea + 6).ok_or_else(|| bad("hhea"))?;
        font.num_h_metrics = u16_at(&font.data, hhea + 34).ok_or_else(|| bad("hhea"))?;
        font.num_glyphs =
            u16_at(&font.data, font.table(b"maxp").unwrap().0 + 4).ok_or_else(|| bad("maxp"))?;
        if font.units_per_em < 16 || font.num_glyphs == 0 || font.num_h_metrics == 0 {
            return Err(bad("head/maxp/hhea values"));
        }
        let (loca_len, hmtx_len) = (
            font.table(b"loca").unwrap().1,
            font.table(b"hmtx").unwrap().1,
        );
        let loca_need = (font.num_glyphs as usize + 1) * if font.long_loca { 4 } else { 2 };
        if loca_len < loca_need || hmtx_len < font.num_h_metrics as usize * 4 {
            return Err(bad("loca/hmtx are shorter than the glyph count"));
        }
        font.cmap = font.pick_cmap().ok_or_else(|| {
            FontError("font has no Unicode character map (cmap format 4 or 12)".into())
        })?;
        Ok(font)
    }

    fn table(&self, tag: &[u8; 4]) -> Option<(usize, usize)> {
        self.tables.iter().find(|t| &t.0 == tag).map(|t| (t.1, t.2))
    }

    /// Read a file's family, style and flavor from its table directory and `name` table. This
    /// works for CFF fonts too, so a font that cannot be drawn can still be identified. Returns
    /// the file's bytes back so a caller keeps them without copying.
    pub fn inspect(data: Vec<u8>) -> Result<(Inspect, Vec<u8>), FontError> {
        let (flavor, font) = Self::open(data)?;
        let info = Inspect {
            flavor,
            family: font.family(),
            subfamily: font.name(17).or_else(|| font.name(2)),
            variable: font.has_table(b"fvar"),
        };
        Ok((info, font.data))
    }

    /// The table's tag, for callers that check which tables a font carries.
    pub fn has_table(&self, tag: &[u8; 4]) -> bool {
        self.table(tag).is_some()
    }

    pub fn units_per_em(&self) -> f64 {
        f64::from(self.units_per_em)
    }

    pub fn num_glyphs(&self) -> u16 {
        self.num_glyphs
    }

    /// Ascent and descent (`hhea`) in font units; the descent is negative.
    pub fn ascent_descent(&self) -> (f64, f64) {
        (f64::from(self.ascender), f64::from(self.descender))
    }

    fn pick_cmap(&self) -> Option<(usize, u16)> {
        let (base, len) = self.table(b"cmap")?;
        let n = u16_at(&self.data, base + 2)? as usize;
        let mut best: Option<(u8, usize, u16)> = None;
        for i in 0..n {
            let (platform, encoding) = (
                u16_at(&self.data, base + 4 + 8 * i)?,
                u16_at(&self.data, base + 6 + 8 * i)?,
            );
            let off = base + u32_at(&self.data, base + 8 + 8 * i)? as usize;
            if off >= base + len {
                continue;
            }
            let format = u16_at(&self.data, off)?;
            // Rank: full Unicode (format 12) over the BMP (format 4), then Windows over Unicode.
            let rank = match (platform, encoding, format) {
                (3, 10, 12) => 5,
                (0, _, 12) => 4,
                (3, 1, 4) => 3,
                (0, _, 4) => 2,
                _ => continue,
            };
            if best.is_none_or(|b| rank > b.0) {
                best = Some((rank, off, format));
            }
        }
        best.map(|b| (b.1, b.2))
    }

    /// The glyph for `c`; 0 (`.notdef`) when the font has none.
    pub fn glyph_index(&self, c: char) -> u16 {
        self.lookup(u32::from(c)).unwrap_or(0)
    }

    fn lookup(&self, c: u32) -> Option<u16> {
        let (o, format) = self.cmap;
        let d = &self.data;
        match format {
            4 => {
                let c = u16::try_from(c).ok()?;
                let seg2 = u16_at(d, o + 6)? as usize;
                let (ends, starts) = (o + 14, o + 16 + seg2);
                let (deltas, ranges) = (starts + seg2, starts + 2 * seg2);
                for s in 0..seg2 / 2 {
                    if u16_at(d, ends + 2 * s)? < c {
                        continue;
                    }
                    if u16_at(d, starts + 2 * s)? > c {
                        return Some(0);
                    }
                    let delta = u16_at(d, deltas + 2 * s)?;
                    let range = u16_at(d, ranges + 2 * s)? as usize;
                    if range == 0 {
                        return Some(c.wrapping_add(delta));
                    }
                    let at = ranges + 2 * s + range + 2 * (c - u16_at(d, starts + 2 * s)?) as usize;
                    return Some(match u16_at(d, at)? {
                        0 => 0,
                        g => g.wrapping_add(delta),
                    });
                }
                Some(0)
            }
            12 => {
                let n = u32_at(d, o + 12)? as usize;
                let (mut lo, mut hi) = (0usize, n);
                while lo < hi {
                    let mid = (lo + hi) / 2;
                    let g = o + 16 + 12 * mid;
                    let (start, end) = (u32_at(d, g)?, u32_at(d, g + 4)?);
                    if c < start {
                        hi = mid;
                    } else if c > end {
                        lo = mid + 1;
                    } else {
                        return u16::try_from(u32_at(d, g + 8)? + (c - start)).ok();
                    }
                }
                Some(0)
            }
            _ => None,
        }
    }

    /// Horizontal advance of `glyph` in font units.
    pub fn advance(&self, glyph: u16) -> f64 {
        let hmtx = self.table(b"hmtx").map_or(0, |t| t.0);
        let i = glyph.min(self.num_h_metrics - 1) as usize;
        f64::from(u16_at(&self.data, hmtx + 4 * i).unwrap_or(0))
    }

    /// A `name` table string (`1` family, `2` subfamily, `16` typographic family, ...).
    pub fn name(&self, id: u16) -> Option<String> {
        let (base, len) = self.table(b"name")?;
        name_in_table(self.data.get(base..base + len)?, id)
    }

    /// The family name: the typographic family (`16`) when present, else `1`.
    pub fn family(&self) -> Option<String> {
        self.name(16).or_else(|| self.name(1))
    }

    fn glyph_data(&self, glyph: u16) -> Result<&[u8], FontError> {
        let loca = self.table(b"loca").unwrap().0;
        let at = |i: usize| -> Option<usize> {
            if self.long_loca {
                Some(u32_at(&self.data, loca + 4 * i)? as usize)
            } else {
                Some(u16_at(&self.data, loca + 2 * i)? as usize * 2)
            }
        };
        let (glyf, glyf_len) = self.table(b"glyf").unwrap();
        let (a, b) = (
            at(glyph as usize).ok_or_else(|| bad("loca"))?,
            at(glyph as usize + 1).ok_or_else(|| bad("loca"))?,
        );
        if b < a || b > glyf_len {
            return Err(bad("glyph offsets"));
        }
        Ok(&self.data[glyf + a..glyf + b])
    }

    /// The contours of `glyph` in font units, composite glyphs resolved. Empty for a blank
    /// glyph such as a space.
    pub fn outline(&self, glyph: u16) -> Result<Vec<Contour>, FontError> {
        self.outline_at(glyph, &[])
    }

    /// [`Font::outline`] at normalized axis `coords` (from [`Font::normalize`]); empty
    /// `coords` is the font's default instance.
    pub fn outline_at(&self, glyph: u16, coords: &[f64]) -> Result<Vec<Contour>, FontError> {
        let mut budget = MAX_COMPONENTS;
        self.load(glyph, 0, &mut budget, coords)
    }

    fn load(
        &self,
        glyph: u16,
        depth: usize,
        budget: &mut usize,
        coords: &[f64],
    ) -> Result<Vec<Contour>, FontError> {
        if glyph >= self.num_glyphs {
            return Err(bad("glyph index out of range"));
        }
        let g = self.glyph_data(glyph)?;
        if g.is_empty() {
            return Ok(vec![]);
        }
        let n = i16_at(g, 0).ok_or_else(|| bad("glyph header"))?;
        if n >= 0 {
            let mut contours = simple_glyph(g, n as usize)?;
            self.apply_simple(glyph, coords, &mut contours);
            return Ok(contours);
        }
        if depth >= MAX_COMPOSITE_DEPTH {
            return Err(bad("composite glyphs nest too deeply"));
        }
        let (mut parts, mut p) = (Vec::new(), 10usize);
        loop {
            *budget = budget
                .checked_sub(1)
                .ok_or_else(|| bad("too many glyph components"))?;
            let flags = u16_at(g, p).ok_or_else(|| bad("composite glyph"))?;
            let comp = u16_at(g, p + 2).ok_or_else(|| bad("composite glyph"))?;
            p += 4;
            let (dx, dy) = if flags & 1 != 0 {
                let v = (
                    i16_at(g, p).ok_or_else(|| bad("composite glyph"))?,
                    i16_at(g, p + 2).ok_or_else(|| bad("composite glyph"))?,
                );
                p += 4;
                (f64::from(v.0), f64::from(v.1))
            } else {
                let v = (
                    *g.get(p).ok_or_else(|| bad("composite glyph"))? as i8,
                    *g.get(p + 1).ok_or_else(|| bad("composite glyph"))? as i8,
                );
                p += 2;
                (f64::from(v.0), f64::from(v.1))
            };
            if flags & 2 == 0 {
                return Err(FontError(
                    "composite glyphs placed by matching points are not supported".into(),
                ));
            }
            let f2dot14 = |o: usize| {
                i16_at(g, o)
                    .map(|v| f64::from(v) / 16384.0)
                    .ok_or_else(|| bad("composite glyph"))
            };
            let m = if flags & 0x80 != 0 {
                let m = [
                    f2dot14(p)?,
                    f2dot14(p + 2)?,
                    f2dot14(p + 4)?,
                    f2dot14(p + 6)?,
                ];
                p += 8;
                m
            } else if flags & 0x40 != 0 {
                let m = [f2dot14(p)?, 0.0, 0.0, f2dot14(p + 2)?];
                p += 4;
                m
            } else if flags & 0x8 != 0 {
                let s = f2dot14(p)?;
                p += 2;
                [s, 0.0, 0.0, s]
            } else {
                [1.0, 0.0, 0.0, 1.0]
            };
            parts.push((comp, m, dx, dy));
            if flags & 0x20 == 0 {
                break;
            }
        }
        // Each component's offset is a point with its own deltas.
        let offsets: Vec<(f64, f64)> = parts.iter().map(|c| (c.2, c.3)).collect();
        let deltas = self.glyph_deltas(glyph, coords, &offsets, None);
        let mut out = Vec::new();
        for (i, (comp, m, dx, dy)) in parts.into_iter().enumerate() {
            let (dx, dy) = deltas
                .as_ref()
                .map_or((dx, dy), |d| (dx + d.0[i], dy + d.1[i]));
            for mut contour in self.load(comp, depth + 1, budget, coords)? {
                for pt in &mut contour {
                    // [xscale scale01; scale10 yscale], the offset is not scaled.
                    let (x, y) = (pt.x, pt.y);
                    pt.x = m[0] * x + m[2] * y + dx;
                    pt.y = m[1] * x + m[3] * y + dy;
                }
                out.push(contour);
            }
        }
        Ok(out)
    }
}

fn simple_glyph(g: &[u8], contours: usize) -> Result<Vec<Contour>, FontError> {
    let err = || bad("simple glyph");
    let mut ends = Vec::with_capacity(contours);
    for i in 0..contours {
        ends.push(u16_at(g, 10 + 2 * i).ok_or_else(err)? as usize);
    }
    if ends.windows(2).any(|w| w[1] < w[0]) {
        return Err(err());
    }
    let points = ends.last().map_or(0, |e| e + 1);
    let mut p = 10 + 2 * contours;
    p += 2 + u16_at(g, p).ok_or_else(err)? as usize;
    let mut flags = Vec::with_capacity(points);
    while flags.len() < points {
        let f = *g.get(p).ok_or_else(err)?;
        p += 1;
        flags.push(f);
        if f & 8 != 0 {
            let repeat = *g.get(p).ok_or_else(err)?;
            p += 1;
            for _ in 0..repeat {
                if flags.len() < points {
                    flags.push(f);
                }
            }
        }
    }
    let mut coord = |short: u8, same: u8| -> Result<Vec<f64>, FontError> {
        let (mut v, mut acc) = (Vec::with_capacity(points), 0i32);
        for f in &flags {
            if f & short != 0 {
                let d = i32::from(*g.get(p).ok_or_else(err)?);
                p += 1;
                acc += if f & same != 0 { d } else { -d };
            } else if f & same == 0 {
                acc += i32::from(i16_at(g, p).ok_or_else(err)?);
                p += 2;
            }
            v.push(f64::from(acc));
        }
        Ok(v)
    };
    let xs = coord(2, 0x10)?;
    let ys = coord(4, 0x20)?;
    let mut out = Vec::with_capacity(contours);
    let mut start = 0;
    for end in ends {
        out.push(
            (start..=end)
                .map(|i| OutlinePoint {
                    x: xs[i],
                    y: ys[i],
                    on: flags[i] & 1 != 0,
                })
                .collect(),
        );
        start = end + 1;
    }
    Ok(out)
}

/// A string from a standalone `name` table (the table's own bytes, not a whole font file).
/// Windows and Unicode records are UTF-16, Macintosh Roman records ASCII only.
pub fn name_in_table(t: &[u8], id: u16) -> Option<String> {
    let (count, strings) = (u16_at(t, 2)? as usize, u16_at(t, 4)? as usize);
    let mut best: Option<(u8, String)> = None;
    for i in 0..count {
        let r = 6 + 12 * i;
        if u16_at(t, r + 6)? != id {
            continue;
        }
        let (platform, encoding) = (u16_at(t, r)?, u16_at(t, r + 2)?);
        let (len, off) = (u16_at(t, r + 8)? as usize, u16_at(t, r + 10)? as usize);
        let Some(raw) = t.get(strings + off..strings + off + len) else {
            continue;
        };
        let (rank, text) = match (platform, encoding) {
            (3, _) | (0, _) => {
                let units: Vec<u16> = raw
                    .as_chunks::<2>()
                    .0
                    .iter()
                    .map(|c| u16::from_be_bytes(*c))
                    .collect();
                (2, String::from_utf16_lossy(&units))
            }
            (1, 0) => (
                1,
                raw.iter()
                    .map(|&b| if b < 128 { b as char } else { '?' })
                    .collect(),
            ),
            _ => continue,
        };
        if best.as_ref().is_none_or(|b| rank > b.0) {
            best = Some((rank, text));
        }
    }
    best.map(|b| b.1)
}

/// Family (typographic `16`, else `1`) and subfamily (`17`, else `2`) of a `name` table.
pub fn names_in_table(t: &[u8]) -> (Option<String>, Option<String>) {
    (
        name_in_table(t, 16).or_else(|| name_in_table(t, 1)),
        name_in_table(t, 17).or_else(|| name_in_table(t, 2)),
    )
}

/// Turn a TrueType contour (quadratic splines through implied on-curve points) into a
/// polygon, with curves no further than `tol` font units from the true outline.
pub fn contour_polygon(c: &[OutlinePoint], tol: f64) -> Vec<Pt> {
    if c.len() < 2 {
        return vec![];
    }
    let mid = |a: OutlinePoint, b: OutlinePoint| OutlinePoint {
        x: (a.x + b.x) / 2.0,
        y: (a.y + b.y) / 2.0,
        on: true,
    };
    // Start on an on-curve point; with none, the middle of two neighbours is one.
    let mut pts: Vec<OutlinePoint> = match c.iter().position(|p| p.on) {
        Some(i) => c[i..].iter().chain(&c[..i]).copied().collect(),
        None => std::iter::once(mid(c[c.len() - 1], c[0]))
            .chain(c.iter().copied())
            .collect(),
    };
    pts.push(pts[0]);
    let n = pts.len() - 1;
    let (mut out, mut cur, mut i) = (vec![[pts[0].x, pts[0].y]], pts[0], 1usize);
    while i <= n {
        let p = pts[i];
        if p.on {
            out.push([p.x, p.y]);
            cur = p;
            i += 1;
            continue;
        }
        let next = pts[i + 1.min(n - i)];
        let end = if next.on && i < n {
            i += 2;
            next
        } else {
            i += 1;
            mid(p, next)
        };
        let d = (cur.x - 2.0 * p.x + end.x).hypot(cur.y - 2.0 * p.y + end.y);
        let steps = (d / (4.0 * tol.max(1e-9))).sqrt().ceil().clamp(1.0, 64.0) as usize;
        for k in 1..=steps {
            let t = k as f64 / steps as f64;
            let u = 1.0 - t;
            out.push([
                u * u * cur.x + 2.0 * u * t * p.x + t * t * end.x,
                u * u * cur.y + 2.0 * u * t * p.y + t * t * end.y,
            ]);
        }
        cur = end;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    pub const SS3: &[u8] = include_bytes!("../fonts/SourceSans3VF-Upright.ttf");

    pub fn font() -> Font {
        Font::parse(SS3.to_vec()).expect("fixture font parses")
    }

    #[test]
    fn reads_metrics_names_and_the_character_map() {
        let f = font();
        assert_eq!(f.units_per_em(), 1000.0);
        assert_eq!(f.num_glyphs(), 2478);
        assert_eq!(f.family().as_deref(), Some("SourceSans3VF"));
        assert!(f.has_table(b"fvar") && !f.has_table(b"CFF "));
        let (a, d) = f.ascent_descent();
        assert!(a > 800.0 && d < 0.0, "{a} {d}");
        let (ga, gb) = (f.glyph_index('A'), f.glyph_index('B'));
        assert!(ga > 0 && gb > ga);
        assert_eq!(f.glyph_index('\u{10FFFF}'), 0);
        assert_eq!(f.glyph_index('é'), f.glyph_index('\u{e9}'));
        assert!(f.advance(f.glyph_index('i')) < f.advance(f.glyph_index('W')));
        assert!(f.advance(f.glyph_index(' ')) > 100.0);
    }

    #[test]
    fn simple_glyph_outlines_have_the_right_shape() {
        let f = font();
        let h = f.outline(f.glyph_index('H')).unwrap();
        assert_eq!(h.len(), 1, "H is one contour");
        let (xs, ys): (Vec<f64>, Vec<f64>) = h[0].iter().map(|p| (p.x, p.y)).unzip();
        let max = |v: &[f64]| v.iter().cloned().fold(f64::MIN, f64::max);
        assert!(h[0].iter().all(|p| p.on), "H has straight edges only");
        assert!(max(&ys) > 600.0 && max(&xs) > 400.0);
        assert_eq!(
            f.outline(f.glyph_index('o')).unwrap().len(),
            2,
            "o has a counter"
        );
        assert!(f.outline(f.glyph_index(' ')).unwrap().is_empty());
    }

    #[test]
    fn composite_glyphs_combine_their_components() {
        let f = font();
        let e = f.outline(f.glyph_index('e')).unwrap();
        let eacute = f.outline(f.glyph_index('é')).unwrap();
        assert!(eacute.len() > e.len(), "é adds an accent contour");
        // The accent sits above the base glyph.
        let top = |c: &[Contour]| c.iter().flatten().map(|p| p.y).fold(f64::MIN, f64::max);
        assert!(top(&eacute) > top(&e) + 100.0);
    }

    #[test]
    fn contour_polygons_follow_curves() {
        let f = font();
        let o = &f.outline(f.glyph_index('o')).unwrap()[0];
        assert!(o.iter().any(|p| !p.on), "o has control points");
        let poly = contour_polygon(o, 0.5);
        assert!(poly.len() > o.len());
        // Every flattened point lies within the glyph's box.
        let bound = |i: usize, f: fn(f64, f64) -> f64, init: f64| {
            o.iter()
                .map(|p| if i == 0 { p.x } else { p.y })
                .fold(init, f)
        };
        let (x0, x1) = (bound(0, f64::min, f64::MAX), bound(0, f64::max, f64::MIN));
        assert!(poly.iter().all(|p| p[0] >= x0 - 1.0 && p[0] <= x1 + 1.0));
        // A contour of only control points still closes into a loop.
        let ring: Vec<OutlinePoint> = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
            .iter()
            .map(|&(x, y)| OutlinePoint { x, y, on: false })
            .collect();
        assert!(contour_polygon(&ring, 0.1).len() > 4);
        assert!(contour_polygon(&ring[..1], 0.1).is_empty());
    }

    #[test]
    fn refuses_what_it_cannot_read_with_a_clear_message() {
        let msg = |d: Vec<u8>| Font::parse(d).unwrap_err().0;
        assert!(msg(b"OTTO\0\0\0\0\0\0\0\0".to_vec()).contains("CFF"));
        assert!(msg(b"wOF2\0\0\0\0\0\0\0\0".to_vec()).contains("WOFF"));
        assert!(msg(b"ttcf\0\0\0\0\0\0\0\0".to_vec()).contains("collections"));
        assert!(msg(vec![1, 2, 3]).contains("not a TrueType"));
        assert!(msg(vec![]).contains("not a TrueType"));
        assert!(msg(SS3[..2000].to_vec()).contains("malformed"));
        let mut no_glyf = SS3.to_vec();
        let tag = no_glyf.windows(4).position(|w| w == b"glyf").unwrap();
        no_glyf[tag] = b'X';
        assert!(msg(no_glyf).contains("no 'glyf' table"));
    }

    #[test]
    fn a_damaged_glyph_is_an_error_not_a_panic() {
        let f = font();
        assert!(f.outline(f.num_glyphs()).is_err());
        let mut bytes = SS3.to_vec();
        // Zero the glyf data: every glyph decodes as garbage or empty, never panics.
        let glyf = f.table(b"glyf").unwrap();
        bytes[glyf.0..glyf.0 + glyf.1].fill(0xFF);
        let broken = Font::parse(bytes).unwrap();
        for g in 0..200 {
            let _ = broken.outline(g);
        }
    }
}
