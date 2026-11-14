// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! An RGBA pixel buffer with source-over compositing, and CSS color parsing.

/// A straight-alpha color, each channel 0..=1.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rgba {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}

impl Rgba {
    pub const BLACK: Rgba = Rgba {
        r: 0.0,
        g: 0.0,
        b: 0.0,
        a: 1.0,
    };

    pub fn with_alpha(self, a: f32) -> Rgba {
        Rgba {
            a: self.a * a,
            ..self
        }
    }
}

/// Parse a CSS color: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` (comma or
/// space separated, optional `/ alpha`), `transparent`, `none`, `black`, `white` and
/// `currentColor` (drawn black, as an `<svg>` shown on its own does).
pub fn parse_color(s: &str) -> Option<Rgba> {
    let s = s.trim().to_ascii_lowercase();
    let rgba = |r: f32, g: f32, b: f32, a: f32| Rgba { r, g, b, a };
    match s.as_str() {
        "none" | "transparent" => return Some(rgba(0.0, 0.0, 0.0, 0.0)),
        "black" | "currentcolor" => return Some(Rgba::BLACK),
        "white" => return Some(rgba(1.0, 1.0, 1.0, 1.0)),
        _ => {}
    }
    if let Some(hex) = s.strip_prefix('#') {
        let digit = |i: usize| hex.get(i..=i)?.chars().next()?.to_digit(16);
        let byte = |i: usize| Some((digit(i)? * 16 + digit(i + 1)?) as f32 / 255.0);
        let nibble = |i: usize| Some((digit(i)? * 17) as f32 / 255.0);
        return match hex.len() {
            3 => Some(rgba(nibble(0)?, nibble(1)?, nibble(2)?, 1.0)),
            4 => Some(rgba(nibble(0)?, nibble(1)?, nibble(2)?, nibble(3)?)),
            6 => Some(rgba(byte(0)?, byte(2)?, byte(4)?, 1.0)),
            8 => Some(rgba(byte(0)?, byte(2)?, byte(4)?, byte(6)?)),
            _ => None,
        };
    }
    let body = s
        .strip_prefix("rgba(")
        .or_else(|| s.strip_prefix("rgb("))?
        .strip_suffix(')')?;
    let parts: Vec<&str> = body
        .split(|c: char| c == ',' || c == '/' || c.is_whitespace())
        .filter(|p| !p.is_empty())
        .collect();
    if parts.len() != 3 && parts.len() != 4 {
        return None;
    }
    let channel = |p: &str| -> Option<f32> {
        match p.strip_suffix('%') {
            Some(n) => Some(n.parse::<f32>().ok()? / 100.0),
            None => Some(p.parse::<f32>().ok()? / 255.0),
        }
    };
    let alpha = match parts.get(3) {
        Some(p) => match p.strip_suffix('%') {
            Some(n) => n.parse::<f32>().ok()? / 100.0,
            None => p.parse::<f32>().ok()?,
        },
        None => 1.0,
    };
    Some(rgba(
        channel(parts[0])?.clamp(0.0, 1.0),
        channel(parts[1])?.clamp(0.0, 1.0),
        channel(parts[2])?.clamp(0.0, 1.0),
        alpha.clamp(0.0, 1.0),
    ))
}

/// Pixels stored premultiplied, so group opacity is a plain multiply.
pub struct Canvas {
    pub width: usize,
    pub height: usize,
    px: Vec<[f32; 4]>,
}

impl Canvas {
    pub fn new(width: usize, height: usize) -> Self {
        Self {
            width,
            height,
            px: vec![[0.0; 4]; width * height],
        }
    }

    /// Composite `color` over the pixel at `(x, y)`, scaled by `coverage` (0..=1).
    pub fn blend(&mut self, x: usize, y: usize, color: Rgba, coverage: f32) {
        let a = color.a * coverage;
        if a <= 0.0 || x >= self.width || y >= self.height {
            return;
        }
        let d = &mut self.px[y * self.width + x];
        let k = 1.0 - a;
        d[0] = color.r * a + d[0] * k;
        d[1] = color.g * a + d[1] * k;
        d[2] = color.b * a + d[2] * k;
        d[3] = a + d[3] * k;
    }

    /// Multiply every pixel by `o`, the opacity of the whole drawing.
    pub fn scale_opacity(&mut self, o: f32) {
        for d in &mut self.px {
            d.iter_mut().for_each(|c| *c *= o);
        }
    }

    /// Put `color` behind everything drawn so far.
    pub fn fill_behind(&mut self, color: Rgba) {
        for d in &mut self.px {
            let k = 1.0 - d[3];
            d[0] += color.r * color.a * k;
            d[1] += color.g * color.a * k;
            d[2] += color.b * color.a * k;
            d[3] += color.a * k;
        }
    }

    /// Straight-alpha RGBA bytes, rounded to nearest.
    pub fn to_rgba8(&self) -> Vec<u8> {
        let q = |v: f32| (v.clamp(0.0, 1.0) * 255.0 + 0.5) as u8;
        let mut out = Vec::with_capacity(self.px.len() * 4);
        for d in &self.px {
            if d[3] <= 0.0 {
                out.extend_from_slice(&[0, 0, 0, 0]);
            } else {
                out.extend_from_slice(&[q(d[0] / d[3]), q(d[1] / d[3]), q(d[2] / d[3]), q(d[3])]);
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn c(s: &str) -> Rgba {
        parse_color(s).unwrap_or_else(|| panic!("{s}"))
    }

    #[test]
    fn parses_css_colors() {
        assert_eq!(c("#fff"), c("rgb(255, 255, 255)"));
        assert_eq!(c("#FF0000"), c("rgb(255 0 0)"));
        assert_eq!(c("#00000080").a, 128.0 / 255.0);
        assert_eq!(c("rgba(0, 0, 0, 0.5)").a, 0.5);
        assert_eq!(c("rgb(0 0 0 / 50%)").a, 0.5);
        assert_eq!(c("transparent").a, 0.0);
        assert_eq!(c("currentColor"), Rgba::BLACK);
        assert!(parse_color("#12").is_none());
        assert!(parse_color("rgb(1,2)").is_none());
        assert!(parse_color("hotpink").is_none());
        assert!(parse_color("#ggg").is_none());
    }

    #[test]
    fn composites_and_un_premultiplies() {
        let mut cv = Canvas::new(2, 1);
        cv.blend(0, 0, c("#ff0000"), 0.5);
        assert_eq!(cv.to_rgba8()[..4], [255, 0, 0, 128]);
        cv.blend(0, 0, c("#0000ff"), 1.0);
        assert_eq!(cv.to_rgba8()[..4], [0, 0, 255, 255]);
        assert_eq!(cv.to_rgba8()[4..], [0, 0, 0, 0]);
        cv.fill_behind(c("#ffffff"));
        assert_eq!(cv.to_rgba8()[4..], [255, 255, 255, 255]);
        cv.scale_opacity(0.5);
        assert_eq!(cv.to_rgba8()[4..], [255, 255, 255, 128]);
        cv.blend(9, 9, Rgba::BLACK, 1.0);
    }
}
