// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for TUI launch wiring in the merged `design-data` binary.

use assert_cmd::Command;
use predicates::prelude::*;

/// `design-data --help` must exit 0 and list both CLI subcommands and the `tui` entry.
#[test]
fn help_lists_tui_subcommand() {
    let mut cmd = Command::cargo_bin("design-data").unwrap();
    cmd.arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("tui"))
        .stdout(predicate::str::contains("validate"));
}

/// `design-data tui --help` must exit 0 and describe TUI-specific flags.
#[test]
fn tui_subcommand_help() {
    let mut cmd = Command::cargo_bin("design-data").unwrap();
    cmd.args(["tui", "--help"])
        .assert()
        .success()
        .stdout(predicate::str::contains("dataset").or(predicate::str::contains("DATASET")))
        .stdout(predicate::str::contains("theme"));
}

/// Passing mutually exclusive `--record` and `--replay` flags must be rejected by the parser.
#[test]
fn record_replay_conflict_is_rejected() {
    let mut cmd = Command::cargo_bin("design-data").unwrap();
    cmd.args(["tui", "--record", "out.ndjson", "--replay", "in.ndjson", "."])
        .assert()
        .failure();
}

/// Passing mutually exclusive `--record` and `--replay` flags at the top level (bare TUI
/// path) must also be rejected.
#[test]
fn bare_record_replay_conflict_is_rejected() {
    let mut cmd = Command::cargo_bin("design-data").unwrap();
    cmd.args(["--record", "out.ndjson", "--replay", "in.ndjson"])
        .assert()
        .failure();
}
