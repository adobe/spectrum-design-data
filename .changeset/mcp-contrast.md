---
"@adobe/design-data-mcp": minor
---

New tool `design-data-contrast`: the WCAG 2 contrast ratio of two colors, each a
hex or `rgb()` value or a token name, uuid or conceptId (resolved for a
`colorScheme`, default light). It reports the ratio and whether it meets 3:1,
4.5:1 and 7:1, and flattens a semi-transparent foreground over the background.
It reports a fact; whether a combination is acceptable stays the author's call.
