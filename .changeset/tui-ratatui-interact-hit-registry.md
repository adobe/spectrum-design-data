---
"@adobe/design-data-tui": minor
---

Replace fragile `compute_hit_regions` with `ratatui-interact` `ClickRegionRegistry`.

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
