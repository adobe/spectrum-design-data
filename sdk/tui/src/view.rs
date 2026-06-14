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
    style::Style,
    symbols::border,
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph},
    Frame,
};
use tui_popup::Popup;

mod find;
mod home;
mod naming;
mod results;
pub(crate) mod shared;
mod wizard;

use crate::app::{ActiveView, Modal, StatusKind};
use crate::help::{current_help_context, help_text_for, HelpContext};
use crate::model::Model;
use crate::theme::Theme;
use find::render_find;
use home::render_home;
use naming::render_naming;
use results::{render_describe, render_query, render_resolve, render_validate};
use wizard::render_wizard;

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

/// Prepare a centered modal overlay: compute the popup rect, punch a `Clear`
/// hole in the background, and return the rect for the caller to render into.
///
/// All modals that use percentage-based sizing route through here so the
/// `centered_rect` + `Clear` boilerplate lives in exactly one place.
fn modal_frame(f: &mut Frame, area: Rect, percent_x: u16, percent_y: u16) -> Rect {
    let popup_area = centered_rect(percent_x, percent_y, area);
    f.render_widget(Clear, popup_area);
    popup_area
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

    // Pre-extract palette fields before the active_view borrow.
    let palette_input: String = model.palette_input_value().to_string();
    let (palette_visual_cursor, palette_list_selected) =
        if let crate::model::mode::Mode::InPalette(ref ps) = model.mode {
            (ps.input.visual_cursor(), ps.list_selected)
        } else {
            (0, None)
        };

    // Active view.
    match &mut model.active_view {
        ActiveView::Empty => {
            render_home(
                frame,
                chunks[1],
                theme,
                &palette_input,
                palette_visual_cursor,
                palette_list_selected,
            );
        }
        ActiveView::Query(ref mut qv) => render_query(frame, qv, chunks[1], theme),
        ActiveView::Resolve(ref mut rv) => render_resolve(frame, rv, chunks[1], theme),
        ActiveView::Describe(ref dv) => render_describe(frame, dv, chunks[1], theme),
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

    // chunk[3] is kept as a 1-row reserve to stay in sync with compute_hit_regions.
    // The palette prompt lives inside render_home (always-on home palette).

    // Toast overlay — floats over the active view, below any open modal.
    // Rendered before the modal block so an open modal visually wins.
    if let Some(ref toast) = model.toast {
        let color = match toast.kind {
            StatusKind::Info => theme.ok,
            StatusKind::Error => theme.error,
        };
        // Position the toast in the right half of the active view area so it
        // doesn't obscure table headers or the left-aligned content.
        let right_half = Rect::new(
            chunks[1].x + chunks[1].width / 2,
            chunks[1].y,
            chunks[1].width - chunks[1].width / 2,
            chunks[1].height,
        );
        let popup = Popup::new(format!(" {} ", toast.text))
            .border_set(border::ROUNDED)
            .border_style(Style::default().fg(color));
        frame.render_widget(popup, right_half);
    }

    // Resolve help context from the active view before taking the modal borrow.
    let help_ctx = current_help_context(&model.active_view);

    // Overlay modal (rendered last so it appears on top of everything).
    if let Some(modal) = model.modal_mut() {
        // Compute step-indicator label once; each wizard renderer uses it for its title.
        let label = modal.screen_label();
        match modal {
            Modal::Find(ref mut fs) => {
                let popup_area = modal_frame(frame, area, 82, 85);
                render_find(frame, fs, popup_area, theme, &label);
            }
            Modal::Wizard(ref mut ws) => {
                let popup_area = modal_frame(frame, area, 82, 85);
                render_wizard(frame, ws, popup_area, theme, &label);
            }
            Modal::Naming(ref mut ns) => {
                let popup_area = modal_frame(frame, area, 82, 85);
                render_naming(frame, ns, popup_area, theme, &label);
            }
            Modal::Help(ref hm) => {
                render_help_modal(frame, hm.scroll, area, help_ctx);
            }
        }
    }
}

/// Render the Help overlay. Uses a scroll-supporting `Paragraph` because the
/// help text (~80 lines) exceeds a typical terminal height and needs scrolling.
/// The active section for `ctx` is promoted to the top with an `(active)` marker.
/// The modal background is cleared via [`modal_frame`].
fn render_help_modal(f: &mut Frame<'_>, scroll: u16, area: Rect, ctx: HelpContext) {
    let popup_area = modal_frame(f, area, 80, 90);
    let text = help_text_for(ctx);
    let para = Paragraph::new(text.as_str())
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_set(border::ROUNDED)
                .title(" Help  ?/Esc to close "),
        )
        .scroll((scroll, 0));
    f.render_widget(para, popup_area);
}
