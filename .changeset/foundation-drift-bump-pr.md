---
"@adobe/design-data-tui": minor
---

Validate action can open a PR that bumps `foundationVersion` on drift (closes h890.7.2).

- **.github/actions/validate**: new `open-pr` input; pins ahead of latest aren't drift.
- **.github/actions/validate**: default `foundation-tag-prefix` is now
  `@adobe/spectrum-design-data@`; set it to keep `@adobe/spectrum-tokens@`.
- **sdk/cli**: `platform eject` scaffolds `.github/workflows/foundation-drift.yml`.
