---
"@adobe/spectrum-tokens": patch
---

Use dynamic import for prettier in writeJson so the package loads without prettier
when used outside the monorepo (e.g. spectrum-design-data-mcp via npx).
