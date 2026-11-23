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

Files live in the test folder `https://www.figma.com/files/1177024566520626109/folder/657068416` (project `657068416`, plan `organization::1177024566520626109`). `tools/figma-spec-plugin/figma-files.json` is the registry: component to `fileKey`, the hash of what was last generated, and the date. It is the authoritative list of existing files. Never edit it by hand; use `plan.mjs record`.

## Steps

1. Build the CLI if needed (`moon run sdk:build`), then plan:
   `node tools/figma-spec-plugin/plan.mjs plan <component>... -o <dir>` (or `--all`). Pass `--text-metrics <file>` with the Adobe Fonts kit table from `node tools/platform-capture/adapters/text-metrics/cli.mjs` (it writes `tools/platform-capture/.cache/text-metrics/adobe-clean-spectrum-vf.json`); that makes widths S2-accurate (the default Source Sans 3 table is about 6.6% wide). The registry holds kit-table hashes, so run the plan with the table too. Never commit or upload the table. The table differs by platform and Chrome version (`Test` at 700 and 14 px: 23.673 on macOS, 23.665 on Linux), so a kit hash only reproduces on the same platform: regenerate on macOS, and do not check kit hashes in CI. When a plan item's `note` says the table differs from the registered stamp, that is the cause, not a data change. `<dir>/plan.json` lists, per component, `action` (`create`, `update` or `current`), `fileKey`, `fileName` and the ordered payload files. Skip `current`.
2. **create**: `figma-files.json` is the authoritative list of existing files; no tool can list a Figma folder with the current token. If the registry has no entry, create the file; afterwards, a person checks the test folder for duplicates. Call `create_new_file` with `fileName`, `planKey` (from the plan), `editorType: "design"` and `projectId`. Use the returned `file_key`.
3. Call `create_session` with the `fileKey`, then pass its `sessionId` on every call.
4. Send each payload file's contents as `code` in one `use_figma` call, **in order**, one file at a time (the Figma MCP is rate limited; back off on errors). Each call returns step results; the last returns `finish` with `blocksRendered`.
5. Verify: `blocksRendered` equals the sum of blocks in `<dir>/sheets/<component>.json`, there is exactly one root frame named `fileName` on the first page, and a `get_screenshot` of one block looks right.
6. Record: `node tools/figma-spec-plugin/plan.mjs record <component> --hash <hash from plan.json> --text-metrics <the table you planned with> [--file-key <key>]`. The entry then carries a `textMetrics` stamp (family, `test700At14px`, date, platform; never the table or the kit URL). Commit `figma-files.json`.

## Rules

* Designers annotate on the **Notes** page, never on the generated page. The first payload creates a page named "Notes" if the file has none (new or existing files) and nothing ever writes to it. The renderer removes only the previous top-level root frame with its own name on its own page. The cover says: "Generated: do not edit this page. Add notes on the Notes page."
* A failed run leaves the previous render in place (the new one is built as "<name> (building)"). Fix the cause and rerun all payloads from the first.
* Never call `setPluginData` or `figma.notify`; `use_figma` rejects them. The payloads already avoid both.
* Only write to files in the test folder. Do not touch the POC variables file (`rNdFQYqXO2Nd3zMWnQD5U4`) from this workflow.
* If Adobe Clean Spectrum VF cannot load, the first step returns a `warning` and text is set in Inter; report it.
* Never commit, upload or print the table; it stays in `.cache/` (git-ignored). Only the stamp goes in the registry.
* Do not regenerate the whole set at once: do about ten files per batch.
