# design-data TUI Demo Script

Two tracks. **Track A** (\~5 min) is for Adobe leadership — outcome-focused, minimal
jargon. **Track B** (\~15 min) adds technical depth for the Spectrum team and builds on
top of Track A.

***

## Setup (both tracks)

Run this once before the demo starts. Use a truecolor terminal at ≥120×36 so the
Spectrum theme and wizard modal render cleanly.

```bash
cd /path/to/spectrum-design-data

# Clean slate (use this for recordings or first demo run)
cargo run -p design-data-cli --release -- \
  packages/tokens/dist/json \
  --theme spectrum \
  --no-resume-wizard

# Draft-restore variant (for the "survives crashes" beat — omit --no-resume-wizard)
cargo run -p design-data-cli --release -- \
  packages/tokens/dist/json \
  --theme spectrum
```

> **Troubleshooting**: if `cargo run` is slow, build first:
> `cargo build -p design-data-cli --release`
> then run the binary directly from `sdk/target/release/design-data`.

***

## Track A — Adobe Leadership (\~5 min)

**Story arc:** *"Authoring a new Spectrum token used to mean editing JSON by hand,
guessing at naming, and hoping the cascade was correct. Now it's a guided flow that
nudges reuse first — keeping the design system coherent by default."*

***

### Beat 1 — Scale of the token system (30 s)

**Talking point:** "Before we write anything, let's see what's already here."

| Keys                               | Action                            |
| ---------------------------------- | --------------------------------- |
| `:`                                | Open palette in command mode      |
| `query background-color/*` `Enter` | Filter to background-color tokens |

Expected: table with Name / Value / File / Layer columns. The primer header reads
`▶ 2460 tokens · packages/tokens/dist/json`. Scroll a few rows with `j`/`k` to
show there are many.

*"2,460 tokens, all managed in JSON. The TUI loads them in a second and lets you
search them like a database."*

**Esc** to return to empty view.

***

### Beat 2 — Cascade resolution (45 s)

**Talking point:** "Every token participates in a cascade — like CSS specificity but
for design. Let's see who wins for `accent-background-color-default` in dark mode."

| Keys                                                                        | Action       |
| --------------------------------------------------------------------------- | ------------ |
| `:`                                                                         | Open palette |
| `resolve property=accent-background-color-default,colorScheme=dark` `Enter` | Run resolve  |

Expected: table with ★ / Name / Value / File / Layer / Spec columns. One row has ★
in the first column — that's the winning token for this mode combination.

*"The ★ marks the winner. The Spec column is the specificity score — same idea as CSS
cascade but deterministic and auditable."*

**Esc** to return.

***

### Beat 3 — Reuse-first (the headline moment) (90 s)

**Talking point:** "Now let's try to author a new token. Watch what happens."

| Keys                            | Action                             |
| ------------------------------- | ---------------------------------- |
| `:`                             | Open palette                       |
| `new accent background` `Enter` | Open wizard with intent pre-filled |

Expected: Wizard Screen 1 (Intent). The **reuse-first banner** appears in accent
color:

```
These tokens already exist for similar intents.
Reusing one keeps the cascade healthy.  Tab to alias · Enter to create new
```

Suggestions list shows existing `accent-background-color-*` tokens with confidence
scores.

*"The system recognized that tokens for this intent already exist. The banner is only
shown when confidence is high enough — it won't cry wolf. If we Tab here, we get an
alias path instead of a duplicate."*

Press **Tab** to accept the top suggestion and jump to Screen 4 (Confirm). Show the
diff preview — it's an alias, not a net-new value.

*"One keystroke, and the cascade stays healthy."*

