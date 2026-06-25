// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Renderer for the authoring action-picker modal (Phase B / si6.2).

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Clear, List, ListItem, ListState, Paragraph, Row, Table},
    Frame,
};

use crate::authoring::{
    AddModeFocus, AddModeFormState, AuthoringMenuState, AuthoringScreen, CreateModeSetFocus,
    CreateModeSetFormState, DeprecateFocus, EditFocus, ModeSetOp, ModeSetPickerState,
    RenameModeFormState, RewireFocus, ACTIONS, MODE_SET_ACTIONS,
};
use crate::theme::Theme;

// ── Entry point ────────────────────────────────────────────────────────────────

pub(crate) fn render_authoring(
    frame: &mut Frame,
    state: &mut AuthoringMenuState,
    area: Rect,
    theme: &Theme,
    _label: &str,
) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Authoring ")
        .border_style(Style::default().fg(theme.muted));
    let inner = block.inner(area);
    frame.render_widget(Clear, area);
    frame.render_widget(block, area);

    // Error bar at the very bottom of the popup.
    if let Some(ref err) = state.error {
        let err_y = inner.y + inner.height.saturating_sub(2);
        let err_area = Rect {
            y: err_y,
            height: 1,
            ..inner
        };
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                format!("  error: {err}"),
                Style::default().fg(theme.error),
            ))),
            err_area,
        );
    }
    let content_h = if state.error.is_some() {
        inner.height.saturating_sub(2)
    } else {
        inner.height
    };
    let content_area = Rect {
        height: content_h,
        ..inner
    };

    match &mut state.screen {
        AuthoringScreen::PickAction { selected } => {
            render_pick_action(frame, *selected, content_area, theme);
        }
        AuthoringScreen::PickToken { picker, .. } => {
            let filter_val = picker.filter.value().to_string();
            let rows: Vec<Row> = picker
                .filtered
                .iter()
                .map(|&i| {
                    let r = &picker.rows[i];
                    Row::new(vec![
                        Cell::from(r.name.clone()),
                        Cell::from(r.layer.clone()),
                    ])
                })
                .collect();
            render_picker(
                frame,
                &filter_val,
                rows,
                &mut picker.table_state,
                content_area,
                theme,
            );
        }
        AuthoringScreen::EditForm(f) => render_edit_form(frame, f, content_area, theme),
        AuthoringScreen::DeprecateForm(f) => render_deprecate_form(frame, f, content_area, theme),
        AuthoringScreen::RenameForm(f) => render_rename_form(frame, f, content_area, theme),
        AuthoringScreen::RewireForm(f) => render_rewire_form(frame, f, content_area, theme),
        AuthoringScreen::RemoveConfirm { token } => {
            let text = format!(
                "Remove token: {}\n  UUID: {}\n  File: {}\n\nPress Enter to confirm, Esc to cancel.",
                token.name, token.uuid, token.source_path.display()
            );
            frame.render_widget(
                Paragraph::new(text).wrap(ratatui::widgets::Wrap { trim: false }),
                content_area,
            );
        }
        AuthoringScreen::Confirm { summary, .. } => {
            let text = format!("{summary}\n\nPress Enter to execute, Esc to cancel.");
            frame.render_widget(
                Paragraph::new(text).wrap(ratatui::widgets::Wrap { trim: false }),
                content_area,
            );
        }
        AuthoringScreen::ModeSetMenu { selected } => {
            render_mode_set_menu(frame, *selected, content_area, theme)
        }
        AuthoringScreen::ModeSetPickFile { picker, op } => {
            render_mode_set_pick_file(frame, picker, *op, content_area, theme)
        }
        AuthoringScreen::ModeSetPickMode {
            modes,
            selected,
            op,
            ..
        } => render_mode_set_pick_mode(frame, modes, *selected, *op, content_area, theme),
        AuthoringScreen::AddModeForm(f) => render_add_mode_form(frame, f, content_area, theme),
        AuthoringScreen::RenameModeForm(f) => {
            render_rename_mode_form(frame, f, content_area, theme)
        }
        AuthoringScreen::CreateModeSetForm(f) => {
            render_create_mode_set_form(frame, f, content_area, theme)
        }
    }
}

