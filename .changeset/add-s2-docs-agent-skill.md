---
"@adobe/s2-docs-mcp": minor
---

feat(s2-docs-mcp): add agent skill plugin, CLI bin, and bundled docs

Adds a Claude Code / Cursor Agent Skill plugin and a `s2-docs` CLI so the
package works via `npx` without a local repo clone.

- `bin/s2-docs.js` — CLI with list/get/search/use-case/stats subcommands
- `skills/s2-docs/SKILL.md` — auto-triggers on Spectrum intent; Cursor-compatible
- `tasks/bundleDocs.js` + `prepublishOnly` — bundles docs into `data/` at publish
- Fix: `src/data/docs.js` resolves bundled data first, repo path as dev fallback
