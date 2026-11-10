---
"@adobe/design-data": patch
---

Remove the `./write` and `./session` exports, which pointed at files deleted
in 3.0.0 (token writes and authoring sessions moved to the `design-data write`
and `design-data authoring-session` CLI commands), so they could never resolve.
Add the missing `README.md` that `files` declared, and a test that every
declared export and file is present in the packed tarball.
