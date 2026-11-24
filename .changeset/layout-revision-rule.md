---
"@adobe/design-data-spec": patch
---

Clarify when the layout revision is bumped: only for an engine change to how existing recipes
lay out that an older renderer cannot reproduce. New data or new features that older renderers
ignore are covered by `requires.cli`, not the revision.
