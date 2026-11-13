# Spectrum Studio

A parametric design-systems authoring tool for Adobe Spectrum design data. Instead of editing tokens by hand, designers author the system itself: **foundations** (color, typography, spacing, size and more) as formulas with parameters, **modes** that adapt them, and rules that derive the rest. The tool is built for Spectrum's enterprise needs: multi-platform, multimodal and adaptive design.

Everything it produces is data that follows the Spectrum Design Data specification, for use in all Adobe products. It codifies systems-design best practices (modularity, reusability and composability) from primitive tokens all the way through components. It aims to be a one-stop, end-to-end editing experience, from authoring and live preview through change tracking, review and release. See [docs/ROADMAP.md](docs/ROADMAP.md) for direction and status.

It's a client-side web app built with React, Vite and React Spectrum S2.

## Prerequisites

- Node.js 22.12 or newer (Vite 8 needs `^20.19.0 || >=22.12.0`; the monorepo pins 22.12.0)
- pnpm 10.17.1, installed once at the repository root

## Getting started

From the monorepo root, install once, then start the dev server with moon (the repository's standard way to run tasks):

```bash
pnpm install
pnpm moon run spectrum-studio:dev
```

This runs the same script as `pnpm --filter @adobe/spectrum-studio dev`, or `pnpm dev` from this folder. The dev server runs over HTTPS, so your browser may ask you to accept its certificate.

## Install as an app

Spectrum Studio can be installed as a desktop app (a progressive web app). In Chrome or Edge, open the production build (`pnpm build`, then `pnpm preview`, or the hosted site) and choose **Install** in the address bar, or the **Install app** button (desktop icon) in Studio's header. The installed app opens in its own window and works offline.

The header button is hidden inside the installed app. In browsers without an install prompt (Safari, Firefox), or when Chrome has no prompt to offer, it opens a dialog with manual steps instead. Studio never shows install prompts on its own.

To invite someone to install, share a link ending in `#install` (for example `https://<studio-host>/#install`). It opens the install dialog once, with **Install app** and **Maybe later**, then removes `#install` from the address so refreshing doesn't reopen it.

The cloud button in the header shows the app's status: up to date, update available (click to reload into the new version), or offline. Updates otherwise apply the next time you open the app. Run `pnpm test:pwa` after a build to check the install files.

The service worker is off in `pnpm dev`, so the dev server can't be installed. To install it, run `pnpm moon run spectrum-studio:dev-pwa` from the repository root (or `pnpm dev:pwa` from this folder) instead and choose **Install** in the address bar. The installed app only works while the dev server is running. If pages look out of date afterward in `pnpm dev`, open DevTools → Application → Service workers and choose **Unregister**.

## Scripts

Run the `pnpm` commands below from this folder, or from the repository root with `pnpm --filter @adobe/spectrum-studio <script>`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm dev:pwa` | Start the dev server with the service worker on, so it can be installed as an app |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | TypeScript and ESLint checks |
| `pnpm check:test-types` | Type-check every non-browser TypeScript test in bounded batches |
| `pnpm test:ci` | Run the complete non-browser check inventory sequentially |
| `pnpm storybook` | Storybook on port 6006 |
| `pnpm storybook:build` | Build the static Storybook site |
| `pnpm test:e2e:storybook` | Color picker interaction checks in Storybook |

Individual checks are `pnpm test:*` scripts (see `package.json`). Run the narrowest one that covers your change. Checks that fail today are listed in [docs/known-debt.md](docs/known-debt.md).

Moon tasks (`pnpm moon run spectrum-studio:<task>` from the repository root): `typecheck`, `lint`, `test` and `build` run in CI. `dev`, `dev-pwa`, `e2e` and `e2e-storybook` are local only.

### Complete check reports

`pnpm test:ci` includes top-level non-browser tests, performance checks, SDK integrations, TypeScript, ESLint, read-only validation scripts, the analysis CLI, and production, adapter and Storybook builds. It discovers new top-level test files automatically. Browser tests and scripts that rewrite source data are excluded.

Commands run one at a time. A failure does not stop unrelated checks. If a prerequisite fails, its dependent check is reported as blocked. Each command has a four-minute limit; timed-out work is stopped before the next command starts. The final exit code is nonzero if any check fails, times out or is blocked. SDK integrations require the SDK environment described by their individual checks; missing prerequisites are failures, not skips.

The runner writes `results.json` and one log per command under `reports/checks/`. Build outputs go there too, so checking the adapter does not replace the tracked `public/data-vis/data-vis.js`. Use a separate output directory to keep reports from different runs:

```bash
pnpm test:ci --list
pnpm test:ci --only favicon,mode-control-presentation --log-dir /tmp/studio-checks
pnpm test:ci --only 'test-types-*' --log-dir /tmp/studio-test-types
```

`--list` prints commands without running them. `--only` accepts comma-separated check IDs and a trailing `*` for prefix matches. Selecting a check includes its prerequisites; for example, `data-vis-export` first builds a fresh adapter. Interrupting a run stops its active command and marks the remaining selected checks as blocked.

## Project layout

| Path | Contents |
| --- | --- |
| `src/pages/` | Page-level layouts |
| `src/views/` | Content shown in a page's main area (Elements, Preview, Code) |
| `src/panels/` | Editing surfaces and controls |
| `src/components/` | Generic reusable UI and app chrome |
| `src/features/` | Domain models, state, calculations and generation logic |
| `src/data/` | Shipped defaults and the design-data gap register |
| `docs/` | Documentation. Start at [docs/README.md](docs/README.md) |
| `.agents/` | Rules and skills for coding agents |
| `tests/`, `scripts/` | Check scripts and tooling |

## Contributing with an AI coding agent

This project is set up for agentic work. The instructions in [AGENTS.md](AGENTS.md) load automatically in Claude Code and Cursor, and in Copilot through the generated rule in `.ai/rules/spectrum-studio.md`. They give your agent the project map, the working rules, and a pointer to the skill for each area. State your goal and the agent should tell you which part of the roadmap it touches, the recommended approach, and the constraints. You don't need to ask it to analyze the project first.

Rules for agents (scope, test scoping, design-data alignment, change-log parity) are in `AGENTS.md`. Skills live in `.agents/skills/`. The `.claude` and `.cursor` folders are symlinks to `.agents/`.

## Developer tools

In development, the Blueline accessibility overlay is loaded but hidden. Press **Ctrl+Shift+A** to toggle it. It shows landmarks, headings, tab order, ARIA attributes, form labels and live regions.
