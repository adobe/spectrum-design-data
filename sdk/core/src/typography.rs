// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Typography composites: the shared unpacking of a composite's inner `{alias}` sub-values.
//!
//! A typography composite (`token-types/typography.json`) holds `{legacy-name}` aliases that
//! resolve by mode (`scale` picks the desktop or mobile row of `font-size-100`). The graph's
//! `legacy_name_index` keeps a single token per name, so [`unpack`] resolves each sub-value with
//! [`cascade::resolve_reference`], which scores the mode rows against the context.

use std::collections::HashMap;

use serde::Serialize;
use serde_json::Value;

use crate::cascade::resolve_reference;
use crate::graph::{TokenGraph, TokenRecord};

/// Schema URL suffix that marks a token as a typography composite.
pub const COMPOSITE_SCHEMA_SUFFIX: &str = "token-types/typography.json";

/// One resolved sub-value of a composite.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct StyleValue {
    /// The terminal value for the requested mode; `None` when the alias dangles.
    pub value: Option<Value>,
    /// The inner token's legacy name (`font-size-100`); `None` for a literal sub-value.
    pub token: Option<String>,
}

/// A composite's sub-values, each resolved for one mode context. A key the composite lacks is `None`.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Unpacked {
    pub font_family: Option<StyleValue>,
    pub font_size: Option<StyleValue>,
    pub font_weight: Option<StyleValue>,
    pub line_height: Option<StyleValue>,
    pub letter_spacing: Option<StyleValue>,
}

/// Whether `token` is a typography composite.
pub fn is_composite(token: &TokenRecord) -> bool {
    token
        .schema_url
        .as_deref()
        .is_some_and(|s| s.ends_with(COMPOSITE_SCHEMA_SUFFIX))
}

/// `ctx` with every declared mode set the caller left out set to its default, so the choice
/// between mode rows never falls to a tie-break.
pub fn complete_context(
    graph: &TokenGraph,
    ctx: &HashMap<String, String>,
) -> HashMap<String, String> {
    let mut full: HashMap<String, String> = graph
        .mode_sets
        .iter()
        .map(|m| (m.name.clone(), m.default_mode.clone()))
        .collect();
    full.extend(ctx.iter().map(|(k, v)| (k.clone(), v.clone())));
    full
}

/// Resolve one sub-value: an `{alias}` through [`resolve_reference`], anything else as a literal.
pub fn resolve_sub_value(
    graph: &TokenGraph,
    raw: &Value,
    ctx: &HashMap<String, String>,
) -> StyleValue {
    let alias = raw
        .as_str()
        .and_then(|s| s.strip_prefix('{'))
        .and_then(|s| s.strip_suffix('}'))
        .filter(|s| !s.is_empty());
    match alias {
        Some(name) => StyleValue {
            value: resolve_reference(graph, name, ctx).and_then(|r| r.value),
            token: Some(name.to_string()),
        },
        None => StyleValue {
            value: Some(raw.clone()),
            token: None,
        },
    }
}

/// Unpack a typography composite for the mode `ctx`. An alias to another composite is followed
/// first. Returns `None` when `token` is not a composite or its value is not an object.
pub fn unpack(
    graph: &TokenGraph,
    token: &TokenRecord,
    ctx: &HashMap<String, String>,
) -> Option<Unpacked> {
    let ctx = complete_context(graph, ctx);
    let leaf = token.resolve_leaf_in_context(graph, &ctx);
    if !is_composite(leaf) {
        return None;
    }
    let obj = leaf.raw.get("value")?.as_object()?;
    let sub = |k: &str| obj.get(k).map(|v| resolve_sub_value(graph, v, &ctx));
    Some(Unpacked {
        font_family: sub("fontFamily"),
        font_size: sub("fontSize"),
        font_weight: sub("fontWeight"),
        line_height: sub("lineHeight"),
        letter_spacing: sub("letterSpacing"),
    })
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{Layer, ModeSetRecord};

    const SCHEMA: &str =
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/typography.json";

    fn tok(uuid: &str, name: Value, schema: Option<&str>, value: Value) -> TokenRecord {
        TokenRecord {
            name: uuid.into(),
            file: PathBuf::from("t.json"),
            index: 0,
            schema_url: schema.map(String::from),
            uuid: Some(uuid.into()),
            alias_target: None,
            layer: Layer::Foundation,
            raw: json!({"name": name, "value": value, "uuid": uuid}),
        }
    }

    fn graph() -> TokenGraph {
        let mut g = TokenGraph::from_records(vec![
            tok(
                "c1",
                json!({"property": "typography", "size": "m"}),
                Some(SCHEMA),
                json!({"fontSize": "{font-size-100}", "fontWeight": "{regular-font-weight}",
                       "lineHeight": "{missing}", "letterSpacing": "0"}),
            ),
            tok(
                "f1",
                json!({"legacyKey": "font-size-100", "scale": "desktop"}),
                None,
                json!("14px"),
            ),
            tok(
                "f2",
                json!({"legacyKey": "font-size-100", "scale": "mobile"}),
                None,
                json!("17px"),
            ),
            tok(
                "w1",
                json!({"legacyKey": "regular-font-weight"}),
                None,
                json!("400"),
            ),
        ]);
        g.mode_sets.push(ModeSetRecord {
            file: PathBuf::from("scale.json"),
            name: "scale".into(),
            modes: vec!["desktop".into(), "mobile".into()],
            default_mode: "desktop".into(),
        });
        g
    }

    fn style_for(g: &TokenGraph, scale: Option<&str>) -> Unpacked {
        let ctx: HashMap<String, String> = scale
            .map(|s| ("scale".to_string(), s.to_string()))
            .into_iter()
            .collect();
        unpack(g, g.tokens.get("c1").unwrap(), &ctx).unwrap()
    }

    #[test]
    fn inner_alias_resolves_by_scale() {
        let g = graph();
        let size = |s| style_for(&g, s).font_size.unwrap();
        assert_eq!(size(Some("mobile")).value, Some(json!("17px")));
        assert_eq!(size(Some("desktop")).value, Some(json!("14px")));
        assert_eq!(size(None).value, Some(json!("14px")));
        assert_eq!(size(Some("mobile")).token.as_deref(), Some("font-size-100"));
    }

    #[test]
    fn literals_and_dangling_aliases() {
        let u = style_for(&graph(), None);
        assert_eq!(
            u.letter_spacing.unwrap(),
            StyleValue {
                value: Some(json!("0")),
                token: None
            }
        );
        let lh = u.line_height.unwrap();
        assert_eq!((lh.value, lh.token.as_deref()), (None, Some("missing")));
        assert!(u.font_family.is_none());
    }

    #[test]
    fn non_composite_is_none() {
        let g = graph();
        assert!(unpack(&g, g.tokens.get("f1").unwrap(), &HashMap::new()).is_none());
    }
}
