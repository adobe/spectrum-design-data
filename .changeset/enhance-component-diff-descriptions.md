---
"@adobe/spectrum-component-diff-generator": minor
---

feat(component-diff): enhance property change descriptions

Improves diff reporting with clear change descriptions instead of confusing
"deleted + added" reports. Fixes incorrect breaking change classification.

- Property updates show specific changes (e.g., "removed default: null")
- Eliminates false "property deleted" reports
- Correctly identifies `default: null` removal as non-breaking
- Eliminates duplicate property reporting

Example: `selectionMode` now shows "removed default: null, added enum values"
instead of both "Added: selectionMode" and "Removed: selectionMode".
