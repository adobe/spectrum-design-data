# @adobe/optimized-diff

High-performance deep object diff algorithm with significant performance improvements over generic libraries.

## Overview

`@adobe/optimized-diff` provides **60-80% performance improvements** over generic diff libraries like `deep-object-diff` while maintaining full API compatibility. It's optimized for comparing complex JavaScript objects with nested structures and large datasets.

## Features

- **🚀 High Performance**: 2-3x faster than generic diff libraries
- **🎯 Deep Object Optimized**: Designed for complex nested object structures
- **📦 Drop-in Replacement**: Compatible with `deep-object-diff` API
- **🔍 Zero Dependencies**: No external runtime dependencies
- **📏 Linear Scaling**: O(n) complexity with predictable performance
- **💾 Memory Efficient**: No unnecessary object cloning or sanitization

## Performance

Benchmarked against real-world structured data (2,282 objects):

```
Original (deep-object-diff): 37.40ms average
Optimized implementation:     13.57ms average
Improvement: 63.7% faster (2.8x speedup)
```

## Installation

Within the Spectrum Tokens monorepo:

```bash
pnpm add @adobe/optimized-diff
```

## API

### Basic Usage

```javascript
import {
  detailedDiff,
  diff,
  addedDiff,
  deletedDiff,
  updatedDiff,
} from "@adobe/optimized-diff";

const original = {
  user: {
    name: "John Doe",
    preferences: {
      theme: "dark",
      notifications: true,
    },
    tags: ["admin", "user"],
  },
  settings: {
    language: "en",
  },
};

const updated = {
  user: {
    name: "John Smith", // changed
    preferences: {
      theme: "light", // changed
      notifications: true,
      timezone: "UTC", // added
    },
    tags: ["admin", "user", "premium"], // changed
  },
  settings: {
    language: "en",
  },
  metadata: {
    // added
    lastLogin: "2024-01-15",
  },
};

// Get detailed diff with categorized changes
const result = detailedDiff(original, updated);
console.log(result);
// {
//   added: {
//     user: { preferences: { timezone: "UTC" } },
//     metadata: { lastLogin: "2024-01-15" }
//   },
//   updated: {
//     user: {
//       name: "John Smith",
//       preferences: { theme: "light" },
//       tags: ["admin", "user", "premium"]
//     }
//   },
//   deleted: {}
// }
```

### Available Functions

```javascript
// Detailed diff with categorized results
const detailed = detailedDiff(original, updated);

// Combined diff (all changes in one object)
const combined = diff(original, updated);

// Only added properties
const added = addedDiff(original, updated);

// Only deleted properties
const deleted = deletedDiff(original, updated);

// Only updated properties
const updated = updatedDiff(original, updated);
```

### Engine Object

```javascript
import OptimizedDiffEngine from "@adobe/optimized-diff";

// Access all methods through the engine
const result = OptimizedDiffEngine.detailedDiff(original, updated);

// Engine metadata
console.log(OptimizedDiffEngine.name); // "optimized"
console.log(OptimizedDiffEngine.version); // "1.0.0"
console.log(OptimizedDiffEngine.description); // "High-performance diff..."
```

## Algorithm Details

The optimization provides performance improvements through:

1. **Set-based Key Lookups**: O(1) key existence checks instead of O(n) iterations
2. **Early Reference Checking**: Skip expensive deep comparison for identical object references
3. **Structure-aware Logic**: Optimized for common nested object patterns and structures
4. **Efficient Memory Usage**: No unnecessary object cloning or sanitization steps

## Benchmarking

Run the included benchmark to test performance on your system:

```bash
cd tools/optimized-diff
pnpm run benchmark
```

Or use moon:

```bash
moon run optimized-diff:benchmark
```

Sample benchmark output:

```
📊 Testing with 1000 objects:
   Dataset: 1000 objects, 300 changes (30.0%)

   ⚡ Optimized Diff:
      Average: 8.23ms
      Range: 7.85ms - 8.92ms

   📈 deep-object-diff:
      Average: 24.67ms
      Range: 23.11ms - 26.43ms

   🎯 Performance Improvement:
      66.6% faster (3.0x speedup)
      Time saved: 16.44ms per operation
```

## Testing

Run the test suite:

```bash
cd tools/optimized-diff
pnpm test
```

Or use moon:

```bash
moon run optimized-diff:test
```

## Technical Details

### Compatibility

Fully compatible with `deep-object-diff` API:

- Same function signatures
- Same return value structures
- Same edge case handling
- Same array processing (as objects with numeric keys)

### Limitations

- Optimized for object-heavy workloads (structured data, configurations)
- Not optimized for deeply nested arrays or complex circular references
- Focuses on common nested object patterns rather than extremely dynamic structures

### When to Use

**Best for:**

- Large structured object comparisons
- Configuration file diffing
- JSON data comparisons
- Performance-critical diff operations
- Nested data with consistent patterns

**Consider alternatives for:**

- Simple object comparisons (overhead not worth it)
- Highly dynamic object structures
- Complex circular reference handling

## Integration Examples

### With Data Comparison Tools

```javascript
import { detailedDiff } from "@adobe/optimized-diff";

// Replace generic diff libraries
function compareData(original, updated) {
  const changes = detailedDiff(original, updated);
  // ... rest of comparison logic
}
```

### Migration from deep-object-diff

```javascript
// Before
import { detailedDiff } from "deep-object-diff";

// After
import { detailedDiff } from "@adobe/optimized-diff";

// API is identical - no code changes needed!
```

## License

Apache-2.0

## Contributing

This package is part of the Spectrum Tokens monorepo. See the main repository for contribution guidelines.
