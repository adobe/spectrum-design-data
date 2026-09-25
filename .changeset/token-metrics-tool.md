---
"@adobe/spectrum-tokens-metrics": minor
---

Add the `token-metrics` tool: a CLI that extracts baseline metrics from
`@adobe/spectrum-tokens` and emits a summary plus a JSON report. Supports the
"token metrics baseline" OKR.

- **tools/token-metrics**: new private package with a `computeMetrics` /
  `generateMetricsReport` API and a `token-metrics` CLI (inventory, scope,
  architecture, data quality, component coverage).
- **tools/token-metrics**: component-schema coverage now reads from
  `packages/design-data-spec/components`, with a regression test on the path.
