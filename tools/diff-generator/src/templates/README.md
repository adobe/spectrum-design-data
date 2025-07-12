# Handlebars Templates

This directory contains Handlebars templates used by the diff-generator tool for formatting token diff reports.

## Built-in Templates

- **`default.hbs`** - Markdown-style output similar to the existing markdown formatter
- **`json.hbs`** - Structured JSON output with full diff details
- **`plain.hbs`** - Clean plain text output for CLI consumption
- **`summary.hbs`** - High-level summary with statistics only

## Creating Custom Templates

To create a custom template:

1. Create a new `.hbs` file in this directory
2. Use the data structure and helpers described below
3. Use the template with `--format handlebars --template your-template-name`

## Template Data Structure

Your template receives the following data:

```javascript
{
  timestamp: Date,           // Report generation timestamp
  result: {                  // Raw diff result
    renamed: {},
    deprecated: {},
    reverted: {},
    added: {},
    deleted: {},
    updated: {
      added: {},
      deleted: {},
      renamed: {},
      updated: {}
    }
  },
  options: {},              // CLI options

  // Processed arrays for easier iteration:
  renamed: [{ name, oldName, ... }],
  deprecated: [{ name, comment, ... }],
  reverted: [{ name, ... }],
  added: [{ name, ... }],
  deleted: [{ name, ... }],
  updated: {
    added: [{ name, changes: [...], ... }],
    deleted: [{ name, changes: [...], ... }],
    renamed: [{ name, changes: [...], ... }],
    updated: [{ name, changes: [...], ... }]
  }
}
```

## Available Helpers

### Calculation Helpers

- `{{totalTokens result}}` - Total number of changed tokens
- `{{totalUpdatedTokens result.updated}}` - Total number of tokens with property updates

### Object Helpers

- `{{hasKeys obj}}` - Check if object has properties
- `{{objectKeys obj}}` - Get object keys as array
- `{{objectValues obj}}` - Get object values as array
- `{{objectEntries obj}}` - Get object entries as array

### Text Formatting Helpers

- `{{hilite text}}` - Highlight text (default: `<code>text</code>`)
- `{{error text}}` - Error formatting (default: `<strong>text</strong>`)
- `{{passing text}}` - Passing/success formatting
- `{{neutral text}}` - Neutral formatting

### Utility Helpers

- `{{repeat str count}}` - Repeat string count times
- `{{cleanPath path}}` - Clean up property paths (removes "sets." and "$")
- `{{cleanSchemaUrl url}}` - Clean up schema URLs
- `{{lastPathPart path}}` - Get last part of a path (e.g., "color.json" from "/path/to/color.json")
- `{{formatDate date}}` - Format date/timestamp

### Conditional Helpers

- `{{ifEquals arg1 arg2}}` - Conditional equality check
- `{{#if condition}}...{{/if}}` - Standard Handlebars conditional

## Examples

### Simple Token List

```handlebars
{{#if (hasKeys result.added)}}
  Added Tokens:
  {{#each added}}
    -
    {{name}}
  {{/each}}
{{/if}}
```

### Token Changes with Details

```handlebars
{{#each updated.updated}}
  Token:
  {{hilite name}}
  Changes:
  {{#each changes}}
    {{cleanPath path}}:
    {{originalValue}}
    →
    {{newValue}}
  {{/each}}
{{/each}}
```

### Conditional Formatting

```handlebars
{{#each deprecated}}
  {{name}}{{#if comment}} - {{comment}}{{/if}}
{{/each}}
```

## Tips

1. Use `{{! comment }}` for template comments
2. Use `{{#unless condition}}` for negative conditions
3. Use `@first`, `@last`, `@index` in loops for special formatting
4. Test your templates with different data sets to ensure they handle edge cases
5. Consider using the `json` template as a reference for the complete data structure
