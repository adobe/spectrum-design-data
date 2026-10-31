---
"@adobe/design-data-wasm": patch
---

Speed up `Dataset.renderScene` and `Dataset.renderSvg` by compiling each recipe once per component, size and mode and reusing it. Repeated renders are 30 to 55 times faster (button 6.5 to 0.21 ms, badge 5.0 to 0.11 ms, switch 7.8 to 0.14 ms). Scene and SVG output are unchanged.
