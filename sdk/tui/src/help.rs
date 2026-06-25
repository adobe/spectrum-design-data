// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Context-sensitive help overlay content (press `?` to open, `Esc`/`?` to close).
//!
//! [`help_text_for`] builds the help text with the section most relevant to the
//! current view appearing first (and marked `(active)`), so users immediately see
//! the bindings they need.  All other sections follow in a stable order so nothing
//! is hidden — only re-ordered.

use crate::app::ActiveView;

// ── Per-section text ───────────────────────────────────────────────────────────

const SEC_GLOBAL: &str = "\
GLOBAL
  Ctrl-C                  Always quit
  ?                       Toggle this help overlay
  v                       Toggle text-selection mode (drag to copy)";

/// Palette + Commands are shown together — they describe the same surface.
const SEC_PALETTE: &str = "\
PALETTE  (always open on the home screen)
  Type                    Filter the command list live
  Tab                     Autocomplete to the highlighted / top command
  Enter                   Run the highlighted or typed command
  Up                      Recall previous command (older history)
  Down (empty prompt)     Move focus into the command list below
  Up / Down (in list)     Move the highlighted row; Up at top exits list
  Esc (in list)           Exit the command list, return focus to input
  Esc (input non-empty)   Clear input
  Esc (input empty)       No-op

