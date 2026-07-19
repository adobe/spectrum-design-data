---
"@adobe/spectrum-component-diff-generator": patch
---

Fixed a false-positive breaking-change flag when a `tokenBindings` array (or any
non-`properties` array field) shrinks. `detailedDiff` diffs arrays index-by-index, so
removed trailing entries surfaced as a top-level `deleted.<field>` entry even though
the field was still present — `isComponentChangeBreaking` treated any such deletion as
breaking regardless. It now only flags breaking when the field is missing from the
updated schema entirely.

- **src/lib/component-diff.js**: only treat non-`properties` deletions as breaking when
  the field itself was removed from the updated schema, not merely shortened.
