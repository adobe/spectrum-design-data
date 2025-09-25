---
"@adobe/spectrum-component-diff-generator": minor
---

feat(component-diff): enhance property change descriptions

Significantly improves diff reporting by providing detailed change descriptions instead of confusing "deleted + added" reports for property updates.

**Enhanced Change Detection:**

- Property updates now show specific changes (e.g., "removed default: null", "added enum values")
- Eliminates false "property deleted" reports for property modifications
- Provides clear descriptions for enum additions/removals, type changes, default value changes

**Improved Output:**

- `container` property updates: "removed default: null" (was: "property deleted")
- `selectionMode` updates: "removed default: null, added enum values: 'no selection'" (was: "deleted + added")
- Type changes clearly show "type changed from X to Y"
- Default value changes show "default changed to X"

**Template Updates:**

- Enhanced Handlebars templates support new change description format
- Prioritizes enhanced descriptions over raw diff output
- Maintains backward compatibility with existing change detection

This resolves confusion in PR reports where property updates were incorrectly shown as breaking deletions.
