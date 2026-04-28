# @adobe/s2-docs-mcp

## 1.0.1

### Patch Changes

- [#751](https://github.com/adobe/spectrum-design-data/pull/751) [`42e6257`](https://github.com/adobe/spectrum-design-data/commit/42e62574ef03bc8f9a66ebde48e8e60625e7bd7c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix MCP spec compliance for strict clients like Kiro and Claude
  - Remove invalid `required: true` from individual property definitions
    in tool `inputSchema` objects (JSON Schema requires `required` as a
    string array on the parent object, not a boolean on properties)
  - Upgrade `@modelcontextprotocol/sdk` from `^0.5.0` to `^1.27.1`
  - Return tool execution errors as results with `isError: true` instead of throwing (per MCP spec)
  - Read server version dynamically from `package.json` instead of hardcoding

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
