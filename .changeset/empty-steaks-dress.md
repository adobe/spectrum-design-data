---
"@adobe/spectrum-tokens": minor
---

Updated workflow-icon-size-50, 75, 100, 200, 300 with Spectrum 2 values in mobile and desktop.
Updated component-top-to-workflow and text-to-visual padding.
Added 3 new non-color tokens for S2 component downstates in Tokens Studio.

## Design Motivation

Spectrum 2 icons have a different workflow icon sizing with base sizes 20 px (desktop), 24 px (mobile).

Updated padding values due to new workflow icon sizes in S2.

These tokens are used to calculate the perspective transform in CSS to achieve the effect of a component scaling down for down states in Spectrum 2. This is not applicable to all components.

## Tokens Diff

_Tokens added (3):_

- `component-size-difference-down`
- `component-size-minimum-perspective-down`
- `component-size-width-ratio-down`

_Token values updated (15):_

- `component-top-to-workflow-icon-100`
- `component-top-to-workflow-icon-200`
- `component-top-to-workflow-icon-300`
- `component-top-to-workflow-icon-50`
- `component-top-to-workflow-icon-75`
- `text-to-visual-100`
- `text-to-visual-200`
- `text-to-visual-300`
- `text-to-visual-50`
- `text-to-visual-75`
- `workflow-icon-size-100`
- `workflow-icon-size-200`
- `workflow-icon-size-300`
- `workflow-icon-size-50`
- `workflow-icon-size-75`
