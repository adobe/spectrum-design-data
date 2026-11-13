---
"@adobe/design-data-wasm": patch
---

The renderer now reports a diagnostic when a `relationship` or `token` selector
still matches more than one token after narrowing by mode and options, naming
the part, the selector and the candidate count. A candidate with fewer name
fields still wins the tie-break silently, as before. The render uses the first
candidate; previously a true tie was silent. No foundation or platform recipe
is affected.
