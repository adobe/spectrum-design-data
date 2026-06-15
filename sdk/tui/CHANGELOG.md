# @adobe/design-data-tui

## 0.3.0

### Minor Changes

- [#1169](https://github.com/adobe/spectrum-design-data/pull/1169) [`f9f6b28`](https://github.com/adobe/spectrum-design-data/commit/f9f6b28904a340cc6914dd824e89d413473027f7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add wizard step indicator and context-sensitive help overlay.
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

- [#1170](https://github.com/adobe/spectrum-design-data/pull/1170) [`a6d1998`](https://github.com/adobe/spectrum-design-data/commit/a6d1998727925249940b4f6620b51a63e1a000e0) Thanks [@GarthDB](https://github.com/GarthDB)! - Add line-based row selection and yank to the Describe view (closes #9dv).
  - **sdk/tui**: j/k/g/G/PgUp/PgDn move a highlighted line cursor; viewport follows.
  - **sdk/tui**: `y` yanks the selected line; `Y` yanks the full JSON document.
  - **sdk/tui**: DESCRIBE_HINT footer updated to advertise `y yank · Y all`.

- [#1173](https://github.com/adobe/spectrum-design-data/pull/1173) [`a86d252`](https://github.com/adobe/spectrum-design-data/commit/a86d252f5ad29b20e7e97ffbd55308ef86c4e0a8) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix Enter-key overload in find wizard: add Preview button as last Tab stop.
  - **sdk/tui/src/find.rs**: add `PREVIEW_FOCUS`/`FOCUS_COUNT` consts; Tab/BackTab cycle over
    all 6 focusables; rewrite Enter so it accepts a suggestion on fields and only advances to
    Preview when the Preview button is focused; add live `preview_count` refresh on every
    keystroke so the button label stays current.
  - **sdk/tui/src/view/find.rs**: render a bordered "▶ Preview N token(s) →" button as the
    last element of the Filters layout (highlighted with accent color when focused); remove the
    standalone match-count row; correct the footer hint.

- [#1168](https://github.com/adobe/spectrum-design-data/pull/1168) [`f2c2b97`](https://github.com/adobe/spectrum-design-data/commit/f2c2b97b6fbdee39fcfcdc2af0738f5ac87af9f0) Thanks [@GarthDB](https://github.com/GarthDB)! - Upgrade command palette to fuzzy subsequence matching with matched-char highlights.
  - **sdk/core/src/query.rs** (`subsequence_match`): new sibling of `subsequence_score`
    returning matched character indices alongside the score; `subsequence_score` now
    delegates to it.
  - **sdk/tui/src/command.rs** (`CommandMatch`, `Command::matches`): fuzzy-ranked candidate
    list sorted best-score-first; `Command::filter` rewritten as a thin wrapper so all
    callers (Tab/Enter completion, `update.rs`) continue to work unchanged.
  - **sdk/tui/src/view/home.rs** (`render_home`): switches to `Command::matches` and renders
    each candidate name as per-character spans, underling matched positions for unselected
    rows and applying bold accent for the selected/top-hint row.

- [#1167](https://github.com/adobe/spectrum-design-data/pull/1167) [`546be42`](https://github.com/adobe/spectrum-design-data/commit/546be422942cc6e60080d5151797335c91dc9541) Thanks [@GarthDB](https://github.com/GarthDB)! - Add auto-dismissing toast overlay and consolidate modal popup boilerplate.
  - **sdk/tui/Cargo.toml**: add `tui-popup = "0.7"`.
  - **sdk/tui/src/model/views.rs** (`Toast`): new type reusing `StatusKind` for
    severity; auto-dismissed by a subscription timer, not the persistent status line.
  - **sdk/tui/src/model.rs** (`toast`, `set_toast`, `clear_toast`, `toast()`): toast
    field and accessors alongside the existing `status_message`.
  - **sdk/tui/src/message.rs** (`ToastExpired`): unit variant emitted when the toast
    timer fires; clears the model toast in `update`.
  - **sdk/tui/src/subscription.rs** (`TOAST_DURATION`, `subscriptions`): 3 s duration
    const; `Named("toast")` interval gated on `model.toast().is_some()` — starts and
    stops automatically via `Subscriptions::diff`.
  - **sdk/tui/src/update.rs**: handle `ToastExpired`; `ClipboardDone(None)` now
    shows a "✓ copied" toast instead of silently succeeding.
  - **sdk/tui/src/view.rs** (`modal_frame`): shared helper replaces duplicated
    `centered_rect + Clear` across all four modals; toast rendered via `tui-popup`
    `Popup` in the right half of the active view; Help border uses `border::ROUNDED`.

- [#1171](https://github.com/adobe/spectrum-design-data/pull/1171) [`fd67270`](https://github.com/adobe/spectrum-design-data/commit/fd67270e1a196dd93cb4b020ff6bb24cb120121d) Thanks [@GarthDB](https://github.com/GarthDB)! - Replace fragile `compute_hit_regions` with `ratatui-interact` `ClickRegionRegistry`.
  - **sdk/tui/Cargo.toml**: add `ratatui-interact = "0.5"` dependency.
  - **sdk/tui/src/view/results.rs** (`render_query`, `render_resolve`, `render_validate`): each
    render function now accepts a `&mut ClickRegionRegistry<HitEntry>` and registers per-row
    click regions co-located with the `render_stateful_widget` call, eliminating the cross-file
    layout duplication and the magic `+2`/`-2` table-geometry offsets.
  - **sdk/tui/src/runtime.rs**: delete `compute_hit_regions` (~110 lines, the "SYNC WITH
    view::draw" function) and the post-draw rebuild line; hit regions are now populated by
    `view::draw` directly.
  - **sdk/tui/src/model.rs**: replace `hit_regions: Vec<HitRegion>` with
    `hit_registry: ClickRegionRegistry<HitEntry>`; `HitEntry` carries both action and text.
  - **sdk/tui/src/runtime.rs** (`hit_registry_aligns_with_rendered_buffer_rows`): new test
    renders a real frame and asserts registry geometry matches the live buffer — the drift case
    that the old test bypassed.

- [#1172](https://github.com/adobe/spectrum-design-data/pull/1172) [`24b4e27`](https://github.com/adobe/spectrum-design-data/commit/24b4e27bc39dc5c4f458fecdf5a48d6dedec6e7e) Thanks [@GarthDB](https://github.com/GarthDB)! - tui: five UX improvements from conventions review.
  - **update.rs / help.rs**: `?` now opens a wizard-context help overlay from inside any
    wizard or modal; new `HelpContext::Wizard` variant promotes the WIZARD section (F1).
  - **find.rs / naming.rs**: Esc goes back one screen (S2→S1, S3→S2) instead of
    hard-cancelling from any screen — matching the authoring wizard's behavior (F2).
  - **update/command.rs**: Invalid palette commands show a did-you-mean suggestion using
    the existing fuzzy ranker, e.g. `unknown command: descrbe — did you mean \`describe\`?` (F3).
  - **view.rs**: A persistent `[SEL]` badge appears in the status line whenever mouse
    text-selection mode is active, so users know the mode is on after other messages appear (F4).
  - **wizard.rs**: Ctrl-A/E/W/U readline editing works in authoring wizard text fields;
    the Ctrl early-return was narrowed to intercept only Ctrl-S on Screen 4 (F5).

- [#1165](https://github.com/adobe/spectrum-design-data/pull/1165) [`20323d5`](https://github.com/adobe/spectrum-design-data/commit/20323d53fc9a24f6dfb85671b7c3614b24945249) Thanks [@GarthDB](https://github.com/GarthDB)! - Group repeated validate findings by (rule, message) with an occurrence count badge
  and Enter expand/collapse, replacing the unnavigable flat list.
  - **sdk/tui/src/model/views.rs** (`ValidateGroup`, `VisibleRow`, `ValidateView`):
    groups findings by `(rule_id, message)`, builds a projected `visible` list of group
    headers and expanded children; `toggle_selected` flips expand/collapse with selection
    preserved on the header.
  - **sdk/tui/src/view/results.rs** (`render_validate`): renders group headers with
    `×N ▶/▼` badge in the Token column; expanded children show indented tokens;
    new `VALIDATE_HINT` advertises `Enter expand`.
  - **sdk/tui/src/update.rs** (`handle_view_key`): `Enter` toggles the selected group;
    j/k/g/G navigate `visible_len()` instead of `rows.len()`.

### Patch Changes

- [#1164](https://github.com/adobe/spectrum-design-data/pull/1164) [`c8182b2`](https://github.com/adobe/spectrum-design-data/commit/c8182b2f11531a6226bf24bc646add1c53caf371) Thanks [@GarthDB](https://github.com/GarthDB)! - Add footer hints, g/G jump, and empty-state copy to result views.
  - **results.rs**: add 1-row muted footer hint line to query, resolve, validate,
    and describe views showing available keys (j/k, g/G, y, Esc).
  - **update.rs** + **app.rs**: add `g`/`G` to jump first/last row in list views;
    scroll top/bottom in describe.
  - **results.rs**: show centered empty-state message when query/resolve returns
    zero results or validate finds no issues.

- [#1161](https://github.com/adobe/spectrum-design-data/pull/1161) [`3c19deb`](https://github.com/adobe/spectrum-design-data/commit/3c19deba94bd663a4a77d8e8724f89da78c50358) Thanks [@GarthDB](https://github.com/GarthDB)! - Add truncation ellipsis to result-view table cells that overflow their column.
  - **sdk/tui/src/app_views.rs** (`truncate_cell`): new helper that appends `…`
    when a string exceeds its column budget; width measured with `unicode-width`
    so wide glyphs (CJK, emoji) count as two columns.
  - **sdk/tui/src/app_views.rs** (`column_budget`): extracted helper that mirrors
    ratatui's percentage layout; `QUERY_NAME_PCT`, `RESOLVE_NAME_PCT`,
    `VALIDATE_TOKEN_PCT` consts tie the budget call to the matching
    `Constraint::Percentage` so they can't drift apart.
  - **sdk/tui/src/view.rs** (`render_query`, `render_resolve`, `render_validate`):
    apply truncation to the Name and Token columns; annotate each `column_budget`
    call with the reserved-columns breakdown for maintainability.
  - **sdk/tui**: 9 unit tests covering edge cases (`max == 0`, exact fit, ASCII
    overflow, multi-byte Latin, CJK wide chars, saturating underflow).

- [#1162](https://github.com/adobe/spectrum-design-data/pull/1162) [`9241f7e`](https://github.com/adobe/spectrum-design-data/commit/9241f7ef2adab7ad4a02eebea7b2c71fe0fcbb42) Thanks [@GarthDB](https://github.com/GarthDB)! - Parse embedded JSON objects in validate error messages into readable key=value form.
  - **sdk/tui/src/update/command.rs** (`compact_json_refs`): new helper that finds
    the first `{…}` in a string and replaces it with `key=value` pairs, so
    SPEC-018 messages like `Token '{"component":"chevron-icon",...}'` become
    `Token 'component=chevron-icon property=size-75'`.

- [#1160](https://github.com/adobe/spectrum-design-data/pull/1160) [`d1cdd92`](https://github.com/adobe/spectrum-design-data/commit/d1cdd92bcd0136277336bd49cc201487930be77f) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix wizard Esc key to go back one screen instead of cancelling the entire wizard.
  - **sdk/tui/src/wizard.rs** (`handle_key`): Esc on S2–S4 calls `go_back()` and
    returns `Continue`; Esc on S1 still cancels. Also fixes a dead-code bug where
    the schema URL sub-editor's Esc handler was unreachable.
  - **sdk/tui/src/wizard.rs** (`go_back`): new private method that transitions
    `screen` to its predecessor, preserving all already-filled fields.

## 0.2.1

### Patch Changes

- [#1158](https://github.com/adobe/spectrum-design-data/pull/1158) [`143abaf`](https://github.com/adobe/spectrum-design-data/commit/143abaf0b5f5af66de88ad5c8a5bad31597fca69) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix wizard S1 suggestion list to show readable token names, not file-path IDs.
  - **sdk/tui/src/view.rs** (`render_intent_content`): use `display_name()` as
    the primary label; show source file basename as a dimmed secondary column.
  - **sdk/core/src/suggest.rs** (`SuggestionResult::display_name`): new method
    deriving the legacy name from the token's `name` object via
    `extract_legacy_key`; falls back to the raw graph key when no name object
    is present.

## 0.2.0

### Minor Changes

- [#1121](https://github.com/adobe/spectrum-design-data/pull/1121) [`1b45ddd`](https://github.com/adobe/spectrum-design-data/commit/1b45ddd4b4fa1e3adb115bcd9b4d71056fc0f2e7) Thanks [@GarthDB](https://github.com/GarthDB)! - Improve SDK test ergonomics, regression guards, coverage, and add property/snapshot tests.
  - **sdk/tui/src/update_ctx.rs** (new): Extract `UpdateCtx` + `UpdateCtxBuilder`; fluent
    builder removes repetitive 8-field struct literals in write/describe/validate tests.
  - **sdk/tui/tests/common/mod.rs**: Add `settle()`, `type_str()`, `feed_keys()`,
    `assert_emits_cmd()`, `assert_no_effect()`, `buffer_to_string()` helpers.
  - **sdk/tui/src/task.rs**: Add `Task::has_cmd()` for recursive Batch traversal.
  - **sdk/tui/src/runtime.rs**: Add `hit_regions_align_with_rendered_buffer_rows` guard
    pinning `compute_hit_regions` geometry against rendered buffer positions.
  - **sdk/tui/tests/task_intent.rs** (new): 9 tests asserting `Task` side-effect intent.
  - **sdk/tui/tests/subscription.rs**: Expand from 3 to 7 timing tests.
  - **sdk/tui/tests/snapshots.rs** (new): 4 insta render snapshots (home, query, wizard).
  - **sdk/core/src/discovery.rs**: 6 inline unit tests (was zero).
  - **sdk/core/src/cascade.rs**: 5 edge-case tests (Platform layer, double-mode-set).
  - **sdk/core/tests/prop_naming.rs** (new): 6 proptest properties for naming + query.

- [#1127](https://github.com/adobe/spectrum-design-data/pull/1127) [`4d19ad3`](https://github.com/adobe/spectrum-design-data/commit/4d19ad3477e79382829ee70328a3ab9d0e2ec0ba) Thanks [@GarthDB](https://github.com/GarthDB)! - Route TUI palette dispatch through a `Command` enum and enforce
  COMMANDS <-> dispatch sync (closes #1096).
  - **sdk/tui/src/command.rs** (new): `Command` enum is the single source of truth for
    palette commands, with `ALL`, `canonical`, `aliases`, and `parse`.
  - **sdk/tui/src/update_command.rs**: dispatch matches on `Command::parse`; `describe`/
    `component` and `new`/`create` collapse into single arms via aliases.
  - **sdk/tui/src/update.rs**: Tab autocomplete derives from `Command::ALL`; removes the
    hand-maintained `KNOWN_COMMANDS` const in `app_views.rs`.
  - **sdk/tui/src/logo.rs** / **help.rs**: surface the previously orphaned `:name` command
    so COMMANDS, HELP_TEXT, and dispatch agree.
  - **sdk/tui/src/command.rs** (tests): bidirectional COMMANDS <-> `Command` checks plus
    alias coverage, closing the loop left open by `commands_present_in_help_text` (#1094).

## 0.1.1

### Patch Changes

- [#1107](https://github.com/adobe/spectrum-design-data/pull/1107) [`a113e86`](https://github.com/adobe/spectrum-design-data/commit/a113e860e6dc8fbaa1a079542f43e0bb68a779c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add tui-verify skill, generic rmux runner, and layout size-breakpoint tests.
  - **.claude/skills/tui-verify/SKILL.md**: new agent skill teaching the 3-tier
    verification strategy (in-process buffer assertions, live rmux+asciinema,
    visual asciinema+agg / Ghostty+screencapture).
  - **tools/demo/auto/verify-tui.sh**: generic ad-hoc TUI verification runner;
    sources `lib/rmux-drive.sh`, accepts a step file
    (send/type/wait/expect/refute directives), drives the real binary at 120×36.
  - **tools/demo/moon.yml**: add `demo:tui-verify` task (local, rmux on PATH).
  - **sdk/tui/tests/layout.rs**: committed layout breakpoint tests at 120×36,
    80×24, 80×33 (exact logo threshold), 80×32 (one below), and panic-safety
    cases. Documents that the logo threshold in terminal coordinates is 33 rows
    (content area = terminal_height - 2).
