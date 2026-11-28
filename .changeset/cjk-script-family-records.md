---
"@adobe/spectrum-design-data": minor
---

Pin the cjk typography records to the family option as well, and list cjk as a legal script value.

- body, detail, heading and title gain 120 relationship records that pin both `script: cjk` and
  `family` (`sans-serif` or `serif`) for font-family, font-weight and font-style, each pointing at the
  same token as the cjk record it refines.
- Once a component declares a `family` option, a script-only record and a family-only record no
  longer tie on those properties: the record pinned to both is the better match.
- The `typography-script` type lists `cjk`, matching the `script` registry, so a `script: cjk` pin
  is a declared value.
- No render, legacy output or token changes. The new records add rows to the spec sheets of the four components.
