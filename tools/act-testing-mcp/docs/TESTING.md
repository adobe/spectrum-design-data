# Testing Strategy

## Current Setup

The act-testing-mcp tool uses a clean, modern testing setup:

- **AVA** for test framework
- **c8** for coverage reporting
- **Native ES modules** without experimental loaders
- **Moon integration** for CI/CD

## Test Categories

### 1. System Tests (Current)

- Verify act installation
- Verify Docker availability
- Verify project structure

### 2. Unit Tests (Future)

When the MCP logic becomes more complex, we can add:

- Workflow parsing tests
- Command generation tests
- Error handling tests

### 3. Integration Tests (Future)

For end-to-end testing:

- MCP protocol communication
- Act command execution
- Docker container interaction

## Adding Mocking (When Needed)

If you need to mock external dependencies later:

```bash
# Add esmock back to dependencies
pnpm add -D esmock

# Update ava.config.js with modern import syntax
nodeArguments: [
  "--import",
  "data:text/javascript,import { register } from \"node:module\"; import { pathToFileURL } from \"node:url\"; register(\"esmock\", pathToFileURL(\"./\"));"
]
```

## Test Commands

```bash
# Quick test run
moon run act-testing-mcp:test

# Coverage check
moon run act-testing-mcp:test-coverage

# Development mode
moon run act-testing-mcp:test-watch
```

## Coverage Goals

Coverage focuses on core business logic (`utils/act-helpers.js`) rather than MCP server boilerplate:

- **80% lines/statements** - High coverage of testable core logic
- **75% functions** - Most utility functions are tested
- **60% branches** - Reasonable coverage of conditional logic

**Why exclude `index.js`?**

- It's primarily MCP protocol boilerplate
- Hard to test without full MCP environment
- Core logic is extracted to testable `utils/` functions
- Syntax validation ensures it compiles correctly

## Best Practices

1. **Start simple** - System tests first, unit tests as complexity grows
2. **Test behavior** - Focus on what the tool does, not how it does it
3. **Keep it fast** - Tests should run quickly for rapid feedback
4. **Mock sparingly** - Only mock when testing becomes difficult otherwise

## CI Integration

Tests automatically run via moon in CI environments:

- Pull request validation
- Pre-commit hooks (if configured)
- Release verification
