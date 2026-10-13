# TUI Conventions Reference

Cross-TUI conventions: what users expect, why, which apps establish the norm, and how
`design-data` currently handles it. Use this as a checklist when evaluating any surface.

Format: **Convention** → *Why users expect it* → exemplar apps → design-data status.

***

## 1. Keybinding vocabulary

### Vim-style directional navigation

`j`/`k` = down/up; `h`/`l` = left/right; `g` = go to top; `G` = go to bottom.

*Why:* Muscle memory from vim/helix is the single most common shared skill across terminal
users. Any navigable list that lacks `j/k` feels foreign to this cohort.

*Exemplars:* vim, helix, lazygit, gitui, k9s, ranger, tig, gh dash.

*design-data:* ✓ `j/k` and `↑/↓` dual-bound in list views and describe view. `h/l` bound
in wizard screen 3 for layer cycling. `g/G` are **not bound** for top/bottom — a gap for
power users.

***

### `Esc` = cancel / go back one step

`Esc` should undo the most recent navigation or close the most recent modal — never jump
all the way out without warning.

*Why:* Universal in TUIs, browsers, and GUI apps. Users hammer Esc to exit a bad state.
If Esc exits too much at once, they lose work.

*Exemplars:* helix (mode back), lazygit (panel back), fzf (cancel search, not quit),
k9s (namespace nav back).

*design-data:* \~ Partial. `Esc` in list views goes back to empty (correct). `Esc` in the
command palette cancels and restores the saved view (correct). In the **naming wizard** Esc
cancels the entire wizard from any screen — there is no per-screen back. Worth evaluating
whether screen-by-screen cancel is needed (compare authoring wizard, which also uses Esc
to cancel from any screen).

***

### `q` = quit (from top level), not a universal panic button

`q` should quit the app when at the idle/home state and do nothing (or do nothing
surprising) when a modal is active.

*Why:* Users expect `q` to work like vim's `:q` — it quits, but not if something is
open. Accidental quits during modal operation are a common frustration.

*Exemplars:* lazygit, k9s, ranger (`q` quits; wizard/form navigation uses Esc).

*design-data:* ✓ `q` is only active when the palette is closed (routed through `update`
after mode check). `Ctrl-C` always quits. Correct.

***

### `Ctrl-C` = hard quit, always

`Ctrl-C` must always exit, even from deep modal state, because it's the Unix interrupt.

*design-data:* ✓ `Ctrl-C` is checked first in `update` before any mode routing.

***

### `?` = help overlay

`?` should open a contextual help panel listing current keybindings. It should be
accessible from any state.

*Why:* Users who don't know the bindings will try `?` before reading a README. If it does
nothing in a modal, they're stuck.

*Exemplars:* lazygit (`?`), k9s (`?`), ranger (`?`).

*design-data:* \~ Partial. `?` opens a global help overlay from the main view. It is **not
accessible from inside a wizard** — pressing `?` while a wizard is open does nothing visible.
Users in a wizard have no in-app reminder of what keys they can use (the footer hint is
the only affordance there).

***

### `:` = command palette / ex-mode

`:` opens a command-line input with autocomplete. Users expect history recall (↑/↓),
Tab completion on command names, and Esc to cancel.

*Why:* vim, helix, and lazygit all use `:` for command entry. k9s uses `:` for resource
navigation. It's well-established.

*design-data:* ✓ `:` opens the command palette. Tab completes canonical command names.
↑/↓ recalls history. Esc cancels and restores. Matches convention.

***

### `/` = search / filter

`/` starts a live filter or search over the current list.

*Why:* vim, less, lazygit, k9s, ranger, tmux copy mode — universally `/` means "start
searching this content."

*design-data:* ✓ `/` opens fuzzy find with live re-ranking. Matches convention well.

***

### `y` / `Enter` = yank / confirm

`y` yanks the highlighted item to clipboard (vim muscle memory). `Enter` confirms
a selection or advances a form.

*design-data:* ✓ `y` yanks selected token name in list views. `Enter` confirms palette
input and advances wizard screens. Both correct.

***

### `Tab` = advance / autocomplete

`Tab` should either complete a partial input (in command-line contexts) or advance focus
to the next field (in forms). `Shift-Tab` reverses.

*design-data:* ✓ In palette (command mode): Tab completes to canonical name. In wizard
screen 2: Tab/Shift-Tab cycles fields. In wizard screen 1: Tab jumps to Confirm as
reuse shortcut. Correct.

***

### Readline / emacs line-editing in text inputs

