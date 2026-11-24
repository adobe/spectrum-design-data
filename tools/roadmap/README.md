<!-- Copyright 2026 Adobe. All rights reserved. -->

# Beads roadmap

A live roadmap of open beads epics, ordered by dependency and priority. Read-only; it runs `bd list --all --json`.

- `roadmap.mjs`: standalone page. Run `node tools/roadmap/roadmap.mjs [--port 4747]` and open the printed URL. Epics with a due date (`bd update --due`) or a `target:YYYY-MM` label also appear in a Scheduled section.
- `paseo-plugin/`: the same view as a Paseo screen (sidebar item "Roadmap"), with live updates and a Discuss action that messages the orchestrator agent. Install with `paseo plugin install $PWD/tools/roadmap/paseo-plugin` (Paseo 0.16 or newer, plugins enabled), after `npm install` inside it. Typecheck with `npm run typecheck`.

Columns and groups show dependency order, not dates. To make the roadmap match a plan, record it in beads: `bd dep add` for order, `bd update --priority` for sequence.
