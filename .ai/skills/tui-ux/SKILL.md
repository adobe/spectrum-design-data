---
name: tui-ux
description: >-
  Reviews and improves the design-data TUI's user experience. Use when asked to review or
  critique the TUI's UX, find rough edges or friction points, plan a user workflow or
  journey, recommend quality-of-life improvements, audit the TUI against terminal-app
  conventions, or judge whether an interaction matches what users expect from other TUIs
  (vim, fzf, lazygit, k9s, htop, ranger…). Also use when asked to QA the design-data TUI
  from a product perspective, identify discoverability gaps, evaluate keybinding ergonomics,
  check empty-state or error messaging quality, or capture an annotated GIF/screenshot to
  illustrate a UX finding. For *correctness* verification (does it render exactly right, does
  a test pass), defer to the `tui-verify` skill instead.
license: Apache-2.0
compatibility: >-
  Designed for Claude Code in the spectrum-design-data repo. Requires the design-data
  release binary built: cargo build -p design-data-cli --release (or moon run :build).
  The tuiwright MCP tools (mcp__tuiwright__tui_*) must be available — they are active
  when this repo is open in Claude Code. GIF capture also requires agg on PATH.
---

# TUI UX review & design partnership

The `design-data` TUI (`sdk/tui`) is a ratatui/Elm-architecture terminal app for authoring
and inspecting Spectrum design tokens. This skill helps you evaluate and improve the **user
experience** — conventions, ergonomics, discoverability, workflow smoothness — using the
tuiwright MCP tools to drive and observe the app.

> **NOT correctness testing.** For regression tests and render assertions use `tui-verify`.
> This skill hands off to it whenever a finding needs a deterministic guard.

## Orientation — TUI surfaces

| Surface              | Entry key   | Source files                                                 | What it does                                                            |
| -------------------- | ----------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Command palette**  | `:`         | `src/command.rs`, `src/update_command.rs`                    | All commands: query / resolve / describe / validate / new / find / name |
| **Fuzzy find**       | `/`         | `src/fuzzy.rs`, `src/update.rs`                              | Live-ranked token search; Esc restores prior view                       |
| **Authoring wizard** | `:new`      | `src/wizard.rs`, `src/wizard_draft.rs`, `src/wizard_common/` | 4-screen token creation: Intent → Classification → Values → Confirm     |
| **Find wizard**      | `:find`     | `src/find.rs`, `src/view_find.rs`                            | Filter by property/component/variant/state/intent                       |
| **Naming wizard**    | `:name`     | `src/naming.rs`                                              | 3-screen name assembly; copies to clipboard                             |
| **Help overlay**     | `?`         | `src/help.rs`                                                | Scrollable keybinding reference                                         |
| **Home screen**      | (default)   | `src/logo.rs`, `src/view.rs`                                 | Logo + command table                                                    |
| **List views**       | (result)    | `src/app_views.rs`, `src/view.rs`                            | query / resolve / validate result tables                                |
| **Describe view**    | `:describe` | `src/app_views.rs`, `src/view.rs`                            | Component token breakdown, scrollable                                   |
| **Theme**            | (config)    | `src/theme.rs`                                               | `terminal()` (16-color) and `spectrum()` (truecolor)                    |

**Source of truth for keybindings and commands**: always read `src/help.rs` (`HELP_TEXT`)
and the `Command` enum in `src/command.rs` before asserting what the app does — the
documentation drifts; the code does not.

***

## Drive-tier decision guide

Choose the tier that answers your question with the least friction.

```
tui_headless (NDJSON replay)   ← fast, deterministic, no PTY — default for layout & flow
tui_open + send_keys + snapshot ← real terminal interaction, mouse, truecolor
tui_record_start → tui_record_stop → tui_to_gif ← visual evidence for findings
```

### When to use each tier

| Question                                                | Use                                           |
| ------------------------------------------------------- | --------------------------------------------- |
| "How does the palette render after submitting a query?" | `tui_headless` with NDJSON seed               |
| "What does the home screen look like at 80×24?"         | `tui_headless` (set cols/rows params)         |
| "Does Tab autocomplete feel natural while typing?"      | `tui_open` + `tui_send_keys` + `tui_snapshot` |
| "Does mouse click-to-select work on the token list?"    | `tui_open` + live interaction                 |
| "Show the full wizard workflow as evidence in a report" | Record with `tui_record_*` + `tui_to_gif`     |
| "Is the truecolor Spectrum theme rendering correctly?"  | `tui_open` + `tui_snapshot` (image mode)      |

