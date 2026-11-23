---
"@adobe/design-data-tui": minor
---

Add shadcn registry exports for Spectrum tokens and component metadata.

- **design-data-tui**: add `export --format shadcn-theme` for light/dark
  `registry:theme` output. Light and dark values resolve per scheme, and
  keys are unprefixed (`spectrum-*`) so shadcn emits valid `var()` references.
  Scheme-independent non-color values go in `cssVars.theme` to avoid
  self-referencing `@theme inline` entries (closes spectrum-design-data-t19s).
- **design-data-tui**: add a `shadcn registry` subcommand that writes
  metadata-only `registry:component` items and a `registry.json` index. It
  reads the platform-merged catalog when a platform manifest is selected.
- **design-data-tui**: add `shadcn registry --base-url URL` for a flat, hosted
  layout (`{component}.json`, `spectrum-theme.json`) with the theme dependency
  pointing at the hosted URL (closes spectrum-design-data-ajc7).
- **sdk/moon.yml**: add the `sdk:shadcn-registry` task, run by deploy-docs to
  publish `/r/` on GitHub Pages. The output is not committed.
