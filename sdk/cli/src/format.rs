// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! CLI output formatters (`pretty`, `json`, and `markdown`).

use design_data_core::diff::{ChangeType, DiffReport, PropertyChange};
use design_data_core::report::ValidationReport;

/// Human-readable stderr/stdout mix: errors on stderr, success line on stdout.
pub fn print_report_pretty(report: &ValidationReport) {
    if report.errors.is_empty() && report.warnings.is_empty() {
        println!("No issues found.");
        return;
    }
    for d in &report.errors {
        eprintln!(
            "error: {} [{}] {}",
            d.file.display(),
            d.rule_id.as_deref().unwrap_or("structural"),
            d.message
        );
        if let Some(t) = &d.token {
            eprintln!("  token: {t}");
        }
        if let Some(p) = &d.instance_path {
            eprintln!("  at: {p}");
        }
    }
    for d in &report.warnings {
        eprintln!(
            "warning: {} [{}] {}",
            d.file.display(),
            d.rule_id.as_deref().unwrap_or("?"),
            d.message
        );
    }
}

/// Full report as JSON (stdout).
pub fn format_report_json(report: &ValidationReport) -> Result<String, serde_json::Error> {
    serde_json::to_string_pretty(report)
}

// ── Diff formatters ─────────────────────────────────────────────────────────

/// Whether ANSI colors should be used.
fn use_color() -> bool {
    std::env::var("NO_COLOR").is_err()
}

/// ANSI color helpers — return empty strings when NO_COLOR is set.
fn color(code: &str) -> &str {
    if use_color() {
        code
    } else {
        ""
    }
}

const RESET: &str = "\x1b[0m";
const GREEN: &str = "\x1b[32m";
const RED: &str = "\x1b[31m";
const YELLOW: &str = "\x1b[33m";
const CYAN: &str = "\x1b[36m";
const MAGENTA: &str = "\x1b[35m";

/// Human-readable diff report on stdout with ANSI colors.
pub fn print_diff_pretty(report: &DiffReport) {
    if report.is_empty() {
        println!("No changes.");
        return;
    }

    // Summary line.
    let mut parts = Vec::new();
    if !report.renamed.is_empty() {
        parts.push(format!("{} renamed", report.renamed.len()));
    }
    if !report.deprecated.is_empty() {
        parts.push(format!("{} deprecated", report.deprecated.len()));
    }
    if !report.reverted.is_empty() {
        parts.push(format!("{} reverted", report.reverted.len()));
    }
    if !report.added.is_empty() {
        parts.push(format!("{} added", report.added.len()));
    }
    if !report.deleted.is_empty() {
        parts.push(format!("{} deleted", report.deleted.len()));
    }
    if !report.updated.is_empty() {
        parts.push(format!("{} updated", report.updated.len()));
    }
    println!("{}\n", parts.join(", "));

    // Renamed.
    for t in &report.renamed {
        println!(
            "  {c}renamed{r}  {} → {}",
            t.old_name,
            t.new_name,
            c = color(CYAN),
            r = color(RESET),
        );
        print_property_changes_pretty(&t.property_changes);
    }

    // Deprecated.
    for t in &report.deprecated {
        println!(
            "  {c}deprecated{r}  {}",
            t.name,
            c = color(MAGENTA),
            r = color(RESET),
        );
    }

    // Reverted.
    for t in &report.reverted {
        println!(
            "  {c}reverted{r}  {}",
            t.name,
            c = color(MAGENTA),
            r = color(RESET),
        );
    }

    // Added.
    for t in &report.added {
        println!(
            "  {c}added{r}  {}",
            t.name,
            c = color(GREEN),
            r = color(RESET),
        );
    }

    // Deleted.
    for t in &report.deleted {
        println!(
            "  {c}deleted{r}  {}",
            t.name,
            c = color(RED),
            r = color(RESET),
        );
    }

    // Updated.
    for t in &report.updated {
        println!(
            "  {c}updated{r}  {}",
            t.name,
            c = color(YELLOW),
            r = color(RESET),
        );
        print_property_changes_pretty(&t.property_changes);
    }
}

