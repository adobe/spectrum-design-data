// Copyright 2026 Adobe. All rights reserved.

//! `design-data spec-sheet <component>`: loads the dataset, builds sheets with the
//! `design-data-spec-sheet` plugin and writes them. The sheet model lives in the plugin crate.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use design_data_core::graph::TokenGraph;
use design_data_core::text_metrics::TextMetrics;
use design_data_spec_sheet::{build_sheet, components_with_relationships, index_entry};
use miette::{IntoDiagnostic, WrapErr};
use serde_json::{json, Value};

fn read_changelog(p: &Path) -> miette::Result<Value> {
    let text = std::fs::read_to_string(p)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to read {}", p.display()))?;
    serde_json::from_str::<Value>(&text).into_diagnostic()
}

fn write_text(p: &Path, text: String) -> miette::Result<()> {
    std::fs::write(p, text + "\n")
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to write {}", p.display()))
}

/// `--all`: one sheet per component with relationships in `out_dir`, plus `index.json`
/// (component, visual, counts, and version / latest release from `changelog_dir`).
fn run_all(
    graph: &TokenGraph,
    registry: &Path,
    size: &str,
    changelog_dir: Option<&Path>,
    out_dir: &Path,
    text_metrics: Option<&TextMetrics>,
    svg: bool,
) -> miette::Result<ExitCode> {
    std::fs::create_dir_all(out_dir)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to create {}", out_dir.display()))?;
    let mut index = Vec::new();
    for component in components_with_relationships(graph) {
        let changelog = match changelog_dir.map(|d| d.join(format!("{component}.json"))) {
            Some(p) if p.is_file() => Some(read_changelog(&p)?),
            _ => None,
        };
        let sheet = build_sheet(
            graph,
            registry,
            &component,
            size,
            changelog.as_ref(),
            text_metrics,
            svg,
        )
        .map_err(|e| miette::miette!(e))?;
        let entry = index_entry(&sheet, &component, changelog.as_ref());
        index.push(entry);

        write_text(
            &out_dir.join(format!("{component}.json")),
            serde_json::to_string_pretty(&sheet).into_diagnostic()?,
        )?;
    }
    let text = serde_json::to_string_pretty(&json!({"components": index})).into_diagnostic()?;
    write_text(&out_dir.join("index.json"), text)?;
    eprintln!("wrote {} sheets to {}", index.len(), out_dir.display());
    Ok(ExitCode::SUCCESS)
}

#[allow(clippy::too_many_arguments)]
pub fn run(
    component: Option<String>,
    all: bool,
    size: String,
    changelog: Option<PathBuf>,
    changelog_dir: Option<PathBuf>,
    path: Option<PathBuf>,
    output: Option<PathBuf>,
    text_metrics: Option<PathBuf>,
    svg: bool,
) -> miette::Result<ExitCode> {
    let text_metrics = super::load_text_metrics(text_metrics.as_deref())?;
    let (graph, visuals_dir, _) = super::load_visual_env(path, None, true)?;
    let registry = visuals_dir
        .parent()
        .map(|p| p.join("registry"))
        .unwrap_or_default();
    if all {
        let out_dir = output.ok_or_else(|| miette::miette!("--all needs --output <DIR>"))?;
        return run_all(
            &graph,
            &registry,
            &size,
            changelog_dir.as_deref(),
            &out_dir,
            text_metrics.as_ref(),
            svg,
        );
    }
    let component = component.ok_or_else(|| miette::miette!("give a component or --all"))?;
    if !components_with_relationships(&graph)
        .contains(&graph.canonical_component(&component).to_string())
    {
        return Err(miette::miette!("no relationships for '{component}'"));
    }
    let changelog = changelog.as_deref().map(read_changelog).transpose()?;
    let sheet = build_sheet(
        &graph,
        &registry,
        &component,
        &size,
        changelog.as_ref(),
        text_metrics.as_ref(),
        svg,
    )
    .map_err(|e| miette::miette!(e))?;
    let text = serde_json::to_string_pretty(&sheet).into_diagnostic()?;
    match output {
        Some(p) => write_text(&p, text)?,
        None => println!("{text}"),
    }
    Ok(ExitCode::SUCCESS)
}
