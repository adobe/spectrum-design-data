---
"@adobe/token-changeset-generator": minor
---

## New Token Changeset Generator Tool

Added a new command line tool `@adobe/token-changeset-generator` to automate the creation of changeset files for Spectrum token changes synced from tokens studio.

### Features

- **Automated PR parsing**: Extracts design motivation from tokens studio PRs
- **Token diff integration**: Uses `tdiff` to generate comprehensive token change reports
- **Smart semver detection**: Automatically determines appropriate bump types (major/minor/patch) based on token changes
- **Changeset generation**: Creates properly formatted changeset files with:
  - Design motivation from tokens studio
  - Detailed token diff reports
  - Appropriate semver bump types
  - PR references

### Usage

```bash
token-changeset generate \
  --tokens-studio-pr https://github.com/adobe/spectrum-tokens-studio-data/pull/275 \
  --spectrum-tokens-pr https://github.com/adobe/spectrum-tokens/pull/559
```

This tool streamlines the workflow for maintainers when syncing token changes from the design team's tokens studio data repository.
