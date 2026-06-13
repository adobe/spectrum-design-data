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

use crate::command::{Command, CommandMatch};
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

    let candidates: Vec<CommandMatch> = Command::matches(palette_input);
    // cmd_col: widest canonical name in the candidate set, for alignment.
    let cmd_col = candidates
        .iter()
        .map(|m| m.command.canonical().len())
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

    for (i, m) in candidates.iter().enumerate() {
        let name = m.command.canonical();
        // Selection style: when list is focused (list_selected is Some), the
        // highlighted row gets selection_bg. When input is focused, the top
        // match is bolded as a subtle "this is what Enter will run" hint.
        let selected = list_selected == Some(i);
        let top_hint = list_selected.is_none() && i == 0;
        let row_style = if selected {
            Style::default().bg(theme.selection_bg)
        } else {
            Style::default()
        };
        let desc_style = if selected {
            Style::default().fg(theme.muted).bg(theme.selection_bg)
        } else {
            Style::default().fg(theme.muted)
        };

        // Build per-character name spans so matched positions can be highlighted.
        // Non-matched chars use the base name style; matched chars get a distinct
        // accent + bold treatment on top of the row state (selection/hint).
        let mut name_spans: Vec<Span> = vec![Span::raw(format!("{MARGIN}  "))];
        for (ci, ch) in name.chars().enumerate() {
            let is_match = m.indices.contains(&ci);
            let char_style = match (selected, top_hint, is_match) {
                // Row selected + matched char: accent + bold on selection bg.
                (true, _, true) => Style::default()
                    .fg(theme.accent)
                    .bg(theme.selection_bg)
                    .add_modifier(Modifier::BOLD),
                // Row selected + non-matched: normal accent on selection bg.
                (true, _, false) => Style::default().fg(theme.accent).bg(theme.selection_bg),
                // Top-hint row (Enter will run): bold for all chars; matched
                // chars also get underline so fuzzy hits are still visible.
                (false, true, true) => Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD | Modifier::UNDERLINED),
                (false, true, false) => Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD),
                // Unselected + matched char: accent + underline to show the hit.
                (false, false, true) => Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::UNDERLINED),
                // Unselected + non-matched: plain accent.
                (false, false, false) => Style::default().fg(theme.accent),
            };
            name_spans.push(Span::styled(ch.to_string(), char_style));
        }

        let padding = " ".repeat(cmd_col.saturating_sub(name.len()) + 2);
        name_spans.push(Span::styled(padding, row_style));
        name_spans.push(Span::styled(m.command.description(), desc_style));
        lines.push(Line::from(name_spans).style(row_style));
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
