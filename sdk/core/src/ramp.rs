// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Color ramps for a `gradient` value source's `ramp`: the stops of a color slider's track or
//! of one layer of a color area, computed from a color and a channel the way React Spectrum
//! (react-aria `useColorSlider` and `useColorAreaGradient`) computes them. The browser blends
//! between stops in sRGB, as the renderer does, so a stop list is all a consumer needs.

/// A color space a ramp can vary a channel in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Space {
    Hsl,
    Hsb,
    Rgb,
}

impl Space {
    pub fn parse(s: &str) -> Option<Space> {
        match s {
            "hsl" => Some(Space::Hsl),
            "hsb" => Some(Space::Hsb),
            "rgb" => Some(Space::Rgb),
            _ => None,
        }
    }

    /// The index of `channel` among this space's three channels.
    fn index(self, channel: &str) -> Option<usize> {
        let names = match self {
            Space::Hsl => ["hue", "saturation", "lightness"],
            Space::Hsb => ["hue", "saturation", "brightness"],
            Space::Rgb => ["red", "green", "blue"],
        };
        names.iter().position(|n| *n == channel)
    }

    /// The space a channel belongs to when the caller names none and the color is not in one
    /// that has it (React Spectrum has no such default: it needs the color in a space with
    /// the channel).
    fn natural(channel: &str) -> Option<Space> {
        match channel {
            "hue" | "saturation" | "lightness" | "alpha" => Some(Space::Hsl),
            "brightness" => Some(Space::Hsb),
            "red" | "green" | "blue" => Some(Space::Rgb),
            _ => None,
        }
    }
}

/// A color in one space: its three channels (hue in degrees, saturation, lightness and
/// brightness 0 to 100, red, green and blue 0 to 255) and alpha 0 to 1.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Color {
    pub space: Space,
    pub c: [f64; 3],
    pub a: f64,
}

fn fixed2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

impl Color {
    /// A color as React Spectrum's `parseColor` reads it: `#rgb`, `#rgba`, `#rrggbb`,
    /// `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hsb()`, `hsba()`, and `transparent`.
    pub fn parse(s: &str) -> Option<Color> {
        let s = s.trim().to_ascii_lowercase();
        if s == "transparent" {
            return Some(Color {
                space: Space::Rgb,
                c: [0.0; 3],
                a: 0.0,
            });
        }
        if let Some(hex) = s.strip_prefix('#') {
            if !hex.is_ascii() || !hex.chars().all(|c| c.is_ascii_hexdigit()) {
                return None;
            }
            let digits: Vec<f64> = hex
                .chars()
                .map(|c| f64::from(c.to_digit(16).unwrap_or(0)))
                .collect();
            let byte = |i: usize| match hex.len() {
                3 | 4 => digits[i] * 17.0,
                _ => digits[2 * i] * 16.0 + digits[2 * i + 1],
            };
            return match hex.len() {
                3 | 6 => Some((byte(0), byte(1), byte(2), 1.0)),
                4 | 8 => Some((byte(0), byte(1), byte(2), byte(3) / 255.0)),
                _ => None,
            }
            .map(|(r, g, b, a)| Color {
                space: Space::Rgb,
                c: [r, g, b],
                a,
            });
        }
        let (name, body) = s.split_once('(')?;
        let body = body.strip_suffix(')')?;
        let space = match name {
            "rgb" | "rgba" => Space::Rgb,
            "hsl" | "hsla" => Space::Hsl,
            "hsb" | "hsba" => Space::Hsb,
            _ => return None,
        };
        let parts: Vec<&str> = body
            .split(|c: char| c == ',' || c == '/' || c.is_whitespace())
            .filter(|p| !p.is_empty())
            .collect();
        if parts.len() != 3 && parts.len() != 4 {
            return None;
        }
        let num = |p: &str| {
            p.strip_suffix('%')
                .unwrap_or(p)
                .parse::<f64>()
                .ok()
                .filter(|n| n.is_finite())
        };
        let v: Vec<f64> = parts[..3].iter().map(|p| num(p)).collect::<Option<_>>()?;
        let a = match parts.get(3) {
            None => 1.0,
            Some(p) => num(p)? / if p.ends_with('%') { 100.0 } else { 1.0 },
        };
        let c = match space {
            Space::Rgb => [
                v[0].clamp(0.0, 255.0),
                v[1].clamp(0.0, 255.0),
                v[2].clamp(0.0, 255.0),
            ],
            _ => [
                v[0].rem_euclid(360.0),
                v[1].clamp(0.0, 100.0),
                v[2].clamp(0.0, 100.0),
            ],
        };
        Some(Color {
            space,
            c,
            a: a.clamp(0.0, 1.0),
        })
    }

