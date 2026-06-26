---
"@adobe/token-diff-generator": patch
---

Refactor HandlebarsFormatter to extend @adobe/spectrum-diff-core (closes #fa6).

- **tools/diff-generator/src/lib/formatterHandlebars.js**: convert standalone 416-line class to a
  thin subclass of core's HandlebarsFormatter; shared helpers now have one definition in core.
  CLI-specific behavior (chalk colors, $-stripping, sync printReport, processNestedChanges)
  kept local.
