---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Fix the render ambiguity check so a record pinned to an inactive state
no longer ties with the chosen candidate. A text field in its default
or error state keeps its border and value text colors.
