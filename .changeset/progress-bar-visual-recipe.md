---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add a progress-bar visual recipe, and recipe support for a fill amount and option text.

- New value source `fraction` (`value`, `min`, `max` option names) and `relativeTo: "parent"` size a
  nested box as a share of its parent. A text part's new `text` field reads a string option or shows
  the fraction as a percentage.
- Progress bar renders size, value, indeterminate (one fixed frame), hideLabel, and white and black
  static colors. `labelPosition: side` is not drawn yet.
- Progress bar anatomy is reviewed and gains a `header` part. The `variant` option (Spectrum 1 only)
  is removed, and `staticColor` gains `black` with its three relationships.
