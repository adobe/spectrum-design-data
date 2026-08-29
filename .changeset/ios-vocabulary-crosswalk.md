---
"@adobe/spectrum-design-data": patch
---

Register the iOS pressed/down state synonym surfaced by the iOS platform-manifest POC
(spectrum-design-data-h890.17).

- **packages/design-data/registry/states.json**: `active` gains `aliases: ["pressed"]`
  (iOS's pressed/down terms) and cross-references `down`; regenerated
  `sdk/core/src/registry_data.rs`.
