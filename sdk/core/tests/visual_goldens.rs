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
use design_data_core::visual::{
    build_scene_cached, scene_to_svg, RenderRequest, SceneCache, SlotFill,
};
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
    .with_behaviors_dir(&d.join("behaviors"))
    .expect("behaviors")
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

/// The `demo` fills of a component's slots, as a render request's `slots`.
fn demo_slots(component: &Value) -> HashMap<String, Vec<SlotFill>> {
    component
        .get("slots")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|s| {
            let fills = serde_json::from_value(s.get("demo")?.clone()).expect("demo fills");
            Some((s.get("name")?.as_str()?.to_string(), fills))
        })
        .collect()
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
            slots: Default::default(),
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
    // centers on the first.
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
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.slots = HashMap::from([(
            "actions".to_string(),
            ["action-button", "switch"]
                .iter()
                .map(|c| design_data_core::visual::SlotFill {
                    component: c.to_string(),
                    ..Default::default()
                })
                .collect(),
        )]);
        out.push(("direct-actions", r));
        // The container: three items, the first open, drawn as one stack.
        let items = serde_json::json!([
            { "label": "Title 1", "isExpanded": true },
            { "label": "Title 2" },
            { "label": "Title 3" }
        ]);
        let opts = HashMap::from([("items".to_string(), items)]);
        out.push(("three-items", req(vec![], opts, "light", "desktop")));
    }
    // Breadcrumbs: links, a disabled one and the current page, at both sizes and scales.
    if name == "breadcrumbs" {
        let items = serde_json::json!([
            { "label": "My computer" },
            { "label": "Estimates" },
            { "label": "Archive", "isDisabled": true },
            { "label": "Drafts", "isCurrent": true }
        ]);
        let with = || HashMap::from([("items".to_string(), items.clone())]);
        out.push(("four-items", req(vec![], with(), "light", "desktop")));
        let mut r = req(vec![], with(), "light", "desktop");
        r.size = "l".into();
        out.push(("four-items-size-l", r));
        out.push((
            "four-items-dark-mobile",
            req(vec![], with(), "dark", "mobile"),
        ));
    }
    // Steplist: a completed, a hovered completed, the current, an incomplete and a disabled step,
    // at every size, in a row wide enough to show the tracks.
    if name == "steplist" {
        let items = serde_json::json!([
            { "label": "Details", "stepState": "completed default" },
            { "label": "Select offers", "stepState": "completed hover" },
            { "label": "Fallback offer", "stepState": "current default" },
            { "label": "Summary", "stepState": "incomplete default" },
            { "label": "Review", "stepState": "incomplete default", "isDisabled": true }
        ]);
        let wide = |size: &str, scheme: &str, scale: &str| {
            let mut r = req(
                vec![],
                HashMap::from([("items".to_string(), items.clone())]),
                scheme,
                scale,
            );
            r.size = size.into();
            r.width = Some(640.0);
            r
        };
        out.push(("five-steps", wide("m", "light", "desktop")));
        out.push(("five-steps-size-s", wide("s", "light", "desktop")));
        out.push(("five-steps-size-l", wide("l", "light", "desktop")));
        out.push(("five-steps-size-xl", wide("xl", "light", "desktop")));
        out.push(("five-steps-dark-mobile", wide("m", "dark", "mobile")));
        let emphasized = |scheme: &str, scale: &str| {
            let mut r = wide("m", scheme, scale);
            r.options.insert("variant".into(), "emphasized".into());
            r
        };
        out.push(("five-steps-emphasized", emphasized("light", "desktop")));
        out.push((
            "five-steps-emphasized-dark-mobile",
            emphasized("dark", "mobile"),
        ));
    }
    // Collections: selected, unselected and disabled items side by side, in each layout the
    // recipe draws (tabs horizontal and vertical, segmented control with and without a track).
    if name == "tabs" || name == "segmented-control" {
        let items = serde_json::json!([
            { "label": "Tab one", "isSelected": true },
            { "label": "Tab two" },
            { "label": "Tab three", "isDisabled": true }
        ]);
        let with = |extra: &[(&str, Value)]| -> HashMap<String, Value> {
            let mut m = HashMap::from([("items".to_string(), items.clone())]);
            m.extend(extra.iter().map(|(k, v)| (k.to_string(), v.clone())));
            m
        };
        out.push(("three-items", req(vec![], with(&[]), "light", "desktop")));
        for size in ["s", "l", "xl"] {
            let mut r = req(
                vec![],
                with(&[("density", "compact".into())]),
                "light",
                "desktop",
            );
            if name == "segmented-control" {
                r.options.remove("density");
            }
            r.size = size.into();
            out.push((
                match size {
                    "s" => "three-items-size-s",
                    "l" => "three-items-size-l",
                    _ => "three-items-size-xl",
                },
                r,
            ));
        }
        if name == "tabs" {
            for (size, id) in [
                ("s", "three-items-size-s-regular"),
                ("l", "three-items-size-l-regular"),
            ] {
                let mut r = req(vec![], with(&[]), "light", "desktop");
                r.size = size.into();
                out.push((id, r));
            }
            let mut r = req(vec![], with(&[]), "light", "mobile");
            r.size = "xl".into();
            out.push(("three-items-size-xl-regular-mobile", r));
            out.push((
                "three-items-compact",
                req(
                    vec![],
                    with(&[("density", "compact".into())]),
                    "light",
                    "desktop",
                ),
            ));
            out.push((
                "three-items-vertical",
                req(
                    vec![],
                    with(&[("orientation", "vertical".into())]),
                    "light",
                    "desktop",
                ),
            ));
        } else {
            out.push((
                "three-items-no-track",
                req(
                    vec![],
                    with(&[("hideTracker", true.into())]),
                    "dark",
                    "mobile",
                ),
            ));
        }
    }
    // Menu: selected, unselected and disabled items with a leading icon or thumbnail and a
    // value, under each selection style (check mark, checkbox, switch), sizes and modes. Items
    // are drawn at the Figma width (240 less the popover padding the recipe leaves out).
    if name == "menu" {
        let items = serde_json::json!([
            { "label": "Cut", "isSelected": true, "hasIcon": true, "value": "⌘X" },
            { "label": "Copy", "hasIcon": true, "value": "⌘C" },
            { "label": "Paste", "isDisabled": true, "hasIcon": true },
            { "label": "Duplicate", "isSelected": true, "isDisabled": true, "hasThumbnail": true },
            { "label": "Rename", "hasThumbnail": true }
        ]);
        let case = |mode: &str, style: Option<&str>, size: &str, scheme: &str, scale: &str| {
            let mut o = HashMap::from([
                ("items".to_string(), items.clone()),
                ("selectionMode".to_string(), mode.into()),
            ]);
            if let Some(s) = style {
                o.insert("selectionStyle".into(), s.into());
            }
            let mut r = req(vec![], o, scheme, scale);
            r.size = size.into();
            r.width = Some(224.0);
            r
        };
        out.push((
            "items-single",
            case("single", None, "m", "light", "desktop"),
        ));
        out.push((
            "items-checkbox",
            case("multiple", Some("checkbox"), "m", "light", "desktop"),
        ));
        out.push((
            "items-switch",
            case("multiple", Some("switch"), "m", "light", "desktop"),
        ));
        out.push((
            "items-no-selection",
            case("no selection", None, "m", "light", "desktop"),
        ));
        out.push((
            "items-single-size-s",
            case("single", None, "s", "light", "desktop"),
        ));
        out.push((
            "items-single-size-l",
            case("single", None, "l", "light", "desktop"),
        ));
        out.push((
            "items-checkbox-size-xl-dark-mobile",
            case("multiple", Some("checkbox"), "xl", "dark", "mobile"),
        ));
        let mut hover = case("single", None, "m", "light", "desktop");
        hover.states = vec!["hover".into()];
        out.push(("items-single-hover", hover));
        let mut focus = case("single", None, "m", "light", "desktop");
        focus.states = vec!["keyboard-focus".into()];
        out.push(("items-single-keyboard-focus", focus));
    }
    // Calendar: one and two months of days with a blank leading cell, a selected day, a
    // disabled day and a hovered or error state, in the default and the dark mobile modes.
    if name == "calendar" {
        let weekdays: Vec<Value> = ["S", "M", "T", "W", "T", "F", "S"]
            .iter()
            .map(|l| serde_json::json!({ "label": l }))
            .collect();
        let days = |first_blank: usize, count: u32, selected: u32, disabled: u32| -> Value {
            let mut cells: Vec<Value> = (0..first_blank)
                .map(|_| serde_json::json!({ "label": "" }))
                .collect();
            cells.extend((1..=count).map(|d| {
                serde_json::json!({
                    "label": d.to_string(),
                    "isSelected": d == selected,
                    "isDisabled": d <= disabled,
                })
            }));
            Value::Array(cells)
        };
        // A selected range from `start` through `end`: every day in it is selected, the two
        // ends also carry isRangeStart and isRangeEnd.
        let range_days = |first_blank: usize, count: u32, start: u32, end: u32| -> Value {
            let mut cells: Vec<Value> = (0..first_blank)
                .map(|_| serde_json::json!({ "label": "" }))
                .collect();
            cells.extend((1..=count).map(|d| {
                serde_json::json!({
                    "label": d.to_string(),
                    "isSelected": (start..=end).contains(&d),
                    "isRangeStart": d == start,
                    "isRangeEnd": d == end,
                })
            }));
            Value::Array(cells)
        };
        let case = |months: Vec<Value>, scheme: &str, scale: &str| {
            let o = HashMap::from([
                ("months".to_string(), Value::Array(months)),
                ("weekdays".to_string(), Value::Array(weekdays.clone())),
            ]);
            req(vec![], o, scheme, scale)
        };
        let feb = || serde_json::json!({ "title": "February 2026", "days": days(0, 28, 11, 3) });
        let mar = || serde_json::json!({ "title": "March 2026", "days": days(0, 31, 11, 0) });
        let range = |months: Vec<Value>, scheme: &str, scale: &str| {
            let mut r = case(months, scheme, scale);
            r.options.insert("selectionMode".into(), "range".into());
            r
        };
        let feb_range = |start, end| serde_json::json!({ "title": "February 2026", "days": range_days(0, 28, start, end) });
        out.push(("month-single", case(vec![feb()], "light", "desktop")));
        out.push((
            "range-two-weeks",
            range(vec![feb_range(10, 18)], "light", "desktop"),
        ));
        out.push((
            "range-one-week-dark-mobile",
            range(vec![feb_range(9, 12)], "dark", "mobile"),
        ));
        out.push((
            "range-two-adjacent-days",
            range(vec![feb_range(10, 11)], "light", "desktop"),
        ));
        // Fri 6 to Mon 9: the band is capped at the week's end and start, not drawn past it.
        out.push((
            "range-week-edge",
            range(vec![feb_range(6, 9)], "light", "desktop"),
        ));
        // Sat 7 to Sun 8: each end is at a row edge, so only the two circles draw.
        out.push((
            "range-edge-ends",
            range(vec![feb_range(7, 8)], "light", "desktop"),
        ));
        out.push((
            "range-single-day",
            range(vec![feb_range(10, 10)], "light", "desktop"),
        ));
        let mut range_error = range(vec![feb_range(10, 18)], "light", "desktop");
        range_error.options.insert("isError".into(), true.into());
        out.push(("range-error", range_error));
        // Today marker: a plain day, a selected day (11, white dot), a day inside a range, an
        // error selection, a disabled today (3) and the dark mobile mode.
        let today = |mut month: Value, day: usize| {
            month["days"][day - 1]["isToday"] = true.into();
            month
        };
        out.push((
            "today-plain",
            case(vec![today(feb(), 5)], "light", "desktop"),
        ));
        out.push((
            "today-selected",
            case(vec![today(feb(), 11)], "light", "desktop"),
        ));
        out.push((
            "today-disabled",
            case(vec![today(feb(), 3)], "light", "desktop"),
        ));
        out.push((
            "today-in-range",
            range(vec![today(feb_range(10, 18), 14)], "light", "desktop"),
        ));
        let mut today_error = case(vec![today(feb(), 11)], "light", "desktop");
        today_error.options.insert("isError".into(), true.into());
        out.push(("today-error", today_error));
        out.push((
            "today-selected-dark-mobile",
            case(vec![today(feb(), 11)], "dark", "mobile"),
        ));
        out.push((
            "months-double",
            case(vec![feb(), mar()], "light", "desktop"),
        ));
        out.push((
            "months-triple-dark-mobile",
            case(
                vec![
                    feb(),
                    mar(),
                    serde_json::json!({ "title": "April 2026", "days": days(3, 30, 0, 0) }),
                ],
                "dark",
                "mobile",
            ),
        ));
        let mut hover = case(vec![feb()], "light", "desktop");
        hover.states = vec!["hover".into()];
        out.push(("month-hover", hover));
        let mut error = case(vec![feb()], "light", "desktop");
        error.options.insert("isError".into(), true.into());
        out.push(("month-error", error));
    }
    // Side navigation: a heading, then selected, unselected and disabled items, in the
    // default and the dark mobile modes and with a hovered row.
    if name == "side-navigation" {
        let items = serde_json::json!([
            { "label": "Home", "isSelected": true },
            { "label": "Projects" },
            { "label": "Settings", "isDisabled": true },
            { "label": "Archive", "isSelected": true, "isDisabled": true }
        ]);
        let with = |states: Vec<String>, scheme: &str, scale: &str| {
            let mut o = HashMap::from([
                ("items".to_string(), items.clone()),
                ("sectionTitle".to_string(), "Navigate".into()),
            ]);
            o.insert("selectionMode".into(), "single".into());
            req(states, o, scheme, scale)
        };
        out.push(("three-items", with(vec![], "light", "desktop")));
        out.push(("three-items-dark-mobile", with(vec![], "dark", "mobile")));
        out.push((
            "three-items-wireframe",
            with(vec![], "wireframe", "desktop"),
        ));
        out.push((
            "three-items-hover",
            with(vec!["hover".into()], "light", "desktop"),
        ));
    }
    // List view: a description row, then unselected, disabled and selected-disabled rows,
    // in the default and dark mobile modes, hovered, focused and as a single row.
    if name == "list-view" {
        let items = serde_json::json!([
            { "label": "Home", "description": "Start page", "isSelected": true },
            { "label": "Projects" },
            { "label": "Settings", "isDisabled": true },
            { "label": "Archive", "isSelected": true, "isDisabled": true }
        ]);
        let with = |states: Vec<String>, items: &Value, scheme: &str, scale: &str| {
            let mut o = HashMap::from([("items".to_string(), items.clone())]);
            o.insert("selectionMode".into(), "multiple".into());
            req(states, o, scheme, scale)
        };
        out.push(("four-items", with(vec![], &items, "light", "desktop")));
        out.push((
            "four-items-dark-mobile",
            with(vec![], &items, "dark", "mobile"),
        ));
        out.push((
            "four-items-wireframe",
            with(vec![], &items, "wireframe", "desktop"),
        ));
        out.push((
            "four-items-hover",
            with(vec!["hover".into()], &items, "light", "desktop"),
        ));
        // Focus is per row: the flagged row draws the ring, the others do not.
        let focus_row = |row: usize| {
            let mut rows = items.clone();
            rows[row]["isFocusVisible"] = Value::Bool(true);
            rows
        };
        out.push((
            "four-items-keyboard-focus",
            with(
                vec!["keyboard-focus".into()],
                &focus_row(1),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "four-items-focus-selected-description",
            with(vec![], &focus_row(0), "light", "desktop"),
        ));
        out.push((
            "four-items-focus-dark-mobile",
            with(vec![], &focus_row(1), "dark", "mobile"),
        ));
        out.push((
            "one-item",
            with(
                vec![],
                &serde_json::json!([{ "label": "Only row" }]),
                "light",
                "desktop",
            ),
        ));
        // One row shows the ring of a single focused row.
        out.push((
            "one-item-keyboard-focus",
            with(
                vec![],
                &serde_json::json!([{ "label": "Only row", "isSelected": true, "isFocusVisible": true }]),
                "light",
                "desktop",
            ),
        ));
        // Checkbox column: absent in single selection (rows do not shift), drawn for every row
        // in multiple selection (one row, five rows with checked and disabled rows).
        let single = |states: Vec<String>, items: &Value| {
            let mut o = HashMap::from([("items".to_string(), items.clone())]);
            o.insert("selectionMode".into(), "single".into());
            req(states, o, "light", "desktop")
        };
        out.push(("four-items-single", single(vec![], &items)));
        out.push((
            "one-item-multiple-checked",
            with(
                vec![],
                &serde_json::json!([{ "label": "Only row", "isSelected": true }]),
                "light",
                "desktop",
            ),
        ));
        out.push((
            "five-items-multiple",
            with(
                vec![],
                &serde_json::json!([
                    { "label": "Home", "isSelected": true },
                    { "label": "Projects", "description": "Shared with you" },
                    { "label": "Settings", "isDisabled": true },
                    { "label": "Archive", "isSelected": true, "isDisabled": true },
                    { "label": "Trash" }
                ]),
                "light",
                "desktop",
            ),
        ));
    }
    // Tree view: nested items (3 levels, 6 at most). A nested item that leaves a flag out
    // inherits its parent's value, so every nested entry writes the flags that differ.
    if name == "tree-view" {
        let items = serde_json::json!([
            { "label": "Documents", "hasChildren": true, "isExpanded": true, "children": [
                { "label": "Work", "hasChildren": true, "isExpanded": true, "isSelected": true, "children": [
                    { "label": "Report", "hasChildren": false, "isSelected": false },
                    { "label": "Notes", "hasChildren": false, "isSelected": false, "isDisabled": true }
                ] },
                { "label": "Photos", "hasChildren": true, "isExpanded": false, "isSelected": false }
            ] },
            { "label": "Downloads", "hasChildren": true, "isExpanded": false },
            { "label": "Archive", "hasChildren": false, "isSelected": true, "isDisabled": true },
            { "label": "Readme", "hasChildren": false }
        ]);
        let with = |states: Vec<String>, items: &Value, scheme: &str, scale: &str| {
            let mut o = HashMap::from([("items".to_string(), items.clone())]);
            o.insert("selectionMode".into(), "multiple".into());
            req(states, o, scheme, scale)
        };
        out.push((
            "nested-three-levels",
            with(vec![], &items, "light", "desktop"),
        ));
        out.push(("nested-dark-mobile", with(vec![], &items, "dark", "mobile")));
        out.push((
            "nested-wireframe",
            with(vec![], &items, "wireframe", "desktop"),
        ));
        out.push((
            "nested-hover",
            with(vec!["hover".into()], &items, "light", "desktop"),
        ));
        let mut focused = items.clone();
        focused[0]["children"][0]["isFocusVisible"] = Value::Bool(true);
        out.push((
            "nested-keyboard-focus",
            with(vec!["keyboard-focus".into()], &focused, "light", "desktop"),
        ));
        let mut highlight = HashMap::from([("items".to_string(), items.clone())]);
        highlight.insert("selectionMode".into(), "single".into());
        highlight.insert("selectionStyle".into(), "highlight".into());
        out.push((
            "nested-single-highlight",
            req(vec![], highlight, "light", "desktop"),
        ));
        // A selected row keeps the gray selected fill under down and focus, and an
        // unselected row of the highlight style takes no fill from an interaction state.
        out.push((
            "nested-down",
            with(vec!["down".into()], &items, "light", "desktop"),
        ));
        let mut highlight_hover = HashMap::from([("items".to_string(), items.clone())]);
        highlight_hover.insert("selectionMode".into(), "single".into());
        highlight_hover.insert("selectionStyle".into(), "highlight".into());
        out.push((
            "nested-single-highlight-hover",
            req(vec!["hover".into()], highlight_hover, "light", "desktop"),
        ));
        for size in ["s", "l", "xl"] {
            let mut r = with(vec![], &items, "light", "desktop");
            r.size = size.into();
            out.push((
                match size {
                    "s" => "nested-size-s",
                    "l" => "nested-size-l",
                    _ => "nested-size-xl",
                },
                r,
            ));
        }
        out.push((
            "one-item",
            with(
                vec![],
                &serde_json::json!([{ "label": "Only item", "hasChildren": false }]),
                "light",
                "desktop",
            ),
        ));
        // Six levels: the deepest a tree view nests.
        let mut deep = serde_json::json!({ "label": "Level 6", "hasChildren": false });
        for level in (1..6).rev() {
            deep = serde_json::json!({
                "label": format!("Level {level}"),
                "hasChildren": true,
                "isExpanded": true,
                "children": [deep]
            });
        }
        out.push((
            "six-levels",
            with(vec![], &serde_json::json!([deep]), "light", "desktop"),
        ));
    }
    // Stack item: a row with a checkbox, a visual and two trailing action buttons (nested
    // recipes and slot fills), selected, unselected and disabled, light and dark mobile.
    if name == "stack-item" {
        let actions = |n: usize| -> HashMap<String, Vec<design_data_core::visual::SlotFill>> {
            HashMap::from([(
                "actions".to_string(),
                (0..n)
                    .map(|_| design_data_core::visual::SlotFill {
                        component: "action-button".into(),
                        ..Default::default()
                    })
                    .collect(),
            )])
        };
        let row =
            |opts: &[(&str, Value)], states: &[&str], scheme: &str, scale: &str, label: &str| {
                let mut r = req(
                    states.iter().map(|s| s.to_string()).collect(),
                    opts.iter()
                        .map(|(k, v)| (k.to_string(), v.clone()))
                        .collect(),
                    scheme,
                    scale,
                );
                r.label = label.into();
                r.slots = actions(2);
                r.width = Some(306.0);
                r
            };
        let cb = ("selectionStyle", Value::String("checkbox".into()));
        out.push((
            "selected-checkbox-icon",
            row(
                &[
                    cb.clone(),
                    ("visual", "icon".into()),
                    ("isSelected", true.into()),
                ],
                &[],
                "light",
                "desktop",
                "Selected row",
            ),
        ));
        out.push((
            "unselected-hover-thumbnail",
            row(
                &[cb.clone(), ("visual", "thumbnail".into())],
                &["hover"],
                "light",
                "desktop",
                "Unselected row",
            ),
        ));
        out.push((
            "disabled-icon",
            row(
                &[("visual", "icon".into()), ("isDisabled", true.into())],
                &[],
                "light",
                "desktop",
                "Disabled row",
            ),
        ));
        out.push((
            "selected-disabled",
            row(
                &[
                    cb.clone(),
                    ("visual", "icon".into()),
                    ("isSelected", true.into()),
                    ("isDisabled", true.into()),
                ],
                &[],
                "light",
                "desktop",
                "Selected disabled row",
            ),
        ));
        out.push((
            "selected-dark-mobile",
            row(
                &[cb, ("visual", "icon".into()), ("isSelected", true.into())],
                &["hover"],
                "dark",
                "mobile",
                "Selected row",
            ),
        ));
    }
    // Slider: the handle sits at the value (0, a quarter, half, the max and unset), the fill
    // follows it (from `fillStart` for an offset slider), the sizes, the handle states and the
    // editable number field are drawn with real label and value text.
    if name == "slider" {
        let with =
            |opts: &[(&str, Value)], states: &[&str], scheme: &str, scale: &str, size: &str| {
                let mut o: HashMap<String, Value> = opts
                    .iter()
                    .map(|(k, v)| (k.to_string(), v.clone()))
                    .collect();
                o.insert("label".into(), "Brightness".into());
                let mut r = req(
                    states.iter().map(|s| s.to_string()).collect(),
                    o,
                    scheme,
                    scale,
                );
                r.size = size.into();
                r
            };
        let fill = ("hasFill", Value::Bool(true));
        for (id, v) in [
            ("value-0", 0),
            ("value-25", 25),
            ("value-50", 50),
            ("value-100", 100),
        ] {
            out.push((
                id,
                with(
                    &[("value", v.into()), fill.clone()],
                    &[],
                    "light",
                    "desktop",
                    "m",
                ),
            ));
        }
        out.push((
            "value-unset",
            with(&[fill.clone()], &[], "light", "desktop", "m"),
        ));
        for (id, size, scale) in [
            ("size-s", "s", "desktop"),
            ("size-l-mobile", "l", "mobile"),
            ("size-xl", "xl", "desktop"),
        ] {
            out.push((
                id,
                with(
                    &[("value", 50.into()), fill.clone()],
                    &[],
                    "light",
                    scale,
                    size,
                ),
            ));
        }
        for st in ["hover", "down", "keyboard-focus"] {
            out.push((
                match st {
                    "hover" => "state-hover",
                    "down" => "state-down",
                    _ => "state-keyboard-focus",
                },
                with(
                    &[("value", 40.into()), fill.clone()],
                    &[st],
                    "light",
                    "desktop",
                    "m",
                ),
            ));
        }
        out.push((
            "emphasized-dark",
            with(
                &[
                    ("value", 60.into()),
                    fill.clone(),
                    ("isEmphasized", true.into()),
                ],
                &[],
                "dark",
                "desktop",
                "m",
            ),
        ));
        out.push((
            "disabled",
            with(
                &[
                    ("value", 50.into()),
                    fill.clone(),
                    ("isDisabled", true.into()),
                ],
                &[],
                "light",
                "desktop",
                "m",
            ),
        ));
        out.push((
            "offset-fill-start-50",
            with(
                &[("value", 25.into()), fill.clone(), ("fillStart", 50.into())],
                &[],
                "light",
                "desktop",
                "m",
            ),
        ));
        out.push((
            "thick-track",
            with(
                &[
                    ("value", 50.into()),
                    fill.clone(),
                    ("trackStyle", "thick".into()),
                ],
                &[],
                "light",
                "desktop",
                "l",
            ),
        ));
        out.push((
            "editable",
            with(
                &[
                    ("value", 50.into()),
                    fill.clone(),
                    ("isEditable", true.into()),
                ],
                &[],
                "light",
                "desktop",
                "m",
            ),
        ));
    }
    // Tooltip: every placement draws its tip on the matching edge; variants and modes show the
    // fill, text and tip colors.
    if name == "tooltip" {
        let with = |opts: &[(&str, Value)], scheme: &str, scale: &str| {
            let mut r = req(
                vec![],
                opts.iter()
                    .map(|(k, v)| (k.to_string(), v.clone()))
                    .collect(),
                scheme,
                scale,
            );
            r.label = "Tooltip text".into();
            r
        };
        out.push((
            "placement-top-informative",
            with(
                &[
                    ("placement", "top".into()),
                    ("variant", "informative".into()),
                ],
                "light",
                "desktop",
            ),
        ));
        out.push((
            "placement-bottom",
            with(&[("placement", "bottom".into())], "light", "desktop"),
        ));
        out.push((
            "placement-left-negative-dark",
            with(
                &[("placement", "left".into()), ("variant", "negative".into())],
                "dark",
                "desktop",
            ),
        ));
        out.push((
            "placement-right-mobile",
            with(&[("placement", "right".into())], "light", "mobile"),
        ));
    }
    // Popover: the default slot draws real content (two buttons and a link), the tip follows the
    // placement, and hideTip draws none.
    if name == "popover" {
        let fills = || {
            let fill = |c: &str, label: &str, quiet: bool| {
                let mut options = HashMap::from([("label".to_string(), Value::from(label))]);
                if quiet {
                    options.insert("isQuiet".into(), true.into());
                }
                if c == "action-button" {
                    options.insert("hideLabel".into(), false.into());
                }
                design_data_core::visual::SlotFill {
                    component: c.to_string(),
                    options,
                }
            };
            HashMap::from([(
                "default".to_string(),
                vec![
                    fill("action-button", "Edit", false),
                    fill("action-button", "Share", true),
                    fill("link", "Learn more", false),
                ],
            )])
        };
        for (_, r) in out.iter_mut() {
            r.slots = fills();
        }
        for (id, opts, scheme, scale) in [
            (
                "placement-bottom",
                vec![("placement", Value::from("bottom"))],
                "light",
                "desktop",
            ),
            (
                "placement-left-dark",
                vec![("placement", "left".into())],
                "dark",
                "desktop",
            ),
            (
                "placement-right-mobile",
                vec![("placement", "right start".into())],
                "light",
                "mobile",
            ),
            (
                "hide-tip",
                vec![("hideTip", true.into())],
                "light",
                "desktop",
            ),
            (
                "sized",
                vec![("width", 240.into()), ("height", 120.into())],
                "light",
                "desktop",
            ),
        ] {
            let mut r = req(
                vec![],
                opts.into_iter().map(|(k, v)| (k.to_string(), v)).collect(),
                scheme,
                scale,
            );
            r.slots = fills();
            out.push((id, r));
        }
    }
    // Contextual help draws its popover only while open, so every scenario opens it with real
    // copy; "closed" draws the button alone.
    if name == "contextual-help" {
        let copy = |r: &mut RenderRequest| {
            r.options
                .insert("title".into(), "Permission required".into());
            r.options.insert(
                "description".into(),
                "Your admin must grant you permission to view this item. Ask them to update your role."
                    .into(),
            );
            r.options
                .insert("href".into(), "https://example.com/permissions".into());
        };
        for (_, r) in out.iter_mut() {
            copy(r);
            r.states = vec!["open".into()];
        }
        let mut closed = req(vec![], HashMap::new(), "light", "desktop");
        copy(&mut closed);
        out.push(("closed", closed));
        let mut no_link = req(vec!["open".into()], HashMap::new(), "light", "desktop");
        copy(&mut no_link);
        no_link.options.remove("href");
        out.push(("no-link", no_link));
    }
    // Coach mark: real copy and two footer buttons in every scenario; the long copy wraps.
    if name == "coach-mark" {
        let fills = |skip: &str| {
            let fill =
                |label: &str, variant: &str, style: &str| design_data_core::visual::SlotFill {
                    component: "button".to_string(),
                    options: HashMap::from([
                        ("label".to_string(), Value::from(label)),
                        ("variant".to_string(), Value::from(variant)),
                        ("style".to_string(), Value::from(style)),
                    ]),
                };
            HashMap::from([(
                "button-group".to_string(),
                vec![
                    fill(skip, "secondary", "outline"),
                    fill("Next", "primary", "fill"),
                ],
            )])
        };
        let copy = |r: &mut RenderRequest, long: bool| {
            r.options
                .insert("title".into(), "Welcome to the editor".into());
            r.options.insert(
                "description".into(),
                if long {
                    "Use the toolbar to add shapes, text and images to your canvas. Drag any element to move it, and use the handles to resize it."
                } else {
                    "Use the toolbar to add shapes, text and images to your canvas."
                }
                .into(),
            );
            r.slots = fills(if long { "Skip" } else { "Skip tour" });
        };
        for (_, r) in out.iter_mut() {
            copy(r, false);
        }
        let mut long = req(vec![], HashMap::new(), "dark", "mobile");
        copy(&mut long, true);
        out.push(("long-copy-mobile-dark", long));
    }
    // Illustrated message: real copy and two actions in every scenario; the cases cover the
    // sizes, the horizontal width, wrapped copy on mobile and a message without actions. The
    // illustration has no size record yet (qkj5.243), so its placeholder is not drawn.
    if name == "illustrated-message" {
        let fills = || {
            let fill = |label: &str, variant: &str, style: &str| SlotFill {
                component: "button".to_string(),
                options: HashMap::from([
                    ("label".to_string(), Value::from(label)),
                    ("variant".to_string(), Value::from(variant)),
                    ("style".to_string(), Value::from(style)),
                ]),
            };
            HashMap::from([(
                "button-group".to_string(),
                vec![
                    fill("Clear filters", "secondary", "outline"),
                    fill("Retry", "accent", "fill"),
                ],
            )])
        };
        let copy = |r: &mut RenderRequest, long: bool| {
            r.options.insert("title".into(), "No results found".into());
            r.options.insert(
                "description".into(),
                if long {
                    "Try a different search term, or remove some of the filters you applied to see more of the items in this list."
                } else {
                    "Try a different search term or remove some of the filters."
                }
                .into(),
            );
            r.slots = fills();
        };
        for (_, r) in out.iter_mut() {
            copy(r, false);
        }
        for (label, size) in [("size-s", "s"), ("size-l", "l")] {
            let mut r = req(vec![], HashMap::new(), "light", "desktop");
            copy(&mut r, false);
            r.size = size.into();
            out.push((label, r));
        }
        let mut horizontal = req(
            vec![],
            HashMap::from([("orientation".to_string(), Value::from("horizontal"))]),
            "light",
            "desktop",
        );
        copy(&mut horizontal, false);
        out.push(("horizontal", horizontal));
        let mut long = req(vec![], HashMap::new(), "dark", "mobile");
        copy(&mut long, true);
        out.push(("long-copy-mobile-dark", long));
        let mut bare = req(vec![], HashMap::new(), "light", "desktop");
        copy(&mut bare, false);
        bare.slots = HashMap::new();
        out.push(("no-actions", bare));
    }
    // Segmented fields: every scenario carries the segments the request supplies (a value, a
    // separator, an empty segment with its format text), because the recipe draws nothing
    // else. Every entry sets both flags: a request option such as `isLiteral` in the all-on
    // scenario applies to each entry that does not. The cases cover every size, every state,
    // the error and disabled looks, text options, an all-empty field and the dark and
    // wireframe modes.
    if matches!(name, "date-field" | "time-field" | "segmented-text-field") {
        let seg = |label: &str, placeholder: bool, literal: bool| serde_json::json!({ "label": label, "isPlaceholder": placeholder, "isLiteral": literal });
        let filled = if name == "time-field" {
            serde_json::json!([
                seg("10", false, false),
                seg(":", false, true),
                seg("30", false, false),
                seg("AM", false, false)
            ])
        } else {
            serde_json::json!([
                seg("11", false, false),
                seg("/", false, true),
                seg("27", false, false),
                seg("/", false, true),
                seg("2026", false, false)
            ])
        };
        let empty = if name == "time-field" {
            serde_json::json!([
                seg("hh", true, false),
                seg(":", false, true),
                seg("mm", true, false),
                seg("AM", true, false)
            ])
        } else {
            serde_json::json!([
                seg("mm", true, false),
                seg("/", false, true),
                seg("dd", true, false),
                seg("/", false, true),
                seg("yyyy", true, false)
            ])
        };
        for (_, r) in out.iter_mut() {
            r.options.insert("segments".into(), filled.clone());
        }
        let with = |states: &[&str],
                    opts: &[(&str, Value)],
                    segments: &Value,
                    size: &str,
                    scheme: &str,
                    scale: &str| {
            let mut r = req(
                states.iter().map(|s| s.to_string()).collect(),
                opts.iter()
                    .map(|(k, v)| (k.to_string(), v.clone()))
                    .collect(),
                scheme,
                scale,
            );
            r.options.insert("segments".into(), segments.clone());
            r.size = size.into();
            r
        };
        out.push(("empty", with(&[], &[], &empty, "m", "light", "desktop")));
        for (id, sz) in [("size-s", "s"), ("size-l", "l"), ("size-xl", "xl")] {
            out.push((id, with(&[], &[], &filled, sz, "light", "desktop")));
        }
        out.push((
            "size-xl-mobile-dark",
            with(&[], &[], &filled, "xl", "dark", "mobile"),
        ));
        if name != "segmented-text-field" {
            for (id, st) in [
                ("state-hover", "hover"),
                ("state-focus", "focus"),
                ("state-keyboard-focus", "keyboard-focus"),
            ] {
                out.push((id, with(&[st], &[], &filled, "m", "light", "desktop")));
            }
            out.push((
                "state-focus-hover",
                with(&["focus", "hover"], &[], &filled, "m", "light", "desktop"),
            ));
            out.push((
                "error",
                with(
                    &[],
                    &[("isError", true.into())],
                    &filled,
                    "m",
                    "light",
                    "desktop",
                ),
            ));
            out.push((
                "error-focus",
                with(
                    &["focus"],
                    &[("isError", true.into())],
                    &filled,
                    "m",
                    "light",
                    "desktop",
                ),
            ));
            out.push((
                "label-and-help-text",
                with(
                    &[],
                    &[
                        ("label", "Appointment".into()),
                        ("helpText", "Pick a day this month.".into()),
                        ("isRequired", true.into()),
                    ],
                    &filled,
                    "m",
                    "light",
                    "desktop",
                ),
            ));
            out.push((
                "error-help-text-dark",
                with(
                    &[],
                    &[
                        ("label", "Appointment".into()),
                        ("helpText", "Choose a later date.".into()),
                        ("isError", true.into()),
                    ],
                    &filled,
                    "m",
                    "dark",
                    "desktop",
                ),
            ));
        }
        out.push((
            "disabled",
            with(
                &[],
                &[("isDisabled", true.into())],
                &filled,
                "m",
                "light",
                "desktop",
            ),
        ));
        out.push((
            "disabled-empty",
            with(
                &[],
                &[("isDisabled", true.into())],
                &empty,
                "m",
                "light",
                "desktop",
            ),
        ));
    }
    // Group recipes draw only their slot fills: three items at the default size, and a small
    // vertical one (compact for the action group), so the gap bindings show.
    if let Some(item) = match name {
        "button-group" => Some("button"),
        "action-group" => Some("action-button"),
        "swatch-group" => Some("swatch"),
        "checkbox-group" => Some("checkbox"),
        "radio-group" => Some("radio-button"),
        _ => None,
    } {
        let fills = || {
            HashMap::from([(
                "default".to_string(),
                (0..3)
                    .map(|_| design_data_core::visual::SlotFill {
                        component: item.to_string(),
                        ..Default::default()
                    })
                    .collect::<Vec<_>>(),
            )])
        };
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.slots = fills();
        out.push(("fills", r));
        let (key, val) = match name {
            "swatch-group" => ("density", "spacious"),
            "action-group" => ("density", "compact"),
            _ => ("orientation", "horizontal"),
        };
        let mut opts = HashMap::from([(key.to_string(), Value::from(val))]);
        if matches!(name, "button-group" | "action-group") {
            opts.insert("orientation".into(), "vertical".into());
        }
        let mut r = req(vec![], opts, "dark", "mobile");
        if name != "checkbox-group" {
            // checkbox-group has no size option and one sizeScale entry.
            r.size = "s".into();
        }
        r.slots = fills();
        out.push(("fills-s-variant", r));
        // Labeled fills in different states (selected, disabled), as the explorer's demo
        // content and a real host would send them.
        let mixed: Vec<(&str, Value)> = match item {
            "button" => vec![("variant", "accent".into()), ("style", "outline".into())],
            "swatch" => vec![("preview", "#9197fe".into()), ("isSelected", true.into())],
            _ => vec![("isSelected", true.into())],
        };
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.slots = HashMap::from([(
            "default".to_string(),
            (0..3)
                .map(|i| design_data_core::visual::SlotFill {
                    component: item.to_string(),
                    options: match i {
                        0 => mixed
                            .iter()
                            .map(|(k, v)| (k.to_string(), v.clone()))
                            .collect(),
                        2 => HashMap::from([("isDisabled".to_string(), Value::Bool(true))]),
                        _ => HashMap::new(),
                    }
                    .into_iter()
                    .chain([(
                        "label".to_string(),
                        Value::from(format!("Option {}", i + 1)),
                    )])
                    .collect(),
                })
                .collect(),
        )]);
        out.push(("fills-mixed", r));
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
    // Meter: variants set the fill color through relationships, and a static color must win over
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
    // the variant color, so the icon and text are both grey.
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
                "invalid",
                "m",
                vec![],
                vec![("isError", true.into()), ("isRequired", true.into())],
                "light",
                "desktop",
            ),
            (
                "invalid-hover-dark",
                "m",
                vec!["hover"],
                vec![("isError", true.into())],
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
    // Combo box: the defaults draw an empty field (no value, label or description set). These
    // fill it in: a label, a value and help text at each size, the hover and keyboard-focus
    // borders, the invalid and disabled borders and the dark mobile scheme.
    if name == "combo-box" {
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
            ("description", "Help text".into()),
        ];
        let cases: Vec<Case> = vec![
            ("filled-s", "s", vec![], vec![], "light", "desktop"),
            ("filled-m", "m", vec![], vec![], "light", "desktop"),
            ("filled-l", "l", vec![], vec![], "light", "desktop"),
            ("filled-xl", "xl", vec![], vec![], "light", "desktop"),
            (
                "width-300",
                "m",
                vec![],
                vec![("width", 300.into())],
                "light",
                "desktop",
            ),
            (
                "required-icon",
                "m",
                vec![],
                vec![("isRequired", true.into())],
                "light",
                "desktop",
            ),
            (
                "hover",
                "m",
                vec!["hover-text-area"],
                vec![],
                "light",
                "desktop",
            ),
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
                "invalid",
                "m",
                vec![],
                vec![("isError", true.into()), ("isRequired", true.into())],
                "light",
                "desktop",
            ),
            (
                "invalid-hover-dark",
                "m",
                vec!["hover-text-area"],
                vec![("isError", true.into())],
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
            ("dark-mobile-xl", "xl", vec![], vec![], "dark", "mobile"),
            (
                "focus-hover",
                "m",
                vec!["focus-hover"],
                vec![],
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
    // Picker: the defaults draw an empty field (no label, value, placeholder or description are
    // set). These fill it in at each size, with the placeholder, the hover and keyboard-focus
    // states, the invalid border, the disabled look and the dark mobile scheme.
    if name == "picker" {
        type Case = (
            &'static str,
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
        let filled: [(&str, Value); 3] = [
            ("label", "Label".into()),
            ("value", "Selected".into()),
            ("description", "Help text".into()),
        ];
        let placeholder =
            || -> Vec<(&'static str, Value)> { vec![("placeholder", "Select an option".into())] };
        let cases: Vec<Case> = vec![
            ("filled-s", "s", vec![], vec![], "light", "desktop"),
            ("filled-m", "m", vec![], vec![], "light", "desktop"),
            ("filled-l", "l", vec![], vec![], "light", "desktop"),
            ("filled-xl", "xl", vec![], vec![], "light", "desktop"),
            (
                "placeholder",
                "m",
                vec![],
                placeholder(),
                "light",
                "desktop",
            ),
            ("hover", "m", vec!["hover"], vec![], "light", "desktop"),
            ("hover-dark", "m", vec!["hover"], vec![], "dark", "desktop"),
            ("down", "m", vec!["down"], vec![], "light", "desktop"),
            ("down-dark", "m", vec!["down"], vec![], "dark", "desktop"),
            (
                "keyboard-focus",
                "m",
                vec!["keyboard-focus"],
                vec![],
                "light",
                "desktop",
            ),
            (
                "invalid",
                "m",
                vec![],
                vec![("isError", true.into()), ("isRequired", true.into())],
                "light",
                "desktop",
            ),
            (
                "invalid-placeholder-dark",
                "m",
                vec![],
                [placeholder(), vec![("isError", true.into())]].concat(),
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
            ("dark-mobile-xl", "xl", vec![], vec![], "dark", "mobile"),
        ];
        for (label, size, states, extra, scheme, scale) in cases {
            let mut opts: HashMap<String, Value> = filled
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect();
            opts.extend(extra.iter().map(|(k, v)| (k.to_string(), v.clone())));
            // The placeholder shows only while no value is set.
            if extra.iter().any(|(k, _)| *k == "placeholder") {
                opts.remove("value");
            }
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
    // Dialogs draw their copy and actions from the request: every golden carries a title, a
    // description and buttons (an empty dialog hides the gap and slot bindings), then these
    // cover each variant, size, button count, a hidden close button, mobile and a wrapped title.
    if matches!(name, "alert-dialog" | "standard-dialog") {
        let buttons =
            |labels: &[&str]| -> HashMap<String, Vec<design_data_core::visual::SlotFill>> {
                HashMap::from([(
                    "button-group".to_string(),
                    labels
                        .iter()
                        .map(|l| design_data_core::visual::SlotFill {
                            component: "button".into(),
                            options: {
                                let (variant, style) = match *l {
                                    "Cancel" => ("secondary", "outline"),
                                    "Secondary" => ("secondary", "fill"),
                                    _ => ("negative", "fill"),
                                };
                                HashMap::from([
                                    ("label".to_string(), Value::from(*l)),
                                    ("variant".to_string(), Value::from(variant)),
                                    ("style".to_string(), Value::from(style)),
                                ])
                            },
                        })
                        .collect(),
                )])
            };
        let copy = |r: &mut RenderRequest, title: &str| {
            r.options.insert("title".into(), title.into());
            r.options.insert(
                "description".into(),
                "Changes you made will be lost. This action cannot be undone.".into(),
            );
            r.slots = buttons(&["Cancel", "Delete"]);
        };
        for (_, r) in out.iter_mut() {
            copy(r, "Delete project");
        }
        let size = out[0].1.size.clone();
        let mut case = |label: &'static str,
                        opts: &[(&str, Value)],
                        size: &str,
                        scheme: &str,
                        scale: &str,
                        labels: &[&str],
                        title: &str| {
            let mut r = req(vec![], HashMap::new(), scheme, scale);
            for (k, v) in opts {
                r.options.insert(k.to_string(), v.clone());
            }
            copy(&mut r, title);
            r.size = size.into();
            r.slots = buttons(labels);
            out.push((label, r));
        };
        if name == "alert-dialog" {
            for v in [
                "confirmation",
                "information",
                "warning",
                "destructive",
                "error",
            ] {
                let (scheme, scale) = if v == "error" {
                    ("dark", "mobile")
                } else {
                    ("light", "desktop")
                };
                let label: &'static str = match v {
                    "confirmation" => "variant-confirmation",
                    "information" => "variant-information",
                    "warning" => "variant-warning",
                    "destructive" => "variant-destructive",
                    _ => "variant-error-dark-mobile",
                };
                case(
                    label,
                    &[("variant", v.into())],
                    &size,
                    scheme,
                    scale,
                    &["Cancel", "Secondary", "Delete"],
                    "Delete project",
                );
            }
            case(
                "one-button",
                &[("variant", "information".into())],
                &size,
                "light",
                "desktop",
                &["OK"],
                "Update available",
            );
        } else {
            for s in ["s", "m", "l"] {
                let label: &'static str = match s {
                    "s" => "size-s",
                    "m" => "size-m",
                    _ => "size-l",
                };
                case(
                    label,
                    &[],
                    s,
                    "light",
                    "desktop",
                    &["Cancel", "Secondary", "Delete"],
                    "Delete project",
                );
            }
            case(
                "mobile-wireframe",
                &[],
                &size,
                "wireframe",
                "mobile",
                &["Cancel", "Delete"],
                "Delete project",
            );
            let mut r = req(vec![], HashMap::new(), "light", "desktop");
            copy(&mut r, "Delete project");
            r.slots.insert(
                "footer-content".into(),
                vec![design_data_core::visual::SlotFill {
                    component: "checkbox".into(),
                    options: HashMap::from([("label".to_string(), Value::from("Don't ask again"))]),
                }],
            );
            out.push(("footer-checkbox", r));
        }
    }
    // Takeover dialog: every golden carries a title and buttons (an empty dialog hides the
    // slot bindings). These cover each variant, the button count, the header and body slots filled
    // with a steplist and fields, the dark scheme and the mobile wireframe.
    if name == "takeover-dialog" {
        let fill =
            |component: &str, options: &[(&str, Value)]| design_data_core::visual::SlotFill {
                component: component.into(),
                options: options
                    .iter()
                    .map(|(k, v)| (k.to_string(), v.clone()))
                    .collect(),
            };
        let buttons = |labels: &[&str]| -> Vec<design_data_core::visual::SlotFill> {
            labels
                .iter()
                .map(|l| {
                    let (variant, style) = match *l {
                        "Cancel" => ("secondary", "outline"),
                        "Back" => ("secondary", "fill"),
                        _ => ("accent", "fill"),
                    };
                    fill(
                        "button",
                        &[
                            ("label", Value::from(*l)),
                            ("variant", Value::from(variant)),
                            ("style", Value::from(style)),
                        ],
                    )
                })
                .collect()
        };
        let steps = serde_json::json!([
            { "label": "Details", "stepState": "completed default" },
            { "label": "Review", "stepState": "current default" },
            { "label": "Done", "stepState": "incomplete default" }
        ]);
        let fields = || {
            vec![
                fill("text-field", &[("label", "Name".into())]),
                fill("text-field", &[("label", "Email".into())]),
            ]
        };
        let copy = |r: &mut RenderRequest, labels: &[&str], full: bool| {
            r.options
                .insert("title".into(), "Create a new project".into());
            r.slots.insert("button-group".into(), buttons(labels));
            r.slots.insert("default".into(), fields());
            r.slots.insert(
                "header-content".into(),
                vec![fill("steplist", &[("items", steps.clone())])],
            );
            if full {
                r.options.insert("variant".into(), "full screen".into());
            }
        };
        for (_, r) in out.iter_mut() {
            copy(r, &["Cancel", "Create"], false);
        }
        let size = out[0].1.size.clone();
        let mut case =
            |label: &'static str, full: bool, scheme: &str, scale: &str, labels: &[&str]| {
                let mut r = req(vec![], HashMap::new(), scheme, scale);
                copy(&mut r, labels, full);
                r.size = size.clone();
                out.push((label, r));
            };
        case(
            "variant-dialog",
            false,
            "light",
            "desktop",
            &["Cancel", "Create"],
        );
        case(
            "variant-full-screen",
            true,
            "light",
            "desktop",
            &["Cancel", "Create"],
        );
        case(
            "variant-full-screen-dark",
            true,
            "dark",
            "desktop",
            &["Cancel", "Create"],
        );
        case("one-button", false, "light", "desktop", &["Create"]);
        case(
            "three-buttons",
            false,
            "light",
            "desktop",
            &["Cancel", "Back", "Create"],
        );
        case("dark", false, "dark", "desktop", &["Cancel", "Create"]);
        case(
            "mobile-wireframe",
            false,
            "wireframe",
            "mobile",
            &["Cancel", "Create"],
        );
    }
    // Message family (in-line alert, alert banner, toast): the defaults draw an empty message,
    // so these set the copy and cover each variant, the in-line alert styles, a dismissible
    // banner, the dark and wireframe schemes, the mobile scale and a wrapped message.
    // The wrapped-label corner radius is its own state; the all-on golden keeps the default one.
    if name == "button" {
        for (_, r) in out.iter_mut() {
            r.options.insert("isLabelWrapped".into(), false.into());
        }
    }
    if matches!(name, "in-line-alert" | "alert-banner" | "toast") {
        type Case = (
            &'static str,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
            Option<f64>,
        );
        let copy = |text: &'static str| -> Vec<(&'static str, Value)> {
            if name == "in-line-alert" {
                vec![("heading", "Heading".into())]
            } else {
                vec![("text", text.into())]
            }
        };
        let with = |variant: &'static str, style: Option<&'static str>| {
            let mut v = copy("Your changes were saved");
            v.push(("variant", variant.into()));
            if let Some(s) = style {
                v.push(("style", s.into()));
            }
            if name == "alert-banner" {
                v.push(("isDismissible", true.into()));
            }
            v
        };
        // The all-on golden picks each option's last value, and the accent variant (the last of
        // the in-line alert and the banner) has no records, so it would draw no fill. Use the
        // last variant that has one.
        for (label, r) in out.iter_mut() {
            if *label == "all-on-dark-mobile" {
                r.options.insert("variant".into(), "negative".into());
            }
        }
        let long = "Your changes could not be saved because the connection to the server was lost";
        let cases: Vec<Case> = match name {
            "in-line-alert" => vec![
                (
                    "outline-neutral",
                    with("neutral", Some("outline")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "outline-informative",
                    with("informative", Some("outline")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "outline-positive",
                    with("positive", Some("outline")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "outline-notice",
                    with("notice", Some("outline")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "outline-negative",
                    with("negative", Some("outline")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "subtle-neutral",
                    with("neutral", Some("subtle")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "subtle-informative",
                    with("informative", Some("subtle")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "subtle-positive",
                    with("positive", Some("subtle")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "subtle-notice",
                    with("notice", Some("subtle")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "subtle-negative",
                    with("negative", Some("subtle")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "bold-neutral",
                    with("neutral", Some("bold")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "bold-informative",
                    with("informative", Some("bold")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "bold-positive",
                    with("positive", Some("bold")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "bold-notice",
                    with("notice", Some("bold")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "bold-negative",
                    with("negative", Some("bold")),
                    "light",
                    "desktop",
                    None,
                ),
                (
                    "outline-negative-dark",
                    with("negative", Some("outline")),
                    "dark",
                    "desktop",
                    None,
                ),
                (
                    "subtle-notice-dark",
                    with("notice", Some("subtle")),
                    "dark",
                    "desktop",
                    None,
                ),
                (
                    "bold-notice-dark",
                    with("notice", Some("bold")),
                    "dark",
                    "desktop",
                    None,
                ),
                (
                    "bold-informative-wireframe",
                    with("informative", Some("bold")),
                    "wireframe",
                    "desktop",
                    None,
                ),
                (
                    "outline-informative-mobile",
                    with("informative", Some("outline")),
                    "light",
                    "mobile",
                    None,
                ),
                (
                    "wrapped",
                    with("negative", Some("outline")),
                    "light",
                    "desktop",
                    Some(280.0),
                ),
            ],
            "alert-banner" => vec![
                ("neutral", with("neutral", None), "light", "desktop", None),
                (
                    "informative",
                    with("informative", None),
                    "light",
                    "desktop",
                    None,
                ),
                ("negative", with("negative", None), "light", "desktop", None),
                (
                    "negative-dark",
                    with("negative", None),
                    "dark",
                    "desktop",
                    None,
                ),
                (
                    "informative-wireframe",
                    with("informative", None),
                    "wireframe",
                    "desktop",
                    None,
                ),
                (
                    "neutral-mobile",
                    with("neutral", None),
                    "light",
                    "mobile",
                    None,
                ),
                (
                    "wrapped-mobile",
                    {
                        let mut v = with("negative", None);
                        v.retain(|(k, _)| *k != "text");
                        v.push(("text", long.into()));
                        v
                    },
                    "light",
                    "mobile",
                    Some(390.0),
                ),
                (
                    "not-dismissible",
                    {
                        let mut v = with("informative", None);
                        v.retain(|(k, _)| *k != "isDismissible");
                        v
                    },
                    "light",
                    "desktop",
                    None,
                ),
            ],
            _ => vec![
                ("neutral", with("neutral", None), "light", "desktop", None),
                (
                    "informative",
                    with("informative", None),
                    "light",
                    "desktop",
                    None,
                ),
                ("positive", with("positive", None), "light", "desktop", None),
                ("negative", with("negative", None), "light", "desktop", None),
                (
                    "negative-dark",
                    with("negative", None),
                    "dark",
                    "desktop",
                    None,
                ),
                (
                    "positive-wireframe",
                    with("positive", None),
                    "wireframe",
                    "desktop",
                    None,
                ),
                (
                    "informative-mobile",
                    with("informative", None),
                    "light",
                    "mobile",
                    None,
                ),
                (
                    "wrapped",
                    {
                        let mut v = with("negative", None);
                        v.retain(|(k, _)| *k != "text");
                        v.push(("text", long.into()));
                        v
                    },
                    "light",
                    "desktop",
                    Some(320.0),
                ),
            ],
        };
        for (label, opts, scheme, scale, width) in cases {
            let opts: HashMap<String, Value> =
                opts.into_iter().map(|(k, v)| (k.to_string(), v)).collect();
            let mut r = req(vec![], opts, scheme, scale);
            r.label = if label == "wrapped" {
                long.into()
            } else {
                "Review the highlighted fields and try again".into()
            };
            r.width = width;
            out.push((label, r));
        }
    }
    // Tag: the defaults draw a bare label. These show the removable tag at each size, a
    // leading icon and avatar, the selected and emphasized looks, the hover, down and
    // keyboard-focus looks, the disabled tag and the dark mobile scheme.
    if name == "tag" {
        type Case = (
            &'static str,
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
        let removable: (&str, Value) = ("isRemovable", true.into());
        let selected: (&str, Value) = ("isSelected", true.into());
        let emphasized: (&str, Value) = ("isEmphasized", true.into());
        let disabled: (&str, Value) = ("isDisabled", true.into());
        let cases: Vec<Case> = vec![
            (
                "removable-s",
                "s",
                vec![],
                vec![removable.clone()],
                "light",
                "desktop",
            ),
            (
                "removable-m",
                "m",
                vec![],
                vec![removable.clone()],
                "light",
                "desktop",
            ),
            (
                "removable-l",
                "l",
                vec![],
                vec![removable.clone()],
                "light",
                "desktop",
            ),
            (
                "icon",
                "m",
                vec![],
                vec![("icon", true.into()), removable.clone()],
                "light",
                "desktop",
            ),
            (
                "avatar",
                "m",
                vec![],
                vec![("hasAvatar", true.into()), removable.clone()],
                "light",
                "desktop",
            ),
            (
                "hover",
                "m",
                vec!["hover"],
                vec![removable.clone()],
                "light",
                "desktop",
            ),
            (
                "down",
                "m",
                vec!["down"],
                vec![removable.clone()],
                "light",
                "desktop",
            ),
            (
                "keyboard-focus",
                "m",
                vec!["keyboard-focus"],
                vec![removable.clone()],
                "light",
                "desktop",
            ),
            (
                "selected",
                "m",
                vec![],
                vec![selected.clone(), removable.clone()],
                "light",
                "desktop",
            ),
            (
                "selected-emphasized",
                "m",
                vec![],
                vec![selected.clone(), emphasized.clone(), removable.clone()],
                "light",
                "desktop",
            ),
            (
                "selected-emphasized-hover-dark",
                "m",
                vec!["hover"],
                vec![selected.clone(), emphasized.clone(), removable.clone()],
                "dark",
                "desktop",
            ),
            (
                "selected-keyboard-focus-dark",
                "m",
                vec!["keyboard-focus"],
                vec![selected.clone(), removable.clone()],
                "dark",
                "desktop",
            ),
            (
                "disabled",
                "m",
                vec![],
                vec![disabled.clone(), removable.clone()],
                "light",
                "desktop",
            ),
            (
                "disabled-selected",
                "m",
                vec![],
                vec![disabled.clone(), selected.clone(), removable.clone()],
                "light",
                "desktop",
            ),
            (
                "dark-mobile-l",
                "l",
                vec![],
                vec![("icon", true.into()), selected.clone(), removable.clone()],
                "dark",
                "mobile",
            ),
        ];
        for (label, size, states, extra, scheme, scale) in cases {
            let opts: HashMap<String, Value> = extra
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect();
            let mut r = req(
                states.iter().map(|s| s.to_string()).collect(),
                opts,
                scheme,
                scale,
            );
            r.label = "Tag label".into();
            r.size = size.into();
            out.push((label, r));
        }
    }
    // Status light: the default is the informative dot at size m. These draw the other sizes, the
    // semantic variants (neutral, positive, notice, negative, accent) and a named color in light,
    // plus the dark scheme and the wireframe scheme at the largest size on mobile.
    if name == "status-light" {
        let cases: [(&str, &str, &str, &str, &str); 11] = [
            ("size-s", "s", "informative", "light", "desktop"),
            ("size-l", "l", "informative", "light", "desktop"),
            ("size-xl", "xl", "informative", "light", "desktop"),
            ("neutral", "m", "neutral", "light", "desktop"),
            ("positive", "m", "positive", "light", "desktop"),
            ("notice", "m", "notice", "light", "desktop"),
            ("negative", "m", "negative", "light", "desktop"),
            ("accent", "m", "accent", "light", "desktop"),
            ("celery", "m", "celery", "light", "desktop"),
            ("positive-dark", "m", "positive", "dark", "desktop"),
            (
                "magenta-wireframe-xl-mobile",
                "xl",
                "magenta",
                "wireframe",
                "mobile",
            ),
        ];
        for (label, size, variant, scheme, scale) in cases {
            let mut r = req(
                vec![],
                HashMap::from([("variant".to_string(), Value::String(variant.into()))]),
                scheme,
                scale,
            );
            r.size = size.into();
            out.push((label, r));
        }
    }
    // Search field: the defaults draw an empty field with the search icon. These fill it in at each
    // size (the width relationship sizes it; `width-300` sets the width option), with the
    // placeholder, the hover and keyboard-focus borders, the disabled look and the dark mobile
    // scheme.
    if name == "search-field" {
        type Case = (
            &'static str,
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
        let filled: [(&str, Value); 3] = [
            ("label", "Search".into()),
            ("value", "Hello".into()),
            ("helpText", "Help text".into()),
        ];
        let cases: Vec<Case> = vec![
            (
                "width-300",
                "m",
                vec![],
                vec![("width", 300.into())],
                "light",
                "desktop",
            ),
            ("filled-s", "s", vec![], vec![], "light", "desktop"),
            ("filled-m", "m", vec![], vec![], "light", "desktop"),
            ("filled-l", "l", vec![], vec![], "light", "desktop"),
            ("filled-xl", "xl", vec![], vec![], "light", "desktop"),
            (
                "placeholder",
                "m",
                vec![],
                vec![("placeholder", "Search".into())],
                "light",
                "desktop",
            ),
            ("hover", "m", vec!["hover"], vec![], "light", "desktop"),
            ("hover-dark", "m", vec!["hover"], vec![], "dark", "desktop"),
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
                "disabled-dark",
                "m",
                vec![],
                vec![("isDisabled", true.into())],
                "dark",
                "desktop",
            ),
            ("dark-mobile-xl", "xl", vec![], vec![], "dark", "mobile"),
        ];
        for (label, size, states, extra, scheme, scale) in cases {
            let mut opts: HashMap<String, Value> = filled
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect();
            opts.extend(extra.iter().map(|(k, v)| (k.to_string(), v.clone())));
            // The placeholder shows only while no value is set.
            if extra.iter().any(|(k, _)| *k == "placeholder") {
                opts.remove("value");
            }
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
    // Number field: it has no `value` option, so the value text is the request label; the goldens
    // set it to 42 and the field label option to Quantity. The defaults show the value "Label".
    if name == "number-field" {
        type Case = (
            &'static str,
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
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
                "invalid",
                "m",
                vec![],
                vec![("isError", true.into()), ("isRequired", true.into())],
                "light",
                "desktop",
            ),
            (
                "invalid-hover-dark",
                "m",
                vec!["hover"],
                vec![("isError", true.into())],
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
            ("dark-mobile-xl", "xl", vec![], vec![], "dark", "mobile"),
        ];
        for (label, size, states, extra, scheme, scale) in cases {
            let mut opts: HashMap<String, Value> =
                HashMap::from([("label".to_string(), Value::String("Quantity".into()))]);
            opts.extend(extra.iter().map(|(k, v)| (k.to_string(), v.clone())));
            let mut r = req(
                states.iter().map(|s| s.to_string()).collect(),
                opts,
                scheme,
                scale,
            );
            r.size = size.into();
            r.label = "42".into();
            out.push((label, r));
        }
    }
    // Text area: the defaults draw an empty field (no value, label or help text are set). These
    // fill it in: a label, a value and help text at each size, the hover and keyboard-focus
    // borders, the invalid and disabled borders, the valid check and the dark mobile scheme.
    if name == "text-area" {
        type Case = (
            &'static str,
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
        let filled: [(&str, Value); 4] = [
            ("label", "Name".into()),
            ("value", "Some text".into()),
            ("helpText", "Help text".into()),
            ("height", 80.into()),
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
                "invalid",
                "m",
                vec![],
                vec![("isError", true.into()), ("isRequired", true.into())],
                "light",
                "desktop",
            ),
            (
                "invalid-hover-dark",
                "m",
                vec!["hover"],
                vec![("isError", true.into())],
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
    // Color handle and color loupe: the defaults carry no color, so these set one (an opaque
    // pink and a half transparent one over the checkerboard) and draw the handle's keyboard-focus
    // size, its disabled and no-fill looks, the dark scheme and the wireframe scheme on mobile.
    if name == "color-handle" || name == "color-loupe" {
        let opaque = || Value::String("#e0457b".into());
        let clear = || Value::String("#e0457b80".into());
        type Case = (
            &'static str,
            Vec<&'static str>,
            Vec<(&'static str, Value)>,
            &'static str,
            &'static str,
        );
        let mut cases: Vec<Case> = vec![
            (
                "color",
                vec![],
                vec![("color", opaque())],
                "light",
                "desktop",
            ),
            (
                "transparent",
                vec![],
                vec![("color", clear())],
                "light",
                "desktop",
            ),
            (
                "transparent-dark-mobile",
                vec![],
                vec![("color", clear())],
                "dark",
                "mobile",
            ),
            (
                "wireframe-mobile",
                vec![],
                vec![("color", opaque())],
                "wireframe",
                "mobile",
            ),
            (
                "no-fill",
                vec![],
                vec![("color", opaque()), ("hasFill", false.into())],
                "light",
                "desktop",
            ),
        ];
        if name == "color-handle" {
            cases.extend([
                (
                    "keyboard-focus",
                    vec!["keyboard-focus"],
                    vec![("color", opaque())],
                    "light",
                    "desktop",
                ),
                (
                    "keyboard-focus-transparent-dark-mobile",
                    vec!["keyboard-focus"],
                    vec![("color", clear())],
                    "dark",
                    "mobile",
                ),
                (
                    "disabled",
                    vec![],
                    vec![("color", opaque()), ("isDisabled", true.into())],
                    "light",
                    "desktop",
                ),
            ]);
        }
        for (label, states, extra, scheme, scale) in cases {
            out.push((
                label,
                req(
                    states.iter().map(|s| s.to_string()).collect(),
                    extra.into_iter().map(|(k, v)| (k.to_string(), v)).collect(),
                    scheme,
                    scale,
                ),
            ));
        }
    }
    // Color slider and color area: the ramps are computed from the color and the channels, so
    // these set a color and the channels, the handle at several values (start, middle, end,
    // unset), both orientations, disabled, dark and mobile. They pass every option explicitly.
    if name == "color-slider" || name == "color-area" {
        let s = |v: &str| Value::String(v.into());
        type Opts = Vec<(&'static str, Value)>;
        let mut cases: Vec<(&'static str, Opts, &str, &str)> = Vec::new();
        if name == "color-slider" {
            let base = |v: Option<f64>, ch: &str| -> Opts {
                let mut o = vec![
                    ("color", s("#e0457b")),
                    ("channel", s(ch)),
                    ("label", s("Hue")),
                ];
                if let Some(v) = v {
                    o.push(("value", v.into()));
                }
                o
            };
            cases.push(("value-0", base(Some(0.0), "hue"), "light", "desktop"));
            cases.push(("value-50", base(Some(50.0), "hue"), "light", "desktop"));
            cases.push(("value-100", base(Some(100.0), "hue"), "light", "desktop"));
            cases.push(("value-unset", base(None, "hue"), "light", "desktop"));
            cases.push(("alpha", base(Some(50.0), "alpha"), "light", "desktop"));
            cases.push((
                "saturation",
                base(Some(50.0), "saturation"),
                "light",
                "desktop",
            ));
            cases.push((
                "lightness",
                base(Some(50.0), "lightness"),
                "light",
                "desktop",
            ));
            cases.push((
                "brightness",
                base(Some(50.0), "brightness"),
                "light",
                "desktop",
            ));
            let mut o = base(Some(50.0), "red");
            o.push(("colorSpace", s("rgb")));
            cases.push(("rgb-red", o, "light", "desktop"));
            cases.push(("dark-mobile", base(Some(50.0), "hue"), "dark", "mobile"));
            cases.push(("wireframe", base(Some(50.0), "hue"), "wireframe", "desktop"));
            let mut d = base(Some(50.0), "hue");
            d.push(("isDisabled", true.into()));
            cases.push(("disabled", d, "light", "desktop"));
            for (label, v) in [
                ("vertical-0", 0.0),
                ("vertical-50", 50.0),
                ("vertical-100", 100.0),
            ] {
                let mut o = base(Some(v), "hue");
                o.push(("orientation", s("vertical")));
                cases.push((label, o, "light", "desktop"));
            }
            let mut o = base(Some(25.0), "alpha");
            o.push(("orientation", s("vertical")));
            cases.push(("vertical-alpha-dark-mobile", o, "dark", "mobile"));
        } else {
            let base = |x: Option<f64>, y: Option<f64>, sp: &str, xc: &str, yc: &str| -> Opts {
                let mut o = vec![
                    ("color", s("#e0457b")),
                    ("colorSpace", s(sp)),
                    ("xChannel", s(xc)),
                    ("yChannel", s(yc)),
                ];
                if let Some(x) = x {
                    o.push(("x-value", x.into()));
                }
                if let Some(y) = y {
                    o.push(("y-value", y.into()));
                }
                o
            };
            let hsl = |x, y| base(x, y, "hsl", "saturation", "lightness");
            cases.push(("xy-0-0", hsl(Some(0.0), Some(0.0)), "light", "desktop"));
            cases.push(("xy-50-50", hsl(Some(50.0), Some(50.0)), "light", "desktop"));
            cases.push((
                "xy-100-100",
                hsl(Some(100.0), Some(100.0)),
                "light",
                "desktop",
            ));
            cases.push(("xy-75-25", hsl(Some(75.0), Some(25.0)), "light", "desktop"));
            cases.push(("xy-unset", hsl(None, None), "light", "desktop"));
            cases.push(("dark-mobile", hsl(Some(75.0), Some(25.0)), "dark", "mobile"));
            cases.push((
                "wireframe",
                hsl(Some(75.0), Some(25.0)),
                "wireframe",
                "desktop",
            ));
            cases.push((
                "hsb-sat-bright",
                base(Some(75.0), Some(25.0), "hsb", "saturation", "brightness"),
                "light",
                "desktop",
            ));
            cases.push((
                "hsl-hue-light",
                base(Some(75.0), Some(25.0), "hsl", "hue", "lightness"),
                "light",
                "desktop",
            ));
            cases.push((
                "hsb-bright-sat",
                base(Some(25.0), Some(75.0), "hsb", "brightness", "saturation"),
                "light",
                "desktop",
            ));
            cases.push((
                "rgb-plain-fill",
                base(Some(75.0), Some(25.0), "rgb", "red", "green"),
                "light",
                "desktop",
            ));
            let mut d = hsl(Some(75.0), Some(25.0));
            d.push(("isDisabled", true.into()));
            cases.push(("disabled", d, "light", "desktop"));
        }
        for (label, extra, scheme, scale) in cases {
            out.push((
                label,
                req(
                    vec![],
                    extra.into_iter().map(|(k, v)| (k.to_string(), v)).collect(),
                    scheme,
                    scale,
                ),
            ));
        }
    }
    // Close button: the hover fill (gray-200 here), the keyboard-focus ring, and a static color
    // over the dark scheme, where the neutral colors would not show.
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
        // Disabled wins over a state for the static cross color: both records pin two options.
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
    // underlined, and a static color over the dark scheme.
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
    // Image fill: a photo through the `src` option (a 16x16 gradient PNG), clipped to the
    // avatar's circle and the thumbnail's rounded corners, over the stroke and the dim.
    if matches!(name, "avatar" | "thumbnail") {
        let uri = format!(
            "data:image/png;base64,{}",
            include_str!("../src/image_testdata.b64").trim()
        );
        let photo = |extra: &[(&str, Value)]| {
            let mut o = HashMap::from([("src".to_string(), Value::String(uri.clone()))]);
            if name == "avatar" {
                o.insert("image".into(), Value::String("user image".into()));
            } else {
                o.insert("showImage".into(), Value::Bool(true));
            }
            o.extend(extra.iter().map(|(k, v)| (k.to_string(), v.clone())));
            o
        };
        let flag = |k: &'static str| [(k, Value::Bool(true))];
        let stroke = if name == "avatar" {
            "showStroke"
        } else {
            "isDisabled"
        };
        out.push(("photo", req(vec![], photo(&[]), "light", "desktop")));
        out.push((
            "photo-disabled-dark",
            req(vec![], photo(&flag("isDisabled")), "dark", "desktop"),
        ));
        out.push((
            "photo-large-mobile",
            req(vec![], photo(&flag(stroke)), "light", "mobile"),
        ));
        if name == "avatar" {
            // `src` with another style is ignored: the image part is only present for User image.
            out.push((
                "photo-ignored-initials",
                req(
                    vec![],
                    photo(&[("image", Value::String("initials".into()))]),
                    "light",
                    "desktop",
                ),
            ));
        }
        if name == "thumbnail" {
            out.push((
                "photo-hidden",
                req(
                    vec![],
                    photo(&[("showImage", Value::Bool(false))]),
                    "light",
                    "desktop",
                ),
            ));
        }
    }
    // Divider: every size, both orientations, and each static color. The regular fill and the
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
    // Drop zone: real copy in every scenario, a long one wrapped on mobile, and every state and
    // option the recipe reads. The illustration has no size record, so its placeholder is not drawn.
    if name == "drop-zone" {
        let copy = |r: &mut RenderRequest, long: bool| {
            r.options
                .insert("title".into(), "Drag and drop your file".into());
            r.options.insert(
                "description".into(),
                if long {
                    "Or select a file from your computer. Images, PDFs and documents up to 20 MB are accepted, and you can add several at once."
                } else {
                    "Or select a file from your computer"
                }
                .into(),
            );
        };
        for (_, r) in out.iter_mut() {
            copy(r, false);
        }
        let mut long = req(vec![], HashMap::new(), "dark", "mobile");
        copy(&mut long, true);
        out.push(("long-copy-mobile-dark", long));
        for (label, states, opts) in [
            ("drag-and-drop", vec!["drag-and-drop".to_string()], vec![]),
            ("filled", vec![], vec![("isFilled", Value::Bool(true))]),
            ("disabled", vec![], vec![("isDisabled", Value::Bool(true))]),
        ] {
            let mut r = req(states, HashMap::new(), "light", "desktop");
            copy(&mut r, false);
            for (k, v) in opts {
                r.options.insert(k.into(), v);
            }
            out.push((label, r));
        }
    }
    // Select box: a label in every scenario, both orientations, the selected and disabled looks,
    // each interaction state, and the dark mobile horizontal box.
    if name == "select-box" {
        for (_, r) in out.iter_mut() {
            r.label = "Select box label".into();
        }
        let case = |states: Vec<String>, opts: Vec<(&str, Value)>, scheme: &str, scale: &str| {
            let mut r = req(states, HashMap::new(), scheme, scale);
            r.label = "Select box label".into();
            for (k, v) in opts {
                r.options.insert(k.into(), v);
            }
            r
        };
        let horizontal = || ("orientation", Value::from("horizontal"));
        out.push((
            "horizontal",
            case(vec![], vec![horizontal()], "light", "desktop"),
        ));
        out.push((
            "selected",
            case(
                vec![],
                vec![("isSelected", Value::Bool(true))],
                "light",
                "desktop",
            ),
        ));
        out.push((
            "disabled",
            case(
                vec![],
                vec![("isDisabled", Value::Bool(true))],
                "light",
                "desktop",
            ),
        ));
        for state in ["hover", "down", "keyboard-focus"] {
            out.push((
                Box::leak(format!("state-{state}").into_boxed_str()),
                case(vec![state.to_string()], vec![], "light", "desktop"),
            ));
        }
        out.push((
            "horizontal-dark-mobile",
            case(vec![], vec![horizontal()], "dark", "mobile"),
        ));
        out.push((
            "no-illustration",
            case(
                vec![],
                vec![("hideIllustration", Value::Bool(true))],
                "light",
                "desktop",
            ),
        ));
    }
    // Status light wraps its label next to the dot.
    if name == "status-light" {
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.label = "Wrapped label text goes here".into();
        r.width = Some(110.0);
        out.push(("wrapped-label", r));
    }
    // Checkbox, radio button and switch wrap their label too: the control stays on the first line.
    if matches!(name, "checkbox" | "radio-button" | "switch") {
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.label = "Three word label".into();
        r.width = Some(100.0);
        out.push(("wrapped-label-narrow", r));
    }
    // A component whose slots declare a `demo` draws it: the content every host shows.
    let demo = demo_slots(component);
    if !demo.is_empty() {
        let mut r = req(vec![], HashMap::new(), "light", "desktop");
        r.slots = demo;
        out.push(("demo", r));
    }
    out
}

/// Every demo fill is drawn: no diagnostics, and each slot's recipe part holds exactly as many
/// nested items as the slot's `demo` lists, within its `max`.
#[test]
fn demo_slots_draw_every_fill_they_declare() {
    let graph = load_graph();
    let cache = SceneCache::default();
    let mut hosts = 0;
    for (name, recipe, component, req) in std::fs::read_dir(data_dir().join("components"))
        .expect("components dir")
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.path().file_stem()?.to_string_lossy().into_owned();
            let component = read_json(e.path());
            if demo_slots(&component).is_empty() {
                return None;
            }
            let recipe = read_json(data_dir().join(format!("visuals/{name}.json")));
            let (_, req) = requests(&name, &recipe, &component)
                .into_iter()
                .find(|(g, _)| *g == "demo")?;
            Some((name, recipe, component, req))
        })
    {
        hosts += 1;
        let scene = build_scene_cached(&graph, &recipe, &req, &cache).expect("scene");
        assert!(
            scene.diagnostics.is_empty(),
            "{name}: {:?}",
            scene.diagnostics
        );
        for slot in component["slots"].as_array().unwrap() {
            let Some(demo) = slot.get("demo").and_then(Value::as_array) else {
                continue;
            };
            let part = slot["part"].as_str().unwrap();
            let drawn = (1..=demo.len() + 1)
                .filter(|n| {
                    let id = format!("{part}-{n}");
                    scene.nodes.iter().any(|node| node.part == id)
                })
                .count();
            assert_eq!(drawn, demo.len(), "{name}/{}: fills drawn", slot["name"]);
            if let Some(max) = slot.get("max").and_then(Value::as_u64) {
                assert!(drawn as u64 <= max, "{name}/{}: over max", slot["name"]);
            }
        }
    }
    assert_eq!(hosts, 15);
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

/// A recipe that reads `facets` draws what the option form draws. This graph loads the contracts,
/// so the clause resolves; without them it would never match.
#[test]
fn a_facets_clause_draws_the_same_scene_as_the_option_form() {
    let g = load_graph();
    let faceted = g
        .visual_recipe("switch")
        .expect("switch recipe")
        .raw
        .clone();
    let mut recipe = faceted.clone();
    *recipe
        .pointer_mut("/parts/track/props/fill/1/when")
        .expect("track fill rule") = serde_json::json!({ "options": { "isSelected": true } });
    assert_ne!(recipe, faceted);
    let svg = |recipe: &Value, selected: bool| {
        let req = RenderRequest {
            component: "switch".into(),
            size: "m".into(),
            options: HashMap::from([("isSelected".to_string(), Value::Bool(selected))]),
            mode: HashMap::from([
                ("colorScheme".to_string(), "light".to_string()),
                ("scale".to_string(), "desktop".to_string()),
            ]),
            label: "Label".into(),
            ..Default::default()
        };
        let scene = build_scene_cached(&g, recipe, &req, &SceneCache::default()).expect("scene");
        scene_to_svg(&scene)
    };
    assert_eq!(svg(&recipe, true), svg(&faceted, true));
    assert_eq!(svg(&recipe, false), svg(&faceted, false));
    assert_ne!(svg(&faceted, true), svg(&faceted, false));
}
