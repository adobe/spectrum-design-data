# @adobe/design-data-tui

## 0.4.0

### Minor Changes

- [#1192](https://github.com/adobe/spectrum-design-data/pull/1192) [`c10d8cb`](https://github.com/adobe/spectrum-design-data/commit/c10d8cbe1a2d87edc258b5510778e6d5042ab33c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add cascade lifecycle ops and wire token creation to cascade format
  (Phase B / B2, closes #1192).
  - **sdk/core/src/authoring/lifecycle.rs**: new module with five lifecycle
    mutation ops against `*.tokens.json` cascade arrays — `edit_token`,
    `deprecate_token`, `rename_token`, `rewire_alias`, and `remove_token` —
    enforcing UUID stability, cross-field deprecation rules, and
    ref-resolution guards on alias-rewire and remove.
  - **sdk/core/src/authoring/session.rs**: `commit_session` now writes via
    `write_cascade_token`; new tokens are stamped with `introduced` at the
    active dataset spec version (`authoring-workflow.md` L71).

- [#1195](https://github.com/adobe/spectrum-design-data/pull/1195) [`836e4d4`](https://github.com/adobe/spectrum-design-data/commit/836e4d4249a8e3463bfcac917f0a77e703b1fd84) Thanks [@GarthDB](https://github.com/GarthDB)! - Add core mode-set lifecycle operations (Phase B / B3, closes #spectrum-design-data-122.3).
  - **sdk/core/src/authoring/mode_set.rs**: new module with five mode-set mutation
    ops — `add_mode`, `rename_mode` (with full cascade propagation to token `name`
    fields), `remove_mode` (guarded against referenced tokens and the active default),
    `create_mode_set` (authors a new mode-set file with canonical `$schema` /
    `specVersion`), and `remove_mode_set` (guarded against any token referencing the
    dimension).

- [#1194](https://github.com/adobe/spectrum-design-data/pull/1194) [`57045de`](https://github.com/adobe/spectrum-design-data/commit/57045def583992511624c5a077bdb4a7193a1aa9) Thanks [@GarthDB](https://github.com/GarthDB)! - Add catalog-aware token classification (Phase B / B4, closes #122.4).
  - **sdk/scripts/generate-registry-data.js**: emit `build_field_catalog()` alongside
    `build_registry_map()` — 24 field entries with position, validation severity,
    scope, required, has_registry, and value_type embedded at compile time.
  - **sdk/core/src/registry.rs**: add `FieldValidation`, `FieldCatalogEntry`, and
    `FieldCatalog::embedded()` / `get()` types backed by the generated catalog.
  - **sdk/core/src/authoring/session.rs**: new `validate_classification` validates
    every name-object field against the catalog — unknown keys are errors, advisory
    out-of-vocab values are warnings, and SPEC-042 scope mismatches are warnings.
  - **sdk/core/src/authoring/draft.rs**: add `FieldDiagnostic` (uses `report::Severity`)
    to carry advisory warnings in `ClassificationDraftDto`; `build_name_object` now
    orders fields by `serialization.position` and emits integer-typed fields as JSON
    numbers.
  - **sdk/core/src/validate/rules/mod.rs**: widen `schema_domain` / `DOMAIN_SCHEMAS`
    to `pub(crate)` for reuse by the authoring validator.

- [#1196](https://github.com/adobe/spectrum-design-data/pull/1196) [`3723271`](https://github.com/adobe/spectrum-design-data/commit/37232711dc69fca79c4baa37ff301412f8ccc7bd) Thanks [@GarthDB](https://github.com/GarthDB)! - add lifecycle action-picker modal to the TUI (closes spectrum-design-data-si6.2).
  - **sdk/tui/src/authoring.rs**: new `AuthoringMenuState` state machine with
    PickAction → PickToken → Form → Confirm flow for five lifecycle ops.
  - **sdk/tui/src/view/authoring.rs**: renderer for all five op forms
    (edit, deprecate, rename, rewire alias, remove).
  - **sdk/tui/src/update/lifecycle.rs**: deferred `Task::cmd` calling core
    lifecycle ops; `handle_lifecycle_done` for the new `LifecycleDone` message.
  - **sdk/tui/src/model/views.rs**: add `uuid` + `source_path` to `QueryRow`;
    add `Modal::Authoring` variant with all required `impl Modal` arms.
  - **sdk/tui/src/message.rs**: add `Message::LifecycleDone` variant.
  - **sdk/tui/src/wizard_common/classification.rs**: add `handle_key_event`
    method for reuse in the rename form.

- [#1196](https://github.com/adobe/spectrum-design-data/pull/1196) [`3723271`](https://github.com/adobe/spectrum-design-data/commit/37232711dc69fca79c4baa37ff301412f8ccc7bd) Thanks [@GarthDB](https://github.com/GarthDB)! - Add TUI mode-set op forms and split authoring module (Phase B / si6.3).
  - **sdk/tui/src/authoring/**: split monolithic `authoring.rs` into `mod.rs`,
    `forms.rs`, and `mode_set.rs` to stay under the 800-LOC budget; public API
    unchanged.
  - **sdk/tui/src/authoring/mode_set.rs**: five mode-set op forms behind
    "Mode-sets…" in the authoring action-picker (add mode, rename mode, remove
    mode, create mode-set, remove mode-set).
  - **sdk/tui/src/update/lifecycle.rs**: add `LifecycleExecute::ModeSet` arm
    dispatching all five core mode-set ops.
  - **sdk/tui/src/view/authoring.rs**: renderers for mode-set menu, file picker,
    mode picker, and all three op forms.

### Patch Changes

- [#1196](https://github.com/adobe/spectrum-design-data/pull/1196) [`3723271`](https://github.com/adobe/spectrum-design-data/commit/37232711dc69fca79c4baa37ff301412f8ccc7bd) Thanks [@GarthDB](https://github.com/GarthDB)! - Split at-cap mode-set modules to restore LOC headroom.
  - **sdk/tui/src/authoring/mode_set_handlers.rs**: new file — handler/builder methods
    extracted from `mode_set.rs` which was at the 800-LOC cap; now 238 LOC.
  - **sdk/tui/src/authoring/mode_set.rs**: retains data types only (238 LOC, was 799).
  - **sdk/tui/src/view/authoring_mode_set.rs**: new file — six mode-set renderers
    extracted from `view/authoring.rs` which was at the 798-LOC cap.
  - **sdk/tui/src/view/authoring.rs**: retains dispatcher and lifecycle renderers
    (581 LOC, was 798).

## 0.3.0

### Wizard improvements

Wizards (authoring, find, naming) are more consistent and easier to navigate.

- **Esc goes back, not cancel**: Esc on any screen past the first goes back one step; Esc on
  screen 1 still cancels. Applies to all three wizard types.
  ([#1160](https://github.com/adobe/spectrum-design-data/pull/1160),
  [#1172](https://github.com/adobe/spectrum-design-data/pull/1172))
- **Step indicator**: Title bar now shows `Step N of M — Name` uniformly across all wizards.
  ([#1169](https://github.com/adobe/spectrum-design-data/pull/1169))
- **Context-sensitive help**: `?` opens a help overlay from inside any wizard, with the WIZARD
  section promoted to the top; scroll with j/k, dismiss with `?` or Esc.
  ([#1172](https://github.com/adobe/spectrum-design-data/pull/1172))
- **Find wizard Preview button**: Tab now cycles to an explicit `▶ Preview N token(s) →` button;
  Enter only advances to the preview screen when that button is focused, ending the Enter-key
  overload on filter fields.
  ([#1173](https://github.com/adobe/spectrum-design-data/pull/1173))
- **Readline editing in text fields**: Ctrl-A/E/W/U now work in authoring wizard text fields.
  ([#1172](https://github.com/adobe/spectrum-design-data/pull/1172))

### Command palette

- **Fuzzy matching with highlights**: Candidates are ranked by subsequence score; matched
  characters are underlined in the list and bolded on the selected row.
  ([#1168](https://github.com/adobe/spectrum-design-data/pull/1168))
- **Did-you-mean suggestions**: Invalid commands show a hint when a close match exists
  (e.g. `unknown command: descrbe — did you mean \`describe\`?`).
  ([#1172](https://github.com/adobe/spectrum-design-data/pull/1172))

### Result views

Improvements across query, resolve, validate, and describe result views.

- **Cell truncation**: Long names and tokens are clipped with `…` using unicode-aware widths so
  CJK/emoji glyphs count as two columns.
  ([#1161](https://github.com/adobe/spectrum-design-data/pull/1161))
- **Validate grouping**: Findings are grouped by `(rule, message)` with a `×N ▶/▼` badge;
  Enter expands or collapses a group.
  ([#1165](https://github.com/adobe/spectrum-design-data/pull/1165))
- **Validate message cleanup**: Embedded JSON refs in error messages are rewritten as readable
  `key=value` pairs (e.g. `component=chevron-icon property=size-75`).
  ([#1162](https://github.com/adobe/spectrum-design-data/pull/1162))
- **Describe row selection and yank**: j/k/g/G/PgUp/PgDn navigate a highlighted line cursor;
  `y` yanks the selected line, `Y` yanks the full JSON document.
  ([#1170](https://github.com/adobe/spectrum-design-data/pull/1170))
- **Navigation and empty states**: g/G jump to first/last row in all list views; zero-result
  and zero-issue states show a centered message instead of a blank list.
  ([#1164](https://github.com/adobe/spectrum-design-data/pull/1164))
- **Persistent selection-mode indicator**: A bold `[SEL]` badge appears in the status line
  whenever mouse text-selection mode is active.
  ([#1172](https://github.com/adobe/spectrum-design-data/pull/1172))

### Infrastructure

- **Auto-dismissing toast**: Clipboard copy confirmations and momentary notices now show as a
  3 s toast overlay in the right half of the view, leaving the status line for persistent state.
  ([#1167](https://github.com/adobe/spectrum-design-data/pull/1167))
- **Click-region registry**: Replaced `compute_hit_regions` with `ratatui-interact`
  `ClickRegionRegistry`; click regions are registered co-located with rendering, eliminating
  ~110 lines of duplicated layout math.
  ([#1171](https://github.com/adobe/spectrum-design-data/pull/1171))

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
