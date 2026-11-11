---
"@adobe/design-data-skill": major
---

Rename the plugin to `spectrum-design-data` (install with
`spectrum-design-data@spectrum-design-data`; the old `design-data@…` id no longer exists)
and make it self-contained for distribution, including the
Adobe Design AI Marketplace.

* Bundle `.mcp.json`, which runs `@adobe/design-data-mcp` pinned to an exact
  version, so installing the plugin gives working tools with no manual MCP setup.
  `moon run :version` syncs the pin and the `plugin.json` version.
* Fix `SKILL.md` tool names (plugin tools are
  `mcp__plugin_spectrum-design-data_design-data__*`), add the component-search and
  guideline tools, and drop the CLI and custom-dataset claims it never supported.
* Replace relative links to sibling packages with absolute URLs.
* Align the README, marketplace description, and AI docs page on Node.js
  >=20.12.0, the first-run download, snapshot freshness, and the context cost of
  a bundled MCP server.
* Depend on `@adobe/design-data-mcp` (`workspace:*`) so every MCP release also
  bumps and republishes the skill with the new pin.
* Add packaging tests for the pin, manifest, tool names, and packed contents.
