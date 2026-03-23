// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

mod format;

use clap::{Parser, Subcommand, ValueEnum};
use design_data_core::compat::{load_snapshot, snapshot_matches, write_snapshot, ValidationSnapshot};
use design_data_core::schema::SchemaRegistry;
use design_data_core::validate;
use miette::{IntoDiagnostic, WrapErr};

/// Spectrum Design Data tooling — validate and migrate design tokens.
#[derive(Parser)]
#[command(name = "design-data", version, about)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Validate design data against JSON Schemas (Layer 1) and catalog rules (Layer 2)
    Validate {
        /// Path to a JSON file or directory to validate
        #[arg(value_name = "PATH")]
        path: Option<PathBuf>,
        /// Output format
        #[arg(long, value_enum, default_value_t = OutputFormat::Pretty)]
        format: OutputFormat,
        /// Root directory containing `token-types/` and `token-file.json`
        #[arg(long, value_name = "DIR")]
        schema_path: Option<PathBuf>,
        /// Treat warnings as errors
        #[arg(long)]
        strict: bool,
    },
    /// Snapshot and backward-compat verification helpers
    Migrate {
        #[command(subcommand)]
        sub: MigrateSub,
    },
}

#[derive(Subcommand)]
enum MigrateSub {
    /// Run validation and compare to a golden snapshot JSON
    Verify {
        /// Token JSON file or directory (same as `validate`)
        #[arg(value_name = "PATH")]
        path: PathBuf,
        /// Golden snapshot produced by `migrate snapshot`
        #[arg(long, value_name = "FILE")]
        snapshot: PathBuf,
        #[arg(long, value_name = "DIR")]
        schema_path: Option<PathBuf>,
    },
    /// Run validation and write a sorted snapshot JSON for CI / golden testing
    Snapshot {
        #[arg(value_name = "PATH")]
        path: PathBuf,
        #[arg(long, value_name = "FILE")]
        output: PathBuf,
        #[arg(long, value_name = "DIR")]
        schema_path: Option<PathBuf>,
    },
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum OutputFormat {
    #[default]
    Pretty,
    Json,
}

fn default_schema_path() -> PathBuf {
    if let Ok(p) = std::env::var("DESIGN_DATA_SCHEMA_ROOT") {
        return PathBuf::from(p);
    }
    let candidates = [
        PathBuf::from("packages/tokens/schemas"),
        PathBuf::from("../packages/tokens/schemas"),
    ];
    for c in &candidates {
        if c.join("token-types").is_dir() {
            return c.clone();
        }
    }
    PathBuf::from("packages/tokens/schemas")
}

fn run_validate(
    path: &Path,
    format: OutputFormat,
    schema_path: Option<PathBuf>,
    strict: bool,
) -> miette::Result<ExitCode> {
    if !validate::engine_ready() {
        miette::bail!("validation engine not ready");
    }
    let schema_root = schema_path.unwrap_or_else(default_schema_path);
    let registry = SchemaRegistry::load_legacy_token_schemas(&schema_root)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load schemas from {}", schema_root.display()))?;

    let report = validate::validate_all(path, &registry)
        .into_diagnostic()
        .wrap_err("validation failed")?;

    match format {
        OutputFormat::Json => {
            println!("{}", format::format_report_json(&report).into_diagnostic()?);
        }
        OutputFormat::Pretty => {
            format::print_report_pretty(&report);
        }
    }

    if report.failed(strict) {
        return Ok(ExitCode::from(1));
    }
    Ok(ExitCode::SUCCESS)
}

fn run_migrate_verify(
    path: &Path,
    snapshot: &Path,
    schema_path: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let schema_root = schema_path.unwrap_or_else(default_schema_path);
    let registry = SchemaRegistry::load_legacy_token_schemas(&schema_root).into_diagnostic()?;
    let report = validate::validate_all(path, &registry).into_diagnostic()?;
    let expected = load_snapshot(snapshot).into_diagnostic()?;
    if snapshot_matches(&report, &expected) {
        println!("Snapshot OK: {}", snapshot.display());
        return Ok(ExitCode::SUCCESS);
    }
    let current = ValidationSnapshot::from(&report);
    eprintln!("Snapshot mismatch with {}", snapshot.display());
    eprintln!(
        "current: {}",
        serde_json::to_string_pretty(&current).into_diagnostic()?
    );
    Ok(ExitCode::from(1))
}

fn run_migrate_snapshot(
    path: &Path,
    output: &Path,
    schema_path: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let schema_root = schema_path.unwrap_or_else(default_schema_path);
    let registry = SchemaRegistry::load_legacy_token_schemas(&schema_root).into_diagnostic()?;
    let report = validate::validate_all(path, &registry).into_diagnostic()?;
    let snap = ValidationSnapshot::from(&report);
    write_snapshot(output, &snap).into_diagnostic()?;
    println!("Wrote {}", output.display());
    Ok(ExitCode::SUCCESS)
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Validate {
            path,
            format,
            schema_path,
            strict,
        } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            run_validate(&target, format, schema_path, strict)
        }
        Commands::Migrate { sub } => match sub {
            MigrateSub::Verify {
                path,
                snapshot,
                schema_path,
            } => run_migrate_verify(&path, &snapshot, schema_path),
            MigrateSub::Snapshot {
                path,
                output,
                schema_path,
            } => run_migrate_snapshot(&path, &output, schema_path),
        },
    };

    match result {
        Ok(code) => code,
        Err(e) => {
            eprintln!("Error: {e:?}");
            ExitCode::from(2)
        }
    }
}
