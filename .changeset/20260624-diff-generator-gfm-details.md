---
"@adobe/token-diff-generator": patch
---

Fix token-diff `<details>` rendering in GitHub Flavored Markdown.

- **tools/diff-generator/src/templates/markdown.hbs**: add `<!-- -->` separator after each
  `</summary>` so prettier does not collapse the required blank line when the diff is nested
  inside a changelog list item.
