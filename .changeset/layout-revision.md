---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add `layoutRevision` to `dataset.json` and publish `dataset.json` with the data package. The
renderer has its own layout revision and the CLI warns when it differs from the data's, so a
CLI newer than the data (the #1799 case) is reported instead of silently rendering differently.
