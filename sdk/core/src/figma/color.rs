// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Parse Spectrum token color strings into Figma's 0–1 float RGBA format.

use super::types::FigmaColor;
use super::FigmaError;

/// Parse a Spectrum token color value into Figma's `{ r, g, b, a }` format.
///
/// Supported input formats:
/// - `rgb(R, G, B)` where R, G, B are 0–255 integers
/// - `rgba(R, G, B, A)` where A is a 0–1 float
/// - `#RRGGBB`, `#RGB`, `#RRGGBBAA` hex
pub fn parse_color(value: &str) -> Result<FigmaColor, FigmaError> {
    let s = value.trim();

    if let Some(inner) = s.strip_prefix("rgba(").and_then(|s| s.strip_suffix(')')) {
        let parts = parse_number_list(inner)?;
        if parts.len() != 4 {
            return Err(FigmaError::UnsupportedColorFormat(value.to_string()));
        }
        return Ok(FigmaColor {
            r: parts[0] / 255.0,
            g: parts[1] / 255.0,
            b: parts[2] / 255.0,
            a: parts[3],
        });
    }

    if let Some(inner) = s.strip_prefix("rgb(").and_then(|s| s.strip_suffix(')')) {
        let parts = parse_number_list(inner)?;
        if parts.len() != 3 {
            return Err(FigmaError::UnsupportedColorFormat(value.to_string()));
        }
        return Ok(FigmaColor {
            r: parts[0] / 255.0,
            g: parts[1] / 255.0,
            b: parts[2] / 255.0,
            a: 1.0,
        });
    }

    if let Some(hex) = s.strip_prefix('#') {
        return parse_hex(hex, value);
    }

    Err(FigmaError::UnsupportedColorFormat(value.to_string()))
}

fn parse_number_list(s: &str) -> Result<Vec<f64>, FigmaError> {
    s.split(',')
        .map(|p| {
            p.trim()
                .parse::<f64>()
                .map_err(|_| FigmaError::UnsupportedColorFormat(s.to_string()))
        })
        .collect()
}

fn parse_hex(hex: &str, original: &str) -> Result<FigmaColor, FigmaError> {
    let err = || FigmaError::UnsupportedColorFormat(original.to_string());
    match hex.len() {
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).map_err(|_| err())?;
            let g = u8::from_str_radix(&hex[2..4], 16).map_err(|_| err())?;
            let b = u8::from_str_radix(&hex[4..6], 16).map_err(|_| err())?;
            Ok(FigmaColor {
                r: r as f64 / 255.0,
                g: g as f64 / 255.0,
                b: b as f64 / 255.0,
                a: 1.0,
            })
        }
        3 => {
            let r = u8::from_str_radix(&hex[0..1], 16).map_err(|_| err())?;
            let g = u8::from_str_radix(&hex[1..2], 16).map_err(|_| err())?;
            let b = u8::from_str_radix(&hex[2..3], 16).map_err(|_| err())?;
            Ok(FigmaColor {
                r: (r * 17) as f64 / 255.0,
                g: (g * 17) as f64 / 255.0,
                b: (b * 17) as f64 / 255.0,
                a: 1.0,
            })
        }
        8 => {
            let r = u8::from_str_radix(&hex[0..2], 16).map_err(|_| err())?;
            let g = u8::from_str_radix(&hex[2..4], 16).map_err(|_| err())?;
            let b = u8::from_str_radix(&hex[4..6], 16).map_err(|_| err())?;
            let a = u8::from_str_radix(&hex[6..8], 16).map_err(|_| err())?;
            Ok(FigmaColor {
                r: r as f64 / 255.0,
                g: g as f64 / 255.0,
                b: b as f64 / 255.0,
                a: a as f64 / 255.0,
            })
        }
        _ => Err(err()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-6
    }

    fn assert_color(c: &FigmaColor, r: f64, g: f64, b: f64, a: f64) {
        assert!(
            approx_eq(c.r, r) && approx_eq(c.g, g) && approx_eq(c.b, b) && approx_eq(c.a, a),
            "expected ({r}, {g}, {b}, {a}), got ({}, {}, {}, {})",
            c.r,
            c.g,
            c.b,
            c.a
        );
    }

    #[test]
    fn rgb_integer_channels() {
        let c = parse_color("rgb(255, 128, 0)").unwrap();
        assert_color(&c, 1.0, 128.0 / 255.0, 0.0, 1.0);
    }

    #[test]
    fn rgba_with_alpha() {
        let c = parse_color("rgba(0, 0, 0, 0.5)").unwrap();
        assert_color(&c, 0.0, 0.0, 0.0, 0.5);
    }

    #[test]
    fn hex_6_digit() {
        let c = parse_color("#ff8000").unwrap();
        assert_color(&c, 1.0, 128.0 / 255.0, 0.0, 1.0);
    }

    #[test]
    fn hex_3_digit() {
        let c = parse_color("#fff").unwrap();
        assert_color(&c, 1.0, 1.0, 1.0, 1.0);
    }

    #[test]
    fn hex_8_digit_with_alpha() {
        let c = parse_color("#ff800080").unwrap();
        assert_color(&c, 1.0, 128.0 / 255.0, 0.0, 128.0 / 255.0);
    }

    #[test]
    fn hex_black() {
        let c = parse_color("#000000").unwrap();
        assert_color(&c, 0.0, 0.0, 0.0, 1.0);
    }

    #[test]
    fn rgb_with_whitespace() {
        let c = parse_color("  rgb( 10 , 20 , 30 )  ").unwrap();
        assert_color(&c, 10.0 / 255.0, 20.0 / 255.0, 30.0 / 255.0, 1.0);
    }

    #[test]
    fn unsupported_format_returns_error() {
        assert!(parse_color("hsl(0, 100%, 50%)").is_err());
        assert!(parse_color("not-a-color").is_err());
        assert!(parse_color("#gg0000").is_err());
    }
}
