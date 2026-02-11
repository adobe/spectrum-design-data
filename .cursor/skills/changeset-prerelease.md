# Changeset Prerelease and Snapshot Release Guide

This skill helps you understand and work with Changesets prerelease and snapshot releases for the Spectrum Design Data monorepo.

## Overview

Changesets supports two types of temporary releases:

1. **Snapshot Releases**: Temporary versions for testing without consuming changesets
2. **Prereleases**: Structured prerelease versions (beta, alpha, rc, next) that consume changesets

## ⚠️ Important Warnings

### Prerelease Complexity

> **Warning!** Prereleases are very complicated! Using them requires a thorough understanding of all parts of npm publishes. Mistakes can lead to repository and publish states that are very hard to fix.

### Branch Strategy

> **Warning:** If you decide to do prereleases from the default branch of your repository, without having a branch for your last stable release without the prerelease changes, you will block other changes until you are ready to exit prerelease mode. We thoroughly recommend only running prereleases from a branch other than the default branch.

## Snapshot Releases

Snapshot releases are ideal for testing changes on feature branches without affecting the main release flow.

### When to Use Snapshot Releases

* Testing changes on a feature branch
* Sharing work-in-progress with team members
* Local publishing when CI/CD is unavailable
* Quick iteration without consuming changesets

### Snapshot Release Workflow

```bash
# 1. Create a changeset for your changes (if not already created)
pnpm changeset add

# 2. Version packages with snapshot flag
pnpm changeset version --snapshot <tag>

# 3. Temporarily remove provenance (required for local publishing)
# Edit package.json files to set "provenance": false in publishConfig

# 4. Publish snapshot release
pnpm changeset publish --tag <tag>

# 5. Restore provenance and revert version changes
git restore packages/*/package.json packages/*/CHANGELOG.md
```

### Snapshot Release Characteristics

* **Version format**: `0.0.0-<tag>-<timestamp>` (e.g., `0.0.0-layout-20260209174611`)
* **Changesets**: Not consumed - remain for actual release
* **Git commits**: Not required
* **Dist tag**: Uses the specified tag (e.g., `layout`, `snapshot`)
* **Provenance**: Must be disabled for local publishing

### Example: Snapshot Release for Layout Tokens

```bash
# Create changeset
pnpm changeset add
# Select: @adobe/spectrum-tokens (minor), @adobe/design-system-registry (patch)
# Description: "Added layout tokens and updated token terminology"

# Version with snapshot
pnpm changeset version --snapshot layout

# Remove provenance from affected packages
# Edit packages/tokens/package.json and packages/design-system-registry/package.json
# Set "provenance": false in publishConfig

# Publish
pnpm changeset publish --tag layout

# Restore (after publishing)
git restore packages/*/package.json packages/*/CHANGELOG.md
```

### Installing Snapshot Releases

Users can install snapshot releases using the dist tag:

```bash
pnpm add @adobe/spectrum-tokens@layout
pnpm add @adobe/design-system-registry@layout
```

## Prereleases

Prereleases are structured temporary releases that consume changesets and follow a specific workflow.

### When to Use Prereleases

* Beta or alpha testing phases
* Release candidates (RC)
* Next/experimental versions
* Structured prerelease cycles

### Prerelease Workflow

#### Entering Prerelease Mode

```bash
# Enter prerelease mode with a tag
pnpm changeset pre enter <tag>

# Common tags: next, beta, alpha, rc
# Example:
pnpm changeset pre enter next
```

This command:

* Creates a `.changeset/pre.json` file tracking prerelease state
* Stores the prerelease tag and mode information

#### Creating Changesets in Prerelease Mode

Create changesets normally:

```bash
pnpm changeset add
```

Select packages and bump types as usual. The changesets will be consumed during versioning.

#### Versioning Prerelease Packages

```bash
pnpm changeset version
```

This will:

* Apply changesets and version packages
* Append prerelease tag to versions (e.g., `1.0.0-next.0`, `1.0.0-next.1`)
* Bump dependent packages even if they wouldn't normally be bumped
  * **Why?** Prerelease versions don't satisfy semver ranges (e.g., `^5.0.0` is not satisfied by `5.1.0-next.0`)

#### Publishing Prerelease Packages

```bash
pnpm changeset publish
```

This will:

* Publish packages to npm
* Use the prerelease tag as the npm dist tag
* For new packages, publish to `latest` tag (first publish only)

#### Subsequent Prerelease Iterations

For additional prerelease versions:

```bash
# Add more changesets
pnpm changeset add

# Version (counter increments: next.0 -> next.1 -> next.2)
pnpm changeset version

# Publish
pnpm changeset publish
```

