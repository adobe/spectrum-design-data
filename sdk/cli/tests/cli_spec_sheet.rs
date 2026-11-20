// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data spec-sheet action-button` emits a model that validates against the draft
//! schema, with labelled token rows and a scene (with measurements) per block.

use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::Value;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

#[test]
fn action_button_sheet_matches_the_schema_and_labels_rows_from_data() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "action-button"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let sheet: Value = serde_json::from_slice(&out).expect("sheet is JSON");

    let schema: Value = serde_json::from_str(
        &std::fs::read_to_string(
            repo_root().join("packages/design-data-spec/schemas/component-spec-sheet.schema.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let validator = jsonschema::validator_for(&schema).expect("schema compiles");
    let errors: Vec<String> = validator
        .iter_errors(&sheet)
        .map(|e| format!("{}: {e}", e.instance_path))
        .collect();
    assert!(errors.is_empty(), "{errors:#?}");

    let layout = &sheet["pages"][0];
    assert_eq!(layout["title"], "Layout");
    let height = layout["blocks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|b| b["title"] == "Height")
        .expect("a Height block");
    let items = height["rows"][0]["items"].as_array().unwrap();
    assert_eq!(items.len(), 5);
    assert_eq!(items[0]["label"], "Extra Small");
    assert_eq!(items[0]["marker"], 1);
    assert_eq!(height["render"]["markers"][0]["n"], 1);
    assert_eq!(items[0]["token"]["name"], "base-height-extra-small");
    assert_eq!(items[0]["values"]["desktop"], "20px");
    assert_eq!(items[0]["values"]["mobile"], "25px");
    let scene = &height["render"]["scene"];
    assert!(scene["measurements"]
        .as_array()
        .unwrap()
        .iter()
        .any(|m| m["prop"] == "height"));
    let m = &height["render"]["measurements"][0];
    assert_eq!(m["prop"], "height");
    assert_eq!(m["label"], "base-height-medium");
    assert!(m["relationship"].is_string());
    assert!(height["render"]["view"]["scale"].as_f64().unwrap() > 1.0);

    let icon_only = layout["blocks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|b| b["title"] == "Spacing (start/end edges, icon only)")
        .expect("an icon-only spacing block");
    let labels: Vec<&str> = icon_only["render"]["measurements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|m| m["label"].as_str().unwrap())
        .collect();
    assert_eq!(labels.len(), 2, "{labels:?}");
}

#[test]
fn button_icon_only_block_is_labelled_by_the_icon_only_relationship() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "button"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let sheet: Value = serde_json::from_slice(&out).expect("sheet is JSON");
    let block = |title: &str| {
        sheet["pages"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|p| p["blocks"].as_array().unwrap())
            .find(|b| b["title"] == title)
            .unwrap_or_else(|| panic!("no block {title}"))
            .clone()
    };
    let labels = |b: &Value| -> Vec<String> {
        b["render"]["measurements"]
            .as_array()
            .unwrap()
            .iter()
            .map(|m| m["label"].as_str().unwrap().to_string())
            .collect()
    };
    let icon_only = block("Spacing (start/end edges, icon only)");
    assert_eq!(
        icon_only["render"]["request"]["options"]["isLabelHidden"],
        true
    );
    let l = labels(&icon_only);
    assert_eq!(l.len(), 2, "{l:?}");
    let normal = labels(&block("Spacing (start/end edges)"));
    assert!(l.iter().all(|x| !normal.contains(x)), "{l:?} vs {normal:?}");
}

fn schema_errors(sheet: &Value) -> Vec<String> {
    let schema: Value = serde_json::from_str(
        &std::fs::read_to_string(
            repo_root().join("packages/design-data-spec/schemas/component-spec-sheet.schema.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let validator = jsonschema::validator_for(&schema).expect("schema compiles");
    validator
        .iter_errors(sheet)
        .map(|e| format!("{}: {e}", e.instance_path))
        .collect()
}

#[test]
fn line_height_and_font_family_rows_sit_on_the_typography_page() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "action-button"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let sheet: Value = serde_json::from_slice(&out).unwrap();
    for page in sheet["pages"].as_array().unwrap() {
        let on_typography = page["title"] == "Typography";
        for block in page["blocks"].as_array().unwrap() {
            for row in block["rows"].as_array().unwrap() {
                for item in row["items"].as_array().unwrap() {
                    let prop = item["token"]["property"].as_str().unwrap();
                    if prop.starts_with("font-") || prop.contains("line-height") {
                        assert!(on_typography, "{prop} on {}", page["title"]);
                    }
                }
            }
        }
    }
}

#[test]
fn all_writes_full_and_table_only_sheets_and_an_index() {
    let dir = tempfile::tempdir().unwrap();
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "--all", "--changelog-dir"])
        .arg(repo_root().join("packages/design-data/changelog"))
        .arg("-o")
        .arg(dir.path())
        .assert()
        .success();
    let read = |name: &str| -> Value {
        serde_json::from_str(&std::fs::read_to_string(dir.path().join(name)).unwrap()).unwrap()
    };
    let index = read("index.json");
    let components = index["components"].as_array().unwrap();
    let full = components.iter().filter(|c| c["visual"] == true).count();
    for name in [
        "accordion",
        "action-button",
        "badge",
        "button",
        "checkbox",
        "radio-button",
        "switch",
    ] {
        let entry = components.iter().find(|c| c["component"] == name);
        assert_eq!(
            entry.map(|c| &c["visual"]),
            Some(&Value::Bool(true)),
            "{name}"
        );
    }
    assert!(components.len() > full);
    let entry = components
        .iter()
        .find(|c| c["component"] == "action-button")
        .unwrap();
    assert!(entry["version"].is_string() && entry["latestRelease"]["release"].is_string());

    // A table-only sheet: no visual, no render, still labelled token rows, and schema-valid.
    let stub = components.iter().find(|c| c["visual"] == false).unwrap();
    let sheet = read(stub["sheet"].as_str().unwrap());
    assert_eq!(sheet["visual"], false);
    let blocks: Vec<&Value> = sheet["pages"]
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|p| p["blocks"].as_array().unwrap())
        .collect();
    assert!(!blocks.is_empty());
    assert!(blocks.iter().all(|b| b["render"].is_null()));
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    assert_eq!(
        schema_errors(&read("action-button.json")),
        Vec::<String>::new()
    );
}

fn all_sheets() -> Vec<Value> {
    let dir = tempfile::tempdir().unwrap();
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "--all", "-o"])
        .arg(dir.path())
        .assert()
        .success();
    std::fs::read_dir(dir.path())
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| !p.ends_with("index.json"))
        .map(|p| serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap())
        .collect()
}