`Ctrl-A` = start of line, `Ctrl-E` = end of line, `Ctrl-W` = delete word, `Ctrl-U` =
delete to start.

*Why:* These are readline defaults. Terminal users rely on them for all text inputs,
including TUI inputs. Their absence is felt immediately when editing a long command.

*Exemplars:* fzf, atuin, any readline-backed input.

*design-data:* Depends on `tui-input` crate's built-in support. **Verify via live
driving** — type a long command, move with Ctrl-A/E, delete with Ctrl-W. If any are
missing, it's a friction point.

***

## 2. Discoverability and feedback

### Always-visible hint line / footer

A single line at the bottom (or contextually placed) should show the most relevant
available actions for the current state.

*Why:* Users in an unfamiliar state need affordance. Even experienced users forget
infrequent shortcuts.

*Exemplars:* lazygit (bottom bar, context-changes per panel), k9s (hint strip),
helix (mode line), nano (^X Exit ^O Write…).

*design-data:* ✓ Wizard screens show a footer hint line with context-specific keys.
The main view shows the status bar. However, **list view footer** shows token name and
status message but not a "key hint" row — users may not know `y` is available.

***

### Meaningful empty states

When a search or query returns nothing, say why and what to try. "No results" alone is
poor; "No tokens matching 'foo' — try :query for all tokens" is good.

*design-data:* **Verify via live driving.** Run a query/fuzzy search with a term that
matches nothing; observe what renders in the table area.

***

### Informative error messages

Errors should say what went wrong AND what to do next. "Error" alone fails. "Invalid
property name 'colr' — did you mean 'color'?" succeeds.

*design-data:* Status messages display on error (e.g. validate diagnostics). **Check
message copy** by driving error scenarios (invalid command, empty wizard field, clipboard
failure).

***

### Status feedback for async operations

Long-running operations (validate, describe) should show a visible indicator — at minimum
a spinner or "…loading" status — so users know the app is working.

*design-data:* `status_message` field is rendered in the status bar area. Verify that
validate/describe show interim feedback when the token graph is large.

***

## 3. Navigation and modes

### Mode indicator

If the app is modal (different key meanings in different modes), the current mode must be
clearly visible. Invisible mode switches cause "why is `j` not moving me?" confusion.

*Why:* vim's single worst flaw (for new users) is invisible mode. Modern modal TUIs
display the mode name.

*Exemplars:* helix (mode shown in status bar), vim with airline/lightline.

*design-data:* The TUI has `Mode::Browsing | InModal | InPalette`. The palette prompt `:` is
visible in the footer. Wizard screens are full-screen modals with their own UI. However,
during mouse-selection mode (`v`), there is no visible indicator that mouse mode changed —
**verify whether the mode is telegraphed visually**.

***

### Consistent back-stack

`Esc` should always take the user back exactly one step. If entering a modal took one
keystroke, leaving it should take one `Esc`.

*design-data:* List views → `Esc` returns to empty/home. Palette → `Esc` restores saved
view (correct). Wizard → `Esc` cancels the whole wizard (may be surprising on screen 3/4
after filling in several fields). **Evaluate with users or by judgment: should the wizard
support per-screen back?**

***

## 4. Command palette and fuzzy find

### Subsequence matching (not substring)

Fuzzy matching should score non-contiguous character sequences, not just substrings.
"bgc" should match "background-color."

*design-data:* ✓ `fuzzy.rs` uses `subsequence_score` with consecutive-run and
word-boundary bonuses.

***

### Live re-ranking on every keystroke

The result list should update instantly as the user types — no submit required.

*design-data:* ✓ Fuzzy find re-ranks on every keystroke via `apply_fuzzy_filter`.

***

### Command history recall

Previous commands should be accessible via ↑/↓ in the palette.

*design-data:* ✓ `palette_history` recalled with ↑/↓ in command mode.

***

### Command aliases

Common aliases (`component` for `describe`, `create` for `new`) reduce friction for users
who try the obvious name.

*design-data:* ✓ `define_commands!` macro supports aliases. Check `src/command.rs` for
the full alias list; evaluate whether any common natural names are missing.

***

## 5. Wizards and forms

### Field navigation with Tab/Shift-Tab

Multi-field forms must support Tab (forward) and Shift-Tab (backward) between fields.
Arrow keys for choices within a field.

*design-data:* ✓ Wizard screen 2 uses Tab/Shift-Tab for field navigation.

***

### Validation timing

Validate on submit (not on every keystroke for expensive checks); show errors inline
next to the offending field, not as a generic status message.