#### Exiting Prerelease Mode

When ready for the final release:

```bash
# Exit prerelease mode
pnpm changeset pre exit

# Version packages (removes prerelease tag)
pnpm changeset version

# Publish to latest
pnpm changeset publish
```

The `pre exit` command:

* Sets intent to exit in `pre.json`
* Doesn't perform versioning (that's done by `version`)

The `version` command after exit:

* Applies any remaining changesets
* Removes prerelease tag from versions
* Produces normal release versions

### Prerelease Example Workflow

```bash
# Initial setup
pnpm changeset pre enter next
pnpm changeset add  # Select packages and bumps
pnpm changeset version
git add .
git commit -m "Enter prerelease mode and version packages"
pnpm changeset publish
git push --follow-tags

# Subsequent releases
pnpm changeset add  # More changes
pnpm changeset version
git add .
git commit -m "Version packages"
pnpm changeset publish
git push --follow-tags

# Final release
pnpm changeset pre exit
pnpm changeset version
git add .
git commit -m "Exit prerelease mode and version packages"
pnpm changeset publish
git push --follow-tags
```

### Prerelease Version Behavior

**Important:** Prerelease versions bump dependent packages that wouldn't normally be bumped.

Example:

* `pkg-a@1.0.0` depends on `pkg-b@^2.0.0`
* `pkg-b@2.1.0-next.0` is published
* `pkg-a` must be bumped because `^2.0.0` doesn't satisfy `2.1.0-next.0`

This ensures all packages in the monorepo remain compatible during prerelease cycles.

### New Packages in Prerelease Mode

When a new package is added during prerelease:

* First publish goes to `latest` tag (standard npm behavior)
* Subsequent publishes use the prerelease tag
* This continues until the package exits prerelease mode

## Changeset File Format

### Standard Changeset

```markdown
---
"@adobe/spectrum-tokens": minor
"@adobe/design-system-registry": patch
---

Description of the changes
```

### Prerelease Changeset

Prerelease changesets use the same format. The difference is in how they're processed:

```markdown
---
"@adobe/spectrum-tokens": minor
---

Added new layout tokens for improved spacing system
```

The `changeset version` command processes these differently based on prerelease mode state.

## Common Pitfalls

### 1. Running Prerelease from Main Branch

**Problem**: Blocks other changes until prerelease mode is exited.

**Solution**: Always use a feature branch for prereleases.

### 2. Forgetting to Exit Prerelease Mode

**Problem**: Packages stuck in prerelease versions.

**Solution**: Always run `pnpm changeset pre exit` when done.

### 3. Provenance Issues with Local Publishing

**Problem**: Local publishing fails with provenance errors.

**Solution**: Temporarily set `"provenance": false` in `publishConfig` for local snapshot releases.

### 4. Dependent Package Versioning

**Problem**: Unexpected package bumps during prerelease.

**Solution**: This is expected behavior - prerelease versions don't satisfy semver ranges.

### 5. Snapshot vs Prerelease Confusion

**Problem**: Using wrong release type for use case.

**Solution**:

* Use **snapshot** for quick testing without consuming changesets
* Use **prerelease** for structured beta/alpha/rc cycles

## Commands Reference

### Snapshot Releases

```bash
pnpm changeset version --snapshot <tag>        # Version with snapshot
pnpm changeset publish --tag <tag>              # Publish snapshot
```

### Prereleases

```bash
pnpm changeset pre enter <tag>                  # Enter prerelease mode
pnpm changeset pre exit                         # Exit prerelease mode
pnpm changeset version                          # Version (respects prerelease mode)
pnpm changeset publish                          # Publish (uses prerelease tag)
```

### General

```bash
pnpm changeset add                              # Create changeset
pnpm changeset status                           # Check changeset status
pnpm changeset version                          # Version packages
pnpm changeset publish                          # Publish packages
```

## Project-Specific Notes

### Package Manager

* Always use `pnpm` (never npm or yarn)
* Version: `pnpm@10.17.1`

### Provenance

* Production releases require `"provenance": true`
* Local snapshot releases must temporarily disable provenance
* Restore provenance after publishing

### Monorepo Structure

* Packages in `packages/` directory
* Tools in `tools/` directory
* Docs in `docs/` directory
* All managed via pnpm workspaces

### Testing

* Run tests before publishing: `moon run test`
* Ensure all packages pass validation

## References

* [Changesets Prerelease Documentation](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)
* [Changesets Snapshot Releases](https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md)
* [Changesets Common Questions](https://github.com/changesets/changesets/blob/main/docs/common-questions.md)
