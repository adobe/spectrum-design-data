---
"figma-spec-plugin": patch
---

Split a changelog too long for one `use_figma` payload across several payloads instead of failing.

- **tools/figma-spec-plugin/payloads.mjs**: the changelog is cut into pieces (newest release first, split inside a release when needed) sized to the payload limit.
- **tools/figma-spec-plugin/code.js**: `appendChangelog` takes a `more` flag that adds releases to the existing changelog frame.
