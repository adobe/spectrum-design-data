---
"@adobe/token-diff-generator": minor
---

feat(diff-generator): add Handlebars formatter support with templates

Added comprehensive Handlebars support to the token diff generator:

- **New Handlebars formatter**: Added `formatterHandlebars.js` with support for custom template rendering
- **Template system**: Added multiple built-in templates:
  - `default.hbs` - Standard diff output with enhanced formatting
  - `json.hbs` - JSON-formatted output
  - `plain.hbs` - Plain text output
  - `summary.hbs` - Condensed summary format
- **CLI integration**: Integrated Handlebars formatter into the CLI with template selection options
- **Test coverage**: Added comprehensive test suite for the new Handlebars functionality
- **Documentation**: Updated README with usage examples and template documentation

This enhancement provides greater flexibility in customizing diff output formats while maintaining backward compatibility with existing functionality.
