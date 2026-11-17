---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Meter and progress-bar draw the gap between header, track and help text from `base-gap-*`.

- The `Spacing (field label to progress bar)` relationship now points at `base-gap-small`,
  `-medium`, `-large` and `-extra-large` by size (4, 6, 6, 6px), the tokens Figma binds as
  `Base/Gap/*`. It pointed at `spacing-75` (4px at every size).
- Meter no longer declares `labelPosition`, which Figma does not have.
