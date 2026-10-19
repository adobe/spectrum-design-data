---
"@adobe/design-data-agent-mcp": patch
---

Document platform configuration and CLI distribution (h890.3).

<!-- Copyright 2026 Adobe. All rights reserved. -->

- **tools/design-data-agent-mcp/README.md**: catalogs come from
  `design-data catalog export`, which needs a CLI newer than 0.12.1.
- **sdk/cli**: version 0.13.0 so `catalog export` ships; README drops the
  unpublished `cargo install` path and documents platform selection.
