# Spectrum Tokens Release Analyzer

A tool for analyzing Spectrum Tokens release history and generating data for change frequency visualization.

## Overview

This tool parses the Spectrum Tokens repository's git tags and generates structured JSON data showing release patterns, frequency, and types. It handles the different tag formats used throughout the project's history:

- **Legacy format**: `v12.2.0` (pre-monorepo)
- **Stable monorepo format**: `@adobe/spectrum-tokens@13.13.0`
- **Beta format**: `@adobe/spectrum-tokens@13.0.0-beta.47`
- **Snapshot format**: `@adobe/spectrum-tokens@0.0.0-s2-foundations-20240422210545`

## Installation

```bash
cd tools/release-analyzer
pnpm install
```

## Usage

### Command Line Interface

```bash
# Show summary statistics
node src/cli.js summary

# Generate full analysis JSON
node src/cli.js analyze --pretty --output analysis.json

# Generate stats-only JSON for visualization
node src/cli.js analyze --stats-only --pretty --output stats.json
```

### Programmatic Usage

```javascript
import { analyzeReleases } from "@adobe/spectrum-tokens-release-analyzer";

const analysis = analyzeReleases("./path/to/spectrum-tokens-repo");
console.log(analysis.stats);
```

## Output Format

### Full Analysis Output

```json
{
  "releases": [
    {
      "tag": "@adobe/spectrum-tokens@13.13.0",
      "version": "13.13.0",
      "major": 13,
      "minor": 13,
      "patch": 0,
      "prerelease": null,
      "date": "2024-12-01",
      "type": "stable",
      "format": "@adobe/spectrum-tokens@{version}",
      "packageName": "@adobe/spectrum-tokens"
    }
  ],
  "byType": {
    "legacy": [...],
    "stable": [...],
    "beta": [...],
    "snapshot": [...]
  },
  "snapshotFeatures": {
    "s2-foundations": [...],
    "types": [...],
    "table": [...]
  },
  "stats": {
    "total": 200,
    "byType": {
      "legacy": 104,
      "stable": 54,
      "beta": 58,
      "snapshot": 24
    },
    "snapshotFeatures": 11,
    "dateRange": {
      "earliest": "2022-12-14",
      "latest": "2024-12-01"
    }
  },
  "timeline": [
    {
      "date": "2023-04-11",
      "type": "legacy",
      "version": "12.2.0",
      "tag": "v12.2.0",
      "feature": null,
      "major": 12,
      "minor": 2,
      "patch": 0,
      "prerelease": null
    }
  ]
}
```

### Stats-Only Output

Simplified output focused on visualization needs:

```json
{
  "stats": {
    "total": 200,
    "byType": { ... },
    "snapshotFeatures": 11,
    "dateRange": { ... }
  },
  "timeline": [ ... ],
  "snapshotFeatures": [
    {
      "feature": "s2-foundations",
      "count": 6,
      "releases": [ ... ]
    }
  ]
}
```

## Release Types

### Legacy Releases

- Format: `v{major}.{minor}.{patch}`
- Example: `v12.2.0`
- Pre-monorepo releases (ended April 2023)

### Stable Releases

- Format: `@adobe/spectrum-tokens@{major}.{minor}.{patch}`
- Example: `@adobe/spectrum-tokens@13.13.0`
- Production-ready releases

### Beta Releases

- Format: `@adobe/spectrum-tokens@{major}.{minor}.{patch}-beta.{number}`
- Example: `@adobe/spectrum-tokens@13.0.0-beta.47`
- Pre-release validation builds

### Snapshot Releases

- Format: `@adobe/spectrum-tokens@0.0.0-{feature}-{timestamp}`
- Example: `@adobe/spectrum-tokens@0.0.0-s2-foundations-20240422210545`
- Experimental feature development builds

## Visualization Integration

The generated JSON data is designed for consumption by visualization libraries:

- **Timeline data**: Chronological release history
- **Type grouping**: Separate streams for different release types
- **Feature breakdown**: Snapshot releases grouped by development initiative
- **Statistics**: Summary metrics for dashboard displays

## Development

```bash
# Run tests
pnpm test

# Run in development mode
pnpm run dev summary
```

## License

Apache-2.0
