---
title: Using with AI
layout: base.liquid
permalink: /ai/
source_url: https://opensource.adobe.com/spectrum-design-data/pages/ai/
---

# Using with AI

Spectrum Design Data publishes Model Context Protocol (MCP) servers so AI assistants can query design tokens, component schemas, and Spectrum 2 documentation directly from tools like Cursor.

## MCP Servers

### @adobe/spectrum-design-data-mcp

Design tokens and component API schemas. Enables AI to look up token values, find tokens by use case, validate component props, and get schema definitions.

**npm:** `@adobe/spectrum-design-data-mcp`

**Token tools:** `query-tokens`, `find-tokens-by-use-case`, `get-component-tokens`, `get-design-recommendations`, `get-token-categories`, `get-token-details`

**Schema tools:** `query-component-schemas`, `get-component-schema`, `list-components`, `validate-component-props`, `get-type-schemas`

**Cursor config (single server):**

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "npx",
      "args": ["@adobe/spectrum-design-data-mcp"]
    }
  }
}
```

### @adobe/s2-docs-mcp

Spectrum 2 component documentation and design guidelines. Use when the AI needs S2 docs (scraped from the Spectrum site and stored in this repo).

**npm:** `@adobe/s2-docs-mcp`

**Tools:** `list-s2-components`, `get-s2-component`, `search-s2-docs`, `get-s2-stats`, `find-s2-component-by-use-case`

**Cursor config (single server):** Use a local path to the repo, or install and run from the repo. Example:

```json
{
  "mcpServers": {
    "s2-docs": {
      "command": "npx",
      "args": ["@adobe/s2-docs-mcp"]
    }
  }
}
```

If you run from source, point `args` to `tools/s2-docs-mcp/src/cli.js` inside your clone.

## Cursor IDE setup

Add both servers to `.cursor/mcp.json` so the AI can use tokens, schemas, and S2 docs in the same session:

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "npx",
      "args": ["@adobe/spectrum-design-data-mcp"]
    },
    "s2-docs": {
      "command": "npx",
      "args": ["@adobe/s2-docs-mcp"]
    }
  }
}
```

Restart Cursor after changing MCP config.

**More context in chat:**

* **@Files** — Reference `docs/s2-docs/` or `docs/markdown/` so the AI can read those files directly.
* **@Docs** — If this site (or another Spectrum doc site) is indexed in Cursor, add it via **@Docs → Add new doc** for searchable documentation.

## Other AI resources

* **llms.txt** — At the repo root, [llms.txt](https://github.com/adobe/spectrum-design-data/blob/main/llms.txt) describes the project layout, design tokens, component schemas, and common tasks for LLMs.
* **Generated markdown** — The [docs/markdown/](https://github.com/adobe/spectrum-design-data/tree/main/docs/markdown) directory holds auto-generated markdown from tokens, component schemas, and the design-system registry, used by the docs site and for chatbot indexing. Regenerate with `moon run markdown-generator:generate`.

**See also:** [React Spectrum — Using with AI](https://react-spectrum.adobe.com/ai) for React Spectrum’s own AI integration (S2 component implementation docs, icons, illustrations).
