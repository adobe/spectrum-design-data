Note: for [Spectrum 2](https://s2.spectrum.adobe.com/) token data has been graduated to the `main` branch. If you need access to the S1 data, use the [`s1-legacy` branch](https://github.com/adobe/spectrum-design-data/tree/s1-legacy) and `v12.x.x` packages on [NPM](https://www.npmjs.com/package/@adobe/spectrum-tokens?activeTab=versions).

The [Spectrum token visualizer](https://opensource.adobe.com/spectrum-tokens/visualizer/) shows the token data for S1. For Spectrum 2 data, use [opensource.adobe.com/spectrum-tokens/s2-visualizer/](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/).

# Spectrum Tokens Monorepo

This repo uses:

* [pnpm](https://pnpm.io/) for package management
* [moon](https://moonrepo.dev/moon) to manage task running
* [Changesets](https://github.com/changesets/changesets) for automated versioning and releasing
* [Prettier](https://prettier.io/) for code formatting/linting
* [commitlint](https://commitlint.js.org/) and [Convetional Commits](https://www.conventionalcommits.org/en/v1.0.0/) to standardize commit messages
* [husky](https://typicode.github.io/husky/) to automate formatting of committed files and linting of commit messages

Packages in this monorepo:

## Core Packages

* [Spectrum Tokens](packages/tokens/) design tokens for Spectrum, Adobe's design system.
* [Spectrum Component Schemas](packages/component-schemas/) JSON schemas for validating Spectrum component APIs and properties.

## Documentation & Visualization

* [Spectrum Token Visualizer Tool](docs/visualizer/) a visualizer for inspecting S1 tokens. Published as a [static site](https://opensource.adobe.com/spectrum-tokens/visualizer/).
* [Spectrum Token Visualizer Tool S2](docs/s2-visualizer/) a version of the visualizer that shows the Spectrum 2 data. Published as a [static site](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/).
* [Spectrum S2 Tokens Viewer](docs/s2-tokens-viewer/) an enhanced token viewer with component usage analysis for Spectrum 2 tokens.
* [Spectrum Tokens Docs](docs/site/) a static site to show the component options API and other token data.
* [Release Timeline Visualization](docs/release-timeline/) interactive charts showing release frequency and development activity patterns. Published as a [static site](https://opensource.adobe.com/spectrum-tokens/release-timeline/).

## Development Tools

* [Spectrum Token Diff Generator](tools/diff-generator/) a library and cli tool that reports changes made between two schema/releases/branches.
* [Optimized Diff Engine](tools/optimized-diff/) high-performance diff algorithm for large token datasets.
* [Release Analyzer](tools/release-analyzer/) tool for analyzing release history and generating data for change frequency visualization.
* [Token Changeset Generator](tools/token-changeset-generator/) automates creation of changeset files from token diff analysis.
* [Token CSV Generator](tools/token-csv-generator/) exports token data to CSV format for analysis and reporting.
* [Transform Tokens JSON](tools/transform-tokens-json/) utilities for merging and transforming token data between formats.
* [Token Manifest Builder](tools/token-manifest-builder/) generates manifest files for token distribution.
* [Spectrum Design Data MCP](tools/spectrum-design-data-mcp/) Model Context Protocol server providing AI assistants with structured access to Spectrum design system data.

## Setup monorepo locally

1. Install pnpm using [this guide](https://pnpm.io/installation).
2. Install dependencies
   ```bash
   pnpm i
   ```

### Build all packages locally

Run build script

```bash
pnpm moon run :build
```

### Run all tests locally

```bash
pnpm moon run :test
```
