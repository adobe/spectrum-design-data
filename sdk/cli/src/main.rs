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

use chrono::Utc;

mod format;

use std::collections::HashSet;

use clap::{Parser, Subcommand, ValueEnum};
use design_data_core::cascade::{resolve, ResolutionContext};
use design_data_core::compat::{
    load_snapshot, snapshot_matches, write_snapshot, ValidationSnapshot,
};
use design_data_core::diff;
use design_data_core::diff::display_name;
use design_data_core::figma;
use design_data_core::graph::TokenGraph;
use design_data_core::legacy;
use design_data_core::migrate;
use design_data_core::naming::NamingExceptionsFile;
use design_data_core::query;
use design_data_core::schema::SchemaRegistry;
use design_data_core::validate;
use miette::{IntoDiagnostic, WrapErr};

const SPEC_VERSION: &str = "1.0.0-draft";

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
        /// Directory containing spec-format component declaration JSON files (enables SPEC-028/029 on components)
        #[arg(long, value_name = "DIR")]
        components_path: Option<PathBuf>,
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
    /// Compare two token datasets and report changes
    Diff {
        /// Directory containing the old/before token dataset
        #[arg(value_name = "OLD")]
        old: PathBuf,
        /// Directory containing the new/after token dataset
        #[arg(value_name = "NEW")]
        new: PathBuf,
        /// Output format
        #[arg(long, value_enum, default_value_t = DiffFormat::Pretty)]
        format: DiffFormat,
        /// Filter to scope diff to matching tokens (query notation)
        #[arg(long, value_name = "EXPR")]
        filter: Option<String>,
    },
    /// Filter and list tokens matching a query expression
    Query {
        /// Path to token dataset directory
        #[arg(value_name = "PATH")]
        path: Option<PathBuf>,
        /// Filter expression (e.g. "component=button,state=hover")
        #[arg(long, value_name = "EXPR")]
        filter: String,
        /// Output format
        #[arg(long, value_enum, default_value_t = OutputFormat::Pretty)]
        format: OutputFormat,
        /// Output only the match count
        #[arg(long)]
        count: bool,
    },
    /// Snapshot and backward-compat verification helpers
    Migrate {
        #[command(subcommand)]
        sub: MigrateSub,
    },
    /// Interact with Figma Variables REST API
    Figma {
        #[command(subcommand)]
        sub: FigmaSub,
    },
    /// Emit a structural overview of the dataset for agent session start
    Primer {
        /// Path to the token dataset directory
        #[arg(value_name = "PATH")]
        path: Option<PathBuf>,
        /// Output format
        #[arg(long, value_enum, default_value_t = OutputFormat::Pretty)]
        format: OutputFormat,
        /// Override components directory
        #[arg(long, value_name = "DIR")]
        components_dir: Option<PathBuf>,
        /// Override taxonomy fields directory
        #[arg(long, value_name = "DIR")]
        fields_dir: Option<PathBuf>,
        /// Override dimensions directory
        #[arg(long, value_name = "DIR")]
        dimensions_dir: Option<PathBuf>,
    },
    /// Return the full component declaration for a given component identifier
    Component {
        /// Component identifier (e.g. "button", "action-bar")
        #[arg(value_name = "ID")]
        id: String,
        /// Override components directory
        #[arg(long, value_name = "DIR")]
        components_dir: Option<PathBuf>,
    },
    /// Create or update a product-context.json document for a product-layer working copy
    Write {
        /// Path to the product context JSON file to create or update
        #[arg(short, long, value_name = "FILE", default_value = "product-context.json")]
        output: PathBuf,
        /// Why this product-layer working copy exists (recorded in the document's rationale field)
        #[arg(short, long, value_name = "TEXT")]
        rationale: Option<String>,
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
    /// Add missing outer-level UUIDs to set tokens in legacy JSON files (in-place)
    AddUuids {
        /// Directory containing legacy .json token files to update
        #[arg(value_name = "DIR")]
        dir: PathBuf,
    },
    /// Verify that the legacy → cascade → legacy roundtrip is clean
    RoundtripVerify {
        /// Legacy source directory to roundtrip (e.g. packages/tokens/src)
        #[arg(value_name = "PATH")]
        path: PathBuf,
    },
}

