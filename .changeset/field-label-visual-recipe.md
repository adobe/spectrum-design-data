---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Added a visual recipe for `field-label`: a label with an optional required-field indicator,
bound through the component's relationships. The component now declares `container` and
`label` anatomy parts, and its indicator part is renamed from `asterisk` to the registered
`necessity-indicator` (draft anatomy, no known consumers). The asterisk size relationships are
pinned by `size`, so each size resolves to one token.
