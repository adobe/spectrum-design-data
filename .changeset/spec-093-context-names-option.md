---
"@adobe/design-data-spec": minor
---

Add rule SPEC-093 (`relationship-context-names-option`, warning). A relationship `context` that
names a component option value, such as `Control (selected, non emphasized)`, should pin that
option in `scope.options` instead. A record that pins no option is the default, so the default
value needs no label in the context. Existing data is held at a baseline until it is migrated.
