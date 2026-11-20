---
"@adobe/design-data-wasm": patch
---

The status report skips L3 (structured recipe) for a component with exactly one declared
anatomy part, named `text`, and no visual recipe: the check passes, the report shows `n/a`, and the JSON
output gains `l3NotApplicable`. Every other component still needs L3. In the committed
baseline, code, detail and title rise from level 2 to 3; body and heading stay at 1.
