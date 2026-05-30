---
title: Using with AI
layout: base.liquid
permalink: /ai/
---

# Using with AI

Spectrum Design Data publishes Model Context Protocol (MCP) servers and Agent Skills so AI assistants can query design tokens, component schemas, and Spectrum 2 documentation directly from tools like Claude Code and Cursor.

## S2 docs skill (recommended for prototyping)

The `s2-docs` Agent Skill fetches S2 component docs on-demand — only when the AI is working on Spectrum components — without loading a persistent MCP server into every session. This keeps context lean during long prototype sessions.

The skill auto-triggers when you mention Spectrum, React Spectrum, Spectrum Web Components, or a component name. You can also invoke it directly with `/s2-docs:s2-docs <component>`.

### Install in Claude Code

Add the Spectrum Design Data marketplace, then install the skill:

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install s2-docs@spectrum-design-data
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

## Design Data agent surface

Two Agent Skills cover design tokens and component schemas. Both shell out to the [`@adobe/design-data`](https://www.npmjs.com/package/@adobe/design-data) CLI — only the skill description loads into session context until invoked.

| Need | Skill | MCP fallback |
|------|-------|--------------|
| Spectrum tokens, zero setup (embedded snapshot) | `design-data` | `@adobe/design-data-mcp` |
| Custom dataset on disk, validate/diff/write, spec tool names | `design-data-agent` | `@adobe/design-data-agent-mcp` |
| Minimal session context cost | Skill (either above) | — |
| Always-on tool access in agent pipelines | — | MCP (either above) |

### `design-data` — Spectrum tokens (zero config)

Look up token values, query by component/property, suggest tokens from natural language, and read component schemas. Uses the embedded Spectrum snapshot automatically — no dataset paths required.

**Claude Code:**

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install design-data@spectrum-design-data
```

**Cursor** — Settings → Rules → **Add Rule** → **Remote Rule (GitHub)**:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-skill/skills/design-data
```

### `design-data-agent` — spec-conformant / custom datasets

Validate, query, resolve, diff, and author tokens against a local dataset. Tool names match the [agent surface spec](https://github.com/adobe/spectrum-design-data/blob/main/packages/design-data-spec/spec/agent-surface.md). Requires `DESIGN_DATA_PATH` (and spec catalog paths for components/fields/dimensions).

**Claude Code:**

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install design-data-agent@spectrum-design-data
```

**Cursor** — Settings → Rules → **Add Rule** → **Remote Rule (GitHub)**:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-agent-mcp/skills/design-data
```

### Skill vs MCP — design data

| | Agent Skill | MCP Server |
|---|---|---|
| **Context cost** | Description only until invoked | All tool schemas loaded every session |
| **Best for** | Prototyping, on-demand lookups | Always-available access, agent pipelines |
| **Setup** | `/plugin install` or Cursor remote rule | Add to `mcp.json`, restart editor |

## MCP Servers

### @adobe/design-data-mcp

Spectrum design tokens and component schemas via the `@adobe/design-data` CLI. Zero-config embedded snapshot. Prefer the [`design-data` skill](#design-data--spectrum-tokens-zero-config) for prototyping.

**npm:** `@adobe/design-data-mcp`

**Tools:** `design-data-primer`, `design-data-query`, `design-data-suggest`, `design-data-component`, `design-data-resolve`

**Cursor config:**

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp"]
    }
  }
}
```

### @adobe/design-data-agent-mcp

Spec-conformant agent surface for any local dataset. Tool names match the agent surface spec (`primer`, `resolve_token`, `query_tokens`, `validate_usage`, etc.). Prefer the [`design-data-agent` skill](#design-data-agent--spec-conformant--custom-datasets) for prototyping.

**npm:** `@adobe/design-data-agent-mcp`

**Tools:** `primer`, `resolve_token`, `query_tokens`, `describe_component`, `validate_usage`, `diff_datasets`, `write`, plus authoring-session tools

**Cursor config:**

```json
{
  "mcpServers": {
    "design-data-agent": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-agent-mcp"],
      "env": {
        "DESIGN_DATA_PATH": "./packages/tokens/src",
        "DESIGN_DATA_COMPONENTS": "./packages/design-data-spec/components",
        "DESIGN_DATA_FIELDS": "./packages/design-data-spec/fields",
        "DESIGN_DATA_DIMENSIONS": "./packages/design-data-spec/dimensions"
      }
    }
  }
}
```

Adjust paths to match your dataset layout.

### @adobe/spectrum-design-data-mcp (legacy)

Design tokens and component API schemas. Enables AI to look up token values, find tokens by use case, validate component props, and get schema definitions.

**Prefer [`@adobe/design-data-mcp`](#adobedesign-data-mcp)** for new projects — it wraps the current `@adobe/design-data` CLI with an embedded Spectrum snapshot.

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

Spectrum 2 component documentation and design guidelines. For prototyping, consider the [S2 docs skill](#s2-docs-skill-recommended-for-prototyping) above instead — it loads docs on-demand with less context overhead. Use this MCP when you want always-available access or are building agent pipelines.

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

Add MCP servers to `.cursor/mcp.json` for always-available access. Skills (remote rules) are lighter for prototyping — see sections above.

**Spectrum prototyping (tokens + S2 docs):**

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp"]
    },
    "s2-docs": {
      "command": "npx",
      "args": ["-y", "@adobe/s2-docs-mcp"]
    }
  }
}
```

**Spec / custom dataset work:**

```json
{
  "mcpServers": {
    "design-data-agent": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-agent-mcp"],
      "env": {
        "DESIGN_DATA_PATH": "./packages/tokens/src"
      }
    }
  }
}
```

**Legacy (spectrum-design-data-mcp):**

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
