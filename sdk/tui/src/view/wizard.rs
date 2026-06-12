// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token-authoring wizard render helpers (`render_wizard` and its screen
//! sub-renderers). Extracted from `view.rs` to keep source files within the
//! 800-LOC budget enforced by `tests/budget.rs` (GH #1018).

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
    Frame,
};

use super::shared::{render_classification_content, render_intent_content};
use crate::theme::Theme;
use crate::wizard::{ValueKind, WizardScreen, WizardState};

pub(crate) fn render_wizard(f: &mut Frame<'_>, ws: &mut WizardState, area: Rect, theme: &Theme) {
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
