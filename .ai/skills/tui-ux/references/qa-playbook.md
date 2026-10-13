# QA Playbook

Repeatable QA procedures for the `design-data` TUI — heuristic checklist, per-surface
scripts, and the report template.

***

## TUI heuristic checklist

Adapted from Nielsen's 10 heuristics for terminal UIs. Evaluate each surface against these.

| #   | Heuristic                    | TUI translation                                           | Pass criteria                                                                    |
| --- | ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| H1  | Visibility of system status  | Current mode, selection, loading state are always visible | Mode visible; selection highlighted with `▶`; async ops show status message      |
| H2  | Match with conventions       | Keybindings follow vim/fzf/lazygit norms                  | `j/k`, `Esc`, `?`, `/`, `:`, `y`, `q`, `Tab` all behave as the cross-TUI norm    |
| H3  | User control and freedom     | Esc exits / goes back; Ctrl-C always exits                | Every state is escapable without data loss (wizard draft is saved)               |
| H4  | Consistency                  | Same key does the same thing across surfaces              | `Esc` consistently cancels; `y` consistently yanks; `j/k` consistent             |
| H5  | Error prevention             | Obvious mistakes are prevented or warned                  | Confirm screen before write; validation before proceed                           |
| H6  | Recognition over recall      | Available actions visible at current state                | Footer hint lines; home screen command table; `?` reachable                      |
| H7  | Flexibility and shortcuts    | Power-user shortcuts exist alongside newbie paths         | Vim motions + arrows; Tab reuse shortcut in wizard; command aliases              |
| H8  | Aesthetic and minimal design | No visual noise; information density is appropriate       | Status bar not cluttered; table columns sensible; no truncation of critical data |
| H9  | Error messages               | Clear, specific, actionable                               | Status messages say what failed and suggest a recovery (not just "Error")        |
| H10 | Help and documentation       | In-app help reachable from any state                      | `?` works from home; wizard footer hints; `--help` from CLI                      |

***

## Per-surface QA scripts

Each script is a sequence of tuiwright tool calls. Run headless for speed; escalate to live
when the question requires real interaction. Capture snapshots at each key state.

***

### Surface 0 — Build check

Always start here before any surface.

```
# Verify the binary exists:
Bash: ls sdk/target/release/design-data

# If missing, build it:
Bash: cargo build -p design-data-cli --release
# or: moon run :build
```

***

### Surface 1 — Home screen

**Headless** — render the initial state:

```
tui_headless(ndjson=null, cols=120, rows=36, format="both")
# No NDJSON needed — the app renders home on startup.
# (Use an empty .ndjson file if the tool requires a path.)
```

**Check:**

* [ ] Logo appears at 120×36 (H8)
* [ ] Command table is visible and complete (H6)
* [ ] `:` prompt placeholder is shown (H6)
* [ ] Status bar present (H1)

**Resize checks:**

```
tui_open(cols=120, rows=36)
tui_snapshot()

tui_resize(cols=80, rows=24)
tui_snapshot()   # standard terminal — no overflow

tui_resize(cols=80, rows=33)
tui_snapshot()   # logo should be present (content = 31 rows)

tui_resize(cols=80, rows=32)
tui_snapshot()   # logo absent (content = 30 rows) — command table still visible

tui_resize(cols=10, rows=5)
tui_snapshot()   # narrow — no panic
```

***

### Surface 2 — Command palette

**NDJSON seed (open palette, type, cancel):**

```jsonl
{"Key":{"code":{"Char":":"},"modifiers":"NONE"}}
{"Key":{"code":"Esc","modifiers":"NONE"}}
```

**Live driving (full palette flow):**

```
tui_open(cols=120, rows=36)
tui_snapshot()                      # home

tui_send_keys(":")
tui_snapshot()                      # palette open, prompt visible

tui_send_keys("q")                  # type "q"
tui_snapshot()                      # autocomplete: "query" suggestion?

tui_send_keys("\t")                 # Tab to complete
tui_snapshot()                      # "query" filled in

tui_send_keys(" property=color")
tui_send_keys("\r")                 # Enter to submit
tui_wait_for("color", 3000)
tui_snapshot()                      # results rendered

tui_send_keys("\x1b")               # Esc — back to empty
tui_snapshot()
```

