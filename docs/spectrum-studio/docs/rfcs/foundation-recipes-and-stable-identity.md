<!-- Copyright 2026 Adobe. All rights reserved. -->

# Foundation recipes and stable token identity

**Status: proposal for discussion.** This document does not introduce an accepted
schema, allocate identifiers, authorize a migration, or change the alignment
register. It supports INIT-7 and addresses the identity problem recorded in
DEBT-017.

## Goal

Store the parameters that generate tokens without replacing existing token
identities. Changing a formula, color value, classification, or display name
must not create a new identity for the same token concept.

The canonical data already distinguishes a shared `conceptId` from a mode
record's `uuid`. For example, a gray scale step can have one concept ID and
different UUIDs for Light, Dark, and Wireframe. Preserve both levels.

## Recommended separation

| Layer | Owns | Does not own |
| --- | --- | --- |
| Foundation recipe | Formula references and versions, parameters, persistent scale/stop references, mode bindings, and explicit overrides | Token UUID allocation during generation |
| Identity records | The relationship between persistent authored entities, canonical concept IDs, and mode-record UUIDs | Color values or names as identity keys |
| Generated output | Classifications and values produced by the existing generator, carrying stored identities | A second generation algorithm or a new ID on every run |

Use the existing editor generation path. Preview, Analysis, export, and eventual
repository writes should read the same output. Keep recipes separate from the
generated token package so consumers do not need to evaluate authoring formulas
to read released tokens.

### Recipe information to propose upstream

A foundation recipe should declare:

- A persistent recipe identity and the persistent identities of its scales and
  stops. Renaming or reordering a stop does not replace that stop.
- Formula references and enough version information to reproduce an output.
- Typed parameter values, explicit stop coordinates, and their units.
- Mode bindings and explicit mode-specific parameter changes.
- Classification references to the shared registry rather than duplicated
  naming vocabulary.
- Explicit overrides with a reason, scope, generated baseline, and a way to
  reset them. An override may change a value without changing identity.

The storage location and schema are not decided here. Evaluate an extension
within the design-data specification against a repository authoring directory
that projects to canonical tokens. Do not silently add either shape to
`packages/design-data/`.

### Identity information

Identity records need to connect a persistent authored entity to its existing
canonical concept ID and each supported mode-record UUID. Refer to persistent
mode identities, not mutable labels or serialized mode-key strings.

Allocate IDs in an explicit authoring operation and persist them before
generation. Preview, comparison, and export must remain allocation-free.
Repeated output generation must produce the same identities.

Classification/context matching is evidence for an initial link, not the
permanent identity key. Color equality alone is never identity evidence: two
different concepts may intentionally have equal values.

## Migration in two stages

### Read-only manifest

Inventory the canonical tokens, recipes, editor IDs, and all their references.
Record both input revisions and content hashes, including dirty inputs.

Use the palette assessment to propose unique classification/context links.
Retain original classifications, mode context, value agreement, source
locations, and any accepted RFC exception as review evidence. Exact agreement
supports a candidate; it does not automatically approve identity adoption.

The manifest should distinguish approved links, unique unreviewed candidates,
ambiguities, missing contexts, and genuinely new concepts. Include collisions
and references that cannot be remapped. Do not choose the nearest color or parse
a token label to break a tie.

Review the manifest before allowing any writes. A stale input hash invalidates
approval rather than applying a migration against changed data.

### Coordinated migration

Preserve canonical concept IDs and mode UUIDs for existing concepts. For an
editor record already holding another ID, the proposal is to adopt the canonical
ID and remap every editor dependency together. This choice needs explicit
approval before implementation.

That dependency inventory includes browser edits, aliases, component bindings,
semantic references, Changes, Impact, saved/working snapshots, exports, reset
baselines, and any other consumer discovered through exact reference tracing.
Do not migrate just the token browser and leave old keys elsewhere.

Apply the approved migration atomically through the existing storage owner.
Validate all references first; failures preserve the previous complete data.
A second run should make no changes. Provide a dry run, an auditable result, and
a recovery procedure before introducing a write-enabled command.

## Lifecycle decisions before implementation

| Event | Recommended behavior |
| --- | --- |
| Rename, reorder, reclassify, or regenerate an existing authored stop | Retain concept and mode UUIDs. Review a semantic replacement separately. |
| Change a generated value or add/reset an override | Retain identities. Preserve the existing override lifecycle. |
| Add a mode to an existing concept | Allocate and store only the new mode-record UUID in the authoring operation. |
| Remove a mode or concept | Retain retirement evidence; do not make generation recycle IDs. Decide deletion/deprecation policy explicitly. |
| Restore the same retired authored entity | Prefer restoring its recorded identity, subject to review of the retirement policy. |
| Create a different entity with an old label | Allocate new identities; the label is not an identity claim. |
| Split or merge concepts | Require an explicit migration decision and reference remapping, not an automatic rename heuristic. |
| Save, Cancel, reload, or reset | Follow the existing authoring lifecycle without accidentally allocating a second identity. |

These are recommendations, not new behavior. In particular, removal/re-addition
and reset semantics need product and specification review.

## What the palette pilot establishes

The new comparison can establish structured counterparts, exact mode-value
agreement, and outstanding reference contexts. It intentionally retains
independent UUIDs. Its live measurements do not accept this proposal, close
DEBT-017, or authorize changing existing IDs.

The canonical adapter regression currently exercises 413 eligible concepts and
1,087 mode records against a mirrored input. Those numbers describe the checked
reference inventory, not the editor's achieved coverage. A mirror passing proves
the comparison can recognize agreement; it does not prove the shipped editor
matches those colors.

## Required evidence for a future implementation

Test ID preservation across regeneration, renaming, reordering, value edits,
mode-label edits, Save/Cancel, reload, reset, and retry. Test new-mode allocation,
retirement/restoration, duplicate candidates, conflicting links, splits/merges,
stale manifests, and failure recovery.

Migration tests must prove aliases, edits, components, and semantic references
resolve identically after remapping. Check exact concept/mode denominators and
Changes/Impact parity. Verify that preview and export allocate no IDs, a repeated
migration is a no-op, and rejected input leaves persisted data unchanged.

## Decisions needed before implementation

- Where recipes and identity records live, and which specification owns them.
- Which authoring operation allocates identities and how coordinated writes are
  validated.
- How formula versions and generator versions make output reproducible.
- Whether adopting canonical IDs with coordinated editor remapping is the
  approved conflict policy.
- How retirement, restoration, reset, and semantic replacements work.

Implementation should follow only after those decisions and the read-only
migration manifest are reviewed.
