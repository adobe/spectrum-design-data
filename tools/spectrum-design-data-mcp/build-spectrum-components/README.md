# Spectrum Design Data Agent Skills

## Overview

Agent Skills are markdown guides that help AI agents use the Spectrum Design Data MCP tools effectively. They orchestrate multiple MCP tools into complete workflows for common design system tasks.

## What are Agent Skills?

Agent Skills are documentation files that:

* Guide AI agents through multi-step workflows
* Orchestrate existing MCP tools into complete tasks
* Provide examples and best practices
* Help agents discover the right tools for specific use cases

Unlike MCP tools (which are executable functions), Agent Skills are **guidance documents** that tell agents how to combine tools to accomplish complex tasks.

## Available Skills

### [Component Builder](component-builder.md)

Helps agents build Spectrum components correctly by:

* Discovering component schemas
* Finding appropriate design tokens
* Validating component configurations
* Following Spectrum design patterns

**Use when**: Building, creating, or implementing Spectrum components

### [Token Finder](token-finder.md)

Helps agents discover the right design tokens for:

* Color decisions (semantic, component-specific)
* Spacing and layout
* Typography
* Component styling

**Use when**: Finding tokens for design decisions or styling components

## How Agent Skills Work

Agent Skills don't execute code directly. Instead, they:

1. **Guide tool selection**: Tell agents which MCP tools to use
2. **Orchestrate workflows**: Show how to combine multiple tools
3. **Provide examples**: Demonstrate real-world usage patterns
4. **Share best practices**: Help agents make better decisions

### Example Workflow

When an agent needs to build a button:

1. Agent reads `component-builder.md`
2. Skill guides agent to use `get-component-schema` first
3. Then use `get-component-tokens` to find related tokens
4. Use `find-tokens-by-use-case` for specific styling needs
5. Finally use `validate-component-props` to ensure correctness

The skill provides the **workflow**, while the MCP tools provide the **data**.

## Integration with MCP Tools

Agent Skills work alongside the Spectrum Design Data MCP tools:

### Token Tools

* `query-tokens` - Search tokens
* `find-tokens-by-use-case` ⭐ - Find tokens for use cases
* `get-component-tokens` ⭐ - Get component-specific tokens
* `get-design-recommendations` ⭐ - Get semantic recommendations
* `get-token-categories` - List categories
* `get-token-details` - Get token details

### Schema Tools

* `query-component-schemas` - Search schemas
* `get-component-schema` ⭐ - Get component API
* `list-components` - List all components
* `validate-component-props` ⭐ - Validate configurations
* `get-type-schemas` - Get type definitions
* `get-component-options` ⭐ - User-friendly property discovery
* `search-components-by-feature` ⭐ - Find components by feature

⭐ = Frequently used in Agent Skills

## Using Agent Skills

### For AI Agents

1. **Read the skill**: When a user asks about a task covered by a skill, read the relevant skill file
2. **Follow the workflow**: Use the step-by-step guidance
3. **Call MCP tools**: Execute the MCP tools as directed
4. **Combine results**: Synthesize tool outputs into a complete solution

### For Developers

1. **Reference in prompts**: Mention Agent Skills when asking agents to work with Spectrum
2. **Link in documentation**: Reference skills in your project documentation
3. **Extend skills**: Create new skills for additional workflows

## Creating New Agent Skills

To create a new Agent Skill:

1. **Identify the workflow**: What multi-step task needs guidance?
2. **Map to MCP tools**: Which existing tools support this workflow?
3. **Write the guide**: Create a markdown file with:
   * Overview and when to use
   * Step-by-step workflow
   * Examples with real use cases
   * Best practices
   * Related tools reference
4. **Add to this README**: Document the new skill

### Skill Template

```markdown
# [Skill Name] Agent Skill

## Overview
Brief description of what this skill helps with.

## When to Use
List scenarios when this skill should be activated.

## Workflow
Step-by-step guidance on using MCP tools.

## Example
Real-world example showing the workflow.

## Best Practices
Tips for using this skill effectively.

## Related Tools
List of MCP tools used by this skill.
```

## Relationship to React Spectrum AI

This implementation follows the pattern established by [React Spectrum's AI integration](https://react-spectrum.adobe.com/ai), which also uses MCP and Agent Skills to help AI agents work with design systems.

## Contributing

When adding new Agent Skills:

* Follow the existing markdown format
* Include clear examples
* Reference specific MCP tools
* Test workflows with real scenarios
* Update this README

## Resources

* [Spectrum Design Data MCP README](../README.md)
* [React Spectrum AI](https://react-spectrum.adobe.com/ai)
* [MCP Specification](https://modelcontextprotocol.io)
