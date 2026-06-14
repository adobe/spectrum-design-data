// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Naming-wizard render helpers (`render_naming`, `render_naming_result`).
//! Extracted from `view.rs` to keep source files within the 800-LOC budget
//! enforced by `tests/budget.rs` (GH #1018).

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::Span,
    widgets::{Block, Borders, Paragraph},
    Frame,
};

use super::shared::{render_classification_content, render_intent_content};
use crate::naming::{NamingScreen, NamingWizardState};
use crate::theme::Theme;

pub(crate) fn render_naming(
    f: &mut Frame<'_>,
    ns: &NamingWizardState,
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
        ratatui::text::Line::from("  Press c or y to copy this name to the clipboard."),
        ratatui::text::Line::from("  Press e to go back and refine the classification."),
        ratatui::text::Line::from("  Press Esc or q to close without copying."),
    ])
    .style(Style::default().fg(theme.muted));
    f.render_widget(hint, chunks[1]);
}
