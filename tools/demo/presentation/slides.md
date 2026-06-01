---
theme: default
title: design-data — CLI & TUI demos
info: |
  Live demo deck for the design-data CLI/TUI. All beats are asciinema casts
  that auto-pause at each marker so the presenter narrates live — including
  the agent movement, which is a live Claude Code + design-data MCP session.
addons:
  - slidev-addon-asciinema
class: text-center
transition: slide-left
mdc: true
---

# design-data

### Find · Name · Agent

A guided tour of the CLI and TUI for authoring and inspecting Spectrum tokens.

<div class="abs-br m-6 text-sm opacity-60">
Press <kbd>Space</kbd> to advance · each terminal pauses at every beat
</div>

<!--
Presenter: This is a live demo. The terminals you'll see are real recorded
sessions that pause at each step so I can talk through what's happening, then
resume. We'll go in three movements: find what already exists, author a new
token against it, then hand the same data to an AI agent.
-->

***

## layout: section

# 1 · Find & inspect

Search 2,460 tokens, resolve the cascade, read a component contract — all in the terminal.

<!--
First: before authoring anything, see what's already there. Everything here is
deterministic — query, resolve, describe. No model involved.
-->

***

## layout: center

# Find & inspect a token

<Asciinema src="casts/A-find.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:00', theme: 'asciinema', fit: 'width' }" />

<!--
Beat A1 — `:query background-color/*` filters ~2,460 tokens into a Name / Value /
File / Layer table. The TUI loads the whole corpus in about a second.

Beat A2 — `:resolve property=accent-background-color-default,colorScheme=dark`
shows the cascade winner (★) and a Spec specificity column. Same idea as CSS
specificity, but deterministic and auditable.

Beat A3 — `:describe button` pulls the component schema straight from the spec
bundle: anatomy, states, accessibility role, token bindings.

Beat A4 — `/accentbg` is live fuzzy-find: the table re-ranks on every keystroke
with fzf-style subsequence matching (the header reads `Fuzzy: /accentbg`). Enter
keeps the filtered results; Esc restores the previous view. So `:` is the
structured surface (`query`/`find`) and `/` is incremental name search — show
both.
-->

***

## layout: section

# 2 · Name a new token

Reuse-first authoring: the wizard nudges you toward an existing token before you create a duplicate.

<!--
Second movement: authoring. The headline idea is reuse-first — the system
surfaces existing tokens for your intent before letting you mint a new one,
which keeps the cascade coherent.
-->

***

## layout: center

# Name a new token

<Asciinema src="casts/B-name.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:00', theme: 'asciinema', fit: 'width' }" />

<!--
Beat B1 — `:new accent background`. The reuse banner fires because a high-
confidence match exists (threshold 0.35). One Tab takes the alias path straight
to the Confirm diff — a reference, not a duplicate value.

Beat B2 — `:new custom brand overlay` is a genuinely novel intent, so no banner.
Walk the four screens: Intent → Classification (layer, property, name fields,
live preview) → Values (one row per mode combination, alias or literal) →
Confirm (rationale required, live diff).

Note the Confirm diff serializes EVERY mode-combo row as a `sets` block — we
just fixed a bug where only the first row was written. The multi-mode story is
honest on camera now. The diff also emits a structured `name` object (property +
name fields), so the TUI writes the same token shape as the MCP authoring
session — the wizard and agent paths are at parity.
-->

***

## layout: section

# 3 · Agent workflow

The same data, answered by an AI agent through the design-data MCP.

<!--
Third movement: hand the data to an agent. This is a live Claude Code
terminal session with the design-data MCP connected — same format as A and B.
-->

***

## layout: center

# Agent + design-data MCP

<Asciinema src="casts/D-agent.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:00', theme: 'asciinema', fit: 'width' }" />

<!--
Beat D1 — Paste the primary prompt from agent-questions.md: "Using the
design-data MCP, look up the button component and tell me: (1) accessibility
role and keyboard intents, (2) which states it declares, (3) which token
resolves the default background color in dark mode — with citations, not a guess."

Beat D2 — Agent calls mcp__design-data__component for button, reads role,
keyboardIntents, and state names; quotes them with spec citations.

Beat D3 — Agent calls mcp__design-data__resolve for the dark-scheme default
background; quotes the resolved hex/rgb value with a spec citation.

Beat D4 — Closing note: the same answers are reachable without a persistent MCP
via the design-data agent skill (npx @adobe/design-data …) for teams watching
their context budget. The MCP exposes authoring tools too; the skill is read-only.

Record with: tools/demo/presentation/record-casts.sh D (see RECORDING.md for the
full D1–D4 beat table, clean-env checklist, and non-determinism guidance).
See ../agent-questions.md for the verbatim prompt.
-->

***

## layout: center

# What's a model, and what isn't

<div class="text-left max-w-2xl mx-auto">

* `query`, `resolve`, `describe`, `validate` — **deterministic**, auditable.
* `suggest` (and the wizard's reuse engine) — **deterministic lexical ranking**
  (Jaccard similarity), <span class="opacity-70">not a model</span>.
* The **only** model layer is the agent in the Claude Code cast (Demo D).

</div>

<div class="mt-8 opacity-70 text-sm">
Optional companion cast below: the deterministic <code>suggest</code> + <code>primer</code> the wizard uses, in one command.
</div>

<Asciinema src="casts/C-suggest.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:00', theme: 'asciinema', fit: 'width' }" />

<!--
Be precise with the audience: most of design-data is deterministic. `suggest`
is lexical Jaccard ranking, not AI. The agent is the only model. This honesty
is the point — the design system stays auditable.
-->

***

layout: center
class: text-center
------------------

# Thanks

design-data · CLI + TUI + MCP

<div class="opacity-60 text-sm mt-4">
Recording instructions: <code>tools/demo/presentation/RECORDING.md</code>
</div>

<!--
Recap: find → name → agent. Deterministic core, one model layer, all auditable.
-->
