---
"s2-tokens-viewer": patch
---

Fix broken tabs (closes viewer report from Matt Davey).

- **index.html**: stop dropping failed fetches from the results array before
  `init()` destructures it positionally — a single missing file no longer
  shifts every later tab's data into the wrong slot.
- **scripts/resolve.mjs**: regenerate `tokens/color-component.json` at build
  time from the CTR-authored per-component token files (removed upstream in
  #1330), restoring the Component colors tab.
