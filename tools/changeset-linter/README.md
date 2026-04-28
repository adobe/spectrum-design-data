# Changeset Linter

A linting tool to enforce concise changeset files while allowing exceptions for diff-generated content.

## Purpose

Keeps changeset files focused and scannable by:

- Limiting line count and line length for manual changesets
- Warning about verbose patterns (excessive emojis, business justifications)
- Allowing exceptions for auto-generated diff reports
- Validating proper changeset format

## Usage

### CLI Commands

```bash
# Lint all changesets in .changeset directory
pnpm changeset-lint check

# Lint specific file
pnpm changeset-lint check-file .changeset/my-changeset.md

# Fail on warnings (useful for CI)
pnpm changeset-lint check --fail-on-warnings
```

### Integration

Add to your workflow:

```yaml
- name: Lint changesets
  run: pnpm changeset-lint check --fail-on-warnings
```

## Rules

### Enforced Limits (for manual changesets)

- **Max lines**: 20 (excluding frontmatter)
- **Max line length**: 100 characters
- **Required**: Proper frontmatter with package versions

### Warnings

- Excessive emoji sections (`## 🚀`, `### ✅`)
- Business impact or technical details (belong in PR description)
- Performance metrics (belong in documentation)

### Exceptions

Auto-generated diff content is exempt from length limits when it contains:

- `## Tokens Changed` or `## Components Changed`
- `**Original Branch:**` / `**New Branch:**`
- `**Added (N)**` / `**Updated (N)**` / `**Deleted (N)**`

## Examples

### ✅ Good Changeset

```markdown
---
"@adobe/example-package": minor
---

feat(example): add new feature

- Add new API endpoint
- Improve error handling
- Update documentation

This change is non-breaking.
```

### ⚠️ Verbose Changeset (will warn)

```markdown
---
"@adobe/example-package": minor
---

feat(example): comprehensive feature suite

## 🚀 Key Improvements

### ✅ Business Impact

This revolutionizes our workflow...

### ✅ Performance Metrics

50% faster execution...
```

### ✅ Allowed Diff Content

```markdown
---
"@adobe/spectrum-tokens": minor
---

feat(tokens): sync from Spectrum Tokens Studio

## Tokens Changed (45)

**Original Branch:** main
**New Branch:** feature-update
[...extensive diff content allowed...]
```
