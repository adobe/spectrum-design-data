---
title: Using AI
layout: base.liquid
permalink: /ai/
source_url: https://opensource.adobe.com/spectrum-design-data/pages/ai/
---

# Using AI

**Spectrum Design Data** puts the official Spectrum dataset (design tokens, component
schemas, and Spectrum documentation and usage guidelines) directly in your AI assistant, so
it answers from real data instead of guessing. It ships as an Agent Skill and an MCP server,
both zero-config: they carry an embedded snapshot of Spectrum, docs included, so there's no
dataset to point at and nothing to run yourself.

It's for anyone building with Spectrum: engineers, designers, PMs prototyping a screen,
reviewing a PR, or wiring up a component who want to know "which token is this" or "what
does this component support" without leaving the conversation.

## What you can do with it

- **Look up a token:** "what's the token for the default row background?"
- **Suggest a token from a description:** "I need a background for a selected, hovered row"
- **Inspect a component's options:** "what sizes and variants does Button support?"
- **Resolve a value across modes:** "what's this token's hex value in dark mode at high contrast?"
- **Pull up a guideline:** "what are the accessibility rules for Badge?"
- **Get oriented in a new session:** a primer with token counts, mode-sets (color scheme,
  scale, contrast), the component list, and dataset provenance

## Skill vs. MCP server

Same data, same tools, two ways to load them:

| | Agent Skill | MCP Server |
|---|---|---|
| **Context cost** | Description only, until invoked | All tools loaded every session |
| **Best for** | Prototyping, on-demand lookups | Always-available access, agent pipelines |
| **Setup** | Install once per tool below | Add to your MCP config, restart |

Both can run together, though most people only need one.

## Install the MCP server

The MCP server (`@adobe/design-data-mcp`) uses the same config shape in every MCP-capable
tool: just `npx`, no environment variables.

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp@latest"]
    }
  }
}
```

(`@latest` avoids `npx` reusing a cached, older build.) Where that block goes:

| Tool | Config location |
|---|---|
| **Claude Code** | `.mcp.json` |
| **GitHub Copilot CLI** | `~/.copilot/mcp-config.json` (add `"type": "local"`), or run `copilot mcp add design-data -- npx -y @adobe/design-data-mcp@latest` |
| **GitHub Copilot app** (desktop) | Customize → MCP → add custom server. MCP servers configured in a repo or in Copilot CLI sync in automatically. |
| **VS Code** | `.vscode/mcp.json` (note the root key is `servers`, not `mcpServers`) |
| **Cursor** | `.cursor/mcp.json` |

Restart the tool after changing its MCP config.

## Install the skill

The skill is lighter-weight than the MCP server: it loads only when relevant.

**Claude Code:**

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install design-data@spectrum-design-data
```

**GitHub Copilot** (CLI and desktop app): copy the skill folder into `~/.copilot/skills/`
(or a repo's `.github/skills/`; Copilot also reads `.claude/skills/`):

```
tools/design-data-skill/skills/design-data/
```

Skills placed in a repo or added via Copilot CLI sync automatically into the desktop app;
manage them there under Customize → Skills.

**Cursor**: Settings → Rules → **Add Rule** → **Remote Rule (GitHub)**:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-skill/skills/design-data
```

## Other AI resources

- **llms.txt**, at the repo root: [llms.txt](https://github.com/adobe/spectrum-design-data/blob/main/llms.txt) describes the project layout, design tokens, component schemas, and common tasks for LLMs.
- **Generated markdown**: the [docs/markdown/](https://github.com/adobe/spectrum-design-data/tree/main/docs/markdown) directory holds auto-generated markdown for tokens, component schemas, and the design-system registry, used for docs site chatbot indexing. Regenerate with `moon run markdown-generator:generate`.

**See also:** [React Spectrum: Using AI](https://react-spectrum.adobe.com/ai) for React Spectrum's own AI integration (S2 component implementation docs, icons, illustrations).
