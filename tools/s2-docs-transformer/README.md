# S2 Docs Transformer

Tools for scraping and transforming Spectrum 2 documentation. Part of the [Spectrum Design Data](https://github.com/adobe/spectrum-design-data) monorepo.

## Overview

This package provides utilities for:

* **Scraping** S2 documentation from s2.spectrum.corp.adobe.com
* **Transforming** markdown files to add YAML frontmatter
* **Adding metadata** like related components and tags
* **Maintaining** consistency across all S2 docs

## Installation

```bash
cd ~/Spectrum/spectrum-design-data/tools/s2-docs-transformer
pnpm install
```

## Tools

### 1. Scraper (Browser-based)

Scrape S2 documentation using your authenticated browser session.

**List all components:**

```bash
pnpm run list
```

**Scrape a single component:**

```bash
pnpm run scrape button actions
pnpm run scrape text-field inputs
```

**Scrape all components:**

```bash
pnpm run scrape-all
```

**How it works:**

* Uses cursor-browser-extension MCP to access your Chrome session
* Navigates to S2 docs (requires VPN/certificate)
* Extracts content and converts to markdown
* Saves to `docs/s2-docs/components/`

See [SCRAPING.md](SCRAPING.md) for detailed scraping workflow.

### 2. Transform to Frontmatter

Convert markdown files to use YAML frontmatter with proper source URLs.

```bash
pnpm run transform
```

**What it does:**

* Converts blockquote metadata ("> Last updated") to YAML frontmatter
* Sets correct `source_url` from file path
* Adds `title`, `category`, `component_type`, `tags`, `status`
* Removes "On this page" TOC sections
* Removes HTML comments and duplicate content blocks
* Idempotent (safe to run multiple times)

### 3. Add Related Metadata

Parse "Related Components" sections and add to frontmatter.

```bash
pnpm run add-metadata
```

**What it does:**

* Extracts component links from "## Related Components" section
* Adds `related_components` array to frontmatter
* Adds `parent_category` for component docs
* Only updates files that have related links

### 4. Fix YAML Frontmatter

Fix common YAML frontmatter issues in S2 documentation files:

```bash
pnpm run fix-yaml
```

**What it fixes:**

* Replaces asterisk (\*) list items with dash (-) syntax
* Removes escaped underscores (\_) from field names
* Removes angle brackets from URLs
* Cleans up excessive blank lines
* Ensures valid YAML syntax

This script automatically fixes YAML parsing errors that can cause GitHub rendering issues.

### 5. Test YAML Frontmatter

Validate YAML frontmatter across all S2 docs:

```bash
pnpm run test
```

**What it validates:**

* YAML syntax correctness (no asterisk lists, escaped underscores, etc.)
* Required fields are present (title, source\_url, category, status)
* Consistent formatting across all files

### 6. Process All

Run complete transformation pipeline:

```bash
pnpm run process-all
```

Runs: transform → add-metadata

## File Structure

```
tools/s2-docs-transformer/
├── scripts/
│   ├── transform-to-frontmatter.js    # Convert to YAML frontmatter
│   ├── add-related-metadata.js        # Add relationship metadata
│   └── fix-yaml-frontmatter.js        # Fix YAML syntax issues
├── src/
│   ├── cli.js                         # Scraper CLI
│   ├── scraper.js                     # Main scraping logic
│   ├── parser.js                      # S2 page parsing
│   └── browser-client.js              # Browser MCP client
├── test/
│   └── yaml-frontmatter.test.js       # YAML validation tests
├── ava.config.js                      # Test configuration
├── SCRAPING.md                        # Scraping documentation
├── package.json
└── README.md
```

## Workflow

### Scraping New Components

1. **Connect to VPN** (if needed for s2.spectrum.corp.adobe.com)
2. **Open Chrome** with cursor-browser-extension
3. **Scrape component:**
   ```bash
   pnpm run scrape button actions
   ```
4. **Transform frontmatter:**
   ```bash
   pnpm run process-all
   ```
5. **Regenerate index:**
   ```bash
   cd ../s2-docs-mcp
   node src/batch-scraper.js index
   ```

### Updating Existing Docs

If you manually edit markdown files and need to fix frontmatter:

```bash
# Fix YAML syntax issues
pnpm run fix-yaml

# Re-process all docs
pnpm run process-all

# Validate YAML frontmatter
pnpm run test

# Regenerate component index
cd ../s2-docs-mcp
pnpm run scrape index
```

### Complete Re-scrape

To refresh all documentation from the live site:

1. **Backup current docs:**
   ```bash
   cp -r ../../docs/s2-docs ../../docs/s2-docs.backup
   ```

2. **Scrape all components:**
   ```bash
   pnpm run scrape-all
   ```

3. **Process frontmatter:**
   ```bash
   pnpm run process-all
   ```

4. **Regenerate index:**
   ```bash
   cd ../s2-docs-mcp
   pnpm run scrape index
   ```

## Scripts Reference

### transform-to-frontmatter.js

Transforms markdown files in `docs/s2-docs/`:

* **Input:** Files with blockquote metadata or old frontmatter
* **Output:** Files with standardized YAML frontmatter
* **Idempotent:** Safe to run multiple times

### add-related-metadata.js

Enhances frontmatter with relationships:

* **Input:** Files with "## Related Components" section
* **Output:** Frontmatter with `related_components` and `parent_category`
* **Idempotent:** Safe to run multiple times

### fix-yaml-frontmatter.js

Fixes YAML syntax issues in frontmatter:

* **Input:** Files with malformed YAML frontmatter
* **Output:** Files with valid YAML syntax
* **Fixes:** Asterisk lists, escaped underscores, angle bracket URLs, excessive blank lines
* **Idempotent:** Safe to run multiple times

## Integration

Works with:

* **docs/s2-docs/**: Documentation content
* **tools/s2-docs-mcp/**: MCP server that reads the docs

After transforming, the MCP server can query the enhanced metadata.

## License

Apache-2.0 © Adobe
