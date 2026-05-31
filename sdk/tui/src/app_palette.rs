// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `App::submit_palette` — palette command dispatch for the legacy `App` path.
//! Extracted from `app.rs` to keep source files within the 800-LOC budget
//! enforced by `tests/budget.rs` (GH #1018).
//!
//! This module extends `App` (defined in `app.rs`) with a single `impl` block.
//! In Rust, `impl` blocks may appear in any module within the same crate; the
//! method is indistinguishable from one defined in `app.rs` itself.

use std::collections::HashSet;

use design_data_core::cascade::resolve_property;
use design_data_core::query;
use design_data_core::validate;
use tui_input::Input;

use crate::app::{
    parse_resolve_args, resolve_context_with_restrictions, save_palette_history, ActiveView, App,
    DescribeView, DiagnosticRow, Modal, PaletteMode, QueryRow, QueryView, ResolveView, ResolvedRow,
    StatusMessage, SubmitContext, ValidateView, HISTORY_CAP,
};
use crate::find::FindWizardState;
use crate::naming::NamingWizardState;
use crate::wizard::WizardState;

impl App {
    /// Dispatch a committed palette command against the graph and optional context paths.
    pub fn submit_palette(&mut self, ctx: &SubmitContext<'_>) {
        if self.palette_mode != PaletteMode::Command {
            self.palette_open = false;
            self.palette_input = Input::default();
            return;
        }

        let raw = self.palette_input.value().trim().to_string();
        self.palette_open = false;
        self.palette_input = Input::default();
        self.palette_history_cursor = None;

        // Append to history (dedupe head, cap at HISTORY_CAP).
        if !raw.is_empty() && self.palette_history.first().map(|s| s.as_str()) != Some(raw.as_str())
        {
            self.palette_history.insert(0, raw.clone());
            self.palette_history.truncate(HISTORY_CAP);
            save_palette_history(&self.palette_history);
        }

        let (cmd, rest) = match raw.split_once(' ') {
            Some((c, r)) => (c.to_lowercase(), r.trim().to_string()),
            None => (raw.to_lowercase(), String::new()),
        };

        match cmd.as_str() {
            "query" => {
                if rest.is_empty() {
                    self.status_message = Some(StatusMessage::error("query: expression required"));
                    return;
                }
                match query::parse(&rest) {
                    Ok(expr) => {
                        let records = query::filter_with_index(ctx.graph, &ctx.token_index, &expr);
                        let rows: Vec<QueryRow> =
                            records.iter().map(|r| QueryRow::from_record(r)).collect();
                        let count = rows.len();
                        self.active_view = ActiveView::Query(QueryView::new(rest.clone(), rows));
                        self.status_message =
                            Some(StatusMessage::info(format!("{count} token(s) matched")));
                    }
                    Err(e) => {
                        self.status_message =
                            Some(StatusMessage::error(format!("query error: {e}")));
                    }
                }
            }
            "resolve" => {
                if rest.is_empty() {
                    self.status_message =
                        Some(StatusMessage::error("resolve: property=<name> required"));
                    return;
                }
                let (prop, res_ctx) = match parse_resolve_args(&rest) {
                    Ok(v) => v,
                    Err(e) => {
                        self.status_message = Some(StatusMessage::error(format!("resolve: {e}")));
                        return;
                    }
                };
                let res_ctx =
                    resolve_context_with_restrictions(res_ctx, &ctx.mode_set_restrictions);
                let candidates = resolve_property(ctx.graph, &prop, &res_ctx);
                if candidates.is_empty() {
                    self.active_view = ActiveView::Resolve(ResolveView::new(prop, vec![]));
                    self.status_message = Some(StatusMessage::info("no match"));
                    return;
                }
                let rows: Vec<ResolvedRow> =
                    candidates.iter().map(ResolvedRow::from_candidate).collect();
                let count = rows.len();
                self.active_view = ActiveView::Resolve(ResolveView::new(prop, rows));
                self.status_message = Some(StatusMessage::info(format!("{count} candidate(s)")));
            }
            "describe" | "component" => {
                if rest.is_empty() {
                    self.status_message =
                        Some(StatusMessage::error("describe: component ID required"));
                    return;
                }
                let id = rest.trim();
                if id.is_empty()
                    || !id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                    || !id
                        .chars()
                        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
                {
                    self.status_message =
                        Some(StatusMessage::error(format!("invalid component ID '{id}'")));
                    return;
                }
                let Some(comp_dir) = ctx.components_dir else {
                    self.status_message = Some(StatusMessage::error(
                        "describe: no components directory available",
                    ));
                    return;
                };
                let file_path = comp_dir.join(format!("{id}.json"));
                if file_path.is_file() {
                    match std::fs::read_to_string(&file_path) {
                        Ok(raw_text) => {
                            match serde_json::from_str::<serde_json::Value>(&raw_text) {
                                Ok(doc) => match serde_json::to_string_pretty(&doc) {
                                    Ok(pretty) => {
                                        self.active_view = ActiveView::Describe(DescribeView {
                                            component: id.to_string(),
                                            pretty_json: pretty,
                                            scroll: 0,
                                        });
                                        self.status_message = None;
                                    }
                                    Err(e) => {
                                        self.status_message = Some(StatusMessage::error(format!(
                                            "describe: render error: {e}"
                                        )));
                                    }
                                },
                                Err(e) => {
                                    self.status_message = Some(StatusMessage::error(format!(
                                        "describe: parse error: {e}"
                                    )));
                                }
                            }
                        }
                        Err(e) => {
                            self.status_message =
                                Some(StatusMessage::error(format!("describe: read error: {e}")));
                        }
                    }
                } else {
                    let available: Vec<&str> = ctx
                        .graph
                        .components
                        .iter()
                        .map(|c| c.name.as_str())
                        .collect();
                    let suggestion = if available.is_empty() {
                        String::new()
                    } else {
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
                        if !matches.is_empty() {
                            format!(
                                " — did you mean: {}",
                                matches[..matches.len().min(3)].join(", ")
                            )
                        } else {
                            String::new()
                        }
                    };
                    self.status_message = Some(StatusMessage::error(format!(
                        "unknown component: {id}{suggestion}"
                    )));
                }
            }
            "validate" => {
                let (Some(dataset_path), Some(registry)) = (ctx.dataset_path, ctx.schema_registry)
                else {
                    self.status_message = Some(StatusMessage::error(
                        "validate: dataset or schema registry unavailable",
                    ));
                    return;
                };
                match validate::validate_all_with_options_and_names(
                    dataset_path,
                    registry,
                    &HashSet::new(),
                    ctx.mode_sets_dir,
                    ctx.components_dir,
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
                        let count = rows.len();
                        self.active_view = ActiveView::Validate(ValidateView::new(rows));
                        self.status_message =
                            Some(StatusMessage::info(format!("{count} finding(s)")));
                    }
                    Err(e) => {
                        self.status_message = Some(StatusMessage::error(format!("validate: {e}")));
                    }
                }
            }
            "find" => {
                let fs = FindWizardState::new_with_intent(rest.trim());
                self.modal = Some(Modal::Find(Box::new(fs)));
                self.status_message = None;
            }
            "name" => {
                let mut ns = NamingWizardState::new_with_intent(rest.trim());
                ns.refresh_suggestions(ctx.graph);
                self.modal = Some(Modal::Naming(Box::new(ns)));
                self.status_message = None;
            }
            "new" | "create" => {
                let mut ws = WizardState::new_with_intent(rest.trim());
                ws.refresh_suggestions(ctx.graph);
                self.modal = Some(Modal::Wizard(Box::new(ws)));
                self.status_message = None;
            }
            other => {
                self.status_message =
                    Some(StatusMessage::error(format!("unknown command: {other}")));
            }
        }
    }
}
