---
"site": patch
---

Fix broken heading anchors on published spec pages.

- **docs/site/eleventy.config.js**: add `markdown-it-anchor` with a GitHub slugger; spec headings
  now emit `id` attributes so fragment links like `#token-bindings` resolve.
- **docs/site/package.json**: add `markdown-it-anchor` and `github-slugger`.