*design-data:* **Verify** — in the wizard, what happens when you submit screen 1 with
an empty input? Does the error appear near the field or in the status bar?

***

### Draft auto-resume

If the user is mid-wizard and quits (or the app crashes), drafts should be restored on
next launch (with an opt-out).

*design-data:* ✓ Wizard drafts are persisted to `dirs::data_dir()` and restored unless
`--no-resume-wizard` is passed.

***

### Reuse/alias suggestions

When creating a new item, surface similar existing items to avoid duplicates.

*design-data:* ✓ Wizard shows a "reuse-first" banner when top suggestion confidence
≥ `alias_threshold()`.

***

## 6. Responsiveness and layout

### Graceful resize

The app should handle terminal resize without crashing, data loss, or layout corruption.
Content may re-wrap or truncate, but state must be preserved.

*design-data:* ✓ ratatui redraws on resize. `TestBackend` at narrow sizes verified by
`tests/layout.rs`. Logo drops below 33 content rows. Verify resize mid-wizard via live
driving.

***

### No panic on tiny terminals

Apps must not crash on 1×1 or 1×N or N×1 terminals. Render nothing or a minimal
indicator, but don't panic.

*design-data:* ✓ `tests/layout.rs` has 10×5 and 1×33 no-panic tests.

***

### Content degrades gracefully

Non-essential elements (logo, headers, decorations) drop first on small terminals;
core content stays.

*design-data:* ✓ Logo is conditional on terminal height. Verify with `tui_resize` that
the core command table and status bar remain visible when the logo drops.

***

## 7. Color, theming, and accessibility

### `NO_COLOR` / 16-color fallback

Apps should respect `NO_COLOR` or provide a non-truecolor mode for users on basic
terminals or with accessibility needs.

*design-data:* ✓ `theme::terminal()` provides a 16-color preset. Verify it is the
default in normal launch (not `--theme spectrum`).

***

### Not color-alone

Information must not rely on color alone. Status, errors, and selection must also be
communicated by text or symbol.

*design-data:* Selection uses `selection_bg` highlight AND the `▶` selection arrow.
Error/warn states use semantic color AND a label. Generally good — verify edge cases.

***

## 8. Mouse and clipboard

### Scroll, click-to-select, drag-to-copy

Scroll wheel should work everywhere. Clicking a row should select it. A user should
be able to drag-select text with the native terminal selection.

*Why:* Many TUI users want mouse + keyboard. Trapping all mouse events without a
native-selection escape hatch frustrates copy-paste.

*design-data:* ✓ Scroll and click-to-select are supported. `v` toggles text-selection
mode (escape hatch from mouse capture). `Shift-drag` uses native terminal selection.
Verify that `v` mode is discoverable — check if it appears in the help overlay and
in the status line.

***

### Clipboard feedback

When yank succeeds, show brief confirmation. When it fails (missing clipboard tool),
show a clear error.

*design-data:* `ClipboardDone(Some(err))` surfaces as a status message. Verify the
message copy is helpful (e.g. "Copied to clipboard" vs "WriteDone").

***

## 9. Safety

### Confirmation for destructive actions

Actions that create or modify persisted data (`:new` writing a token) should have
a confirmation step.

*design-data:* ✓ The authoring wizard screen 4 (Confirm) requires typing a rationale
and pressing Enter. The diff preview shows what will be written.

***

### Non-blocking long operations

Operations that take >200ms should not block the UI. They should run as a Task::Cmd
and show feedback via the status bar.

*design-data:* ✓ TEA architecture: all I/O returns Task::Cmd and runs off the main
loop. Verify subjective feel for describe/validate on large datasets.

***

## Exemplar roster

When citing conventions in findings and reports, reference these apps by name:

| App                   | Convention strength                                          |
| --------------------- | ------------------------------------------------------------ |
| **vim / helix**       | Keybinding vocabulary, modal clarity, mode indicator         |
| **fzf**               | Fuzzy matching UX, `/` entry, live re-rank                   |
| **lazygit**           | Context-switching, footer hints, panel navigation, Esc stack |
| **gitui / tig**       | Simpler lazygit-style, good for reference                    |
| **k9s**               | `:` resource nav, `?` help, table views, filter-in-place     |
| **htop / btop**       | Status visibility, color degradation, mouse + keyboard       |
| **ranger / yazi**     | Three-panel nav, `j/k`, bookmarks, preview pane              |
| **gh dash**           | PR/issue table, labels, filter-first                         |
| **atuin**             | History search, fuzzy, Ctrl-R integration                    |
| **ratatui ecosystem** | General ratatui app norms (tui-rs successor)                 |
