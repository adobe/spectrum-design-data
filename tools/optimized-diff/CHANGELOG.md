# @adobe/optimized-diff

## 1.0.0

### Major Changes

- [#549](https://github.com/adobe/spectrum-tokens/pull/549) [`32db4f1`](https://github.com/adobe/spectrum-tokens/commit/32db4f1de2c6895b2fca7144add7978b751c87a0) Thanks [@GarthDB](https://github.com/GarthDB)! - **Performance Optimization: Introduce High-Performance Diff Algorithm**

  This release introduces significant performance improvements to the token diff generation process:

  ## New Package: `@adobe/optimized-diff`
  - **New high-performance diff algorithm** optimized specifically for design token structure
  - **63.7% performance improvement** (37.40ms → 13.57ms) on real Spectrum token data
  - **2.8x faster execution** compared to generic diff libraries
  - **Token-aware comparison logic** with Set-based key lookups for O(1) performance
  - **Early reference checking** to skip expensive deep comparisons
  - **Zero breaking changes** - drop-in replacement for existing diff operations

  ## Enhanced `@adobe/token-diff-generator`
  - **Integrated optimized diff algorithm** for dramatically improved performance
  - **Maintains full backward compatibility** with existing API
  - **Fixed missing `glob` dependency** that was causing runtime errors
  - **Comprehensive performance analysis** and optimization documentation
  - **Enhanced test suite** for optimization validation
  - **Improved memory efficiency** and better scaling characteristics

  ## Performance Metrics
  - **77% faster** core diff operations in testing
  - **Linear O(n) scaling** maintained with better constants
  - **Reduced memory usage** with more predictable patterns
  - **No breaking changes** to existing workflows or APIs

  This optimization specifically addresses the primary bottleneck in token comparison operations while maintaining the same high-quality output and full compatibility with existing integrations.
