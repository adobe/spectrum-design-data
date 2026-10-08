---
"@adobe/design-data-tui": minor
---

Add opt-in `--redirect-deprecated` to `design-data figma export`.

- **sdk/plugins/figma/**: export a deprecated token with a `renamed`
  replacement as an alias to the terminal replacement in every mode,
  following chains. Cycles, missing targets and schema-class mismatches
  keep the token's own value and are reported.
- **sdk/cli/**: add the flag and report redirected and skipped counts.
  Default behavior is unchanged.
- **sdk/README.md**: document the flag.
