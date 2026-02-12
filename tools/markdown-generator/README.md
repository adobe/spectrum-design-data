# Markdown Generator

A tool for generating markdown documentation files from Spectrum design tokens, component schemas, and design system registry data. The generated markdown is used by the 11ty documentation site and published to an orphan branch for chatbot indexing.

## Overview

The markdown generator converts structured data from three sources into markdown files with YAML frontmatter:

* **Component Schemas** (`@adobe/spectrum-component-api-schemas`) → `output/components/*.md`
* **Design Tokens** (`@adobe/spectrum-tokens`) → `output/tokens/*.md`
* **Design System Registry** (`@adobe/design-system-registry`) → `output/registry/*.md`

## Features

* **YAML Frontmatter**: Each markdown file includes structured metadata (title, description, tags, etc.)
* **Token Resolution**: Automatically resolves token aliases to their concrete values
* **Named Anchors**: Token pages include named anchors for direct linking
* **Alias Linking**: Token values that reference other tokens are converted to markdown links
* **Deprecation Support**: Deprecated tokens are clearly marked with comments
* **Renamed Token Tracking**: Tokens with `renamed` properties include "Replaced by" links
* **Table Generation**: Structured data is formatted as markdown tables

## Installation

The markdown generator is part of the Spectrum Design Data monorepo and uses pnpm for dependency management.

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run the generator
moon run markdown-generator:generate
```

## Usage

### CLI

```bash
# Generate all markdown files
moon run markdown-generator:generate

# Or using pnpm directly
pnpm --filter markdown-generator generate
```

### Output Structure

The generator creates markdown files in the `output/` directory:

```
output/
├── components/
│   ├── button.md
│   ├── checkbox.md
│   └── ...
├── tokens/
│   ├── color-aliases.md
│   ├── color-component.md
│   └── ...
└── registry/
    ├── sizes.md
    ├── states.md
    ├── glossary.md
    └── ...
```

## Generated Markdown Format

### Component Markdown

Component markdown files include:

* **Frontmatter**: `title`, `description`, `category`, `documentationUrl`, `tags`
* **Body**: Component description and a properties table

Example:

```markdown
---
title: Button
description: "A button component for user interactions"
category: actions
documentationUrl: https://spectrum.adobe.com/page/button/
tags:
  - component
  - schema
  - actions
---

A button component for user interactions

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| variant | enum | primary, secondary, negative | primary | Yes | The visual style of the button |
| size | enum | s, m, l, xl | m | No | The size of the button |
```

### Token Markdown

Token markdown files include:

* **Frontmatter**: `title`, `description`, `tags`
* **Body**: Table with token name, value, resolved value, deprecation status, and renamed information
* **Named Anchors**: Each token row includes an anchor for direct linking (e.g., `<a id="color-background-default"></a>`)

Example:

```markdown
---
title: color aliases
description: Design tokens from color-aliases.json
tags:
  - tokens
  - color-aliases
---

| Token | Value | Resolved | Deprecated | Deprecated comment | Replaced by |
| --- | --- | --- | --- | --- | --- |
| <a id="color-background-default"></a> color-background-default | {color-gray-50} | #ffffff | No | - | - |
| <a id="color-background-disabled"></a> color-background-disabled | {color-gray-200} | #e6e6e6 | Yes | Use color-background-disabled-new | Replaced by [color-background-disabled-new](/tokens/color-aliases/#color-background-disabled-new) |
```

**Token Value Resolution**:

* Alias values (e.g., `{color-gray-50}`) are automatically resolved to concrete values
* Alias values are converted to markdown links pointing to the referenced token's page
* For token sets, each set value is resolved individually

### Registry Markdown

Registry markdown files include:

* **Frontmatter**: `title`, `description`, `tags`
* **Body**: Table with registry entries (ID, label, description, aliases/definition)

Example:

```markdown
---
title: Sizes
description: Registry: Sizes
tags:
  - registry
  - sizes
---

| ID | Label | Description | Aliases |
| --- | --- | --- | --- |
| s | Small | Small size variant | xs, tiny |
| m | Medium | Medium size variant | default, base |
| l | Large | Large size variant | xl, extra-large |
```

## Link Resolution

### Token Alias Links

When a token value references another token using the alias pattern `{token-name}`, the generator:

1. Resolves the alias to its concrete value
2. Creates a markdown link to the referenced token's page
3. Handles circular references safely
4. Supports nested aliases (aliases that reference other aliases)

Example: `{color-gray-50}` becomes `[{color-gray-50}](/tokens/color-aliases/#color-gray-50)`

### Renamed Token Links

Tokens with a `renamed` property include a "Replaced by" link:

* If the renamed token exists, a link is created: `Replaced by [new-token-name](/tokens/file/#new-token-name)`
* If the renamed token doesn't exist, plain text is used: `Replaced by new-token-name`

## Programmatic API

The generator exports functions for each content type:

```javascript
import {
  generateComponentMarkdown,
  generateTokenMarkdown,
  generateRegistryMarkdown,
} from "./src/index.js";

// Generate component markdown
const componentCount = await generateComponentMarkdown("./output");

// Generate token markdown
const tokenCount = await generateTokenMarkdown("./output");

// Generate registry markdown
const registryCount = await generateRegistryMarkdown("./output");
```

## Build Pipeline Integration

The markdown generator is integrated into the documentation build pipeline:

1. **Generate**: `moon run markdown-generator:generate` - Creates markdown files in `output/`
2. **Copy Content**: `moon run site:copyContent` - Copies generated markdown to `docs/site/src/`
3. **Build Site**: `moon run site:build` - Builds the 11ty site
4. **Export**: `moon run site:export` - Exports static site for deployment

The generated markdown is also published to the `docs-markdown` orphan branch via `.github/workflows/publish-markdown.yml` for chatbot indexing.

## Development

### Running Tests

```bash
# Run all tests
moon run markdown-generator:test

# Run tests with coverage
pnpm --filter markdown-generator test -- --coverage
```

### Adding New Content Types

To add support for a new content type:

1. Create a new generator function in `src/` (e.g., `src/new-content.js`)
2. Export the function from `src/index.js`
3. Call it in the `main()` function
4. Add tests in `test/new-content.test.js`
5. Update this README with usage examples

## Error Handling

The generator includes validation and error handling:

* Validates that source packages are available
* Checks that output directory is writable
* Provides helpful error messages for missing data
* Handles circular token references safely
* Validates token alias references exist

## Related Tools

* **11ty Site** (`docs/site/`) - Documentation site that consumes generated markdown
* **Token Validation** (`packages/tokens/test/`) - Tests that validate token structure and references
* **Publish Markdown Workflow** (`.github/workflows/publish-markdown.yml`) - Publishes markdown to orphan branch

## License

Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0.
