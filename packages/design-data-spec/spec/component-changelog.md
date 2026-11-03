# Component changelog

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

A **component changelog** is the generated, committed history of one component: what changed in its records between releases, why (source), and the component version that follows. `design-data changelog` writes `changelog/<component>.json` next to the dataset; the format is `schemas/component-changelog.schema.json`.

## Records compared

Two dataset revisions are compared record by record. Formatting and key order never produce a change.

| Layer          | Identity                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Tokens         | The [semantic diff](diff.md) (uuid, then name object, then replacement link)                               |
| Relationships  | `uuid`; then scope + context + target; a leftover pair with the same scope and context is a **re-binding** |
| Components     | Options, option values, anatomy parts, states, slots by name; document blocks, implementations, lifecycle  |
| Visual recipes | The component's recipe file and its parts                                                                  |

A removed and an added option, state, anatomy part or slot that differ only by name are one **rename**.

## Attribution

Each change attaches to a component, to the relationship context (the spec-sheet block title) it appears under, and to a **source**: the PR number in the squash subject (`... (#123)`), otherwise the commit sha and subject. A global token reaches a component through the relationships that bind it. A token a component binds whose own record is unchanged but whose alias-resolved value moved is an **indirect** change. Registry and mode-set changes are not fanned out to components.

A record's own `rationale` is copied into the entry when present. History comes from the diff; the source is the fallback reason.

## Classes

| Class           | Meaning                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `visual`        | How the component looks or behaves: token values, relationship bindings, visual recipes                |
| `api`           | Options, option values, states, anatomy, slots, constraints, relationships added or removed, lifecycle |
| `documentation` | Descriptions, document blocks, rationale, relationship context text                                    |
| `metadata`      | Legacy keys, ids, ordering, implementations, spec bookkeeping (summarized, not listed)                 |

**Metadata-class changes are not entries.** Each commit records them as `metadata: {count, fields}`: how many changes, and which field paths changed (a record added or removed is named `<kind> <change>`, e.g. `implementation added`). They count as a patch.

In the committed file every entry, source and metadata summary is written on one line.

A token entry is a **Values updated** change; a relationship entry that changes only its target is a **Bindings changed** change. They are never merged.

## Component version

The version is derived from the entries of each release; it is never authored. A component's first release is `1.0.0`. Each release applies the highest bump among its entries:

* **major**: an option, option value, state, anatomy part, slot or relationship removed; an option, state, anatomy part or slot renamed; an option `type` changed; the component deprecated or removed.
* **minor**: anything added, including a visual recipe (metadata-class additions are patch).
* **patch**: value changes (direct or indirect), documentation, metadata, rationale.

Each release lists its changes per commit, each commit with its source. Releases are append-only: a release already recorded is never rewritten, and generating the same release again changes nothing. The exception is the pending release named `unreleased`, which holds changes not yet in a package release: the next release takes over its commits (adding newer ones) and the version is worked out again from the version before it.
