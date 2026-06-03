<!--
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
-->

# Recording the demo casts

This is the operator's cheat-sheet for capturing the four terminal casts that
back the Slidev deck (`slides.md`). You drive the TUI/CLI live and drop a
**marker** at each beat boundary; the Slidev player pauses on every marker so
you can narrate, then resume.

> The casts are the presentation path. The VHS pipeline in `../videos/` is a
> separate thing — it produces silent doc GIFs and narrated MP4s, not these
> interactive casts.

## Automated path (preferred)

`tools/demo/auto/auto-demo.sh` drives each demo via `rmux` send-keys /
capture-pane, asserts expected output, and optionally emits an asciinema v2 `.cast`
with beat markers already injected — no live marker-key drops needed.

**Prerequisites:** `rmux` 0.3.x and `asciinema` 3.x on PATH; CLI pre-built.
For Demo D: `claude` on PATH, `.mcp.json` configured (see Demo D section below).

```bash
# Verify all deterministic demos (A, B, C) — CI-safe:
bash tools/demo/auto/auto-demo.sh A --verify
bash tools/demo/auto/auto-demo.sh B --verify
bash tools/demo/auto/auto-demo.sh C --verify
# Or via moon:
moon run demo:auto-verify

# Record all four casts to public/casts/:
bash tools/demo/auto/auto-demo.sh A --record   # → public/casts/A-find.cast
bash tools/demo/auto/auto-demo.sh B --record   # → public/casts/B-name.cast
bash tools/demo/auto/auto-demo.sh C --record   # → public/casts/C-suggest.cast
bash tools/demo/auto/auto-demo.sh D --record   # → public/casts/D-agent.cast (local-only)
# Or all at once:
moon run demo:auto-record

# Clean-room Docker run for A/B/C (headless; D not supported in Docker):
bash tools/demo/auto/auto-demo.sh A --record --docker
```

**Demos A, B, C** — beat markers are injected by anchoring to sentinel text patterns
in the cast's output events (the TUI view headers: `Resolve:`, `Describe:`, `Fuzzy`).
These land on asciinema's own clock regardless of `--idle-time-limit` compression.

**Demo D** — uses **Claude Code hooks** for reliable beat detection and marker timing:

* A per-run settings JSON is **generated at runtime** by `D.beats.sh` with absolute
  hook paths and `DEMO_BEATS_DIR` baked in, then supplied via
  `claude --settings <tmpfile>`, scoping hooks to that run only (no change to global or
  project settings). `tools/demo/auto/hooks/settings.json` is a reference example only —
  its relative paths are not used directly.
* A **`PostToolUse`** hook (`record-beat.sh`) fires after each `mcp__design-data__`
  tool call and appends `epoch_seconds<TAB>tool_name` to a temporary beats log.
* A **`Stop`** hook (`stop-done.sh`) touches a done sentinel when Claude finishes
  responding — replacing the fragile `wait_quiet` / blind `sleep 180` used previously.
* Beat markers D1–D4 are anchored to real tool-call epochs (not rendered screen text),
  so they are phrasing-invariant and model-version-independent.
* Note: Demo D **must be run from a plain terminal**, not from inside another Claude
  Code session (the auto-mode classifier blocks spawning a second `claude` process).

The manual path below remains valid as a fallback for when you want to record a
polished live take or adjust timing by hand.

***

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
  packages/design-data/tokens --theme spectrum --no-resume-wizard
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

Deterministic. \~2–2.5 min. Launch the TUI as above, then:

> **Re-record needed:** the committed `A-find.cast` is a placeholder with markers
> for A1–A3 only. Add the A4 fuzzy-find beat (and its marker) when you record the
> real cast, or the deck's `pauseOnMarkers` won't stop for it.

| Beat | Keystrokes                                                                                                                                            | Marker after |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| A1   | `:` `query background-color/*` `Enter` — scroll `j`/`k`, then `Esc`                                                                                   | yes          |
| A2   | `:` `resolve property=accent-background-color-default,colorScheme=dark` `Enter`, then `Esc`                                                           | yes          |
| A3   | `:` `describe button` `Enter` — scroll with `j`/`k` / `PgDn`, then `Esc`                                                                              | yes          |
| A4   | `/` `accentbg` — live fuzzy filter (table re-ranks on every keystroke), `j`/`k` to move, `Enter` to keep results (or `Esc` to restore the prior view) | yes          |

`/` and `:` are complementary, so show both: `/` is **live fuzzy-find** (fzf-style
subsequence match — `accentbg` finds `accent-background-…`, re-ranked per
keystroke, header reads `Fuzzy: /accentbg`), while `:query` is structured
predicate filtering. `Enter` commits the fuzzy results; `Esc` restores the view
that was on screen before you opened the palette.

