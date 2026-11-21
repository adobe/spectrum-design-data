// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Golden SVGs: three renders per recipe, committed under
//! `tests/fixtures/visual-golden/<component>/<name>.svg`, so a change to a recipe,
//! token, relationship or the layout engine shows up in review as an SVG diff.
//!
//! After an intended change, regenerate with:
//! `VISUAL_PARITY_UPDATE=1 cargo test -p design-data-core --test visual_goldens`

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene_cached, scene_to_svg, RenderRequest, SceneCache};
use serde_json::Value;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn golden_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/visual-golden")
}

fn read_json(path: PathBuf) -> Value {
    serde_json::from_str(
        &std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path:?}: {e}")),
    )
    .unwrap_or_else(|e| panic!("{path:?}: {e}"))
}

fn load_graph() -> TokenGraph {
    let d = data_dir();
    TokenGraph::from_json_dir_with_catalogs(
        &d.join("tokens"),
        Some(&d.join("mode-sets")),
        Some(&d.join("components")),
    )
    .expect("graph")
    .with_relationships(
        TokenGraph::load_spec_relationships(&d.join("relationships")).expect("rels"),
    )
    .with_icons(TokenGraph::load_spec_icons(&d.join("icons")).expect("icons"))
    .with_visuals(TokenGraph::load_spec_visuals(&d.join("visuals")).expect("visuals"))
}

/// The option values for one golden: `pick` maps an option definition to a value or skips it.
fn pick(
    options: &serde_json::Map<String, Value>,
    f: impl Fn(&Value) -> Option<Value>,
) -> HashMap<String, Value> {
    options
        .iter()
        .filter(|(n, _)| n.as_str() != "size")
        .filter_map(|(n, def)| f(def).map(|v| (n.clone(), v)))
        .collect()
}

fn enum_at(first: bool) -> impl Fn(&Value) -> Option<Value> {
    move |def| {
        let vals = def.get("values")?.as_array()?;
        let v = if first { vals.first() } else { vals.last() }?;
        Some(v.get("value").cloned().unwrap_or_else(|| v.clone()))
    }
}

fn bools(def: &Value) -> Option<Value> {
    (def.get("type").and_then(Value::as_str) == Some("boolean")).then_some(Value::Bool(true))
}

