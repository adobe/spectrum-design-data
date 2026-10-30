# Docs index

Start here to find the right document. Statuses were assigned from each file's
header, its references from code, tests and the gap register, and its git
history. They were not all read end to end, so correct any that are wrong.

**Agents:** load only what the task needs. Never load `archive/` unless the user
names a file in it. Treat the gap register (`src/data/design-data-gaps.json`)
as the source of truth for design-data alignment status, not any prose doc.

## Current and canonical

| Doc | Use it for |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | Initiatives, epics, guiding principles, open decisions |
| [design-data-gap-register.md](design-data-gap-register.md) | Generated view of `src/data/design-data-gaps.json`. Do not edit by hand; run `pnpm gaps:docs` |
| [design-data-target-contract.md](design-data-target-contract.md) | Agreed direction and proposed boundaries with design-data. **Hashed evidence pin: do not edit** |
| [design-data-authoring-storage-contract.md](design-data-authoring-storage-contract.md) | How authored data is stored, validated and persisted |
| [design-data-coverage-metrics.md](design-data-coverage-metrics.md) | How coverage is measured on the Analysis page |

## Feature references

How a built feature works. Read when working in that area.

| Doc | Area |
| --- | --- |
| [color-system-data-vis.md](color-system-data-vis.md) | Data-visualization color recipes |
| [contrast-polarity-compensation.md](contrast-polarity-compensation.md) | Contrast and polarity math |
| [category-icons.md](category-icons.md) | Category icons and the icon catalog check |
| [token-value-previews.md](token-value-previews.md) | Token value previews |
| [structure-element-templates.md](structure-element-templates.md) | Structure element templates |

## Hashed evidence pin

| Doc | Why it stays here |
| --- | --- |
| [design-data-pr-1454-review.md](design-data-pr-1454-review.md) | SHA-256 pin (`PR-REVIEW-RECORD`) and watched by the Vite plugin. Historical in content, but **do not edit or move** it without an approved pin review |

Plans that were done are in [archive/](archive/README.md). The gap register and
`scripts/check-design-data-gaps.ts` cite them at their archive paths.

## Proposals for design-data (not yet submitted)

| Doc | Tracked as |
| --- | --- |
| [rfcs/taxonomy-ownership-and-projections.md](rfcs/taxonomy-ownership-and-projections.md) | LTAX-001 to LTAX-004 |
| [rfcs/classification-standard-and-migration.md](rfcs/classification-standard-and-migration.md) | LTAX-011 |
| [rfcs/foundation-recipes-and-stable-identity.md](rfcs/foundation-recipes-and-stable-identity.md) | Recipe storage and UUID-preserving migration proposal; DEBT-017 remains open |

## Other

| Doc | Purpose |
| --- | --- |
| [migration-to-spectrum-design-data.md](migration-to-spectrum-design-data.md) | Plan and agent prompts for moving this project into the spectrum-design-data monorepo as `docs/spectrum-studio` |
| [known-debt.md](known-debt.md) | Open gaps, debt, redundancy and inconsistency. Agents add, surface and remove items (Working rule 5) |
| [third-party/data-vis-notices.md](third-party/data-vis-notices.md) | Third-party license notices |
| [archive/](archive/README.md) | Historical documents. Do not load unless asked |
