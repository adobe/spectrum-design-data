---
"@adobe/design-data-wasm": patch
---

The component explorer (`design-data site`) now honors option constraints.

- **Matrix:** combinations excluded by an `error` constraint are not rendered, and rows or columns
  left empty are dropped. A note under the grid says what was left out and why, with the fix.
  `advisory` combinations render with a footnote saying they have no distinct design.
- **Pickers:** values that lead to an unsupported combination read "(not supported)", and a status
  message under the pickers explains the current selection, with one-click fixes.
- **Zoom view:** an unsupported selection shows the explanation instead of a render.
- **sdk/plugins/site:** new `constraints.js` mirrors `sdk/core/src/constraints.rs`; a shared
  fixture keeps the Rust and JS evaluations in lockstep.
