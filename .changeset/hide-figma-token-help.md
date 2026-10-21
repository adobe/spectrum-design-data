---
"@adobe/design-data-tui": patch
---

Hide the `FIGMA_TOKEN` value in `figma * --help` output (closes nd2b).

- **sdk/cli/src/main.rs**: set `hide_env_values = true` on the token arg
  of `figma read/export/import/diff/pair`; clap no longer prints it.
