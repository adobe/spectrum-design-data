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

## Architecture

* **Framework**: Lit (Web Components)
* **UI Library**: Spectrum Web Components
* **Language**: TypeScript
* **Build**: Webpack
* **Testing**: AVA
* **Validation**: Ajv 2020-12 JSON Schema validator

### Key Files

* `src/plugin/plugin.ts` - Figma plugin backend
* `src/ui/app/litAppElement.ts` - Main UI application
* `src/ui/validators/jsonValidator.ts` - JSON schema validation
* `src/ui/app/templates/` - Form templates for each option type
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

## Links

* [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
* [Lit Documentation](https://lit.dev/)
* [Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/)
* [Spectrum Design System](https://spectrum.adobe.com/)
