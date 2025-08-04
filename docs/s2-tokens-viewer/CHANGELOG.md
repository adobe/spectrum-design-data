# s2-tokens-viewer

## 0.1.2

### Patch Changes

- [#544](https://github.com/adobe/spectrum-tokens/pull/544) [`18dc0e1`](https://github.com/adobe/spectrum-tokens/commit/18dc0e12537e73d7290ae9b227754b5240807cf3) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix moon.yml command chaining syntax for newer moon version

  Updated command chaining in moon.yml tasks to use proper shell syntax instead of && as array elements. This resolves issues with the viewer:export task failing after moon version update.

## 0.1.1

### Patch Changes

- [#533](https://github.com/adobe/spectrum-tokens/pull/533) [`27fe5e4`](https://github.com/adobe/spectrum-tokens/commit/27fe5e44fed13b7b1fddd02f614251cc47c4f8eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Improve S2 tokens viewer self-containment and deployment

  **Enhancements:**
  - Add workspace dependency on `@adobe/spectrum-tokens` package
  - Add prepare script to automatically copy token files locally
  - Update file paths to use relative paths instead of absolute paths
  - Make viewer fully self-contained with local token files

  **Technical Changes:**
  - Updated `package.json` to include workspace dependency and prepare script
  - Modified `index.html` to load token files from relative paths (`packages/tokens/src/`)
  - Added local copies of all Spectrum 2 token JSON files for standalone operation

  These changes make the S2 tokens viewer easier to deploy and more portable, eliminating dependencies on external file paths while maintaining full functionality.
