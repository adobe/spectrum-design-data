# Demo Materials

Self-contained demo assets. Print `scenarios.md`, keep it next to the laptop, copy-paste from `demo-commands.sh`.

| File                               | Purpose                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scenarios.md`                     | The narration. Both demo flows with the exact commands and what to say at each step.                                                                                                                                |
| `demo-commands.sh`                 | Copy-paste cheat sheet. Each command preceded by what to say. Not auto-executable — run commands one at a time so the audience can read the output.                                                                 |
| `clean-component-example.json`     | A minimal valid component declaration. Used to show the spec contract at its smallest: identity, anatomy, states (with accessibility-aware fields), top-level accessibility role + WCAG citations, document blocks. |
| `broken-token-example.tokens.json` | A token file with a dangling alias `$ref` — triggers SPEC-001 (`alias-target-exists`). Used for the "validator catches mistakes live" moment.                                                                       |
| `agent-questions.md`               | The prepared Claude Code question, exact wording, expected answer shape.                                                                                                                                            |

Originally prepared for the May 15 2026 design director review; retained as general demo assets.