// ── Action picker ──────────────────────────────────────────────────────────────

fn render_pick_action(frame: &mut Frame, selected: usize, area: Rect, theme: &Theme) {
    let items: Vec<ListItem> = ACTIONS
        .iter()
        .enumerate()
        .map(|(i, (label, enabled))| {
            let style = if !enabled {
                Style::default().fg(theme.muted)
            } else if i == selected {
                Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.fg)
            };
            let prefix = if i == selected { "▶ " } else { "  " };
            ListItem::new(Line::from(Span::styled(format!("{prefix}{label}"), style)))
        })
        .collect();

    let mut list_state = ListState::default();
    list_state.select(Some(selected));
    let list = List::new(items).highlight_symbol("▶ ");
    frame.render_stateful_widget(list, area, &mut list_state);

    if area.height > ACTIONS.len() as u16 + 1 {
        let hint_y = area.y + ACTIONS.len() as u16 + 1;
        if hint_y < area.y + area.height {
            frame.render_widget(
                Paragraph::new(Span::styled(
                    "  Enter: select   ↑↓/j/k: navigate   Esc: close",
                    Style::default().fg(theme.muted),
                )),
                Rect {
                    y: hint_y,
                    height: 1,
                    ..area
                },
            );
        }
    }
}

// ── Token picker ───────────────────────────────────────────────────────────────

fn render_picker<'a>(
    frame: &mut Frame,
    filter: &str,
    rows: Vec<Row<'a>>,
    table_state: &mut ratatui::widgets::TableState,
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

    // Filter input line.
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled("  Filter: ", Style::default().fg(theme.muted)),
            Span::styled(filter, Style::default().fg(theme.fg)),
        ])),
        chunks[0],
    );

    let table = Table::new(
        rows,
        [Constraint::Percentage(70), Constraint::Percentage(30)],
    )
    .header(
        Row::new(vec!["Name", "Layer"]).style(
            Style::default()
                .add_modifier(Modifier::BOLD)
                .fg(theme.muted),
        ),
    )
    .row_highlight_style(
        Style::default()
            .fg(theme.accent)
            .add_modifier(Modifier::BOLD),
    );
    frame.render_stateful_widget(table, chunks[1], table_state);
}

// ── Edit form ──────────────────────────────────────────────────────────────────

fn render_edit_form(
    frame: &mut Frame,
    f: &crate::authoring::EditFormState,
    area: Rect,
    theme: &Theme,
) {
    if area.height < 4 {
        return;
    }

    // Title line.
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled("  Edit: ", Style::default().fg(theme.muted)),
            Span::styled(f.token.name.as_str(), Style::default().fg(theme.fg)),
        ])),
        Rect { height: 1, ..area },
    );

    let body_h = area.height.saturating_sub(3);
    let body = Rect {
        y: area.y + 1,
        height: body_h,
        ..area
    };
    let rows: Vec<Row> = f
        .fields
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let focused = i == f.selected_idx && f.focus == EditFocus::Fields;
            let key_style = if focused {
                Style::default().fg(theme.accent)
            } else {
                Style::default().fg(theme.muted)
            };
            let val = if f.editing && focused {
                if row.editing_key {
                    format!("[key: {}]", row.key_input.value())
                } else {
                    row.value.value().to_string()
                }
            } else {
                row.value.value().to_string()
            };
            let sel_style = if focused {
                Style::default()
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };
            Row::new(vec![
                Cell::from(row.key.as_str()).style(key_style),
                Cell::from(val).style(sel_style),
            ])
        })
        .collect();

    let mut ts = ratatui::widgets::TableState::default();
    if f.focus == EditFocus::Fields && !f.fields.is_empty() {
        ts.select(Some(f.selected_idx));
    }
    let table = Table::new(
        rows,
        [Constraint::Percentage(35), Constraint::Percentage(65)],
    )
    .header(
        Row::new(vec!["Field", "Value"]).style(
            Style::default()
                .add_modifier(Modifier::BOLD)
                .fg(theme.muted),
        ),
    )
    .row_highlight_style(
        Style::default()
            .fg(theme.accent)
            .add_modifier(Modifier::BOLD),
    );
    frame.render_stateful_widget(table, body, &mut ts);

    // Rationale line.
    let rat_y = area.y + area.height.saturating_sub(2);
    let rat_style = if f.focus == EditFocus::Rationale {
        Style::default().fg(theme.accent)
    } else {
        Style::default().fg(theme.muted)
    };
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled("  Rationale: ", rat_style),
            Span::styled(f.rationale.value(), Style::default().fg(theme.fg)),
        ])),
        Rect {
            y: rat_y,
            height: 1,
            ..area
        },
    );

    // Hint line.
    let hint_y = area.y + area.height.saturating_sub(1);
    frame.render_widget(
        Paragraph::new(Span::styled(
            "  Tab: rationale   Enter: edit field   +: add row   Ctrl-D: delete row",
            Style::default().fg(theme.muted),
        )),
        Rect {
            y: hint_y,
            height: 1,
            ..area
        },
    );
}

