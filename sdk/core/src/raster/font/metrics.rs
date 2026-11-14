// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Text measurement from a font, so layout and paint use the same advances.

use super::Font;
use crate::text_metrics::TextMetrics;

/// Weights tabulated (CSS 100..=900), so interpolating between them stays close to the font.
const WEIGHTS: [u32; 9] = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const FIRST_CHAR: u32 = 32;
const LAST_CHAR: u32 = 126;

impl Font {
    /// A [`TextMetrics`] table of this font's advances for ASCII 32..=126 at each weight, with
    /// the width axis held at 100. Pair kerning (`GPOS`) is not read, so widths are those of
    /// unkerned text.
    pub fn text_metrics(&self) -> Result<TextMetrics, String> {
        let mut table = serde_json::Map::new();
        table.insert(
            "font".into(),
            self.family().unwrap_or_else(|| "font".into()).into(),
        );
        let em = self.units_per_em();
        for w in WEIGHTS {
            let coords = self.normalize(&[("wght", f64::from(w)), ("wdth", 100.0)]);
            let adv: Vec<serde_json::Value> = (FIRST_CHAR..=LAST_CHAR)
                .map(|c| {
                    let g = char::from_u32(c).map_or(0, |c| self.glyph_index(c));
                    let v = self.advance_at(g, &coords) * 1000.0 / em;
                    serde_json::json!((v * 1000.0).round() / 1000.0)
                })
                .collect();
            table.insert(w.to_string(), serde_json::json!({ "adv": adv }));
        }
        TextMetrics::from_value(&serde_json::Value::Object(table))
    }
}

#[cfg(test)]
mod tests {
    use super::super::tests::font;

    #[test]
    fn widths_come_from_the_font_at_each_weight() {
        let m = font().text_metrics().unwrap();
        // Advances of H in fontTools' instances: 652 at 400, 674 at 700 (1000 units per em).
        assert!((m.width("H", 1000.0, 400.0) - 652.0).abs() < 1.5);
        assert!((m.width("H", 1000.0, 700.0) - 674.0).abs() < 1.5);
        // Between table weights it interpolates; outside them the nearest applies.
        let mid = m.width("H", 1000.0, 550.0);
        assert!(mid > m.width("H", 1000.0, 500.0) && mid < m.width("H", 1000.0, 600.0));
        assert_eq!(m.width("H", 1000.0, 50.0), m.width("H", 1000.0, 100.0));
        assert!(m.width("Hello", 14.0, 700.0) > m.width("Hello", 14.0, 400.0));
    }

    #[test]
    fn agrees_with_the_committed_table_within_kerning() {
        // The committed table is this family measured in a browser, with kerning.
        let (ours, theirs) = (font().text_metrics().unwrap(), TextMetrics::default_table());
        for text in ["Label", "Save changes", "Spectrum design data"] {
            let (a, b) = (
                ours.width(text, 14.0, 400.0),
                theirs.width(text, 14.0, 400.0),
            );
            assert!((a - b).abs() / b < 0.03, "{text}: {a} vs {b}");
        }
    }

    use crate::text_metrics::TextMetrics;
}
