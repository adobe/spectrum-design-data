// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The `:preview` overlay: a component drawn in half-block cells, with a footer that says
//! which font drew the text and which keys change the preview.

use ratatui::{
    layout::{Constraint, Layout, Rect},
    style::{Color, Style},
    symbols::border,
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph},
    Frame,
};

use crate::preview::{canvas_color, fit, half_blocks, PreviewState};
use crate::theme::Theme;

const HINT: &str = "c light/dark · s size · t state · Esc close";

pub(crate) fn render_preview(f: &mut Frame<'_>, st: &PreviewState, area: Rect, theme: &Theme) {
    let r = &st.request;
    let state = r
        .states
        .first()
        .map_or(String::new(), |s| format!(" · {s}"));
    let block = Block::default()
        .borders(Borders::ALL)
        .border_set(border::ROUNDED)
        .title(format!(
            " Preview: {} · {} · {}{state} ",
            r.component, r.size, r.color_scheme
        ));
    let inner = block.inner(area);
    f.render_widget(block, area);
    let [canvas, footer] =
        Layout::vertical([Constraint::Min(1), Constraint::Length(3)]).areas(inner);

    let (cols, rows) = fit(st.scene_width, st.scene_height, canvas.width, canvas.height);
    let grid = half_blocks(
        &st.rgba,
        st.width as usize,
        st.height as usize,
        canvas_color(&r.color_scheme),
        cols,
        rows,
    );
    let (x0, y0) = (
        canvas.x + (canvas.width.saturating_sub(cols as u16)) / 2,
        canvas.y + (canvas.height.saturating_sub(rows as u16)) / 2,
    );
    let buf = f.buffer_mut();
    for (dy, row) in grid.iter().enumerate() {
        for (dx, (top, bottom)) in row.iter().enumerate() {
            if let Some(cell) = buf.cell_mut((x0 + dx as u16, y0 + dy as u16)) {
                cell.set_symbol("▀")
                    .set_fg(Color::Rgb(top[0], top[1], top[2]))
                    .set_bg(Color::Rgb(bottom[0], bottom[1], bottom[2]));
            }
        }
    }

    let font_color = if st.font_fallback {
        theme.warn
    } else {
        theme.ok
    };
    let mut lines = vec![
        Line::from(vec![
            Span::styled("Font: ", Style::default().fg(theme.muted)),
            Span::styled(st.font.clone(), Style::default().fg(font_color)),
        ]),
        Line::from(Span::styled(HINT, Style::default().fg(theme.muted))),
    ];
    if let Some(note) = st.notes.first() {
        let more = st.notes.len().saturating_sub(1);
        let tail = if more > 0 {
            format!(" (+{more} more)")
        } else {
            String::new()
        };
        lines.insert(
            1,
            Line::from(Span::styled(
                format!("Note: {note}{tail}"),
                Style::default().fg(theme.warn),
            )),
        );
    }
    f.render_widget(Paragraph::new(lines), footer);
}
