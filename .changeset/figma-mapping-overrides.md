---
"@adobe/spectrum-design-data": minor
---

The Figma export generator now honors a name-mapping override artifact
(closes spectrum-design-data-11k.5).

- **sdk/core/src/figma/mapping.rs**: `build_export_payload` takes an optional
  `overrides: Option<&HashMap<String, String>>` (legacyKey to Figma name);
  absent or empty overrides keep today's `{prefix}/{legacyKey}` naming.
- **sdk/cli/src/main.rs**: `figma export` gains a `--mapping <PATH>` flag
  that loads overrides from a `figma audit` artifact (or a bare
  `{legacyKey: name}` JSON object).
