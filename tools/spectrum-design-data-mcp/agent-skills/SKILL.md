***

name: build-spectrum-components
description: Build Spectrum components and discover design tokens through orchestrated workflows using the Spectrum Design Data MCP server. Use when building UI components, finding design tokens, validating component configurations, or working with Adobe Spectrum design system data.
license: Apache-2.0
compatibility: Requires MCP client with access to [**@adobe/spectrum-design-data-mcp**](https://github.com/adobe/spectrum-design-data-mcp) server. Works with Cursor, VS Code, Claude Code, and other MCP-compatible clients.
metadata:
author: Adobe
version: "1.0"

***

# Spectrum Design Data Agent Skills

## Overview

This skill package provides AI agents with the ability to build Spectrum components and discover design tokens through orchestrated workflows using the Spectrum Design Data MCP server.

## Capabilities

### Component Builder Skill

**Purpose**: Helps AI agents build Spectrum components correctly by orchestrating MCP tools to discover schemas, find tokens, and validate configurations.

**When to Use**:

* Building, creating, or implementing Spectrum components
* Need help with component props, variants, or configuration
* Validating component usage
* Understanding component structure or API

**Workflow**:

1. Discover component schema using `get-component-schema`
2. Get component-specific tokens using `get-component-tokens`
3. Find tokens for specific use cases using `find-tokens-by-use-case`
4. Get design recommendations using `get-design-recommendations`
5. Validate component configuration using `validate-component-props`

**Example**:

```
User: "Create a primary action button with medium size"

Agent workflow:
1. get-component-schema({"component": "action-button"})
2. get-component-tokens({"componentName": "action-button"})
3. find-tokens-by-use-case({"useCase": "button background", "componentType": "action-button"})
4. get-design-recommendations({"intent": "primary", "context": "button"})
5. validate-component-props({"component": "action-button", "props": {...}})
```

**Related Tools**:

* `get-component-schema`
* `get-component-tokens`
* `find-tokens-by-use-case`
* `get-design-recommendations`
* `validate-component-props`
* `get-component-options`
* `search-components-by-feature`

### Token Finder Skill

**Purpose**: Helps AI agents discover the right Spectrum design tokens for design decisions, component styling, and visual design tasks.

**When to Use**:

* Finding tokens for colors, spacing, typography, or other design decisions
* Need recommendations for styling components
* Asking "what token should I use for..."
* Need help with design system values

**Workflow**:

1. Understand design intent (primary, error, success, etc.)
2. Get design recommendations using `get-design-recommendations`
3. Find tokens by use case using `find-tokens-by-use-case`
4. Get token details using `get-token-details`
5. Explore component tokens using `get-component-tokens`

**Example**:

```
User: "What colors should I use for a primary button?"

Agent workflow:
1. get-design-recommendations({"intent": "primary", "context": "button"})
2. find-tokens-by-use-case({"useCase": "button background", "componentType": "button"})
3. get-token-details({"tokenPath": "accent-color-100"})
```

**Related Tools**:

* `get-design-recommendations`
* `find-tokens-by-use-case`
* `get-component-tokens`
* `get-token-details`
* `query-tokens`
* `get-token-categories`

## MCP Tools Available

### Token Tools

* `query-tokens` - Search and retrieve design tokens
* `find-tokens-by-use-case` - Find tokens for specific use cases
* `get-component-tokens` - Get component-specific tokens
* `get-design-recommendations` - Get semantic token recommendations
* `get-token-categories` - List all token categories
* `get-token-details` - Get detailed token information

### Schema Tools

* `query-component-schemas` - Search component API schemas
* `get-component-schema` - Get complete component schema
* `list-components` - List all available components
* `validate-component-props` - Validate component properties
* `get-type-schemas` - Get type definitions
* `get-component-options` - User-friendly property discovery
* `search-components-by-feature` - Find components by feature

### Workflow Tools

* `build-component-config` - Generate complete component configuration
* `suggest-component-improvements` - Analyze and suggest improvements

## Integration

### MCP Server Configuration

Add to your MCP configuration (e.g., `.cursor/mcp.json`):

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

### Using with AI Agents

1. **Read the skill documentation**: When a user asks about a task covered by a skill, read the relevant skill file (`component-builder.md` or `token-finder.md`)
2. **Follow the workflow**: Use the step-by-step guidance provided
3. **Call MCP tools**: Execute the MCP tools as directed by the skill
4. **Combine results**: Synthesize tool outputs into a complete solution

## Resources

* **Component Builder Guide**: [component-builder.md](component-builder.md)
* **Token Finder Guide**: [token-finder.md](token-finder.md)
* **Agent Skills README**: [README.md](README.md)
* **MCP Server README**: [../README.md](../README.md)
* **React Spectrum AI**: <https://react-spectrum.adobe.com/ai>

## Examples

### Building a Button Component

```
User: "Create a primary action button"

Agent uses Component Builder skill:
1. Gets action-button schema
2. Finds button-related tokens
3. Gets primary color recommendations
4. Validates final configuration
```

### Finding Error State Tokens

```
User: "What tokens should I use for error messaging?"

Agent uses Token Finder skill:
1. Gets negative/error color recommendations
2. Finds error state tokens
3. Gets token details for verification
```

## Best Practices

1. **Always validate**: Use `validate-component-props` before finalizing component configurations
2. **Use semantic tokens**: Prefer `get-design-recommendations` for semantic decisions
3. **Check component options**: Use `get-component-options` for user-friendly property discovery
4. **Combine multiple tools**: Don't rely on a single tool - combine schema + tokens + recommendations
5. **Handle states**: For interactive components, consider all states (default, hover, focus, disabled)

## Related Projects

This implementation follows the pattern established by [React Spectrum's AI integration](https://react-spectrum.adobe.com/ai), which also uses MCP and Agent Skills to help AI agents work with design systems.