fn blocks_of(sheet: &Value) -> Vec<&Value> {
    sheet["pages"]
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|p| p["blocks"].as_array().unwrap())
        .collect()
}

#[test]
fn every_sheet_has_blocks_and_context_less_records_are_grouped_by_property() {
    let sheets = all_sheets();
    for sheet in &sheets {
        assert!(!blocks_of(sheet).is_empty(), "{}", sheet["component"]);
        assert_eq!(schema_errors(sheet), Vec::<String>::new());
    }
    let find = |name: &str| sheets.iter().find(|s| s["component"] == name).unwrap();

    // Typography: heading's records have no context and are grouped by property.
    let heading = blocks_of(find("heading"));
    let weight = heading
        .iter()
        .find(|b| b["title"] == "Font weight")
        .unwrap();
    assert_eq!(weight["titleSource"], "property");
    assert!(weight["records"].as_u64().unwrap() > 10);
    assert_eq!(weight["page"], "Typography");

    // Inline values show as rows with the value and no token.
    let text_area = blocks_of(find("text-area"));
    let min_height = text_area
        .iter()
        .find(|b| b["title"] == "Minimum height" && b["titleSource"] == "property")
        .unwrap();
    let item = &min_height["rows"][0]["items"][0];
    assert_eq!(item["source"], "inline");
    assert!(item["token"]["uuid"].is_null());
    assert_eq!(item["values"]["desktop"], "56px");
    assert_eq!(item["values"]["mobile"], "70px");

    // Authored contexts keep their title and come first on the page.
    assert!(text_area.iter().any(|b| b["titleSource"] == "context"));
}

