---
title: Using with AI
layout: base.liquid
permalink: /ai/
---

# Using with AI

Spectrum Design Data publishes Model Context Protocol (MCP) servers and an Agent Skill so AI assistants can query design tokens, component schemas, and Spectrum 2 documentation directly from tools like Claude Code and Cursor.

## Agent Skill (recommended for prototyping)

The `s2-docs` Agent Skill fetches S2 component docs on-demand — only when the AI is working on Spectrum components — without loading a persistent MCP server into every session. This keeps context lean during long prototype sessions.

The skill auto-triggers when you mention Spectrum, React Spectrum, Spectrum Web Components, or a component name. You can also invoke it directly with `/s2-docs:s2-docs <component>`.

### Install in Claude Code

Add the Spectrum Design Data marketplace, then install the skill:

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install s2-docs
```

After install, start a new session and ask something like _"which Spectrum component should I use for a searchable dropdown?"_ — the skill fetches the relevant docs automatically.

### Install in Cursor

Cursor Settings → Rules → **Add Rule** → **Remote Rule (GitHub)** → paste this URL:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/s2-docs-mcp/skills/s2-docs
```

Then invoke the skill in an Agent session via `/s2-docs get <component>` or ask a Spectrum question naturally.

### Skill vs MCP — when to use which

| | Agent Skill | MCP Server |
|---|---|---|
| **Context cost** | Description only (~200 chars) until invoked | All tool schemas loaded every session |
| **Best for** | Prototyping, on-demand lookups | Always-available access, agent pipelines |
| **Triggers** | Automatically on Spectrum intent, or `/s2-docs:s2-docs` | Called by the AI as a tool whenever needed |
| **Setup** | `/plugin install` or Cursor remote rule | Add to `mcp.json`, restart editor |

Both can run together. The skill is a lightweight companion; the MCP is the full integration.

## MCP Servers

### @adobe/spectrum-design-data-mcp

Design tokens and component API schemas. Enables AI to look up token values, find tokens by use case, validate component props, and get schema definitions.

**npm:** `@adobe/spectrum-design-data-mcp`

**Token tools:** `query-tokens`, `query-tokens-by-value`, `get-token-details`, `get-component-tokens`

**Schema tools:** `list-components`, `get-component-schema`, `validate-component-props`, `search-components-by-feature`

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

Spectrum 2 component documentation and design guidelines. For prototyping, consider the [Agent Skill](#agent-skill-recommended-for-prototyping) above instead — it loads docs on-demand with less context overhead. Use this MCP when you want always-available access or are building agent pipelines.

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
