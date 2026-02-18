# Spectrum Design Data MCP Server

A Model Context Protocol (MCP) server that provides AI tools with structured access to Adobe Spectrum design system data, including design tokens and component API schemas.

## Overview

This MCP server enables AI assistants to query and interact with Spectrum design data through a standardized protocol. It provides access to:

* **Design Tokens**: Color palettes, typography, layout tokens, and semantic tokens
* **Component Schemas**: API definitions and validation schemas for Spectrum components
* **Future**: Component anatomy, design patterns, and guidelines

## Prerequisites

* **Node.js 20+**

## Installation

```bash
npm install -g @adobe/spectrum-design-data-mcp
```

### Verifying Package Integrity

This package is published with npm provenance for enhanced supply-chain security. You can verify the package's attestations:

```bash
npm audit signatures
```

Or clone and run locally:

```bash
git clone https://github.com/adobe/spectrum-design-data.git
cd spectrum-tokens/tools/spectrum-design-data-mcp
pnpm install
```

## Usage

### Starting the MCP Server

```bash
# Start the server (default command)
spectrum-design-data-mcp

# Or explicitly start
spectrum-design-data-mcp start
```

The server runs locally and communicates via stdio with MCP-compatible AI clients.

### Available Tools

#### Token Tools

* **`query-tokens`**: Search Spectrum tokens by name, type, or category
* **`query-tokens-by-value`**: Find tokens by direct or resolved value (follows aliases)
* **`get-token-details`**: Get detailed information about a specific token
* **`get-component-tokens`**: Get all tokens for a component name

#### Schema Tools

* **`list-components`**: List available components (no schema payload)
* **`get-component-schema`**: Full schema for one component
* **`validate-component-props`**: Validate props against schema
* **`search-components-by-feature`**: Find components by property name

## Configuration

### MCP Setup

Add to your MCP configuration (e.g., `.cursor/mcp.json` for Cursor IDE):

#### Option 1: Using npx (Recommended)

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/spectrum-design-data-mcp"]
    }
  }
}
```

#### Option 2: Using global installation

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "@adobe/spectrum-design-data-mcp"
    }
  }
}
```

#### Option 3: Local development

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "node",
      "args": [
        "./path/to/spectrum-tokens/tools/spectrum-design-data-mcp/src/index.js"
      ]
    }
  }
}
```

> **Note**: Using `npx` (Option 1) is recommended as it avoids PATH issues and ensures you always use the latest version. This approach mirrors other MCP servers like Browser MCP and resolves common NPX availability problems.

### Claude Desktop (Legacy Configuration)

For older Claude Desktop configurations:

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "spectrum-design-data-mcp",
      "args": []
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and follows the MCP specification. Refer to your client's documentation for configuration details.

## Examples

### Component Building Workflow

#### Component-Specific Token Discovery

```
Human: Show me all available button-related design tokens.

AI: I'll gather all button-related tokens from the Spectrum system.

[Uses get-component-tokens with componentName="button"]

Found button-related tokens across categories:
- Color tokens: floating-action-button colors
- Layout tokens: button sizing, padding, spacing
- Examples: radio-button-control-size-small, action-button-edge-to-hold-icon...
```

#### Finding Tokens by Value

```
Human: Which tokens resolve to 1px?

AI: I'll search for tokens whose value is 1px (direct or alias).

[Uses query-tokens-by-value with value="1px"]

Tokens with value 1px:
- border-width-100 (direct)
- picker-border-width (alias to border-width-100)
```

### Token Queries

#### Querying Color Tokens

```
Human: What blue color tokens are available in Spectrum?

AI: I'll search for blue color tokens in the Spectrum design system.

[Uses query-tokens tool with query="blue" and category="color"]

The Spectrum design system includes several blue color tokens:
- spectrum-blue-100: #e6f3ff
- spectrum-blue-200: #b3d9ff
- spectrum-blue-300: #80bfff
...
```

#### Validating Component Props

```
Human: Is this button configuration valid according to Spectrum?

AI: I'll validate those button properties against the Spectrum schema.

[Uses validate-component-props tool with component="action-button"]

The configuration is valid! All required properties are present and the types match the expected schema.
```

## Troubleshooting

### Installation Issues

```bash
# Check Node.js version
node --version  # Should be 20+

# Clear npm cache if needed
npm cache clean --force

# Verify package installation
npm list -g @adobe/spectrum-design-data-mcp
```

### MCP Connection Issues

1. Verify the MCP configuration file path
2. Check that Node.js path is correct
3. Ensure the package is installed globally or use npx
4. Restart your AI client after configuration changes

### Package Verification

```bash
# Verify package integrity
npm audit signatures

# Check for security vulnerabilities
npm audit
```

## Development

### Building from Source

```bash
git clone https://github.com/adobe/spectrum-design-data.git
cd spectrum-tokens
pnpm install
cd tools/spectrum-design-data-mcp
```

### Testing

```bash
pnpm test
```

### Project Structure

```
src/
├── index.js              # Main MCP server
├── cli.js               # CLI interface
├── tools/               # MCP tool implementations
│   ├── tokens.js        # Token-related tools
│   └── schemas.js       # Schema-related tools
└── data/                # Data access layer
    ├── tokens.js        # Token data access
    └── schemas.js       # Schema data access
```

## Security

### Supply Chain Security

* **🔐 NPM Provenance**: Published with npm provenance attestations for verifiable builds
* **🛡️ Security Audits**: Regular dependency security audits
* **📦 Verified Packages**: All dependencies are audited and verified

### Best Practices

* Always verify package integrity using `npm audit signatures`
* Keep the package updated to the latest version
* Use `npx -y` for the most secure and up-to-date execution
* Report security issues through the [GitHub security advisory](https://github.com/adobe/spectrum-design-data/security/advisories)

## License

Apache-2.0 © Adobe

## Contributing

This project is part of the Spectrum Design System. Please see the main [contribution guidelines](../../CONTRIBUTING.md) for details on how to contribute.

## Support

* Create an [issue](https://github.com/adobe/spectrum-design-data/issues) for bug reports or feature requests
* Check the [documentation](https://github.com/adobe/spectrum-design-data/tree/main/tools/spectrum-design-data-mcp) for detailed guides
* Review [existing issues](https://github.com/adobe/spectrum-design-data/issues?q=label%3Amcp) for solutions
