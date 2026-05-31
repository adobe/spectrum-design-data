---
theme: default
title: design-data — CLI & TUI demos
info: |
  Live demo deck for the design-data CLI/TUI. Terminal beats are asciinema
  casts that auto-pause at each marker so the presenter narrates live; the
  AI/MCP beat is a recorded Cursor video.
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

(The `/` fuzzy-find key is intentionally avoided — it isn't wired up yet. Search
is `:query` and `:find`.)
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
honest on camera now.
-->

***

## layout: section

# 3 · Agent workflow

The same data, answered by an AI agent through the design-data MCP.

<!--
Third movement: hand the data to an agent. This beat is a recorded Cursor
session because the agent work happens in the GUI.
-->

***

## layout: center

# Agent + design-data MCP

<video controls width="900" class="mx-auto rounded shadow-lg">
  <source src="/video/agent-mcp.mp4" type="video/mp4" />
  Your browser does not support embedded video. The recording lives at
  <code>public/video/agent-mcp.mp4</code>.
</video>

<!--
The agent reads the `button` component (role, keyboard intents, states) and
resolves the dark-mode background — with citations from the spec, not a guess.
Stretch: it drafts a `demo-banner` declaration from alert-banner patterns
without writing to disk.

Record this with: screen-capture the Cursor + design-data MCP session, save to
public/video/agent-mcp.mp4. See ../agent-questions.md for the exact prompt.
-->

***

## layout: center

# What's a model, and what isn't

<div class="text-left max-w-2xl mx-auto">

* `query`, `resolve`, `describe`, `validate` — **deterministic**, auditable.
* `suggest` (and the wizard's reuse engine) — **deterministic lexical ranking**
  (Jaccard similarity), <span class="opacity-70">not a model</span>.
* The **only** model layer is the agent in the recorded video.

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
