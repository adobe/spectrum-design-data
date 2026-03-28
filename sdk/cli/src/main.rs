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

use std::collections::HashSet;

use clap::{Parser, Subcommand, ValueEnum};
use design_data_core::cascade::{resolve, ResolutionContext};
use design_data_core::compat::{load_snapshot, snapshot_matches, write_snapshot, ValidationSnapshot};
use design_data_core::graph::TokenGraph;
use design_data_core::legacy;
use design_data_core::migrate;
use design_data_core::naming::NamingExceptionsFile;
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
        /// Path to naming-exceptions.json allowlist for SPEC-007
        #[arg(long, value_name = "FILE")]
        exceptions_path: Option<PathBuf>,
        /// Directory containing spec-format dimension declaration JSON files
        #[arg(long, value_name = "DIR")]
        dimensions_path: Option<PathBuf>,
        /// Treat warnings as errors
        #[arg(long)]
        strict: bool,
    },
    /// Resolve a token value for a given dimension context
    Resolve {
        /// Token property name to resolve (e.g. background-color-default)
        #[arg(value_name = "PROPERTY")]
        property: String,
        /// Directory containing cascade-format .tokens.json files
        #[arg(value_name = "PATH")]
        path: Option<PathBuf>,
        /// Directory containing spec-format dimension declaration JSON files
        #[arg(long, value_name = "DIR")]
        dimensions_path: Option<PathBuf>,
        /// Color scheme mode (e.g. light, dark, wireframe)
        #[arg(long, value_name = "MODE")]
        color_scheme: Option<String>,
        /// Scale mode (e.g. desktop, mobile)
        #[arg(long, value_name = "MODE")]
        scale: Option<String>,
        /// Contrast mode (e.g. regular, high)
        #[arg(long, value_name = "MODE")]
        contrast: Option<String>,
        /// Output format
        #[arg(long, value_enum, default_value_t = OutputFormat::Pretty)]
        format: OutputFormat,
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
        #[arg(long, value_name = "FILE")]
        exceptions_path: Option<PathBuf>,
    },
    /// Run validation and write a sorted snapshot JSON for CI / golden testing
    Snapshot {
        #[arg(value_name = "PATH")]
        path: PathBuf,
        #[arg(long, value_name = "FILE")]
        output: PathBuf,
        #[arg(long, value_name = "DIR")]
        schema_path: Option<PathBuf>,
        #[arg(long, value_name = "FILE")]
        exceptions_path: Option<PathBuf>,
    },
    /// Convert legacy set-format token files to cascade-format .tokens.json files
    Convert {
        /// Source directory containing legacy token JSON files
        #[arg(value_name = "INPUT")]
        input: PathBuf,
        /// Destination directory for cascade .tokens.json output files
        #[arg(long, value_name = "OUTPUT")]
        output: PathBuf,
    },
    /// Convert cascade-format .tokens.json files back to legacy set-format JSON
    LegacyOutput {
        /// Source directory containing cascade .tokens.json files
        #[arg(value_name = "INPUT")]
        input: PathBuf,
        /// Destination directory for legacy JSON output files
        #[arg(long, value_name = "OUTPUT")]
        output: PathBuf,
    },
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum OutputFormat {
    #[default]
    Pretty,
    Json,
}

fn load_exceptions(path: Option<&Path>) -> miette::Result<HashSet<String>> {
    let Some(p) = path else {
        return Ok(default_exceptions_path()
            .and_then(|p| NamingExceptionsFile::load(&p).ok())
            .map(|f| f.token_set())
            .unwrap_or_default());
    };
    let file = NamingExceptionsFile::load(p)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load exceptions from {}", p.display()))?;
    Ok(file.token_set())
}

fn default_exceptions_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("packages/tokens/naming-exceptions.json"),
        PathBuf::from("../packages/tokens/naming-exceptions.json"),
    ];
    candidates.into_iter().find(|c| c.is_file())
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

fn default_dimensions_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("packages/design-data-spec/dimensions"),
        PathBuf::from("../packages/design-data-spec/dimensions"),
    ];
    candidates.into_iter().find(|c| c.is_dir())
}

