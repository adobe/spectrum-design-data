# @adobe/design-data-tui

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
