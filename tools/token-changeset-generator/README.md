# Token Changeset Generator

A command line tool to automatically generate changeset files for Spectrum token changes from tokens studio PR data.

## Usage

```bash
token-changeset generate --tokens-studio-pr <PR_URL> --spectrum-tokens-pr <PR_URL>
```

### Options

- `--tokens-studio-pr`: GitHub PR URL from the tokens studio repository (e.g., https://github.com/adobe/spectrum-tokens-studio-data/pull/275)
- `--spectrum-tokens-pr`: GitHub PR URL from the spectrum-tokens repository (e.g., https://github.com/adobe/spectrum-tokens/pull/559)
- `--output`: Optional output directory for the changeset file (defaults to `.changeset/`)

### Example

```bash
token-changeset generate \
  --tokens-studio-pr https://github.com/adobe/spectrum-tokens-studio-data/pull/275 \
  --spectrum-tokens-pr https://github.com/adobe/spectrum-tokens/pull/559
```

## What it does

1. Fetches the tokens studio PR description and extracts the "Motivation and context" section
2. Runs `tdiff` to generate a markdown report of token differences between the spectrum-tokens PR branch and main
3. Creates a changeset file with:
   - The design motivation from tokens studio
   - The token diff report
   - Appropriate semver bump type based on the changes

## Installation

This tool is part of the spectrum-tokens monorepo. Install dependencies with:

```bash
pnpm install
```

## License

Apache-2.0
