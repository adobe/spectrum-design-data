// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared wizard/naming screen-body renderers (`render_intent_content`,
//! `render_classification_content`). Extracted from `view.rs` to keep source
//! files within the 800-LOC budget enforced by `tests/budget.rs` (GH #1018).

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Cell, Paragraph, Row, Table},
    Frame,
};

use crate::theme::Theme;
use crate::wizard::ClassificationDraft;

pub(crate) fn render_intent_content(
    f: &mut Frame<'_>,
    can_alias: bool,
    intent_value: &str,
    suggestions: &[design_data_core::suggest::SuggestionResult],
    selected_suggestion: usize,
    area: Rect,
    theme: &Theme,
) {
    let banner_height: u16 = if can_alias { 3 } else { 0 };
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Length(banner_height),
            Constraint::Min(0),
        ])
        .split(area);

    let intent_line = format!("Intent: {intent_value}");
    f.render_widget(Paragraph::new(intent_line), chunks[0]);

    if can_alias {
        let accent = Style::default()
            .fg(theme.accent)
            .add_modifier(Modifier::BOLD);
        let banner = Paragraph::new(vec![
            Line::from(Span::styled(
                "  These tokens already exist for similar intents.",
                accent,
            )),
            Line::from(Span::styled(
                "  Reusing one keeps the cascade healthy.  Tab to alias · Enter to create new",
                Style::default().fg(theme.accent),
            )),
        ]);
        f.render_widget(banner, chunks[1]);
    }

    let list_area = chunks[2];
    if suggestions.is_empty() {
        if !intent_value.is_empty() {
            f.render_widget(
                Paragraph::new("  (no suggestions — will create new token)"),
                list_area,
            );
        } else {
            f.render_widget(
                Paragraph::new("  Type to search for existing tokens…"),
                list_area,
            );
        }
    } else {
        let sources: Vec<String> = suggestions
            .iter()
            .map(|s| {
                s.file
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .trim_end_matches(".tokens.json")
                    .to_string()
            })
            .collect();
        let source_col_width = sources.iter().map(|s| s.len()).max().unwrap_or(0).min(24) as u16;
        let rows: Vec<Row> = suggestions
            .iter()
            .enumerate()
            .zip(sources.iter())
            .map(|((i, s), source)| {
                let marker = if i == selected_suggestion { "▶" } else { " " };
                let conf = format!("{:.0}%", s.confidence * 100.0);
                Row::new(vec![
                    Cell::from(marker),
                    Cell::from(s.display_name()),
                    Cell::from(Span::styled(
                        source.clone(),
                        Style::default().fg(theme.muted),
                    )),
                    Cell::from(conf),
                ])
            })
            .collect();
        let widths = [
            Constraint::Length(2),
            Constraint::Min(0),
            Constraint::Length(source_col_width),
            Constraint::Length(5),
        ];
        let table =
            Table::new(rows, widths).row_highlight_style(Style::default().bg(theme.selection_bg));
        f.render_widget(table, list_area);
    }
}

pub(crate) fn render_classification_content(
    f: &mut Frame<'_>,
    classification: &ClassificationDraft,
    assembled_name: &str,
    area: Rect,
) {
    let layer_str = match classification.layer {
        design_data_core::graph::Layer::Foundation => "Foundation",
        design_data_core::graph::Layer::Platform => "Platform",
        design_data_core::graph::Layer::Product => "Product",
    };

    let mut lines: Vec<Line> = Vec::new();
    let focused = classification.focused_field;

    let layer_label = if focused == 0 {
        format!("▶ Layer:    ← {layer_str} →")
    } else {
        format!("  Layer:      {layer_str}")
    };
    lines.push(Line::from(layer_label));

    let prop_label = if focused == 1 {
        format!("▶ Property: {}", classification.property.value())
    } else {
        format!("  Property: {}", classification.property.value())
    };
    lines.push(Line::from(prop_label));

    for (i, field) in classification.name_fields.iter().enumerate() {
        let marker = if focused == i + 2 { "▶" } else { " " };
        lines.push(Line::from(format!(
            "{marker} {}: {}",
            field.key,
            field.value.value()
        )));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(format!("  Preview: {assembled_name}")));

    f.render_widget(Paragraph::new(lines), area);
}
