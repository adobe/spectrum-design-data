// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Clear, Paragraph, Row, Table},
    Frame,
};

use crate::app::{
    ActiveView, DescribeView, Modal, QueryView, ResolveView, StatusKind, ValidateView,
};
use crate::help::HELP_TEXT;
use crate::model::Model;
use crate::naming::{NamingScreen, NamingWizardState};
use crate::theme::Theme;
use crate::view_find::render_find;
use crate::wizard::{ClassificationDraft, ValueKind, WizardScreen, WizardState};

/// Return a centered `Rect` covering `percent_x` × `percent_y` of `area`.
fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
    let vert = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(area);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(vert[1])[1]
}

/// Render a complete frame: primer header, active view, status bar, palette prompt, and any
/// overlay modal. This is the single entry point for all rendering; call it from
/// `terminal.draw(|f| draw(app, f, theme, primer_line))`.
pub fn draw(model: &mut Model, frame: &mut Frame, theme: &Theme, primer_line: &str) {
    let status_height = u16::from(model.status_message.is_some());
    let area = frame.area();

    // Three-region layout (RFC #973 §3.1): primer header / active view / status+palette.
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),             // primer header
            Constraint::Min(0),                // active view
            Constraint::Length(status_height), // status message
            Constraint::Length(1),             // palette prompt
        ])
        .split(area);

    // Primer header.
    let primer_text = Line::from(vec![
        Span::styled("▶ ", Style::default().fg(theme.ok)),
        Span::raw(primer_line),
    ]);
    frame.render_widget(Paragraph::new(primer_text), chunks[0]);

    // Active view.
    match &mut model.active_view {
        ActiveView::Empty => {
            let block = Block::default()
                .borders(Borders::ALL)
                .title(" Active View ");
            frame.render_widget(block, chunks[1]);
        }
        ActiveView::Query(ref mut qv) => render_query(frame, qv, chunks[1], theme),
        ActiveView::Resolve(ref mut rv) => render_resolve(frame, rv, chunks[1], theme),
        ActiveView::Describe(ref dv) => render_describe(frame, dv, chunks[1]),
        ActiveView::Validate(ref mut vv) => render_validate(frame, vv, chunks[1], theme),
    }

    // Status message — ok color for info, error color for errors.
    if let Some(ref msg) = model.status_message {
        let color = match msg.kind {
            StatusKind::Info => theme.ok,
            StatusKind::Error => theme.error,
        };
        frame.render_widget(
            Paragraph::new(msg.text.as_str()).style(Style::default().fg(color)),
            chunks[2],
        );
    }

    // Palette prompt (only visible in InPalette mode).
    let palette_text = if model.is_palette_open() {
        format!("{}{}", model.palette_prefix(), model.palette_input_value())
    } else {
        String::new()
    };
    frame.render_widget(Paragraph::new(palette_text), chunks[3]);

    // Overlay modal (rendered last so it appears on top).
    if let Some(modal) = model.modal_mut() {
        match modal {
            Modal::Find(ref mut fs) => {
                let popup_area = centered_rect(82, 85, area);
                frame.render_widget(Clear, popup_area);
                render_find(frame, fs, popup_area, theme);
            }
            Modal::Wizard(ref mut ws) => {
                let popup_area = centered_rect(82, 85, area);
                frame.render_widget(Clear, popup_area);
                render_wizard(frame, ws, popup_area, theme);
            }
            Modal::Naming(ref mut ns) => {
                let popup_area = centered_rect(82, 85, area);
                frame.render_widget(Clear, popup_area);
                render_naming(frame, ns, popup_area, theme);
            }
            Modal::Help(ref hm) => {
                render_help_modal(frame, hm.scroll, area);
            }
        }
    }
}

// ── Per-view render fns (extracted from the inline match arms) ────────────────

fn render_query(f: &mut Frame<'_>, qv: &mut QueryView, area: Rect, theme: &Theme) {
    let header = Row::new(vec![
        Cell::from("Name").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Value").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("File").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Layer").style(Style::default().add_modifier(Modifier::BOLD)),
    ]);
    let rows: Vec<Row> = qv
        .rows
        .iter()
        .map(|r| {
            Row::new(vec![
                Cell::from(r.name.as_str()),
                Cell::from(r.value.as_str()),
                Cell::from(r.file.as_str()),
                Cell::from(r.layer.as_str()),
            ])
        })
        .collect();
    let widths = [
        Constraint::Percentage(40),
        Constraint::Percentage(30),
        Constraint::Percentage(20),
        Constraint::Percentage(10),
    ];
    let table = Table::new(rows, widths)
        .header(header)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Query: {} ", qv.expr_text)),
        )
        .highlight_style(Style::default().bg(theme.selection_bg));
    f.render_stateful_widget(table, area, &mut qv.table_state);
}

