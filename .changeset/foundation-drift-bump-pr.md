---
"@adobe/design-data-tui": minor
---

Validate action can open a PR that bumps `foundationVersion` on drift (closes h890.7.2).

- **.github/actions/validate**: new `open-pr` input; default `foundation-tag-prefix` is
  now `@adobe/spectrum-design-data@` and pre-release tags are ignored.
- **sdk/cli**: `platform eject` scaffolds `.github/workflows/foundation-drift.yml`.