#[derive(Subcommand)]
enum FigmaSub {
    /// Read existing variables from a Figma file
    Read {
        /// Figma file key (from the URL: figma.com/design/<file_key>/...)
        #[arg(long)]
        file_key: String,
        /// Figma personal access token (or set FIGMA_TOKEN env var)
        #[arg(long, env = "FIGMA_TOKEN")]
        token: String,
        /// Output format (pretty or json)
        #[arg(long, value_enum, default_value_t = OutputFormat::Pretty)]
        format: OutputFormat,
    },
    /// Export legacy tokens as Figma Variables
    Export {
        /// Path to legacy token source directory
        #[arg(value_name = "PATH")]
        path: PathBuf,
        /// Figma file key to target
        #[arg(long)]
        file_key: String,
        /// Figma personal access token (or set FIGMA_TOKEN env var)
        #[arg(long, env = "FIGMA_TOKEN")]
        token: String,
        /// Generate payload without calling the API
        #[arg(long)]
        dry_run: bool,
    },
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum OutputFormat {
    #[default]
    Pretty,
    Json,
}

/// Output format for the `diff` command (superset of `OutputFormat` — adds `markdown`).
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum DiffFormat {
    #[default]
    Pretty,
    Json,
    Markdown,
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

fn default_components_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("packages/design-data-spec/components"),
        PathBuf::from("../packages/design-data-spec/components"),
    ];
    candidates.into_iter().find(|c| c.is_dir())
}

fn default_fields_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("packages/design-data-spec/fields"),
        PathBuf::from("../packages/design-data-spec/fields"),
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
    components_path: Option<PathBuf>,
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
    let comps_dir = components_path.or_else(default_components_path);

    let report = validate::validate_all_with_options(
        path,
        &registry,
        &exceptions,
        dims_dir.as_deref(),
        comps_dir.as_deref(),
    )
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

fn run_migrate_add_uuids(dir: &Path) -> miette::Result<ExitCode> {
    let summary = migrate::add_uuids(dir)
        .into_diagnostic()
        .wrap_err_with(|| format!("add-uuids failed: {}", dir.display()))?;
    println!(
        "Scanned {} file(s): {} UUID(s) added across {} file(s)",
        summary.files_scanned, summary.uuids_added, summary.files_modified,
    );
    Ok(ExitCode::SUCCESS)
}

