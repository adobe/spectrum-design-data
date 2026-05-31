---
"@adobe/design-data": minor
---

Emit the structured `name` object from the TUI authoring wizard for MCP parity (closes #1082).

- **sdk/core/authoring/draft**: add shared `build_name_object` next to `build_value_fields`.
- **sdk/core/authoring/session**: delegate `name`-object assembly to the shared helper.
- **sdk/tui/wizard**: include `name` in `base_token_map` so writes and Confirm diff match MCP shape.
- **sdk/tui/tests/write**: assert `name.property` and name fields land on disk with a
  real schema registry.
