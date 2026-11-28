---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for the five text-only typography components: body, heading, code, detail
and title. Each draws one text run in a `container` root.

- The components gain a `container` anatomy part that holds `text`, plus `emphasis` and `family`
  options (code has no `family`). These are the options their existing font records already pin.
  The deprecated `light` emphasis values and heading size `xxs` are declared as deprecated.
- Body and title read their font size and line height from new type-style records (one per
  composite size). Heading, detail and code have no composite, so they bind each font axis.
- Family, weight and color read the existing relationship records.
- Code draws `Source Code Pro` as a recipe literal: its font-family record is not a token.
- CJK text draws with the both-pinned script and family records that landed in #2243.
- Not drawn: italic (no font-style prop), letter spacing, uppercase detail and margins.
- Heading `xxs` has no live font-size record and draws at the default size.
- The family option makes SPEC-100 report same-token sans-serif and serif pairs; those counts are
  baselined for body, detail, heading and title.
- Legacy output is unchanged; the embedded dataset changes, so wasm gets a patch.
