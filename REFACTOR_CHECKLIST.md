# Token Diff Generator Refactor Checklist

## Critical API Contracts to Maintain

### ✅ Main Export Function

- [ ] `tokenDiff(original, updated)` signature unchanged
- [ ] Return object structure identical:
  ```javascript
  {
    renamed: {},     // { "new-name": { "old-name": "old-name" } }
    deprecated: {},  // { "token": { deprecated: true, deprecated_comment: "..." } }
    reverted: {},    // { "token": { deprecated: false } }
    added: {},       // { "token": { ...tokenData } }
    deleted: {},     // { "token": { ...tokenData } }
    updated: {       // Nested structure for property changes
      added: {},     // { "token": { changes: [...] } }
      deleted: {},
      renamed: {},
      updated: {}
    }
  }
  ```

### ✅ CLI Interface

- [ ] `tdiff` binary command unchanged
- [ ] All CLI options preserved:
  - `--otv/--old-token-version`
  - `--ntv/--new-token-version`
  - `--otb/--old-token-branch`
  - `--ntb/--new-token-branch`
  - `-l/--local`
  - `-n/--token-names`
  - `-r/--repo`
  - `-g/--githubAPIKey`
  - `-f/--format`
  - `-t/--template`
  - `--template-dir`
  - `-o/--output`
  - `-d/--debug`

### ✅ Package Exports

- [ ] Main export: `"."` → `"./src/lib/index.js"`
- [ ] CLI export: `"./cli"` → `"./src/lib/cli.js"`
- [ ] Binary: `"tdiff"` → `"./src/lib/cli.js"`

### ✅ File Import Functions

- [ ] Default export: `fileImport(tokenNames, version, location, repo, githubAPIKey)`
- [ ] Named export: `loadLocalData(dirName, tokenNames)`
- [ ] Return data format unchanged
- [ ] Error handling behavior identical

### ✅ Template System

- [ ] All existing templates work: `cli`, `markdown`, `json`, `plain`, `summary`
- [ ] All handlebars helpers preserved:
  - `totalTokens`, `totalUpdatedTokens`, `hasKeys`
  - `cleanPath`, `formatDate`
  - Color helpers: `hilite`, `error`, `passing`, `neutral`
  - Text helpers: `bold`, `dim`, `emphasis`
  - Utility helpers: `indent`, `concat`, `quote`
- [ ] Template loading paths unchanged
- [ ] Custom template directory support maintained

## Token-Specific Functionality to Preserve

### ✅ UUID-Based Rename Detection

- [ ] `detectRenamedTokens()` logic preserved
- [ ] UUID matching algorithm unchanged
- [ ] Handles tokens with and without UUIDs

### ✅ Deprecation Handling

- [ ] `detectDeprecatedTokens()` and `detectRevertedTokens()` preserved
- [ ] `deprecated` and `deprecated_comment` properties handled
- [ ] Reverted deprecation detection works

### ✅ Property Change Detection

- [ ] Nested property changes (e.g., `sets.dark.value`)
- [ ] Schema property updates
- [ ] Added/deleted properties within tokens
- [ ] Value type changes

### ✅ Token File Processing

- [ ] Manifest.json loading for remote files
- [ ] Multiple token file merging
- [ ] `src/` prefix handling for local files
- [ ] GitHub API authentication

## Test Compatibility Requirements

### ✅ All Existing Tests Must Pass

- [ ] **238 existing tests** pass without modification
- [ ] Test snapshots remain identical
- [ ] CLI output matches exactly
- [ ] Error messages unchanged

### ✅ Specific Test Categories

- [ ] `tokenDiff.test.js` - Core diff functionality
- [ ] `cli.test.js` - CLI command testing
- [ ] `fileImport.test.js` - File loading workflows
- [ ] `formatterHandlebars.test.js` - Template rendering
- [ ] Edge case handling tests
- [ ] Integration test workflows

### ✅ Performance Requirements

- [ ] Response times maintained or improved
- [ ] Memory usage not significantly increased
- [ ] File processing speed preserved

## Implementation Strategy

### Phase 2A: Preparation

- [ ] Create compatibility test suite
- [ ] Document current behavior thoroughly
- [ ] Identify shared vs token-specific components

### Phase 2B: Gradual Migration

- [ ] Replace shared utilities first (helpers, diff)
- [ ] Migrate file import system
- [ ] Update CLI to use shared base
- [ ] Migrate template system
- [ ] Preserve all token-specific logic

### Phase 2C: Validation

- [ ] Run full test suite continuously
- [ ] Compare outputs with original implementation
- [ ] Performance benchmarking
- [ ] Edge case verification

## Risk Mitigation

### ✅ Breaking Change Prevention

- [ ] Feature flags for testing new implementation
- [ ] Side-by-side output comparison
- [ ] Comprehensive regression testing
- [ ] Rollback plan if issues found

### ✅ Documentation Updates

- [ ] Update README with any internal changes
- [ ] Note any new dependencies
- [ ] Document migration process
- [ ] Update examples if needed

## Success Criteria

✅ **Zero Breaking Changes**: All existing functionality works exactly as before  
✅ **Test Compatibility**: 100% of existing tests pass  
✅ **Output Consistency**: CLI and API outputs are byte-for-byte identical  
✅ **Performance**: No significant performance degradation  
✅ **Maintainability**: Code is cleaner and more maintainable using shared core