    /// Red, green and blue, 0 to 255, unrounded.
    fn rgb(self) -> [f64; 3] {
        let [h, s, x] = self.c;
        let (s, x) = (s / 100.0, x / 100.0);
        match self.space {
            Space::Rgb => self.c,
            Space::Hsl => {
                let a = s * x.min(1.0 - x);
                let f = |n: f64| {
                    let k = (n + h / 30.0) % 12.0;
                    (x - a * (k - 3.0).min(9.0 - k).min(1.0).max(-1.0)) * 255.0
                };
                [f(0.0), f(8.0), f(4.0)]
            }
            Space::Hsb => {
                let f = |n: f64| {
                    let k = (n + h / 60.0) % 6.0;
                    (x - s * x * k.min(4.0 - k).min(1.0).max(0.0)) * 255.0
                };
                [f(5.0), f(3.0), f(1.0)]
            }
        }
    }

    /// The same color in `to`, converted through RGB as React Spectrum's `toFormat` does
    /// (hue, saturation, lightness and brightness rounded to two decimals).
    pub fn to_space(self, to: Space) -> Color {
        if self.space == to {
            return self;
        }
        let [r, g, b] = self.rgb().map(|v| v.round() / 255.0);
        let (min, max) = (r.min(g).min(b), r.max(g).max(b));
        let chroma = max - min;
        let hue = if chroma == 0.0 {
            0.0
        } else {
            let h = if max == r {
                (g - b) / chroma + if g < b { 6.0 } else { 0.0 }
            } else if max == g {
                (b - r) / chroma + 2.0
            } else {
                (r - g) / chroma + 4.0
            };
            h / 6.0 * 360.0
        };
        let c = match to {
            Space::Rgb => [r * 255.0, g * 255.0, b * 255.0],
            Space::Hsl => {
                let l = (max + min) / 2.0;
                let s = if chroma == 0.0 {
                    0.0
                } else {
                    chroma / if l < 0.5 { max + min } else { 2.0 - max - min }
                };
                [fixed2(hue), fixed2(s * 100.0), fixed2(l * 100.0)]
            }
            Space::Hsb => {
                let s = if max == 0.0 { 0.0 } else { chroma / max };
                [fixed2(hue), fixed2(s * 100.0), fixed2(max * 100.0)]
            }
        };
        Color {
            space: to,
            c,
            a: self.a,
        }
    }

    /// The CSS color of this one: `#rrggbb`, or `rgba()` when it is not opaque.
    pub fn css(self) -> String {
        let [r, g, b] = self.rgb().map(|v| v.round().clamp(0.0, 255.0) as u8);
        if self.a >= 1.0 {
            format!("#{r:02x}{g:02x}{b:02x}")
        } else {
            format!("rgba({r}, {g}, {b}, {})", (self.a * 1e4).round() / 1e4)
        }
    }

    fn with(mut self, channel: &str, value: f64) -> Color {
        match channel {
            "alpha" => self.a = value,
            _ => {
                if let Some(i) = self.space.index(channel) {
                    self.c[i] = value;
                }
            }
        }
        self
    }
}

/// The space and color a channel is varied in: the named `space`, else the color's own space
/// when it has the channel, else the channel's natural space.
fn working(color: Color, channel: &str, space: Option<Space>) -> Result<Color, String> {
    let sp = match space {
        Some(sp) => sp,
        None if channel == "alpha" || color.space.index(channel).is_some() => color.space,
        None => Space::natural(channel).ok_or(format!("unknown color channel '{channel}'"))?,
    };
    if channel != "alpha" && sp.index(channel).is_none() {
        return Err(format!(
            "channel '{channel}' does not exist in the {sp:?} color space"
        ));
    }
    Ok(color.to_space(sp))
}

/// A channel's range: hue 0 to 360, saturation, lightness and brightness 0 to 100, red,
/// green and blue 0 to 255, alpha 0 to 1.
fn range(channel: &str) -> (f64, f64) {
    match channel {
        "hue" => (0.0, 360.0),
        "red" | "green" | "blue" => (0.0, 255.0),
        "alpha" => (0.0, 1.0),
        _ => (0.0, 100.0),
    }
}

