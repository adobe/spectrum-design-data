---
"@adobe/spectrum-design-data": minor
---

Change the `maxValue` default from 1 to 100 on progress-bar, progress-circle and meter.

React Spectrum S2 passes `value` through to React Aria, whose range is 0 to 100, so `value: 50`
with no `maxValue` is now half. Anything that relied on a 0 to 1 range must set `maxValue: 1`.
`minValue` stays 0. Visual recipe renders and goldens are unchanged for the same share.