**Check:**

* [ ] `:` opens palette immediately (H1)
* [ ] Tab completes to canonical command name (H7)
* [ ] Partial input gives visible autocomplete hint (H6)
* [ ] ↑/↓ recalls history (H7) — test by submitting two commands, then ↑
* [ ] Esc cancels and restores prior view, not home screen (H3)
* [ ] Invalid command shows helpful error in status bar (H9)
* [ ] Readline editing (Ctrl-A, Ctrl-E, Ctrl-W, Ctrl-U) works in palette input (H2)

**History recall test:**

```
tui_send_keys(":")
tui_send_keys("query property=color\r")
tui_wait_for("color", 3000)
tui_send_keys(":")
tui_send_keys("\x1b[A")             # ↑ — should recall prior command
tui_snapshot()
```

***

### Surface 3 — Fuzzy find

```
tui_open(cols=120, rows=36)
tui_send_keys("/")
tui_snapshot()                      # fuzzy find open

tui_send_keys("bg")
tui_snapshot()                      # "bg" → re-ranked, background-* tokens should score high

tui_send_keys("col")
tui_snapshot()                      # "bgcol" → background-color should be at top

tui_send_keys("\x1b")               # Esc
tui_snapshot()                      # prior view restored (not home)
```

**Check:**

* [ ] Subsequence scoring: "bgcol" matches "background-color" (H2 — fzf norm)
* [ ] Empty query shows all tokens (H6)
* [ ] Esc restores saved view, not empty (H3)
* [ ] Live re-ranking on every keystroke (H1)
* [ ] Selection preserved in result (highlight on first result)

***

### Surface 4 — Query / list view

```
tui_headless(
  ndjson="/Users/garthdb/Projects/tuiwright/examples/spectrum-design-data/query-background-color.ndjson",
  cols=120, rows=36, format="both"
)
```

**Check:**

* [ ] Column headers visible (H8)
* [ ] Selection arrow `▶` on first row (H1)
* [ ] `j/k` navigation moves selection (H2)
* [ ] `y` yank shows status confirmation (H6/H9)
* [ ] Esc goes back to empty/home (H3)
* [ ] Empty query result has meaningful text, not blank space (H6)

**Empty result state:**

```
tui_open(cols=120, rows=36)
tui_send_keys(":")
tui_send_keys("query property=zzznomatch\r")
tui_wait_for("zzz", 3000)
tui_snapshot()                      # what does "no results" look like?
```

***

### Surface 5 — Describe view

```
tui_headless(
  ndjson="/Users/garthdb/Projects/tuiwright/examples/spectrum-design-data/describe-button.ndjson",
  cols=120, rows=36, format="both"
)
```

**Check:**

* [ ] Token breakdown visible (H8)
* [ ] `j/k`, `↑/↓` scroll (H2)
* [ ] PgUp/PgDn scroll 10 lines (H7)
* [ ] Scroll wheel = 3 lines (H2)
* [ ] Esc goes back (H3)

***

### Surface 6 — Authoring wizard (`:new`)

```
tui_open(cols=120, rows=36)
tui_send_keys(":")
tui_send_keys("new\r")
tui_wait_for("Intent", 3000)
tui_snapshot()                      # S1: Intent screen

tui_send_keys("color-accent")       # type a name
tui_snapshot()                      # autocomplete suggestions?

tui_send_keys("\r")                 # Enter → S2
tui_snapshot()                      # S2: Classification

tui_send_keys("\t")                 # Tab → next field
tui_send_keys("\t")                 # Tab → next field
tui_snapshot()

tui_send_keys("\r")                 # Enter → S3
tui_snapshot()                      # S3: Values

tui_send_keys("\r")                 # Enter → S4 (Confirm)
tui_snapshot()                      # S4: diff preview + rationale input

tui_send_keys("\x1b")               # Esc — cancel whole wizard
tui_snapshot()                      # back to home? draft saved?
```

**Check:**