/// The stops of a color slider track for `channel`, offsets 0 to 1 along the track. As React
/// Spectrum: hue is seven stops 60 degrees apart, lightness three (the middle at half the
/// range, or the hue would never show), any other channel two (its minimum and maximum); the
/// other channels and the alpha stay those of `color`.
pub fn track(
    color: Color,
    channel: &str,
    space: Option<Space>,
) -> Result<Vec<(f64, String)>, String> {
    let base = working(color, channel, space)?;
    let (min, max) = range(channel);
    let values: Vec<f64> = match channel {
        "hue" => (0..=6).map(|i| f64::from(i) * 60.0).collect(),
        "lightness" => vec![min, (max - min) / 2.0, max],
        _ => vec![min, max],
    };
    let n = values.len() - 1;
    Ok(values
        .into_iter()
        .enumerate()
        .map(|(i, v)| (i as f64 / n as f64, base.with(channel, v).css()))
        .collect())
}

/// The stops of one layer of a color area, for the layer's `channel` while `z` (the channel
/// neither axis shows) is held at its value in `color`. The area is these layers stacked,
/// the last channel of the space on top and, when `z` is hue, a solid layer (this call with
/// `channel` equal to `z`) at the bottom, as React Spectrum stacks them. The layers read the
/// color only for `z`; `space` is `hsl` or `hsb` (an RGB area blends its layers with
/// `screen`, which the renderer does not draw).
pub fn area_layer(
    color: Color,
    space: Option<Space>,
    channel: &str,
    z: &str,
) -> Result<Vec<(f64, String)>, String> {
    let sp = space.unwrap_or(match color.space {
        Space::Hsb => Space::Hsb,
        _ => Space::Hsl,
    });
    if sp == Space::Rgb {
        return Err("a color area in rgb blends its layers with screen, which is not drawn".into());
    }
    for ch in [channel, z] {
        if sp.index(ch).is_none() {
            return Err(format!(
                "channel '{ch}' does not exist in the {sp:?} color space"
            ));
        }
    }
    let zv = color.to_space(sp).c[sp.index(z).unwrap_or(0)];
    let base = Color {
        space: sp,
        c: if sp == Space::Hsl {
            [0.0, 100.0, 50.0]
        } else {
            [0.0, 100.0, 100.0]
        },
        a: 1.0,
    }
    .with(z, zv);
    let fade = |c: Color| vec![(0.0, c.css()), (1.0, Color { a: 0.0, ..c }.css())];
    let black = Color {
        space: Space::Rgb,
        c: [0.0; 3],
        a: 1.0,
    };
    match channel {
        _ if channel == z && z == "hue" => Ok(vec![(0.0, base.css()), (1.0, base.css())]),
        _ if channel == z => Err(format!(
            "a color area draws no layer for its fixed channel '{z}'"
        )),
        "hue" => Ok((0..=6)
            .map(|i| {
                (
                    f64::from(i) / 6.0,
                    base.with("hue", f64::from(i) * 60.0).css(),
                )
            })
            .collect()),
        "saturation" => Ok(fade(base.with("saturation", 0.0))),
        "brightness" => Ok(fade(black)),
        _ => {
            // lightness: black, transparent, white; the transparent middle stop is the end of
            // the black fade and the start of the white one.
            let white = Color {
                c: [255.0; 3],
                ..black
            };
            let clear = |c: Color| Color { a: 0.0, ..c }.css();
            Ok(vec![
                (0.0, black.css()),
                (0.5, clear(black)),
                (0.5, clear(white)),
                (1.0, white.css()),
            ])
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn css(stops: &[(f64, String)]) -> Vec<&str> {
        stops.iter().map(|(_, c)| c.as_str()).collect()
    }

    #[test]
    fn a_hue_track_has_seven_stops_sixty_degrees_apart() {
        let c = Color::parse("hsl(0, 100%, 50%)").unwrap();
        let s = track(c, "hue", None).unwrap();
        assert_eq!(
            css(&s),
            ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"]
        );
        let offsets: Vec<f64> = s.iter().map(|(o, _)| *o).collect();
        assert_eq!(
            offsets,
            [0.0, 1.0 / 6.0, 2.0 / 6.0, 0.5, 4.0 / 6.0, 5.0 / 6.0, 1.0]
        );
    }

    #[test]
    fn a_hue_track_keeps_saturation_and_lightness() {
        let c = Color::parse("hsl(200, 50%, 40%)").unwrap();
        let s = track(c, "hue", None).unwrap();
        assert_eq!(css(&s)[0], "#993333");
        assert_eq!(css(&s)[2], "#339933");
    }

    #[test]
    fn a_lightness_track_has_a_middle_stop() {
        let c = Color::parse("hsl(0, 100%, 20%)").unwrap();
        assert_eq!(
            css(&track(c, "lightness", None).unwrap()),
            ["#000000", "#ff0000", "#ffffff"]
        );
    }

    #[test]
    fn a_saturation_track_runs_grey_to_full() {
        let c = Color::parse("hsl(0, 30%, 50%)").unwrap();
        assert_eq!(
            css(&track(c, "saturation", None).unwrap()),
            ["#808080", "#ff0000"]
        );
    }

    #[test]
    fn an_alpha_track_keeps_the_color() {
        let c = Color::parse("#336699").unwrap();
        let s = track(c, "alpha", None).unwrap();
        assert_eq!(css(&s), ["rgba(51, 102, 153, 0)", "#336699"]);
    }

    #[test]
    fn an_rgb_track_varies_one_channel() {
        let c = Color::parse("rgb(10, 20, 30)").unwrap();
        assert_eq!(
            css(&track(c, "green", None).unwrap()),
            ["#0a001e", "#0aff1e"]
        );
    }

    #[test]
    fn a_hex_color_converts_to_the_channels_space() {
        let c = Color::parse("#ff0000").unwrap();
        // brightness belongs to hsb: hsb(0, 100%, b)
        assert_eq!(
            css(&track(c, "brightness", None).unwrap()),
            ["#000000", "#ff0000"]
        );
    }

    #[test]
    fn a_channel_outside_the_space_or_unknown_is_an_error() {
        let c = Color::parse("#ff0000").unwrap();
        assert!(track(c, "hue", Some(Space::Rgb)).is_err());
        assert!(track(c, "chroma", None).is_err());
    }

    #[test]
    fn parse_rejects_what_it_cannot_read() {
        for bad in [
            "",
            "red",
            "#12",
            "#gg0000",
            "rgb(1,2)",
            "hsl(a,b,c)",
            "hsl(NaN, 1%, 1%)",
        ] {
            assert!(Color::parse(bad).is_none(), "{bad}");
        }
        let c = Color::parse("hsl(-60, 150%, 50%)").unwrap();
        assert_eq!(c.c, [300.0, 100.0, 50.0]);
    }

    #[test]
    fn area_layers_follow_react_spectrum() {
        let c = Color::parse("hsl(120, 80%, 30%)").unwrap();
        // z = hue: the solid base, hsl(120, 100%, 50%)
        let base = area_layer(c, None, "hue", "hue").unwrap();
        assert_eq!(css(&base), ["#00ff00", "#00ff00"]);
        let sat = area_layer(c, None, "saturation", "hue").unwrap();
        assert_eq!(css(&sat), ["#808080", "rgba(128, 128, 128, 0)"]);
        let light = area_layer(c, None, "lightness", "hue").unwrap();
        assert_eq!(
            css(&light),
            [
                "#000000",
                "rgba(0, 0, 0, 0)",
                "rgba(255, 255, 255, 0)",
                "#ffffff"
            ]
        );
        // z = lightness: the hue layer is drawn at that lightness
        let c = Color::parse("hsl(0, 100%, 25%)").unwrap();
        let hue = area_layer(c, None, "hue", "lightness").unwrap();
        assert_eq!(css(&hue)[0], "#800000");
        assert_eq!(css(&hue)[2], "#008000");
        assert!(area_layer(c, None, "lightness", "lightness").is_err());
        assert!(area_layer(c, Some(Space::Rgb), "red", "blue").is_err());
    }

    #[test]
    fn hsb_area_layers() {
        let c = Color::parse("hsb(0, 100%, 50%)").unwrap();
        let b = area_layer(c, None, "brightness", "hue").unwrap();
        assert_eq!(css(&b), ["#000000", "rgba(0, 0, 0, 0)"]);
        let s = area_layer(c, None, "saturation", "hue").unwrap();
        assert_eq!(css(&s), ["#ffffff", "rgba(255, 255, 255, 0)"]);
        let h = area_layer(c, None, "hue", "brightness").unwrap();
        assert_eq!(css(&h)[0], "#800000");
    }
}
