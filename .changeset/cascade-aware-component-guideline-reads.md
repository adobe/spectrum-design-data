---
"@adobe/design-data-agent-mcp": patch
---

Honor the active cascade dataset when reading components and guidelines.

- **tools/design-data-agent-mcp**: route component, relationship, and guideline reads
  through the resolved cascade while preserving the embedded fallback.