* [ ] Footer hint line on each screen shows available keys (H6)
* [ ] Tab/Shift-Tab navigates fields on S2 (H2)
* [ ] Reuse/alias banner appears when similar token exists (H5)
* [ ] Diff preview on S4 shows changes clearly (H1)
* [ ] Rationale field is required and validation is clear (H5/H9)
* [ ] `Ctrl+S` on S4 opens $EDITOR for schema editing (H7)
* [ ] Esc saves draft (confirm with `--no-resume-wizard` suppresses it) (H3)
* [ ] `?` while in wizard — what happens? Does help appear? (H6)

***

### Surface 7 — Find wizard (`:find`)

```
tui_open(cols=120, rows=36)
tui_send_keys(":")
tui_send_keys("find\r")
tui_wait_for("Filter", 3000)
tui_snapshot()                      # S1: Filters

tui_send_keys("color")              # type property filter
tui_snapshot()                      # autocomplete from registry?

tui_send_keys("\r")
tui_snapshot()                      # S2: Preview
```

**Check:**

* [ ] Property autocomplete backed by registry (H5/H7)
* [ ] 5 fields navigable with Tab/Shift-Tab (H2)
* [ ] Preview updates on accept (H1)

***

### Surface 8 — Naming wizard (`:name`)

```
tui_open(cols=120, rows=36)
tui_send_keys(":")
tui_send_keys("name\r")
tui_wait_for("Intent", 3000)
tui_snapshot()

tui_send_keys("color\r")
tui_snapshot()                      # S2: Classification

tui_send_keys("\r")
tui_snapshot()                      # S3: Result — assembled name + clipboard yank hint
```

**Check:**

* [ ] Assembled name shown on result screen (H1)
* [ ] `c`/`y` to copy clearly afforded in footer (H6)
* [ ] Clipboard confirmation shown on copy (H9)

***

### Surface 9 — Help overlay

```
tui_open(cols=120, rows=36)
tui_send_keys("?")
tui_snapshot()                      # help overlay open

# Scroll through it:
tui_send_keys("\x1b[B")             # ↓
tui_send_keys("\x1b[B")
tui_snapshot()

tui_send_keys("?")                  # toggle off
tui_snapshot()
```

**Check:**

* [ ] Help covers all surfaces and modes (H6 — recognition over recall)
* [ ] Scrollable (H3)
* [ ] `?` toggles it off (H4 — consistent toggle behavior)
* [ ] Is it reachable from inside a wizard or modal? (H6)

***

### Surface 10 — Error and edge cases

**Invalid command:**

```
tui_open(cols=120, rows=36)
tui_send_keys(":")
tui_send_keys("boguscommand\r")
tui_snapshot()
```

**Check:**

* [ ] Status message is specific and helpful — not just "Error" (H9)
* [ ] App recovers cleanly; palette closes; user can try again (H3)

**Clipboard failure (if applicable):**
Drive `y` yank in an environment where clipboard is unavailable. Verify the error message
copy is helpful.

***

## Report template

````markdown
## TUI UX Review — [scope] — [date]

**Reviewer:** Claude (tui-ux skill)
**Method:** [headless / live / mixed] — [brief justification of tier choice]
**Surfaces covered:** [list]

---

### Summary

[2–4 sentences: overall verdict. Is this TUI well-behaved? What's the dominant theme
of findings (discoverability? error messaging? missing shortcuts)?]

---

### Findings

#### [Surface name]

| # | Severity | Finding | Convention ref | Recommendation |
|---|---|---|---|---|
| 1 | Friction | [what happens] | [tui-conventions.md §X — which app does it right] | [what to change] |

**Evidence:**
[Inline snapshot text block or GIF path]

---

#### [Next surface…]

---

### Triage table

| # | Surface | Severity | Beads ID | Inline fix? |
|---|---|---|---|---|
| 1 | Palette | Friction | beads-NNN | No — needs design |
| 2 | Home | Polish | — | Yes — see below |

---

### Inline fix proposals

**Fix 1 — [title] ([file]:[~line])**

[One-sentence rationale.]

Old:
```[lang]
[old_string]
````

New:

```[lang]
[new_string]
```

Verify: `cargo test -p design-data-tui`

***

### Beads issues filed

* beads-NNN: \[title] (Blocker/Friction)
* beads-NNN: \[title] (Friction)

***

### What's working well

\[A few sentences or bullets on things that are already solid. Not everything needs fixing.]

```
```