fn requests(name: &str, recipe: &Value, component: &Value) -> Vec<(&'static str, RenderRequest)> {
    let none = serde_json::Map::new();
    let options = component
        .get("options")
        .and_then(Value::as_object)
        .unwrap_or(&none);
    let size = options
        .get("size")
        .and_then(|s| s.get("default"))
        .and_then(Value::as_str)
        .map(String::from)
        .or_else(|| {
            recipe
                .get("sizeScale")
                .and_then(Value::as_object)
                .and_then(|m| m.keys().next().cloned())
        })
        .expect("size");
    let state = component
        .get("states")
        .and_then(Value::as_array)
        .and_then(|a| {
            a.iter()
                .filter_map(|s| s.get("name").and_then(Value::as_str))
                .find(|n| *n != "disabled")
        })
        .map(String::from);
    let req = |states: Vec<String>, options: HashMap<String, Value>, scheme: &str, scale: &str| {
        RenderRequest {
            component: name.into(),
            size: size.clone(),
            states,
            options,
            mode: [("colorScheme", scheme), ("scale", scale)]
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            label: "Label".into(),
            icon: None,
            text_metrics: None,
            width: None,
        }
    };
    let mut all_on = pick(options, enum_at(false));
    all_on.extend(pick(options, bools));
    let mut out = vec![
        ("default", req(vec![], HashMap::new(), "light", "desktop")),
        (
            "all-on-dark-mobile",
            req(state.into_iter().collect(), all_on, "dark", "mobile"),
        ),
        (
            "first-values-wireframe",
            req(vec![], pick(options, enum_at(true)), "wireframe", "desktop"),
        ),
    ];
    // Badge wraps its label (`overflow`): a narrow width forces two lines, and the icon
    // centres on the first.
    if name == "badge" {
        let narrow = |icon: bool| {
            let mut r = req(vec![], HashMap::new(), "light", "desktop");
            r.label = "Three word label".into();
            r.width = Some(if icon { 104.0 } else { 80.0 });
            if icon {
                r.options.insert("icon".into(), Value::Bool(true));
            }
            r
        };
        out.push(("wrapped-label-narrow", narrow(false)));
        out.push(("wrapped-label-icon-narrow", narrow(true)));
    }
    // The item with its trailing action button and switch (nested recipes), at the default
    // size: the case the M size Figma measurements are compared with.
    if name == "accordion" {
        let on = ["hasActionButton", "hasSwitch"]
            .iter()
            .map(|o| (o.to_string(), Value::Bool(true)))
            .collect();
        out.push(("direct-actions", req(vec![], on, "light", "desktop")));
        // The container: three items, the first open, drawn as one stack.
        let items = serde_json::json!([
            { "label": "Title 1", "isExpanded": true },
            { "label": "Title 2" },
            { "label": "Title 3" }
        ]);
        let opts = HashMap::from([("items".to_string(), items)]);
        out.push(("three-items", req(vec![], opts, "light", "desktop")));
    }
    // Progress bar: the fill is a share of the track and the value text a percentage, so the
    // defaults (no value) show an empty bar. These show a half-full bar and an indeterminate one.
    if name == "progress-bar" {
        let with = |opts: &[(&str, Value)]| -> HashMap<String, Value> {
            opts.iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        out.push((
            "half",
            req(vec![], with(&[("value", 50.into())]), "light", "desktop"),
        ));
        out.push((
            "indeterminate",
            req(
                vec![],
                with(&[("isIndeterminate", true.into())]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "static-white-custom-label",
            req(
                vec![],
                with(&[
                    ("value", 75.into()),
                    ("valueLabel", "3 of 4".into()),
                    ("staticColor", "white".into()),
                ]),
                "dark",
                "desktop",
            ),
        ));
    }
    // Progress circle: the arc is a share of the ring from 12 o'clock, clockwise. The defaults (no
    // value) show an empty ring; these show a half ring, the indeterminate frame, a large
    // three-quarter ring and a static white and black one.
    if name == "progress-circle" {
        let with = |opts: &[(&str, Value)]| -> HashMap<String, Value> {
            opts.iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        // (label, size, options, color scheme). Size is the request's, not an option.
        type Case<'a> = (&'static str, &'static str, &'a [(&'a str, Value)], &'a str);
        let cases: [Case; 5] = [
            ("half", "m", &[("value", 50.into())], "light"),
            (
                "indeterminate",
                "m",
                &[("isIndeterminate", true.into())],
                "light",
            ),
            (
                "large-three-quarters",
                "l",
                &[("value", 75.into())],
                "light",
            ),
            (
                "static-white-small",
                "s",
                &[("value", 25.into()), ("staticColor", "white".into())],
                "dark",
            ),
            (
                "static-black-full",
                "m",
                &[("value", 100.into()), ("staticColor", "black".into())],
                "light",
            ),
        ];
        for (label, size, opts, scheme) in cases {
            let mut r = req(vec![], with(opts), scheme, "desktop");
            r.size = size.into();
            out.push((label, r));
        }
    }
    // In-field progress circle: one fixed arc frame, sizes from the in-field size tokens, and the
    // static colors. Defaults show the regular ring at medium.
    if name == "in-field-progress-circle" {
        let with = |opts: &[(&str, Value)]| -> HashMap<String, Value> {
            opts.iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        type Case<'a> = (&'static str, &'static str, &'a [(&'a str, Value)], &'a str);
        let cases: [Case; 7] = [
            ("small", "s", &[], "light"),
            ("extra-large", "xl", &[], "dark"),
            (
                "static-white-large",
                "l",
                &[("staticColor", "white".into())],
                "dark",
            ),
            (
                "static-black-medium",
                "m",
                &[("staticColor", "black".into())],
                "light",
            ),
            ("mobile-small", "s", &[], "light"),
            ("mobile-large", "l", &[], "light"),
            ("mobile-extra-large", "xl", &[], "light"),
        ];
        for (label, size, opts, scheme) in cases {
            let scale = if label.starts_with("mobile") {
                "mobile"
            } else {
                "desktop"
            };
            let mut r = req(vec![], with(opts), scheme, scale);
            r.size = size.into();
            out.push((label, r));
        }
    }
    // Meter: variants set the fill colour through relationships, and a static colour must win over
    // the variant. The defaults (no value) show an empty bar.
    if name == "meter" {
        let with = |opts: &[(&str, Value)]| -> HashMap<String, Value> {
            opts.iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        for variant in ["positive", "notice", "negative"] {
            let opts = with(&[("value", 50.into()), ("variant", variant.into())]);
            let label = format!("{variant}-half");
            out.push((
                Box::leak(label.into_boxed_str()),
                req(vec![], opts, "light", "desktop"),
            ));
        }
        out.push((
            "static-black-help-text",
            req(
                vec![],
                with(&[
                    ("value", 75.into()),
                    ("variant", "negative".into()),
                    ("staticColor", "black".into()),
                    ("helpText", "Help text".into()),
                ]),
                "light",
                "desktop",
            ),
        ));
    }
    // Help text: the alert icon shows only for the negative variant, and a disabled state wins over
    // the variant colour, so the icon and text are both grey.
    if name == "help-text" {
        let with = |opts: &[(&str, Value)]| -> HashMap<String, Value> {
            opts.iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        out.push((
            "negative",
            req(
                vec![],
                with(&[("variant", "negative".into())]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "negative-disabled",
            req(
                vec![],
                with(&[("variant", "negative".into()), ("isDisabled", true.into())]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "negative-disabled-hidden-icon",
            req(
                vec![],
                with(&[
                    ("variant", "negative".into()),
                    ("isDisabled", true.into()),
                    ("hideIcon", true.into()),
                ]),
                "light",
                "desktop",
            ),
        ));
    }
    // Text field: the defaults draw an empty field (no value, label or help text are set). These
    // fill it in: a label, a value and help text at each size, the hover and keyboard-focus
    // borders, the invalid and disabled borders, the valid check and the dark mobile scheme.
    if name == "text-field" {
        type Case = (
            &'static str,
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
        let filled: [(&str, Value); 3] = [
            ("label", "Name".into()),
            ("value", "Hello".into()),
            ("helpText", "Help text".into()),
        ];
        let cases: Vec<Case> = vec![
            ("filled-s", "s", vec![], vec![], "light", "desktop"),
            ("filled-m", "m", vec![], vec![], "light", "desktop"),
            ("filled-l", "l", vec![], vec![], "light", "desktop"),
            ("filled-xl", "xl", vec![], vec![], "light", "desktop"),
            (
                "required-icon",
                "m",
                vec![],
                vec![("isRequired", true.into())],
                "light",
                "desktop",
            ),
            ("hover", "m", vec!["hover"], vec![], "light", "desktop"),
            (
                "keyboard-focus",
                "m",
                vec!["keyboard-focus"],
                vec![],
                "light",
                "desktop",
            ),
            (
                "keyboard-focus-dark",
                "m",
                vec!["keyboard-focus"],
                vec![],
                "dark",
                "desktop",
            ),
            (
                "disabled",
                "m",
                vec![],
                vec![("isDisabled", true.into())],
                "light",
                "desktop",
            ),
            (
                "valid",
                "m",
                vec![],
                vec![("showValidIcon", true.into())],
                "light",
                "desktop",
            ),
            ("dark-mobile-xl", "xl", vec![], vec![], "dark", "mobile"),
            (
                "hidden-label",
                "m",
                vec![],
                vec![("hideLabel", true.into())],
                "light",
                "desktop",
            ),
        ];
        for (label, size, states, extra, scheme, scale) in cases {
            let mut opts: HashMap<String, Value> = filled
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect();
            opts.extend(extra.iter().map(|(k, v)| (k.to_string(), v.clone())));
            let mut r = req(
                states.iter().map(|s| s.to_string()).collect(),
                opts,
                scheme,
                scale,
            );
            r.size = size.into();
            out.push((label, r));
        }
    }
    // Close button: the hover fill (gray-200 here), the keyboard-focus ring, and a static colour
    // over the dark scheme, where the neutral colours would not show.
    if name == "close-button" {
        out.push((
            "hover",
            req(vec!["hover".into()], HashMap::new(), "light", "desktop"),
        ));
        out.push((
            "keyboard-focus",
            req(
                vec!["keyboard-focus".into()],
                HashMap::new(),
                "light",
                "desktop",
            ),
        ));
        // Disabled wins over a state for the static cross colour: both records pin two options.
        out.push((
            "static-black-disabled-hover",
            req(
                vec!["hover".into()],
                HashMap::from([
                    ("staticColor".to_string(), Value::String("black".into())),
                    ("isDisabled".to_string(), Value::Bool(true)),
                ]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "static-white-hover",
            req(
                vec!["hover".into()],
                HashMap::from([("staticColor".to_string(), Value::String("white".into()))]),
                "dark",
                "desktop",
            ),
        ));
    }
    // Link: the underline appears on a quiet standalone link only on hover or keyboard focus (the
    // ring follows the label's corner radius), an inline link is regular weight and always
    // underlined, and a static colour over the dark scheme.
    if name == "link" {
        let with = |pairs: &[(&str, Value)]| -> HashMap<String, Value> {
            pairs
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        out.push((
            "quiet-hover",
            req(
                vec!["hover".into()],
                with(&[("isQuiet", true.into())]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "secondary-keyboard-focus",
            req(
                vec!["keyboard-focus".into()],
                with(&[("variant", "secondary".into())]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "inline-static-white",
            req(
                vec![],
                with(&[
                    ("isStandalone", false.into()),
                    ("staticColor", "white".into()),
                ]),
                "dark",
                "desktop",
            ),
        ));
    }
    // Swatch: the preview color (a request option), the selected border with its inner band on
    // a pill, the empty slash on a rectangle, the disabled cancel icon, and the keyboard-focus
    // ring. A full-round empty swatch is left out: the slash has no clipping, so its ends would
    // stick out of the circle (known renderer gap).
    if name == "swatch" {
        let with = |pairs: &[(&str, Value)]| -> HashMap<String, Value> {
            pairs
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        out.push((
            "preview-selected-full",
            req(
                vec![],
                with(&[
                    ("preview", "#9197fe".into()),
                    ("isSelected", true.into()),
                    ("cornerRounding", "full".into()),
                ]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "empty-rectangle-partial",
            req(
                vec![],
                with(&[
                    ("shape", "rectangle".into()),
                    ("cornerRounding", "partial".into()),
                ]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "preview-disabled",
            req(
                vec![],
                with(&[
                    ("preview", "rgb(145, 151, 254)".into()),
                    ("isDisabled", true.into()),
                ]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "preview-gradient-full",
            req(
                vec![],
                with(&[
                    (
                        "preview",
                        "linear-gradient(135deg, #ff0000, #ffff00 40%, #0000ff)".into(),
                    ),
                    ("cornerRounding", "full".into()),
                ]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "preview-keyboard-focus-dark",
            req(
                vec!["keyboard-focus".into()],
                with(&[("preview", "#9197fe".into())]),
                "dark",
                "desktop",
            ),
        ));
    }
    // Avatar: the disabled dim on a gradient backdrop, the stroke over the dark scheme, and a
    // large size on mobile with the 1px stroke (the 2px stroke from size 1000 has no token yet).
    if name == "avatar" {
        let with = |image: &str, extra: Option<(&str, bool)>| {
            let mut o = HashMap::from([("image".to_string(), Value::String(image.into()))]);
            if let Some((k, v)) = extra {
                o.insert(k.to_string(), Value::Bool(v));
            }
            o
        };
        out.push((
            "initials-disabled",
            req(
                vec![],
                with("initials", Some(("isDisabled", true))),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "guest-stroke-dark",
            req(
                vec![],
                with("guest", Some(("showStroke", true))),
                "dark",
                "desktop",
            ),
        ));
        let mut r = req(
            vec![],
            with("gradient image", Some(("showStroke", true))),
            "light",
            "mobile",
        );
        r.size = "1000".into();
        out.push(("gradient-image-large-mobile", r));
    }
    // Divider: every size, both orientations, and each static colour. The regular fill and the
    // static fills are separate relationships, so this guards which one wins.
    if name == "divider" {
        for size in ["s", "m", "l"] {
            for orientation in ["horizontal", "vertical"] {
                for color in [None, Some("white"), Some("black")] {
                    let mut opts = HashMap::from([(
                        "orientation".to_string(),
                        Value::String(orientation.into()),
                    )]);
                    if let Some(c) = color {
                        opts.insert("staticColor".into(), Value::String(c.into()));
                    }
                    let mut r = req(vec![], opts, "light", "desktop");
                    r.size = size.into();
                    let label = format!("{size}-{orientation}-{}", color.unwrap_or("default"));
                    out.push((Box::leak(label.into_boxed_str()), r));
                }
            }
        }
    }
    // Checkbox, radio button and switch wrap their label too: the control stays on the first line.
    if matches!(name, "checkbox" | "radio-button" | "switch") {
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.label = "Three word label".into();
        r.width = Some(100.0);
        out.push(("wrapped-label-narrow", r));
    }
    out
}

#[test]
fn recipe_renders_match_the_golden_svgs() {
    let graph = load_graph();
    let cache = SceneCache::default();
    let update = std::env::var("VISUAL_PARITY_UPDATE").is_ok_and(|v| v == "1");
    let mut recipes: Vec<String> = std::fs::read_dir(data_dir().join("visuals"))
        .expect("visuals dir")
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let p = e.path();
            (p.extension().is_some_and(|x| x == "json"))
                .then(|| p.file_stem().unwrap().to_string_lossy().into_owned())
        })
        .collect();
    recipes.sort();
    assert!(!recipes.is_empty());

    let mut problems = Vec::new();
    for name in recipes {
        let recipe = read_json(data_dir().join(format!("visuals/{name}.json")));
        let component = read_json(data_dir().join(format!("components/{name}.json")));
        for (golden, req) in requests(&name, &recipe, &component) {
            let svg = scene_to_svg(
                &build_scene_cached(&graph, &recipe, &req, &cache)
                    .unwrap_or_else(|e| panic!("{name}/{golden}: {e}")),
            );
            let file = golden_dir().join(&name).join(format!("{golden}.svg"));
            if update {
                std::fs::create_dir_all(file.parent().unwrap()).unwrap();
                std::fs::write(&file, &svg).unwrap();
                continue;
            }
            match std::fs::read_to_string(&file) {
                Ok(g) if g == svg => {}
                Ok(_) => problems.push(format!("{name}/{golden}: differs from the golden")),
                Err(_) => problems.push(format!(
                    "{name}/{golden}: missing golden; run with VISUAL_PARITY_UPDATE=1"
                )),
            }
        }
    }
    assert!(problems.is_empty(), "{}", problems.join("\n"));
}
