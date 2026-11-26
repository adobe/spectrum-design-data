---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

A key suite can run against the item parts of a collection.

- A suite in `conformance/behavior/bindings/<platform>/<role>.item.json` sets `"item": true`. The
  runner then selects every component whose collection item contract has a part with that role,
  not the group's own part, so Accordion (a group with no role) runs the `button` key vectors.
- The Accordion key vectors (Enter, Space, an arrow) moved from a Rust-only test into
  `bindings/web/button.item.json`.
