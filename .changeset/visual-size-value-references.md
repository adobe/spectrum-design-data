---
"@adobe/spectrum-design-data": patch
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

Replace hardcoded visual-size values with references to the size scale.

- **tokens/layout-component.tokens.json**: Reference matching size token UUIDs for
	12 visual-size tokens without changing their resolved values. Their `$schema` is
	now `alias.json` (was `dimension.json`), as structural validation requires for `$ref`.
- **packages/tokens/src/layout-component.json**: Regenerated legacy output; the same
	12 tokens now use the `alias.json` `$schema`.