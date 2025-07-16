# s2-tokens-viewer

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
