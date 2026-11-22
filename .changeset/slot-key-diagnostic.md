---
"@adobe/design-data-wasm": patch
"@adobe/design-data-spec": patch
---

feat(design-data): warn when a request slot key matches no slot

- A render request `slots` key that is no slot name of a slot part now adds a
  scene warning. It lists the slots that have a part, and says so when the key
  is the part id (radio-group: `default`, not `options`). The render succeeds.
- Document that `--slots` keys are slot names, not part ids.
