---
"@adobe/spectrum-design-data": patch
---

Drop `maximum: 5` from the Rating `value` option, which conflicted with the
configurable `maxValue` option (default 5). `multipleOf: 0.5` stays as display precision.
