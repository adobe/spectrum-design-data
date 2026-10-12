# S2 Docs MCP Server

A Model Context Protocol server that provides AI tools with access to Spectrum 2 documentation. Part of the [Spectrum Design Data](https://github.com/adobe/spectrum-design-data) monorepo.

## Features

* **Search components** by name, category, or content
* **Get component docs** with full formatting
* **Statistics** on documentation coverage
* **Find by use case** (e.g., "form input", "navigation")
* **List all components** by category

## Installation

```bash
cd ~/Spectrum/spectrum-design-data/tools/s2-docs-mcp
pnpm install
```

## Usage

### Start the MCP Server

```bash
pnpm start
```

Or add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "s2-docs": {
      "command": "node",
      "args": [
        "/Users/YOUR_USERNAME/Spectrum/spectrum-design-data/tools/s2-docs-mcp/src/cli.js"
      ]
    }
  }
}
```

## Available MCP Tools

### `list-s2-components`

List all available Spectrum 2 components, optionally filtered by category.

**Parameters:**

* `category` (optional): Filter by category (categories come from component `meta.category`)

### `get-s2-component`

Get full documentation for a specific component.

**Parameters:**

* `name` (required): Component name or slug
* `category` (optional): Component category for faster lookup

### `search-s2-docs`

Search documentation by component name or within content.

**Parameters:**

* `query` (required): Search query
* `searchContent` (optional, default: false): Search within component content

### `get-s2-stats`

Get statistics about documentation coverage.

### `find-s2-component-by-use-case`

Find components by use case or design pattern.

**Parameters:**

* `useCase` (required): Use case description (e.g., "form input", "navigation")

## Data Source

Documentation is built from the design-data component JSON (`packages/design-data/components/*.json`, rendered from each component's `documentBlocks`). `pnpm run bundle` copies it into `data/components` for publishing. The JSON is regenerated from Spectrum Hub by the `hub-component-sync` workflow; see [docs/s2-docs/README.md](../../docs/s2-docs/README.md).

## Using with Cursor

* **MCP (this server)** – Add the s2-docs MCP server to `.cursor/mcp.json` (see [Usage](#usage) above). The AI can then use the tools to list, search, and fetch component docs on demand.
* **[**@Files**](https://github.com/Files) & Folders** – In chat, reference the `docs/s2-docs` folder (or a subfolder like `docs/s2-docs/web/rsp/components`) so the AI gets the markdown files as context.
* **[**@Docs**](https://github.com/Docs)** – If the S2 documentation is published at a URL, add it in Cursor via **[**@Docs**](https://github.com/Docs) → Add new doc** so Cursor indexes it. See [Cursor’s @Docs documentation](https://cursor.com/docs/context/mentions#docs).

## Integration with spectrum-design-data-mcp

This server complements the existing **spectrum-design-data-mcp** tool in this monorepo:

* **spectrum-design-data-mcp**: Design tokens and component schemas
* **s2-docs-mcp**: S2 component documentation and design guidelines

Both can run simultaneously in Cursor.

## License

Apache-2.0 © Adobe
