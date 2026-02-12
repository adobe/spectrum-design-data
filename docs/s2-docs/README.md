# Spectrum 2 Documentation

Scraped documentation from Adobe's Spectrum 2 design system.

## Overview

This project contains 102 pages of S2 documentation with YAML frontmatter, including component guides, design principles, and development resources.

## Structure

* `components/` - 69 component docs (actions, containers, feedback, inputs, navigation, status)
* `designing/` - 25 design guidelines (color, typography, app frame, etc.)
* `fundamentals/` - 3 core pages (home, introduction, principles)
* `developing/` - 1 developer overview
* `support/` - 4 support pages (FAQs, contact, resources, quarterly recap)

## MCP Server Integration

AI tools can query this documentation via the S2 Docs MCP server.

### Setup

```bash
# Install MCP server
cd ~/Spectrum/spectrum-design-data/tools/s2-docs-mcp
pnpm install

# Configure in .cursor/mcp.json
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

### Available Tools

* `list-s2-components` - Browse components by category
* `get-s2-component` - Get full component documentation
* `search-s2-docs` - Search across all docs
* `find-s2-component-by-use-case` - Find components by use case
* `get-s2-stats` - Documentation coverage statistics

See [tools/s2-docs-mcp](../../tools/s2-docs-mcp/README.md) for details.

## Maintenance

**Updating documentation:**

```bash
# Re-run transform scripts to update frontmatter
cd ../../tools/s2-docs-transformer
pnpm run process-all

# Regenerate component index
cd ../s2-docs-mcp
node src/batch-scraper.js index
```

**Scraping new content:** See the [s2-docs-transformer README](../../tools/s2-docs-transformer/README.md) for scraping and transformation tools.

## License

Apache-2.0 © Adobe
