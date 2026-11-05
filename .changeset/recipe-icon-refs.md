---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Recipe icon parts reference icons from the `icons/` catalog instead of the `glyph` enum.

- **spec**: `"icon": {"set": "ui" | "workflow", "name": "<id>"}` is required on every `icon` part,
  and `glyph` is removed from the draft recipe schema with no alias. `content` and `optional` mark
  an icon a render request may replace or remove. `component-visuals.md` adds an Icons section that
  defines how a drawing is chosen from the size token (`scaleIndex`, else `size` key, else
  `sizeScale`, nearest scale on a miss). New rules: SPEC-085 (error, the icon exists) and SPEC-086
  (warning, a UI icon has a drawing at its scale). `icons/` joins the dataset discovery list.
- **design-data**: accordion and checkbox reference `ui` chevron, checkmark and dash. Button,
  badge and action-button icons default to `workflow:add`, and the action-button hold icon is
  `ui:corner-triangle`.
- **wasm**: scene icon nodes carry `icon` (`set`, `name`) instead of `glyph`. Drawings are
  unchanged.
