// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Static content for the TUI home / start screen: the Spectrum ASCII-art logo
//! and the command reference table shown on launch and on `Esc`.

/// Spectrum block-character logo (17 lines, 44 columns wide).
// Raw string avoids the `\<newline>` whitespace-stripping behaviour that would
// eat the leading spaces on the first line if a regular string continuation were used.
pub const LOGO: &str = r"                ████
             ██████████
           ██████████████
             ██████████
         ▄▄     ████     ▄▄
       ██████          ██████
      ██████████    ██████████
         ██████████████████
   ███      ████████████      ███
 ████████      ██████      ████████
████████████            ████████████
   █████████████    █████████████
      █████████████████████████
         ███████████████████
            █████████████
               ███████
                 ▀▀▀                ";

/// Command reference used by tests in this module and `command.rs` to guard
/// against silent drift between logo.rs, help.rs, and the command dispatcher.
///
/// Each entry is `(name, description)`. Names **must be ASCII-only**; see
/// `command_names_are_ascii` in the test module below.
#[cfg(test)]
pub(crate) const COMMANDS: &[(&str, &str)] = &[
    ("query <expr>", "Filter tokens  e.g. background-color/*"),
    (
        "resolve property=<name>",
        "Resolve a property through the cascade",
    ),
    ("describe <component>", "Inspect a component schema"),
    ("validate", "Validate all tokens against schemas"),
    ("new [<intent>]", "Open the token authoring wizard"),
    ("name [<intent>]", "Open the token naming wizard"),
    ("find", "Open the fuzzy-find token explorer"),
    ("quit", "Quit the TUI"),
    ("?", "Toggle help"),
];

#[cfg(test)]
mod tests {
    use super::*;
    use crate::help::{help_text_for, HelpContext};

    /// All command names in COMMANDS must be ASCII-only. The render code uses
    /// `name.len()` (byte count) as the display-column width, which is only
    /// correct for ASCII. This test fails fast if a non-ASCII glyph sneaks in.
    #[test]
    fn command_names_are_ascii() {
        for (name, _) in COMMANDS {
            assert!(
                name.is_ascii(),
                "COMMANDS entry {name:?} contains non-ASCII characters; \
                 update render_home to use unicode-width before adding non-ASCII names"
            );
        }
    }

    /// Every palette command in COMMANDS must appear in the help text.
    ///
    /// **Coverage:** this test proves COMMANDS ⊆ help text (one direction).
    /// It does *not* prove the reverse (a command added to help.rs but not
    /// COMMANDS won't be caught), and it does not verify that
    /// `update/command.rs` actually dispatches each command. The dispatcher in
    /// `update/command.rs` is a flat `match` on string literals — if you add a
    /// command there, also add it here and to `help.rs`, and this test will
    /// catch any subsequent removal from either list.
    #[test]
    fn commands_present_in_help_text() {
        // Generate the full help text (all sections are present in every context).
        let full = help_text_for(HelpContext::Empty);
        for (name, _) in COMMANDS {
            // Skip global-key rows (e.g. `?`) that are not dispatchable commands.
            if *name == "?" {
                continue;
            }
            // Match on just the command name (first token) in the help text.
            let tok = name.split_whitespace().next().unwrap_or(name);
            assert!(
                full.contains(tok),
                "COMMANDS entry {name:?} (token {tok:?}) is not present in help.rs; \
                 update help.rs or logo.rs to keep them in sync"
            );
        }
    }
}
