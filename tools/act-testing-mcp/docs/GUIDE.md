# GitHub Actions Testing with Act - Quick Reference

## 🎯 Overview

You now have a complete local GitHub Actions testing environment using [nektos/act](https://github.com/nektos/act) integrated with Claude through MCP.

## 🚀 What You Can Do

### Direct Commands (Available Now)

```bash
# List all workflows
act --list

# Test a workflow (dry-run)
act pull_request -W .github/workflows/ci.yml --dryrun

# Run a workflow for real
act pull_request -W .github/workflows/changeset-lint.yml

# Test with custom event data
echo '{"pull_request":{"title":"test"}}' > event.json
act pull_request --eventpath event.json -W .github/workflows/enhance-sync-pr.yml
```

### Claude Integration (Ask Claude)

- "Test my CI workflow"
- "Run the changeset-lint workflow"
- "Check if the enhance-sync-pr workflow works with a custom PR title"
- "Debug why my release workflow is failing"
- "Test all token diff workflows"

## 📋 Available Workflows

| Workflow                         | Purpose                    | Event             | Status    |
| -------------------------------- | -------------------------- | ----------------- | --------- |
| `changeset-lint.yml`             | Lint changeset files       | pull_request      | ✅ Tested |
| `ci.yml`                         | Main CI pipeline           | pull_request      | ✅ Tested |
| `enhance-sync-pr.yml`            | Custom sync PR enhancement | pull_request      | ✅ Tested |
| `component-diff-pr-comment.yml`  | Component schema diff      | pull_request      | Ready     |
| `token-diff-pr-comment.yml`      | Token diff reporting       | pull_request      | Ready     |
| `deploy-docs.yml`                | Documentation deployment   | push              | Ready     |
| `release.yml`                    | Release automation         | push              | Ready     |
| `tdiff-spectrum-foundations.yml` | Token diff foundations     | workflow_dispatch | Ready     |
| `tdiff-spectrum1.yml`            | Token diff Spectrum 1      | workflow_dispatch | Ready     |
| `tdiff-spectrum2.yml`            | Token diff Spectrum 2      | workflow_dispatch | Ready     |
| `release-snapshot.yml`           | Snapshot releases          | workflow_dispatch | Ready     |

## 🛠 Configuration Files

- **`.actrc`** - Act configuration (optimized for M-series Mac)
- **`.cursor/mcp.json`** - MCP configuration for Claude integration
- **`tools/act-testing-mcp/`** - Custom MCP for Act integration

## 🎭 Common Test Scenarios

### Test PR Workflows

```bash
# Basic PR test
act pull_request -W .github/workflows/ci.yml --dryrun

# Custom PR with specific title
echo '{"pull_request":{"title":"feat: updates from spectrum-tokens-studio-data","user":{"login":"mrcjhicks"}}}' > test-event.json
act pull_request --eventpath test-event.json -W .github/workflows/enhance-sync-pr.yml --dryrun
```

### Test Release Workflows

```bash
# Test release workflow
act push -W .github/workflows/release.yml --dryrun

# Test snapshot release
act workflow_dispatch -W .github/workflows/release-snapshot.yml --dryrun
```

### Test Token Diff Workflows

```bash
# Test token diff for Spectrum 2
act workflow_dispatch -W .github/workflows/tdiff-spectrum2.yml --dryrun
```

## 🔧 Troubleshooting

### Docker Issues

- Ensure Docker Desktop is running
- Check with: `docker --version && docker ps`

### Act Issues

- Verify installation: `act --version`
- Check configuration: `cat .actrc`

### Workflow Issues

- Use `--verbose` flag for detailed output
- Use `--dryrun` to see execution plan without running

## 💡 Best Practices

1. **Always test in dry-run first**: `--dryrun` flag
2. **Use specific workflow files**: `-W .github/workflows/filename.yml`
3. **Test with realistic event data**: Custom event JSON files
4. **Iterate locally**: Fix issues before pushing to GitHub
5. **Use Claude**: Ask for help testing complex scenarios

## 🎉 Benefits

- **No more trial and error** in GitHub CI/CD
- **Instant feedback** on workflow changes
- **Test complex scenarios** with custom event data
- **Debug issues locally** before they reach production
- **Validate custom actions** in isolation

## 🔄 Workflow Development Process

1. **Edit workflow file**
2. **Ask Claude to test it** or run `act` command
3. **Fix any issues locally**
4. **Test with different scenarios**
5. **Commit and push** with confidence

---

_Generated on $(date) - Your GitHub Actions testing environment is ready!_