### NDJSON message format

Each line of an NDJSON replay file is one serialized `Message`. The only format confirmed
to work reliably in headless mode is `PaletteSubmit` — it drives the TUI as if the user
typed the command and pressed Enter:

```jsonl
{"PaletteSubmit":"query property=background-color"}
{"PaletteSubmit":"describe button"}
{"PaletteSubmit":"validate"}
{"PaletteSubmit":"new accent background"}
```

> **Key events in NDJSON are unreliable.** The `{"Key":...}` format exists but does not
> reliably produce the expected state changes in headless replay — use `tui_open` +
> `tui_send_keys` for anything requiring keyboard navigation (j/k, Esc, Tab, etc.).

**Ready-made seeds for this repo** live in the tuiwright examples directory:
`/Users/garthdb/Projects/tuiwright/examples/spectrum-design-data/`
(browse.ndjson, query-background-color.ndjson, describe-button.ndjson). Use them as starting
points, then extend or truncate as needed.

### Tool quick-reference

```
tui_headless(ndjson, cols, rows, format)          → rendered text grid (+ PNG if freeze on PATH)
tui_open(cols, rows)                              → open live pane
tui_send_keys(keys)                               → send input (\r=Enter, \x1b=Esc, \x1b[A=Up, \x1b[B=Down)
tui_snapshot(format)                              → capture live pane (text | image | both)
tui_wait_for(text, timeout_ms)                    → block until text appears (server-side 5s cap — use Bash sleep for longer waits)
tui_resize(cols, rows)                            → resize live pane
tui_assert(contains, not_contains, ndjson, ...)   → pass/fail assertion on text presence
tui_diff(baseline, ndjson, create_if_missing)     → compare against a named .snap.json baseline
tui_record_start(path)                            → begin asciinema .cast recording
tui_record_stop()                                 → finalize recording
tui_to_gif(cast, gif)                             → convert .cast to GIF via agg
tui_close()                                       → kill live pane
```

> **`tui_snapshot` may hang on live panes.** If it hangs >10s, kill the session and use
> the rmux CLI fallback instead:
>
> ```bash
> rmux new-session -d -s tui-qa -x 120 -y 36 "sdk/target/release/design-data packages/design-data/tokens --components packages/design-data/components"
> sleep 2
> rmux send-keys -t tui-qa "query property=background-color" Enter
> sleep 1
> rmux capture-pane -t tui-qa -p
> ```

`tuiwright.toml` (repo root) configures launch (`sdk/target/release/design-data`), default
size (120×36), and the headless\_snapshot command template.

***

## Workflow 1 — QA / UX review pass

Use when asked to review a surface or the full TUI for UX quality.

### Step 0 — Build and verify the binary

Always do this before any QA session. A stale binary silently produces wrong behavior and
wrong help content.

```bash
# Check whether the binary is older than key source files:
ls -la sdk/target/release/design-data
find sdk/tui/src -newer sdk/target/release/design-data -name "*.rs"

# If any source files are newer, rebuild:
cargo build -p design-data-cli --release
# or: moon run :build
```

Also verify the `?` help overlay matches `src/help.rs` — run a headless probe with
`{"PaletteSubmit":""}` (home screen), then check if the binary's live help overlay content
matches what `help.rs` says. If they differ, rebuild before proceeding.

### Step 1 — Define scope

Pick one surface (e.g. "the command palette") or state "full end-to-end pass." Write it down
before driving.

### Step 2 — Read the source of truth

```bash
# Check the actual keybindings:
# Read sdk/tui/src/help.rs   (HELP_TEXT constant)
# Read sdk/tui/src/command.rs  (Command enum + define_commands! macro)
```

Do this even for surfaces you think you know — implementations drift.

### Step 3 — Drive and observe

