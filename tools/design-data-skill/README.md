# design-data Claude Code Skill

A Claude Code plugin that gives agents access to Spectrum design tokens,
component schemas, and design-system data via the `@adobe/design-data` CLI.

Also published on npm as `@adobe/design-data-skill` for versioned skill installs.

## Structure

```
tools/design-data-skill/
  .claude-plugin/plugin.json    Plugin manifest (name, description, version)
  package.json                  npm package (@adobe/design-data-skill)
  skills/design-data/SKILL.md   Skill definition (frontmatter + workflow docs)
  README.md                     This file
```

This is a pure-skills plugin with no build step or Node.js runtime dependencies.
It wraps the external `@adobe/design-data` CLI that `npx` installs on first use.

## Installation

### Claude Code

Add the marketplace, then install the Spectrum skill:

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install design-data@spectrum-design-data
```

For custom or repo-local datasets (validate, diff, write), install
`design-data-agent@spectrum-design-data` instead — see
[`tools/design-data-agent-mcp/`](../design-data-agent-mcp/).

### Cursor

Cursor Settings → Rules → **Add Rule** → **Remote Rule (GitHub)** → paste:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-skill/skills/design-data
```

For always-available MCP tool access, see [`@adobe/design-data-mcp`](../design-data-mcp/).

## Usage

See [`skills/design-data/SKILL.md`](skills/design-data/SKILL.md) for the
full command reference and workflow.
