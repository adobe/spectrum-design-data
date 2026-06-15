// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Find-wizard render helpers (`render_find`, `render_filters_screen`,
//! `render_preview_screen`). Extracted from `view.rs` to keep source files
//! within the 800-LOC budget enforced by `tests/budget.rs` (GH #1018).

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
    Frame,
};

use crate::find::{FindScreen, FindWizardState, MAX_SUGGEST_RESULTS};
use crate::theme::Theme;

// ── Find wizard entry ─────────────────────────────────────────────────────────

pub(crate) fn render_find(
    f: &mut Frame<'_>,
    fs: &FindWizardState,
    area: Rect,
    theme: &Theme,
    label: &str,
) {
    let outer = Block::default()
        .borders(Borders::ALL)
        .title(format!(" {label} "));
    let inner_area = outer.inner(area);
    f.render_widget(outer, area);

    let inner_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .split(inner_area);

    let footer_text = match fs.screen {
        FindScreen::Filters => {
            "↑↓: select  Enter: accept  Tab/Shift-Tab: move  Enter on ▶Preview: search  Esc: cancel"
        }
        FindScreen::Preview => "Enter: open results  e: edit filters  Esc/q: cancel",
    };
    f.render_widget(
        Paragraph::new(footer_text).style(Style::default().fg(theme.muted)),
        inner_chunks[1],
    );

    match fs.screen {
        FindScreen::Filters => render_filters_screen(f, fs, inner_chunks[0], theme),
        FindScreen::Preview => render_preview_screen(f, fs, inner_chunks[0], theme),
    }
}

// ── Screen renders ─────────────────────────────────────────────────────────────

fn render_filters_screen(f: &mut Frame<'_>, fs: &FindWizardState, area: Rect, theme: &Theme) {
    let foc = fs.focused_field;
    let dropdown_h = fs.suggestions.len() as u16;

    // Build a dynamic constraint list: each of the 5 fields gets 1 row, plus an
    // optional dropdown row block inserted after whichever field is focused (0–3).
    let field_defs: &[(usize, &str)] = &[
        (0, "Property "),
        (1, "Component"),
        (2, "Variant  "),
        (3, "State    "),
        (4, "Intent   "),
    ];

    let mut constraints: Vec<Constraint> = Vec::new();
    for (field_idx, _) in field_defs {
        constraints.push(Constraint::Length(1));
        if *field_idx == foc && dropdown_h > 0 {
            constraints.push(Constraint::Length(dropdown_h));
        }
    }
    // Error row only shown when there is a parse problem; otherwise hidden (Length(0)
    // wastes no space but keeps the chunk index math stable).
    let has_error = fs.preview_error.is_some();
    constraints.push(Constraint::Length(if has_error { 1 } else { 0 })); // error row
    constraints.push(Constraint::Length(3)); // Preview button (bordered box)
    constraints.push(Constraint::Min(0)); // padding

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints(constraints)
        .split(area);

    // Walk through fields, rendering each row and its optional dropdown.
    let mut ci = 0usize; // chunk index
    for (field_idx, label) in field_defs {
        let val = match field_idx {
            0 => fs.property.value(),
            1 => fs.component.value(),
            2 => fs.variant.value(),
            3 => fs.state.value(),
            _ => fs.intent.value(),
        };
        let marker = if foc == *field_idx { "▶" } else { " " };
        f.render_widget(
            Paragraph::new(format!("{marker} {label}: {val}")).style(if foc == *field_idx {
                Style::default().fg(theme.accent)
            } else {
                Style::default()
            }),
            chunks[ci],
        );
        ci += 1;

        // Dropdown inline after the focused field.
        if *field_idx == foc && dropdown_h > 0 {
            let rows: Vec<Row> = fs
                .suggestions
                .iter()
                .enumerate()
                .map(|(i, opt)| {
                    let sel = i == fs.selected_suggestion;
                    let marker = if sel { "  ▸" } else { "   " };
                    let label = format!("{marker} {} ({})", opt.value, opt.count);
                    let style = if sel {
                        Style::default().bg(theme.selection_bg)
                    } else if opt.count == 0 {
                        Style::default().fg(theme.muted).add_modifier(Modifier::DIM)
                    } else {
                        Style::default().fg(theme.muted)
                    };
                    Row::new(vec![Cell::from(label)]).style(style)
                })
                .collect();
            f.render_widget(Table::new(rows, [Constraint::Min(0)]), chunks[ci]);
            ci += 1;
        }
    }

    // Error row — only visible when preview_error is set (chunk height is 0 otherwise).
    if has_error {
        let err_text = format!(
            "  parse error: {}",
            fs.preview_error.as_deref().unwrap_or("")
        );
        f.render_widget(
            Paragraph::new(err_text).style(Style::default().fg(theme.error)),
            chunks[ci],
        );
    }
    ci += 1;

    // Preview button — the last Tab stop.  Highlighted when focused.
    let btn_focused = foc == FindWizardState::PREVIEW_FOCUS;
    let (btn_border_style, btn_text_style) = if btn_focused {
        (
            Style::default().fg(theme.accent),
            Style::default().fg(theme.accent),
        )
    } else {
        (
            Style::default().fg(theme.muted),
            Style::default().fg(theme.muted),
        )
    };
    let btn_label = if fs.preview_error.is_some() {
        "  ▶ Preview — fix filters".to_string()
    } else {
        format!("  ▶ Preview {} token(s)  →", fs.preview_count)
    };
    let btn_block = Block::default()
        .borders(Borders::ALL)
        .border_style(btn_border_style);
    let btn_inner = btn_block.inner(chunks[ci]);
    f.render_widget(btn_block, chunks[ci]);
    f.render_widget(Paragraph::new(btn_label).style(btn_text_style), btn_inner);
}

fn render_preview_screen(f: &mut Frame<'_>, fs: &FindWizardState, area: Rect, theme: &Theme) {
    let expr = fs
        .assemble_expr()
        .unwrap_or_else(|| format!("intent: {}", fs.intent.value().trim()));

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // expression line
            Constraint::Length(1), // match count
            Constraint::Min(0),    // results table
        ])
        .split(area);

    f.render_widget(Paragraph::new(format!("  Query: {expr}")), chunks[0]);

    let count_text = if let Some(ref err) = fs.preview_error {
        format!("  error: {err}")
    } else {
        format!("  {} token(s) matched", fs.preview_count)
    };
    f.render_widget(
        Paragraph::new(count_text).style(Style::default().fg(theme.muted)),
        chunks[1],
    );

    let display_rows: Vec<Row> = fs
        .preview_rows
        .iter()
        .take(MAX_SUGGEST_RESULTS)
        .map(|r| {
            Row::new(vec![
                Cell::from(r.name.as_str()),
                Cell::from(r.layer.as_str()).style(Style::default().fg(theme.muted)),
            ])
        })
        .collect();
    if !display_rows.is_empty() {
        let widths = [Constraint::Min(0), Constraint::Length(10)];
        f.render_widget(
            Table::new(display_rows, widths)
                .row_highlight_style(Style::default().bg(theme.selection_bg)),
            chunks[2],
        );
    } else if fs.preview_error.is_none() {
        f.render_widget(
            Paragraph::new("  (no tokens matched)").style(Style::default().fg(theme.muted)),
            chunks[2],
        );
    }
}
