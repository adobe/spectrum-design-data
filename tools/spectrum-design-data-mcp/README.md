# Spectrum Design Data MCP Server

A Model Context Protocol (MCP) server that provides AI tools with structured access to Adobe Spectrum design system data, including design tokens and component API schemas.

## Overview

This MCP server enables AI assistants to query and interact with Spectrum design data through a standardized protocol. It provides access to:

- **Design Tokens**: Color palettes, typography, layout tokens, and semantic tokens
- **Component Schemas**: API definitions and validation schemas for Spectrum components
- **Future**: Component anatomy, design patterns, and guidelines

## Installation

```bash
npm install -g @adobe/spectrum-design-data-mcp
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

- **`query-tokens`**: Search and retrieve design tokens by name, type, or category
- **`find-tokens-by-use-case`** ⭐: Find appropriate tokens for specific component use cases (e.g., "button background", "text color", "error state")
- **`get-component-tokens`** ⭐: Get all tokens related to a specific component type
- **`get-design-recommendations`** ⭐: Get token recommendations for design decisions and component states
- **`get-token-categories`**: List all available token categories
- **`get-token-details`**: Get detailed information about a specific token

#### Schema Tools

- **`query-component-schemas`**: Search component API schemas
- **`get-component-schema`**: Get the complete schema for a specific component
- **`list-components`**: List all available components with schemas
- **`validate-component-props`**: Validate component properties against schemas
- **`get-type-schemas`**: Get type definitions used in schemas

## Configuration with AI Clients

### Claude Desktop

Add to your Claude Desktop configuration:

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

## Development

### Building from Source

```bash
git clone https://github.com/adobe/spectrum-tokens.git
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

## License

Apache-2.0 © Adobe

## Contributing

This project is part of the Spectrum Design System. Please see the main [contribution guidelines](../../CONTRIBUTING.md) for details on how to contribute.
