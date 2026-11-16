// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data platform doctor`: one health check for an external platform repo (h890.36.9,
//! GH #1870).
//!
//! It runs the checks that already exist elsewhere and reports them together, so a platform team
//! sees everything wrong at once and the checks cannot drift from the commands they came from:
//! `validate-manifest` (the manifest applies, MANIFEST-001), `platform show` (the pin, MANIFEST-002),
//! the data requirements (`requires.cli`, `layoutRevision`) and the project's `cli_version`.
//! Every finding is reported, never refused: doctor has to run when the CLI is too old for the
//! data, which is when a platform team needs it most.

use std::path::Path;

use design_data_core::data_source::{self, CliPathOverrides};
use design_data_core::manifest;
use design_data_core::validate::rules::manifest_bindings::unresolved_platform_bindings;
use miette::IntoDiagnostic;
use serde::Serialize;

use crate::{ExitCode, OutputFormat};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Ok,
    /// Worth knowing, not a problem (for example an extension that replaces a foundation one).
    Note,
    Warn,
    /// Fails the run (exit 1).
    Error,
    Skipped,
}

#[derive(Debug, Serialize)]
pub struct Check {
    pub id: &'static str,
    pub status: Status,
    pub message: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub details: Vec<String>,
}

fn check(id: &'static str, status: Status, message: impl Into<String>) -> Check {
    Check {
        id,
        status,
        message: message.into(),
        details: vec![],
    }
}

impl Check {
    fn with(mut self, details: Vec<String>) -> Self {
        self.details = details;
        self
    }
}

#[derive(Debug, Serialize)]
struct Report {
    platform: Option<String>,
    manifest: String,
    checks: Vec<Check>,
    errors: usize,
    warnings: usize,
}

/// The foundation repo a `--latest` check asks: the project's `[source]` repo, else the default.
fn foundation_repo(config: Option<&data_source::DesignDataConfig>) -> String {
    match config.and_then(|c| c.source.as_ref()) {
        Some(data_source::SourceConfig::Github { repo, .. }) => repo.clone(),
        _ => "adobe/spectrum-design-data".to_string(),
    }
}

