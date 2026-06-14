---
"@adobe/design-data-tui": minor
---

Add wizard step indicator and context-sensitive help overlay.

- **sdk/tui/src/help.rs**: replace the single `HELP_TEXT` const with per-section
  constants and a `help_text_for(HelpContext)` function that promotes the active
  section to the top (marked `(active)`); add `current_help_context` resolver.
- **sdk/tui/src/view.rs** (`render_help_modal`): thread `HelpContext` through so
  the rendered help reflects the view currently behind the overlay; compute help
  context before the modal borrow.
- **sdk/tui/src/view/wizard.rs**, **find.rs**, **naming.rs**: wire `screen_label()`
  (already implemented on `Modal` in `model/views.rs`) into each wizard's title
  block, replacing the bespoke `Wizard · N/4 · Name` format with the uniform
  `Step N of M — Name` breadcrumb.
- **sdk/tui/src/logo.rs**: update the `commands_present_in_help_text` test to use
  `help_text_for` instead of the now-removed `HELP_TEXT` const.
- **sdk/tui/tests/render.rs**: add step-indicator tests for all three wizard types
  and context-sensitive help tests asserting the correct section is marked active.
