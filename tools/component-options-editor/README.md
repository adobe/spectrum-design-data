# Component Options Editor

A Figma plugin for authoring and editing Spectrum component option schemas with visual UI, JSON validation, and accessibility features.

## Overview

The Component Options Editor provides a user-friendly interface for creating and managing component option schemas for Adobe Spectrum Design System components. It features:

* **Visual Form Editor**: Intuitive forms for each option type (string, boolean, size, color, icon, etc.)
* **JSON Editor**: Powerful CodeMirror-based editor with syntax highlighting and validation
* **Real-time Validation**: Instant feedback using Ajv JSON schema validator
* **Accessibility**: ARIA labels, live regions, and screen reader support
* **Error Highlighting**: Visual error indicators with line/column precision
* **Import/Export**: Load and download component schemas
* **GitHub Integration**: Create pull requests directly to the adobe/spectrum-design-data repository

## Installation (Monorepo Context)

From the monorepo root:

```bash
pnpm install
```

## Building

Build the plugin via moon:

```bash
pnpm moon run component-options-editor:build
```

Or from the tool directory:

```bash
cd tools/component-options-editor
pnpm run build
```

## Development

### Running Tests

```bash
pnpm moon run component-options-editor:test
```

### Type Checking

```bash
pnpm moon run component-options-editor:type-check
```

### Linting

```bash
pnpm moon run component-options-editor:lint
```

### Validation

Run all checks:

```bash
pnpm moon run component-options-editor:validate
```

## Usage in Figma

1. Build the plugin (see above)
2. Open Figma Desktop
3. Go to Plugins → Development → Import plugin from manifest
4. Navigate to `tools/component-options-editor/dist/manifest.json`
5. Select the manifest file to load the plugin

The plugin will appear in your Figma plugins menu under "Component Options Editor".

## Features

### Creating Pull Requests

The plugin can create pull requests directly to the `adobe/spectrum-design-data` repository:

1. **Authenticate**: Enter your GitHub Personal Access Token in the "GitHub PR" tab
2. **Create Schema**: Use the visual editor to define your component schema
3. **Submit PR**: Click "Create Pull Request" to automatically:
   * Convert your schema to official JSON Schema format
   * Generate a changeset file
   * Create a new branch
   * Commit both files
   * Open a pull request

See [docs/CREATE\_PR.md](docs/CREATE_PR.md) for detailed instructions.

### Schema Conversion

The plugin uses [`@adobe/component-schema-converter`](../../packages/component-schema-converter/) to convert between:

* **Plugin Format**: Simplified format optimized for editing in Figma
* **Official Format**: JSON Schema 2020-12 format used in the repository

See [SCHEMA\_COMPATIBILITY.md](SCHEMA_COMPATIBILITY.md) for format details.

## Architecture

* **Framework**: Lit (Web Components)
* **UI Library**: Spectrum Web Components
* **Language**: TypeScript
* **Build**: Webpack
* **Testing**: AVA
* **Validation**: Ajv 2020-12 JSON Schema validator
* **GitHub Integration**: Octokit REST API client

### Key Files

* `src/plugin/plugin.ts` - Figma plugin backend
* `src/ui/app/litAppElement.ts` - Main UI application
* `src/ui/validators/jsonValidator.ts` - JSON schema validation
* `src/ui/app/templates/` - Form templates for each option type
* `src/services/githubService.ts` - GitHub API integration
* `src/services/prWorkflow.ts` - PR creation workflow orchestrator
* `src/services/changesetGenerator.ts` - Changeset file generation
* `webpack.config.cjs` - Webpack build configuration
* `moon.yml` - Moon task definitions

## Contributing

See the monorepo [CONTRIBUTING.md](../../CONTRIBUTING.md) for general contribution guidelines.

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tools): add new feature
fix(tools): fix issue
docs(tools): update documentation
```

## License

Apache 2.0

## Documentation

* [Creating Pull Requests](docs/CREATE_PR.md) - Guide for creating PRs from the plugin
* [Schema Compatibility](SCHEMA_COMPATIBILITY.md) - Format comparison and conversion details

## Links

* [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
* [Lit Documentation](https://lit.dev/)
* [Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/)
* [Spectrum Design System](https://spectrum.adobe.com/)
* [Octokit REST API](https://octokit.github.io/rest.js/)
* [Changesets](https://github.com/changesets/changesets)
