# design-data — Interactive TUI

An interactive terminal UI for authoring and inspecting Spectrum design tokens, built
as part of [RFC #973](https://github.com/orgs/adobe/discussions/TODO). It loads a
token dataset from JSON, exposes it through a command palette, and provides a
four-screen guided wizard that nudges reuse over duplication — surfacing existing
tokens before letting you create a new one.

<!-- demo-leadership.gif goes here once recorded -->

***

## Quick start

```bash
# From the repo root — bare invocation launches the TUI on the current directory
cargo run -p design-data-cli --release -- packages/tokens/dist/json --theme spectrum

# Equivalent explicit form
cargo run -p design-data-cli --release -- tui packages/tokens/dist/json --theme spectrum
```

The TUI loads the full Spectrum token corpus (\~2 400 tokens) in under a second and
drops you into an interactive session. Press `?` for the full keymap.

***

## Flags

| Flag                         | Default       | Description                                                                                                                  |
| ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `<dataset>`                  | `.` (cwd)     | Path to a directory of token JSON files                                                                                      |
| `--theme terminal\|spectrum` | `terminal`    | `terminal` uses terminal-native colors. `spectrum` uses the Adobe Spectrum palette (requires a 24-bit truecolor terminal).   |
| `--allow-write`              | off           | Enable real disk writes from the wizard Screen 4 Submit. Without this flag the wizard shows a diff preview but never writes. |
| `--components <dir>`         | auto-detected | Path to component JSON files. Defaults to `packages/design-data-spec/components` relative to the working directory.          |
| `--mode-sets <dir>`          | auto-detected | Path to mode-set JSON files. Defaults to `packages/design-data-spec/mode-sets`.                                              |
| `--no-resume-wizard`         | off           | Do not restore an in-progress wizard draft from the previous session. Use this for demo recordings or clean-slate runs.      |

***

## Layout

```
▶ 2460 tokens  ·  packages/tokens/dist/json          ← primer header
┌──────────────────────────────────────────────────┐
│  active view (query / resolve / describe /        │
│  validate / wizard modal)                         │
└──────────────────────────────────────────────────┘
                                                    ← status line (contextual)
:█                                                  ← palette prompt
```

***

## Commands

Open the palette with `:` (command mode) or `/` (fuzzy-find mode).

| Command                                           | Description                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `:query <expr>`                                   | Filter tokens. Glob-style: `background-color/*`, `accent-*`                                                |
| `:resolve property=<name>[,<mode-set>=<mode>...]` | Show cascade resolution for a property with optional mode overrides. The ★ column marks the winning token. |
| `:describe <component>`                           | Inspect a component schema (JSON, scrollable).                                                             |
| `:validate`                                       | Validate all loaded tokens against their `$schema`. Shows Sev / Rule / Token / Message.                    |
| `:new [<intent>]`                                 | Open the four-screen token authoring wizard.                                                               |

***

## Token Authoring Wizard

The wizard guides you through four screens. A **reuse-first banner** appears on
Screen 1 when the system detects existing tokens that satisfy your intent above a
calibrated confidence threshold — press `Tab` to alias instead of creating a
duplicate.

| Screen | Name           | What you do                                                                                                                                       |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Intent         | Type your intent. Navigate suggestions with `↑`/`↓`. `Tab` = alias (skips to Screen 4). `Enter` = create new.                                     |
| 2      | Classification | Set layer (`←`/`→`), property, and name segments. Live name preview updates as you type.                                                          |
| 3      | Values         | Set a value per mode combination — `a` for alias, `l` for literal, `e` to edit.                                                                   |
| 4      | Confirm        | Enter rationale (required). Review the live diff preview. `Ctrl+S` to edit `$schema` URL. `Enter` to submit (writes when `--allow-write` is set). |

Wizard drafts are **persisted across sessions** in `~/Library/Application
Support/design-data-tui/wizard_draft.json` (macOS) or the platform equivalent.
Relaunch without `--no-resume-wizard` to restore.

***

## Keymap

### Global

| Key      | Action                                    |
| -------- | ----------------------------------------- |
| `q`      | Quit (when palette is closed)             |
| `Ctrl-C` | Always quit                               |
| `?`      | Toggle help overlay                       |
| `v`      | Toggle text-selection mode (drag to copy) |

### Palette

| Key       | Action                    |
| --------- | ------------------------- |
| `:`       | Open command mode         |
| `/`       | Open fuzzy-find mode      |
| `Esc`     | Cancel / close palette    |
| `Enter`   | Dispatch command          |
| `Tab`     | Autocomplete command name |
| `↑` / `↓` | Recall palette history    |

### List views (query / resolve / validate)

| Key          | Action                                    |
| ------------ | ----------------------------------------- |
| `↑` / `k`    | Move selection up                         |
| `↓` / `j`    | Move selection down                       |
| Scroll wheel | Move selection                            |
| Click row    | Select that row                           |
| `y`          | Yank selected name / message to clipboard |
| `Esc`        | Return to empty view                      |

### Describe view

| Key             | Action               |
| --------------- | -------------------- |
| `↑` / `k`       | Scroll up one line   |
| `↓` / `j`       | Scroll down one line |
| `PgUp` / `PgDn` | Scroll 10 lines      |
| Scroll wheel    | Scroll body          |
| `Esc`           | Return to empty view |

### Wizard

| Screen           | Key                 | Action                                       |
| ---------------- | ------------------- | -------------------------------------------- |
| 1 Intent         | `↑`/`↓`             | Navigate suggestions                         |
| 1 Intent         | `Tab`               | Reuse top suggestion (alias path → Screen 4) |
| 1 Intent         | `Enter`             | Proceed to Screen 2                          |
| 2 Classification | `Tab` / `Shift-Tab` | Move between fields                          |
| 2 Classification | `←` / `→`           | Cycle layer                                  |
| 2 Classification | `+`                 | Add a name field                             |
| 3 Values         | `a`                 | Set row kind to Alias                        |
| 3 Values         | `l`                 | Set row kind to Literal                      |
| 3 Values         | `e`                 | Edit active row value                        |
| 4 Confirm        | Type                | Enter rationale                              |
| 4 Confirm        | `↑`/`↓` / Scroll    | Scroll diff preview                          |
| 4 Confirm        | `Ctrl+S`            | Edit `$schema` URL                           |
| 4 Confirm        | `Enter`             | Submit                                       |
| All              | `Esc`               | Cancel wizard                                |

### Mouse

| Action                | Effect                                       |
| --------------------- | -------------------------------------------- |
| Scroll wheel          | Scroll active view or wizard diff            |
| Click row             | Select that row                              |
| `v`                   | Enter text-selection mode                    |
| Drag (in select mode) | Select and copy text                         |
| `Shift-drag`          | Native terminal selection (bypasses capture) |

***

## Demo

See [DEMO.md](./DEMO.md) for the full demo script (two tracks: Adobe leadership and
Spectrum team). Recorded casts live in `docs/`:

* `docs/demo-leadership.cast` / `docs/demo-leadership.gif` — \~90 s overview
* `docs/demo-spectrum.cast` — \~5 min technical walkthrough

***

## Copyright

Copyright 2026 Adobe. All rights reserved.
Licensed under the [Apache License, Version 2.0](../../LICENSE).
