# Token Name Parser

Parse Spectrum token names into structured, schema-validated JSON objects with parsed name parts.

## Overview

This tool analyzes token names from `packages/tokens/src` and generates structured JSON in `packages/structured-tokens/src` with validated name components. It uses Handlebars templates to verify that parsed tokens can be reconstructed back to their original names.

## Features

* **Excel-based naming rules**: Extracts naming conventions from `spectrum-token-name-parts.xlsx`
* **Enum generation**: Creates validated enum schemas for all token name parts
* **Structured parsing**: Converts hyphenated token names into typed, validated objects
* **Name regeneration**: Uses Handlebars templates to verify parsing correctness
* **Inconsistency detection**: Identifies tokens that don't follow expected patterns

## Usage

```bash
# Parse layout.json tokens
pnpm token-name-parser parse

# Run tests
moon run token-name-parser:test
```

## Output

Parsed tokens are written to `packages/structured-tokens/src/` with full schema validation.

## Architecture

1. **Excel Parser** - Extracts naming rules and generates enums
2. **Token Parser** - Parses token names into structured objects
3. **Schema Validator** - Validates against JSON schemas with enum references
4. **Name Regenerator** - Uses Handlebars to reconstruct names
5. **Comparator** - Identifies matches and mismatches

## License

Apache-2.0
