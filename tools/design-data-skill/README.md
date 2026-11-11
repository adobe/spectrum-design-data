# spectrum-design-data Plugin

A read-only Spectrum lookup plugin for AI assistants. It bundles the `design-data`
skill and the [`@adobe/design-data-mcp`](https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-mcp)
server, so installing it gives the assistant working tools with no extra setup.

It finds official tokens, inspects component options, resolves token values across
modes, and reads Spectrum design guidelines. It complements React Spectrum and
Spectrum Web Components implementation guidance; it does not generate components
or integrate with a framework.

Also published on npm as `@adobe/design-data-skill` for versioned installs.

## Structure

```
tools/design-data-skill/
  .claude-plugin/plugin.json    Plugin manifest
  .mcp.json                     MCP server, pinned to an exact @adobe/design-data-mcp version
  skills/design-data/SKILL.md   Skill instructions
  package.json                  npm package (@adobe/design-data-skill)
  README.md                     This file
```

## Installation

### Claude Code

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install spectrum-design-data@spectrum-design-data
```

### GitHub Copilot CLI

```
copilot plugin marketplace add adobe/spectrum-design-data
copilot plugin install spectrum-design-data@spectrum-design-data
```

### Cursor (skill only)

Cursor Settings → Rules → **Add Rule** → **Remote Rule (GitHub)** → paste:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-skill/skills/design-data
```

This installs only the skill. Add the MCP server to `.cursor/mcp.json` yourself:

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp@1.9.9"]
    }
  }
}
```

## What the plugin includes

* **Skill + MCP server.** The plugin registers the MCP server itself (`.mcp.json`);
  no manual MCP configuration is needed. Because it is an MCP server, the client
  may load all eight tool definitions each session. This differs from a
  skill-only install, which costs only the skill description until used.
* **Runtime:** Node.js `>=20.12.0`.
* **Network:** the first run downloads `@adobe/design-data-mcp` with `npx`
  (pinned to the exact version above). Lookups then use the Spectrum snapshot
  embedded in that package. The primer also makes a best-effort registry check for
  a newer data version and stays silent if offline; set
  `DESIGN_DATA_SKIP_VERSION_CHECK=1` to disable it.
* **Tools:** `design-data-primer`, `design-data-query`, `design-data-suggest`,
  `design-data-component`, `design-data-component-search`, `design-data-resolve`,
  `design-data-guideline-list`, `design-data-guideline`. Inputs are documented in
  [SKILL.md](https://github.com/adobe/spectrum-design-data/blob/main/tools/design-data-skill/skills/design-data/SKILL.md).

## Data and freshness

The data is the public `@adobe/spectrum-design-data` snapshot baked into the pinned
MCP release (`provenance.designDataVersion` in the primer shows which). It is
updated by releasing a new MCP version and bumping the pin, not automatically.
Guidelines are imported from public Spectrum site content and may lag it. The
plugin is read-only.

## Not included

Custom datasets, validation, diffing, and authoring: use
[`design-data-agent`](https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-agent-mcp)
(`design-data-agent@spectrum-design-data`).

## Maintenance

`moon run :version` (after `changeset version`) syncs the pinned MCP version and the
plugin version. Tests check the pin, manifest, tool names, and packed contents. The pin comes from the
workspace version, so between merging the Version Packages PR and the npm publish the
pinned release may not exist yet; installs from `main` fail in that window.

## Usage

See [SKILL.md](https://github.com/adobe/spectrum-design-data/blob/main/tools/design-data-skill/skills/design-data/SKILL.md)
for the tool reference and workflow.