fn render_resolve(f: &mut Frame<'_>, rv: &mut ResolveView, area: Rect, theme: &Theme) {
    let header = Row::new(vec![
        Cell::from("★").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Name").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Value").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("File").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Layer").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Spec").style(Style::default().add_modifier(Modifier::BOLD)),
    ]);
    let rows: Vec<Row> = rv
        .rows
        .iter()
        .map(|r| {
            Row::new(vec![
                Cell::from(if r.is_winner { "★" } else { "" }),
                Cell::from(r.name.as_str()),
                Cell::from(r.value.as_str()),
                Cell::from(r.file.as_str()),
                Cell::from(r.layer.as_str()),
                Cell::from(r.specificity.to_string()),
            ])
        })
        .collect();
    let widths = [
        Constraint::Length(2),
        Constraint::Percentage(35),
        Constraint::Percentage(25),
        Constraint::Percentage(20),
        Constraint::Percentage(12),
        Constraint::Percentage(8),
    ];
    let table = Table::new(rows, widths)
        .header(header)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Resolve: {} ", rv.property)),
        )
        .highlight_style(Style::default().bg(theme.selection_bg));
    f.render_stateful_widget(table, area, &mut rv.table_state);
}

fn render_describe(f: &mut Frame<'_>, dv: &DescribeView, area: Rect) {
    let para = Paragraph::new(dv.pretty_json.as_str())
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Describe: {} ", dv.component)),
        )
        .scroll((dv.scroll, 0));
    f.render_widget(para, area);
}

fn render_validate(f: &mut Frame<'_>, vv: &mut ValidateView, area: Rect, theme: &Theme) {
    let header = Row::new(vec![
        Cell::from("Sev").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Rule").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Token").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Message").style(Style::default().add_modifier(Modifier::BOLD)),
    ]);
    let rows: Vec<Row> = vv
        .rows
        .iter()
        .map(|r| {
            Row::new(vec![
                Cell::from(r.severity.as_str()),
                Cell::from(r.rule_id.as_str()),
                Cell::from(r.token.as_str()),
                Cell::from(r.message.as_str()),
            ])
        })
        .collect();
    let widths = [
        Constraint::Length(7),
        Constraint::Percentage(12),
        Constraint::Percentage(28),
        Constraint::Percentage(60),
    ];
    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title(" Validate "))
        .highlight_style(Style::default().bg(theme.selection_bg));
    f.render_stateful_widget(table, area, &mut vv.table_state);
}

// ── Help modal ────────────────────────────────────────────────────────────────

fn render_help_modal(f: &mut Frame<'_>, scroll: u16, area: Rect) {
    let popup_area = centered_rect(80, 90, area);
    f.render_widget(Clear, popup_area);
    let para = Paragraph::new(HELP_TEXT)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Help  ?/Esc to close "),
        )
        .scroll((scroll, 0));
    f.render_widget(para, popup_area);
}

// ── Wizard render ─────────────────────────────────────────────────────────────

fn render_wizard(f: &mut Frame<'_>, ws: &mut WizardState, area: Rect, theme: &Theme) {
    let screen_num = ws.screen.number();
    let screen_name = ws.screen.name();

    let outer = Block::default()
        .borders(Borders::ALL)
        .title(format!(" Wizard · {screen_num}/4 · {screen_name} "));
    let inner_area = outer.inner(area);
    f.render_widget(outer, area);

    let inner_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .split(inner_area);

    let footer_text = match ws.screen {
        WizardScreen::Intent => {
            "Enter: continue  Tab: reuse selected  ↑↓: select suggestion  Esc: cancel"
        }
        WizardScreen::Classification => {
            "Tab/Shift-Tab: next/prev field  ←→: cycle layer  +: add name field  Enter: continue  Esc: cancel"
        }
        WizardScreen::Values => {
            "a: alias  l: literal  e: edit value  ↑↓: select row  Enter: continue  Esc: cancel"
        }
        WizardScreen::Confirm => {
            "Type rationale, then Enter to submit  ↑↓: scroll diff  Ctrl+S: edit $schema  Esc: cancel"
        }
    };
    f.render_widget(
        Paragraph::new(footer_text).style(Style::default().fg(theme.muted)),
        inner_chunks[1],
    );

    match ws.screen {
        WizardScreen::Intent => render_intent_screen(f, ws, inner_chunks[0], theme),
        WizardScreen::Classification => render_classification_screen(f, ws, inner_chunks[0]),
        WizardScreen::Values => render_values_screen(f, ws, inner_chunks[0], theme),
        WizardScreen::Confirm => render_confirm_screen(f, ws, inner_chunks[0], theme),
    }
}

fn render_intent_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect, theme: &Theme) {
    render_intent_content(
        f,
        ws.can_alias,
        ws.intent.value(),
        &ws.suggestions,
        ws.selected_suggestion,
        area,
        theme,
    );
}

