# Spectrum Tokens — Claude Code Rules

<!-- Maintainer note: keep this file under 200 lines. Code samples and per-filetype
     conventions live in .claude/rules/. Per-package details live in each package's own
     CLAUDE.md (load on demand — not a per-turn cost). -->

## Tooling Invariants

* **pnpm\@10.17.1** — never use npm or yarn; use `pnpm` for installs and scripts
* **moon** — `moon run <task>` for all defined tasks; `moon query projects` to survey the graph
* **AVA** — all JS/TS tests (`test/**/*.test.js`); each package has its own `ava.config.js`
* **changesets** — `pnpm changeset` for every user-facing version bump; never edit versions manually
* **commitlint** — conventional commits enforced; format: `type(scope): description`
  * Types: `feat` `fix` `docs` `style` `refactor` `test` `chore`
  * Breaking: append `!` or add `BREAKING CHANGE:` footer
* **Node.js** \~20.12 · **ESM** throughout (`"type": "module"`)

## Monorepo Layout

```
packages/   — core libraries (tokens, design-data, design-data-spec, component-schemas, …)
tools/      — internal dev tooling (~20 packages)
docs/       — documentation sites and explorers
sdk/        — Rust workspace (crates: core, cli, tui, wasm)
```

Per-package build commands, test commands, and layout details live in each package's own
`CLAUDE.md` — they load on demand, not at session start.

## Changeset Rules *(CI-enforced)*

* **Bump level**: `patch` = bug fix; `minor` = additive or validation-behavior change; `major` = breaking
* **Body ≤ 20 lines** (CI linter enforces). Verify before committing:
  ```
  node tools/changeset-linter/src/cli.js check --fail-on-warnings
  ```
* One intro sentence + one bullet per changed artifact. Rationale → PR description, not changeset.
* Format:
  ```
  Short summary (closes #NNN).

  - **path/to/file**: what changed and why it matters.
  ```

## Copyright & License

Every new file gets: `Copyright YYYY Adobe. All rights reserved.` with the **current year**.
Comment style matches language: `//` (Rust/JS/TS), `#` (YAML/moon.yml), block comment (C-style).
License: Apache-2.0.

## Testing

* Run all tests: `moon run test`
* Single package: `pnpm --filter <package-name> test`
* Rust: `moon run sdk:test` (uses `cargo test --workspace`)

## GitHub & PRs

* Use `gh` CLI for all GitHub operations (`gh pr view`, `gh issue view`, `gh pr checks`)
* PRs: read `.github/PULL_REQUEST_TEMPLATE.md`, fill every section, `gh pr create --body-file <file>`
* Link related issues; describe how changes were tested

## When Making Changes

1. `moon run test` before committing
2. `pnpm changeset` for any user-facing change
3. `node tools/changeset-linter/src/cli.js check --fail-on-warnings` after writing changeset
4. Conventional commit message (`feat(tokens): …`, `fix(diff): …`, etc.)
5. PRs use the repo template — never a blank body

## Adding New Packages

1. Create directory under `packages/`, `docs/`, or `tools/`
2. `package.json` with `"type": "module"`, correct `engines.node`, `packageManager` field
3. `moon.yml` with task definitions (platform: node)
4. `ava.config.js` for testing
5. Add to `pnpm-workspace.yaml` if a new glob is needed

## Code Style

* 2-space indentation · single quotes · trailing commas in multiline objects/arrays
* Prefer `const` over `let`; never `var`
* `async/await` over `.then()` chains
* Template literals for interpolation
* Full patterns and anti-patterns → `.claude/rules/javascript.md` (loads when JS/TS files are open)

## Jira Initiative Tracking

Beads sync to Jira (`DNA` project) via a script in the separate `adobe-mcp-servers`
repo (`src/corp-jira/scripts/import-beads.ts`), run manually/weekly. Jira only links
**Epics** to Initiatives (no such field for Story/Task), via a `Child-Issue` link —
the sync creates this automatically from a bd label.

* **New epic tracking OKR-level work**: `bd create -t epic -l initiative:DNA-XXXX ...`
* **Existing epic** (including closed ones): `bd label add <epic-id> initiative:DNA-XXXX`
* Current initiatives (all FY26 OKR-driven, all In Progress):
  * `DNA-1522` — adaptive support per platform
  * `DNA-1520` — multi-platform improvements / governance
  * `DNA-1516` — metrics capture and analysis
  * `DNA-1740` — per-platform token usage baselines
  * `DNA-1741` — connect Web/iOS/Android to design data
  * Pick whichever the epic's OKR-level goal matches; leave untagged if none fit
    rather than forcing a guess — a new Initiative may need to be created instead.
* Non-epic beads (task/feature/bug) don't need the label — only the epic level links
  to an Initiative. Optionally cascade for local filtering only:
  `bd label propagate <epic-id> initiative:DNA-XXXX` (doesn't affect Jira).

## Code Intelligence Tools (MCP)

Five MCP servers are configured in `.mcp.json` (committed, portable — uses `${PWD}` for
repo-relative paths):

* **Scout** — fuzzy front door for the whole repo. Use for: semantic search over tokens/schemas/docs, cross-package references ("what uses this token?"), doc knowledge graph, "find code about X" across TS/JS/JSON/Rust.
* **Ferrograph** — precise back end for `sdk/` Rust crates only. Use for: exact call graph, blast radius ("what breaks if I change this?"), dead code, ownership/`&`/`&mut`/`unsafe` edges, raw Datalog queries. Deterministic — no LLM tokens, no approximations.
* **tuiwright** — TUI snapshot/headless testing for the product TUI. Requires a one-time install: `cargo install --path <path-to-tuiwright-source>/crates/tuiwright-mcp` (source at <https://github.com/GarthDB/tuiwright>).
* **design-data** — query token/component data from the local SDK build via `@adobe/design-data-agent-mcp`.
* **figma** — Figma desktop plugin bridge (must have the Figma desktop app running).

**Routing rule:** when asking a Rust structural question (impact, callers, dead code), prefer ferrograph's answer over Scout's — it's exact. For everything else (tokens, docs, TS, "what is X"), use Scout. The two cover different ground and complement each other.
