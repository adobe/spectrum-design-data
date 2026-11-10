// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Derived relationship contexts of a visual recipe (spec: component-visuals.md, Derived
//! contexts). A recipe lists a context whose value follows from the solved layout instead of
//! being bound to its token. The only formula is `(height - <part>.lineHeight) / 2` (or
//! `<part>.height`): the space left above (or below) a part that is centred in the container.

use serde_json::Value;

/// One entry of a recipe's `derived` array.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Derived {
    pub context: String,
    /// Relationship property template, like a `relationship` selector's `property`.
    pub property: String,
    /// The part the spacing leads to; the sheet puts its marker there.
    pub part: String,
    /// `true` for the bottom edge, `false` (default) for the top edge.
    pub bottom: bool,
    pub from: String,
    /// The part whose height the formula subtracts.
    pub subtract: String,
}

/// The part a formula subtracts, or `None` when `from` is not the supported formula.
pub fn parse_formula(from: &str) -> Option<String> {
    let inner = from.strip_prefix("(height - ")?.strip_suffix(") / 2")?;
    let (part, field) = inner.split_once('.')?;
    let ok = !part.is_empty()
        && part
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
    (ok && matches!(field, "lineHeight" | "height")).then(|| part.to_string())
}

/// The recipe's valid `derived` entries, in document order.
pub fn declared(recipe: &Value) -> Vec<Derived> {
    let list = recipe.get("derived").and_then(Value::as_array);
    list.into_iter()
        .flatten()
        .filter_map(|e| {
            let s = |k: &str| e.get(k).and_then(Value::as_str).map(str::to_string);
            let from = s("from")?;
            Some(Derived {
                context: s("context")?.trim().to_string(),
                property: s("property")?,
                part: s("part")?,
                bottom: e.get("edge").and_then(Value::as_str) == Some("bottom"),
                subtract: parse_formula(&from)?,
                from,
            })
        })
        .collect()
}

impl Derived {
    /// The root padding prop the edge corresponds to.
    pub fn padding_prop(&self) -> &'static str {
        if self.bottom {
            "paddingBlockEnd"
        } else {
            "paddingBlockStart"
        }
    }

    /// The formula's value for a container `height`; `part_height` gives a part's solved
    /// height, or `None` when it is not drawn.
    pub fn value(&self, height: f64, part_height: impl Fn(&str) -> Option<f64>) -> Option<f64> {
        Some((height - part_height(&self.subtract)?) / 2.0)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn parses_only_the_supported_formula() {
        assert_eq!(
            parse_formula("(height - label.lineHeight) / 2").as_deref(),
            Some("label")
        );
        assert_eq!(
            parse_formula("(height - box.height) / 2").as_deref(),
            Some("box")
        );
        assert_eq!(parse_formula("height / 2"), None);
        assert_eq!(parse_formula("(height - label.width) / 2"), None);
    }

    #[test]
    fn declared_skips_entries_with_a_bad_formula() {
        let r = json!({ "derived": [
            { "context": "A", "property": "p", "part": "label", "from": "(height - label.lineHeight) / 2" },
            { "context": "B", "property": "p", "part": "label", "edge": "bottom", "from": "nope" },
        ]});
        let d = declared(&r);
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].value(24.0, |_| Some(16.0)), Some(4.0));
        assert_eq!(d[0].value(24.0, |_| None), None);
    }
}
