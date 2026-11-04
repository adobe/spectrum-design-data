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
    assert_eq!(items[0]["token"]["name"], "component-height-50");
    assert_eq!(items[0]["values"]["desktop"], "20px");
    let scene = &height["render"]["scene"];
    assert!(scene["measurements"]
        .as_array()
        .unwrap()
        .iter()
        .any(|m| m["prop"] == "height"));
    let m = &height["render"]["measurements"][0];
    assert_eq!(m["prop"], "height");
    assert_eq!(m["label"], "component-height-100");
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
    assert!(labels.iter().all(|l| l.contains("edge-to-visual-only")));
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
    assert!(
        l.iter()
            .all(|x| x.starts_with("component-pill-edge-to-visual-only-")),
        "{l:?}"
    );
    let normal = labels(&block("Spacing (start/end edges)"));
    assert!(
        normal.iter().all(|x| !x.contains("visual-only")),
        "{normal:?}"
    );
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
