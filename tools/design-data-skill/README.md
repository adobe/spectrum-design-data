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

### GitHub Copilot app

Click **Customize** in the sidebar, use the marketplace settings control next to the
marketplace dropdown to add the Git repository `adobe/spectrum-design-data`, then find
**spectrum-design-data** on the Browse page and click **Install**. Under **Installed**, check
that its toggle is on. The app's own steps are in
[Customizing the GitHub Copilot app](https://docs.github.com/en/copilot/how-tos/github-copilot-app/customize-github-copilot-app).

**Start a new session after installing.** A session that was already open does not pick up the
plugin's tools. An agent in such a session may look for the answer another way (reading code,
or starting its own copy of the server) and give a result that does not come from the
installed plugin. In a new session, ask it to use only the design-data MCP tools; if it says
it has no such tool, the server did not start (it needs Node.js `>=20.12.0` on the app's PATH).

### GitHub Copilot CLI

```
copilot plugin marketplace add adobe/spectrum-design-data
copilot plugin install spectrum-design-data@spectrum-design-data
```

Copilot should not prompt for this plugin's tools: all of them are read-only and
declare it. If a client or setting still asks for approval, you can pre-approve
the server by name (`design-data`, from the plugin's `.mcp.json`):

```
copilot --allow-tool='design-data'
```

Use `--deny-tool='design-data'` to block it. Skill frontmatter (`allowed-tools`)
does not pre-approve MCP tools in Copilot CLI 1.0.109 (tested non-interactively).

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
      "args": ["-y", "@adobe/design-data-mcp@1.12.0"]
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
* **npm install size:** `@adobe/design-data-skill` depends on `@adobe/design-data-mcp`
  (and its embedded dataset), so `npm i @adobe/design-data-skill` installs both. A
  plugin install from the marketplace does not use npm for the skill.
* **Network:** the first run downloads `@adobe/design-data-mcp` with `npx`
  (pinned to the exact version above). Lookups then use the Spectrum snapshot
  embedded in that package. The primer also makes a best-effort registry check for
  a newer data version and stays silent if offline; set
  `DESIGN_DATA_SKIP_VERSION_CHECK=1` to disable it.
* **Tools:** `design-data-primer`, `design-data-query`, `design-data-suggest`,
  `design-data-component`, `design-data-component-search`, `design-data-resolve`,
  `design-data-guideline-list`, `design-data-guideline`,
  `design-data-visual-recipe`, `design-data-render` (SVG, or PNG using Adobe Clean Spectrum VF
  when it is installed, else an open fallback), `design-data-font-status`. Inputs are documented in
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

To test on Copilot, install the plugin (`copilot plugin marketplace add <path>`, then
`copilot plugin install spectrum-design-data@spectrum-design-data`).
`copilot --plugin-dir <dir>` does not load the bundled MCP server. Keep
`readOnlyHint: true` on every tool in `design-data-mcp`: it is why Copilot runs them
without approval, and removing it makes non-interactive runs fail with "no interactive
user response was available".

## Usage

See [SKILL.md](https://github.com/adobe/spectrum-design-data/blob/main/tools/design-data-skill/skills/design-data/SKILL.md)
for the tool reference and workflow.
