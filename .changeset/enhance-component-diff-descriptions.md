---
"@adobe/spectrum-component-diff-generator": minor
---

feat(component-diff): enhance property change descriptions and fix breaking change detection

Improves diff reporting with detailed change descriptions instead of confusing
"deleted + added" reports. Also fixes incorrect breaking change classification.

**Enhanced Change Detection:**

- Property updates show specific changes (e.g., "removed default: null")
- Eliminates false "property deleted" reports for property modifications
- Correctly identifies `default: null` removal as non-breaking
- Correctly identifies enum value additions as non-breaking

**Improved Output:**

- `container`: "removed default: null" (was: "property deleted")
- `selectionMode`: "removed default: null, added enum values: 'no selection'"
- Type changes show "type changed from X to Y"
- Default changes show "default changed to X"

This resolves confusion where property updates were incorrectly shown as breaking
deletions and eliminates duplicate property reporting.
