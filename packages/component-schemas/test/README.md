# Component Schemas Testing

This directory contains comprehensive tests for the component-schemas package.

## Test Structure

### Core Tests

- `index.test.js` - Tests for the main API functions
- `componentSchemaValidator.test.js` - Legacy schema validation tests

### New Test Suite

- `schema-validation.test.js` - Comprehensive schema validation using test utilities
- `integration.test.js` - Integration tests for full workflow
- `performance.test.js` - Performance benchmarks
- `utils/test-helpers.js` - Shared test utilities

## Running Tests

### Using Moon (Recommended)

```bash
# Run all tests
moon run component-schemas:test

# Run specific test suites
moon run component-schemas:test-schema-validation
moon run component-schemas:test-integration
moon run component-schemas:test-performance

# Run with coverage
moon run component-schemas:test-coverage

# Watch mode
moon run component-schemas:test-watch
```

## Test Categories

### 1. Schema Validation Tests

- Validates all component schemas against the base component definition
- Ensures all examples in schemas are valid
- Checks that type schemas are valid JSON Schema
- Verifies required metadata is present

### 2. Integration Tests

- Tests the full workflow of schema loading and processing
- Validates API function behavior with real data
- Ensures data consistency across functions
- Tests error handling and edge cases

### 3. Performance Tests

- Benchmarks function execution times
- Monitors memory usage
- Tests concurrent operations
- Ensures performance meets requirements

## Test Utilities

The `utils/test-helpers.js` file provides common utilities:

- `readJSON()` - Read and parse JSON files
- `getSchemaFiles()` - Get schema files using glob patterns
- `createAjvInstance()` - Create configured Ajv instance
- `validateSchema()` - Validate schemas with detailed error reporting
- `validateExamples()` - Validate examples in schemas

## Coverage

Test coverage includes:

- ✅ All exported functions
- ✅ Schema validation logic
- ✅ Error handling
- ✅ Edge cases
- ✅ Performance benchmarks

## Adding New Tests

1. Create test file in the appropriate category
2. Use test utilities from `utils/test-helpers.js`
3. Add descriptive test names and assertions
4. Update this README if adding new test categories
5. Consider adding performance tests for new functions

## Best Practices

- Use descriptive test names that explain the expected behavior
- Group related tests together
- Use test utilities for common operations
- Include both positive and negative test cases
- Add performance tests for new functions
- Keep tests focused and independent
