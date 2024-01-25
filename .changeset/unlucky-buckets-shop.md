---
"@adobe/spectrum-tokens": minor
---

existing corner-radius tokens, adding net-new global corner radius tokens, and introducing new alias names that point to these global values.

## Design Motivation

More on Spectrum 2 rounding: https://s2.spectrum.corp.adobe.com/page/object-styles/#rounding

In Spectrum 2, rounding also applies to the different t-shirt sized components and varies based on a Major Second logarithmic scale, rounded to whole numbers to avoid using half-pixels. This allows for components to retain a consistent and identifiable shape at all sizes. Because of this there are now component size specific tokens like corner-radius-small-size-medium or corner-radius-medium-size-extra-large to help us keep track of the nuance within t-shirt sizes.

## Token Diff

_Tokens added (23):_

- `corner-radius-0`
- `corner-radius-300`
- `corner-radius-400`
- `corner-radius-500`
- `corner-radius-600`
- `corner-radius-700`
- `corner-radius-800`
- `corner-radius-1000`
- `corner-radius-extra-large-default`
- `corner-radius-full`
- `corner-radius-large-default`
- `corner-radius-medium-default`
- `corner-radius-medium-size-extra-small`
- `corner-radius-medium-size-small`
- `corner-radius-medium-size-medium`
- `corner-radius-medium-size-large`
- `corner-radius-medium-size-extra-large`
- `corner-radius-none`
- `corner-radius-small-default`
- `corner-radius-small-size-small`
- `corner-radius-small-size-medium`
- `corner-radius-small-size-large`
- `corner-radius-small-size-extra-large`

_Token values updated (3):_

- `corner-radius-75`
- `corner-radius-100`
- `corner-radius-200`