fn render_classification_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect) {
    render_classification_content(f, &ws.classification, &ws.assembled_name(), area);
}

// ── Shared widget render helpers ──────────────────────────────────────────────

fn render_intent_content(
    f: &mut Frame<'_>,
    can_alias: bool,
    intent_value: &str,
    suggestions: &[design_data_core::suggest::SuggestionResult],
    selected_suggestion: usize,
    area: Rect,
    theme: &Theme,
) {
    let banner_height: u16 = if can_alias { 3 } else { 0 };
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Length(banner_height),
            Constraint::Min(0),
        ])
        .split(area);

    let intent_line = format!("Intent: {intent_value}");
    f.render_widget(Paragraph::new(intent_line), chunks[0]);

    if can_alias {
        let accent = Style::default()
            .fg(theme.accent)
            .add_modifier(Modifier::BOLD);
        let banner = Paragraph::new(vec![
            Line::from(Span::styled(
                "  These tokens already exist for similar intents.",
                accent,
            )),
            Line::from(Span::styled(
                "  Reusing one keeps the cascade healthy.  Tab to alias · Enter to create new",
                Style::default().fg(theme.accent),
            )),
        ]);
        f.render_widget(banner, chunks[1]);
    }

    let list_area = chunks[2];
    if suggestions.is_empty() {
        if !intent_value.is_empty() {
            f.render_widget(
                Paragraph::new("  (no suggestions — will create new token)"),
                list_area,
            );
        } else {
            f.render_widget(
                Paragraph::new("  Type to search for existing tokens…"),
                list_area,
            );
        }
    } else {
        let rows: Vec<Row> = suggestions
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let marker = if i == selected_suggestion { "▶" } else { " " };
                let conf = format!("{:.0}%", s.confidence * 100.0);
                Row::new(vec![
                    Cell::from(marker),
                    Cell::from(s.token_name.as_str()),
                    Cell::from(conf),
                ])
            })
            .collect();
        let widths = [
            Constraint::Length(2),
            Constraint::Min(0),
            Constraint::Length(5),
        ];
        let table =
            Table::new(rows, widths).highlight_style(Style::default().bg(theme.selection_bg));
        f.render_widget(table, list_area);
    }
}

fn render_classification_content(
    f: &mut Frame<'_>,
    classification: &ClassificationDraft,
    assembled_name: &str,
    area: Rect,
) {
    let layer_str = match classification.layer {
        design_data_core::graph::Layer::Foundation => "Foundation",
        design_data_core::graph::Layer::Platform => "Platform",
        design_data_core::graph::Layer::Product => "Product",
    };

    let mut lines: Vec<Line> = Vec::new();
    let focused = classification.focused_field;

    let layer_label = if focused == 0 {
        format!("▶ Layer:    ← {layer_str} →")
    } else {
        format!("  Layer:      {layer_str}")
    };
    lines.push(Line::from(layer_label));

    let prop_label = if focused == 1 {
        format!("▶ Property: {}", classification.property.value())
    } else {
        format!("  Property: {}", classification.property.value())
    };
    lines.push(Line::from(prop_label));

    for (i, field) in classification.name_fields.iter().enumerate() {
        let marker = if focused == i + 2 { "▶" } else { " " };
        lines.push(Line::from(format!(
            "{marker} {}: {}",
            field.key,
            field.value.value()
        )));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(format!("  Preview: {assembled_name}")));

    f.render_widget(Paragraph::new(lines), area);
}

// ── Naming wizard render ──────────────────────────────────────────────────────

fn render_naming(f: &mut Frame<'_>, ns: &NamingWizardState, area: Rect, theme: &Theme) {
    let screen_num = ns.screen.number();
    let screen_name = ns.screen.name();

    let outer = Block::default().borders(Borders::ALL).title(format!(
        " Name · {screen_num}/{} · {screen_name} ",
        NamingScreen::SCREEN_COUNT
    ));
    let inner_area = outer.inner(area);
    f.render_widget(outer, area);

    let inner_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .split(inner_area);

    let footer_text = match ns.screen {
        NamingScreen::Intent => "Enter: continue  ↑↓: select suggestion  Esc: cancel",
        NamingScreen::Classification => {
            "Tab/Shift-Tab: next/prev field  ←→/b: cycle layer / back to intent  +: add name field  Enter: done  Esc: cancel"
        }
        NamingScreen::Result => "c/y: copy name  e: edit  Esc/q: close",
    };
    f.render_widget(
        Paragraph::new(footer_text).style(Style::default().fg(theme.muted)),
        inner_chunks[1],
    );

    match ns.screen {
        NamingScreen::Intent => render_intent_content(
            f,
            ns.can_alias,
            ns.intent.value(),
            &ns.suggestions,
            ns.selected_suggestion,
            inner_chunks[0],
            theme,
        ),
        NamingScreen::Classification => render_classification_content(
            f,
            &ns.classification,
            &ns.assembled_name(),
            inner_chunks[0],
        ),
        NamingScreen::Result => render_naming_result(f, ns, inner_chunks[0], theme),
    }
}

