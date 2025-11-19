# [**@adobe/spectrum-design-data-mcp**](https://github.com/adobe/spectrum-design-data-mcp)

## 1.0.11

### Patch Changes

* Updated dependencies \[[`ee2ceb5`](https://github.com/adobe/spectrum-design-data/commit/ee2ceb541dea5eb9b5267c861e44bfd804fd33a7)]:
  * [**@adobe/spectrum-component-api-schemas**](https://github.com/adobe/spectrum-component-api-schemas)@5.0.1

## 1.0.10

### Patch Changes

* Updated dependencies \[[`f64bee3`](https://github.com/adobe/spectrum-design-data/commit/f64bee3900c874775f2d3424516786a0d644d057)]:
  * [**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-design-data)@13.16.0

## 1.0.10

### Patch Changes

* Updated dependencies \[[`f64bee3`](https://github.com/adobe/spectrum-design-data/commit/f64bee3900c874775f2d3424516786a0d644d057)]:
  * [**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-design-data)@13.16.0

## 1.0.9

### Patch Changes

* Updated dependencies \[[`a772572`](https://github.com/adobe/spectrum-design-data/commit/a772572de88c54d279c20d7148f6ac91eb941d2a)]:
  * [**@adobe/spectrum-component-api-schemas**](https://github.com/adobe/spectrum-component-api-schemas)@5.0.0

## 1.0.8

### Patch Changes

* Updated dependencies \[[`433efdd`](https://github.com/adobe/spectrum-design-data/commit/433efdd18f9b0842ae55acac3cd0fbc1e5e5db58)]:
  * [**@adobe/spectrum-component-api-schemas**](https://github.com/adobe/spectrum-component-api-schemas)[**@4**](https://github.com/4).0.0

## 1.0.7

### Patch Changes

* Updated dependencies \[[`13d9202`](https://github.com/adobe/spectrum-design-data/commit/13d920273c02c78d3748522de6a7c7ee39b39814)]:
  * [**@adobe/spectrum-component-api-schemas**](https://github.com/adobe/spectrum-component-api-schemas)[**@3**](https://github.com/3).0.0

## 1.0.6

### Patch Changes

* [#595](https://github.com/adobe/spectrum-design-data/pull/595) [`53bc11e`](https://github.com/adobe/spectrum-design-data/commit/53bc11e1bfcc3a839cfc5dfbd63f59cc5e87a1c3) Thanks [@GarthDB](https://github.com/GarthDB)! - Enhanced documentation with security and configuration improvements

  * Add multiple MCP configuration options including recommended npx usage
  * Add npm provenance support for enhanced supply-chain security
  * Improve installation section with package integrity verification
  * Add comprehensive troubleshooting section for common issues
  * Add dedicated security section with best practices
  * Add support section with links to issues and documentation

  These changes align the documentation with modern MCP server standards
  and improve user experience with better configuration options and security features.

## 1.0.5

### Patch Changes

* Updated dependencies \[[`1e860c4`](https://github.com/adobe/spectrum-design-data/commit/1e860c4436c58ceca6f4500ea7e24d6d8cdd20c8)]:
  * [**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-design-data)@13.15.1

## 1.0.4

### Patch Changes

* Updated dependencies \[[`3df7197`](https://github.com/adobe/spectrum-design-data/commit/3df7197e7da23c9bb107f7dfcd935b5c62a86041)]:
  * [**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-design-data)@13.15.0

## 1.0.3

### Patch Changes

* Updated dependencies \[[`b4df84e`](https://github.com/adobe/spectrum-design-data/commit/b4df84e2f2ca246332907f9ddda94438288dd98e)]:
  * [**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-design-data)@13.14.1

## 1.0.2

### Patch Changes

* Updated dependencies \[[`336f672`](https://github.com/adobe/spectrum-design-data/commit/336f67216dfd875f0feb65c10059d9f3fe6dcaf7)]:
  * [**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-design-data)@13.14.0

## 1.0.1

### Patch Changes

* Updated dependencies \[[`163fe7c`](https://github.com/adobe/spectrum-design-data/commit/163fe7c13bb00c639d202195a398126b6c25b58f)]:
  * [**@adobe/spectrum-component-api-schemas**](https://github.com/adobe/spectrum-component-api-schemas)[**@2**](https://github.com/2).0.0

## 1.0.0

### Major Changes

* [#568](https://github.com/adobe/spectrum-design-data/pull/568) [`34028ea`](https://github.com/adobe/spectrum-design-data/commit/34028eaf2ba3940baa8044fda2655adc6153fb97) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of Spectrum Design Data MCP server

  This is the first release of the Model Context Protocol server that provides AI tools with structured access to Adobe Spectrum design system data, including design tokens and component API schemas.

  Features:

  * Query design tokens by name, type, or category
  * Find tokens for specific component use cases
  * Get component-specific token recommendations
  * Access component API schemas and validation
  * Type definitions and schema validation tools

  This enables AI assistants to provide intelligent design guidance and automate design token usage across the Spectrum ecosystem.

## 0.2.0

### Minor Changes

* Initial release of Spectrum Design Data MCP server

  This new package provides a Model Context Protocol (MCP) server that enables AI tools to query and interact with Spectrum design system data. Features include:

  * **Design Token Tools**: Query tokens by name, type, or category; get token details and categories
  * **Component Schema Tools**: Search component schemas, validate properties, and explore type definitions
  * **Local Execution**: Runs as a local npm package with no external dependencies or hosting requirements
  * **Extensible Architecture**: Designed to support future design data like component anatomy and patterns

  The MCP server provides structured access to:

  * All Spectrum design tokens from `@adobe/spectrum-tokens`
  * Component API schemas from `@adobe/spectrum-component-api-schemas`

  AI assistants can now understand and work with Spectrum design data through standardized MCP tools.

## 0.1.0

### Minor Changes

* Initial release of Spectrum Design Data MCP server
* Added support for design token querying and retrieval
* Added support for component schema validation and exploration
* Implemented token tools: query-tokens, get-token-categories, get-token-details
* Implemented schema tools: query-component-schemas, get-component-schema, list-components, validate-component-props, get-type-schemas
* Added CLI interface for starting the MCP server
* Added comprehensive test coverage
