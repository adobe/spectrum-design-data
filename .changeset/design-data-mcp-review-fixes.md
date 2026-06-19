---
"@adobe/design-data-mcp": patch
---

Post-review cleanup for the Claude Desktop Extension packaging.

- **scripts/generate-mcpb.mjs**: Remove unused `pathToFileURL` import;
  replace `npx @anthropic-ai/mcpb` console hints with `pnpm exec mcpb`;
  add comment on flat-dedup assumption in `copyDependencyTree`.
- **moon.yml**: Replace `npx --yes @anthropic-ai/mcpb` with `pnpm exec mcpb`
  for deterministic builds without a per-run network fetch.
- **package.json**: Pin `@anthropic-ai/mcpb@^2.1.2` as a devDependency;
  update `description` and `keywords` to remove stale CLI references.
- **test/design-data.test.js**: Assert all 7 tools carry correct MCP
  annotations (`readOnlyHint`, `openWorldHint`, `title`).
- **test/generate-mcpb.test.js**: Smoke test that runs the bundle generator
  and asserts staging structure and manifest correctness.
