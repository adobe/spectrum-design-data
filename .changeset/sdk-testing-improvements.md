---
"@adobe/design-data-tui": minor
---

Improve SDK test ergonomics, regression guards, coverage, and add property/snapshot tests.

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
