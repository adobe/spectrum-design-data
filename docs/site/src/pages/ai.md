---
title: Using with AI
layout: base.liquid
permalink: /ai/
---

# Using with AI

Spectrum Design Data publishes Model Context Protocol (MCP) servers so AI assistants can query design tokens, component schemas, and Spectrum 2 documentation directly from tools like Cursor.

## MCP Servers

### @adobe/spectrum-design-data-mcp

Design tokens and component API schemas. Enables AI to look up token values, find tokens by use case, validate component props, and get schema definitions.

**npm:** `@adobe/spectrum-design-data-mcp`

**Token tools:** `query-tokens`, `query-tokens-by-value`, `get-token-details`, `get-token-categories`, `get-component-tokens`, `find-tokens-by-use-case`, `get-design-recommendations`

**Schema tools:** `query-component-schemas`, `list-components`, `get-component-schema`, `get-component-options`, `get-type-schemas`, `validate-component-props`, `search-components-by-feature`

**Workflow tools:** `build-component-config`, `suggest-component-improvements`

**Implementation tools:** `resolve-implementation`, `reverse-lookup-implementation`, `list-implementation-mappings`

**Cursor config (single server):**

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/spectrum-design-data-mcp"]
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
      "args": ["-y", "@adobe/s2-docs-mcp"]
    }
  }
}
```

If you run from source, point `args` to `tools/s2-docs-mcp/src/cli.js` inside your clone.

## Agent Skills

Agent Skills are markdown guides that orchestrate MCP tools into complete workflows for common design system tasks. They don't execute code directly — instead they tell AI agents which tools to call, in what order, and how to combine the results.

The top-level entry point is [`SKILL.md`](https://github.com/adobe/spectrum-design-data/blob/main/tools/spectrum-design-data-mcp/agent-skills/SKILL.md), which follows a standard skill metadata format recognized by MCP-compatible clients (Cursor, Claude Code, VS Code, etc.). MCP clients that support Agent Skills will auto-discover it from the server.

### Available skills

* **[Component Builder](https://github.com/adobe/spectrum-design-data/blob/main/tools/spectrum-design-data-mcp/agent-skills/component-builder.md)** — Guides agents through discovering component schemas, finding design tokens, and validating configurations. Use when building or implementing Spectrum components.

* **[Token Finder](https://github.com/adobe/spectrum-design-data/blob/main/tools/spectrum-design-data-mcp/agent-skills/token-finder.md)** — Helps agents find the right tokens for colors, spacing, typography, and component styling. Use when asking "what token should I use for…"

* **[State Management guide](https://github.com/adobe/spectrum-design-data/blob/main/tools/spectrum-design-data-mcp/agent-skills/guides/state-management.md)** — Covers token recommendations per interactive state (default, hover, focus, disabled, selected).

### Using skills

For AI agents, read the relevant skill file when a task matches its scope and follow the step-by-step workflow. For developers, reference skill files in your project docs or system prompts to steer agents toward correct Spectrum patterns.

## Cursor IDE setup

Add both servers to `.cursor/mcp.json` so the AI can use tokens, schemas, and S2 docs in the same session:

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/spectrum-design-data-mcp"]
    },
    "s2-docs": {
      "command": "npx",
      "args": ["-y", "@adobe/s2-docs-mcp"]
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