fn run_migrate_roundtrip_verify(path: &Path) -> miette::Result<ExitCode> {
    let diffs = legacy::roundtrip_verify(path)
        .into_diagnostic()
        .wrap_err_with(|| format!("roundtrip-verify failed: {}", path.display()))?;
    if diffs.is_empty() {
        println!("Roundtrip OK: {}", path.display());
        return Ok(ExitCode::SUCCESS);
    }
    for d in &diffs {
        if d.token.is_empty() {
            eprintln!("  {}: {}", d.file, d.detail);
        } else {
            eprintln!("  {}/{}: {}", d.file, d.token, d.detail);
        }
    }
    eprintln!("{} difference(s) found", diffs.len());
    Ok(ExitCode::from(1))
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

fn run_diff(
    old_path: &Path,
    new_path: &Path,
    format: DiffFormat,
    filter_expr: Option<&str>,
) -> miette::Result<ExitCode> {
    let old_graph = TokenGraph::from_json_dir(old_path)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load old tokens from {}", old_path.display()))?;
    let new_graph = TokenGraph::from_json_dir(new_path)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load new tokens from {}", new_path.display()))?;

    // Optionally filter both graphs to matching tokens before diffing.
    let (old_filtered, new_filtered) = if let Some(expr_str) = filter_expr {
        let expr = query::parse(expr_str)
            .into_diagnostic()
            .wrap_err("failed to parse --filter expression")?;
        let old_matched = query::filter(&old_graph, &expr);
        let new_matched = query::filter(&new_graph, &expr);
        (
            TokenGraph::from_pairs(
                old_matched
                    .iter()
                    .map(|t| (t.name.clone(), t.file.clone(), t.raw.clone()))
                    .collect(),
            ),
            TokenGraph::from_pairs(
                new_matched
                    .iter()
                    .map(|t| (t.name.clone(), t.file.clone(), t.raw.clone()))
                    .collect(),
            ),
        )
    } else {
        (old_graph, new_graph)
    };

    let report = diff::semantic_diff(&old_filtered, &new_filtered);

    match format {
        DiffFormat::Json => {
            println!(
                "{}",
                serde_json::to_string_pretty(&report).into_diagnostic()?
            );
        }
        DiffFormat::Markdown => {
            print!("{}", format::format_diff_markdown(&report));
        }
        DiffFormat::Pretty => {
            format::print_diff_pretty(&report);
        }
    }

    if report.is_empty() {
        Ok(ExitCode::SUCCESS)
    } else {
        Ok(ExitCode::from(1))
    }
}

fn run_query(
    path: &Path,
    filter_expr: &str,
    format: OutputFormat,
    count_only: bool,
) -> miette::Result<ExitCode> {
    let graph = TokenGraph::from_json_dir(path)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;

    let expr = query::parse(filter_expr)
        .into_diagnostic()
        .wrap_err("failed to parse filter expression")?;

    let results = query::filter(&graph, &expr);

    if count_only {
        println!("{}", results.len());
        return if results.is_empty() {
            Ok(ExitCode::from(1))
        } else {
            Ok(ExitCode::SUCCESS)
        };
    }

    match format {
        OutputFormat::Json => {
            let raw_values: Vec<&serde_json::Value> = results.iter().map(|t| &t.raw).collect();
            println!(
                "{}",
                serde_json::to_string_pretty(&raw_values).into_diagnostic()?
            );
        }
        OutputFormat::Pretty => {
            if results.is_empty() {
                println!("No matching tokens.");
            } else {
                println!("{} token(s) matched:\n", results.len());
                for t in &results {
                    let name = display_name(t);
                    let uuid = t.uuid.as_deref().unwrap_or("-");
                    let schema = t.raw.get("$schema").and_then(|v| v.as_str()).unwrap_or("-");
                    println!("  {name}");
                    println!("    UUID:    {uuid}");
                    println!("    Schema:  {schema}");
                    println!("    File:    {}", t.file.display());
                    println!();
                }
            }
        }
    }

    if results.is_empty() {
        Ok(ExitCode::from(1))
    } else {
        Ok(ExitCode::SUCCESS)
    }
}

fn run_figma_export(
    path: &Path,
    file_key: &str,
    token: &str,
    dry_run: bool,
) -> miette::Result<ExitCode> {
    let rt = tokio::runtime::Runtime::new().into_diagnostic()?;
    let client = figma::api::FigmaClient::new(token.to_string());

    // 1. GET existing variables to obtain collection/mode IDs.
    eprintln!("Fetching existing variables from Figma...");
    let response = rt
        .block_on(client.get_local_variables(file_key))
        .map_err(|e| miette::miette!("{e}"))?;

    // 2. Build the export payload.
    eprintln!("Building export payload from {}...", path.display());
    let (body, summary) = figma::mapping::build_export_payload(path, &response.meta)
        .map_err(|e| miette::miette!("{e}"))?;

    // 3. Output or post.
    if dry_run {
        println!("{}", serde_json::to_string_pretty(&body).into_diagnostic()?);
    } else {
        eprintln!(
            "Posting {} variables to Figma...",
            summary.variables_created
        );
        let post_response = rt
            .block_on(client.post_variables(file_key, &body))
            .map_err(|e| miette::miette!("{e}"))?;
        eprintln!(
            "Done. {} ID mappings returned.",
            post_response.meta.temp_id_to_real_id.len()
        );
    }

    // 4. Print summary to stderr.
    eprintln!(
        "\nSummary: {} variables, {} mode values",
        summary.variables_created, summary.mode_values_set
    );
    if !summary.skipped_composite.is_empty() {
        eprintln!("  Skipped (composite): {}", summary.skipped_composite.len());
    }
    if !summary.skipped_alias_unresolved.is_empty() {
        eprintln!(
            "  Skipped (unresolved alias): {}",
            summary.skipped_alias_unresolved.len()
        );
    }
    if !summary.skipped_unknown_schema.is_empty() {
        eprintln!(
            "  Skipped (unknown schema): {}",
            summary.skipped_unknown_schema.len()
        );
    }
    if !summary.skipped_unparseable_value.is_empty() {
        eprintln!(
            "  Skipped (unparseable value): {} — {:?}",
            summary.skipped_unparseable_value.len(),
            summary.skipped_unparseable_value,
        );
    }

    Ok(ExitCode::SUCCESS)
}

fn run_figma_read(file_key: &str, token: &str, format: OutputFormat) -> miette::Result<ExitCode> {
    let rt = tokio::runtime::Runtime::new().into_diagnostic()?;
    let client = figma::api::FigmaClient::new(token.to_string());

    let response = rt
        .block_on(client.get_local_variables(file_key))
        .map_err(|e| miette::miette!("{e}"))?;

    match format {
        OutputFormat::Json => {
            println!(
                "{}",
                serde_json::to_string_pretty(&response.meta).into_diagnostic()?
            );
        }
        OutputFormat::Pretty => {
            let meta = &response.meta;
            println!(
                "{} collection(s), {} variable(s)\n",
                meta.variable_collections.len(),
                meta.variables.len()
            );

            // Sort collections by name for stable output.
            let mut collections: Vec<_> = meta.variable_collections.values().collect();
            collections.sort_by(|a, b| a.name.cmp(&b.name));

            for col in &collections {
                let mode_names: Vec<&str> = col.modes.iter().map(|m| m.name.as_str()).collect();
                println!(
                    "Collection: \"{}\" ({} mode(s): {})",
                    col.name,
                    col.modes.len(),
                    mode_names.join(", ")
                );

                // Collect variables belonging to this collection.
                let mut vars: Vec<&figma::types::FigmaVariable> = meta
                    .variables
                    .values()
                    .filter(|v| v.variable_collection_id == col.id && !v.remote)
                    .collect();
                vars.sort_by(|a, b| a.name.cmp(&b.name));

                println!("  Variables: {}", vars.len());

                // Show first 5 samples.
                for v in vars.iter().take(5) {
                    println!("  Sample: {} [{}]", v.name, v.resolved_type);
                }
                if vars.len() > 5 {
                    println!("  ... and {} more", vars.len() - 5);
                }
                println!();
            }
        }
    }

    Ok(ExitCode::SUCCESS)
}

fn scan_json_name_field(dir: &Path) -> Vec<String> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return vec![];
    };
    let mut names: Vec<String> = entries
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if p.extension().and_then(|x| x.to_str()) != Some("json") {
                return None;
            }
            let raw = std::fs::read_to_string(&p).ok()?;
            let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
            v.get("name")?.as_str().map(|s| s.to_string())
        })
        .collect();
    names.sort();
    names
}

