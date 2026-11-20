---
"@adobe/design-data-wasm": patch
"@adobe/design-data-spec": minor
---

Component changelogs now list a change to a relationship's `scope.part`,
`scope.between`, `scope.property` or `scope.attribute` as an `api` entry, because a
recipe selector that named the old identity stops resolving. Moves that keep the
identity stay metadata: `scope.options.from`/`to` to `scope.between`, `contextPart` to
`scope.part`, a root part added to a record, and `contextRole`/`contextQualifier`
changes. Option pins (`state`, `variant`) stay visual. Existing changelogs are not
rewritten.
