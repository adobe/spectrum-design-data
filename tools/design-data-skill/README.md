# design-data Claude Code Skill

A Claude Code plugin that gives agents access to Spectrum design tokens,
component schemas, and design-system data via the `@adobe/design-data` CLI.

## Structure

```
tools/design-data-skill/
  .claude-plugin/plugin.json    Plugin manifest (name, description, version)
  skills/design-data/SKILL.md   Skill definition (frontmatter + workflow docs)
  README.md                     This file
```

**No `package.json`** — this is a pure-skills plugin with no build step or
Node.js dependencies. It wraps an external CLI (`@adobe/design-data`) that
users install separately via npm. This is intentional and consistent with
the plugin format: the `.claude-plugin/plugin.json` manifest is the only
metadata file needed. Compare with `tools/s2-docs-mcp/` which bundles its
own Node.js server and therefore needs a full package.

## Installation

In Claude Code, install from the marketplace:

```
claude plugin install spectrum-design-data
```

Or point directly at this repository.

## Usage

See [`skills/design-data/SKILL.md`](skills/design-data/SKILL.md) for the
full command reference and workflow.

For Cursor users (native agent, not Claude Code), use the
[`@adobe/design-data-mcp`](../design-data-mcp/) MCP server instead.
