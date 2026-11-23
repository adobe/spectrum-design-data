// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-117: image-fill-well-formed
//!
//! Error. A part with `image` is a `box` without a `path`. Its `source`, when present, is
//! exactly one of `{ "option": name }` (a string option of the component when it declares
//! options) and `{ "value": uri }`, and a literal `uri` MUST be a `data:image/png;base64` URI the
//! engine can decode within its size limits (the same reader the solver uses decides). `fit` is
//! `cover`, `contain`, `fill` or `none`, and `position` is two numbers from 0 through 1.

use serde_json::Value;

use crate::image::decode_data_uri;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-117"
    }

    fn name(&self) -> &'static str {
        "image-fill-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            let options = component_of(ctx.graph, v)
                .and_then(|c| c.raw.get("options"))
                .and_then(Value::as_object);
            for (id, part) in parts.iter().filter(|(_, p)| p.get("image").is_some()) {
                let image = &part["image"];
                let mut problems: Vec<String> = Vec::new();
                if part.get("kind").and_then(Value::as_str).unwrap_or("box") != "box" {
                    problems.push("is not a box".into());
                }
                if part.get("path").is_some() {
                    problems.push("is a path shape, which draws no image".into());
                }
                if let Some(f) = image.get("fit") {
                    if !matches!(f.as_str(), Some("cover" | "contain" | "fill" | "none")) {
                        problems.push(format!("has fit {f}, not cover, contain, fill or none"));
                    }
                }
                if let Some(p) = image.get("position") {
                    let ok = p.as_array().is_some_and(|a| {
                        a.len() == 2
                            && a.iter()
                                .all(|n| n.as_f64().is_some_and(|n| (0.0..=1.0).contains(&n)))
                    });
                    if !ok {
                        problems.push("has a position that is not two numbers from 0 to 1".into());
                    }
                }
                if let Some(src) = image.get("source") {
                    match (src.get("option"), src.get("value")) {
                        (Some(Value::String(name)), None) => {
                            if let Some(opts) = options {
                                match opts
                                    .get(name)
                                    .and_then(|o| o.get("type"))
                                    .and_then(Value::as_str)
                                {
                                    None => problems.push(format!(
                                        "source names option '{name}', which the component does not declare"
                                    )),
                                    Some("string") => {}
                                    Some(t) => problems.push(format!(
                                        "source names option '{name}', which is a {t}, not a string"
                                    )),
                                }
                            }
                        }
                        (None, Some(Value::String(uri))) => {
                            if let Err(e) = decode_data_uri(uri) {
                                problems.push(format!("has a source that cannot be drawn: {e}"));
                            }
                        }
                        _ => problems.push(
                            "has a source that is not exactly one of an option and a value".into(),
                        ),
                    }
                }
                for problem in problems {
                    out.push(error(
                        self.id(),
                        v,
                        &format!("/parts/{id}/image"),
                        format!("Image part '{id}' of '{}' {problem}", v.component),
                    ));
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::image::{test_png, test_uri};
    use crate::validate::rules::visual_util::test_util::{graph, run};

    fn check(part: serde_json::Value) -> Vec<String> {
        let g = graph(
            json!({"name": "card"}),
            vec![],
            vec![],
            vec![(
                "card",
                json!({ "component": "card", "root": "r", "parts": { "r": { "kind": "box" }, "p": part } }),
            )],
        );
        run(&Rule, &g).into_iter().map(|d| d.message).collect()
    }

    fn image(spec: serde_json::Value) -> serde_json::Value {
        json!({ "kind": "box", "image": spec })
    }

    #[test]
    fn a_drawable_image_is_clean() {
        let uri = test_uri(&test_png(2, 2, 6, &|_, _| vec![1, 2, 3, 4]));
        assert!(check(image(json!({}))).is_empty());
        assert!(check(image(
            json!({ "source": { "value": uri }, "fit": "contain", "position": [0, 1] })
        ))
        .is_empty());
        assert!(check(image(json!({ "source": { "option": "src" } }))).is_empty());
    }

    #[test]
    fn flags_each_bad_declaration() {
        for (spec, why) in [
            (json!({ "fit": "stretch" }), "has fit"),
            (json!({ "fit": 3 }), "has fit"),
            (json!({ "position": [0, 2] }), "position"),
            (json!({ "position": [0] }), "position"),
            (json!({ "source": {} }), "exactly one"),
            (
                json!({ "source": { "option": "a", "value": "b" } }),
                "exactly one",
            ),
            (
                json!({ "source": { "value": "https://x/y.png" } }),
                "data: URI",
            ),
            (
                json!({ "source": { "value": "data:image/jpeg;base64,/9j/" } }),
                "image/png",
            ),
            (
                json!({ "source": { "value": "data:image/png;base64,@@" } }),
                "malformed",
            ),
        ] {
            let m = check(image(spec.clone()));
            assert!(m.iter().any(|m| m.contains(why)), "{spec}: {m:?}");
        }
        let mut huge = test_png(1, 1, 6, &|_, _| vec![0; 4]);
        huge[16..24].copy_from_slice(&[0, 0, 0x4e, 0x20, 0, 0, 0x4e, 0x20]);
        let m = check(image(json!({ "source": { "value": test_uri(&huge) } })));
        assert!(m.iter().any(|m| m.contains("20000x20000")), "{m:?}");
    }

    #[test]
    fn flags_a_non_box_and_a_path() {
        let mut t = image(json!({}));
        t["kind"] = json!("text");
        assert!(check(t).iter().any(|m| m.contains("is not a box")));
        let mut p = image(json!({}));
        p["path"] = json!({ "d": "M0 0L1 1" });
        assert!(check(p).iter().any(|m| m.contains("path shape")));
    }
}
