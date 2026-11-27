---
"figma-spec-plugin": patch
---

Split a changelog too long for one `use_figma` payload across several payloads.

- **payloads.mjs**: cut the changelog into pieces sized to the payload limit,
  newest release first, splitting inside a release when needed.
- **code.js**: `appendChangelog` takes a `more` flag that adds releases to the
  existing changelog frame.