fn run_resolve(
    property: &str,
    path: &Path,
    dimensions_path: Option<PathBuf>,
    color_scheme: Option<String>,
    scale: Option<String>,
    contrast: Option<String>,
    format: OutputFormat,
) -> miette::Result<ExitCode> {
    // Build resolution context from flags.
    let mut ctx = ResolutionContext::new();
    if let Some(m) = color_scheme {
        ctx = ctx.with("colorScheme", m);
    }
    if let Some(m) = scale {
        ctx = ctx.with("scale", m);
    }
    if let Some(m) = contrast {
        ctx = ctx.with("contrast", m);
    }
    // A property filter: only consider tokens whose name.property matches.
    ctx = ctx.with("__property_filter__", property.to_string());

    // Load token graph.
    let mut graph = TokenGraph::from_json_dir(path)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;

    // Load dimensions from spec catalog.
    let dims_dir = dimensions_path.or_else(default_dimensions_path);
    if let Some(dir) = dims_dir {
        if dir.is_dir() {
            let dims = TokenGraph::load_spec_dimensions(&dir)
                .into_diagnostic()
                .wrap_err_with(|| format!("failed to load dimensions from {}", dir.display()))?;
            graph = graph.with_dimensions(dims);
        }
    }

    // Build a property-filtered context (remove the internal marker).
    let mut resolve_ctx = ResolutionContext::new();
    for (k, v) in &ctx.dimensions {
        if k != "__property_filter__" {
            resolve_ctx = resolve_ctx.with(k.clone(), v.clone());
        }
    }

    // Filter graph to tokens matching the requested property.
    let property_filter = property.to_string();
    let candidates: Vec<_> = graph
        .tokens
        .values()
        .filter(|t| {
            t.raw
                .get("name")
                .and_then(|v| v.as_object())
                .and_then(|n| n.get("property"))
                .and_then(|v| v.as_str())
                == Some(property_filter.as_str())
        })
        .collect();

    if candidates.is_empty() {
        eprintln!("No tokens found with property: {property}");
        return Ok(ExitCode::from(1));
    }

    // Build a temporary graph with only the filtered tokens for resolution.
    let filtered_graph = TokenGraph::from_pairs(
        candidates
            .iter()
            .map(|t| (t.name.clone(), t.file.clone(), t.raw.clone()))
            .collect(),
    )
    .with_dimensions(graph.dimensions.clone());

    match resolve(&filtered_graph, &resolve_ctx) {
        None => {
            eprintln!("No matching token for property '{property}' in given context");
            Ok(ExitCode::from(1))
        }
        Some(winner) => {
            match format {
                OutputFormat::Json => {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&winner.raw).into_diagnostic()?
                    );
                }
                OutputFormat::Pretty => {
                    println!("Property:  {property}");
                    if let Some(val) = winner.raw.get("value") {
                        println!("Value:     {val}");
                    } else if let Some(r) = winner.raw.get("$ref") {
                        println!("Alias:     {r}");
                    }
                    println!("File:      {}", winner.file.display());
                    println!("Index:     {}", winner.index);
                    if let Some(uuid) = &winner.uuid {
                        println!("UUID:      {uuid}");
                    }
                }
            }
            Ok(ExitCode::SUCCESS)
        }
    }
}

fn run_validate(
    path: &Path,
    format: OutputFormat,
    schema_path: Option<PathBuf>,
    exceptions_path: Option<PathBuf>,
    dimensions_path: Option<PathBuf>,
    strict: bool,
) -> miette::Result<ExitCode> {
    if !validate::engine_ready() {
        miette::bail!("validation engine not ready");
    }
    let schema_root = schema_path.unwrap_or_else(default_schema_path);
    let registry = SchemaRegistry::load_legacy_token_schemas(&schema_root)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load schemas from {}", schema_root.display()))?;
    let exceptions = load_exceptions(exceptions_path.as_deref())?;

    let dims_dir = dimensions_path.or_else(default_dimensions_path);

    let report = validate::validate_all_with_options(path, &registry, &exceptions, dims_dir.as_deref())
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
    exceptions_path: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let schema_root = schema_path.unwrap_or_else(default_schema_path);
    let registry = SchemaRegistry::load_legacy_token_schemas(&schema_root).into_diagnostic()?;
    let exceptions = load_exceptions(exceptions_path.as_deref())?;
    let report =
        validate::validate_all_with_exceptions(path, &registry, &exceptions).into_diagnostic()?;
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

fn run_migrate_legacy_output(input: &Path, output: &Path) -> miette::Result<ExitCode> {
    let summary = legacy::convert_dir(input, output)
        .into_diagnostic()
        .wrap_err_with(|| {
            format!(
                "legacy-output failed: {} → {}",
                input.display(),
                output.display()
            )
        })?;
    println!(
        "Converted {} file(s): {} tokens produced ({} sets, {} flat)",
        summary.files_written,
        summary.tokens_produced,
        summary.sets_reconstructed,
        summary.flat_tokens,
    );
    Ok(ExitCode::SUCCESS)
}

fn run_migrate_convert(input: &Path, output: &Path) -> miette::Result<ExitCode> {
    let summary = migrate::convert_dir(input, output)
        .into_diagnostic()
        .wrap_err_with(|| {
            format!(
                "migration failed: {} → {}",
                input.display(),
                output.display()
            )
        })?;
    println!(
        "Converted {} file(s): {} tokens produced ({} set entries, {} flat)",
        summary.files_written,
        summary.tokens_produced,
        summary.set_entries_unwrapped,
        summary.flat_tokens_converted,
    );
    Ok(ExitCode::SUCCESS)
}

fn run_migrate_snapshot(
    path: &Path,
    output: &Path,
    schema_path: Option<PathBuf>,
    exceptions_path: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let schema_root = schema_path.unwrap_or_else(default_schema_path);
    let registry = SchemaRegistry::load_legacy_token_schemas(&schema_root).into_diagnostic()?;
    let exceptions = load_exceptions(exceptions_path.as_deref())?;
    let report =
        validate::validate_all_with_exceptions(path, &registry, &exceptions).into_diagnostic()?;
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
            exceptions_path,
            dimensions_path,
            strict,
        } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            run_validate(&target, format, schema_path, exceptions_path, dimensions_path, strict)
        }
        Commands::Resolve {
            property,
            path,
            dimensions_path,
            color_scheme,
            scale,
            contrast,
            format,
        } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            run_resolve(
                &property,
                &target,
                dimensions_path,
                color_scheme,
                scale,
                contrast,
                format,
            )
        }
        Commands::Migrate { sub } => match sub {
            MigrateSub::Verify {
                path,
                snapshot,
                schema_path,
                exceptions_path,
            } => run_migrate_verify(&path, &snapshot, schema_path, exceptions_path),
            MigrateSub::Snapshot {
                path,
                output,
                schema_path,
                exceptions_path,
            } => run_migrate_snapshot(&path, &output, schema_path, exceptions_path),
            MigrateSub::Convert { input, output } => run_migrate_convert(&input, &output),
            MigrateSub::LegacyOutput { input, output } => {
                run_migrate_legacy_output(&input, &output)
            }
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
