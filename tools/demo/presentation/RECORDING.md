<!--
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
-->

# Recording the demo casts

This is the operator's cheat-sheet for capturing the three terminal casts that
back the Slidev deck (`slides.md`). You drive the TUI/CLI live and drop a
**marker** at each beat boundary; the Slidev player pauses on every marker so
you can narrate, then resume.

> The casts are the presentation path. The VHS pipeline in `../videos/` is a
> separate thing — it produces silent doc GIFs and narrated MP4s, not these
> interactive casts.

## Prerequisites

```bash
brew install asciinema      # records .cast files
# Optional, only if you want to sanity-check playback in a terminal:
brew install agg            # renders a .cast to GIF
```

Pre-build the CLI so compile time never leaks into a recording:

```bash
cargo build -p design-data-cli --release   # produces sdk/target/release/design-data
```

`record-casts.sh` does this for you, but doing it once up front keeps the first
take clean.

## Clean-environment checklist (do this before every take)

* [ ] Terminal sized to **120×36** (the deck embeds at these dimensions).
* [ ] Truecolor terminal (iTerm2 / kitty / wezterm), readable mono font with
  good box-drawing (JetBrains Mono, Cascadia Code).
* [ ] Remove any leftover wizard draft so the reuse banner / wizard start fresh
  (command below).
* [ ] Launch the TUI with a pinned theme and **no draft restore** (command below).
* [ ] Window is otherwise empty (no stray notifications, no split panes).

Remove a stale wizard draft:

```bash
rm -f "$HOME/Library/Application Support/design-data-tui/wizard-draft.json"
```

Launch the TUI clean:

```bash
cargo run -p design-data-cli --release -- \
  packages/tokens/dist/json --theme spectrum --no-resume-wizard
```

## Markers

`asciinema` records a marker when you press **`Ctrl+\`** during a session (the
default marker key; some builds use `Ctrl+i` — check your version with
`asciinema rec --help`). Drop one marker **at the end of each beat**, i.e. right
before you start the next action. The deck's `pauseOnMarkers: true` stops there.

If you would rather not hit the key live, record straight through and add
markers afterward by inserting `[t, "m", "label"]` lines into the `.cast`, or by
passing explicit `markers` timestamps in the slide's `playerProps`.

## Demo A — Find and inspect a token (`public/casts/A-find.cast`)

Deterministic. \~2 min. Launch the TUI as above, then:

| Beat | Keystrokes                                                                                  | Marker after |
| ---- | ------------------------------------------------------------------------------------------- | ------------ |
| A1   | `:` `query background-color/*` `Enter` — scroll `j`/`k`, then `Esc`                         | yes          |
| A2   | `:` `resolve property=accent-background-color-default,colorScheme=dark` `Enter`, then `Esc` | yes          |
| A3   | `:` `describe button` `Enter` — scroll with `j`/`k` / `PgDn`, then `Esc`                    | yes          |

Trap: **do not press `/`** — the fuzzy-find palette is not wired yet
(tracking issue). Use `:query` / `:find` only.

## Demo B — Name a new token (`public/casts/B-name.cast`)

\~2.5 min. Fresh TUI launch (clean draft).

| Beat | Keystrokes                                                                                                                                                                                                                    | Marker after |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| B1   | `:` `new accent background` `Enter` → reuse banner fires → **Tab** (alias path → Confirm diff) → `Esc`                                                                                                                        | yes          |
| B2   | `:` `new custom brand overlay` `Enter` → `Enter` (Classification: `←`/`→` layer, Tab to property, `+` name field) → `Enter` (Values: `a`/`l`, `e` to edit a row) → `Enter` (Confirm: type rationale, watch live diff) → `Esc` | yes          |

The Confirm diff now serializes **every mode-combo row** as a `sets` block
(fixed; previously only the first row was written) — so the multi-mode story is
honest on camera. Only add `--allow-write` for a deliberate "write to disk" take.

## Demo C — Deterministic agent companion (`public/casts/C-suggest.cast`, optional)

CLI, \~1 min. This is the deterministic counterpart to the recorded AI/MCP video.

| Beat | Command                                          | Marker after |
| ---- | ------------------------------------------------ | ------------ |
| C1   | `design-data suggest "primary background color"` | yes          |
| C2   | `design-data primer packages/tokens/dist/json`   | yes          |

Honest framing while narrating: `suggest` is **deterministic lexical ranking**
(Jaccard), not a model. The only model layer is the agent in the recorded
Cursor video.

## After recording

Drop the `.cast` files in `public/casts/` (the deck references them by name).
Then dry-run the deck:

```bash
cd tools/demo/presentation
pnpm install --ignore-workspace   # first time only (isolated from the monorepo)
pnpm dev                          # or: npx @slidev/cli
```

Step through and confirm the player pauses at each marker and the geometry/theme
are legible at projector size.

> **Reproducibility.** `package.json` pins **exact** versions (Slidev 51.8.2 on
> Vite 6, no `^`) so direct deps don't drift. We deliberately **do not** commit a
> `pnpm-lock.yaml` here (it would pull a second, isolated lockfile into the repo).
> If you need byte-for-byte reproducibility of transitive deps too, run
> `pnpm install --ignore-workspace --lockfile-only` locally and keep the generated
> lockfile out of version control, or temporarily un-ignore it for a pinned build.

> **Troubleshooting — "Cannot find native binding".** Slidev pulls napi-rs
> packages (e.g. `oxc-parser`) whose per-platform `.node` bindings sometimes get
> skipped by pnpm's optional-dependency handling. If `pnpm dev` crashes with a
> missing-binding error, re-run the install forcing optional deps:
> `pnpm install --ignore-workspace --force`. The committed `.npmrc`
> (`node-linker=hoisted`) is there to make the binding discoverable.
