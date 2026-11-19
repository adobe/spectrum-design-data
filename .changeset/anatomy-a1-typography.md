---
"@adobe/spectrum-design-data": minor
---

Review the anatomy of body, heading, detail, title and code. Each stays a component with one root part,
`text`, and its 239 live relationship records now say so (`scope.part`).

- Title: `size` is renamed `font-size` (14 records), `family: cjk` becomes `script: cjk` (10), and its
  two duplicate margin records are removed. Code: `size` becomes `font-size` (5), and its
  description is fixed.
- Body, heading and detail: `margin-multiplier` becomes `margin` with `position`, and the margin
  `structure` option is dropped. The registry drops the `heading` and `detail` structures (unused).
- Title, detail and code: records of one property share one context. Body and heading keep theirs.
- Heading no longer lists React Spectrum `Heading` as its implementation (it is unstyled).
- The five components are marked `reviewed` and are at status level 2 (body and heading at 1).

Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.
