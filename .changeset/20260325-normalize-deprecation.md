---
"@adobe/token-diff-generator": patch
---

## Fix false un-deprecation reports for restructured deprecation

Tokens that have `deprecated: true` at every set level
(e.g. `sets.desktop.deprecated` and `sets.mobile.deprecated`)
are now normalized to top-level `deprecated: true` before
diffing. This prevents false "Newly Deprecated" and
"Newly Un-deprecated" classifications when deprecation
metadata is restructured from set-level to top-level
without changing the token's actual deprecation status.
