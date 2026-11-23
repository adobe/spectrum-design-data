// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-115: gradient-ramp-well-formed
//!
//! Error. A `gradient` has `stops` or a `ramp`, not both. A `ramp` has a `color` that is an
//! `{ "option": name }` and a `channel`, optional `space` and optional `z` that are each
//! `{ "option": name }` or `{ "value": "<name>" }`. An option MUST be a string option of the
//! component when the component declares options; a literal channel MUST be one of hue,
//! saturation, lightness, brightness, red, green, blue or alpha, and a literal space one of
//! hsl, hsb or rgb. When every input is a literal the ramp is computed with the engine's own
//! reader, so a channel that its space lacks, or a layer a color area cannot draw, fails here
//! and not at render time.

use serde_json::Value;

use crate::ramp::{area_layer, is_channel, track, Color, Space};
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error};

pub struct Rule;

fn gradients<'a>(v: &'a Value, out: &mut Vec<&'a Value>) {
    match v {
        Value::Array(a) => a.iter().for_each(|x| gradients(x, out)),
        Value::Object(o) => {
            for (k, x) in o {
                if k == "gradient" && x.is_object() {
                    out.push(x);
                }
                gradients(x, out);
            }
        }
        _ => {}
    }
}

fn literal(src: &Value) -> Option<&str> {
    src.get("value").and_then(Value::as_str)
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-115"
    }

    fn name(&self) -> &'static str {
        "gradient-ramp-well-formed"
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
            for (id, part) in parts {
                let mut found = Vec::new();
                if let Some(props) = part.get("props") {
                    gradients(props, &mut found);
                }
                for g in found {
                    let mut problems: Vec<String> = Vec::new();
                    match (g.get("stops"), g.get("ramp")) {
                        (Some(_), Some(_)) => problems.push("has both stops and ramp".into()),
                        (None, None) => problems.push("has neither stops nor ramp".into()),
                        _ => {}
                    }
                    if let Some(ramp) = g.get("ramp") {
                        for key in ["color", "channel", "space", "z"] {
                            let Some(src) = ramp.get(key) else {
                                if key == "color" || key == "channel" {
                                    problems.push(format!("ramp has no {key}"));
                                }
                                continue;
                            };
                            match (src.get("option"), src.get("value")) {
                                (Some(Value::String(name)), None) => {
                                    if let Some(opts) = options {
                                        match opts
                                            .get(name)
                                            .and_then(|o| o.get("type"))
                                            .and_then(Value::as_str)
                                        {
                                            None => problems.push(format!(
                                                "ramp.{key} names option '{name}', which the component does not declare"
                                            )),
                                            Some("string") => {}
                                            Some(t) => problems.push(format!(
                                                "ramp.{key} names option '{name}', which is a {t}, not a string"
                                            )),
                                        }
                                    }
                                }
                                (None, Some(Value::String(lit))) if key != "color" => {
                                    let ok = if key == "space" {
                                        Space::parse(lit).is_some()
                                    } else {
                                        is_channel(lit)
                                    };
                                    if !ok {
                                        problems.push(format!("ramp.{key} '{lit}' is not known"));
                                    }
                                }
                                _ => problems.push(format!(
                                    "ramp.{key} is not {}",
                                    if key == "color" {
                                        "an option"
                                    } else {
                                        "an option or a name"
                                    }
                                )),
                            }
                        }
                        // Every input a literal: run the engine's own ramp on a sample color.
                        if problems.is_empty() {
                            let sample = Color::parse("hsl(0, 100%, 50%)");
                            let channel = ramp.get("channel").and_then(literal);
                            let space = match ramp.get("space") {
                                Some(s) => literal(s).map(Space::parse),
                                None => Some(None),
                            };
                            let z = match ramp.get("z") {
                                Some(z) => literal(z).map(Some),
                                None => Some(None),
                            };
                            if let (Some(c), Some(channel), Some(space), Some(z)) =
                                (sample, channel, space, z)
                            {
                                let r = match z {
                                    Some(z) => area_layer(c, space, channel, z),
                                    None => track(c, channel, space),
                                };
                                if let Err(why) = r {
                                    problems.push(format!("ramp cannot be drawn: {why}"));
                                }
                            }
                        }
                    }
                    for problem in problems {
                        out.push(error(
                            self.id(),
                            v,
                            &format!("/parts/{id}/props"),
                            format!("Gradient of part '{id}' of '{}' {problem}", v.component),
                        ));
                    }
                }
            }
        }
        out
    }
}
