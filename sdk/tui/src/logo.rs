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

/// Command reference shown on the home screen.
///
/// Each entry is `(name, description)`. Keep in sync with `help.rs` and
/// `update_command.rs`.
pub const COMMANDS: &[(&str, &str)] = &[
    (":query <expr>", "Filter tokens  e.g. background-color/*"),
    (
        ":resolve property=<name>",
        "Resolve a property through the cascade",
    ),
    (":describe <component>", "Inspect a component schema"),
    (":validate", "Validate all tokens against schemas"),
    (":new [<intent>]", "Open the token authoring wizard"),
    (":find", "Open fuzzy find"),
    ("?", "Toggle help"),
    ("q", "Quit"),
];