pub fn run(id: Option<String>, latest: bool, format: OutputFormat) -> miette::Result<ExitCode> {
    // Doctor reports an unmet requirement as a finding, so it resolves without enforcing them.
    let mut resolved = crate::resolve_data_source_unchecked(CliPathOverrides {
        platform_id: id,
        ..Default::default()
    })?;
    let Some(manifest_path) = resolved.platform_manifest.clone() else {
        eprintln!(
            "design-data: error: no platform manifest configured (pass a platform id, or set `default_platform` in `.design-data.toml`)"
        );
        return Ok(ExitCode::from(2));
    };
    let project = crate::project_config()?;
    let config = project.as_ref().map(|(_, c)| c);
    let mut checks: Vec<Check> = Vec::new();

    // The manifest, merged with its extensions and schema-checked. If it cannot be read, the
    // checks that need it are skipped, not guessed at.
    let manifest_json = match manifest::load_configured_manifest(&resolved) {
        Ok(Some(m)) => Some(m),
        Ok(None) => None,
        Err(e) => {
            checks.push(check(
                "manifest",
                Status::Error,
                format!("the manifest is invalid: {e}"),
            ));
            None
        }
    };
    let manifest_pin = manifest_json
        .as_ref()
        .and_then(|m| m.get("foundationVersion")?.as_str().map(String::from));

    // The foundation graph (no manifest applied), then the platform graph on top of it.
    resolved.platform_manifest = None;
    let foundation = crate::load_visual_graph(&resolved, None, true);
    resolved.platform_manifest = Some(manifest_path.clone());
    let mut platform_graph = None;
    match (&foundation, &manifest_json) {
        (Err(e), _) => checks.push(check(
            "manifest",
            Status::Error,
            format!("the foundation data could not be loaded: {e}"),
        )),
        (Ok((graph, _, _)), Some(_)) => {
            let mut applied = graph.clone();
            match manifest::apply_configured(&mut applied, &resolved) {
                Ok(_) => {
                    checks.push(check(
                        "manifest",
                        Status::Ok,
                        "the manifest applies to the foundation",
                    ));
                    platform_graph = Some(applied);
                }
                Err(e) => checks.push(check(
                    "manifest",
                    Status::Error,
                    format!("the manifest does not apply to the foundation: {e}"),
                )),
            }
        }
        (Ok(_), None) => {}
    }

    // MANIFEST-001: every binding in the platform's own recipes resolves.
    if let Some(graph) = &platform_graph {
        let unresolved = unresolved_platform_bindings(graph);
        if unresolved.is_empty() {
            checks.push(check(
                "bindings",
                Status::Ok,
                "every binding in the platform's recipes resolves",
            ));
        } else {
            checks.push(
                check(
                    "bindings",
                    Status::Error,
                    format!(
                        "{} recipe binding(s) the data does not have (MANIFEST-001)",
                        unresolved.len()
                    ),
                )
                .with(unresolved.iter().map(|b| b.message()).collect()),
            );
        }
    } else {
        checks.push(check(
            "bindings",
            Status::Skipped,
            "the manifest did not apply",
        ));
    }

    // MANIFEST-002: the pin is written twice and the two must name the same release.
    let pin = crate::check_project_pin(manifest_pin.as_deref(), &manifest_path, project.as_ref());
    checks.push(match &pin {
        manifest::PinCheck::Agree { version } => check(
            "pin",
            Status::Ok,
            format!("foundationVersion and `[source]` both name {version}"),
        ),
        manifest::PinCheck::Mismatch { manifest, source } => check(
            "pin",
            Status::Error,
            format!("foundationVersion is {manifest} but `[source]` pins {source} (MANIFEST-002)"),
        ),
        manifest::PinCheck::Unverifiable { reason } => {
            check("pin", Status::Warn, format!("not verified: {reason}"))
        }
        manifest::PinCheck::Skipped { reason } => {
            check("pin", Status::Skipped, format!("not compared: {reason}"))
        }
    });

    // The CLI against what the data and the project need of it.
    let mut unmet = crate::data_requirements(&resolved);
    unmet.errors.extend(crate::project_cli_range_finding()?);
    let cli = env!("CARGO_PKG_VERSION");
    checks.push(if unmet.errors.is_empty() && unmet.warnings.is_empty() {
        check(
            "cli",
            Status::Ok,
            format!("CLI {cli} meets what the dataset and the project ask of it"),
        )
    } else if unmet.errors.is_empty() {
        check(
            "cli",
            Status::Warn,
            format!("CLI {cli}: a requirement could not be read"),
        )
        .with(unmet.warnings)
    } else {
        let mut details = unmet.errors;
        details.extend(unmet.warnings);
        check(
            "cli",
            Status::Error,
            format!("CLI {cli} does not meet a requirement"),
        )
        .with(details)
    });

    // Is the platform id in the registry of known implementations?
    checks.push(match manifest_json.as_ref() {
        None => check("registry", Status::Skipped, "the manifest could not be read"),
        Some(m) if m.get("platform").and_then(|p| p.as_str()).is_none() => check(
            "registry",
            Status::Note,
            "the manifest declares no `platform` id, so it is not matched to platform-implementations.json",
        ),
        Some(m) => match manifest::check_platform_identity(m, &resolved.schemas_root) {
            Ok(None) => check("registry", Status::Ok, "the platform is in platform-implementations.json"),
            Ok(Some(warning)) => check("registry", Status::Warn, warning),
            Err(e) => check("registry", Status::Warn, format!("could not read the registry: {e}")),
        },
    });

    // Extensions that replace a foundation artifact: allowed, and a promotion candidate.
    checks.push(match (&foundation, manifest_json.as_ref()) {
        (Ok((graph, _, _)), Some(m)) => {
            let shadows = manifest::shadowed_artifacts(graph, m);
            if shadows.is_empty() {
                check("shadows", Status::Ok, "no extension replaces a foundation artifact")
            } else {
                check(
                    "shadows",
                    Status::Note,
                    format!(
                        "{} extension(s) replace a foundation artifact of the same name; each is a candidate to promote",
                        shadows.len()
                    ),
                )
                .with(shadows.iter().map(|s| format!("{}: {}", s.category, s.name)).collect())
            }
        }
        _ => check("shadows", Status::Skipped, "the foundation or the manifest could not be read"),
    });

    // Drift from the newest release. Needs the network, so only when asked.
    checks.push(if !latest {
        check(
            "latest",
            Status::Skipped,
            "not checked; pass --latest to ask GitHub for the newest release",
        )
    } else {
        latest_check(manifest_pin.as_deref(), &foundation_repo(config))
    });

    let errors = checks.iter().filter(|c| c.status == Status::Error).count();
    let warnings = checks.iter().filter(|c| c.status == Status::Warn).count();
    let platform = manifest_json
        .as_ref()
        .and_then(|m| m.get("platform")?.as_str().map(String::from));
    let report = Report {
        platform,
        manifest: manifest_path.display().to_string(),
        checks,
        errors,
        warnings,
    };
    match format {
        OutputFormat::Json => println!(
            "{}",
            serde_json::to_string_pretty(&report).into_diagnostic()?
        ),
        OutputFormat::Pretty => print_pretty(&report, &manifest_path),
    }
    Ok(if errors > 0 {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    })
}

fn latest_check(manifest_pin: Option<&str>, repo: &str) -> Check {
    let Some(pin) = manifest_pin.and_then(manifest::exact_version) else {
        return check(
            "latest",
            Status::Skipped,
            "the manifest has no exact foundationVersion to compare",
        );
    };
    match data_source::latest_foundation_version(repo) {
        Ok(newest) if newest > pin => check(
            "latest",
            Status::Warn,
            format!("foundation {newest} is available; this platform pins {pin}"),
        )
        .with(vec![format!(
            "see what it changes for you: design-data platform impact --from {pin} --to {newest}"
        )]),
        Ok(newest) => check(
            "latest",
            Status::Ok,
            format!("the pin {pin} is the newest release ({newest})"),
        ),
        Err(e) => check(
            "latest",
            Status::Warn,
            format!("could not ask {repo} for its latest release: {e}"),
        ),
    }
}

fn print_pretty(report: &Report, manifest_path: &Path) {
    println!(
        "design-data platform doctor{} ({})",
        report
            .platform
            .as_deref()
            .map(|p| format!(" {p}"))
            .unwrap_or_default(),
        manifest_path.display()
    );
    for c in &report.checks {
        let marker = match c.status {
            Status::Ok => "ok  ",
            Status::Note => "note",
            Status::Warn => "warn",
            Status::Error => "FAIL",
            Status::Skipped => "skip",
        };
        println!("  {marker} {:<9} {}", c.id, c.message);
        for d in &c.details {
            println!("       {:<9} {d}", "");
        }
    }
    println!(
        "\n{} error(s), {} warning(s)",
        report.errors, report.warnings
    );
}
