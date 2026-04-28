# Spectrum Diff Core

Shared core library for Spectrum diff generation tools (tokens, component schemas, etc.).

## Overview

This package provides the foundational components for creating consistent diff tools across the Spectrum ecosystem. It includes:

- **Core utilities**: File import/export, diff operations, type checking
- **CLI framework**: Base CLI structure with consistent option handling
- **Template system**: Handlebars-based formatting with shared helpers
- **Output handling**: File output and console formatting

## Installation

```bash
pnpm add @adobe/spectrum-diff-core
```

## Usage

### Creating a Diff Tool

```javascript
import { BaseCLI, FileLoader, detailedDiff } from "@adobe/spectrum-diff-core";

class MyDiffTool extends BaseCLI {
  constructor() {
    super({
      toolName: "mydiff",
      dataType: "mydata",
      packagePath: "packages/mydata/src",
      manifestFile: "manifest.json",
    });
  }

  async generateDiff(original, updated) {
    const changes = detailedDiff(original, updated);
    // Add your specific change detection logic here
    return this.processChanges(changes);
  }
}
```

### Using File Loading

```javascript
import { FileLoader } from "@adobe/spectrum-diff-core";

const loader = new FileLoader();

// Load from remote repository
const remoteData = await loader.loadRemoteFiles(
  ["file1.json", "file2.json"],
  "v1.0.0",
  null,
  "owner/repo",
  "api-key",
  "packages/data/src",
);

// Load from local filesystem
const localData = await loader.loadLocalFiles("packages/data/src", [
  "file1.json",
  "file2.json",
]);
```

### Using Templates

```javascript
import { HandlebarsFormatter } from "@adobe/spectrum-diff-core";

const formatter = new HandlebarsFormatter({
  template: "cli",
  dataType: "tokens",
});

const output = await formatter.format(diffResult, options);
```

## CLI Framework

The `BaseCLI` class provides a consistent CLI structure:

```bash
mydiff report --old-version v1.0.0 --new-version v1.1.0 --format markdown --output report.md
```

**Common CLI Options:**

- `--old-[type]-version` / `--new-[type]-version` (version comparison)
- `--old-[type]-branch` / `--new-[type]-branch` (branch comparison)
- `--local` (local file comparison)
- `--format` (cli, markdown, handlebars)
- `--template` (built-in template names)
- `--output` (file output)
- `--debug` (debug output)

## Template System

Templates are organized by data type:

```
templates/
├── base/           # Shared templates
│   ├── cli.hbs
│   ├── markdown.hbs
│   └── json.hbs
├── tokens/         # Token-specific templates
└── schemas/        # Schema-specific templates
```

### Available Helpers

- `{{hasKeys obj}}` - Check if object has properties
- `{{totalItems result}}` - Calculate total number of changes
- `{{capitalize str}}` - Capitalize string
- `{{cleanPath path}}` - Clean up property paths
- `{{formatDate date}}` - Format timestamps
- `{{hilite}}`, `{{error}}`, `{{passing}}` - Terminal colors
- `{{bold}}`, `{{dim}}`, `{{emphasis}}` - Text formatting

## API Reference

### Core

- `detailedDiff(original, updated)` - Generate detailed diff
- `isObject(obj)`, `isString(str)`, etc. - Type checking utilities
- `deepClone(obj)` - Deep clone objects
- `getNestedProperty(obj, path)` - Safe property access

### File Import

- `FileLoader` - Main file loading orchestrator
- `RemoteFileFetcher` - Handle remote repository fetching
- `LocalFileSystem` - Handle local file operations

### CLI

- `BaseCLI` - Base class for creating CLI tools
- `normalizeOptions(options)` - Normalize CLI options
- `determineStrategy(options)` - Determine loading strategy

### Formatters

- `HandlebarsFormatter` - Template-based formatting
- `storeOutput(content, path)` - File output utility

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## License

Apache-2.0
