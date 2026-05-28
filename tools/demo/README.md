# Demo Materials

Self-contained demo assets. Print `scenarios.md`, keep it next to the laptop, copy-paste from `demo-commands.sh`.

| File                               | Purpose                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scenarios.md`                     | The narration. Both demo flows with the exact commands and what to say at each step.                                                                                                                                |
| `demo-commands.sh`                 | Copy-paste cheat sheet. Each command preceded by what to say. Not auto-executable — run commands one at a time so the audience can read the output.                                                                 |
| `verify-demo.sh`                   | Auto-runnable preflight check. Builds the CLI, then exercises every shell command in the demo and asserts expected output. Run via `moon run demo:verify` before walking into the room.                             |
| `clean-component-example.json`     | A minimal valid component declaration. Used to show the spec contract at its smallest: identity, anatomy, states (with accessibility-aware fields), top-level accessibility role + WCAG citations, document blocks. |
| `broken-token-example.tokens.json` | A token file with a dangling alias `$ref` — triggers SPEC-001 (`alias-target-exists`). Used for the "validator catches mistakes live" moment.                                                                       |
| `agent-questions.md`               | The prepared Claude Code question, exact wording, expected answer shape.                                                                                                                                            |

Originally prepared for the May 15 2026 design director review; retained as general demo assets.

## Verifying before a demo

Run from the repo root:

```bash
moon run demo:verify
```

This builds the CLI in release mode and runs every automatable demo command (A2, A3, B2, B3, and the full-dataset bonus check). Manual steps — the S2 visualizer (A1), the Claude Code agent question (A4), and opening `clean-component-example.json` (B1) — are out of scope for the script; see `scenarios.md` for those.
