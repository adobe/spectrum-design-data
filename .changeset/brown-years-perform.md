---
"@adobe/spectrum-tokens": minor
---

Updates to spacing tokens for the S2 field label component include:

Token: field-label-top-to-asterisk-[medium, large, extra-large]. Only value for extra-large token required updating in the desktop scale. All other sizes presented accurate values.

Token: field-label-top-margin-[medium, large, extra-large]. All values were updated to reflect 0px for both desktop and mobile scales

## Design Motivation

These changes occurred as a result of updates to the field label component for S2.

## Token Diff

_Token values updated (4):_

- `field-label-top-margin-extra-large`
- `field-label-top-margin-large`
- `field-label-top-margin-medium`
- `field-label-top-to-asterisk-extra-large`

## Schema Diff

Adds missing schema information for `corner-radius-1000`. Also added `schemas/token-types/multiplier.json` to the `scale-set` schema.
