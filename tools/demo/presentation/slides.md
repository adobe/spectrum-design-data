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

Search 4,166 tokens, resolve the cascade, read a component contract — all in the terminal.

<!--
First: before authoring anything, see what's already there. Everything here is
deterministic — query, resolve, describe. No model involved.
-->

***

## layout: center

# Find & inspect a token

<Asciinema src="casts/A-find.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:02', theme: 'asciinema', fit: 'width' }" />

<!--
Beat A2 — :resolve property=accent-background-color,colorScheme=dark shows the
cascade winner (★) and the full candidate table with a Spec specificity column.
Same idea as CSS specificity, but deterministic and auditable. The winner is the
accent-color-800 alias in the foundation layer.

Beat A3 — :describe button pulls the component schema straight from the spec
bundle: anatomy, states, accessibility role, token bindings — the full contract
the agent reads.

Beat A4 — /accentbg is live fuzzy-find: the table re-ranks on every keystroke
with fzf-style subsequence matching (the header reads "Fuzzy: /accentbg"). Enter
keeps the filtered results; Esc restores the previous view. So : is the
structured surface (resolve/describe/query) and / is incremental name search —
show both.
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

<Asciinema src="casts/B-name.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:02', theme: 'asciinema', fit: 'width' }" />

<!--
Beat B1 — :new accent background opens the wizard at Screen 1 (Intent). The
list shows existing matches ranked by confidence. One Tab takes the alias path
straight to Screen 4 (Confirm diff) — a reference, not a duplicate value.
We Escape out here to keep the dataset clean.

Beat B2 — :new custom brand overlay is a genuinely novel intent, so no
high-confidence reuse match. Walk the four screens:
  Screen 1 Intent → Screen 2 Classification (layer, property, name fields,
  live preview) → Screen 3 Values (one row per mode combination, alias or
  literal) → Screen 4 Confirm (rationale required, live diff).

Note the Confirm diff serializes every mode-combo row as a sets block. The
diff also emits a structured name object (property + name fields), so the TUI
writes the same token shape as the MCP authoring session — the wizard and agent
paths are at parity.
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

<Asciinema src="casts/D-agent.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:07', idleTimeLimit: 3, theme: 'asciinema', fit: 'width' }" />

<!--
Beat D1 — Agent receives the prompt and immediately calls describe_component for
button. Pause here to read the question aloud if the audience hasn't seen it:
"Using the design-data MCP, look up the button component and tell me:
(1) accessibility role and keyboard intents, (2) which states it declares,
(3) which token resolves the default background color in dark mode —
with citations from the spec, not a guess."

Beat D2 — Agent reads the describe_component result: role (button, ARIA),
keyboardIntents, and the state list. It quotes these with citations from the spec.
Pause to call out that the agent is reading the actual component schema —
the same contract the TUI showed in Demo A.

Beat D3 — Agent attempts resolve_token, hits an initial failure (property name
mismatch), then queries for the right property name and resolves successfully.
Worth narrating: "It tried, got a tool error, searched for the right property,
and resolved it — the same thing an engineer would do, but in seconds."
The resolved value comes back with a cascade citation.

Beat D4 — Agent wraps up. Pause to note: the same answers are reachable
deterministically via the design-data CLI (design-data suggest / resolve) for
teams watching their context budget. The MCP adds authoring tools on top;
the CLI is read-only and always available.

Why this works as well as it does: every token carries a structured name object
(component / property / state / colorFamily / ...), not a flat kebab string.
The agent can reason about naming patterns, flag gaps, and validate terms against
spec vocabulary registries. Structured names are what make it a collaborator,
not just a search wrapper.

To re-record: bash tools/demo/auto/auto-demo.sh D --record (plain terminal only).
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
Optional companion cast below: the deterministic <code>suggest</code> + <code>primer</code> commands.
</div>

<Asciinema src="casts/C-suggest.cast" :playerProps="{ pauseOnMarkers: true, cols: 120, rows: 36, poster: 'npt:0:04', theme: 'asciinema', fit: 'width' }" />

<!--
Beat C1 — design-data suggest "primary background color" returns ranked
candidate tokens by lexical Jaccard similarity. Honest framing: this is
deterministic ranking, not AI.

Beat C2 — design-data primer packages/design-data/tokens emits the structural
overview the agent reads at session start: token count, mode sets, component
list, conformance scope. This is what grounds the agent in the actual dataset.

Be precise with the audience: most of design-data is deterministic. The agent
is the only model layer. This honesty is the point — the design system stays
auditable.
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
The through-line: structured name objects (cascade format) make both authoring
paths better — the wizard steps through taxonomy fields, the agent reasons across
them. Same data, two surfaces, one coherent system.
-->
