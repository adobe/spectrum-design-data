---
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

fix(sdk): spec sheet token names come from the token's structured name (qkj5.105, qkj5.85)

- **design-data spec-sheet**: the token column shows the name the SDK serializes from the
  token's structured name (or its pinned `legacyKey`), not the relationship property. A focus
  ring thickness reads `focus-indicator-thickness`, a switch track width
  `switch-control-width-small`. Rows that use one token for two relationship properties stay
  separate rows.
