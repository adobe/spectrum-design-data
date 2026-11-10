---
"token-mapping-analyzer": patch
---

Read canonical `lifecycle.deprecatedIn` when deciding whether a token is
deprecated, so deprecated canonical tokens no longer count as active in
reports. Legacy top-level `deprecated` is still honored.
