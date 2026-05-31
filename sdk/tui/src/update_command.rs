// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Palette command dispatch — the `handle_palette_submit` entry point and the
//! `dispatch_command` router for all `:cmd` palette commands (GH #1020).
//!
//! Extracted from `update.rs` to keep every source file within the 800-LOC budget
//! enforced by `tests/budget.rs` (GH #1018).
//!
//! The `describe` FS read and `validate` FS scan dispatch via `Task::Cmd` and
//! complete through `DescribeDone` / `ValidateDone`, keeping this dispatcher free
//! of inline I/O.

use std::collections::HashSet;

use design_data_core::cascade::resolve_property;

use crate::app::{
    parse_resolve_args, resolve_context_with_restrictions, save_palette_history, ActiveView,
    DescribeView, DiagnosticRow, Modal, QueryRow, QueryView, ResolveView, ResolvedRow,
    StatusMessage, HISTORY_CAP,
};
use crate::find::FindWizardState;
use crate::message::Message;
use crate::model::Model;
use crate::naming::NamingWizardState;
use crate::task::Task;
use crate::update::UpdateCtx;
use crate::wizard::WizardState;

// ── Palette submit ─────────────────────────────────────────────────────────────

/// Handle a committed palette command.
///
/// Called by `update` when `Message::PaletteSubmit(raw)` is received. Trims the
/// input, appends it to palette history, splits the command token from its
/// arguments, and delegates to `dispatch_command`.
pub(crate) fn handle_palette_submit(
    model: &mut Model,
    raw: String,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    // FuzzyFind never reaches here: it filters live on each keystroke (see
    // `apply_fuzzy_filter` in `update.rs`) and the runtime only dispatches
    // `PaletteSubmit` for Command-mode Enter. This path is command dispatch only.
    let raw = raw.trim().to_string();
    model.close_palette();

    // Append to history (dedupe head, cap at HISTORY_CAP).
    let history_task = if !raw.is_empty()
        && model.palette_history.first().map(|s| s.as_str()) != Some(raw.as_str())
    {
        model.palette_history.insert(0, raw.clone());
        model.palette_history.truncate(HISTORY_CAP);
        let snap = model.palette_history.clone();
        Task::cmd(move || {
            save_palette_history(&snap);
            Message::Tick
        })
    } else {
        Task::none()
    };

    let (cmd, rest) = match raw.split_once(' ') {
        Some((c, r)) => (c.to_lowercase(), r.trim().to_string()),
        None => (raw.to_lowercase(), String::new()),
    };

    let cmd_task = dispatch_command(model, &cmd, &rest, ctx);

    // Combine history save with command task.
    match (history_task, cmd_task) {
        (Task::None, t) | (t, Task::None) => t,
        (h, c) => Task::batch(vec![h, c]),
    }
}

// ── Command router ─────────────────────────────────────────────────────────────

fn dispatch_command(
    model: &mut Model,
    cmd: &str,
    rest: &str,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    match cmd {
        "query" => {
            if rest.is_empty() {
                model.status_message = Some(StatusMessage::error("query: expression required"));
                return Task::none();
            }
            match design_data_core::query::parse(rest) {
                Ok(expr) => {
                    let records = design_data_core::query::filter_with_index(
                        ctx.graph,
                        &ctx.token_index,
                        &expr,
                    );
                    let rows: Vec<QueryRow> =
                        records.iter().map(|r| QueryRow::from_record(r)).collect();
                    let count = rows.len();
                    model.active_view = ActiveView::Query(QueryView::new(rest.to_string(), rows));
                    model.status_message =
                        Some(StatusMessage::info(format!("{count} token(s) matched")));
                }
                Err(e) => {
                    model.status_message = Some(StatusMessage::error(format!("query error: {e}")));
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
                    model.status_message = Some(StatusMessage::error(format!("resolve: {e}")));
                    return Task::none();
                }
            };
            let res_ctx = resolve_context_with_restrictions(res_ctx, &ctx.mode_set_restrictions);
            let candidates = resolve_property(ctx.graph, &prop, &res_ctx);
            if candidates.is_empty() {
                model.active_view = ActiveView::Resolve(ResolveView::new(prop, vec![]));
                model.status_message = Some(StatusMessage::info("no match"));
                return Task::none();
            }
            let rows: Vec<ResolvedRow> =
                candidates.iter().map(ResolvedRow::from_candidate).collect();
            let count = rows.len();
            model.active_view = ActiveView::Resolve(ResolveView::new(prop, rows));
            model.status_message = Some(StatusMessage::info(format!("{count} candidate(s)")));
            Task::none()
        }
        "describe" | "component" => {
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("describe: component ID required"));
                return Task::none();
            }
            let id = rest.trim();
            if id.is_empty()
                || !id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                || !id
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
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
            // Own everything the FS read needs, then run it in a Task::Cmd so
            // `update` stays free of I/O.
            let id = id.to_string();
            let file_path = comp_dir.join(format!("{id}.json"));
            // The did-you-mean suggestion needs the borrowed token graph, which the
            // 'static closure can't capture, so it is computed eagerly here — even
            // when the file exists and the suggestion goes unused. It's a cheap
            // prefix scan over component names, so the wasted work is negligible.
            let available: Vec<&str> = ctx
                .graph
                .components
                .iter()
                .map(|c| c.name.as_str())
                .collect();
            let suggestion = build_did_you_mean(&id, &available);
            Task::cmd(move || {
                let result = if file_path.is_file() {
                    match std::fs::read_to_string(&file_path) {
                        Ok(raw_text) => {
                            match serde_json::from_str::<serde_json::Value>(&raw_text) {
                                Ok(doc) => match serde_json::to_string_pretty(&doc) {
                                    Ok(pretty) => Ok(DescribeView {
                                        component: id,
                                        pretty_json: pretty,
                                        scroll: 0,
                                    }),
                                    Err(e) => Err(format!("describe: render error: {e}")),
                                },
                                Err(e) => Err(format!("describe: parse error: {e}")),
                            }
                        }
                        Err(e) => Err(format!("describe: read error: {e}")),
                    }
                } else {
                    Err(format!("component '{id}' not found{suggestion}"))
                };
                Message::DescribeDone(Box::new(result))
            })
        }
        "validate" => {
            let (Some(dataset_path), Some(registry)) =
                (ctx.dataset_path, ctx.schema_registry.clone())
            else {
                model.status_message = Some(StatusMessage::error(
                    "validate: requires --dataset and schema registry",
                ));
                return Task::none();
            };
            // Own the inputs (paths + an Arc clone of the registry) so the scan can
            // run inside a Task::Cmd closure that satisfies `Send + 'static`.
            let dataset_path = dataset_path.to_path_buf();
            let mode_sets_dir = ctx.mode_sets_dir.map(|p| p.to_path_buf());
            let components_dir = ctx.components_dir.map(|p| p.to_path_buf());
            Task::cmd(move || {
                use design_data_core::validate;
                let result = match validate::validate_all_with_options_and_names(
                    &dataset_path,
                    &registry,
                    &HashSet::new(),
                    mode_sets_dir.as_deref(),
                    components_dir.as_deref(),
                    None,
                ) {
                    Ok(report) => {
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
                        Ok(rows)
                    }
                    Err(e) => Err(format!("validate: {e}")),
                };
                Message::ValidateDone(Box::new(result))
            })
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
            model.status_message = Some(StatusMessage::error(format!("unknown command: {other}")));
            Task::none()
        }
    }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

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
