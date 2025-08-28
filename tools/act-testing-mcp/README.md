# Act Testing MCP

Model Context Protocol (MCP) server for testing GitHub Actions workflows locally using [nektos/act](https://github.com/nektos/act).

## Purpose

This MCP provides Claude with direct access to test GitHub Actions workflows locally in the spectrum-tokens repository, eliminating trial-and-error development cycles.

## Features

- **List Workflows**: Discover all available GitHub Actions workflows
- **Run Workflows**: Execute workflows locally with act
- **Validate Syntax**: Check workflow files for errors
- **Custom Events**: Test workflows with custom event data
- **Debug Support**: Detailed logging and error reporting
- **Dependency Monitoring**: Track `act` compatibility and detect breaking changes

## Tools

### `list_workflows`

Lists all available GitHub Actions workflows in the repository.

### `run_workflow`

Runs a workflow locally using act.

**Parameters:**

- `workflow` (required): Workflow file name or job ID
- `event` (optional): Event type (pull_request, push, etc.)
- `dryRun` (optional): Show execution plan without running
- `verbose` (optional): Enable detailed output
- `env` (optional): Environment variables
- `secrets` (optional): Secrets to provide
- `eventData` (optional): Custom event data for testing

### `validate_workflow`

Validates workflow syntax and structure.

**Parameters:**

- `workflow` (required): Workflow file name to validate

### `act_doctor`

Checks act configuration and Docker setup.

## Usage

This MCP is configured to run automatically when you interact with Claude in the spectrum-tokens repository. You can ask Claude to test workflows directly:

- "Test my CI workflow"
- "Run the changeset-lint workflow in dry-run mode"
- "Check if the enhance-sync-pr workflow works with custom PR data"

## Configuration

The MCP is configured in `.cursor/mcp.json` and optimized for the spectrum-tokens project structure.

## Development

```bash
# Install dependencies
pnpm install

# Run the MCP server
pnpm start

# Debug mode
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Testing & Coverage

The tool includes a comprehensive testing setup:

- **Unit tests** with AVA framework
- **Code coverage** with c8 focused on core logic
- **ES modules** with native Node.js support
- **CI integration** via moon tasks

Coverage focuses on the testable helper functions (`utils/act-helpers.js`) rather than the MCP server boilerplate:

- Lines: 80%
- Functions: 75%
- Branches: 60%
- Statements: 80%

Tests run cleanly without experimental loader warnings and include:

- ✅ Core functionality testing (act commands, argument building)
- ✅ System requirements validation
- ✅ Syntax validation for the MCP server
- ✅ Integration testing with real `act` and Docker

## Requirements

- Docker Desktop (running)
- nektos/act installed
- Node.js 20+
- spectrum-tokens repository structure

## Documentation

- [`docs/SETUP.md`](./docs/SETUP.md) - Complete setup documentation
- [`docs/GUIDE.md`](./docs/GUIDE.md) - Usage guide and quick reference

## Related Files

- `/.actrc` - Act configuration
- `/.cursor/mcp.json` - MCP configuration

## Status

✅ **Functional**: Core act integration working
🔄 **MCP Integration**: Tools available through Claude via terminal commands
🎯 **Optimized**: Specifically tuned for spectrum-tokens workflows