fn render_naming_result(f: &mut Frame<'_>, ns: &NamingWizardState, area: Rect, theme: &Theme) {
    let name = ns.assembled_name();
    let display = if name.is_empty() {
        "(no name assembled — go back and fill in Property)".to_string()
    } else {
        name
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .split(area);

    let name_block = Block::default()
        .borders(Borders::ALL)
        .title(" Assembled name ");
    let name_para = Paragraph::new(Span::styled(
        display,
        Style::default()
            .fg(theme.accent)
            .add_modifier(Modifier::BOLD),
    ))
    .block(name_block);
    f.render_widget(name_para, chunks[0]);

    let hint = Paragraph::new(vec![
        Line::from("  Press c or y to copy this name to the clipboard."),
        Line::from("  Press e to go back and refine the classification."),
        Line::from("  Press Esc or q to close without copying."),
    ])
    .style(Style::default().fg(theme.muted));
    f.render_widget(hint, chunks[1]);
}

// ── Wizard screen renders ─────────────────────────────────────────────────────

fn render_values_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect, theme: &Theme) {
    if ws.values.rows.is_empty() {
        f.render_widget(
            Paragraph::new("  (no mode combinations — graph has no mode sets)"),
            area,
        );
        return;
    }

    let header = Row::new(vec![
        Cell::from("Mode combo").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Kind").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("Value / Alias target").style(Style::default().add_modifier(Modifier::BOLD)),
    ]);
    let rows: Vec<Row> = ws
        .values
        .rows
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let combo = row.combo_label();
            let kind = match row.kind {
                ValueKind::Alias => "alias",
                ValueKind::Literal => "literal",
            };
            let value = match row.kind {
                ValueKind::Alias => row.alias_target.value().to_string(),
                ValueKind::Literal => row.literal.value().to_string(),
            };
            let style = if i == ws.values.selected {
                Style::default().bg(theme.selection_bg)
            } else {
                Style::default()
            };
            Row::new(vec![Cell::from(combo), Cell::from(kind), Cell::from(value)]).style(style)
        })
        .collect();

    let widths = [
        Constraint::Percentage(30),
        Constraint::Percentage(10),
        Constraint::Percentage(60),
    ];
    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::NONE));
    f.render_widget(table, area);
}

fn render_confirm_screen(f: &mut Frame<'_>, ws: &WizardState, area: Rect, theme: &Theme) {
    let rationale_height = 3u16;
    let error_height = if ws.error.is_some() { 1u16 } else { 0u16 };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // schema URL / editor
            Constraint::Length(rationale_height),
            Constraint::Min(0),               // diff preview
            Constraint::Length(error_height), // write error
        ])
        .split(area);

    // Schema URL header / inline editor.
    let schema_line = if ws.editing_schema_url {
        Line::from(vec![
            Span::styled("  $schema: ", Style::default().fg(theme.accent)),
            Span::raw(ws.schema_url_input.value()),
            Span::styled("▌", Style::default().fg(theme.accent)),
        ])
    } else {
        let url_text = ws.schema_url.as_deref().unwrap_or("(none — Ctrl+S to set)");
        Line::from(vec![
            Span::styled("  $schema: ", Style::default().fg(theme.muted)),
            Span::raw(url_text),
        ])
    };
    f.render_widget(Paragraph::new(schema_line), chunks[0]);

    // Rationale input.
    let rationale_block = Block::default()
        .borders(Borders::ALL)
        .title(" Rationale (required) ");
    let rationale_text = ws.rationale.value();
    let rationale_line = if rationale_text.len() > 280 {
        Line::from(vec![
            Span::raw(rationale_text),
            Span::styled(" ⚠ >280 chars", Style::default().fg(theme.warn)),
        ])
    } else {
        Line::from(Span::raw(rationale_text))
    };
    f.render_widget(
        Paragraph::new(rationale_line).block(rationale_block),
        chunks[1],
    );

    // Diff preview.
    let diff_text = ws
        .diff_preview
        .as_deref()
        .unwrap_or("(diff will appear here once rationale is added and Enter pressed)");
    let diff_para = Paragraph::new(diff_text)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Diff preview "),
        )
        .scroll((ws.diff_scroll, 0));
    f.render_widget(diff_para, chunks[2]);

    // Write error.
    if let Some(ref err) = ws.error {
        f.render_widget(
            Paragraph::new(format!("  ⚠ {err}")).style(Style::default().fg(theme.error)),
            chunks[3],
        );
    }
}
