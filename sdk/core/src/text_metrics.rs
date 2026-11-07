// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Text measurement for the visual renderer: a table of glyph advances and pair kerning per
//! font weight, so label widths do not depend on a font parser or the viewer's fonts.
//!
//! The default table is Source Sans 3 (SIL OFL), committed at
//! `text-metrics/source-sans-3.json`. `sdk/plugins/site/assets/visual-runtime.js` reads the
//! same file and must produce the same widths. A different table (the same format) can be
//! passed per request or with the CLI's `--text-metrics`.

use std::collections::HashMap;
use std::sync::{Arc, OnceLock};

use serde_json::{Map, Value};

/// Advance, as a fraction of the font size, of a character the table does not cover.
pub const FALLBACK_ADVANCE_EM: f64 = 0.46;

const FIRST_CHAR: u32 = 32;
const LAST_CHAR: u32 = 126;
const ADVANCES: usize = (LAST_CHAR - FIRST_CHAR + 1) as usize;
/// Top-level keys that describe the table; everything else must be a weight.
const NOTE_KEYS: &[&str] = &["font", "source", "generated", "format"];
const REQUIRED_WEIGHTS: &[u32] = &[400, 700];
/// The committed default table (Source Sans 3), as the file the site ships and `visual-runtime.js` reads.
pub const DEFAULT_TABLE_JSON: &str = include_str!("text-metrics/source-sans-3.json");
/// The font's licence, shipped next to the default table.
pub const DEFAULT_TABLE_LICENSE: &str = include_str!("text-metrics/OFL-SourceSans3.txt");

#[derive(Debug)]
struct Weight {
    /// Advances of ASCII 32..=126 in 1/1000 em.
    adv: Vec<f64>,
    kern: HashMap<(char, char), f64>,
}

/// Advances and kerning at two or more weights, validated on load.
#[derive(Debug, Clone)]
pub struct TextMetrics(Arc<Vec<(u32, Weight)>>);

impl TextMetrics {
    /// The committed Source Sans 3 table.
    pub fn default_table() -> &'static TextMetrics {
        static T: OnceLock<TextMetrics> = OnceLock::new();
        T.get_or_init(|| {
            Self::parse(DEFAULT_TABLE_JSON).expect("committed text-metrics table is valid")
        })
    }

    /// Parse and validate a table file.
    pub fn parse(json: &str) -> Result<Self, String> {
        let v: Value = serde_json::from_str(json).map_err(|e| format!("not valid JSON: {e}"))?;
        Self::from_value(&v)
    }

    pub fn from_value(v: &Value) -> Result<Self, String> {
        let obj = v.as_object().ok_or("must be a JSON object")?;
        let mut weights = Vec::new();
        for (key, val) in obj {
            if NOTE_KEYS.contains(&key.as_str()) {
                if !val.is_string() {
                    return Err(format!("'{key}' must be a string"));
                }
                continue;
            }
            let w: u32 = key
                .parse()
                .ok()
                .filter(|w| (1..=1000).contains(w))
                .ok_or_else(|| {
                    format!(
                        "unknown key '{key}' (expected a weight such as \"400\" or one of {})",
                        NOTE_KEYS.join(", ")
                    )
                })?;
            weights.push((w, parse_weight(key, val)?));
        }
        weights.sort_by_key(|(w, _)| *w);
        for need in REQUIRED_WEIGHTS {
            if !weights.iter().any(|(w, _)| w == need) {
                return Err(format!("missing weight {need}"));
            }
        }
        Ok(Self(Arc::new(weights)))
    }

    /// Width of `text` in px at `font_size` and CSS `weight`. Weights between two table
    /// weights interpolate linearly; outside them the nearest table weight applies.
    pub fn width(&self, text: &str, font_size: f64, weight: f64) -> f64 {
        let ws = &*self.0;
        let hi = ws.iter().position(|(w, _)| f64::from(*w) >= weight);
        let em = match hi {
            None => width_em(&ws[ws.len() - 1].1, text),
            Some(0) => width_em(&ws[0].1, text),
            Some(i) => {
                let (lo_w, lo) = (f64::from(ws[i - 1].0), &ws[i - 1].1);
                let (hi_w, hi) = (f64::from(ws[i].0), &ws[i].1);
                let f = (weight - lo_w) / (hi_w - lo_w);
                width_em(lo, text) * (1.0 - f) + width_em(hi, text) * f
            }
        };
        em * font_size
    }
}

impl<'de> serde::Deserialize<'de> for TextMetrics {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let v = Value::deserialize(d)?;
        Self::from_value(&v).map_err(|e| serde::de::Error::custom(format!("text metrics: {e}")))
    }
}