fn print_property_changes_pretty(changes: &[PropertyChange]) {
    for c in changes {
        match c.change_type {
            ChangeType::Added => {
                println!(
                    "    {g}+{r} {}: {}",
                    c.path,
                    fmt_value(&c.new_value),
                    g = color(GREEN),
                    r = color(RESET),
                );
            }
            ChangeType::Deleted => {
                println!(
                    "    {rd}-{r} {}: {}",
                    c.path,
                    fmt_value(&c.original_value),
                    rd = color(RED),
                    r = color(RESET),
                );
            }
            ChangeType::Updated => {
                println!(
                    "    {y}~{r} {}: {} → {}",
                    c.path,
                    fmt_value(&c.original_value),
                    fmt_value(&c.new_value),
                    y = color(YELLOW),
                    r = color(RESET),
                );
            }
        }
    }
}

fn fmt_value(v: &Option<serde_json::Value>) -> String {
    match v {
        Some(val) => {
            if let Some(s) = val.as_str() {
                s.to_string()
            } else {
                val.to_string()
            }
        }
        None => "-".to_string(),
    }
}

/// Markdown-formatted diff report for changelogs.
pub fn format_diff_markdown(report: &DiffReport) -> String {
    let mut out = String::new();

    if report.is_empty() {
        out.push_str("No changes.\n");
        return out;
    }

    // Summary.
    let total = report.renamed.len()
        + report.deprecated.len()
        + report.reverted.len()
        + report.added.len()
        + report.deleted.len()
        + report.updated.len();
    out.push_str(&format!("**{total} token(s) changed.**\n\n"));

    if !report.renamed.is_empty() {
        out.push_str(&format!("## Renamed ({})\n\n", report.renamed.len()));
        for t in &report.renamed {
            out.push_str(&format!("- `{}` → `{}`\n", t.old_name, t.new_name));
            format_property_changes_md(&t.property_changes, &mut out);
        }
        out.push('\n');
    }

    if !report.deprecated.is_empty() {
        out.push_str(&format!("## Deprecated ({})\n\n", report.deprecated.len()));
        for t in &report.deprecated {
            out.push_str(&format!("- `{}`\n", t.name));
        }
        out.push('\n');
    }

    if !report.reverted.is_empty() {
        out.push_str(&format!("## Reverted ({})\n\n", report.reverted.len()));
        for t in &report.reverted {
            out.push_str(&format!("- `{}`\n", t.name));
        }
        out.push('\n');
    }

    if !report.added.is_empty() {
        out.push_str(&format!("## Added ({})\n\n", report.added.len()));
        for t in &report.added {
            out.push_str(&format!("- `{}`\n", t.name));
        }
        out.push('\n');
    }

    if !report.deleted.is_empty() {
        out.push_str(&format!("## Deleted ({})\n\n", report.deleted.len()));
        for t in &report.deleted {
            out.push_str(&format!("- `{}`\n", t.name));
        }
        out.push('\n');
    }

    if !report.updated.is_empty() {
        out.push_str(&format!("## Updated ({})\n\n", report.updated.len()));
        for t in &report.updated {
            out.push_str(&format!("- `{}`\n", t.name));
            format_property_changes_md(&t.property_changes, &mut out);
        }
        out.push('\n');
    }

    out
}

fn format_property_changes_md(changes: &[PropertyChange], out: &mut String) {
    for c in changes {
        match c.change_type {
            ChangeType::Added => {
                out.push_str(&format!(
                    "  - **+** `{}`: {}\n",
                    c.path,
                    fmt_value(&c.new_value),
                ));
            }
            ChangeType::Deleted => {
                out.push_str(&format!(
                    "  - **-** `{}`: {}\n",
                    c.path,
                    fmt_value(&c.original_value),
                ));
            }
            ChangeType::Updated => {
                out.push_str(&format!(
                    "  - **~** `{}`: {} → {}\n",
                    c.path,
                    fmt_value(&c.original_value),
                    fmt_value(&c.new_value),
                ));
            }
        }
    }
}
