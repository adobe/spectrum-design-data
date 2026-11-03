---
"@adobe/design-data-wasm": minor
"@adobe/design-data-spec": minor
---

feat(core): component changelog entries, classes and derived semver (hzje.4-6)

New `component-changelog.schema.json` and `spec/component-changelog.md` define
`changelog/<component>.json`: releases (append only) of entries, each with the component,
relationship context, class (`visual`, `api`, `documentation`, `metadata`), bump, direct or
indirect, field changes, `rationale` where the record has one, and its source (the PR from the
squash subject, otherwise the commit). `core::changelog` builds the entries from a record diff
and derives the component semver from them: major for a removed option, option value, state,
anatomy part, slot or relationship, a renamed option, or a deprecated component; minor for
additions; patch otherwise. A component's first release is `1.0.0`.

Metadata-class changes (legacy keys, ids, implementations) are summarized per commit as
`metadata: {count, fields}` rather than listed, each entry is one line in the committed file, and
the pending `unreleased` release is taken over by the next real release.
