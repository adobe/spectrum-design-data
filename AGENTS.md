<!-- Copyright 2026 Adobe. All rights reserved. -->

# Agent Instructions

Canonical instructions for every AI tool in this repository. `CLAUDE.md` files only point here. Package-level `AGENTS.md` files add local commands; [docs/repo-index.md](docs/repo-index.md) lists every project with its audience and lifecycle.

Shared rules and skills live in `.ai/` (see [.ai/README.md](.ai/README.md)). Edit them there, then run `pnpm ai:sync`. Never edit `.github/instructions/`, `.cursor/rules/`, or the `.claude/`/`.cursor/` symlinks by hand.

## Repository Rules

* **pnpm\@10.17.1** only (never npm or yarn); **moon** for tasks (`moon run <project>:<task>`, `moon query projects`); **AVA** for JS tests; Node \~20.12; ESM throughout.
* **Changesets**: `pnpm changeset` for every user-facing change. Body ≤ 20 lines; verify with `node tools/changeset-linter/src/cli.js check --fail-on-warnings`. Details: `.ai/rules/changesets.md`.
* **Conventional commits** (`type(scope): description`, `!` for breaking), enforced by commitlint.
* **Copyright**: every new file starts with `Copyright YYYY Adobe. All rights reserved.` (current year, language-appropriate comment style). License: Apache-2.0.
* **Code style**: 2-space indent, single quotes in docs examples, `const` over `let`, `async/await`. See `.ai/rules/javascript.md`.
* **Tests**: `moon run test` (all), `pnpm --filter <package> test` (one), `moon run sdk:test` (Rust).
* **GitHub**: use the `gh` CLI. Fill every section of `.github/PULL_REQUEST_TEMPLATE.md`; link issues and describe how you tested.
* **Layout**: `packages/` core libraries, `tools/` internal tooling, `docs/` sites and explorers, `sdk/` Rust workspace, `platforms/` incubating platform manifests.

## Maintainer Workflows

The rest of this file covers maintainer tooling (Beads, Scout, Jira, session close). It isn't needed to contribute to a package.

### Issue tracking

This project uses **bd** (beads) for issue tracking. Run `bd prime` for full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd dolt push          # Push beads data to remote
```

## Rules

* Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
* Run `bd prime` for detailed command reference and session close protocol
* Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Scout MCP

Scout MCP is configured for this repository and may be exposed through deferred tool discovery rather than the initial tool catalog.

When doing code review, source discovery, architecture tracing, or any work covered by Scout:

* Use Scout MCP tools directly.
* If a needed `mcp__scout__*` tool is not visible, first use tool discovery with an exact selector such as `select:mcp__scout__review_pr`, `select:mcp__scout__investigate`, or `select:mcp__scout__keyword_search`.
* After selecting a Scout tool, call that MCP tool as the next tool call.
* Do not fall back to the Scout CLI unless Scout MCP discovery fails for the needed tool.

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**

```bash
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**

* `scp` - use `-o BatchMode=yes` for non-interactive
* `ssh` - use `-o BatchMode=yes` to fail instead of prompting
* `apt-get` - use `-y` flag
* `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

1. **File issues for remaining work** — create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) — tests, linters, builds
3. **Update issue status** — close finished work, update in-progress items
4. **Push to remote** — this is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Verify** — all changes committed and pushed

## Jira Initiative Tracking

Beads sync to Jira (`DNA` project) weekly. Use the `beads-jira-sync` skill (`.ai/skills/beads-jira-sync/SKILL.md`) for the sync, initiative labels, the initiative list, and key lookups.

* Only **Epics** link to Initiatives, through the `initiative:DNA-XXXX` label, one per epic.
* **Sprints**: the sync assigns sprints itself. Closed beads go to the sprint containing their close date, `in_progress` beads go to the active sprint, and open beads stay in the backlog. Jira rejects adds to closed sprints, so work closed in an already-closed sprint is skipped.
* Sprints run two weeks on the `Data System Scrum Board` and are opened and closed by hand in Jira. Before a weekly sync, check that the active sprint covers today's date. If it is stale, close it and any sprints that have passed (oldest first), then start the current one, or the sync will file work into the wrong sprint.
* Completing a sprint sets its completion date to the day it was closed, so close stale sprints promptly.
* Ad hoc Jira work uses the `corp-jira` MCP server tools.

## Code Intelligence (MCP)

`.mcp.json` configures Scout, Ferrograph, tuiwright, design-data, figma, and corp-jira.

* **Scout**: semantic search and cross-package references for the whole repo. Run `memory_search` before `investigate`, and `memory_write` after durable findings.
* **Ferrograph**: exact call graph, blast radius, and dead code for `sdk/` Rust only. Its index is at `sdk/.ferrograph`; `cd sdk` before using the CLI.
* Rust structural questions go to Ferrograph; everything else goes to Scout.
* **corp-jira** needs a local `adobe-mcp-servers` checkout; its path in `.mcp.json` is machine-specific.
