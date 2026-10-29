# Archive

Historical documents. They record decisions, audits and plans that are already
implemented or superseded. **Agents: do not load or follow anything here unless
the user asks for it by name.** Use [docs/README.md](../README.md) to find current
documents.

| Archived file | Why it is here |
| --- | --- |
| `architecture-alignment-audit.md` | October 2026 internal audit; findings are implemented or tracked in the gap register |
| `architecture-alignment-plan.md` | Plan that produced the audit and the target contract; implemented |
| `design-data-alignment-review.md` | Point-in-time alignment review; superseded by the gap register |
| `design-data-portable-contract-proposal.md` | Early portable-contract proposal; superseded by `design-data-target-contract.md` |
| `tokens-browser-plan.md` | Plan for the Tokens browser; implemented |
| `changelog-plan.md` | Changes parity plan; implemented. Cited as evidence by the gap register (LTAX-016) |
| `tshirt-size-generation-plan.md` | T-shirt size generation plan; implemented. Cited by LTAX-009 |
| `token-taxonomy-order-plan.md` | Taxonomy and order plan; implemented. Cited by LTAX-001 to LTAX-004 and the taxonomy RFC |
| `design-data-alignment-gaps.md` | Original GAP-001 to GAP-009 list. `scripts/check-design-data-gaps.ts` still reads its `### GAP-n:` headings, so keep the headings |

## Known stale links

`docs/design-data-target-contract.md` still links to seven of these files at
their old paths (for example `architecture-alignment-audit.md`). That file is a hashed
evidence pin in `src/features/design-data/assessmentPins.ts`, so it was
deliberately not edited. The links now resolve here, in `docs/archive/`.
