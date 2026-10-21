---
"@adobe/design-data-tui": patch
---

Keep a deprecated token's literal when `--redirect-deprecated` can't export its replacement.

- **sdk/plugins/figma/**: skip the redirect, and report it in the summary,
  when the terminal replacement's value can't be converted for Figma.
