---
"@adobe/spectrum-tokens": minor
---

- Fixed token type from Sizing to Font size for contextual-help-body-size and `contextual-help-title-size`
- Renamed tokens by deprecating previous ones and creating new ones, with font in the token name
  Updated value of `contextual-help-title-font-size`

Marked the the following tokens in Tokens Studio for deprecation:

- `negative-subdued-background-color-default` ( --> points to `negative-subtle-background-color-default`)
- `negative-subdued-background-color-hover`
- `negative-subdued-background-color-down`
- `negative-subdued-background-color-key-focus`

## Design motivation

- The updated type sorts them correctly in the Tokens Studio data
- The updated value reflects the latest design for Spectrum 2, using the new title style instead of heading

- The negative-subdued tokens were deprecated because the tag "error" variant has been deprecated and are no longer needed in the system. A new "subtle" token has been added for the in-line alert use case.

## Token diff

_Tokens added (2):_

- `contextual-help-body-font-size`
- `contextual-help-title-font-size`

_Newly deprecated Tokens (6):_

- `contextual-help-body-size`
- `contextual-help-title-size`
- `negative-subdued-background-color-default`
- `negative-subdued-background-color-hover`
- `negative-subdued-background-color-down`
- `negative-subdued-background-color-key-focus`
