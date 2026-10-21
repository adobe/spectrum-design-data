// Copyright 2026 Adobe. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

//! `figma * --help` must never print the FIGMA_TOKEN value.

use assert_cmd::Command;

#[test]
fn figma_help_does_not_leak_token_value() {
    let secret = "figd_sentinel-secret-value";
    for sub in ["read", "export", "import", "diff", "pair"] {
        let output = Command::cargo_bin("design-data")
            .unwrap()
            .env("FIGMA_TOKEN", secret)
            .args(["figma", sub, "--help"])
            .output()
            .unwrap();
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(output.status.success(), "figma {sub} --help failed");
        assert!(
            stdout.contains("FIGMA_TOKEN"),
            "figma {sub}: env name missing"
        );
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(!stdout.contains(secret), "figma {sub} --help leaked token");
        assert!(
            !stderr.contains(secret),
            "figma {sub} --help leaked token to stderr"
        );
    }
}
