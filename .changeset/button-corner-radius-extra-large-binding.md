---
"@adobe/spectrum-design-data": patch
---

Drop a stale, unresolvable `tokenBindings` entry from `button.json` (part of bead vpk.2).

- **packages/design-data/components/button.json**: removes the `corner-radius-button-extra-large`
  tokenBindings entry — the legacy key doesn't exist in the corpus and the slot is already
  correctly modeled via the `Rounding (with wrapping)` CTR relationship.
