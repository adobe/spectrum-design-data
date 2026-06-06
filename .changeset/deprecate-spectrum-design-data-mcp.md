---
"@adobe/spectrum-design-data-mcp": patch
---

Formally deprecate `@adobe/spectrum-design-data-mcp` in favour of `@adobe/design-data-mcp`.

- **tools/spectrum-design-data-mcp/package.json**: prepend description with DEPRECATED notice
  pointing to `@adobe/design-data-mcp`.
- **tools/spectrum-design-data-mcp/README.md**: add deprecation callout block under H1.
- **tools/spectrum-design-data-mcp/src/index.js**: emit deprecation warning to stderr on startup.
- **docs/site/src/pages/ai.md**: strengthen Legacy section from soft "prefer" to formal ⚠️
  deprecated callout; preserve tool lists and config for existing users.

No code or tool behaviour changes; existing integrations continue to work unchanged.

Post-publish: run `npm deprecate @adobe/spectrum-design-data-mcp "..."` against the registry.
