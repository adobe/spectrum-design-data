# Spectrum Tokens - Tooling Standards

This document outlines the required tools and standards for the Spectrum Tokens project. All contributors must follow these guidelines to ensure consistency and maintainability across the codebase.

## Required Tools

### 1. AVA - Testing Framework

**Status**: Required for all JavaScript/TypeScript testing

- **Usage**: All test files must use AVA as the testing framework
- **Configuration**: Each package must include an `ava.config.js` file
- **File Pattern**: Test files must follow the pattern `test/**/*.test.js`
- **Standards**:
  - Use ESM syntax (`export default` config)
  - Set `verbose: true` for detailed output
  - Set `failFast: false` to run all tests
  - Set `failWithoutAssertions: true` to catch incomplete tests
  - Set `NODE_ENV: "test"` in environment variables

**Example Configuration**:

```javascript
export default {
  files: ["test/**/*.test.js"],
  environmentVariables: {
    NODE_ENV: "test",
  },
  verbose: true,
  failFast: false,
  failWithoutAssertions: true,
};
```

### 2. pnpm - Package Management

**Status**: Required for all package management and workspace management

- **Version**: `pnpm@10.11.0` (specified in `packageManager` field)
- **Usage**: All package installation, updates, and script execution must use pnpm
- **Workspace**: The project uses pnpm workspaces defined in `pnpm-workspace.yaml`
- **Standards**:
  - Never use `npm` or `yarn` commands
  - Use `pnpm install` for dependency installation
  - Use `pnpm run` for script execution
  - Use `pnpm add` for adding dependencies
  - Maintain the `pnpm-lock.yaml` file in version control

**Workspace Configuration**:

```yaml
packages:
  - "packages/*"
  - "docs/*"
  - "tools/*"
```

### 3. moon - Monorepo Management

**Status**: Required for task management and CI/CD coordination

- **Usage**: All tasks must be defined in `moon.yml` files
- **Integration**: moon works with pnpm workspace for efficient task execution
- **Standards**:
  - Define tasks in `moon.yml` at root and package levels
  - Use `moon run` for task execution
  - Leverage moon's caching and dependency management
  - Set appropriate `platform: node` for Node.js tasks

**Core Tasks**:

```yaml
tasks:
  test:
    command: [pnpm, ava, test]
    platform: node
  pre-commit:
    command: [pnpm, lint-staged]
    platform: node
    local: true
  prepare:
    command: [pnpm, "husky || true"]
    platform: node
    local: true
  release:
    command: [pnpm, changeset publish]
    platform: node
    local: true
```

### 4. changesets - Release Management

**Status**: Required for all version bumps and releases

- **Usage**: All version changes must go through changesets workflow
- **Configuration**: Project uses GitHub changelog integration
- **Standards**:
  - Create changesets for all breaking changes and new features
  - Use `pnpm changeset` to create new changesets
  - Use `pnpm changeset version` to bump versions
  - Use `pnpm changeset publish` to publish releases
  - Follow conventional changelog format

**Configuration**:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "adobe/spectrum-tokens" }
  ],
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

### 5. commitlint - Commit Message Formatting

**Status**: Required for all git commit messages

- **Usage**: All commit messages must follow conventional commit format
- **Configuration**: Uses `@commitlint/config-conventional` with custom ignore rules
- **Standards**:
  - Use conventional commit format: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Scope is optional but recommended for clarity
  - Description should be in present tense and lowercase
  - Breaking changes must include `BREAKING CHANGE:` in footer or `!` after type/scope

**Commit Message Examples**:

```
feat(tokens): add new semantic color tokens
fix(diff-generator): handle edge case in token comparison
docs(readme): update installation instructions
chore(deps): update dependencies to latest versions
feat(tokens)!: remove deprecated color tokens
```

**Configuration**:

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (message) => message.includes("[create-pull-request] automated change"),
  ],
};
```

## Integration Requirements

### Tool Integration

- **moon + pnpm**: All moon tasks must use pnpm commands
- **AVA + moon**: Test execution must go through moon's task system
- **changesets + moon**: Release tasks must be defined in moon configuration
- **pnpm + workspaces**: All packages must be part of the pnpm workspace
- **commitlint + git**: All commits must pass commitlint validation
- **commitlint + husky**: Pre-commit hooks validate commit messages

### Development Workflow

1. **Setup**: Use `pnpm install` to install dependencies
2. **Testing**: Use `moon run test` to run tests
3. **Pre-commit**: Use `moon run pre-commit` for lint-staged checks
4. **Committing**: Use conventional commit format for all commits
5. **Versioning**: Use `pnpm changeset` for version changes
6. **Publishing**: Use `moon run release` for releases

## Enforcement

### New Packages

- Must include `ava.config.js` for testing
- Must include `moon.yml` for task definition
- Must be added to `pnpm-workspace.yaml` packages array
- Must follow the established patterns from existing packages

### CI/CD

- All builds must use pnpm for dependency installation
- All tasks must be executed through moon
- All releases must use changesets workflow
- No direct npm/yarn usage allowed

### Dependencies

- All tool dependencies are managed at the root level
- Package-specific configurations are allowed but must follow the standards
- Version pinning is enforced through `packageManager` field

## Compliance

### Required Files

- `pnpm-workspace.yaml` - Workspace configuration
- `moon.yml` - Task definitions
- `.changeset/config.json` - Release configuration
- `ava.config.js` - Testing configuration (per package)
- `pnpm-lock.yaml` - Lock file (maintained automatically)
- `commitlint.config.cjs` - Commit message formatting rules

### Prohibited Actions

- ❌ Using `npm install` or `yarn install`
- ❌ Using test frameworks other than AVA
- ❌ Manual version bumps without changesets
- ❌ Bypassing moon for defined tasks
- ❌ Publishing packages without changesets workflow
- ❌ Using non-conventional commit message formats
- ❌ Committing without proper type/scope information

### Node.js Version

- **Required**: Node.js `~20.12` (specified in engines)
- All tooling must be compatible with this version

---

**Note**: This document should be updated when tooling versions or configurations change. All changes to tooling standards must be reviewed and approved by the maintainers.