For each surface in scope, use the tier decision guide above. Drive a representative user
journey through the surface (happy path, then edge cases: empty input, Esc mid-flow, invalid
input, very long content, narrow terminal).

Take a `tui_snapshot` or `tui_headless` result at each key state. Note: what rendered, what
was expected from convention, any gap.

Use `tui_resize` to check graceful degradation at 120×36 (target), 80×24 (standard), and
narrow/short sizes. The logo drops below 33 content rows — verify that still works.

### Step 4 — Evaluate against conventions

Open [`references/tui-conventions.md`](references/tui-conventions.md) and step through the
checklist for each surface you drove. Mark each convention: ✓ match / \~ partial / ✗ gap.

### Step 5 — Evaluate against heuristics

Open [`references/qa-playbook.md`](references/qa-playbook.md) and run the heuristic checklist.
For each failing heuristic, note the surface, the exact gap, and a severity:

* **Blocker** — prevents a user goal or causes confusion about state
* **Friction** — works, but harder than it should be; user has to figure it out
* **Polish** — works fine, small improvement opportunity

### Step 6 — Capture evidence

For each finding that benefits from visual evidence:

```
# GIF of a workflow
tui_record_start("/tmp/finding-N.cast")
# … drive the flow with tui_open / tui_send_keys / tui_snapshot …
tui_record_stop()
tui_to_gif("/tmp/finding-N.cast", "/tmp/finding-N.gif")
# Read /tmp/finding-N.gif  ← include in report
```

### Step 7 — Emit deliverables (all four)

See **Deliverables spec** below.

***

## Workflow 2 — Workflow / journey planning

Use when asked "how would a user do X?" or to identify whether a task is discoverable.

### Step 1 — State the user goal

Write it out: "User wants to author a new color token." The goal should be what the user
wants to *accomplish*, not which command to run.

### Step 2 — Map what conventions would predict

Given the goal, describe what an experienced terminal-app user would *try first* — based on
the conventions in [`references/tui-conventions.md`](references/tui-conventions.md). This is
the baseline expectation before touching the actual app.

### Step 3 — Drive the actual happy path

Drive the canonical successful path using `tui_headless` or `tui_open` + `tui_send_keys`.
Record a GIF of this path.

### Step 4 — Drive the predicted-but-wrong paths

Try the paths a user would try based on convention that the app does NOT support (if any).
Document what happens (error? silence? wrong result? accidental navigation?).

### Step 5 — Identify discoverability gaps

* Are the entry points for this goal visible on the home screen or reachable from `?`?
* Does the command autocomplete surface it?
* Does partial input give helpful feedback?
* Would a user arriving at the wrong screen understand how to correct?

### Step 6 — Deliver

Write a journey map (goal → steps → what the user sees at each step → where they could
get stuck) plus findings for each gap, using the Deliverables spec below.

***

## Workflow 3 — QoL recommendation

Use when asked "how can we improve X?" or after a review pass surfaces specific friction.

### Step 1 — Categorize the improvement

* **Quick win**: a text change (empty-state copy, footer hint, error message), a single
  keybinding alias, or a minor layout tweak. Can be a direct inline edit.
* **Larger change**: new mode, new command, new wizard screen, significant interaction
  redesign. File a beads issue instead of inline-editing.

### Step 2 — For quick wins — verify the guardrails apply

Before proposing an edit, check the architectural guardrails:

* `tests/budget.rs` enforces 800-LOC cap per `src/` file — check `wc -l` on the target.
* No `async` in `view*.rs` (the no-async-in-render rule).
* `Message` variants must be ≤128 bytes (box large payloads if needed).
* Adding or renaming a command requires updating *both* `command.rs` *and* the `COMMANDS`
  constant in `src/logo.rs` (a bidirectional sync test guards this; it will fail if out of sync).
* Adding a hit region requires keeping `compute_hit_regions` in sync with `view::draw`
  (runtime.rs and tests guard this too).

After any inline fix, note: "run `cargo test -p design-data-tui` to verify guardrails pass."

### Step 3 — Deliver

Inline edit + explanation for quick wins. Beads issue with design rationale for larger changes.
Use the Deliverables spec below.

***

## Deliverables spec

Every review or recommendation produces some or all of these four artifacts.

### 1. Structured critique report

