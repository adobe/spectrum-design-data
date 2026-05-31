<!--
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
-->

# AI / MCP video

The "Agent + design-data MCP" slide embeds `agent-mcp.mp4` from this directory.
That file is **not committed** (it's heavy binary, gitignored) — record it
locally:

1. Open Cursor with the `design-data` MCP enabled.
2. Screen-record (e.g. macOS `Cmd+Shift+5`, or QuickTime) while you run the
   primary prompt from [`../../agent-questions.md`](../../agent-questions.md):
   the agent reads the `button` component and resolves the dark-mode background
   with spec citations. Optionally include the stretch `demo-banner` prompt.
3. Export to `agent-mcp.mp4` in this folder (1080p, trimmed to \~60–90s).

Until the file exists, the slide shows a graceful fallback message instead of a
broken player.
