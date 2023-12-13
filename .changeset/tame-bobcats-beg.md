---
"@adobe/spectrum-tokens": minor
---

Fixed bug in the light theme value for notice-background-color-default, from notice-color-800 to notice-color-600

## Design Motivation

While updating the badge component in Figma, we noticed a bug where notice-background-color-default in S2 was entered incorrectly for light theme, and should instead match the value for S1

## Token Diff

_Token values updated (1):_

- `notice-background-color-default`: `light`: `notice-color-800` -> `notice-color-600`
