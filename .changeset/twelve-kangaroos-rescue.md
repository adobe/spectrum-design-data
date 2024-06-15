---
"@adobe/spectrum-tokens": minor
---

Updated tokens according to updated token spec for Spectrum 2, including new and deprecated tokens

## Design Motivation

### Change 1: Updated terminology to align with t-shirt sizes

Previously in S1, the breadcrumb variants were default, compact, and multiline. However, in S2, we have aligned breadcrumb to t-shirt sizes, resulting in the following changes:

- Breadcrumbs (default) -> Breadcrumbs (L)
- Breadcrumbs (compact) -> Breadcrumbs (M)
- Breadcrumbs (multiline) -> Breadcrumbs (multiline)

### Change 2: Updated truncated menu button sizes and spacing

Other structural changes

- In S1 all variants used M sized action button – now we use S, M, L sized action buttons for respective sizes.
- In S1 all variants had same spacing 8px around chevron, now we use different spacings for all the three variants

## Token Diff

_Tokens added (11):_

- `breadcrumbs-separator-to-bottom-text-multiline`
- `breadcrumbs-start-edge-to-text-large`
- `breadcrumbs-start-edge-to-text-medium`
- `breadcrumbs-start-edge-to-text-multiline`
- `breadcrumbs-top-to-separator-large`
- `breadcrumbs-top-to-separator-medium`
- `breadcrumbs-top-to-separator-multiline`
- `breadcrumbs-truncated-menu-to-separator`
- `breadcrumbs-text-to-separator-large`
- `breadcrumbs-text-to-separator-medium`
- `breadcrumbs-text-to-separator-multiline`

_Newly deprecated tokens (13):_

- `breadcrumbs-height`
- `breadcrumbs-height-compact`
- `breadcrumbs-top-to-text`
- `breadcrumbs-top-to-text-compact`
- `breadcrumbs-bottom-to-text`
- `breadcrumbs-bottom-to-text-compact`
- `breadcrumbs-start-edge-to-text`
- `breadcrumbs-top-to-separator-icon`
- `breadcrumbs-top-to-separator-icon-compact`
- `breadcrumbs-top-to-separator-icon-multiline`
- `breadcrumbs-separator-icon-to-bottom-text-multiline`
- `breadcrumbs-truncated-menu-to-separator-icon`
- `breadcrumbs-top-to-truncated-menu-compact`

_Token values updated (20):_

- `breadcrumbs-top-to-separator-icon-multiline`
- `breadcrumbs-top-to-text-multiline`
- `breadcrumbs-bottom-to-text-multiline`
- `breadcrumbs-height-multiline`
- `breadcrumbs-top-to-separator-icon-multiline`
- `breadcrumbs-top-to-text-multiline`
- `breadcrumbs-height`
- `breadcrumbs-height-compact`
- `breadcrumbs-truncated-menu-to-separator-icon`
- `breadcrumbs-truncated-menu-to-bottom-text`
- `breadcrumbs-bottom-to-text`
- `breadcrumbs-bottom-to-text-compact`
- `breadcrumbs-separator-icon-to-bottom-text-multiline`
- `breadcrumbs-start-edge-to-text`
- `breadcrumbs-top-to-separator-icon`
- `breadcrumbs-top-to-separator-icon-compact`
- `breadcrumbs-top-to-text`
- `breadcrumbs-top-to-text-compact`
- `breadcrumbs-top-to-truncated-menu`
- `breadcrumbs-top-to-truncated-menu-compact`
