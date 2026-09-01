---
"@adobe/spectrum-design-data": minor
---

New `figma import` CLI command reads a Figma file's current variable values and
emits manifest `overrides` entries for the ones a designer edited (closes
spectrum-design-data-h890.12).

- **sdk/core/src/figma/import.rs**: new module — inverts the `{prefix}/{legacyKey}`
  Figma Variable naming convention back to a token, diffs its per-mode Figma value
  against the manifest-resolved source, and emits an override only when it diverged.
- **sdk/core/src/figma/color.rs**: adds `format_color`, the reverse of `parse_color`.
- **sdk/core/src/figma/mod.rs**: registers the new `import` module.
- **sdk/cli/src/main.rs**: `figma import <path> --file-key <k> --manifest <m.json>
  [--mapping <artifact>] [--out <PATH>]` fetches Figma variables and writes the
  resulting overrides manifest, reporting unmapped/multi-mode-divergent/unconvertible
  variables to stderr.
