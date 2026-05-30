---
"@adobe/design-data": minor
---

Share platform manifest application and property resolution between CLI and TUI.

- **sdk/core `manifest.rs`**: new `apply_configured` reads/validates `[source].manifest`
  and applies the platform cascade.
- **sdk/core `cascade.rs`**: new `resolve_property` + `ResolvedCandidate` unify
  property-scoped resolution.
- **sdk/cli**: `query`/`resolve` call shared core helpers; duplicate manifest helpers removed.
- **sdk/tui**: manifest at session load, `mode_set_restrictions` on `UpdateCtx`, `:resolve`
  uses `resolve_property`.
