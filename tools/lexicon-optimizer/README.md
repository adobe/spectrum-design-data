# Lexicon Optimizer

A tool to gather and optimize terminology used in component option definitions for the Spectrum Design System.

## Overview

The Lexicon Optimizer analyzes component schemas to extract, categorize, and optimize the terminology used across the Spectrum Design System. It helps identify inconsistencies, patterns, and opportunities for standardization in component property names, enum values, descriptions, and other terminology.

## Features

- **Comprehensive Analysis**: Extracts terms from property names, enum values, descriptions, categories, and state values
- **Pattern Recognition**: Identifies naming patterns and consistency issues
- **Multiple Export Formats**: Supports JSON, CSV, and Markdown output formats
- **Insights Generation**: Provides recommendations for lexicon optimization
- **Component Comparison**: Compare terminology across different components
- **Validation**: Identifies potential issues and inconsistencies

## Installation

This tool is part of the Spectrum Tokens monorepo and uses pnpm for dependency management.

```bash
# Install dependencies
pnpm install

# Run the tool
moon run analyze --project=lexicon-optimizer
```

## Usage

### Command Line Interface

The tool provides several commands for different analysis needs:

#### Analyze Component Schemas

```bash
# Basic analysis with JSON output
moon run analyze --project=lexicon-optimizer

# Export to different formats
moon run analyze --project=lexicon-optimizer -- --format csv --output lexicon.csv
moon run analyze --project=lexicon-optimizer -- --format markdown --output lexicon.md

# Verbose output
moon run analyze --project=lexicon-optimizer -- --verbose
```

#### Generate Insights

```bash
# Generate insights and recommendations
moon run analyze --project=lexicon-optimizer -- --command insights

# Save insights to file
moon run analyze --project=lexicon-optimizer -- --command insights --output insights.json
```

#### Compare Components

```bash
# Compare specific components
moon run analyze --project=lexicon-optimizer -- --command compare --components "button,text-field,menu"

# Compare all components
moon run analyze --project=lexicon-optimizer -- --command compare
```

#### Validate Lexicon

```bash
# Validate lexicon consistency
moon run analyze --project=lexicon-optimizer -- --command validate

# Save validation results
moon run analyze --project=lexicon-optimizer -- --command validate --output validation.json
```

### Programmatic Usage

```javascript
import LexiconOptimizer from "./src/index.js";

const optimizer = new LexiconOptimizer();

// Analyze all component schemas
const report = optimizer.analyze();

// Export to different formats
const jsonOutput = optimizer.exportToFormat("json");
const csvOutput = optimizer.exportToFormat("csv");
const markdownOutput = optimizer.exportToFormat("markdown");
```

## Output Formats

### JSON Format

The JSON output provides a comprehensive data structure:

```json
{
  "summary": {
    "totalComponents": 25,
    "totalPropertyNames": 45,
    "totalEnumValues": 120,
    "totalCategories": 8,
    "totalStateValues": 12
  },
  "lexicon": {
    "propertyNames": ["label", "size", "isDisabled", ...],
    "enumValues": ["s", "m", "l", "xl", "default", "hover", ...],
    "categories": ["actions", "inputs", "feedback", ...],
    "stateValues": ["default", "hover", "focus", ...]
  },
  "componentStats": {
    "button": {
      "totalProperties": 8,
      "enumProperties": 3,
      "booleanProperties": 2,
      "hasState": true,
      "hasSize": true
    }
  },
  "insights": [
    {
      "type": "size_consistency",
      "message": "Found 6 size values: s, m, l, xl, xs, xxl",
      "recommendation": "Consider standardizing size values across components"
    }
  ]
}
```

### CSV Format

The CSV output provides a flat structure suitable for spreadsheet analysis:

```csv
Type,Term,Count
Property Name,label,1
Property Name,size,1
Enum Value,s,1
Enum Value,m,1
Category,actions,1
```

### Markdown Format

The Markdown output provides a human-readable report with insights and recommendations.

## Analysis Categories

The tool analyzes the following categories of terminology:

### Property Names

- All property names defined in component schemas
- Identifies naming patterns (e.g., `is*`, `has*`, `show*` for boolean properties)

### Enum Values

- All possible values for enum properties
- Identifies size values, state values, and other categorical values

### Descriptions

- Extracts meaningful terms from component and property descriptions
- Filters out common English words to focus on domain-specific terminology

### Categories

- Component categories (actions, inputs, feedback, etc.)
- Helps identify categorization patterns

### State Values

- Interactive state values (default, hover, focus, etc.)
- Identifies consistency across components

### Type Values

- Data types used in properties (string, boolean, number, etc.)
- Helps understand property type patterns

## Insights and Recommendations

The tool generates insights to help optimize the lexicon:

### Size Consistency

- Identifies inconsistent size value sets across components
- Recommends standardizing size values

### State Consistency

- Identifies inconsistent state value sets
- Recommends standardizing interactive states

### Boolean Property Patterns

- Analyzes boolean property naming conventions
- Recommends consistent naming patterns

### Component Statistics

- Provides detailed statistics for each component
- Tracks property counts, types, and patterns

## Testing

Run the test suite:

```bash
moon run test --project=lexicon-optimizer
```

The test suite covers:

- Lexicon extraction functionality
- Schema analysis
- Report generation
- Export format validation
- Insight generation
- Error handling

## Contributing

When contributing to the Lexicon Optimizer:

1. Follow the project's coding standards
2. Add tests for new functionality
3. Update documentation as needed
4. Use conventional commit messages
5. Ensure all tests pass

## Architecture

The tool is built with:

- **ES Modules**: Modern JavaScript module system
- **Commander.js**: Command-line interface framework
- **AVA**: Testing framework
- **Moon**: Monorepo task management

## File Structure

```
tools/lexicon-optimizer/
├── src/
│   ├── index.js          # Core LexiconOptimizer class
│   └── cli.js            # Command-line interface
├── test/
│   └── index.test.js     # Test suite
├── package.json          # Package configuration
├── moon.yml             # Moon task configuration
├── ava.config.js        # AVA test configuration
└── README.md            # This file
```

## License

Copyright 2024 Adobe. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
