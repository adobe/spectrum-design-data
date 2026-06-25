// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Renderers for the mode-set screens in the authoring flow.
//!
//! Extracted from `view/authoring.rs` to stay under the 800-LOC budget cap.

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{List, ListItem, Paragraph},
    Frame,
};

use crate::authoring::{
    AddModeFocus, AddModeFormState, CreateModeSetFocus, CreateModeSetFormState, ModeSetOp,
    ModeSetPickerState, RenameModeFormState, MODE_SET_ACTIONS,
};
use crate::theme::Theme;

use super::authoring::{render_labeled_fields, render_nav_hint};

// ── Mode-set menu ─────────────────────────────────────────────────────────────

pub(super) fn render_mode_set_menu(frame: &mut Frame, selected: usize, area: Rect, theme: &Theme) {
    let items: Vec<ListItem> = MODE_SET_ACTIONS
        .iter()
        .enumerate()
        .map(|(i, label)| {
            let style = if i == selected {
                Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.fg)
            };
            ListItem::new(Line::from(Span::styled(*label, style)))
        })
        .collect();
    let list = List::new(items);
    frame.render_widget(list, area);
    render_nav_hint(frame, area, theme);
}

// ── File picker ───────────────────────────────────────────────────────────────

pub(super) fn render_mode_set_pick_file(
    frame: &mut Frame,
    picker: &mut ModeSetPickerState,
    _op: ModeSetOp,
    area: Rect,
    theme: &Theme,
) {
    if area.height < 3 {
        return;
    }
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(1), Constraint::Min(1)])
        .split(area);

    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled("  Filter: ", Style::default().fg(theme.muted)),
            Span::styled(picker.filter.value(), Style::default().fg(theme.fg)),
        ])),
        chunks[0],
    );

    let items: Vec<ListItem> = picker
        .filtered
        .iter()
        .map(|&i| {
            let f = &picker.files[i];
            ListItem::new(Line::from(vec![
                Span::styled(f.name.as_str(), Style::default().fg(theme.fg)),
                Span::styled(
                    format!("  [{}]", f.modes.join(", ")),
                    Style::default().fg(theme.muted),
                ),
            ]))
        })
        .collect();
    let list = List::new(items).highlight_style(
        Style::default()
            .fg(theme.accent)
            .add_modifier(Modifier::BOLD),
    );
    frame.render_stateful_widget(list, chunks[1], &mut picker.list_state);
}

// ── Mode picker ───────────────────────────────────────────────────────────────

pub(super) fn render_mode_set_pick_mode(
    frame: &mut Frame,
    modes: &[String],
    selected: usize,
    _op: ModeSetOp,
    area: Rect,
    theme: &Theme,
) {
    let items: Vec<ListItem> = modes
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let style = if i == selected {
                Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.fg)
            };
            ListItem::new(Line::from(Span::styled(m.as_str(), style)))
        })
        .collect();
    frame.render_widget(List::new(items), area);
    render_nav_hint(frame, area, theme);
}

// ── Add mode form ─────────────────────────────────────────────────────────────

pub(super) fn render_add_mode_form(
    frame: &mut Frame,
    f: &AddModeFormState,
    area: Rect,
    theme: &Theme,
) {
    let fields: &[(&str, &str, bool)] = &[
        ("mode-set", f.file.name.as_str(), false),
        ("new mode *", f.mode.value(), f.focus == AddModeFocus::Mode),
        (
            "make default",
            if f.make_default { "yes" } else { "no" },
            f.focus == AddModeFocus::MakeDefault,
        ),
    ];
    render_labeled_fields(frame, "", fields, area, theme);
}

// ── Rename mode form ──────────────────────────────────────────────────────────

pub(super) fn render_rename_mode_form(
    frame: &mut Frame,
    f: &RenameModeFormState,
    area: Rect,
    theme: &Theme,
) {
    let fields: &[(&str, &str, bool)] = &[
        ("mode-set", f.file.name.as_str(), false),
        ("old mode", f.old_mode.as_str(), false),
        ("new mode *", f.new_mode.value(), true),
    ];
    render_labeled_fields(frame, "", fields, area, theme);
}

// ── Create mode-set form ──────────────────────────────────────────────────────

pub(super) fn render_create_mode_set_form(
    frame: &mut Frame,
    f: &CreateModeSetFormState,
    area: Rect,
    theme: &Theme,
) {
    if area.height < 4 {
        return;
    }
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled(
                "  name *       : ",
                Style::default().fg(if f.focus == CreateModeSetFocus::Name {
                    theme.accent
                } else {
                    theme.muted
                }),
            ),
            Span::styled(f.name.value(), Style::default().fg(theme.fg)),
        ])),
        Rect { height: 1, ..area },
    );

    let modes_y = area.y + 1;
    let max_mode_rows = area.height.saturating_sub(4) as usize;
    let mut y = modes_y;
    let modes_label_style = if f.focus == CreateModeSetFocus::Modes {
        Style::default().fg(theme.accent)
    } else {
        Style::default().fg(theme.muted)
    };
    frame.render_widget(
        Paragraph::new(Span::styled("  modes (+/Ctrl-D/j/k):", modes_label_style)),
        Rect {
            y,
            height: 1,
            ..area
        },
    );
    y += 1;
    for (i, row) in f.modes.iter().enumerate().take(max_mode_rows) {
        let is_sel = i == f.selected_mode_idx && f.focus == CreateModeSetFocus::Modes;
        let row_style = if is_sel {
            Style::default()
                .fg(theme.accent)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme.fg)
        };
        let default_marker = if i == f.default_idx { " (default)" } else { "" };
        frame.render_widget(
            Paragraph::new(Line::from(vec![
                Span::styled(format!("    [{i}] "), Style::default().fg(theme.muted)),
                Span::styled(
                    format!("{}{}", row.value.value(), default_marker),
                    row_style,
                ),
            ])),
            Rect {
                y,
                height: 1,
                ..area
            },
        );
        y += 1;
    }

    let desc_y = area.y + area.height.saturating_sub(2);
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled(
                "  description  : ",
                Style::default().fg(if f.focus == CreateModeSetFocus::Description {
                    theme.accent
                } else {
                    theme.muted
                }),
            ),
            Span::styled(f.description.value(), Style::default().fg(theme.fg)),
        ])),
        Rect {
            y: desc_y,
            height: 1,
            ..area
        },
    );

    let hint_y = area.y + area.height.saturating_sub(1);
    frame.render_widget(
        Paragraph::new(Span::styled(
            "  Tab: next field   Enter(description): confirm   Esc: cancel",
            Style::default().fg(theme.muted),
        )),
        Rect {
            y: hint_y,
            height: 1,
            ..area
        },
    );
}
