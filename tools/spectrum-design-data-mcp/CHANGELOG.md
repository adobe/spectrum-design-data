# @adobe/spectrum-design-data-mcp

## 1.0.4

### Patch Changes

- Updated dependencies [[`3df7197`](https://github.com/adobe/spectrum-tokens/commit/3df7197e7da23c9bb107f7dfcd935b5c62a86041)]:
  - @adobe/spectrum-tokens@13.14.2

## 1.0.3

### Patch Changes

- Updated dependencies [[`b4df84e`](https://github.com/adobe/spectrum-tokens/commit/b4df84e2f2ca246332907f9ddda94438288dd98e)]:
  - @adobe/spectrum-tokens@13.14.1

## 1.0.2

### Patch Changes

- Updated dependencies [[`336f672`](https://github.com/adobe/spectrum-tokens/commit/336f67216dfd875f0feb65c10059d9f3fe6dcaf7)]:
  - @adobe/spectrum-tokens@13.14.0

## 1.0.1

### Patch Changes

- Updated dependencies [[`163fe7c`](https://github.com/adobe/spectrum-tokens/commit/163fe7c13bb00c639d202195a398126b6c25b58f)]:
  - @adobe/spectrum-component-api-schemas@2.0.0

## 1.0.0

### Major Changes

- [#568](https://github.com/adobe/spectrum-tokens/pull/568) [`34028ea`](https://github.com/adobe/spectrum-tokens/commit/34028eaf2ba3940baa8044fda2655adc6153fb97) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of Spectrum Design Data MCP server

  This is the first release of the Model Context Protocol server that provides AI tools with structured access to Adobe Spectrum design system data, including design tokens and component API schemas.

  Features:
  - Query design tokens by name, type, or category
  - Find tokens for specific component use cases
  - Get component-specific token recommendations
  - Access component API schemas and validation
  - Type definitions and schema validation tools

  This enables AI assistants to provide intelligent design guidance and automate design token usage across the Spectrum ecosystem.

## 0.2.0

### Minor Changes

- Initial release of Spectrum Design Data MCP server

  This new package provides a Model Context Protocol (MCP) server that enables AI tools to query and interact with Spectrum design system data. Features include:
  - **Design Token Tools**: Query tokens by name, type, or category; get token details and categories
  - **Component Schema Tools**: Search component schemas, validate properties, and explore type definitions
  - **Local Execution**: Runs as a local npm package with no external dependencies or hosting requirements
  - **Extensible Architecture**: Designed to support future design data like component anatomy and patterns

  The MCP server provides structured access to:
  - All Spectrum design tokens from `@adobe/spectrum-tokens`
  - Component API schemas from `@adobe/spectrum-component-api-schemas`

  AI assistants can now understand and work with Spectrum design data through standardized MCP tools.

## 0.1.0

### Minor Changes

- Initial release of Spectrum Design Data MCP server
- Added support for design token querying and retrieval
- Added support for component schema validation and exploration
- Implemented token tools: query-tokens, get-token-categories, get-token-details
- Implemented schema tools: query-component-schemas, get-component-schema, list-components, validate-component-props, get-type-schemas
- Added CLI interface for starting the MCP server
- Added comprehensive test coverage
