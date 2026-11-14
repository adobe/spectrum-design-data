---
"@adobe/design-data-mcp": patch
---

Publish the Claude Desktop extension (`design-data.mcpb`) with each release.

- **Release workflow**: after `changeset publish`, builds and validates the bundle and attaches
  it to the `@adobe/design-data-mcp@<version>` release and to a rolling `design-data-mcpb`
  release. It was documented as downloadable but no release had the file.
- **README**: links the rolling release (one URL that never changes) and adds a first-run check.
- The step runs last in the job, so a failure cannot hold back the CLI binaries or Homebrew.