#[test]
fn switch_layout_blocks_carry_measurements_for_parts_border_focus_ring_and_press() {
    let sheets = all_sheets();
    let switch = sheets.iter().find(|s| s["component"] == "switch").unwrap();
    let kinds = |title: &str| -> Vec<String> {
        let block = blocks_of(switch)
            .into_iter()
            .find(|b| b["page"] == "Layout" && b["title"] == title)
            .unwrap_or_else(|| panic!("no Layout block {title}"));
        let scene = &block["render"]["scene"]["measurements"];
        block["render"]["measurements"]
            .as_array()
            .unwrap()
            .iter()
            .map(|m| {
                let i = m["index"].as_u64().unwrap() as usize;
                assert!(scene[i]["token"]["relationship"]["uuid"].is_string());
                scene[i]["kind"].as_str().unwrap().to_string()
            })
            .collect()
    };
    assert_eq!(kinds("Track (size)"), ["width", "height"]);
    assert_eq!(kinds("Track (border)"), ["border"]);
    assert_eq!(kinds("Focus indicator"), ["focus-thickness", "focus-gap"]);
    assert_eq!(kinds("Component size (down)"), ["press"]);
}

#[test]
fn token_names_come_from_the_structured_name_not_the_relationship_property() {
    let sheets = all_sheets();
    let names = |component: &str, title: &str| -> Vec<String> {
        let sheet = sheets.iter().find(|s| s["component"] == component).unwrap();
        blocks_of(sheet)
            .into_iter()
            .filter(|b| b["page"] == "Layout" && b["title"] == title)
            .flat_map(|b| b["rows"].as_array().unwrap())
            .flat_map(|r| r["items"].as_array().unwrap())
            .map(|i| i["token"]["name"].as_str().unwrap().to_string())
            .collect()
    };
    // anatomy + property, no legacyKey: serialized as focus-indicator-thickness (qkj5.85).
    assert!(names("action-button", "Focus ring").contains(&"focus-indicator-thickness".to_string()));
    let track = names("switch", "Track (size)");
    assert!(
        track.iter().any(|n| n.starts_with("switch-control-")),
        "{track:?}"
    );
}

#[test]
fn sheets_are_reproducible_byte_for_byte() {
    let dir = tempfile::tempdir().unwrap();
    let run = |name: &str| {
        let out = dir.path().join(name);
        Command::cargo_bin("design-data")
            .unwrap()
            .current_dir(repo_root())
            .args(["spec-sheet", "switch", "-o"])
            .arg(&out)
            .assert()
            .success();
        std::fs::read_to_string(out).unwrap()
    };
    assert!(run("a.json") == run("b.json"), "two runs differ");
}

const RECIPE_SHEETS: [&str; 7] = [
    "accordion",
    "action-button",
    "badge",
    "button",
    "checkbox",
    "radio-button",
    "switch",
];

fn sheet_of(component: &str) -> Value {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", component])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    serde_json::from_slice(&out).unwrap()
}

