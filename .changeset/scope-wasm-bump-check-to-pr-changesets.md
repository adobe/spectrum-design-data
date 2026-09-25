---
"@adobe/changeset-linter": patch
---

Scope the `check-data-bump` guard to changesets added in the PR diff, not
every pending changeset on disk.

- **tools/changeset-linter**: replace `readPendingChangesetContents` with
  `getChangedChangesetContents`, which only reads `.changeset/*.md` files
  added or modified relative to the base ref, so an unrelated pre-existing
  changeset can no longer satisfy the guard for a new dataset change.
