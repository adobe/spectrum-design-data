---
"@adobe/spectrum-design-data": minor
---

Triaged the SPEC-027 dangling `tokenBindings` backlog surfaced by CI's component
validation (bead spectrum-design-data-vpk): 84 of 134 were confident typo/word-order
renames or garbage removals; 50 genuinely ambiguous ones are escalated for
design-owner sign-off.

- **packages/design-data/components/*.json**: fixed 64 dangling `tokenBindings[].token`
  typos/word-order mismatches and removed 20 confirmed-garbage/duplicate entries
  across 26 files; 50 remaining ambiguous bindings left untouched and tracked in
  bead spectrum-design-data-vpk.1.
- **packages/design-data/moon.yml**: updated the `--components-report-only`
  explanatory comment to reflect the real remaining SPEC-027 count (50, down from
  134) and reference the new escalation bead.
