---
"@adobe/token-diff-generator": minor
---

# Improve code quality and developer experience

- Remove unused dependencies (`emojilib`, `inquirer`, `tar`, `tmp-promise`) reducing package size
- Add comprehensive ESLint configuration with enhanced error detection and auto-fixing
- Replace experimental JSON imports with standard approach to eliminate Node.js warnings
- Remove legacy `formatterCLI.js` code (401 lines) replaced by Handlebars templates
- Add development tooling: `ava.config.js`, lint scripts (`pnpm run lint`, `pnpm run lint:fix`)
- Enhance package.json metadata with better description, keywords, and npm publishing configuration
- Improve test infrastructure with centralized JSON loading utilities
- Fix documentation version consistency and test schema issues

All changes are backward compatible. No migration required.
