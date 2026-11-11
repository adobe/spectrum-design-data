<!-- Copyright 2026 Adobe. All rights reserved. -->

# Master migration plan

## North star

**Spectrum Studio's shipped default data and web application become the complete
authoring system for `packages/design-data`.** Designers author reusable systems;
Studio generates or updates canonical data without losing existing values,
identities, relationships or other content.

The path is: build parametric generators and scalable authoring experiences,
refine their parameters and defaults, use limited explicit overrides for remaining
differences, prove exact package-wide reproduction, then enable approved
repository migration and ongoing editing.

This is direction, not a claim of current coverage or permission to implement
every milestone. It does not prescribe a generator engine, storage format,
identity manifest, file naming convention or schema extension.

## Agent core: apply to every task

1. **Stay within the request.** Link work to the relevant milestone below and
   existing initiative/epic. Alignment is not permission to expand an epic,
   change schemas, migrate data or publish work.
2. **Author systems, not duplicate outputs.** Reuse formulas, scales, modes,
   Registry terms, Structures, Styles, rules and option groups. Identify the
   authored owner -> shared derivation/resolution -> affected consumers.
3. **Preserve identity and intent.** Generation, preview and export must not
   remint existing identities. Names, values and file paths are not identity.
   Explicit references, aliases, mode ownership and metadata must survive.
4. **Prefer shared corrections, then bounded overrides.** Refine the owning
   algorithm and default parameters before overriding residual token values.
   Do not turn a generator into a disguised table of target values.
5. **Prove the specific claim.** Representation, approximate agreement, exact
   reproduction, identity preservation, RFC acceptance and safe writes are
   separate outcomes. A test pass or dashboard score cannot establish them all.
6. **Keep exploration editable.** Reference differences remain diagnostics.
   Publication-readiness checks can reject a migration without blocking
   loading, previewing or authoring a divergent system.

**MUST** denotes an invariant. **SHOULD** denotes a recommendation; explain a
necessary deviation and obtain approval where existing rules require it.
**MAY** denotes an option, not authorization.

## Which source answers which question?

