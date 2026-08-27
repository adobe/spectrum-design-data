# Spike: may a platform manifest override Layer-1 schemas?

**Status:** Decided — **No-go**. (bead spectrum-design-data-h890.23.5)

## Question

Layer 1 JSON Schemas (`packages/design-data-spec/schemas/*.schema.json`) validate every
foundation and platform artifact, **including the manifest itself**
(`manifest.schema.json`). Should a platform manifest be allowed to override or relax those
schemas for its own data?

## Why not

1. **Circularity.** The manifest that would carry a schema override is itself validated
   against `manifest.schema.json` — a fixed Layer-1 document. Letting that same manifest
   redefine the rules it and its sibling artifacts are checked by breaks the trust
   direction the cascade depends on: Layer 1 is supposed to be the thing platforms
   conform *to*, not a parameter platforms can tune.
2. **Conformance guarantees become meaningless.** The whole point of a shared schema set
   is that "valid per Layer 1" means the same thing for every platform. A platform-local
   override lets a platform mark its own non-conforming data as conforming, which
   defeats the guarantee for every consumer that trusts "passed Layer 1 validation" as a
   signal (CI, the MCP server, other tooling).
3. **No concrete need surfaced.** Nothing in the h890.22/h890.23 work (iOS
   externalization, or the guidelines/fields/relationships/naming-exceptions cascade
   additions) needed schema relaxation — every platform-local addition validates fine
   against the existing schemas via `extensions.*`. The `extensions` object is already
   `additionalProperties: true`, which covers "the platform wants to attach data the
   schema doesn't know about" without touching the schema itself.

## Decision

**No-go.** The manifest cascade will not gain a schema-override mechanism. The capability
matrix in [`manifest.md`](manifest.md#capability-matrix) keeps schemas in the
"no manifest-level override mechanism" bucket.

If a concrete future need emerges (e.g. a platform genuinely needs a stricter, not
looser, local schema for its own additive fields), scope a narrow follow-up bead then —
additive-only, and never loosening what Layer 1 already requires. No such bead is opened
now.
