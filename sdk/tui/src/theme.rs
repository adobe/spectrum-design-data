// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Semantic color palette for the TUI.
//!
//! Two built-in presets:
//! - `terminal` (default): terminal-native colors; works in any 256-color terminal.
//! - `spectrum`: Adobe Spectrum palette; requires a 24-bit (truecolor) terminal.

use ratatui::style::Color;

/// A palette of semantic colors used throughout the TUI.
pub struct Theme {
    /// Primary foreground text.
    pub fg: Color,
    /// Muted / secondary text (hints, dim labels, DarkGray in terminal preset).
    pub muted: Color,
    /// Accent / highlight color (selection highlight, focused borders).
    pub accent: Color,
    /// Positive feedback (info messages, ok indicator, primer arrow).
    pub ok: Color,
    /// Warning / caution indicator.
    pub warn: Color,
    /// Error messages, write failures.
    pub error: Color,
    /// Background for selected table rows and drag-select regions.
    pub selection_bg: Color,
}

impl Theme {
    /// Terminal-native default.
    ///
    /// Uses `Color::Reset` for fg so the terminal's own foreground remains active;
    /// other slots map to standard 16-color names supported everywhere.
    pub fn terminal() -> Self {
        Self {
            fg: Color::Reset,
            muted: Color::DarkGray,
            accent: Color::Yellow,
            ok: Color::Green,
            warn: Color::Yellow,
            error: Color::Red,
            selection_bg: Color::DarkGray,
        }
    }

    /// Adobe Spectrum palette.
    ///
    /// Requires a 24-bit (truecolor) terminal. Key swatches:
    /// - Accent / Indigo 700: `#4046CA`
    /// - OK / Celery 700:     `#268E6C`
    /// - Warn / Orange 700:   `#CB5D00`
    /// - Error / Red 700:     `#C9252D`
    /// - Muted / Gray 600:    `#767676`
    pub fn spectrum() -> Self {
        Self {
            fg: Color::Rgb(29, 29, 29),
            muted: Color::Rgb(118, 118, 118),
            accent: Color::Rgb(64, 70, 202),
            ok: Color::Rgb(38, 142, 108),
            warn: Color::Rgb(203, 93, 0),
            error: Color::Rgb(201, 37, 45),
            // Intentionally matches accent (Indigo 700) to give selected rows visual
            // weight. A future UX pass may pick a distinct selection swatch if contrast
            // proves insufficient for light-background text.
            selection_bg: Color::Rgb(64, 70, 202),
        }
    }
}