fn run_primer(
    path: &Path,
    format: OutputFormat,
    components_dir: Option<PathBuf>,
    fields_dir: Option<PathBuf>,
    dimensions_dir: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let graph = TokenGraph::from_json_dir(path)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load tokens from {}", path.display()))?;
    let token_count = graph.tokens.len();

    let dims_dir = dimensions_dir.or_else(default_dimensions_path);
    let dimensions: Vec<serde_json::Value> = if let Some(dir) = dims_dir {
        TokenGraph::load_spec_dimensions(&dir)
            .unwrap_or_default()
            .into_iter()
            .map(|d| {
                serde_json::json!({
                    "name": d.name,
                    "modes": d.modes,
                    "defaultMode": d.default_mode,
                })
            })
            .collect()
    } else {
        vec![]
    };

    let components = scan_json_name_field(
        &components_dir
            .or_else(default_components_path)
            .unwrap_or_else(|| PathBuf::from("packages/design-data-spec/components")),
    );

    let taxonomy_fields: Vec<serde_json::Value> = fields_dir
        .or_else(default_fields_path)
        .map(|dir| {
            let Ok(entries) = std::fs::read_dir(&dir) else {
                return vec![];
            };
            let mut fields: Vec<serde_json::Value> = entries
                .flatten()
                .filter_map(|e| {
                    let p = e.path();
                    if p.extension().and_then(|x| x.to_str()) != Some("json") {
                        return None;
                    }
                    let raw = std::fs::read_to_string(&p).ok()?;
                    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
                    let name = v.get("name")?.as_str()?.to_string();
                    let required = v.get("required").and_then(|r| r.as_bool()).unwrap_or(false);
                    let mut field = serde_json::json!({
                        "name": name,
                        "required": required,
                    });
                    if let Some(desc) = v.get("description") {
                        if !desc.is_null() {
                            field["description"] = desc.clone();
                        }
                    }
                    Some(field)
                })
                .collect();
            fields.sort_by_key(|f| f["name"].as_str().unwrap_or("").to_string());
            fields
        })
        .unwrap_or_default();

    let manifest: serde_json::Value = {
        let mp = path.join("manifest.json");
        if mp.is_file() {
            std::fs::read_to_string(&mp)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or(serde_json::Value::Null)
        } else {
            serde_json::Value::Null
        }
    };

    let payload = serde_json::json!({
        "specVersion": SPEC_VERSION,
        "tokenCount": token_count,
        "dimensions": dimensions,
        "components": components,
        "taxonomyFields": taxonomy_fields,
        "manifest": manifest,
    });

    match format {
        OutputFormat::Json => {
            println!(
                "{}",
                serde_json::to_string_pretty(&payload).into_diagnostic()?
            );
        }
        OutputFormat::Pretty => {
            let dim_summary: Vec<String> = dimensions
                .iter()
                .map(|d| {
                    let name = d["name"].as_str().unwrap_or("");
                    let default = d["defaultMode"].as_str().unwrap_or("");
                    let mode_str = d["modes"]
                        .as_array()
                        .map(Vec::as_slice)
                        .unwrap_or(&[])
                        .iter()
                        .filter_map(|m| m.as_str())
                        .map(|m| {
                            if m == default {
                                format!("{m}*")
                            } else {
                                m.to_string()
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("|");
                    format!("{name} ({mode_str})")
                })
                .collect();
            const COMPONENT_PREVIEW_COUNT: usize = 8;
            let comp_count = components.len();
            let comp_preview = if comp_count > COMPONENT_PREVIEW_COUNT {
                format!(
                    "{}, … and {} more",
                    components[..COMPONENT_PREVIEW_COUNT].join(", "),
                    comp_count - COMPONENT_PREVIEW_COUNT
                )
            } else {
                components.join(", ")
            };
            println!("Spec version:  {SPEC_VERSION}");
            println!("Token count:   {token_count}");
            println!("Dimensions:    {}", dim_summary.join(", "));
            println!("Components:    {comp_preview}");
            println!("Fields:        {}", taxonomy_fields.len());
            println!(
                "Manifest:      {}",
                if manifest.is_null() { "none" } else { "present" }
            );
        }
    }

    Ok(ExitCode::SUCCESS)
}

fn run_component(id: &str, components_dir: Option<PathBuf>) -> miette::Result<ExitCode> {
    // Reject IDs that could escape the components directory via path traversal.
    if !id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        || id.is_empty()
        || !id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
    {
        eprintln!("Invalid component ID '{id}'. IDs must match ^[a-z][a-z0-9-]*$");
        return Ok(ExitCode::from(1));
    }

    let dir = components_dir
        .or_else(default_components_path)
        .ok_or_else(|| miette::miette!("could not locate components directory"))?;

    let file = dir.join(format!("{id}.json"));
    if file.is_file() {
        let raw = std::fs::read_to_string(&file)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to read {}", file.display()))?;
        let doc: serde_json::Value = serde_json::from_str(&raw)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to parse {}", file.display()))?;
        println!("{}", serde_json::to_string_pretty(&doc).into_diagnostic()?);
        return Ok(ExitCode::SUCCESS);
    }

    let available = scan_json_name_field(&dir);
    eprintln!("Component '{id}' not found.");
    if available.is_empty() {
        eprintln!("No components found in {}", dir.display());
    } else {
        eprintln!("Available components: {}", available.join(", "));
    }
    Ok(ExitCode::from(1))
}

fn run_write(output: &Path, rationale: Option<&str>) -> miette::Result<ExitCode> {
    let mut doc: serde_json::Value = if output.exists() {
        let raw = std::fs::read_to_string(output)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to read {}", output.display()))?;
        serde_json::from_str(&raw)
            .into_diagnostic()
            .wrap_err("failed to parse existing product-context.json")?
    } else {
        // Build in spec field order: specVersion → layer → createdBy → createdAt.
        // rationale is inserted after layer when present (see below).
        let mut map = serde_json::Map::new();
        map.insert(
            "specVersion".to_string(),
            serde_json::Value::String(SPEC_VERSION.to_string()),
        );
        map.insert(
            "layer".to_string(),
            serde_json::Value::String("product".to_string()),
        );
        if let Some(r) = rationale {
            map.insert(
                "rationale".to_string(),
                serde_json::Value::String(r.to_string()),
            );
        }
        map.insert(
            "createdBy".to_string(),
            serde_json::json!({ "type": "agent", "tool": "design-data" }),
        );
        map.insert(
            "createdAt".to_string(),
            serde_json::Value::String(
                Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            ),
        );
        serde_json::Value::Object(map)
    };

    if output.exists() {
        if let Some(r) = rationale {
            doc["rationale"] = serde_json::Value::String(r.to_string());
        }
    }

    if let Some(parent) = output.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .into_diagnostic()
                .wrap_err_with(|| {
                    format!("failed to create parent directory {}", parent.display())
                })?;
        }
    }

    let json = serde_json::to_string_pretty(&doc)
        .into_diagnostic()
        .wrap_err("failed to serialize product context")?;
    std::fs::write(output, json + "\n")
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to write {}", output.display()))?;

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
            components_path,
            strict,
        } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            run_validate(
                &target,
                format,
                schema_path,
                exceptions_path,
                dimensions_path,
                components_path,
                strict,
            )
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
        Commands::Diff {
            old,
            new,
            format,
            filter,
        } => run_diff(&old, &new, format, filter.as_deref()),
        Commands::Query {
            path,
            filter,
            format,
            count,
        } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            run_query(&target, &filter, format, count)
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
            MigrateSub::AddUuids { dir } => run_migrate_add_uuids(&dir),
            MigrateSub::RoundtripVerify { path } => run_migrate_roundtrip_verify(&path),
        },
        Commands::Figma { sub } => match sub {
            FigmaSub::Read {
                file_key,
                token,
                format,
            } => run_figma_read(&file_key, &token, format),
            FigmaSub::Export {
                path,
                file_key,
                token,
                dry_run,
            } => run_figma_export(&path, &file_key, &token, dry_run),
        },
        Commands::Primer {
            path,
            format,
            components_dir,
            fields_dir,
            dimensions_dir,
        } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            run_primer(&target, format, components_dir, fields_dir, dimensions_dir)
        }
        Commands::Component { id, components_dir } => run_component(&id, components_dir),
        Commands::Write { output, rationale } => {
            run_write(&output, rationale.as_deref())
        }
    };

    match result {
        Ok(code) => code,
        Err(e) => {
            eprintln!("Error: {e:?}");
            ExitCode::from(2)
        }
    }
}
