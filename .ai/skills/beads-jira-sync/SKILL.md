---
name: beads-jira-sync
description: >-
  Syncs beads issues to the Jira DNA project with import-beads.js from the standalone
  beads-jira-import repo. Covers dry-run, state-file backup, live sync, initiative labels on
  epics, and bead/Jira key lookup. Use for the weekly beads to Jira sync, linking an epic to a
  DNA initiative, or finding the Jira key for a bead id.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Beads → Jira sync

`import-beads.js` lives in the local `beads-jira-import` checkout (no remote; extracted from `adobe-mcp-servers` `src/corp-jira/scripts/`). Fix bugs in the TypeScript source and rebuild `dist/` before a live sync. Below, `$BJI` is that checkout (e.g. `~/Projects/beads-jira-import`).

## Safety rules

* **Never run `--help`.** Unknown flags are ignored and the script falls through to a LIVE sync.
* Safe modes: `--lookup <ids>`, `--dry-run`, `--discover`. Check the argument parser before using any other flag.
* Always `--dry-run` first, and back up `$BJI/scripts/beads-jira-map.json` before a live sync.
* Known issue: `--dry-run` can fail with ENOBUFS when the beads export exceeds 1 MiB (bead `cr71`).
* Known issue: nested epics with both a parent and an initiative label overwrite the same Parent Link field (bead `vd61`).

## Weekly sync

1. `bd dolt pull` so the export is current.
2. Back up state: `cp -f $BJI/scripts/beads-jira-map.json $BJI/scripts/beads-jira-map.json.bak`.
3. Dry run: `node $BJI/dist/scripts/import-beads.js --dry-run`. Review the preview with the user.
4. After approval, run live: `node $BJI/dist/scripts/import-beads.js`.
5. Report created/updated issues and any diagnostics.

## Sprints

The sync assigns sprints itself (`operations/sprints.ts`): closed beads go to the sprint containing their close date, `in_progress` beads go to the active sprint, open beads stay in the backlog. Jira rejects adds to closed sprints, so beads closed in an already-closed sprint are skipped. The board is the project's first scrum board, or `BEADS_JIRA_BOARD_ID`. Open and close sprints in Jira first so the active sprint is the current one.

## Initiative linking

Only **Epics** link to Initiatives, through the `initiative:DNA-XXXX` label. One initiative per epic; omit the label if none fits.

* New epic: `bd create -t epic -l initiative:DNA-XXXX ...`
* Existing epic: `bd label add <epic-id> initiative:DNA-XXXX`

Initiatives:

| Key      | Theme                                  |
| -------- | -------------------------------------- |
| DNA-1522 | Adaptive support per platform          |
| DNA-1520 | Multi-platform governance              |
| DNA-1516 | Metrics                                |
| DNA-1740 | Per-platform usage baselines           |
| DNA-1741 | Connect Web/iOS/Android to design data |
| DNA-1747 | AI-authored Spectrum 2 code            |
| DNA-1748 | Documentation                          |
| DNA-1796 | Design data authoring                  |

## Lookup

`node $BJI/dist/scripts/import-beads.js --lookup <bead-id or DNA-key>`

Ad hoc Jira work (not bulk sync) uses the `corp-jira` MCP server tools.
