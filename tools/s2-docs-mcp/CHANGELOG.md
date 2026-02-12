# @adobe/s2-docs-mcp

## 1.0.0

### Major Changes

- [#697](https://github.com/adobe/spectrum-design-data/pull/697) [`d1a8659`](https://github.com/adobe/spectrum-design-data/commit/d1a865919459a294995cf1f64e07bc960ddbd493) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of S2 Docs MCP server and Spectrum 2 documentation.

  This adds comprehensive Spectrum 2 documentation to the monorepo:
  - **102 markdown pages** with YAML frontmatter scraped from s2.spectrum.corp.adobe.com
  - **MCP server** (`@adobe/s2-docs-mcp`) providing AI assistants with structured access to
    S2 component docs via tools: list-s2-components, get-s2-component, search-s2-docs,
    find-s2-component-by-use-case, get-s2-stats
  - **Transform scripts** (`tools/s2-docs-transformer`) for maintaining frontmatter and scraping
    workflow