#[test]
fn legend_labels_are_token_names_from_the_same_block_rows() {
    for component in RECIPE_SHEETS {
        let sheet = sheet_of(component);
        for page in sheet["pages"].as_array().unwrap() {
            for block in page["blocks"].as_array().unwrap() {
                let names: Vec<&str> = block["rows"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .flat_map(|r| r["items"].as_array().unwrap())
                    .map(|i| i["token"]["name"].as_str().unwrap())
                    .collect();
                let measurements = block["render"]["measurements"].as_array();
                for m in measurements.into_iter().flatten() {
                    // A derived span names no token; its label says so.
                    if m["derived"] == true {
                        continue;
                    }
                    let label = m["label"].as_str().unwrap();
                    assert!(
                        names.contains(&label),
                        "{component} / {}: legend {label} is not a row token name {names:?}",
                        block["title"]
                    );
                }
            }
        }
    }
}

#[test]
fn undrawn_markers_are_flagged_and_counted() {
    for component in RECIPE_SHEETS {
        let sheet = sheet_of(component);
        assert!(schema_errors(&sheet).is_empty(), "{component}");
        let mut undrawn = 0;
        for page in sheet["pages"].as_array().unwrap() {
            for block in page["blocks"].as_array().unwrap() {
                let markers = block["render"]["markers"].as_array();
                for m in markers.into_iter().flatten() {
                    if m["part"].is_null() {
                        assert_eq!(m["drawn"], false);
                    }
                    if m["drawn"] == false {
                        undrawn += 1;
                    }
                }
            }
        }
        eprintln!("undrawn markers {component}: {undrawn}");
    }
}

#[test]
fn marker_groups_in_a_block_have_distinct_labels_without_the_size_part() {
    for component in RECIPE_SHEETS {
        let sheet = sheet_of(component);
        for page in sheet["pages"].as_array().unwrap() {
            for block in page["blocks"].as_array().unwrap() {
                let markers = block["render"]["markers"].as_array();
                let labels: Vec<&str> = markers
                    .into_iter()
                    .flatten()
                    .map(|m| m["label"].as_str().unwrap())
                    .collect();
                let mut unique = labels.clone();
                unique.sort_unstable();
                unique.dedup();
                assert_eq!(
                    unique.len(),
                    labels.len(),
                    "{component} / {}: {labels:?}",
                    block["title"]
                );
                assert!(
                    labels.iter().all(|l| !l.contains('{')),
                    "{component} / {}: {labels:?}",
                    block["title"]
                );
            }
        }
    }
    let sheet = sheet_of("button");
    let block = sheet["pages"]
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|p| p["blocks"].as_array().unwrap())
        .find(|b| b["title"] == "Spacing (start/end edges)")
        .unwrap();
    let labels: Vec<&str> = block["render"]["markers"]
        .as_array()
        .unwrap()
        .iter()
        .map(|m| m["label"].as_str().unwrap())
        .collect();
    assert_eq!(
        labels,
        [
            "component-pill-edge-to-visual",
            "component-pill-edge-to-text"
        ]
    );
}

#[test]
fn derived_vertical_contexts_show_a_marker_and_a_measurement_labelled_derived() {
    for (component, titles) in [
        (
            "button",
            vec![
                "Spacing (top edge to icon)",
                "Spacing (top/bottom edge to label)",
            ],
        ),
        (
            "checkbox",
            vec![
                "Spacing (top edge to control)",
                "Spacing (top/bottom edge to label)",
            ],
        ),
    ] {
        let out = Command::cargo_bin("design-data")
            .unwrap()
            .current_dir(repo_root())
            .args(["spec-sheet", component])
            .assert()
            .success()
            .get_output()
            .stdout
            .clone();
        let sheet: Value = serde_json::from_slice(&out).expect("sheet is JSON");
        assert_eq!(schema_errors(&sheet), Vec::<String>::new());
        for title in titles {
            let block = blocks_of(&sheet)
                .into_iter()
                .find(|b| b["title"] == title)
                .unwrap_or_else(|| panic!("{component}: no block {title}"));
            let r = &block["render"];
            let markers = r["markers"].as_array().unwrap();
            assert!(!markers.is_empty(), "{component} {title}");
            assert!(markers
                .iter()
                .all(|m| m["derived"] == true && m["drawn"] == true));
            let ms = r["measurements"].as_array().unwrap();
            assert!(!ms.is_empty(), "{component} {title}");
            for m in ms {
                assert_eq!(m["label"], "derived from height");
                let scene = &r["scene"]["measurements"][m["index"].as_u64().unwrap() as usize];
                assert!(scene["h"].as_f64().unwrap() > 0.0);
            }
            assert!(block["notes"][0]
                .as_str()
                .unwrap()
                .starts_with("Derived from height"));
        }
    }
}

/// A `$ref` naming a mode-set group (`setUuid`) resolves like the graph does: the row shows
/// one value per member scale, and every relationship record is counted by exactly one row.
#[test]
fn setuuid_refs_resolve_and_every_record_is_shown() {
    let sheet = sheet_of("contextual-help");
    let desktop_and_mobile = blocks_of(&sheet)
        .iter()
        .flat_map(|b| b["rows"].as_array().unwrap())
        .flat_map(|r| r["items"].as_array().unwrap())
        .any(|i| i["values"].get("desktop").is_some() && i["values"].get("mobile").is_some());
    assert!(desktop_and_mobile, "a setUuid ref shows each member scale");

    let mut expected = std::collections::BTreeMap::<String, usize>::new();
    for e in std::fs::read_dir(repo_root().join("packages/design-data/relationships")).unwrap() {
        let v: Value =
            serde_json::from_str(&std::fs::read_to_string(e.unwrap().path()).unwrap()).unwrap();
        for r in v.as_array().unwrap() {
            if let Some(c) = r["scope"]["component"].as_str() {
                *expected.entry(c.to_string()).or_default() += 1;
            }
        }
    }
    for sheet in all_sheets() {
        let c = sheet["component"].as_str().unwrap();
        let records: u64 = blocks_of(&sheet)
            .iter()
            .map(|b| b["records"].as_u64().unwrap())
            .sum();
        assert_eq!(Some(&(records as usize)), expected.get(c), "{c}");
    }
}

