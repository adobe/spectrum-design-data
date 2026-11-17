---
"@adobe/spectrum-design-data": patch
---

Raise the dataset's `requires.cli` to 0.50.0. The progress-bar recipe uses the `fraction` and
`text` recipe keys, so an older CLI now refuses the dataset instead of drawing an empty fill.
