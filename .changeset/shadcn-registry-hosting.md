---
"@adobe/design-data-tui": minor
---

Host the shadcn registry as static files for `shadcn add` (closes spectrum-design-data-ajc7).

- **design-data-tui**: add `shadcn registry --base-url URL`. It writes a flat
  `registry.json`, `{component}.json` and `spectrum-theme.json`, and points each
  item's `spectrum-theme` dependency at the hosted theme URL.
- **sdk/moon.yml**: add the `sdk:shadcn-registry` task. The deploy-docs workflow
  runs it to publish `/r/` on GitHub Pages. The output is not committed.