#[test]
fn svg_flag_adds_a_rendered_svg_to_each_visual_and_nothing_else() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "button", "--svg"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let mut with_svg: Value = serde_json::from_slice(&out).unwrap();
    assert_eq!(schema_errors(&with_svg), Vec::<String>::new());
    let mut rendered = 0;
    for page in with_svg["pages"].as_array_mut().unwrap() {
        for block in page["blocks"].as_array_mut().unwrap() {
            let Some(render) = block["render"].as_object_mut() else {
                continue;
            };
            let svg = render.remove("svg").expect("render.svg with --svg");
            let svg = svg.as_str().unwrap();
            assert!(svg.starts_with("<svg") && svg.trim_end().ends_with("</svg>"));
            rendered += 1;
        }
    }
    assert!(rendered > 0);
    // Without the svg strings, --svg output is the default sheet.
    assert_eq!(with_svg, sheet_of("button"));
}

#[test]
fn a_context_with_boolean_variants_is_one_block_per_variant_rendered_with_its_pins() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "checkbox"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let sheet: Value = serde_json::from_slice(&out).expect("sheet is JSON");
    let block = |title: &str| {
        blocks_of(&sheet)
            .into_iter()
            .find(|b| b["title"] == title)
            .unwrap_or_else(|| panic!("no block titled {title}"))
    };

    // The any-of reads as words (alternatives sorted), and the block renders with its first one.
    let emphasized = block("Control (indeterminate or selected, emphasized)");
    let options = &emphasized["render"]["request"]["options"];
    // The title sorts the alternatives; the scene follows the order the data wrote them.
    assert_eq!(options["isSelected"], true);
    assert!(options["isIndeterminate"].is_null());
    assert_eq!(options["isEmphasized"], true);
    assert_eq!(emphasized["rows"][0]["conditions"], serde_json::json!({}));

    // The base block is the unselected control, not the first selected entry of the recipe.
    let base = block("Control");
    assert!(base["render"]["request"]["options"]["isSelected"].is_null());

    let disabled = block("Control (indeterminate or selected, disabled)");
    assert_eq!(disabled["render"]["request"]["options"]["isDisabled"], true);
}

#[test]
fn type_style_rows_show_the_composite_resolved_by_scale() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "text-field"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let sheet: Value = serde_json::from_slice(&out).unwrap();
    let mut seen = 0;
    for page in sheet["pages"].as_array().unwrap() {
        for block in page["blocks"].as_array().unwrap() {
            for row in block["rows"].as_array().unwrap() {
                for item in row["items"].as_array().unwrap() {
                    if item["token"]["property"] != "type-style" {
                        continue;
                    }
                    seen += 1;
                    assert_eq!(page["title"], "Typography");
                    let desktop = &item["values"]["desktop"];
                    let mobile = &item["values"]["mobile"];
                    assert!(!desktop["fontSize"].as_str().unwrap().starts_with('{'));
                    assert_ne!(desktop["fontSize"], mobile["fontSize"]);
                }
            }
        }
    }
    assert!(seen > 0, "text-field has type-style rows");
}

