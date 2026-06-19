---
"@adobe/design-data-mcp": minor
---

Package as a Claude Desktop Extension for one-click install from the Anthropic Software Directory.

- **src/tools/design-data.js**: Add `annotations` (`title`, `readOnlyHint`, `openWorldHint`)
  to all 7 tools per Anthropic Software Directory policy.
- **src/index.js**: Forward `annotations` in `ListToolsRequestSchema`; fix stale docstring.
- **scripts/generate-mcpb.mjs**: New script that stages the bundle — vendors deps via
  recursive `copyDependencyTree` (dereferenced, so pnpm workspace packages copy cleanly),
  generates `icon.png` from `site/adobe_logo.svg` via `sharp` (512×512, transparent bg),
  and writes a `manifest.json` (manifest_version 0.3) auto-versioned from `package.json`.
- **moon.yml**: Add `bundle` task (`node scripts/generate-mcpb.mjs` → `mcpb validate`
  → `mcpb pack` → `dist/design-data.mcpb`).
- **package.json**: Add `sharp` devDependency for the generator script.
- **README.md**: Document all 7 tools (was 5); add Extension install section.
