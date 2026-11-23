// Copyright 2026 Adobe. All rights reserved.

//! `design-data figma public-names`: pairs public variables with design-data records offline.

use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::{json, Value};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[test]
fn pairs_a_public_variable_with_its_token_and_lists_hidden_only() {
    let dir = tempfile::tempdir().unwrap();
    let snapshot = dir.path().join("variables.json");
    let var = |id: &str, name: &str, coll: &str, value: Value, hidden: bool| {
        json!({"id": id, "name": name, "key": format!("key-{id}"), "variableCollectionId": coll,
            "resolvedType": "COLOR", "valuesByMode": {"m": value}, "hiddenFromPublishing": hidden})
    };
    let coll = |id: &str, name: &str, hidden: bool| {
        json!({"id": id, "name": name, "key": id, "modes": [{"modeId": "m", "name": "Light"}],
            "defaultModeId": "m", "variableIds": [], "hiddenFromPublishing": hidden})
    };
    // The same shape the POC file has: a `variables/local` response with a `meta` wrapper.
    std::fs::write(
        &snapshot,
        json!({"status": 200, "error": false, "meta": {
            "variableCollections": {"c1": coll("c1", "S2.Color-theme", false), "c2": coll("c2", ".Color theme", true)},
            "variables": {
                "p1": var("p1", "Palette/blue/800", "c1", json!({"type": "VARIABLE_ALIAS", "id": "h1"}), false),
                "h1": var("h1", "colorTheme/blue-800", "c2", json!("#000"), true),
                "h2": var("h2", "colorTheme/blue-700", "c2", json!("#000"), true)
            }}})
        .to_string(),
    )
    .unwrap();
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["figma", "public-names", "--format", "json", "--snapshot"])
        .arg(&snapshot)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let report: Value = serde_json::from_slice(&out.stdout).unwrap();
    let row = &report["rows"][0];
    assert_eq!(row["designer_name"], "Palette/blue/800");
    assert_eq!(row["generated_name"], "Palette/blue/800");
    assert_eq!(row["class"], "identical");
    assert_eq!(row["source"], "token");
    assert_eq!(
        report["hidden_only"][0]["hidden_name"],
        "colorTheme/blue-700"
    );
    assert_eq!(
        report["hidden_only"][0]["generated_name"],
        "Palette/blue/700"
    );
}
