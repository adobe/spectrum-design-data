---
"s2-tokens-viewer": patch
---

Improve S2 tokens viewer self-containment and deployment

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
