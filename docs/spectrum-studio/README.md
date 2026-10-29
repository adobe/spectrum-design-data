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

## Scripts

Run the `pnpm` commands below from this folder, or from the repository root with `pnpm --filter @adobe/spectrum-studio <script>`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | TypeScript and ESLint checks |
| `pnpm test:ci` | The curated checks that run in CI |
| `pnpm storybook` | Storybook on port 6006 |
| `pnpm storybook:build` | Build the static Storybook site |
| `pnpm test:e2e:storybook` | Color picker interaction checks in Storybook |

Individual checks are `pnpm test:*` scripts (see `package.json`). Run the narrowest one that covers your change. Checks that fail today are listed in [docs/known-debt.md](docs/known-debt.md).

Moon tasks (`pnpm moon run spectrum-studio:<task>` from the repository root): `typecheck`, `test` and `build` run in CI. `dev`, `lint` (ESLint included), `e2e` and `e2e-storybook` are local only.

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
