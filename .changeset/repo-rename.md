---
"@adobe/spectrum-tokens": major
"@adobe/spectrum-component-api-schemas": major
"@adobe/spectrum-design-data-mcp": patch
---

BREAKING CHANGE: Update repository URLs from spectrum-tokens to
spectrum-design-data

The repository has been renamed from `adobe/spectrum-tokens` to
`adobe/spectrum-design-data` to better reflect its expanded scope
beyond just tokens.

**Breaking Changes:**
- JSON Schema `$id` URIs changed (spectrum-tokens → spectrum-design-data)
- Internal schema `$ref` paths changed from absolute to relative
- External tools referencing schemas by `$id` must update their references

**Changes:**
- Updated all GitHub repository URLs (github.com/adobe/spectrum-tokens →
  spectrum-design-data)
- Updated all GitHub Pages URLs (opensource.adobe.com/spectrum-tokens →
  spectrum-design-data)
- Updated schema base URI to maintain consistency
- Git remote origin updated to new repository URL

**Note:** NPM package names remain unchanged. GitHub automatically
redirects git operations from the old URL to the new one. HTTP redirects
are in place for GitHub Pages, but JSON Schema `$id` changes require
manual updates in external tools.

