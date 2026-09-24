---
"@adobe/design-data-agent-mcp": patch
---

Fix broken example calls in read-tool docstrings and the design-data skill.

- **tools/design-data-agent-mcp/src/tools/read.js**: `query_tokens`'s docstring example
  (`category=color`) never worked — replaced with a real filter and a note that
  `component=<id>` is currently unindexed. `resolve_token`'s docstring example
  (`accent-background-color-default`) was a legacyKey-shaped name that never resolves —
  replaced with guidance on the accepted bare-property format and its disambiguation limits.
- **tools/design-data-agent-mcp/skills/design-data/SKILL.md**: same two examples corrected,
  with gotcha notes for both tools.
