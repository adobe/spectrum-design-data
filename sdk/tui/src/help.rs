// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Static help overlay content (press `?` to open, `Esc`/`?` to close).

pub const HELP_TEXT: &str = "\
GLOBAL
  q                       Quit (when palette is closed)
  Ctrl-C                  Always quit
  ?                       Toggle this help overlay
  v                       Toggle text-selection mode (drag to copy)

PALETTE  (: opens command mode, / opens fuzzy-find)
  Esc                     Cancel / close palette
  Enter                   Dispatch command
  Tab                     Autocomplete command name
  Up / Down               Recall palette history (Up = older)

COMMANDS
  :query <expr>           Filter tokens  e.g. background-color/*
  :resolve property=<name>[,<mode-set>=<mode>...]
  :describe <component>   Inspect a component schema
  :validate               Validate all tokens against schemas
  :new [<intent>]         Open the token authoring wizard
  :find                   Open the fuzzy-find token explorer

QUERY / RESOLVE / VALIDATE VIEW
  Up / k                  Move selection up
  Down / j                Move selection down
  Scroll wheel            Move selection
  Click row               Select that row
  y                       Yank selected name / message to clipboard
  Esc                     Return to empty view

DESCRIBE VIEW
  Up / k                  Scroll up one line
  Down / j                Scroll down one line
  PgUp                    Scroll up 10 lines
  PgDn                    Scroll down 10 lines
  Scroll wheel            Scroll the body
  Esc                     Return to empty view

WIZARD — Screen 1 (Intent)
  Type                    Search existing tokens
  Up / Down               Navigate suggestions
  Tab                     Reuse top suggestion (alias path, skips to Screen 4)
  Enter                   Proceed to Screen 2 (create new)
  Esc                     Cancel wizard

WIZARD — Screen 2 (Classification)
  Tab / Shift-Tab         Move between fields
  Left / Right            Cycle layer (Foundation → Platform → Product)
  +                       Add a name field
  Enter                   Proceed to Screen 3
  Esc                     Cancel wizard

WIZARD — Screen 3 (Values)
  a                       Set row kind to Alias
  l                       Set row kind to Literal
  e                       Edit the active row's value
  Up / Down               Select row
  Enter                   Proceed to Screen 4
  Esc                     Cancel wizard

WIZARD — Screen 4 (Confirm)
  Type                    Enter rationale (required before submit)
  Up / Down               Scroll diff preview
  Scroll wheel            Scroll diff preview
  Ctrl+S                  Edit $schema URL
  Enter                   Submit (writes token when --allow-write is set)
  Esc                     Cancel wizard

MOUSE
  Scroll wheel            Scroll the active view or wizard diff preview
  Click row               Select that row in a list or table view
  v                       Enter text-selection mode
  Drag (in select mode)   Select text from rows; release copies to clipboard
  Shift-drag              Native terminal text selection (bypasses capture)
";
