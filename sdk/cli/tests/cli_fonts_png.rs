// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data fonts` and `render --format png`, with HOME pointed at an empty directory so
//! nothing depends on the fonts installed on the machine running the tests.

use assert_cmd::Command;
use serde_json::Value;
use std::path::PathBuf;

/// Source Sans 3 VF (SIL OFL): the bundled fallback, reused here as a font to point at.
fn font_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../core/src/raster/fonts/SourceSans3VF-Upright.ttf")
}

fn cli(home: &std::path::Path) -> Command {
    let mut c = Command::cargo_bin("design-data").unwrap();
    // Run from the repository root, where the dataset is found.
    c.current_dir(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .env("HOME", home)
        .env_remove("DESIGN_DATA_FONT");
    c
}

fn json(out: &[u8]) -> Value {
    serde_json::from_slice(out).unwrap_or_else(|e| panic!("{e}: {}", String::from_utf8_lossy(out)))
}

#[test]
fn fonts_reports_the_fallback_with_install_help_and_exits_1() {
    let home = tempfile::tempdir().unwrap();
    let out = cli(home.path())
        .args(["fonts", "--json"])
        .assert()
        .code(1)
        .get_output()
        .stdout
        .clone();
    let v = json(&out);
    assert_eq!(v["target"], "Adobe Clean Spectrum VF");
    assert_eq!(v["fallback"], true);
    assert_eq!(v["found"], false);
    let help = v["help"].as_str().unwrap();
    assert!(help.contains("https://inside.corp.adobe.com/content/inside/en/brand-center/font.html"));
    assert!(help.contains("DESIGN_DATA_FONT"));

    let text = cli(home.path())
        .arg("fonts")
        .assert()
        .code(1)
        .get_output()
        .stdout
        .clone();
    let text = String::from_utf8(text).unwrap();
    assert!(
        text.contains("Not found") && text.contains("bundled Source Sans 3"),
        "{text}"
    );
}

#[test]
fn design_data_font_is_used_and_fonts_exits_0() {
    let home = tempfile::tempdir().unwrap();
    let out = cli(home.path())
        .env("DESIGN_DATA_FONT", font_path())
        .args(["fonts", "--json"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let v = json(&out);
    assert_eq!(v["found"], true);
    assert!(v["using"]
        .as_str()
        .unwrap()
        .ends_with("SourceSans3VF-Upright.ttf"));
}

fn is_png(path: &std::path::Path) -> (u32, u32) {
    let b = std::fs::read(path).unwrap();
    assert_eq!(&b[..8], b"\x89PNG\r\n\x1a\n");
    let be = |o: usize| u32::from_be_bytes(b[o..o + 4].try_into().unwrap());
    (be(16), be(20))
}

#[test]
fn render_png_warns_when_it_falls_back_and_stays_quiet_with_a_font() {
    let (home, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let png = out.path().join("badge.png");
    let a = cli(home.path())
        .args([
            "render",
            "badge",
            "--format",
            "png",
            "--pixel-ratio",
            "3",
            "--output",
        ])
        .arg(&png)
        .assert()
        .success();
    let err = String::from_utf8(a.get_output().stderr.clone()).unwrap();
    assert!(
        err.contains("Adobe Clean Spectrum VF was not found")
            && err.contains("bundled Source Sans 3"),
        "{err}"
    );
    let (w, h) = is_png(&png);
    assert!(w > 30 && h > 30, "{w}x{h}");

    let png2 = out.path().join("badge2.png");
    let a = cli(home.path())
        .env("DESIGN_DATA_FONT", font_path())
        .args([
            "render",
            "badge",
            "--format",
            "png",
            "--pixel-ratio",
            "3",
            "--output",
        ])
        .arg(&png2)
        .assert()
        .success();
    let err = String::from_utf8(a.get_output().stderr.clone()).unwrap();
    assert!(!err.contains("was not found"), "{err}");
    // Same recipe at the same ratio: the same height, and a width within a few pixels (the
    // explicit font's unkerned advances differ slightly from the committed table).
    let (w2, h2) = is_png(&png2);
    assert_eq!(h, h2);
    assert!(w.abs_diff(w2) <= 6, "{w} vs {w2}");
}

#[test]
fn render_png_needs_an_output_file_and_a_usable_font() {
    let home = tempfile::tempdir().unwrap();
    cli(home.path())
        .args(["render", "badge", "--format", "png"])
        .assert()
        .failure()
        .stderr(predicates::str::contains("--output"));
    let cff = home.path().join("x.otf");
    std::fs::write(&cff, b"OTTO\0\0\0\0\0\0\0\0").unwrap();
    cli(home.path())
        .args(["render", "badge", "--format", "png", "--font"])
        .arg(&cff)
        .arg("--output")
        .arg(home.path().join("o.png"))
        .assert()
        .failure()
        .stderr(predicates::str::contains("CFF"));
    cli(home.path())
        .args([
            "render",
            "badge",
            "--format",
            "png",
            "--font",
            "/does/not/exist.ttf",
            "--output",
            "/tmp/never.png",
        ])
        .assert()
        .failure()
        .stderr(predicates::str::contains("failed to read --font"));
}

#[test]
fn a_supplied_font_also_drives_svg_layout() {
    let home = tempfile::tempdir().unwrap();
    let width = |extra: &[&str]| {
        let out = cli(home.path())
            .args(["render", "badge", "--label", "Wide label here"])
            .args(extra)
            .assert()
            .success()
            .get_output()
            .stdout
            .clone();
        let svg = String::from_utf8(out).unwrap();
        let w = svg
            .split("width=\"")
            .nth(1)
            .unwrap()
            .split('"')
            .next()
            .unwrap()
            .parse::<f64>()
            .unwrap();
        w
    };
    let default = width(&[]);
    let font = font_path();
    let with_font = width(&["--font", font.to_str().unwrap()]);
    assert!(default > 20.0 && with_font > 20.0);
    assert_ne!(
        default, with_font,
        "widths come from the font, not the committed table"
    );
    assert!((default - with_font).abs() / default < 0.1);
}