```markdown
## TUI UX Review — [scope] — [date]

**Method:** [headless / live / mixed] — [why that tier]

### Summary
[2–4 sentence overall verdict]

### Findings

#### [Surface name]

| # | Severity | Finding | Convention | Recommendation |
|---|---|---|---|---|
| 1 | Friction | Esc in the naming wizard cancels all three screens at once | Esc should undo one step at a time (lazygit, helix) | Add per-screen cancel that pops to prior screen |

**Evidence:** [inline snapshot text or GIF path]

### Triage table
| Finding | Beads ID | Inline fix | Status |
|---|---|---|---|
```

### 2. Beads issues

For each Blocker or Friction finding:

```bash
bd create \
  --type=bug \   # or feature for improvements
  --title="[Surface]: [one-line description]" \
  --description="## Problem
[What happens and why it's wrong/suboptimal]

## Convention / expected behavior
[What users expect based on analogous TUIs — cite references/tui-conventions.md]

## Repro
[NDJSON seed or tui_send_keys sequence that demonstrates the issue]

## Suggested fix
[Concrete recommendation, with file:line reference if known]" \
  --priority=2   # 1 for Blocker, 2 for Friction, 3 for Polish
```

### 3. Inline fix proposals

For quick wins, propose the edit using the Edit tool with:

* File path + old\_string / new\_string
* One-sentence rationale
* Note: "verify with `cargo test -p design-data-tui`"

### 4. Annotated GIFs / screenshots

Capture evidence using the record workflow in Step 6 of Workflow 1. Read the resulting GIF
into the conversation to annotate it (describe what to look for, circle attention areas in
the report text).

***

## Handoff to tui-verify

When a finding needs a correctness assertion or a regression guard — "does this cell render
the right symbol?", "does this layout hold at 80×24?" — stop and use `tui-verify` instead.
Do **not** invent a buffer assertion inline; let `tui-verify`'s Tier 1 handle it.

```
For correctness tests → tui-verify (Tier 1 buffer assertions, tui_assert, tui_diff)
For UX/product judgment → tui-ux (this skill)
```

***

## Gotchas

* **Build the binary first — and check for staleness.** `tuiwright.toml` points at
  `sdk/target/release/design-data`. A stale binary silently shows old behavior and old
  help text. Run `find sdk/tui/src -newer sdk/target/release/design-data -name "*.rs"` —
  if anything is newer, rebuild with `cargo build -p design-data-cli --release`.
* **TOML scoping in tuiwright.toml.** Top-level keys (like `headless_snapshot`) must appear
  *before* the first `[section]` header in the file. A key after `[size]` becomes
  `size.headless_snapshot` (silently ignored) rather than the root `headless_snapshot`.
* **`tui_snapshot` may hang.** The tuiwright SDK's rmux connection can fail to capture live
  panes even when `tui_open` reports success. If `tui_snapshot` hangs >10s, use the rmux
  CLI fallback (see Tool quick-reference above).
* **`tui_wait_for` has a server-side 5s cap.** The `timeout_ms` parameter is capped at
  5000ms by the server regardless of the value you pass. For operations that take longer,
  use `Bash: sleep N` after sending the command.
* **800-LOC cap.** `tests/budget.rs` rejects `src/` files over 800 lines. Check `wc -l` on
  any file you're about to touch.
* **No async in view.** `tests/budget.rs` scans `view*.rs` for `async fn` and fails the
  build. All render code must be synchronous.
* **Message size budget.** Every `Message` variant must be ≤128 bytes. Box large payloads
  (see `DescribeDone`, `ValidateDone` as examples).
* **Command ↔ home-screen sync.** The `COMMANDS` constant in `src/logo.rs` must stay in
  sync with the `Command` enum. A bidirectional sync test enforces this.
* **Hit-region ↔ layout sync.** `compute_hit_regions` in `runtime.rs` must match `view::draw`.
  A test in `runtime.rs` guards this; it will catch any drift.
* **`--no-resume-wizard` for clean state.** When driving the wizard from a fresh state,
  pass `--no-resume-wizard` via args in `tuiwright.toml` or the `tui_open` `args` param to
  avoid picking up a persisted draft from a prior session.
