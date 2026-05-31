// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `Message` — the flat event enum for the TUI runtime (GH #1019).
//!
//! # Variant size budget: 128 bytes
//!
//! Every variant must fit in ≤ 128 bytes (`size_of::<Message>() <= 128`).
//! Box any payload larger than ~112 bytes to keep the enum compact. The
//! budget is enforced by the `message_size_budget` unit test below.

use crossterm::event::{KeyEvent, MouseEvent};
use serde::{Deserialize, Serialize};

use crate::app_views::{DescribeView, DiagnosticRow};

/// Every event that can flow through the TUI runtime's `update` function.
///
/// Variants are grouped by source: raw input, palette lifecycle, per-modal
/// events, and side-effect completion signals.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    // ── Raw input ─────────────────────────────────────────────────────────────
    /// A key press event from crossterm.
    Key(KeyEvent),
    /// A mouse event from crossterm.
    Mouse(MouseEvent),
    /// Periodic tick emitted by the runtime's event loop (~16 ms cadence).
    Tick,

    // ── Palette lifecycle ─────────────────────────────────────────────────────
    /// The command palette was submitted (Enter while open). Carries the raw
    /// input string.
    PaletteSubmit(String),
    /// The command palette was dismissed without submitting (Esc).
    PaletteCancel,
    /// The user navigated palette history (↑ = older, ↓ = newer).
    PaletteHistoryNav { older: bool },

    // ── Wizard (token-authoring modal) ────────────────────────────────────────
    /// The wizard advanced to the next screen (Enter on Screen 1/2/3).
    WizardAdvance,
    /// The wizard stepped back to the previous screen.
    WizardBack,
    /// The wizard's confirm screen was submitted (Enter on Screen 4).
    WizardConfirm,
    /// The wizard was dismissed (Esc or Ctrl-C inside modal).
    WizardCancel,

    // ── Naming modal ──────────────────────────────────────────────────────────
    /// The naming wizard completed and produced a name to copy.
    NamingCopy(String),
    /// The naming wizard was dismissed.
    NamingCancel,

    // ── Find modal ────────────────────────────────────────────────────────────
    /// The find wizard previewed results and the user confirmed (Enter on
    /// Preview screen).
    FindOpenResults,
    /// The find wizard was dismissed.
    FindCancel,

    // ── Side-effect completions ───────────────────────────────────────────────
    /// A write-token operation completed. `Ok` carries the assembled token name
    /// and the written path (so the confirmation can name the token);
    /// `Err` carries the error string.
    WriteDone(Result<(String, std::path::PathBuf), String>),
    /// A clipboard write completed. `None` = success; `Some(err)` = failure message.
    ClipboardDone(Option<String>),
    /// A `describe` component FS read completed. `Ok` carries the rendered view;
    /// `Err` carries the error string. Boxed to keep the enum within budget.
    DescribeDone(Box<Result<DescribeView, String>>),
    /// A `validate` FS scan completed. `Ok` carries the diagnostic rows;
    /// `Err` carries the error string. Boxed to keep the enum within budget.
    ValidateDone(Box<Result<Vec<DiagnosticRow>, String>>),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn message_size_budget() {
        // Box large variants from day one. If this fails, Box the offending payload.
        assert!(
            std::mem::size_of::<Message>() <= 128,
            "Message is {} bytes — exceeds 128-byte budget; box large payloads",
            std::mem::size_of::<Message>()
        );
    }
}
