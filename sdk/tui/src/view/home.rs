// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Home screen render helper (`render_home`). Extracted from `view.rs` to keep
//! source files within the 800-LOC budget enforced by `tests/budget.rs`
//! (GH #1018).

use ratatui::{
    layout::{Alignment, Position, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
    Frame,
};

use crate::command::Command;
use crate::logo::LOGO;
use crate::theme::Theme;

/// Render the home screen: always-on command palette, Obsidian-style.
/// Layout: logo? · name+version · hint · separator · "> {input}" · filtered list.
pub(crate) fn render_home(
    frame: &mut Frame<'_>,
    area: Rect,
    theme: &Theme,
    palette_input: &str,
    palette_visual_cursor: usize,
    list_selected: Option<usize>,
) {
    const MARGIN: &str = "  ";
    const PROMPT_PREFIX: &str = "> ";

    let filtered = Command::filter(palette_input);
    // cmd_col: widest canonical name in the filtered set, for alignment.
    let cmd_col = filtered
        .iter()
        .map(|c| c.canonical().len())
        .max()
        .unwrap_or(0);

    let version = env!("CARGO_PKG_VERSION");
    let logo_lines: Vec<&str> = LOGO.lines().collect();
    // non_logo_height: name + hint + separator + prompt + up-to-8 commands + spacers
    let non_logo_height: u16 = 13;
    let show_logo = area.height >= logo_lines.len() as u16 + 1 + non_logo_height;

    let mut lines: Vec<Line> = Vec::new();

    if show_logo {
        for l in &logo_lines {
            lines.push(Line::from(format!("{MARGIN}{l}")));
        }
        lines.push(Line::from(""));
    }

    lines.push(Line::from(vec![
        Span::raw(MARGIN),
        Span::styled(
            "Spectrum Design Data",
            Style::default().add_modifier(Modifier::BOLD),
        ),
        Span::styled(format!("  v{version}"), Style::default().fg(theme.muted)),
    ]));
    lines.push(Line::from(vec![
        Span::raw(MARGIN),
        Span::styled(
            "↑↓ history/list · Tab complete · Enter run · Esc back · Ctrl+C quit",
            Style::default().fg(theme.muted),
        ),
    ]));
    lines.push(Line::from(vec![
        Span::raw(MARGIN),
        Span::styled(
            "─".repeat(area.width.saturating_sub(MARGIN.len() as u16) as usize),
            Style::default().fg(theme.muted),
        ),
    ]));
    lines.push(Line::from(vec![
        Span::raw(MARGIN),
        Span::raw(PROMPT_PREFIX),
        Span::raw(palette_input),
    ]));

    for (i, cmd) in filtered.iter().enumerate() {
        let name = cmd.canonical();
        // Selection style: when list is focused (list_selected is Some), the
        // highlighted row gets selection_bg. When input is focused, the top
        // match is bolded as a subtle "this is what Enter will run" hint.
        let (row_style, name_style) = if list_selected == Some(i) {
            (
                Style::default().bg(theme.selection_bg),
                Style::default()
                    .fg(theme.accent)
                    .bg(theme.selection_bg)
                    .add_modifier(Modifier::BOLD),
            )
        } else if list_selected.is_none() && i == 0 {
            (
                Style::default(),
                Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD),
            )
        } else {
            (Style::default(), Style::default().fg(theme.accent))
        };
        let padding = " ".repeat(cmd_col.saturating_sub(name.len()) + 2);
        let desc_style = if list_selected == Some(i) {
            Style::default().fg(theme.muted).bg(theme.selection_bg)
        } else {
            Style::default().fg(theme.muted)
        };
        lines.push(
            Line::from(vec![
                Span::styled(format!("{MARGIN}  {name}"), name_style),
                Span::styled(padding, row_style),
                Span::styled(cmd.description(), desc_style),
            ])
            .style(row_style),
        );
    }

    // Prompt row offset: logo+spacer (if shown) + name + hint + separator = N.
    let prompt_offset: u16 = if show_logo {
        logo_lines.len() as u16 + 4
    } else {
        3
    };
    frame.render_widget(Paragraph::new(lines).alignment(Alignment::Left), area);
    // Cursor always stays on the prompt line, even while browsing the list.
    frame.set_cursor_position(Position {
        x: area.x + MARGIN.len() as u16 + PROMPT_PREFIX.len() as u16 + palette_visual_cursor as u16,
        y: area.y + prompt_offset,
    });
}