COMMANDS
  query <expr>            Filter tokens  e.g. background-color/*
  resolve property=<name>[,<mode-set>=<mode>...]
  describe <component>    Inspect a component schema
  validate                Validate all tokens against schemas
  new [<intent>]          Open the token authoring wizard
  name [<intent>]         Open the token naming wizard
  find                    Open the fuzzy-find token explorer
  authoring               Open the token lifecycle action-picker
  quit                    Quit the TUI";

const SEC_QUERY: &str = "\
QUERY / RESOLVE / VALIDATE VIEW
  Up / k                  Move selection up
  Down / j                Move selection down
  Scroll wheel            Move selection
  Click row               Select that row
  y                       Yank selected name / message to clipboard
  Esc                     Return to home";

const SEC_DESCRIBE: &str = "\
DESCRIBE VIEW
  Up / k                  Move selection up
  Down / j                Move selection down
  PgUp                    Move selection up 10 lines
  PgDn                    Move selection down 10 lines
  Scroll wheel            Scroll the body
  y                       Yank selected line to clipboard
  Y                       Yank full JSON document to clipboard
  Esc                     Return to home";

const SEC_WIZARD: &str = "\
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
  Esc                     Cancel wizard";

const SEC_MOUSE: &str = "\
MOUSE
  Scroll wheel            Scroll the active view or wizard diff preview
  Click row               Select that row in a list or table view
  v                       Enter text-selection mode
  Drag (in select mode)   Select text from rows; release copies to clipboard
  Shift-drag              Native terminal text selection (bypasses capture)";

// ── Context enum ───────────────────────────────────────────────────────────────

/// Which view is active when the help overlay is opened.
///
/// Used to promote the most-relevant section to the top of the help text.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum HelpContext {
    /// Home screen — command palette is primary.
    Empty,
    /// Token query results.
    Query,
    /// Token resolve results.
    Resolve,
    /// Component describe view.
    Describe,
    /// Token validation results.
    Validate,
    /// Help opened from within any wizard/modal (authoring, find, or naming).
    Wizard,
}

/// Derive the help context from the current active view.
///
/// Note: wizard modals (`Modal::Wizard`, `Modal::Find`, `Modal::Naming`) have no
/// separate `HelpContext` variant.  When a wizard is open, `active_view` reflects
/// the screen *behind* the wizard (typically `Empty`).  The wizard already
/// communicates its step context via the title breadcrumb; help opens via `?` only
/// from browsing/palette mode, not from within a wizard.
pub fn current_help_context(active_view: &ActiveView) -> HelpContext {
    match active_view {
        ActiveView::Empty => HelpContext::Empty,
        ActiveView::Query(_) => HelpContext::Query,
        ActiveView::Resolve(_) => HelpContext::Resolve,
        ActiveView::Describe(_) => HelpContext::Describe,
        ActiveView::Validate(_) => HelpContext::Validate,
    }
}

// ── Text builder ───────────────────────────────────────────────────────────────

/// Build the full help text for the given `ctx`.
///
/// The section relevant to `ctx` is emitted first with `  (active)` appended to
/// its header line, then `GLOBAL`, then the remaining sections in a stable order.
/// All content is preserved — only the ordering changes.
pub fn help_text_for(ctx: HelpContext) -> String {
    let (active, remaining): (&str, &[&str]) = match ctx {
        HelpContext::Empty => (
            SEC_PALETTE,
            &[SEC_QUERY, SEC_DESCRIBE, SEC_WIZARD, SEC_MOUSE],
        ),
        HelpContext::Query | HelpContext::Resolve | HelpContext::Validate => (
            SEC_QUERY,
            &[SEC_PALETTE, SEC_DESCRIBE, SEC_WIZARD, SEC_MOUSE],
        ),
        HelpContext::Describe => (
            SEC_DESCRIBE,
            &[SEC_PALETTE, SEC_QUERY, SEC_WIZARD, SEC_MOUSE],
        ),
        HelpContext::Wizard => (
            SEC_WIZARD,
            &[SEC_PALETTE, SEC_QUERY, SEC_DESCRIBE, SEC_MOUSE],
        ),
    };

    let mut out = String::new();

    // Active section first, header line marked with "(active)".
    out.push_str(&mark_active(active));
    out.push_str("\n\n");
    out.push_str(SEC_GLOBAL);

    for &sec in remaining {
        out.push_str("\n\n");
        out.push_str(sec);
    }

    out.push('\n');
    out
}

/// Append `  (active)` to the first line of `section`.
fn mark_active(section: &str) -> String {
    match section.find('\n') {
        Some(idx) => format!("{}  (active){}", &section[..idx], &section[idx..]),
        None => format!("{section}  (active)"),
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_section_appears_first_for_query() {
        let text = help_text_for(HelpContext::Query);
        let query_pos = text.find("QUERY / RESOLVE / VALIDATE VIEW").unwrap();
        let global_pos = text.find("GLOBAL").unwrap();
        assert!(
            query_pos < global_pos,
            "QUERY section should precede GLOBAL in query context"
        );
    }

    #[test]
    fn active_section_appears_first_for_describe() {
        let text = help_text_for(HelpContext::Describe);
        let describe_pos = text.find("DESCRIBE VIEW").unwrap();
        let global_pos = text.find("GLOBAL").unwrap();
        assert!(
            describe_pos < global_pos,
            "DESCRIBE VIEW section should precede GLOBAL in describe context"
        );
    }

    #[test]
    fn active_section_is_marked() {
        let text = help_text_for(HelpContext::Query);
        assert!(
            text.contains("QUERY / RESOLVE / VALIDATE VIEW  (active)"),
            "active section header should carry '(active)' marker"
        );
    }

    #[test]
    fn all_sections_present_regardless_of_context() {
        let text = help_text_for(HelpContext::Describe);
        assert!(text.contains("PALETTE"), "PALETTE section missing");
        assert!(text.contains("QUERY / RESOLVE"), "QUERY section missing");
        assert!(
            text.contains("DESCRIBE VIEW"),
            "DESCRIBE VIEW section missing"
        );
        assert!(text.contains("WIZARD"), "WIZARD section missing");
        assert!(text.contains("MOUSE"), "MOUSE section missing");
        assert!(text.contains("GLOBAL"), "GLOBAL section missing");
    }

    #[test]
    fn palette_is_active_on_home_screen() {
        let text = help_text_for(HelpContext::Empty);
        assert!(
            text.contains("PALETTE  (always open on the home screen)  (active)"),
            "PALETTE should be marked active on home screen"
        );
    }
}
