# Act Dependency Monitoring

This guide explains how to monitor `nektos/act` for compatibility changes and ensure your GitHub Actions testing remains stable.

## Why Monitor Act?

External dependencies like `act` can break your tooling when they update:

- **Command syntax changes** - Flags might be renamed or removed
- **Output format changes** - Parsing logic might break
- **Behavioral changes** - Workflows might execute differently
- **Version incompatibilities** - New versions might not support old workflows

## Monitoring Strategy

### 1. Baseline Creation

Create a snapshot of current `act` behavior:

```bash
# Create initial baseline
moon run act-testing-mcp:compatibility-baseline
```

This captures:

- Act version information
- Available command flags
- Workflow parsing behavior
- Error patterns
- Docker integration status

### 2. Regular Compatibility Checks

Run compatibility checks to detect changes:

```bash
# Quick compatibility check
moon run act-testing-mcp:compatibility-check

# Detailed compatibility report
moon run act-testing-mcp:compatibility-report
```

### 3. Automated Testing

The compatibility tests run as part of your regular test suite:

```bash
# Includes compatibility tests
moon run act-testing-mcp:test
```

## Compatibility Tests

### Current Test Coverage

- ✅ **Version command** - Ensures `act --version` still works
- ✅ **Help output** - Verifies essential flags are still available
- ✅ **List parsing** - Confirms workflow discovery works
- ✅ **Error handling** - Validates error responses are consistent
- ✅ **Dry run behavior** - Tests non-destructive execution
- ✅ **Environment variables** - Confirms `--env` flag works
- ✅ **Docker integration** - Validates Docker connectivity
- ✅ **Version compatibility** - Checks version ranges

### Test Philosophy

- **Fast execution** - Tests complete in under 10 seconds
- **Environment tolerant** - Works with or without full setup
- **Focused on compatibility** - Tests behavior changes, not full execution
- **Clear failure modes** - Distinguishes between environment issues and compatibility problems

## When Act Updates

### Version Updates

1. **Check compatibility**:

   ```bash
   moon run act-testing-mcp:compatibility-check
   ```

2. **Review differences**:

   ```bash
   moon run act-testing-mcp:compatibility-report
   ```

3. **Update baseline** if compatible:
   ```bash
   moon run act-testing-mcp:compatibility-baseline
   ```

### Breaking Changes

If compatibility tests fail:

1. **Review the specific failure** - Check which test failed and why
2. **Check act changelog** - Look for documented breaking changes
3. **Update MCP code** - Adapt to new act behavior if needed
4. **Update tests** - Modify tests if the changes are acceptable
5. **Pin act version** - Consider version pinning if changes are problematic

## Integration with CI/CD

### Local Development

Add to your development workflow:

```bash
# Before committing changes
moon run act-testing-mcp:compatibility-check
```

### CI Pipeline

Consider adding compatibility checks to CI:

```yaml
# In your GitHub Actions workflow
- name: Check Act Compatibility
  run: moon run act-testing-mcp:compatibility-check
```

### Periodic Monitoring

Set up periodic checks:

```bash
# Weekly cron job to check for act updates
0 9 * * 1 cd /path/to/spectrum-tokens && moon run act-testing-mcp:compatibility-check
```

## Troubleshooting

### Common Issues

**"No baseline found"**

- Run `compatibility-baseline` to create initial snapshot

**"Docker not running"**

- Start Docker Desktop or configure Docker daemon
- Some tests will skip gracefully

**"Act not found"**

- Install act: `brew install act`
- Verify installation: `act --version`

**Tests timeout**

- Check Docker memory/CPU limits
- Ensure workflows aren't overly complex

### Debugging

Enable verbose output:

```bash
# Run with debug logging
ACT_LOG_LEVEL=debug moon run act-testing-mcp:compatibility-check
```

Check baseline contents:

```bash
# View current baseline
cat tools/act-testing-mcp/.act-baseline.json
```

## Best Practices

### Development Workflow

1. **Create baseline** when setting up the tool
2. **Check compatibility** before major act usage
3. **Update baseline** after confirming compatibility
4. **Pin act version** in critical environments

### Version Management

- **Development**: Use latest act version, monitor for changes
- **CI/CD**: Pin to tested version, update deliberately
- **Production**: Always use pinned, tested versions

### Documentation

- **Track act version** in your project documentation
- **Document known issues** with specific act versions
- **Share baseline files** across team environments

## Future Enhancements

### Planned Improvements

- **Automated baseline updates** - Update baselines when safe changes detected
- **Integration testing** - Test full workflow execution scenarios
- **Performance monitoring** - Track act execution performance over time
- **Alert system** - Notifications when breaking changes detected

### Contributing

To improve the monitoring system:

1. **Add new test cases** for specific act features you depend on
2. **Enhance error categorization** to better identify issue types
3. **Improve reporting** with more detailed change analysis
4. **Add performance metrics** to track execution time trends

The monitoring system is designed to grow with your needs and catch compatibility issues before they impact your development workflow.