#[test]
fn every_sheet_emits_the_template_sections_as_placeholders_in_order() {
    let sheet = sheet_of("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let sections = sheet["sections"].as_array().unwrap();
    let keys: Vec<&str> = sections
        .iter()
        .map(|s| s["key"].as_str().unwrap())
        .collect();
    assert_eq!(
        keys,
        [
            "anatomy",
            "usage",
            "states",
            "accessibility",
            "decision-log",
            "how-to-use",
            "feedback"
        ]
    );
    for s in sections {
        // A section the data backs holds real blocks; the rest keep their placeholder.
        for b in s["blocks"].as_array().unwrap() {
            assert_eq!(b["section"], s["key"]);
            if b["kind"] == "placeholder" {
                assert!(!b["hint"].as_str().unwrap().is_empty());
            }
        }
    }
    for key in ["how-to-use", "feedback"] {
        let s = sections.iter().find(|s| s["key"] == key).unwrap();
        assert_eq!(s["blocks"][0]["kind"], "placeholder");
    }
}

fn section<'a>(sheet: &'a Value, key: &str) -> &'a Value {
    sheet["sections"]
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["key"] == key)
        .unwrap()
}

#[test]
fn accordion_usage_is_prose_from_document_blocks() {
    let sheet = sheet_of("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let blocks = section(&sheet, "usage")["blocks"].as_array().unwrap();
    assert_eq!(blocks.len(), 6);
    assert!(blocks.iter().all(|b| b["kind"] == "prose"));
    assert_eq!(blocks[0]["title"], "Purpose");
    assert!(blocks[0]["paragraphs"][0]
        .as_str()
        .unwrap()
        .starts_with("An accordion is"));
    assert_eq!(blocks[1]["title"], "Single vs. multiple expansion.");
    assert!(blocks[1]["paragraphs"][0]
        .as_str()
        .unwrap()
        .starts_with("By default, only one"));
    let dd = &blocks[5];
    assert_eq!(dd["title"], "Avoid accordion overuse");
    assert!(dd.get("do").is_none());
    assert_eq!(dd["dont"].as_array().unwrap().len(), 1);
}

#[test]
fn a_component_without_document_blocks_keeps_the_usage_placeholder() {
    let sheet = sheet_of("bar-panel");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let blocks = section(&sheet, "usage")["blocks"].as_array().unwrap();
    assert_eq!(blocks.len(), 1);
    assert_eq!(blocks[0]["kind"], "placeholder");
}

#[test]
fn section_blocks_validate_and_malformed_ones_are_rejected() {
    let mut sheet = sheet_of("accordion");
    sheet["sections"][0]["blocks"] = serde_json::json!([
        {"kind": "prose", "id": "p", "section": "usage", "title": "T", "paragraphs": ["a"], "do": ["x"], "dont": ["y"]},
        {"kind": "table", "id": "t", "section": "anatomy", "title": "API", "columns": ["Name"], "rows": [["size"]]}
    ]);
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    sheet["sections"][0]["blocks"] =
        serde_json::json!([{"kind": "table", "id": "t", "section": "bogus", "title": "x"}]);
    assert!(!schema_errors(&sheet).is_empty());
}

#[test]
fn measurement_pages_are_unaffected_by_sections() {
    let sheet = sheet_of("action-button");
    let mut keys: Vec<&String> = sheet.as_object().unwrap().keys().collect();
    keys.sort();
    assert!(keys.contains(&&"sections".to_string()));
    assert!(!sheet["pages"][0]["blocks"][0]
        .as_object()
        .unwrap()
        .contains_key("kind"));
}

#[test]
fn accordion_anatomy_has_api_and_capped_tokens_tables() {
    let sheet = sheet_of("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let blocks = section(&sheet, "anatomy")["blocks"].as_array().unwrap();
    assert_eq!(blocks[0]["id"], "anatomy--api");
    assert_eq!(
        blocks[0]["columns"],
        serde_json::json!(["Name", "Type", "Default", "Options"])
    );
    let rows = blocks[0]["rows"].as_array().unwrap();
    assert_eq!(
        rows[0],
        serde_json::json!(["size", "string", "m", "s, m, l, xl"])
    );
    assert!(rows.iter().all(|r| r[0] != "xs"));
    assert!(rows.iter().any(|r| r[0] == "isMultiple"));
    let tokens = &blocks[1];
    assert_eq!(
        tokens["columns"],
        serde_json::json!(["Name", "Type", "Alias?", "Alias of"])
    );
    let trows = tokens["rows"].as_array().unwrap();
    assert_eq!(trows.len(), 97);
    assert_eq!(tokens["title"], "Tokens (97)");
    let alias = trows
        .iter()
        .find(|r| r[0] == "container-padding-small")
        .unwrap();
    assert_eq!(
        alias,
        &serde_json::json!(["container-padding-small", "dimension", "Yes", "spacing-200"])
    );
    assert_eq!(blocks[2]["id"], "anatomy--specimen");
    assert_eq!(blocks[3]["id"], "anatomy--variants");
    assert_eq!(blocks[4]["kind"], "placeholder");
}

#[test]
fn accordion_anatomy_has_a_multi_item_specimen_and_a_24_variant_board() {
    let sheet = sheet_of("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let blocks = section(&sheet, "anatomy")["blocks"].as_array().unwrap();
    let specimen = blocks
        .iter()
        .find(|b| b["id"] == "anatomy--specimen")
        .unwrap();
    assert!(specimen["caption"]
        .as_str()
        .unwrap()
        .contains("allowsMultipleExpanded"));
    let render = &specimen["items"][0]["render"];
    let items = render["request"]["options"]["items"].as_array().unwrap();
    assert!(items.len() >= 3);
    assert!(items.iter().filter(|i| i["isExpanded"] == true).count() >= 2);
    assert!(render["scene"].get("measurements").is_none());

    let board = blocks
        .iter()
        .find(|b| b["id"] == "anatomy--variants")
        .unwrap();
    let cells = board["items"].as_array().unwrap();
    assert_eq!(cells.len(), 24);
    let titles: std::collections::BTreeSet<_> =
        cells.iter().map(|c| c["title"].as_str().unwrap()).collect();
    assert_eq!(titles.len(), 24, "each combination is titled once");
    let scale = cells[0]["render"]["view"]["scale"].as_f64().unwrap();
    assert!(cells
        .iter()
        .all(|c| c["render"]["view"]["scale"].as_f64() == Some(scale)));
    assert_eq!(cells[0]["title"], "Small, compact, default");
    assert_eq!(cells[23]["title"], "Extra Large, spacious, quiet");
}

#[test]
fn components_without_the_variant_options_keep_their_anatomy_blocks() {
    let sheet = sheet_of("action-button");
    let blocks = section(&sheet, "anatomy")["blocks"].as_array().unwrap();
    assert!(blocks.iter().all(|b| b["kind"] != "gallery"));
    assert_eq!(blocks.last().unwrap()["kind"], "placeholder");
}

#[test]
fn anatomy_tables_are_whole_when_under_the_cap() {
    let sheet = sheet_of("action-button");
    let blocks = section(&sheet, "anatomy")["blocks"].as_array().unwrap();
    let tokens = blocks
        .iter()
        .find(|b| b["id"] == "anatomy--tokens")
        .unwrap();
    let n = tokens["rows"].as_array().unwrap().len();
    let names: std::collections::BTreeSet<_> = tokens["rows"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r[0].as_str().unwrap())
        .collect();
    assert_eq!(names.len(), n, "one row per distinct token");
}

#[test]
fn accordion_accessibility_labels_the_annotation_and_informative_keys() {
    let sheet = sheet_of("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let blocks = section(&sheet, "accessibility")["blocks"]
        .as_array()
        .unwrap();
    let ids: Vec<&str> = blocks.iter().map(|b| b["id"].as_str().unwrap()).collect();
    assert_eq!(
        ids,
        [
            "accessibility--summary",
            "accessibility--keyboard",
            "accessibility--wcag",
            "accessibility--screen-readers"
        ]
    );
    let rows = blocks[0]["rows"].as_array().unwrap();
    assert_eq!(rows[0][1], "Not declared");
    assert_eq!(rows[1][1], "button");
    assert!(rows[1][2].as_str().unwrap().starts_with("Annotation"));
    assert_eq!(blocks[1]["rows"][1][1], "Space, Enter, ArrowDown");
    assert_eq!(blocks[1]["rows"][1][2], "Informative default keys");
    assert_eq!(
        blocks[2]["rows"][0],
        serde_json::json!(["2.1.1", "A", "Keyboard"])
    );
    assert_eq!(blocks[3]["kind"], "placeholder");
}

#[test]
fn accessibility_edges_keep_placeholder_or_skip_the_annotation() {
    let none = sheet_of("bar-panel");
    let blocks = section(&none, "accessibility")["blocks"]
        .as_array()
        .unwrap();
    assert_eq!(blocks.len(), 1);
    assert_eq!(blocks[0]["id"], "accessibility--placeholder");
    let button = sheet_of("action-button");
    let rows = section(&button, "accessibility")["blocks"][0]["rows"]
        .as_array()
        .unwrap();
    assert_eq!(rows[0][1], "button");
    assert!(rows
        .iter()
        .all(|r| !r[0].as_str().unwrap().contains("part")));
}

fn sheet_with_changelog(component: &str) -> Value {
    let log = repo_root().join(format!("packages/design-data/changelog/{component}.json"));
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", component, "--changelog"])
        .arg(log)
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    serde_json::from_slice(&out).unwrap()
}

#[test]
fn accordion_states_and_decision_log_come_from_data() {
    let sheet = sheet_with_changelog("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let states = section(&sheet, "states")["blocks"].as_array().unwrap();
    assert_eq!(
        states[0]["columns"],
        serde_json::json!(["State", "Trigger", "Relationship records"])
    );
    let names: Vec<&str> = states[0]["rows"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r[0].as_str().unwrap())
        .collect();
    assert_eq!(names, ["hover", "down", "keyboard-focus"]);
    assert_eq!(states[1]["kind"], "placeholder");
    let log = &section(&sheet, "decision-log")["blocks"][0];
    assert_eq!(log["kind"], "table");
    assert_eq!(log["columns"].as_array().unwrap().len(), 7);
    let rows = log["rows"].as_array().unwrap();
    assert!(rows.len() > 1);
    assert!(rows
        .windows(2)
        .all(|w| w[0][0].as_str() >= w[1][0].as_str()));
    for r in rows {
        assert_eq!(&r.as_array().unwrap()[4..], ["", "", ""]);
        assert!(!r[3].as_str().unwrap().is_empty());
    }
    for key in ["how-to-use", "feedback"] {
        assert_eq!(section(&sheet, key)["blocks"][0]["kind"], "placeholder");
    }
}

#[test]
fn states_and_decision_log_edges_keep_placeholders() {
    // No changelog flag: the log stays a placeholder. bar-panel declares no states.
    let sheet = sheet_of("bar-panel");
    assert_eq!(
        section(&sheet, "decision-log")["blocks"][0]["kind"],
        "placeholder"
    );
    assert_eq!(
        section(&sheet, "states")["blocks"][0]["kind"],
        "placeholder"
    );
    // With a changelog but no states data.
    let sheet = sheet_with_changelog("bar-panel");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    assert_eq!(
        section(&sheet, "states")["blocks"][0]["kind"],
        "placeholder"
    );
}

#[test]
fn measurement_blocks_of_a_repeating_recipe_draw_two_collapsed_items() {
    let sheet = sheet_of("accordion");
    assert_eq!(schema_errors(&sheet), Vec::<String>::new());
    let mut seen = 0;
    for b in blocks_of(&sheet) {
        let Some(render) = b.get("render").filter(|r| r.is_object()) else {
            continue;
        };
        let items = render["request"]["options"]["items"].as_array().unwrap();
        assert_eq!(items.len(), 2, "{}", b["title"]);
        assert_eq!(items[0]["label"], "Item one");
        // A block that pins `isOpen` leaves it off the entries, so both items follow the pin.
        if render["request"]["options"].get("isOpen").is_none() {
            assert_eq!(items[0]["isExpanded"], false, "{}", b["title"]);
        } else {
            assert!(items[0].get("isExpanded").is_none(), "{}", b["title"]);
        }
        let parts: Vec<&str> = render["scene"]["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|n| n["part"].as_str().unwrap())
            .collect();
        assert!(parts.contains(&"accordion-item-2"), "{}", b["title"]);
        for h in render["highlight"].as_array().into_iter().flatten() {
            let part = h["part"].as_str().unwrap();
            assert!(
                parts.iter().any(|p| p.contains(part)),
                "{}: highlight {part} has no node",
                b["title"]
            );
        }
        seen += 1;
    }
    assert!(seen > 0);
}

#[test]
fn a_recipe_without_repeat_gets_no_default_items() {
    let sheet = sheet_of("button");
    for b in blocks_of(&sheet) {
        if let Some(o) = b["render"]["request"]["options"].as_object() {
            assert!(!o.contains_key("items"));
        }
    }
}
