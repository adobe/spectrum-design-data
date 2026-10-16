<!-- Copyright 2026 Adobe. All rights reserved. -->

# `.ai/` — shared AI resources

Single source of truth for rules and skills used by Claude Code, Cursor, and GitHub Copilot.

| Path                    | Purpose                                                                     |
| ----------------------- | --------------------------------------------------------------------------- |
| `.ai/rules/*.md`        | Scoped rules (`description` and comma-separated `globs` frontmatter)        |
| `.ai/skills/*/SKILL.md` | Skills                                                                      |
| `.ai/inventory.json`    | Audience, lifecycle, publication, and `llms.txt` manifest for every project |
| `.ai/scripts/`          | `sync`, `inventory`, `llms`, `validate`                                     |

## Workflow

* `pnpm ai:sync` generates `.github/instructions/*.instructions.md`, `.cursor/rules/*.mdc`, `docs/repo-index.md`, and per-package `llms.txt`, and links `.claude/rules`, `.claude/skills`, and `.cursor/skills` to `.ai/`.
* `pnpm ai:check` verifies that sources are valid and generated files are current. It runs in CI as `root:ai-check`.
* Never edit generated files. Change the source and re-run sync.
* Root and nested `AGENTS.md` files are hand-written. `CLAUDE.md` files must only point to `AGENTS.md`.
* Persistent lessons go in beads (`bd remember`), not in files here.
