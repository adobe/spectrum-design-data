---
"@adobe/spectrum-tokens": minor
---

- Updated S2 accordion tokens (non-color) in respective desktop and mobile layout sets
- Added S2 meter tokens, including both color and non-color.

## Design Motivation

- Accordion component is being formalized as a Spectrum 2 component. These net-new tokens define the design data needed for implementation. Introducing content-area-edge-to-content tokens enhances inclusivity for various design patterns. For more information, [view Jira ticket](https://jira.corp.adobe.com/browse/SDS-13435).
- Meter component is being formalized as a Spectrum 2 component. These net-new tokens define the design data needed for implementation. Introducing static tokens enables us to standardize the use of tokens across various components with indicators and tracks. This includes progress bars, progress circles, and potentially sliders in the future. For more information, [view Jira ticket](https://jira.corp.adobe.com/browse/SDS-13414).

## Token Diff

_Tokens added (18):_

- `accordion-content-area-edge-to-content-extra-large`
- `accordion-content-area-edge-to-content-large`
- `accordion-content-area-edge-to-content-medium`
- `accordion-content-area-edge-to-content-small`
- `accordion-disclosure-indicator-to-text-extra-large`
- `accordion-disclosure-indicator-to-text-large`
- `accordion-disclosure-indicator-to-text-medium`
- `accordion-disclosure-indicator-to-text-small`
- `accordion-item-to-divider`
- `meter-thickness-extra-large`
- `meter-thickness-medium`
- `static-black-text-color`
- `static-black-track-color`
- `static-black-track-indicator-color`
- `static-white-text-color`
- `static-white-track-color`
- `static-white-track-indicator-color`
- `track-color`

_Newly deprecated tokens (2):_

- `accordion-edge-to-disclosure-indicator`
- `accordion-disclosure-indicator-to-text`

_Tokens updated (1):_

- `meter-thickness-large`