// ── Deprecate form ─────────────────────────────────────────────────────────────

fn render_deprecate_form(
    frame: &mut Frame,
    f: &crate::authoring::DeprecateFormState,
    area: Rect,
    theme: &Theme,
) {
    let replaced_by_str = if let Some(ref t) = f.replaced_by {
        t.name.as_str()
    } else {
        "(none — Enter to pick)"
    };
    let fields: &[(&str, &str, bool)] = &[
        (
            "spec_version *",
            f.spec_version.value(),
            f.focus == DeprecateFocus::SpecVersion,
        ),
        (
            "comment",
            f.deprecated_comment.value(),
            f.focus == DeprecateFocus::Comment,
        ),
        (
            "replaced_by",
            replaced_by_str,
            f.focus == DeprecateFocus::ReplacedBy,
        ),
        (
            "planned_removal",
            f.planned_removal.value(),
            f.focus == DeprecateFocus::PlannedRemoval,
        ),
        (
            "rationale",
            f.rationale.value(),
            f.focus == DeprecateFocus::Rationale,
        ),
    ];
    render_labeled_fields(
        frame,
        &format!("Deprecate: {}", f.token.name),
        fields,
        area,
        theme,
    );
}

// ── Rename form ────────────────────────────────────────────────────────────────

fn render_rename_form(
    frame: &mut Frame,
    f: &crate::authoring::RenameFormState,
    area: Rect,
    theme: &Theme,
) {
    if area.height < 3 {
        return;
    }
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled("  Rename: ", Style::default().fg(theme.muted)),
            Span::styled(f.token.name.as_str(), Style::default().fg(theme.fg)),
            Span::styled(" — new classification", Style::default().fg(theme.muted)),
        ])),
        Rect { height: 1, ..area },
    );

    let body_h = area.height.saturating_sub(3);
    let body = Rect {
        y: area.y + 1,
        height: body_h,
        ..area
    };
    let c = &f.classification;
    let mut lines: Vec<Line> = Vec::new();

    let layer_style = if c.focused_field == 0 {
        Style::default().fg(theme.accent)
    } else {
        Style::default().fg(theme.fg)
    };
    lines.push(Line::from(vec![
        Span::styled("  layer     : ", Style::default().fg(theme.muted)),
        Span::styled(format!("{:?}", c.layer), layer_style),
    ]));
    let prop_style = if c.focused_field == 1 {
        Style::default().fg(theme.accent)
    } else {
        Style::default().fg(theme.fg)
    };
    lines.push(Line::from(vec![
        Span::styled("  property  : ", Style::default().fg(theme.muted)),
        Span::styled(c.property.value().to_string(), prop_style),
    ]));
    for (i, nf) in c.name_fields.iter().enumerate() {
        let nf_style = if c.focused_field == i + 2 {
            Style::default().fg(theme.accent)
        } else {
            Style::default().fg(theme.fg)
        };
        lines.push(Line::from(vec![
            Span::styled(
                format!("  {:10}: ", nf.key),
                Style::default().fg(theme.muted),
            ),
            Span::styled(nf.value.value().to_string(), nf_style),
        ]));
    }
    frame.render_widget(Paragraph::new(lines), body);

    let hint_y = area.y + area.height.saturating_sub(1);
    frame.render_widget(
        Paragraph::new(Span::styled(
            "  Tab: next field  +: add field  Enter(rationale): confirm  Esc: cancel",
            Style::default().fg(theme.muted),
        )),
        Rect {
            y: hint_y,
            height: 1,
            ..area
        },
    );
}

