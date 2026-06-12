// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Result-view render helpers (`render_query`, `render_resolve`,
//! `render_describe`, `render_validate`). Extracted from `view.rs` to keep
//! source files within the 800-LOC budget enforced by `tests/budget.rs`
//! (GH #1018).

use ratatui::{
    layout::{Constraint, Rect},
    style::{Modifier, Style},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
    Frame,
};

use crate::app::{DescribeView, QueryView, ResolveView, ValidateView};
use crate::model::views::{
    column_budget, truncate_cell, QUERY_NAME_PCT, RESOLVE_NAME_PCT, VALIDATE_TOKEN_PCT,
};
use crate::theme::Theme;

pub(crate) fn render_query(
    f: &mut Frame<'_>,
    qv: &mut QueryView,
    area: Rect,
    theme: &Theme,
) {
    let name_max = column_budget(area.width, 5, QUERY_NAME_PCT);
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
                Cell::from(truncate_cell(&r.name, name_max)),
                Cell::from(r.value.as_str()),
                Cell::from(r.file.as_str()),
                Cell::from(r.layer.as_str()),
            ])
        })
        .collect();
    let widths = [
        Constraint::Percentage(QUERY_NAME_PCT),
        Constraint::Percentage(30),
        Constraint::Percentage(20),
        Constraint::Percentage(10),
    ];
    let title = if qv.is_fuzzy {
        format!(" Fuzzy: /{} ", qv.expr_text)
    } else {
        format!(" Query: {} ", qv.expr_text)
    };
    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title(title))
        .row_highlight_style(Style::default().bg(theme.selection_bg));
    f.render_stateful_widget(table, area, &mut qv.table_state);
}

pub(crate) fn render_resolve(
    f: &mut Frame<'_>,
    rv: &mut ResolveView,
    area: Rect,
    theme: &Theme,
) {
    let name_max = column_budget(area.width, 9, RESOLVE_NAME_PCT);
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
                Cell::from(truncate_cell(&r.name, name_max)),
                Cell::from(r.value.as_str()),
                Cell::from(r.file.as_str()),
                Cell::from(r.layer.as_str()),
                Cell::from(r.specificity.to_string()),
            ])
        })
        .collect();
    let widths = [
        Constraint::Length(2),
        Constraint::Percentage(RESOLVE_NAME_PCT),
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
        .row_highlight_style(Style::default().bg(theme.selection_bg));
    f.render_stateful_widget(table, area, &mut rv.table_state);
}

pub(crate) fn render_describe(f: &mut Frame<'_>, dv: &DescribeView, area: Rect) {
    let para = Paragraph::new(dv.pretty_json.as_str())
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Describe: {} ", dv.component)),
        )
        .scroll((dv.scroll, 0));
    f.render_widget(para, area);
}

pub(crate) fn render_validate(
    f: &mut Frame<'_>,
    vv: &mut ValidateView,
    area: Rect,
    theme: &Theme,
) {
    let token_max = column_budget(area.width, 12, VALIDATE_TOKEN_PCT);
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
                Cell::from(truncate_cell(&r.token, token_max)),
                Cell::from(r.message.as_str()),
            ])
        })
        .collect();
    let widths = [
        Constraint::Length(7),
        Constraint::Percentage(12),
        Constraint::Percentage(VALIDATE_TOKEN_PCT),
        Constraint::Percentage(60),
    ];
    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title(" Validate "))
        .row_highlight_style(Style::default().bg(theme.selection_bg));
    f.render_stateful_widget(table, area, &mut vv.table_state);
}
