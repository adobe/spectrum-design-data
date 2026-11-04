---
name: figma-spec-sheets
description: >-
  Generates or refreshes the per-component spec files in Figma from design-data sheets, with
  the Figma MCP (use_figma). Covers planning stale files, creating missing files in the test
  folder, sending payloads in order, verifying and recording the result. Use when asked to
  generate, regenerate or update Figma spec files or spec sheets.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Generate Figma spec files

Generated files are **generated only**: every run replaces the whole spec frame and ignores hand edits. Load the Figma `figma-use` skill first (`skillNames: "figma-use"` on every `use_figma` call; prefix `resource:` if it came from an MCP resource).

Files live in the test folder `https://www.figma.com/files/1177024566520626109/folder/657068416` (project `657068416`, plan `organization::1177024566520626109`). `tools/figma-spec-plugin/figma-files.json` is the registry: component to `fileKey`, the hash of what was last generated, and the date. Never edit it by hand; use `plan.mjs record`.

## Steps

1. Build the CLI if needed (`moon run sdk:build`), then plan:
   `node tools/figma-spec-plugin/plan.mjs plan <component>... -o <dir>` (or `--all`). `<dir>/plan.json` lists, per component, `action` (`create`, `update` or `current`), `fileKey`, `fileName` and the ordered payload files. Skip `current`.
2. **create**: look in the folder for a file named `fileName` first (a lost registry entry must not duplicate files). If none, call `create_new_file` with `fileName`, `planKey` (from the plan), `editorType: "design"` and `projectId`. Use the returned `file_key`.
3. Call `create_session` with the `fileKey`, then pass its `sessionId` on every call.
4. Send each payload file's contents as `code` in one `use_figma` call, **in order**, one file at a time (the Figma MCP is rate limited; back off on errors). Each call returns step results; the last returns `finish` with `blocksRendered`.
5. Verify: `blocksRendered` equals the sum of blocks in `<dir>/sheets/<component>.json`, there is exactly one root frame named `fileName` on the first page, and a `get_screenshot` of one block looks right.
6. Record: `node tools/figma-spec-plugin/plan.mjs record <component> --hash <hash from plan.json> [--file-key <key>]`. Commit `figma-files.json`.

## Rules

* A failed run leaves the previous render in place (the new one is built as "<name> (building)"). Fix the cause and rerun all payloads from the first.
* Never call `setPluginData` or `figma.notify`; `use_figma` rejects them. The payloads already avoid both.
* Only write to files in the test folder. Do not touch the POC variables file (`rNdFQYqXO2Nd3zMWnQD5U4`) from this workflow.
* If Adobe Clean Spectrum VF cannot load, the first step returns a `warning` and text is set in Inter; report it.
* Do not regenerate the whole set at once: do about ten files per batch.
