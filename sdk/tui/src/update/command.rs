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

use super::ctx::UpdateCtx;
use crate::app::{
    parse_resolve_args, resolve_context_with_restrictions, save_palette_history, ActiveView,
    DescribeView, DiagnosticRow, Modal, QueryRow, QueryView, ResolveView, ResolvedRow,
    StatusMessage, HISTORY_CAP,
};
use crate::authoring::AuthoringMenuState;
use crate::command::Command;
use crate::find::FindWizardState;
use crate::message::Message;
use crate::model::Model;
use crate::naming::NamingWizardState;
use crate::task::Task;
use crate::wizard::WizardState;

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Replace any embedded JSON object in `s` with a compact `key=value` summary.
///
/// Finds the first `{…}` substring, attempts to parse it as a JSON object, and
/// formats each entry as `key=value`, joined by spaces.  Falls back to the
/// original string on any parse failure.
fn compact_json_refs(s: &str) -> String {
    let Some(start) = s.find('{') else {
        return s.to_owned();
    };
    let Some(end_rel) = s[start..].rfind('}') else {
        return s.to_owned();
    };
    let end = start + end_rel;
    let json_str = &s[start..=end];
    let Ok(serde_json::Value::Object(map)) = serde_json::from_str(json_str) else {
        return s.to_owned();
    };
    let kv = map
        .iter()
        .map(|(k, v)| {
            let val = v
                .as_str()
                .map(str::to_owned)
                .unwrap_or_else(|| v.to_string());
            format!("{k}={val}")
        })
        .collect::<Vec<_>>()
        .join(" ");
    format!("{}{}{}", &s[..start], kv, &s[end + 1..])
}

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
    // NOTE: we do NOT close the palette here unconditionally. Post-dispatch
    // reconciliation below decides whether to go Browsing (results) or return
    // home (error / empty result), keeping the palette armed in the latter case.

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

    // Post-dispatch reconciliation: decide the resulting mode.
    //
    // - Modal opened (Find / New / Name)       → leave InModal (already set).
    // - Results view set synchronously         → transition to Browsing.
    // - Async results pending (Describe /      → transition to Browsing now; the
    //   Validate returned a Task::Cmd)           *Done handler will arrive and
    //                                            set the view, or call
    //                                            return_home_keep_status on error.
    // - Still Empty (error / unknown / quit)   → return_home_keep_status so the
    //                                            palette stays armed with any
    //                                            error message visible.
    if model.is_modal_open() {
        // Modal was opened — mode is already InModal, nothing to do.
    } else if model.quit {
        // quit command — no view transition needed.
    } else if !matches!(model.active_view, crate::app::ActiveView::Empty) {
        // A results view was set synchronously — go Browsing.
        model.close_palette();
    } else {
        // Still Empty (error or async dispatch) — return home and keep status.
        model.return_home_keep_status();
    }

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
    match Command::parse(cmd) {
        Some(Command::Query) => {
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
        Some(Command::Resolve) => {
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
        Some(Command::Describe) => {
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
                                        h_scroll: 0,
                                        selected: 0,
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
        Some(Command::Validate) => {
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
                                token: compact_json_refs(&d.token.clone().unwrap_or_default()),
                                message: compact_json_refs(&d.message),
                            })
                            .chain(report.warnings.iter().map(|d| DiagnosticRow {
                                severity: "warning".to_string(),
                                rule_id: d.rule_id.clone().unwrap_or_default(),
                                token: compact_json_refs(&d.token.clone().unwrap_or_default()),
                                message: compact_json_refs(&d.message),
                            }))
                            .collect();
                        Ok(rows)
                    }
                    Err(e) => Err(format!("validate: {e}")),
                };
                Message::ValidateDone(Box::new(result))
            })
        }
        Some(Command::Find) => {
            let intent = rest.trim();
            let mut fs = FindWizardState::new_with_intent(intent);
            fs.refresh_suggestions(ctx.graph, &ctx.token_index);
            model.open_modal(Modal::Find(Box::new(fs)));
            model.status_message = None;
            Task::none()
        }
        Some(Command::Name) => {
            let mut ns = NamingWizardState::new_with_intent(rest.trim());
            ns.refresh_suggestions(ctx.graph);
            model.open_modal(Modal::Naming(Box::new(ns)));
            model.status_message = None;
            Task::none()
        }
        Some(Command::New) => {
            let mut ws = WizardState::new_with_intent(rest.trim());
            ws.refresh_suggestions(ctx.graph);
            model.open_modal(Modal::Wizard(Box::new(ws)));
            model.status_message = None;
            Task::none()
        }
        Some(Command::Authoring) => {
            let am = AuthoringMenuState::new();
            model.open_modal(Modal::Authoring(Box::new(am)));
            model.status_message = None;
            Task::none()
        }
        Some(Command::Quit) => {
            model.quit = true;
            Task::none()
        }
        None => {
            // Use the fuzzy ranker to suggest the closest known command.
            let suggestion = Command::matches(cmd)
                .into_iter()
                .next()
                .map(|m| format!(" — did you mean `{}`?", m.command.canonical()))
                .unwrap_or_default();
            model.status_message = Some(StatusMessage::error(format!(
                "unknown command: {cmd}{suggestion}"
            )));
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

#[cfg(test)]
mod tests {
    use super::compact_json_refs;

    #[test]
    fn compact_json_refs_replaces_embedded_object() {
        let msg =
            r#"Token '{"component":"chevron-icon","property":"size-75"}' references unknown scale"#;
        let out = compact_json_refs(msg);
        assert!(out.contains("component=chevron-icon"), "got: {out}");
        assert!(out.contains("property=size-75"), "got: {out}");
        assert!(!out.contains('{'), "braces should be gone: {out}");
        assert!(out.starts_with("Token '"), "prefix lost: {out}");
        assert!(
            out.ends_with("' references unknown scale"),
            "suffix lost: {out}"
        );
    }

    #[test]
    fn compact_json_refs_full_spec_message() {
        // Exact shape emitted by SPEC-018/019/020/022/040: flat string→string name object.
        // Key order matches insertion order under the workspace's preserve_order build.
        let msg = r#"Token '{"component":"chevron-icon","property":"size-75","scale":"medium"}' references unknown scale"#;
        let out = compact_json_refs(msg);
        assert_eq!(
            out,
            "Token 'component=chevron-icon property=size-75 scale=medium' references unknown scale"
        );
    }

    #[test]
    fn compact_json_refs_passes_through_plain_string() {
        let msg = "no JSON here";
        assert_eq!(compact_json_refs(msg), msg);
    }

    #[test]
    fn compact_json_refs_passes_through_invalid_json() {
        let msg = "Token '{not json}' is broken";
        assert_eq!(compact_json_refs(msg), msg);
    }

    #[test]
    fn compact_json_refs_multi_object_falls_back() {
        // rfind spans both brace pairs → invalid JSON → original returned unchanged
        let msg = r#"Token '{"a":"x"}' see also '{"b":"y"}'"#;
        assert_eq!(compact_json_refs(msg), msg);
    }
}