## Demo B — Name a new token (`public/casts/B-name.cast`)

\~2.5 min. Fresh TUI launch (clean draft).

| Beat | Keystrokes                                                                                                                                                                                                                    | Marker after |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| B1   | `:` `new accent background` `Enter` → reuse banner fires → **Tab** (alias path → Confirm diff) → `Esc`                                                                                                                        | yes          |
| B2   | `:` `new custom brand overlay` `Enter` → `Enter` (Classification: `←`/`→` layer, Tab to property, `+` name field) → `Enter` (Values: `a`/`l`, `e` to edit a row) → `Enter` (Confirm: type rationale, watch live diff) → `Esc` | yes          |

The Confirm diff now serializes **every mode-combo row** as a `sets` block
(fixed; previously only the first row was written) — so the multi-mode story is
honest on camera. The diff also emits a structured `name` object (property +
name fields), matching what the MCP authoring session writes, so the TUI and
agent paths produce identical token shapes. Only add `--allow-write` for a
deliberate "write to disk" take.

## Demo C — Deterministic agent companion (`public/casts/C-suggest.cast`, optional)

CLI, \~1 min. This is the deterministic counterpart to the recorded AI/MCP video.

| Beat | Command                                          | Marker after |
| ---- | ------------------------------------------------ | ------------ |
| C1   | `design-data suggest "primary background color"` | yes          |
| C2   | `design-data primer packages/design-data/tokens` | yes          |

Honest framing while narrating: `suggest` is **deterministic lexical ranking**
(Jaccard), not a model. The only model layer is the agent in Demo D.

## Demo D — Agent workflow (`public/casts/D-agent.cast`)

Claude Code + design-data MCP. \~2–3 min. Non-deterministic (model output varies per take);
do 2–3 takes and keep the cleanest one.

### Prerequisites

In addition to `asciinema` and the built CLI, you need the design-data MCP wired into
`.mcp.json` at the repo root:

```json
"design-data": {
  "command": "npx",
  "args": ["-y", "@adobe/design-data-agent-mcp"],
  "env": {
    "DESIGN_DATA_BIN": "${PWD}/sdk/target/release/design-data",
    "DESIGN_DATA_PATH": "packages/design-data/tokens",
    "DESIGN_DATA_COMPONENTS": "packages/design-data-spec/components"
  }
}
```

Pre-warm the MCP package so the first-run `npx` install stays out of the cast:

```bash
npx -y @adobe/design-data-agent-mcp --help 2>/dev/null || true
```

Then launch Claude Code once (`claude`), approve the design-data MCP connection in the
permission dialog, and exit. This caches the approval so it won't interrupt the recording.

### Clean-environment checklist (Demo D)

* [ ] Terminal sized to **120×36**.
* [ ] Truecolor terminal (iTerm2 / kitty / wezterm).
* [ ] `.mcp.json` has the `design-data` server configured (see above).
* [ ] MCP connection pre-approved in Claude Code (launch + approve + exit before recording).
* [ ] `sdk/target/release/design-data` is up to date (`cargo build -p design-data-cli --release`).
* [ ] Primary prompt ready to paste (copy from `../agent-questions.md`).
* [ ] Window otherwise empty (no stray notifications, no split panes).

### Beat table

| Beat | Action                                                                                                                                                                                      | Marker after |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| D1   | `claude` (launch Claude Code) → paste the primary prompt from `agent-questions.md` → `Enter`                                                                                                | yes          |
| D2   | Agent calls `mcp__design-data__component` for button → reads role, keyboardIntents, states → answer renders on screen                                                                       | yes          |
| D3   | Agent calls `mcp__design-data__resolve` for `accent-background-color-default` in dark mode → quotes resolved value with spec citation                                                       | yes          |
| D4   | Narrate the closing line about the agent skill: same answers without a persistent MCP via `npx @adobe/design-data …` — for teams watching context budget. Type `exit` to close Claude Code. | yes          |

### Non-determinism guidance

Model output varies between takes. Mitigations:

* Use the **verbatim** primary prompt from `agent-questions.md` (exact wording produces
  more consistent tool-call patterns).
* Do 2–3 takes; keep the one where the agent calls both `mcp__design-data__component`
  **and** `mcp__design-data__resolve` and quotes values with citations — that's success.
* `--idle-time-limit 2` compresses dead air (thinking pauses). Model "thinking" spinners
  are animation, not idle — they appear in the cast as honest agent-at-work.
* If you want to trim a long thinking spinner or a verbose response, post-edit the `.cast`:
  delete or compress lines between timestamps. The format is `[t, "o", "text\r\n"]`.
* If dropping markers live is awkward, record straight through and insert
  `[t, "m", "label"]` lines into the `.cast` afterward (same post-edit path as A/B/C).

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
