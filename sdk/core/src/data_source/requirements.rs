// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! What a dataset says it needs from the engine reading it (`dataset.json`).
//!
//! - `requires.cli`: a plain minimum CLI version, not a range. A data release can say what it
//!   needs, not what future CLIs will do. A CLI older than that cannot read the data correctly.
//! - `layoutRevision`: the visual layout revision the recipes were authored against. A revision
//!   newer than the engine's means the engine cannot lay the recipes out as authored.
//!
//! A dataset without the file, or without these fields, asks for nothing: data released before
//! `requires.cli` existed is not checked.

use std::path::Path;

use serde_json::Value;

/// The requirements a dataset has that this engine does not meet, and what could not be read.
#[derive(Debug, Default, PartialEq, Eq, serde::Serialize)]
pub struct Unmet {
    /// This engine cannot read the data correctly.
    pub errors: Vec<String>,
    /// A requirement was written but could not be interpreted.
    pub warnings: Vec<String>,
}

/// Compare `<dataset_root>/dataset.json` with the running CLI version and layout revision.
pub fn unmet_requirements(dataset_root: &Path, running_cli: &str, engine_layout: u32) -> Unmet {
    let mut out = Unmet::default();
    let Some(doc) = std::fs::read_to_string(dataset_root.join("dataset.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
    else {
        return out;
    };
    if let Some(required) = doc.pointer("/requires/cli").and_then(Value::as_str) {
        match (
            semver::Version::parse(required),
            semver::Version::parse(running_cli),
        ) {
            // A prerelease build (`0.45.0-dev`) is the release it leads up to: compare
            // major.minor.patch only, so it is not refused for a minimum it will meet.
            (Ok(need), Ok(have)) if semver::Version::new(have.major, have.minor, have.patch) < need => {
                out.errors.push(format!(
                    "this dataset needs design-data CLI {need} or newer (this is {have}). \
                     Install a newer CLI, or pin an older data release."
                ));
            }
            (Ok(_), Ok(_)) => {}
            (Err(_), _) => out.warnings.push(format!(
                "dataset.json `requires.cli` is '{required}', which is not an exact version; ignoring it"
            )),
            // The running version is CARGO_PKG_VERSION and always parses; nothing to compare.
            (_, Err(_)) => {}
        }
    }
    if let Some(data) = doc.get("layoutRevision").and_then(Value::as_u64) {
        if data > u64::from(engine_layout) {
            out.errors.push(format!(
                "this dataset targets visual layout revision {data}, this CLI is revision \
                 {engine_layout}. Install a newer CLI, or pin an older data release."
            ));
        }
    }
    out
}

/// Parse a project's `cli_version` (a semver range). The error names the key and the syntax.
pub fn parse_cli_range(range: &str) -> Result<semver::VersionReq, String> {
    semver::VersionReq::parse(range).map_err(|e| {
        format!(
            "`cli_version` is '{range}', which is not a semver range ({e}). \
             Use for example \">=0.36.5, <0.38.0\", or \"=0.40.1\" for one exact version"
        )
    })
}

/// Why `running_cli` is outside the project's `cli_version` range, or `None` when it is inside
/// (or the range or version cannot be read: [`parse_cli_range`] reports a bad range when the
/// config is loaded). A prerelease build is compared as the release it leads up to.
pub fn cli_range_mismatch(range: &str, running_cli: &str) -> Option<String> {
    let req = parse_cli_range(range).ok()?;
    let have = semver::Version::parse(running_cli).ok()?;
    let core = semver::Version::new(have.major, have.minor, have.patch);
    if req.matches(&core) {
        return None;
    }
    Some(format!(
        "this project's `.design-data.toml` says its generated files are made with design-data \
         CLI {range} (this is {have}). Install a CLI in that range, or change `cli_version` \
         when the project moves to a new one."
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dataset(json: &str) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("dataset.json"), json).unwrap();
        dir
    }

    #[test]
    fn a_cli_older_than_the_minimum_is_an_error() {
        let d = dataset(r#"{"requires":{"cli":"0.40.0"}}"#);
        let u = unmet_requirements(d.path(), "0.36.5", 2);
        assert_eq!(u.errors.len(), 1, "{u:?}");
        assert!(
            u.errors[0].contains("0.40.0 or newer (this is 0.36.5)"),
            "{u:?}"
        );
        assert!(u.warnings.is_empty());
    }

    #[test]
    fn the_minimum_itself_and_newer_are_fine() {
        let d = dataset(r#"{"requires":{"cli":"0.40.0"}}"#);
        assert_eq!(unmet_requirements(d.path(), "0.40.0", 2), Unmet::default());
        assert_eq!(unmet_requirements(d.path(), "0.41.3", 2), Unmet::default());
        assert_eq!(unmet_requirements(d.path(), "1.0.0", 2), Unmet::default());
    }

    #[test]
    fn a_prerelease_build_meets_the_release_it_leads_up_to() {
        let d = dataset(r#"{"requires":{"cli":"0.45.0"}}"#);
        assert_eq!(
            unmet_requirements(d.path(), "0.45.0-dev", 2),
            Unmet::default()
        );
        assert_eq!(
            unmet_requirements(d.path(), "0.46.0-rc.1", 2),
            Unmet::default()
        );
        let u = unmet_requirements(d.path(), "0.44.9-dev", 2);
        assert_eq!(u.errors.len(), 1, "{u:?}");
    }

    #[test]
    fn data_without_the_field_or_the_file_asks_for_nothing() {
        assert_eq!(
            unmet_requirements(dataset(r#"{"layoutRevision":2}"#).path(), "0.1.0", 2),
            Unmet::default()
        );
        let empty = tempfile::tempdir().unwrap();
        assert_eq!(
            unmet_requirements(empty.path(), "0.1.0", 2),
            Unmet::default()
        );
        assert_eq!(
            unmet_requirements(dataset("not json").path(), "0.1.0", 2),
            Unmet::default()
        );
    }

    #[test]
    fn a_layout_revision_newer_than_the_engine_is_an_error_but_older_is_not() {
        let newer = dataset(r#"{"layoutRevision":3}"#);
        let u = unmet_requirements(newer.path(), "0.40.0", 2);
        assert!(
            u.errors[0].contains("revision 3, this CLI is revision 2"),
            "{u:?}"
        );
        let older = dataset(r#"{"layoutRevision":1}"#);
        assert_eq!(
            unmet_requirements(older.path(), "0.40.0", 2),
            Unmet::default()
        );
    }

    #[test]
    fn a_minimum_that_is_not_an_exact_version_warns_instead_of_failing() {
        for bad in ["^0.40.0", ">=0.40", "latest"] {
            let d = dataset(&format!(r#"{{"requires":{{"cli":"{bad}"}}}}"#));
            let u = unmet_requirements(d.path(), "0.1.0", 2);
            assert!(u.errors.is_empty(), "{bad}: {u:?}");
            assert_eq!(u.warnings.len(), 1, "{bad}: {u:?}");
        }
    }

    #[test]
    fn a_cli_inside_the_project_range_is_fine_and_outside_is_a_mismatch() {
        let r = ">=0.36.5, <0.38.0";
        for ok in ["0.36.5", "0.37.0", "0.37.9", "0.37.0-dev"] {
            assert_eq!(cli_range_mismatch(r, ok), None, "{ok}");
        }
        for bad in ["0.36.4", "0.38.0", "0.40.1"] {
            let m = cli_range_mismatch(r, bad).unwrap_or_default();
            assert!(m.contains(r) && m.contains(bad), "{bad}: {m}");
        }
    }

    #[test]
    fn one_exact_version_and_the_caret_default() {
        assert_eq!(cli_range_mismatch("=0.40.1", "0.40.1"), None);
        assert!(cli_range_mismatch("=0.40.1", "0.40.2").is_some());
        // A bare version is a caret range, as in Cargo: >=0.40.1, <0.41.0.
        assert_eq!(cli_range_mismatch("0.40.1", "0.40.9"), None);
        assert!(cli_range_mismatch("0.40.1", "0.41.0").is_some());
    }

    #[test]
    fn a_range_that_is_not_semver_is_an_error_naming_the_key() {
        for bad in ["latest", ">=", "~~1"] {
            let msg = parse_cli_range(bad).expect_err(bad);
            assert!(
                msg.contains("`cli_version`") && msg.contains(bad),
                "{bad}: {msg}"
            );
        }
        for ok in ["=0.40.1", "0.40", ">=0.36.5, <0.38.0"] {
            assert!(parse_cli_range(ok).is_ok(), "{ok}");
        }
    }
}