| Question | Source |
| --- | --- |
| Destination, invariants and migration acceptance | This document |
| Initiative/epic ownership, delivery status and open planning decisions | [ROADMAP.md](ROADMAP.md) |
| Task procedures, safety and approval requirements | [AGENTS.md](../AGENTS.md) and its relevant rules/skills |
| Established alignment and outstanding requirements | [Canonical gap register](../src/data/design-data-gaps.json) and linked evidence |
| Current persistence and publication contracts | [Authoring/storage contract](design-data-authoring-storage-contract.md) |
| Existing comparison policies and denominators | [Coverage metrics](design-data-coverage-metrics.md) |
| Local implementation debt | [Known debt](known-debt.md) |
| Proposed schema/architecture choices and rationale | [Existing RFCs](README.md#proposals-for-design-data-not-yet-submitted) and explicit review records |

Load this core, then only the roadmap sections and skills relevant to the task.
Do not copy statuses into this document or create a parallel alignment register.
Instruction discovery varies by agent; the entry point is the existing Studio
agent guidance, not an assumption that this file loads automatically.

The pinned [target contract](design-data-target-contract.md) records broader
representability proposals, including valid differences. Preserve that evidence.
This plan adds a distinct requirement: exact reproduction of the reviewed
existing dataset before repository cutover. An intentional difference may be
valid authoring but does not satisfy that reproduction milestone.

If a request, procedure, proposal or recorded decision conflicts with this
direction, identify the conflict and request the bounded decision. Do not silently
rewrite policy, refresh evidence pins or treat a proposal as an accepted schema.

## Package-wide scope

The destination covers all seven surfaces, not only token values.

| Surface in `packages/design-data` | Required capability |
| --- | --- |
| `tokens/` | Generate/update primitive and semantic records, literal values, aliases, classifications, lifecycle and required mode contexts |
| `mode-sets/` | Author declarations, defaults, mode ownership and contextual assignments; preserve fallback and override semantics |
| `registry/` | Author shared vocabulary and classifications with stable references, rather than parallel naming systems |
| `components/` | Author structure, anatomy, style associations and supported options/declarations using reusable definitions |
| `relationships/` | Derive token relationships from explicit component Structure/Style associations; preserve existing relationship identities and meaningful exceptions |
| `guidelines/` | Losslessly author structured guidance, metadata and references |
| `visuals/` | Author/manage visual definitions or assets and their references without losing content |

Anatomy and layout do not have to become tokens. Guidelines and visual assets do
not have to become formulas. Studio previews alone do not establish `visuals/`
support. A surface is covered only when its appropriate authoring and
preservation behavior is demonstrated.

The target inventory MUST also account for supporting package content such as
fields, icons, naming exceptions and generated changelogs. Respect its existing
owners and generation procedures; do not overwrite it or invent unrelated
editors. Unsupported content remains a visible requirement, not an exclusion
that makes completion easier.

## System and identity invariants

Authored intent and references -> shared domain derivation/resolution ->
preview, Tokens, Analysis, Changes/Impact, export and eventual repository writes.
Adapters may differ; they MUST NOT independently recompute domain semantics.
Released data remains usable without evaluating Studio's authoring formulas.

Authored inputs, derived output and temporary preview state MUST stay distinct.
Saved, working and shipped-default evidence MUST name its actual source.
Persisted edits retain Save, Cancel, reload, Changes, scoped Impact and reset
behavior through the existing authoring lifecycle.

Existing token concepts retain their `conceptId`; each existing mode record
retains its `uuid`. Preserve component, relationship and other stable IDs too.
Generation consumes stored identity rather than allocating it. Genuinely new
entities or contexts may receive identities at explicit authoring/reconciliation
boundaries, persisted before preview/export uses them. Matching labels or equal
values alone MUST NOT establish identity.

Renaming, reordering, value changes, override/reset and regeneration MUST NOT
replace an existing concept's identity. Splits, merges, retirement, restoration
and conflicting identity adoption need explicit policy and coordinated reference
migration, not automatic guesses. Reuse the existing canonical identity owner
before proposing another contract or store.

Overrides SHOULD be the smallest justified residual set. Each MUST be explicit,
mode-scoped where needed, visible, reversible and linked to its generated
baseline and rationale. Measure generated exactness separately from effective
exactness after overrides. Review stale overrides after upstream changes.
No arbitrary override percentage is prescribed; expanding the set requires
evidence and review, not a convenient shortcut to 100%.

Schemas SHOULD be reused unchanged. Necessary extensions require demonstrated
representational need, alternatives, ownership, compatibility and approval.
Do not alter canonical target values to accommodate an exporter limitation.
Review schema changes across `packages/design-data-spec` and affected consumers,
not only the data package.

## Evidence gates

These labels are stable planning references, not deadlines or delivery statuses.
Work can iterate through bounded vertical slices. Identity, schema reasoning and
consumer discovery begin early; they are not postponed until cutover.

| Gate | Outcome required |
| --- | --- |
| **M0 Target baseline** | Reviewed package-wide inventory: input revisions/content hashes, including dirty inputs, records, contexts, assets, metadata, references and explained scope |
| **M1 Authoring coverage** | Each surface is losslessly representable and editable through its owner; reusable definitions reach relevant previews/output and lifecycle consumers |
| **M2 System/default refinement** | Reviewed algorithms and default parameters reduce differences without unrelated regressions; exact, near-match and unresolved results remain separate |
| **M3 Exact reproduction** | Shipped defaults plus justified residual overrides reproduce all required existing canonical data; no missing or unassessable requirements |
| **M4 Identity and round-trip proof** | Existing identities/references survive generation, Save/Cancel, reload, reset and read/write round trips; repeated output has no unexplained additions, deletions or changes |
| **M5 Repository cutover** | Global M3/M4 evidence precedes write-enabled migration: approved layout/schema mapping, dry run, complete diff, consumer validation, recovery procedure and explicit write approval |
| **M6 RFC and draft PR** | Comprehensive schema-change rationale, alternatives, compatibility/migration evidence and linked proposals support a separately authorized draft PR for the working branch |

M3/M4 require the complete reviewed scope, not just a successful pilot family.
Preparing read-only adapters, a writer or a migration proposal earlier is
permitted within an approved task; applying canonical writes is not.

After cutover, the same owners generate/update repository data as designers edit.
Existing consumers MUST continue to load and resolve it. A second unchanged
generation/write run MUST be a no-op; new input changes only the intended data.
Renamed/reorganized token files need explicit old-to-new mappings and an inventory
of loaders, glob assumptions, references, validators, SDK embedding/codegen,
MCP readers, exporters and release consumers.

Accumulate RFC rationale throughout the work. The eventual RFC MUST distinguish
existing schema support, necessary extensions and rejected alternatives; explain
authoring versus published data, identity and override methods, file layout,
compatibility, migration/recovery and validation evidence. Incorporate existing
RFCs by reference rather than silently accepting or duplicating them. Local
branch changes, RFC acceptance, PR creation and merge are separate permissions
and facts.

## What counts as 100%?

**Complete exact reproduction is a package-wide evidence claim against a
reviewed baseline, not a single token-coverage percentage.**

| Claim | Required proof |
| --- | --- |
| Coverage | Every required record/context and non-token artifact is inventoried and represented; unsupported, ambiguous or unresolved requirements remain visible |
| Exact data | Canonical values, structured classifications, units, aliases, context ownership, lifecycle, metadata and relationships agree |
| Identity/reference integrity | Existing IDs are preserved and all references resolve to the intended entities, not merely equal-valued substitutes |
| Lossless round trip | Read -> authoring -> generated/write output retains complete data; aliases are not flattened away and assets/content are not dropped |
| Consumer compatibility | Approved schema/path changes preserve package loading, cascade resolution, SDK/MCP/export/release behavior and relevant validations |

Whitespace and JSON object-key order are not semantic changes. Other
normalization MUST be lossless, explicit and reviewed; equal rendered colors or
resolved values do not justify discarding notation, units or aliases. Preserve
non-JSON asset bytes unless a separately approved migration changes them.
Reviewed schema/path mappings may change representation, not silently erase
existing meaning or content.

Current active-token metrics can exclude deprecated records or classify app
enhancements separately. They do not prove package preservation: retain
deprecated records, compatibility aliases and other inventoried content too.
App enhancements never offset missing reference requirements. Required mode
contexts come from actual reference ownership/cascade semantics, not a Cartesian
product of every preview setting.

Near-match color tolerance is useful for M2, not M3. Mirrored fixtures, selected
table filters, working-only overrides, a green local test or an accepted RFC
cannot establish migration completion. The final result MUST be reproducible
from shipped defaults, with reviewed overrides included, without undisclosed
browser state. Missing, partial or stale evidence is not success. Changes to
the target baseline require explicit reassessment, not automatic approval.

## Crosswalk to initiatives and epics

Each row routes work; it does not change roadmap status or approve a feature.
Follow links to the existing epic details and open decisions.

| Work area | Delivery ownership |
| --- | --- |
| 1. Primitive token algorithms | [INIT-1](ROADMAP.md), especially EPIC-1.9; INIT-2 for owning mode/adaptive bindings |
| 2. Semantic Structure/Style experiences | [INIT-4](ROADMAP.md), INIT-3 and EPIC-5.1/5.2/5.3 |
| 3. Components, anatomy, structure/style options | [INIT-6](ROADMAP.md), EPIC-6.1, EPIC-3.4 and EPIC-4.1/4.3 |
| 4. Automatic component-token relationships | EPIC-6.2, EPIC-5.3 and [EPIC-7.1](ROADMAP.md) |
| 5. Schema-conforming output | EPIC-7.1/7.3 |
| 6. Default-data refinement | EPIC-7.4 plus the affected INIT-1/2/4/5 domain epic |
| 7. Bounded residual overrides | EPIC-5.4 and EPIC-7.4 |
| 8. Stable identity and reconciliation | EPIC-7.1/7.2/7.4; current storage/identity evidence and DEBT-017 review |
| 9. File layout and safe package read/write migration | EPIC-7.2/7.4; INIT-10 for GitHub delivery, not derivation |
| 10. Necessary schema extensions on the branch | EPIC-7.1/7.3; EPIC-5.5/9.2 where applicable |
| 11. Comprehensive RFC and eventual draft PR | INIT-7, EPIC-5.5/9.2 proposals and EPIC-10.4 delivery |
| Guidelines and visuals delivery | INIT-7 / EPIC-7.2/7.4 umbrella; detailed delivery breakdown remains to be planned |

References use stable initiative/epic IDs, not status-dependent heading anchors.
Do not create a new epic ID to fill a planning gap. Propose a bounded breakdown
for approval. [INIT-8](ROADMAP.md) supplies
platform/export requirements; INIT-11 presents evidence, not another truth source.

Existing starting points include [Styles](styles.md), the
[token alignment workflow](token-alignment-workflow.md), the
[identity/recipe proposal](rfcs/foundation-recipes-and-stable-identity.md) and
[portable Structures proposal](rfcs/portable-structures.md).
Historical proposals/debt may lag current implementation. Inspect current owners
and evidence before claiming work is absent, complete or approved.

## Work-alignment protocol

Before planned or unplanned work, include this compact block in its existing
plan or reasoning. Do not create a separate alignment document for each task.

```text
Request/outcome: bounded work and what is not included.
Alignment: M0-M6, existing INIT/EPIC IDs, affected package surface(s).
Data path: authored owner -> shared derivation/resolution -> consumers.
Procedure/evidence: relevant skills, gap IDs/checks and actual baseline source.
Limits/approvals: what remains unproved and which decisions need approval.
```

For a pure styling fix, one line confirming unchanged system/data behavior is
enough. Usability, accessibility and reliability work supports the north star
when it enables authoring without violating invariants; it need not increase a
coverage score. Follow existing minimum-versus-architecture-slice approval
procedures for roadmap features.

| Example | Aligned approach | Avoid |
| --- | --- | --- |
| Refine a scale | M2, foundation epic + EPIC-7.4: change the owning formula/parameters, measure all required contexts and unrelated consumers; review residual overrides | Patching values in an exporter or loosening acceptance to hide differences |
| Add a Component option | M1, EPIC-3.4/6.1/6.2: reuse Structure/Style references, derive bindings through shared owners, preserve IDs and Changes parity | Copying a complete structure/style/token set per option |
| Rename a token file | M5, EPIC-7.2: inventory consumers, review the path mapping and dry-run diff; preserve IDs/references | Reminting tokens or enabling writes before global parity |

At handoff, state the bounded implementation result, what alignment the evidence
establishes, remaining limitations and the next scoped work if needed. Suggest
roadmap/gap updates through existing approval procedures; do not close an
alignment gap because unit tests pass.

## Maintenance and approach

Maintain one short direction contract, linked delivery plans, domain procedures
and canonical evidence. Do not expand this file into a task backlog or a copy of
all skills. Significant decisions belong in existing RFC/review records with
rationale and consequences. Update direction through explicit review.

New machine-readable planning formats, agent orchestration or enforcement tools
are not required by this plan. Consider them only after a demonstrated limitation
of the existing roadmap/register/procedures. Agent instructions guide behavior;
focused evidence and human review establish whether outcomes were met.

This approach draws on
[context engineering guidance](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
for concise, selectively loaded context,
[GitHub instruction guidance](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
for explicit entry points, and
[decision-record guidance](https://adr.github.io/) for preserving rationale
without duplicating delivery status.
