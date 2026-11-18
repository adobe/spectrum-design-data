---
"@adobe/spectrum-tokens": minor
---

Change in-field progress circle sizes so they match the height of the field text they sit beside.

The old values (16, 20, 22, 26 px) were the workflow icon scale and did not match what is drawn.
Figma S2 Web draws the in-field progress circle at 16, 18, 20 and 22 px, the line height of the
field text at S, M, L and XL. React Spectrum S2 agrees: ComboBox and Picker size it `1lh`, which
works out to the same four values. Neither source reads these tokens. Same shrink as
`workflow-icon-size-*` in 15.7.0.

- `in-field-progress-circle-size-100`: 20px to 18px (mobile 24px to 23px).
- `in-field-progress-circle-size-200`: 22px to 20px (mobile 28px to 25px).
- `in-field-progress-circle-size-300`: 26px to 22px (mobile 30px to 28px).
- `in-field-progress-circle-size-75` is unchanged (16px, mobile 18px).

Mobile values are desktop x 1.25, rounded half up. They have no design source.
