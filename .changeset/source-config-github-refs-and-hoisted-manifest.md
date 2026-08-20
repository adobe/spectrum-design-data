---
"@adobe/design-data-tui": minor
---

Decouple the platform manifest from the source and let the GitHub source pin any ref.

- **sdk/core/src/data_source/mod.rs**: hoist `manifest` to a top-level, source-independent
  `.design-data.toml` key so a Layer 2 platform manifest cascades over any source (path, github,
  or the embedded/probed default), not only `type = "path"`; `deny_unknown_fields` now rejects
  misplaced keys instead of silently dropping them.
- **sdk/core/src/data_source/fetch.rs**: the `github` source pins by exactly one of `tag`,
  `branch`, or `sha` (release tarball over HTTPS — no Node, no git binary); branch pins refetch
  each run, tag/sha stay cached. Also fixes stale-cache eviction, which scanned a non-existent
  parent dir and never pruned old refs — now prunes the same repo's other refs, leaving other
  repos untouched.