fn parse_weight(key: &str, v: &Value) -> Result<Weight, String> {
    let at = |what: &str| format!("weight {key}: {what}");
    let obj = v.as_object().ok_or_else(|| at("must be an object"))?;
    if let Some(k) = obj.keys().find(|k| *k != "adv" && *k != "kern") {
        return Err(at(&format!("unknown key '{k}' (expected adv, kern)")));
    }
    let adv = obj
        .get("adv")
        .and_then(Value::as_array)
        .ok_or_else(|| at("'adv' must be an array"))?
        .iter()
        .map(Value::as_f64)
        .collect::<Option<Vec<_>>>()
        .ok_or_else(|| at("'adv' must hold only numbers"))?;
    if adv.len() != ADVANCES {
        return Err(at(&format!(
            "'adv' must hold {ADVANCES} advances (ASCII {FIRST_CHAR}..={LAST_CHAR}), found {}",
            adv.len()
        )));
    }
    let empty = Map::new();
    let mut kern = HashMap::new();
    for (pair, val) in obj.get("kern").map_or(Ok(&empty), |k| {
        k.as_object().ok_or_else(|| at("'kern' must be an object"))
    })? {
        let mut cs = pair.chars();
        let (Some(a), Some(b), None) = (cs.next(), cs.next(), cs.next()) else {
            return Err(at(&format!("kern key '{pair}' must be two characters")));
        };
        let k = val
            .as_f64()
            .ok_or_else(|| at(&format!("kern '{pair}' must be a number")))?;
        kern.insert((a, b), k);
    }
    Ok(Weight { adv, kern })
}

fn width_em(t: &Weight, text: &str) -> f64 {
    let mut sum = 0.0;
    let mut prev: Option<char> = None;
    for c in text.chars() {
        let i = (c as u32).wrapping_sub(FIRST_CHAR) as usize;
        sum += t
            .adv
            .get(i)
            .copied()
            .unwrap_or(FALLBACK_ADVANCE_EM * 1000.0);
        if let Some(p) = prev {
            sum += t.kern.get(&(p, c)).copied().unwrap_or(0.0);
        }
        prev = Some(c);
    }
    sum / 1000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn near(a: f64, b: f64) {
        assert!((a - b).abs() < 1e-9, "{a} != {b}");
    }

    fn table() -> &'static TextMetrics {
        TextMetrics::default_table()
    }

    /// 95 advances of 500 and the given kerning, at weights 400 and 700.
    fn file(adv700: f64, kern: &str) -> String {
        let w = |a: f64| {
            format!(
                r#"{{"adv":[{}],"kern":{kern}}}"#,
                vec![a.to_string(); 95].join(",")
            )
        };
        format!(r#"{{"font":"t","400":{},"700":{}}}"#, w(500.0), w(adv700))
    }

    #[test]
    fn sums_advances_without_kerning() {
        let t = TextMetrics::parse(&file(500.0, "{}")).unwrap();
        assert_eq!(t.width("abc", 10.0, 400.0), 15.0);
    }

    #[test]
    fn adds_pair_kerning_between_neighbours() {
        let t = TextMetrics::parse(&file(500.0, r#"{"ab":-100}"#)).unwrap();
        assert_eq!(t.width("ab", 10.0, 400.0), 9.0);
        assert_eq!(t.width("ba", 10.0, 400.0), 10.0);
        assert_eq!(t.width("aab", 10.0, 400.0), 14.0);
    }

    #[test]
    fn interpolates_between_weights_and_clamps_outside() {
        let t = TextMetrics::parse(&file(800.0, "{}")).unwrap();
        assert_eq!(t.width("a", 10.0, 400.0), 5.0);
        assert_eq!(t.width("a", 10.0, 700.0), 8.0);
        near(t.width("a", 10.0, 500.0), 6.0);
        assert_eq!(t.width("a", 10.0, 800.0), 8.0);
        assert_eq!(t.width("a", 10.0, 300.0), 5.0);
    }

    #[test]
    fn unknown_characters_measure_the_fallback_advance() {
        let t = TextMetrics::parse(&file(500.0, "{}")).unwrap();
        near(t.width("é", 10.0, 400.0), 4.6);
        near(t.width("\n", 10.0, 400.0), 4.6);
    }

    #[test]
    fn default_table_matches_chrome_for_a_button_label() {
        // Source Sans 3 "Test" at 700 is 1.803 em in Chrome (proposal 015).
        let w = table().width("Test", 14.0, 700.0);
        assert!((w - 25.246).abs() < 0.02, "{w}");
    }

    #[test]
    fn rejects_bad_files_with_a_clear_message() {
        let good = file(500.0, "{}");
        for (bad, want) in [
            ("not json".to_string(), "not valid JSON"),
            ("[]".to_string(), "must be a JSON object"),
            (good.replace(r#""font""#, r#""fnot""#), "unknown key 'fnot'"),
            (good.replace(r#""700""#, r#""750""#), "missing weight 700"),
            (
                good.replacen("500", "\"x\"", 1),
                "'adv' must hold only numbers",
            ),
            (good.replacen("500,", "", 1), "must hold 95 advances"),
            (good.replace("{}", r#"{"abc":1}"#), "must be two characters"),
            (good.replace("{}", r#"{"ab":"x"}"#), "must be a number"),
            (good.replace(r#""adv""#, r#""adx""#), "unknown key 'adx'"),
        ] {
            let e = TextMetrics::parse(&bad).unwrap_err();
            assert!(e.contains(want), "{e} should contain {want}");
        }
    }
}