// ── Rewire form ────────────────────────────────────────────────────────────────

fn render_rewire_form(
    frame: &mut Frame,
    f: &crate::authoring::RewireFormState,
    area: Rect,
    theme: &Theme,
) {
    let new_ref_str = if let Some(ref t) = f.new_ref {
        t.name.as_str()
    } else {
        "(none — Enter to pick)"
    };
    let fields: &[(&str, &str, bool)] = &[
        ("new_ref *", new_ref_str, f.focus == RewireFocus::NewRef),
        (
            "rationale",
            f.rationale.value(),
            f.focus == RewireFocus::Rationale,
        ),
    ];
    render_labeled_fields(
        frame,
        &format!("Rewire: {}", f.token.name),
        fields,
        area,
        theme,
    );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

/// Render a titled list of labeled fields with focus highlighting.
fn render_labeled_fields(
    frame: &mut Frame,
    title: &str,
    fields: &[(&str, &str, bool)],
    area: Rect,
    theme: &Theme,
) {
    if area.height < 2 {
        return;
    }
    frame.render_widget(
        Paragraph::new(Line::from(Span::styled(
            format!("  {title}"),
            Style::default().fg(theme.fg),
        ))),
        Rect { height: 1, ..area },
    );
    let mut y = area.y + 1;
    for (label, value, focused) in fields {
        if y >= area.y + area.height.saturating_sub(1) {
            break;
        }
        let label_style = if *focused {
            Style::default().fg(theme.accent)
        } else {
            Style::default().fg(theme.muted)
        };
        let val_style = if *focused {
            Style::default().fg(theme.accent)
        } else {
            Style::default().fg(theme.fg)
        };
        frame.render_widget(
            Paragraph::new(Line::from(vec![
                Span::styled(format!("  {label:<20}: "), label_style),
                Span::styled(*value, val_style),
            ])),
            Rect {
                y,
                height: 1,
                ..area
            },
        );
        y += 1;
    }
    if y < area.y + area.height {
        frame.render_widget(
            Paragraph::new(Span::styled(
                "  Tab/Shift-Tab: move   Esc: cancel",
                Style::default().fg(theme.muted),
            )),
            Rect {
                y,
                height: 1,
                ..area
            },
        );
    }
}

fn render_nav_hint(frame: &mut Frame, area: Rect, theme: &Theme) {
    let y = area.y + area.height.saturating_sub(1);
    frame.render_widget(
        Paragraph::new(Span::styled(
            "  j/k: move   Enter: select   Esc: back",
            Style::default().fg(theme.muted),
        )),
        Rect {
            y,
            height: 1,
            ..area
        },
    );
}

fn render_mode_set_menu(frame: &mut Frame, selected: usize, area: Rect, theme: &Theme) {
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

fn render_mode_set_pick_file(
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

fn render_mode_set_pick_mode(
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

fn render_add_mode_form(frame: &mut Frame, f: &AddModeFormState, area: Rect, theme: &Theme) {
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

// ── Rename mode form ─────────────────────────────────────────────────────────

fn render_rename_mode_form(frame: &mut Frame, f: &RenameModeFormState, area: Rect, theme: &Theme) {
    let fields: &[(&str, &str, bool)] = &[
        ("mode-set", f.file.name.as_str(), false),
        ("old mode", f.old_mode.as_str(), false),
        ("new mode *", f.new_mode.value(), true),
    ];
    render_labeled_fields(frame, "", fields, area, theme);
}

// ── Create mode-set form ──────────────────────────────────────────────────────

fn render_create_mode_set_form(
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
