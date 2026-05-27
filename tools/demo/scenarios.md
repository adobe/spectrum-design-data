# Demo Scenarios

Print this. Keep it next to the laptop. Each section is what to do, what to say, and what to expect.

***

## Setup (before walking in)

* Terminal at large font, prompt clean, in `/Users/garthdb/Spectrum/spectrum-design-data`
* Browser tab open to `https://opensource.adobe.com/spectrum-design-data/s2-visualizer/`
* Claude Code open in this repo with the design-data MCP enabled
* This document open on a second screen or printed
* `design-data` CLI built: `cargo build --release --manifest-path sdk/Cargo.toml`

***

## Demo A — Prototype against an existing system (Spectrum)

**The frame**: "A team wants to prototype a feature using Spectrum. Today they fight bespoke tooling, drift between Figma and code, and live debate about what a token means. Here's the new path."

### A1. Live token graph (visualizer)

Open `https://opensource.adobe.com/spectrum-design-data/s2-visualizer/`.

* Search for `button-background-color-default`
* Click the node — show the cascade chain
* Toggle dimensions: **dark** + **mobile** + **high-contrast**
* **Say**: "Same data the spec validates, rendered live. The token resolves across dimension contexts — color scheme, scale, contrast — automatically. Designer and engineer are looking at the same source."

### A2. What does the button declare? (machine-readable surface)

```bash
design-data component button \
  --components-dir packages/design-data-spec/components
```

* **Say**: "The component declaration is the contract. Anatomy, states, accessibility intent (role, keyboard intents, WCAG citations), exactly which tokens it binds. The agent reads this. The build reads this. The visualizer reads this. One source."

### A3. Filter the design system by query

```bash
design-data query packages/design-data-spec --filter "component=button"
```

* **Say**: "A designer asks 'what tokens does the button use?' This used to be a code-archaeology task. Now it's one CLI call. Same answer for the engineer."

### A4. Agent answers a real question

Switch to Claude Code. Ask the question from `agent-questions.md`.

* **Say**: "The MCP exposes the spec to the agent. The designer asks a question in English; the agent reads the live spec and answers. No middleware. No drift."

***

## Demo B — Starting a blank design system

**The frame**: "A new product wants its own design system. Today they re-invent token naming, accessibility metadata, and validation. Here's what the spec gives them on day one."

### B1. The contract

Open `tools/demo/clean-component-example.json` in the editor.

* **Say**: "This is a complete, valid component declaration. Identity, options, anatomy, states with accessibility-aware fields, a semantic accessibility role + WCAG citations, and a typed prose block. The schema enforces the structure; 43 SPEC rules enforce the semantics. A new team gets all of this on day one — they don't reinvent it."

### B2. Validation catches real mistakes

```bash
design-data validate tools/demo/broken-token-example.tokens.json
```

Expect: `error: ... [SPEC-001] Alias target not found for $ref: this-token-does-not-exist`

* **Say**: "A token that aliases something that doesn't exist. Easy to miss in review. The validator catches it before it ships. There are 42 more rules like this one — covering naming, cascade, accessibility, deprecation lifecycle. The contract is enforced."

### B3. The agent as participant

```bash
design-data primer packages/design-data-spec
```

* **Say**: "This is what the agent reads when it opens the system — categories, conformance scope, the validation rules in play, how to author. A designer describes a new component in plain language; the agent uses the MCP to author a schema-conformant declaration, runs validate, opens a PR. The spec is the contract that lets the agent participate safely."

***

## Backup if anything fails

* **Visualizer down** → run `pnpm dev` in `docs/s2-visualizer/` for a local copy
* **CLI command fails** → cut to the screen recording in `tools/demo/recordings/` (if recorded)
* **Agent demo fails** → fall back to showing `design-data primer packages/design-data-spec` — same information, no live network dependency

***

## Closing line for the demo block

*"Designer, engineer, agent — same source, same answer, validated continuously. That's the live system."*
