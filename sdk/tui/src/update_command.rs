// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Command dispatch and selection helpers, extracted from `update.rs` for size budget.

use std::collections::HashSet;

use design_data_core::cascade::{self, specificity};
use design_data_core::diff::display_name;
use design_data_core::graph::TokenRecord;

use crate::app::{
    ActiveView, DescribeView, HitAction, HitRegion, Modal, QueryRow, QueryView, ResolvedRow,
    ResolveView, StatusMessage, ValidateView, layer_str, parse_resolve_args,
};
use crate::find::FindWizardState;
use crate::message::Message;
use crate::model::Model;
use crate::naming::NamingWizardState;
use crate::task::Task;
use crate::update::UpdateCtx;
use crate::wizard::WizardState;

// ── Selection helper ──────────────────────────────────────────────────────────

/// Extract text from hit regions within a rectangular selection.
pub(crate) fn extract_selection_from_regions(
    regions: &[HitRegion],
    start: (u16, u16),
    end: (u16, u16),
) -> Option<String> {
    let (r1, c1) = start;
    let (r2, c2) = end;
    let min_row = r1.min(r2);
    let max_row = r1.max(r2);
    let min_col = c1.min(c2);
    let max_col = c1.max(c2);
    let mut lines: Vec<&str> = Vec::new();
    for region in regions {
        let ry = region.rect.y;
        let rx = region.rect.x;
        let rx_end = rx + region.rect.width;
        if ry >= min_row && ry <= max_row && rx_end > min_col && rx <= max_col {
            lines.push(&region.text);
        }
    }
    if lines.is_empty() { None } else { Some(lines.join("\n")) }
}

// ── Command dispatch ──────────────────────────────────────────────────────────

