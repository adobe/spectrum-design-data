---
"@adobe/spectrum-diff-core": patch
---

Collapse 9-arm Object.entries mapping in processResultForTemplate to a single helper.

- **tools/spectrum-diff-core/src/formatters/handlebars-formatter.js**: replace repeated
  Object.entries map arms with a two-line local helper; output is byte-identical.
