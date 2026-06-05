# @adobe/design-data-agent-mcp

## 1.4.0

### Minor Changes

- [#1120](https://github.com/adobe/spectrum-design-data/pull/1120) [`5d99d24`](https://github.com/adobe/spectrum-design-data/commit/5d99d2440f55e37cad5ab972749945fff42057f2) Thanks [@GarthDB](https://github.com/GarthDB)! - Resolve design data paths independently of the working directory so MCP tools
  work when launched from a monorepo subdirectory (closes #1109).
  - **package.json**: depend on `@adobe/spectrum-design-data` (`workspace:*`) so the
    data package is linked into the server.
  - **src/config.js**: when no env override is set, resolve `tokens`/`components`/
    `fields` from the `@adobe/spectrum-design-data` package via Node module
    resolution (CWD-independent). Explicit `DESIGN_DATA_*` env overrides still win;
    relative values are anchored to the new `DESIGN_DATA_ROOT` (or the server
    package root when unset).
  - **src/cli.js**: spawn the `design-data` CLI with `cwd` set to the resolved root.
  - **moon.yml / .moon/workspace.yml**: register the project and add
    `dependsOn: ["design-data"]` so moon orders tasks and syncs the dependency.
  - **README.md**: document the resolution precedence and `DESIGN_DATA_ROOT`.

## 1.3.1

### Patch Changes

- [#1102](https://github.com/adobe/spectrum-design-data/pull/1102) [`f163915`](https://github.com/adobe/spectrum-design-data/commit/f163915c3bbe76a8eae1a047f3148ec7f3386b2c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the MCP server failing to start when launched via npx or a node_modules/.bin shim.
  - **src/index.js**: the entry-point guard compared `process.argv[1]` to the
    module URL directly, which never matched when invoked through a symlink (npx,
    pnpm `.bin`). The server exited 0 without starting, surfacing to clients as
    `Failed to reconnect: -32000`. The check now compares resolved real paths.

## 1.3.0

### Minor Changes

- [#1076](https://github.com/adobe/spectrum-design-data/pull/1076) [`0ec2f98`](https://github.com/adobe/spectrum-design-data/commit/0ec2f98eb54ceb01d126a7f23006f80c9ce13b95) Thanks [@GarthDB](https://github.com/GarthDB)! - Publish design-data agent surface for Claude Code and Cursor distribution.
  - **tools/design-data-agent-mcp**: publish to npm with bundled `skills/` and
    `.claude-plugin/`; register as `design-data-agent` marketplace plugin.
  - **tools/design-data-skill**: add `@adobe/design-data-skill` npm package for
    versioned Spectrum skill installs.

## 1.2.0

### Minor Changes

- [#997](https://github.com/adobe/spectrum-design-data/pull/997) [`efd7737`](https://github.com/adobe/spectrum-design-data/commit/efd773751477875bb9a68c18fa8176e5c2350bae) Thanks [@GarthDB](https://github.com/GarthDB)! - Calibrate suggest threshold and wire reuse-first banner (RFC #973 Q1).
  - **sdk/core/src/authoring/session.rs**: replace `ALIAS_THRESHOLD = 0.5` placeholder
    with `alias_threshold()` (default 0.35, overridable via `DESIGN_DATA_ALIAS_THRESHOLD`);
    calibrated against `packages/tokens/src`.
  - **sdk/core/tests/suggest_calibration.rs**: new benchmark — positive matches 0.6–1.0,
    nonsense 0.0, threshold 0.35 sits cleanly between.
  - **sdk/tui/src/wizard.rs**: `refresh_suggestions` sets `can_alias` via `alias_threshold()`.
  - **sdk/tui/src/main.rs**: `render_intent_screen` shows RFC §3.10 reuse-first banner
    (accent-colored, 2-line) when `can_alias` is true.

- [#995](https://github.com/adobe/spectrum-design-data/pull/995) [`3b6c20f`](https://github.com/adobe/spectrum-design-data/commit/3b6c20f483443e2627193cb8074bd1f5fd498bfb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add MCP authoring-session tools — wizard state machine for agents (RFC #973 Q4).
  - **sdk/core/src/authoring/draft.rs** (new): serializable DTOs shared between
    TUI wizard and MCP sessions.
  - **sdk/core/src/authoring/session.rs** (new): on-disk session state machine
    (`start`, `step_intent`, `step_classification`, `step_values`,
    `commit`, `cancel`, `get`, `list`).
  - **sdk/tui/src/wizard.rs**: import `WizardScreen`, `WizardPath`, `ValueKind`
    from core; remove local definitions.
  - **sdk/cli/src/authoring.rs** (new): `authoring-session` CLI subcommand with
    JSON output.
  - **tools/design-data-agent-mcp/src/tools/authoring.js** (new): 8 MCP tools
    wrapping the CLI subcommand.

## 1.1.0

### Minor Changes

- [#874](https://github.com/adobe/spectrum-design-data/pull/874) [`b62360b`](https://github.com/adobe/spectrum-design-data/commit/b62360b657a083578d0db3d10a1d406d00c99204) Thanks [@GarthDB](https://github.com/GarthDB)! - feat: add design-data-agent-mcp MCP server (Phase 8.3)

### Patch Changes

- [#876](https://github.com/adobe/spectrum-design-data/pull/876) [`5409f6c`](https://github.com/adobe/spectrum-design-data/commit/5409f6c98f434f165e527428034d56af96bc7948) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(skill): add Claude Code Agent Skill for design-data (Phase 8.4)
