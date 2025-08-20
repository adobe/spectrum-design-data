# @adobe/spectrum-design-data-mcp

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
