---
"@adobe/spectrum-tokens": minor
---

Added action bar border color.

## Design Motivation

Similar to the issues reported for popovers (SDS-14251), there isn't sufficient visual contrast of action bars on top of backgrounds in dark theme when used on background-color-layer-2.

The solution to this issue in both popovers and action bars should be the same (Popover update has been merged)

This issue was originally reported by the React team. Attached reference images from their implementation, one without border and one with border that matches the current popover border in dark.

## Token Diff

_Tokens added (7):_

- `action-bar-border-color`
