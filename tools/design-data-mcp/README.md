# [**@adobe/design-data-mcp**](https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-mcp)

MCP server for [Adobe Spectrum](https://spectrum.adobe.com) design tokens, component schemas,
and design guidelines. Runs fully in-process via an embedded Spectrum snapshot — no network
access, no CLI binary, and no configuration required.

## Install in Claude Desktop (Extension)

1. Download
   [design-data.mcpb](https://github.com/adobe/spectrum-design-data/releases/download/design-data-mcpb/design-data.mcpb)
   (always the newest build; each `@adobe/design-data-mcp@<version>` release on the
   [releases page](https://github.com/adobe/spectrum-design-data/releases) carries the same
   file for that version).
2. Drag it into **Claude Desktop → Settings → Extensions**, or double-click it.
3. Check it works: start a new chat and ask *"Use the design-data primer."*

No API keys or configuration needed. The extension installs and runs offline.

The install screen has an optional **Adobe Clean Spectrum VF font file** field. Leave it empty
unless the font is somewhere the extension does not look (see
[Fonts for PNG renders](#fonts-for-png-renders)).

## Setup via npx (Cursor / Claude Desktop manual config)

### Cursor

Add to `.cursor/mcp-servers.json` in your project root:

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

### Claude Desktop (manual config)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Staying current

The embedded Spectrum snapshot is baked into the wasm at build time and travels with the
package version — there's no separate data update to run. Pin `@latest` (as above) so `npx`
fetches the newest published version rather than reusing whatever it last cached; `-y` alone
only skips the install confirmation, it doesn't force a re-fetch. Call `design-data-primer` and
check `provenance.designDataVersion` to see which dataset version is embedded.
`design-data-primer` also does a best-effort check against the latest published
`@adobe/spectrum-design-data` version — if the embedded dataset is behind, it adds a
`provenance.datasetStatus` field and logs a one-line warning to stderr. This is silent on
any network failure (offline/air-gapped use is unaffected); set
`DESIGN_DATA_SKIP_VERSION_CHECK=1` to disable the check entirely.

## Tools

| Tool                           | Description                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `design-data-primer`           | Session-start overview: token count, mode-sets, components, guidelines, provenance  |
| `design-data-query`            | Filter tokens by query expression (`component=button`, `property=color-*`)          |
| `design-data-suggest`          | Natural-language token suggestions with Jaccard similarity confidence scores        |
| `design-data-component`        | Full component schema (variants, sizes, states, props) by kebab-case ID             |
| `design-data-component-search` | Search components by name, description, or docs text; returns id, category, snippet |
| `design-data-resolve`          | Resolve a token's concrete value for a mode context (colorScheme, scale, contrast)  |
| `design-data-guideline-list`   | List available Spectrum design guideline pages, optionally filtered by category     |
| `design-data-guideline`        | Full guideline document by slug ID (purpose, rules, accessibility, examples)        |
| `design-data-visual-recipe`    | Visual recipe (parts, layout, token bindings) for components that have one          |
| `design-data-render`           | Render a component with a recipe to SVG (default) or PNG for a size, states, mode   |
| `design-data-font-status`      | Which font draws PNG text: Adobe Clean Spectrum VF if installed, else a fallback    |

## Fonts for PNG renders

`design-data-render` draws SVG by default. With `format: "png"` it returns an image, and
the text in it is drawn in **Adobe Clean Spectrum VF** when that font is installed on the
machine running the server. Nothing needs configuring: the server looks in your font
folders and in Creative Cloud's font cache (any hidden subfolder under
`CoreSync/plugins/livetype`) and picks the file by its name and contents, not its file name.
The result says which font it used (`font.using`) and whether it fell back
(`font.fallback`); call `design-data-font-status` to check without rendering.

If the font is not installed, text is drawn in a bundled open font (Source Sans 3, SIL
Open Font License) and the result says so, with the install steps. The fallback is close
but not identical: widths differ slightly and the image should not be called exact.

**Getting the font.** Adobe employees can download Adobe Clean Spectrum VF from the
[Brand Center](https://inside.corp.adobe.com/content/inside/en/brand-center/font.html)
(employees only). Install `AdobeCleanSpectrumVF-Roman.ttf`: double-click it and choose
Install Font. Use the `.ttf` file; the `.otf` (PostScript outline) version and the Italic file are
not used. Creative Cloud's "Adobe Clean" is a different font from Adobe Clean Spectrum VF
and is not used either. The font is read from your machine and never bundled or sent
anywhere.

**Pointing at a font that is somewhere else.** Any of these works, in this order:

1. The `fontPath` argument of `design-data-render` or `design-data-font-status`.

2. The `DESIGN_DATA_FONT` environment variable, set to the file's full path. In an MCP
   configuration that is the server's `env`:

   ```json
   {
     "mcpServers": {
       "design-data": {
         "command": "npx",
         "args": ["-y", "@adobe/design-data-mcp"],
         "env": {
           "DESIGN_DATA_FONT": "/Users/me/fonts/AdobeCleanSpectrumVF-Roman.ttf"
         }
       }
     }
   }
   ```

3. In the Claude Desktop extension, the optional "Adobe Clean Spectrum VF font file"
   setting shown at install time.

4. The automatic search described above.

The font search runs once per server process; restart the server after installing the
font.

## Testing guideline content

Run `moon run design-data-mcp:test`. For the content contracts only, after
`moon run sdk-wasm:build`, run:

```sh
pnpm --filter @adobe/design-data-mcp exec ava test/bundle-smoke.test.js test/ensure-bundle.test.js
```

The smoke suite generates a fresh, private MCPB staging tree for each run and
calls the guideline tools over stdio with a minimal environment. Import guards
reject ESM imports and CommonJS requires outside that tree. Catalog assertions
compare against the current canonical manifest, not a fixed guideline count; every guideline response
must equal its checked-in JSON. Helper tests seed stale data and verify that
regeneration replaces it and removes orphan files.
The tests remove all private staging trees afterward.

These tests check transport, packaging, and content delivery. They do not assess
how a model interprets the guidance.

## License

Apache-2.0 — see the [project repository](https://github.com/adobe/spectrum-design-data) for details.
