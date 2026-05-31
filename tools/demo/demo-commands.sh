#!/usr/bin/env bash
# Demo — copy-paste cheat sheet
# Do NOT execute as a script. Run commands one at a time so the audience can read the output.
# See ./scenarios.md for the narration.

# Expects to be run from the repo root: /Users/garthdb/Spectrum/spectrum-design-data
# `design-data` CLI must be on PATH (or use `cargo run --manifest-path sdk/Cargo.toml --bin design-data --`)

# ─── Demo A — Prototype against Spectrum ────────────────────────────────────

# A1. (no command — visualizer in browser)
# Say: "Same data the spec validates, rendered live."

# A2. Component lookup — agent-readable surface (Phase 8)
# Say: "Anatomy, states, accessibility, token bindings — all machine-readable."
design-data component button \
  --components-dir packages/design-data-spec/components

# A3. Query the design system
# Say: "A designer asks 'what tokens does the button use?' One CLI call. Same answer for the engineer."
design-data query packages/design-data-spec --filter "component=button"

# A4. (no command — switch to Claude Code, ask the question from agent-questions.md)

# ─── Demo B — Blank system ──────────────────────────────────────────────────

# B1. (no command — open clean-component-example.json in the editor)

# B2. Validate a broken token file — triggers SPEC-001 alias-target-exists
# Say: "Dangling alias reference. The validator catches it at authoring time."
design-data validate tools/demo/broken-token-example.tokens.json

# B3. Show the agent-readable primer — the agent's session-start view
# Say: "This is what the agent reads when it opens the system."
design-data primer packages/design-data-spec

# ─── Bonus / safety net ────────────────────────────────────────────────────

# Validate the full Spectrum dataset (use if someone asks "does this really work at scale?")
design-data validate packages/design-data-spec --strict
