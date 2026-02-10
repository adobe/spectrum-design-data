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

* **`query-tokens`**: Search and retrieve design tokens by name, type, or category
* **`find-tokens-by-use-case`** ⭐: Find appropriate tokens for specific component use cases (e.g., "button background", "text color", "error state")
* **`get-component-tokens`** ⭐: Get all tokens related to a specific component type
* **`get-design-recommendations`** ⭐: Get token recommendations for design decisions and component states
* **`get-token-categories`**: List all available token categories
* **`get-token-details`**: Get detailed information about a specific token

#### Schema Tools

* **`query-component-schemas`**: Search component API schemas
* **`get-component-schema`**: Get the complete schema for a specific component
* **`list-components`**: List all available components with schemas
* **`validate-component-props`**: Validate component properties against schemas
* **`get-type-schemas`**: Get type definitions used in schemas

#### Workflow Tools

* **`build-component-config`**: Generate a complete component configuration with recommended tokens and props
* **`suggest-component-improvements`**: Analyze existing component configuration and suggest improvements

## Agent Skills

Agent Skills are markdown guides that help AI agents use the Spectrum Design Data MCP tools effectively. They orchestrate multiple MCP tools into complete workflows for common design system tasks.

### Available Agent Skills

* **[Component Builder](build-spectrum-components/component-builder.md)**: Guides agents through building Spectrum components correctly by discovering schemas, finding tokens, and validating configurations
* **[Token Finder](build-spectrum-components/token-finder.md)**: Helps agents discover the right design tokens for colors, spacing, typography, and component styling

### How Agent Skills Work

Agent Skills are documentation files that:

* Guide AI agents through multi-step workflows
* Orchestrate existing MCP tools into complete tasks
* Provide examples and best practices
* Help agents discover the right tools for specific use cases

Unlike MCP tools (which are executable functions), Agent Skills are **guidance documents** that tell agents how to combine tools to accomplish complex tasks.

### Using Agent Skills

For AI agents working with Spectrum components:

1. Read the relevant Agent Skill when a user asks about a covered task
2. Follow the step-by-step workflow provided
3. Call the MCP tools as directed by the skill
4. Combine tool outputs into a complete solution

See the [Agent Skills README](build-spectrum-components/README.md) for more details.

### Related Resources

This implementation follows the pattern established by [React Spectrum's AI integration](https://react-spectrum.adobe.com/ai), which also uses MCP and Agent Skills to help AI agents work with design systems.

## Configuration

### MCP Setup

Add to your MCP configuration (e.g., `.cursor/mcp.json` for Cursor IDE):

#### Option 1: Using npx (Recommended)

```json
{
  "mcpServers": {
    "spectrum-design-data": {
      "command": "npx",
      "args": ["@adobe/spectrum-design-data-mcp"]
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

### Component Building Workflow ⭐

#### Finding Tokens for Component Use Cases

```
Human: I'm building a primary action button. What design tokens should I use for the background color?

AI: I'll help you find the appropriate tokens for a primary button background.

[Uses find-tokens-by-use-case with useCase="button background" and componentType="button"]

For a primary action button background, I recommend these Spectrum tokens:
- accent-color-100: Primary accent color for default state
- accent-color-200: For hover states
- accent-color-300: For pressed/active states
- floating-action-button-drop-shadow-color: For drop shadows
```

#### Design Intent Recommendations

```
Human: What tokens should I use for error messaging in my form validation?

AI: I'll find tokens for error state messaging.

[Uses get-design-recommendations with intent="negative" and context="text"]

For error messaging, use these Spectrum tokens:
- negative-color-100: Primary error text color
- negative-background-color-default: Error background areas
- negative-border-color: Error state borders
```

#### Component-Specific Token Discovery

```
Human: Show me all available button-related design tokens.

AI: I'll gather all button-related tokens from the Spectrum system.

[Uses get-component-tokens with componentName="button"]

Found 57 button-related tokens across categories:
- Color tokens (2): floating-action-button colors
- Layout tokens (55): button sizing, padding, spacing
- Examples: radio-button-control-size-small, action-button-edge-to-hold-icon...
```

### Traditional Token Queries

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
│   ├── schemas.js       # Schema-related tools
│   └── workflows.js     # Workflow-oriented tools
├── data/                # Data access layer
│   ├── tokens.js        # Token data access
│   └── schemas.js       # Schema data access
└── build-spectrum-components/  # Agent Skills documentation
    ├── component-builder.md
    ├── token-finder.md
    └── README.md
```

## Security

### Supply Chain Security

* **🔐 NPM Provenance**: Published with npm provenance attestations for verifiable builds
* **🛡️ Security Audits**: Regular dependency security audits
* **📦 Verified Packages**: All dependencies are audited and verified

### Best Practices

* Always verify package integrity using `npm audit signatures`
* Keep the package updated to the latest version
* Use npx for the most secure and up-to-date execution
* Report security issues through the [GitHub security advisory](https://github.com/adobe/spectrum-design-data/security/advisories)

## License

Apache-2.0 © Adobe

## Contributing

This project is part of the Spectrum Design System. Please see the main [contribution guidelines](../../CONTRIBUTING.md) for details on how to contribute.

## Support

* Create an [issue](https://github.com/adobe/spectrum-design-data/issues) for bug reports or feature requests
* Check the [documentation](https://github.com/adobe/spectrum-design-data/tree/main/tools/spectrum-design-data-mcp) for detailed guides
* Review [existing issues](https://github.com/adobe/spectrum-design-data/issues?q=label%3Amcp) for solutions
