---
"@adobe/spectrum-design-data": minor
---

`design-data:validate` now loads component JSON so component-aware SPEC rules
actually run in CI instead of silently short-circuiting (closes bead 0jm).

- **packages/design-data/moon.yml**: `validate` task now passes `--components-path
  ./components --components-report-only`. Report-only until SPEC-027's remaining
  decomposed-token backlog is resolved; SPEC-018/020/022 are already at 0.
- **sdk/cli/src/main.rs**, **sdk/core/src/report.rs**: new `--components-report-only`
  flag downgrading component-rule errors to warnings.
- **sdk/core/src/validate/rules/spec027.rs**: fixed a 100%-false-failure bug —
  tokenBindings were matched against tokens' string `name`, but cascade tokens use
  object `name`; now also matches `name.legacyKey`.
- **packages/design-data/components/*.json**: declared 16 previously-undeclared
  components; added missing anatomy/state declarations across 13 components; fixed
  combo-box's malformed state names.