**Esc** to cancel (we'll create a real one next).

***

### Beat 4 — Full authoring wizard (90 s)

**Talking point:** "Now let's author something genuinely new."

| Keys                               | Action                                       |
| ---------------------------------- | -------------------------------------------- |
| `:`                                | Open palette                                 |
| `new custom brand overlay` `Enter` | Open wizard — no reuse banner (novel intent) |
| `Enter`                            | Proceed to Screen 2 (Classification)         |

Screen 2: tab through Layer (Foundation → Platform → Product with `←`/`→`), Property,
name fields. Show the live **Preview** at the bottom updating as you type.

*"Layer, property, name — the three-part naming taxonomy from the Spectrum spec. The
preview shows the assembled token name as you go."*

`Enter` → Screen 3 (Values): show the mode-combo rows (one per color-scheme × scale
combination). Toggle a row between `alias` and `literal` with `a`/`l`.

*"Every mode combination gets a value. You can alias to existing tokens or enter a
literal value. The cascade is set up correctly by default."*

`Enter` → Screen 4 (Confirm): type a short rationale in the rationale box. Show the
live **diff preview** updating as you type.

*"Screen 4 requires a rationale before Submit is enabled. The diff shows exactly what
will be written to disk — no surprises."*

**Esc** to cancel (no `--allow-write` on this run).

***

### Beat 5 — Draft persistence (45 s)

**Talking point:** "One more thing — the wizard saves your work automatically."

Start a new wizard (`:new something experimental` `Enter`), fill in a couple of
fields, then press **Ctrl-C** to kill the process abruptly.

Relaunch **without** `--no-resume-wizard`:

```bash
cargo run -p design-data-cli --release -- packages/tokens/dist/json --theme spectrum
```

Open the wizard again: `:` → `new` `Enter`. The draft from the previous session is
restored.

*"The wizard persists drafts across crashes, context switches, and reboots. You never
lose work in progress."*

***

## Track B — Spectrum Team (15 min)

Run the full Track A first (\~5 min), then continue here.

***

### Beat B1 — Schema introspection with `:describe` (2 min)

| Keys                      | Action                              |
| ------------------------- | ----------------------------------- |
| `:`                       | Open palette                        |
| `describe button` `Enter` | Inspect the button component schema |

Expected: scrollable pretty-JSON view of `button.json` from the spec bundle.

Navigate with `j`/`k` (line) or `PgDn`/`PgUp` (10 lines). The block title shows
`Describe: button`.

*"`:describe` pulls any component schema from the spec bundle — the same source the
wizard reads when it validates token references during authoring."*

**Esc** to return.

***

### Beat B2 — Validation (2 min)

This beat uses the `tokens-bad/` fixture so we get visible errors.

Quit the current session (`q`). Relaunch pointing at the bad fixtures:

```bash
cargo run -p design-data-cli --release -- \
  sdk/tui/tests/fixtures/tokens-bad \
  --theme spectrum \
  --no-resume-wizard
```

| Keys               | Action                |
| ------------------ | --------------------- |
| `:`                | Open palette          |
| `validate` `Enter` | Run schema validation |

Expected: table with Sev / Rule / Token / Message columns. `bad-token.json` has a
non-existent `$schema` URL — the validator will flag it.

*"Sev is severity, Rule is the spec rule ID, Token is the path. You can `y` to yank
any row's message to clipboard."*

Select a row with `j`/`k`, press `y` — status bar confirms clipboard yank.

Quit and relaunch against the real dataset for the rest of the demo.

***

### Beat B3 — Palette dual-mode + Tab autocomplete + history (2 min)

**Command mode (`:`):**

* Type `:q` — palette autocompletes `query`. Tab to complete.
* Up arrow — recall previous commands from history.
* Down arrow — forward through history.

**Fuzzy-find mode (`/`):**

* Press `/` — palette opens in fuzzy-find mode (different prompt prefix).
* Type `background` — filters tokens live.

*"Two modes for two jobs: `:` is structured commands, `/` is quick fuzzy search across
token names. Tab autocomplete and Up/Down history work in both."*

***

### Beat B4 — Mouse + text-select mode (2 min)

While in any list view (query, resolve, or validate):

* **Scroll wheel** — moves selection.
* **Click a row** — selects it directly.
* Press **`v`** to enter text-selection mode.
* **Drag** across rows — the dragged text copies to clipboard on release.
* Press **`v`** again to exit, or use **Shift-drag** to fall back to native terminal
  selection (bypasses mouse capture).

*"Mouse capture is on by default so scroll and click just work. Text-select mode lets
you copy token names or values without leaving the keyboard flow — `v` toggles it."*

***

### Beat B5 — Help overlay (30 s)

Press **`?`** from the empty view.

Full keymap renders as a scrollable modal. Press **`?`** or **Esc** to close.

***

### Beat B6 — Code tour (3 min, screen-share the editor)

Key files to show briefly:

| File                          | What to highlight                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `sdk/tui/src/app.rs`          | `App` struct + `ActiveView` enum — the state machine. `submit_palette()` dispatches commands. |
| `sdk/tui/src/wizard.rs`       | `WizardScreen` enum (4 variants), `WizardState` — the FSM driving the four screens.           |
| `sdk/tui/src/wizard_draft.rs` | `DraftStore` — serde JSON → `dirs::data_dir()` persistence.                                   |
| `sdk/tui/src/main.rs`         | `run()` loop — draw → hit-regions → event dispatch. Panic-safe terminal restore.              |
| `sdk/tui/src/help.rs`         | `HELP_TEXT` — the canonical keymap, shown by `?` overlay.                                     |

***

### Beat B7 — RFC [#973](https://github.com/adobe/spectrum-design-data/issues/973) milestone map (2 min, slides or verbal)

| Milestone | Commit prefix | Feature                                                    |
| --------- | ------------- | ---------------------------------------------------------- |
| M0        | `1aea54bf`    | Scaffold — ratatui skeleton, CLI flags                     |
| M1        | `06d760f0`    | `:query` + table view                                      |
| M2        | `9edf6f2c`    | `:resolve`, `:describe`, `:validate`, palette autocomplete |
| M3        | `6351560f`    | Wizard modal — 4 screens + diff preview                    |
| M4        | `2a2ef3c6`    | Wizard `write_token` integration (`--allow-write`)         |
| M5        | `1513d010`    | Mouse, help overlay, history, theming                      |
| Q1        | `efd77375`    | Calibrated suggest threshold + reuse-first banner          |
| Q3        | `a6a87e2c`    | Wizard draft persistence                                   |
| Q4        | `3b6c20f4`    | MCP authoring-session parity (sibling `sdk/cli`)           |

*"Every beads issue maps to one or more commits. The full arc from M0 → Q4 is
roughly 9 months of iterative RFC work, all checkpointed."*

***

## Recording the asciinema casts

```bash
# Leadership cast — 120×36, clean slate
asciinema rec sdk/tui/docs/demo-leadership.cast \
  --cols 120 --rows 36 \
  --title "design-data TUI — leadership demo"

# Spectrum team cast — same dimensions
asciinema rec sdk/tui/docs/demo-spectrum.cast \
  --cols 120 --rows 36 \
  --title "design-data TUI — Spectrum team demo"

# Convert leadership cast to GIF (requires agg)
# cargo install --git https://github.com/asciinema/agg
agg --theme monokai --speed 1.25 \
  sdk/tui/docs/demo-leadership.cast \
  sdk/tui/docs/demo-leadership.gif
```

**Pace tips for recording:**

* Type commands slowly — asciinema captures real timing.
* Pause \~2 s after each command to let the view settle.
* For the reuse-first banner beat, pause 3 s on Screen 1 before pressing Tab so
  viewers can read the banner.
* Use a font with good box-drawing support (e.g. JetBrains Mono, Cascadia Code).

***

## Replay Debugging

The TUI supports recording and replaying sessions for deterministic bug reproduction.
See [REPLAY.md](REPLAY.md) for the full workflow.

Quick reference:

```bash
# Record a session to NDJSON
cargo run -p design-data-cli --release -- \
  packages/tokens/dist/json --record /tmp/session.jsonl

# Replay: feeds the stream through update headlessly, prints the final Buffer to stdout
cargo run -p design-data-cli --release -- \
  packages/tokens/dist/json --replay /tmp/session.jsonl
```

***

## Fallbacks

| Problem                   | Recovery                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Reuse banner doesn't fire | Type `accent-background` as the intent — high confidence guaranteed                             |
| Cargo compile time        | Pre-build: `cargo build -p design-data-cli --release` before demo                               |
| Terminal leaves raw mode  | Run `reset` in the shell to restore                                                             |
| Mouse not working         | Ensure terminal supports mouse capture (iTerm2, kitty, wezterm ✓; basic macOS Terminal may not) |
| Draft not restoring       | Check `~/Library/Application Support/design-data-tui/wizard_draft.json` exists                  |
