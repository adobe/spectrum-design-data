---
"@adobe/design-data-tui": patch
---

Reject path traversal and link entries when extracting remote archives.

- **sdk/core/src/data_source/fetch.rs**: refuse `..`/absolute paths, skip symlinks and hardlinks.
