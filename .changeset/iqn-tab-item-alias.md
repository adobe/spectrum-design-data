---
"@adobe/spectrum-design-data": minor
---

Add a `tab` → `tab-item` anatomy alias and decompose the 4 `tab-gap-horizontal-*` tokens
(closes spectrum-design-data-iqn).

- **registry/anatomy-terms.json**: register `tab` as an alias of the existing `tab-item`
  anatomy term, per the dsi.2.4 taxonomy call (tab is an anatomy part nested inside the
  `tabs` component, not a component alias).
- **tokens/layout.tokens.json**: decompose `tab-gap-horizontal-{extra-large,large,medium,small}`
  to `component=tabs, anatomy=tab-item, property=gap, orientation=horizontal, size`,
  pinning `legacyKey` to preserve the published token names.
- **packages/tokens/naming-exceptions.json**, **snapshots/validation-snapshot.json**: the
  `tab-item` alias changes the tokens' canonical re-serialization, so the 4 keys are added
  to the anatomy-decomposition exceptions allowlist and the golden snapshot is refreshed.