pub(crate) fn dispatch_command(
    model: &mut Model,
    cmd: &str,
    rest: &str,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    match cmd {
        "query" => {
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("query: expression required"));
                return Task::none();
            }
            match design_data_core::query::parse(rest) {
                Ok(expr) => {
                    let records = design_data_core::query::filter(ctx.graph, &expr);
                    let rows: Vec<QueryRow> =
                        records.iter().map(|r| QueryRow::from_record(r)).collect();
                    let count = rows.len();
                    model.active_view =
                        ActiveView::Query(QueryView::new(rest.to_string(), rows));
                    model.status_message =
                        Some(StatusMessage::info(format!("{count} token(s) matched")));
                }
                Err(e) => {
                    model.status_message =
                        Some(StatusMessage::error(format!("query error: {e}")));
                }
            }
            Task::none()
        }
        "resolve" => {
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("resolve: property=<name> required"));
                return Task::none();
            }
            let (prop, res_ctx) = match parse_resolve_args(rest) {
                Ok(v) => v,
                Err(e) => {
                    model.status_message =
                        Some(StatusMessage::error(format!("resolve: {e}")));
                    return Task::none();
                }
            };
            let candidates: Vec<TokenRecord> = ctx
                .graph
                .tokens
                .values()
                .filter(|t| {
                    t.raw
                        .get("name")
                        .and_then(|v| v.as_object())
                        .and_then(|n| n.get("property"))
                        .and_then(|v| v.as_str())
                        == Some(prop.as_str())
                })
                .cloned()
                .collect();
            if candidates.is_empty() {
                model.active_view = ActiveView::Resolve(ResolveView::new(prop, vec![]));
                model.status_message = Some(StatusMessage::info("no match"));
                return Task::none();
            }
            let filtered_graph = design_data_core::graph::TokenGraph::from_records(candidates)
                .with_mode_sets(ctx.graph.mode_sets.clone());
            let mut with_spec: Vec<(&TokenRecord, u32)> = filtered_graph
                .tokens
                .values()
                .map(|t| {
                    let s = t
                        .raw
                        .get("name")
                        .and_then(|v| v.as_object())
                        .map(|n| specificity(n, &filtered_graph.mode_sets))
                        .unwrap_or(0);
                    (t, s)
                })
                .collect();
            with_spec.sort_by(|(a, sa), (b, sb)| {
                b.layer
                    .cmp(&a.layer)
                    .then_with(|| sb.cmp(sa))
                    .then_with(|| a.file.cmp(&b.file))
                    .then_with(|| a.index.cmp(&b.index))
            });
            let winner = cascade::resolve(&filtered_graph, &res_ctx);
            let rows: Vec<ResolvedRow> = with_spec
                .iter()
                .map(|(t, spec)| {
                    let value = t
                        .raw
                        .get("value")
                        .map(|v| {
                            if v.is_string() {
                                v.as_str().unwrap_or("").to_string()
                            } else {
                                v.to_string()
                            }
                        })
                        .or_else(|| t.alias_target.clone())
                        .unwrap_or_default();
                    let file = t
                        .file
                        .file_name()
                        .map(|f| f.to_string_lossy().into_owned())
                        .unwrap_or_default();
                    let is_winner = winner.map(|w| w.name == t.name).unwrap_or(false);
                    ResolvedRow {
                        name: display_name(t),
                        value,
                        file,
                        layer: layer_str(t.layer).to_string(),
                        specificity: *spec,
                        is_winner,
                    }
                })
                .collect();
            let count = rows.len();
            model.active_view = ActiveView::Resolve(ResolveView::new(prop, rows));
            model.status_message = Some(StatusMessage::info(format!("{count} candidate(s)")));
            Task::none()
        }
        "describe" | "component" => {
            // TODO(#1023): wrap the fs::read_to_string in Task::Cmd once the
            // runtime can feed the result back as Message::DescribeDone.
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("describe: component ID required"));
                return Task::none();
            }
            let id = rest.trim();
            if id.is_empty()
                || !id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                || !id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
            {
                model.status_message =
                    Some(StatusMessage::error(format!("invalid component ID '{id}'")));
                return Task::none();
            }
            let Some(comp_dir) = ctx.components_dir else {
                model.status_message = Some(StatusMessage::error(
                    "describe: no components directory available",
                ));
                return Task::none();
            };
            let file_path = comp_dir.join(format!("{id}.json"));
            if file_path.is_file() {
                match std::fs::read_to_string(&file_path) {
                    Ok(raw_text) => match serde_json::from_str::<serde_json::Value>(&raw_text) {
                        Ok(doc) => match serde_json::to_string_pretty(&doc) {
                            Ok(pretty) => {
                                model.active_view = ActiveView::Describe(DescribeView {
                                    component: id.to_string(),
                                    pretty_json: pretty,
                                    scroll: 0,
                                });
                                model.status_message = None;
                            }
                            Err(e) => {
                                model.status_message = Some(StatusMessage::error(
                                    format!("describe: render error: {e}"),
                                ));
                            }
                        },
                        Err(e) => {
                            model.status_message = Some(StatusMessage::error(
                                format!("describe: parse error: {e}"),
                            ));
                        }
                    },
                    Err(e) => {
                        model.status_message = Some(StatusMessage::error(
                            format!("describe: read error: {e}"),
                        ));
                    }
                }
            } else {
                let available: Vec<&str> =
                    ctx.graph.components.iter().map(|c| c.name.as_str()).collect();
                let suggestion = build_did_you_mean(id, &available);
                model.status_message = Some(StatusMessage::error(format!(
                    "component '{id}' not found{suggestion}"
                )));
            }
            Task::none()
        }
        "validate" => {
            // TODO(#1023): wrap validate_all_with_options_and_names in Task::Cmd.
            let (Some(dataset_path), Some(schema_registry)) =
                (ctx.dataset_path, ctx.schema_registry)
            else {
                model.status_message = Some(StatusMessage::error(
                    "validate: requires --dataset and schema registry",
                ));
                return Task::none();
            };
            use design_data_core::validate;
            match validate::validate_all_with_options_and_names(
                dataset_path,
                schema_registry,
                &HashSet::new(),
                ctx.mode_sets_dir,
                ctx.components_dir,
                None,
            ) {
                Ok(report) => {
                    use crate::app::DiagnosticRow;
                    let rows: Vec<DiagnosticRow> = report
                        .errors
                        .iter()
                        .map(|d| DiagnosticRow {
                            severity: "error".to_string(),
                            rule_id: d.rule_id.clone().unwrap_or_default(),
                            token: d.token.clone().unwrap_or_default(),
                            message: d.message.clone(),
                        })
                        .chain(report.warnings.iter().map(|d| DiagnosticRow {
                            severity: "warning".to_string(),
                            rule_id: d.rule_id.clone().unwrap_or_default(),
                            token: d.token.clone().unwrap_or_default(),
                            message: d.message.clone(),
                        }))
                        .collect();
                    let count = rows.len();
                    model.active_view = ActiveView::Validate(ValidateView::new(rows));
                    model.status_message =
                        Some(StatusMessage::info(format!("{count} finding(s)")));
                }
                Err(e) => {
                    model.status_message =
                        Some(StatusMessage::error(format!("validate: {e}")));
                }
            }
            Task::none()
        }
        "find" => {
            let fs = FindWizardState::new_with_intent(rest.trim());
            model.open_modal(Modal::Find(Box::new(fs)));
            model.status_message = None;
            Task::none()
        }
        "name" => {
            let mut ns = NamingWizardState::new_with_intent(rest.trim());
            ns.refresh_suggestions(ctx.graph);
            model.open_modal(Modal::Naming(Box::new(ns)));
            model.status_message = None;
            Task::none()
        }
        "new" | "create" => {
            let mut ws = WizardState::new_with_intent(rest.trim());
            ws.refresh_suggestions(ctx.graph);
            model.open_modal(Modal::Wizard(Box::new(ws)));
            model.status_message = None;
            Task::none()
        }
        other => {
            model.status_message =
                Some(StatusMessage::error(format!("unknown command: {other}")));
            Task::none()
        }
    }
}

fn build_did_you_mean(id: &str, available: &[&str]) -> String {
    if available.is_empty() {
        return String::new();
    }
    // Safe: callers validate that id is ASCII-only before reaching this point
    // (the is_ascii_lowercase / is_ascii_digit / '-' guard in dispatch_command).
    let prefix_len = id.len().min(3);
    let prefix = &id[..prefix_len];
    let mut matches: Vec<&str> = available
        .iter()
        .filter(|&&n| n.starts_with(id))
        .copied()
        .collect();
    if matches.is_empty() {
        matches = available
            .iter()
            .filter(|&&n| n.starts_with(prefix))
            .copied()
            .collect();
    }
    if matches.is_empty() {
        format!(" — available: {}", available.join(", "))
    } else {
        format!(" — did you mean: {}", matches.join(", "))
    }
}
