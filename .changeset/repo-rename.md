---
"@adobe/spectrum-tokens": major
"@adobe/spectrum-component-api-schemas": major
"@adobe/spectrum-design-data-mcp": patch
---

BREAKING CHANGE: Repository renamed from spectrum-tokens to
spectrum-design-data

**Breaking Changes:**
- JSON Schema `$id` URIs changed (spectrum-tokens → spectrum-design-data)
- External tools referencing schemas by `$id` must update references

**Changes:**
- Updated all GitHub repository and Pages URLs
- Updated schema base URIs to maintain consistency

**Note:** NPM package names unchanged. GitHub redirects are in place.

