Proposal 013: Multi-Modal Token Data Model — Spike Samples & Comparison Criteria

**Status:** Complete (uo7t.1–uo7t.4 done). Analysis only, no schema or code changes.
Recommendation posted back to RFC [#1410](https://github.com/adobe/spectrum-design-data/issues/1410).\
**Related:** [Discussion #1410](https://github.com/adobe/spectrum-design-data/discussions/1410)
(Nate Baldwin, "Token schema"); review bead `spectrum-design-data-57ll`; spike epic
`spectrum-design-data-uo7t`.

## Problem

Discussion [#1410](https://github.com/adobe/spectrum-design-data/issues/1410) proposes collapsing the current per-mode-value token objects into one
object per concept, with a `valuesByMode` array holding the per-mode entries. Before
accepting or rejecting that shape change, this spike hand-models one real token — plus a
combinatory-mode case and a cross-token alias case — in three candidate shapes, and defines
the criteria `uo7t.2`/`uo7t.3` will score each shape against.

The three shapes:

1. **Current** — one object + one UUID *per mode-specific value*; mode variants are
   separate array elements; cascade resolves layer → specificity (count of non-default
   mode-set fields in the name object) → document order. Legacy `set_uuid`/`set_schema`
   bridge fields (slated for removal) still ride along.
2. **Nate's `valuesByMode`** — one object + one UUID *per concept*; a `valuesByMode` array
   holds per-mode entries, each with a `modes` array and its own `$schema`/`$ref` (or
   value); `set_uuid`/`set_schema` promoted into each mode entry.
3. **Concept-id middle path** — current per-value objects and cascade, unchanged, plus a
   stable `conceptId` field so the concept has one canonical identifier (today only the
   shared, non-canonical `legacyKey` plays that role).

## Comparison criteria

Split so `uo7t.2` owns the manifest/cascade rows and `uo7t.3` owns the identity/migration
rows. Each cell is scored qualitatively (clean / strained / N/A) with a one-line note;
`uo7t.4` collapses the results into the RFC response table.

**Manifest & cascade (`uo7t.2`)**

1. `overrides[].value/$ref` — how a platform layer overrides one mode's value.
2. `extensions.tokens` — adding a *new value on an existing token* at platform layer
   (e.g. an iOS increased-contrast value).
3. `modeSetRestrictions` — pre-filtering candidates per platform ([`mode-sets.md`
   §Platform restrictions](../../packages/design-data-spec/spec/mode-sets.md)).
4. `extensions.modeSets` — custom per-platform mode axis (bead `h890.24`, in flight).
5. Combinatory modes — expressing e.g. dark + high-contrast in one place.
6. Cascade specificity & layer isolation — does a platform *add a competing record* or
   *edit a foundation-owned one*?

**Identity & migration (`uo7t.3`)**

7. Concept identity — is there one canonical identifier for the design concept?
8. `$ref` aliasing granularity — can an alias target one specific mode's value?
9. Diff continuity / rename tracking — stable anchor across dataset versions
   ([`diff.md`](../../packages/design-data-spec/spec/diff.md)).
10. Lifecycle `replacedBy` — what the pointer resolves to (SPEC-010).
11. Figma / registry sync — `buildUuidToTokenIndex` keying.
12. Legacy `set_uuid`/`set_schema` fate — does the shape retire them or entrench them?
13. Migration cost / blast radius — schema, cascade, SDK, every data file, sync tooling.

## Worked samples

### Sample A — multi-mode color alias

Real token: `accent-background-color-default`
(`packages/design-data/tokens/color-aliases.tokens.json` L1–68), three rows —
`colorScheme` light/dark/wireframe. All three share `set_uuid` `e05251ac-d64a-4157-9b20-224f0392269e`
and `legacyKey` `accent-background-color-default`; each has its own `uuid`. (Light and
wireframe happen to alias the same target UUID today — an existing data fact, unrelated to
the shape question.)

**A1 — Current** (verbatim from the file):

```jsonc
[
  {
    "name": {
      "colorRole": "accent", "property": "color", "state": ["default"],
      "colorScheme": "light", "legacyKey": "accent-background-color-default",
      "object": "background"
    },
    "$schema": ".../token-types/alias.json",
    "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54",
    "uuid": "d9d8488d-9b38-47e0-9660-dcad040f3ca8",
    "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
    "set_schema": ".../token-types/color-set.json"
  },
  {
    "name": { "colorRole": "accent", "property": "color", "state": ["default"],
      "colorScheme": "dark", "legacyKey": "accent-background-color-default", "object": "background" },
    "$schema": ".../token-types/alias.json",
    "$ref": "87a2c8f0-54fd-4939-8f42-3124fde1e49e",
    "uuid": "f24eb871-6419-4cef-88a2-cca8548ae31e",
    "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
    "set_schema": ".../token-types/color-set.json"
  },
  {
    "name": { "colorRole": "accent", "property": "color", "state": ["default"],
      "colorScheme": "wireframe", "legacyKey": "accent-background-color-default", "object": "background" },
    "$schema": ".../token-types/alias.json",
    "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54",
    "uuid": "1f4f6c48-633c-4eb5-b7d6-bf5a9a7fde18",
    "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
    "set_schema": ".../token-types/color-set.json"
  }
]
```

**A2 — `valuesByMode`** (Nate's actual proposed shape — `modes` holds mode-key objects, each
carrying its own `set_uuid`/`set_schema`; `$schema`/`$ref` sit at the valuesByMode-entry level):

```jsonc
{
  "uuid": "<new-concept-uuid>",
  "displayName": "Accent background color default",
  "classification": {
    "colorRole": "accent", "property": "color", "state": ["default"],
    "legacyKey": "accent-background-color-default", "object": "background"
  },
  "valuesByMode": [
    { "modes": [{ "colorScheme": "light", "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
        "set_schema": ".../token-types/color-set.json" }],
      "$schema": ".../token-types/alias.json", "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54" },
    { "modes": [{ "colorScheme": "dark", "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
        "set_schema": ".../token-types/color-set.json" }],
      "$schema": ".../token-types/alias.json", "$ref": "87a2c8f0-54fd-4939-8f42-3124fde1e49e" },
    { "modes": [{ "colorScheme": "wireframe", "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
        "set_schema": ".../token-types/color-set.json" }],
      "$schema": ".../token-types/alias.json", "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54" }
  ]
}
```

Note: there is no per-mode UUID anymore — the three former identities
(`d9d8488d…`/`f24eb871…`/`1f4f6c48…`) collapse into one `<new-concept-uuid>`. Anything that
targeted one mode's value specifically (an alias, a diff anchor, a Figma sync key) now has
to target the concept plus a mode discriminator instead.

**A3 — Concept-id middle path** (A1 verbatim, one field added per row):

```jsonc
{ "name": { "…": "…", "colorScheme": "light", "…": "…" },
  "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54",
  "uuid": "d9d8488d-9b38-47e0-9660-dcad040f3ca8",
  "conceptId": "accent-background-color-default",
  "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e", "set_schema": ".../token-types/color-set.json" }
```

The dark and wireframe rows carry the **same** `conceptId` and keep their **own** `uuid`
(`f24eb871…`, `1f4f6c48…`). Nothing else about A1 changes.

### Sample B — combinatory modes (dark + high-contrast)

The RFC's own example is "light + high-contrast" (`cascade.md` L62–64), but `light` and
`regular` (the default contrast mode, per `packages/design-data/mode-sets/contrast.json`)
are each already a token's *default* state for their mode set — a combination against two
defaults doesn't add specificity and doesn't stress the cascade. Using **dark +
high-contrast** instead makes both mode-set fields genuinely non-default, so the
specificity difference (a plain `dark` row is specificity 1, the combination is
specificity 2) is real. No token in the corpus uses `contrast` yet, so this sample is
hypothetical but schema-valid.

**B1 — Current**: one explicit combination token (`cascade.md` L62–64) — a whole extra
object whose name object sets *both* non-default fields; its specificity (2) beats the
plain dark row's specificity (1) when both match a `{colorScheme: dark, contrast: high}`
context.

```jsonc
{ "name": { "colorRole": "accent", "property": "color", "state": ["default"],
    "colorScheme": "dark", "contrast": "high",
    "legacyKey": "accent-background-color-default", "object": "background" },
  "$schema": ".../token-types/alias.json", "$ref": "<high-contrast-dark-target>",
  "uuid": "<new-uuid>", "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e" }
```

**B2 — `valuesByMode`**: one extra entry inside the *existing* A2 concept object — no new
top-level token, no specificity math, just another array entry, using Nate's actual
combinatory shape (each mode contributes its own object to `modes`):

```jsonc
{
  "modes": [
    { "colorScheme": "light", "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e",
      "set_schema": ".../token-types/color-set.json" },
    { "contrast": "high", "set_uuid": "<high-contrast-set-uuid>",
      "set_schema": ".../token-types/contrast-set.json" }
  ],
  "$schema": ".../token-types/alias.json", "$ref": "<high-contrast-dark-target>"
}
```

This is the shape where `valuesByMode` is genuinely more ergonomic than the current model —
see criterion 5.

**B3 — Concept-id middle path**: identical to B1 (still an explicit combination token,
still resolved by cascade specificity), with the shared `conceptId` added:

```jsonc
{ "name": { "…": "…", "colorScheme": "dark", "contrast": "high", "…": "…" },
  "$ref": "<high-contrast-dark-target>", "uuid": "<new-uuid>",
  "conceptId": "accent-background-color-default",
  "set_uuid": "e05251ac-d64a-4157-9b20-224f0392269e" }
```

### Sample C — cross-token alias ($ref target)

A second, hypothetical token whose `$ref` targets Sample A's **dark** value specifically
(exercising identity/aliasing granularity — criterion 8).

**C1 — Current**: `$ref` holds the per-mode UUID of the exact row it targets:

```jsonc
{ "…": "…", "$ref": "f24eb871-6419-4cef-88a2-cca8548ae31e" }
```

Alias granularity is per-mode-value — this is possible today because every mode variant
has its own UUID.

**C2 — `valuesByMode`**: A2 has only one UUID (`<new-concept-uuid>`) for all three modes,
so `$ref: "<new-concept-uuid>"` can only mean "whichever mode entry wins the same
context-matching this alias is evaluated under" — it cannot pin the dark value
specifically. Targeting one mode requires a new compound reference shape (e.g.
`{"$ref": "<concept-uuid>", "$refMode": "dark"}`), which does not exist in the spec today.
This is a genuine spec gap the RFC does not address.

**C3 — Concept-id middle path**: identical to C1 — `conceptId` is concept-level metadata
sitting alongside the per-value UUID, not an alias target, so `$ref` mechanics are
completely unchanged from today.

## Observations feeding `uo7t.2` / `uo7t.3`

* `valuesByMode` buys concept identity (criterion 7) and combinatory-mode ergonomics
  (criterion 5), but costs per-mode alias granularity (criterion 8, Sample C) and
  entrenches `set_uuid`/`set_schema` inside the core structure instead of retiring them
  (criterion 12).
* The concept-id middle path gets criterion 7 for the price of one additive field, while
  criteria 5, 8, 9, 10, 11 stay byte-for-byte identical to the current model — lowest
  migration cost (criterion 13) of the three.
* The current model is the baseline; its only real gap against the other two is
  criterion 7 (no canonical concept identifier — only the shared, non-canonical
  `legacyKey`).

## Part 4 — Manifest & cascade evaluation (`uo7t.2`)

The platform manifest is built on **layered cascade resolution**: every value from every
layer is an independent, competing record, and a platform *adds* a new record rather than
editing the foundation record it targets ([`manifest.md` §overrides](../../packages/design-data-spec/spec/manifest.md),
"An override is applied as a new platform-layer record, not an in-place edit of the
foundation record it targets"). The six criteria below all reduce to one question: does a
shape let a platform add or override *one mode's value* as an independent record, or does it
force the platform to reach into a foundation-owned structure?

| # | Criterion                                                                          | Current                                                                                                                                                                                 | `valuesByMode`                                                                                                                                                                                                                                                                  | Concept-id                                                                  |
| - | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1 | `overrides[].value/$ref`                                                           | clean — targets one mode's record by its per-value UUID; lands as a new platform-layer record                                                                                           | strained — an override targets the concept; pinning one mode means reaching into the foundation-owned `valuesByMode` array, or shadowing the whole concept                                                                                                                      | clean — identical to current                                                |
| 2 | `extensions.tokens` (net-new value on an existing token, e.g. iOS `contrast:high`) | clean — an isolated platform-layer record with `contrast:high` in its name object competes via cascade (this already works today per `h890.24`'s foundation-gap note)                   | strained — a *new whole token* is fine, but a *new value on an existing token* wants to live inside the concept's array: either edit the foundation record (breaks layer isolation) or create a shadow concept object (reintroduces the duplication the shape claims to remove) | clean — identical to current                                                |
| 3 | `modeSetRestrictions`                                                              | clean — the pre-filter drops whole candidate records by their name-object mode field, before specificity tie-breaking; SPEC-041 coverage checks independent records                     | strained — filtering must happen *within* a concept's `valuesByMode` entries rather than by dropping whole records; a different code path, and SPEC-041 coverage would need to walk into the array                                                                              | clean — identical to current                                                |
| 4 | `extensions.modeSets` (`h890.24`, custom per-platform mode axis)                   | clean — a platform declares the axis (`upsert ModeSetRecord`) and authors competing records; the cascade is mode-agnostic (`specificity()`/`matches_context()`), so zero cascade change | strained — declaring the axis itself is easy, but adding a custom-mode *value on an existing foundation token* recreates exactly the "wrong coupling" `h890.24` was designed to avoid (foundation carrying one platform's axis)                                                 | clean — identical to current                                                |
| 5 | Combinatory modes (dark + high-contrast, Sample B)                                 | works, but verbose — an explicit combination token whose name object sets both non-default fields, resolved by specificity (Sample B1, `cascade.md` §Cross-mode-set overrides)          | **wins — a native `{"modes":["dark","high-contrast"], "$ref":…}` entry inside the existing concept (Sample B2); genuinely more ergonomic**                                                                                                                                      | works, but verbose — same explicit combination token as current (Sample B3) |
| 6 | Cascade specificity & layer isolation                                              | clean — every value is an independent competing record; a platform layer adds, it never edits a foundation record                                                                       | strained — platform values want to live inside a foundation-owned array, which either breaks layer isolation or forces a shadow object                                                                                                                                          | clean — identical to current                                                |

### Headline findings

* **`valuesByMode` wins exactly one of six criteria** (combinatory ergonomics, [#5](https://github.com/adobe/spectrum-design-data/issues/5)) **and
  strains the other five**, all for the same root cause: collapsing per-mode records into
  one concept object fights the per-value layering the manifest — and `h890.24` — depend on.
  Every "strained" cell is a version of "a platform can no longer add or override one mode
  as an independent record without touching the foundation-owned concept array."
* **Concept-id is byte-for-byte identical to current on all six manifest criteria.** It adds
  a concept identifier without touching the records the cascade actually resolves, so it
  neither helps nor hurts this dimension — its entire payoff is in the identity dimension
  (`uo7t.3`).
* **Current is clean on five of six and only verbose on one** ([#5](https://github.com/adobe/spectrum-design-data/issues/5), combinatory modes), and
  that gap already has a working spec answer today (explicit combination tokens,
  `cascade.md` §Cross-mode-set overrides) plus an in-flight capability (`h890.24`) that
  extends the same model for custom platform axes at zero cascade cost.

## Part 5 — Identity & migration evaluation (`uo7t.3`)

The load-bearing fact here: **the per-value UUID is the identity contract.**
[`authoring-workflow.md`](../../packages/design-data-spec/spec/authoring-workflow.md) is
explicit — "UUID stability is the identity contract that allows `$ref`,
`lifecycle.replacedBy`, and external consumers to reference tokens across versions."
Collapsing three per-mode UUIDs into one concept UUID changes what every one of those
mechanisms points at.

| #  | Criterion                         | Current                                                                                                                                          | `valuesByMode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Concept-id                                                                                                                                                                            |
| -- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7  | Concept identity                  | **no** — only the shared, non-canonical `legacyKey` (itself slated for removal alongside the other legacy bridge fields)                         | **yes** — one UUID per concept                                                                                                                                                                                                                                                                                                                                                                                                                                                | **yes** — added `conceptId` field                                                                                                                                                     |
| 8  | `$ref` aliasing granularity       | per-mode — an alias targets one mode's value by its own UUID (Sample C1)                                                                         | lost — only a concept UUID exists; pinning one mode's value needs a compound `{$ref, $refMode}` shape the spec doesn't have (Sample C2)                                                                                                                                                                                                                                                                                                                                       | per-mode — unchanged from current (Sample C3)                                                                                                                                         |
| 9  | Diff continuity / rename tracking | per-value UUID is the diff anchor (UUID-first identity matching)                                                                                 | broken twice — the migration itself collapses 3 UUIDs into 1 (a one-time discontinuity for every existing token), and afterward a single mode's value change has no anchor of its own                                                                                                                                                                                                                                                                                         | intact — per-value UUIDs are untouched; `conceptId` is purely additive                                                                                                                |
| 10 | Lifecycle `replacedBy` (SPEC-010) | per-mode — points at a specific value's UUID, which MUST resolve to an existing token (`evolution.md` §What `lifecycle.replacedBy` guarantees)   | coarsened — the only available target is the concept UUID; "this mode's value was replaced by that one" becomes inexpressible                                                                                                                                                                                                                                                                                                                                                 | per-mode — unchanged from current                                                                                                                                                     |
| 11 | Figma / registry sync             | keys off the per-value UUID (`buildUuidToTokenIndex`, `tools/token-mapping-analyzer/src/registry-index.js:189`)                                  | re-key required — the index, and every other per-value-UUID consumer, must move to concept-UUID + mode                                                                                                                                                                                                                                                                                                                                                                        | unchanged — per-value UUID preserved; `conceptId` is optional extra metadata the index can ignore                                                                                     |
| 12 | Legacy `setUuid`/`setSchema` fate | ride along, explicitly transitional and "expected to be removed in a later spec version" (`relationship-format.md`, transitional-fields section) | **entrenched** — promoted *into* each mode entry as core structure, moving the wrong direction on fields the spec is actively trying to delete                                                                                                                                                                                                                                                                                                                                | unchanged — left exactly where they are today, still just as removable                                                                                                                |
| 13 | Migration cost / blast radius     | none (baseline)                                                                                                                                  | **high** — schema rewrite, cascade rewrite (specificity/matching have to walk into arrays instead of flat records), aliasing redesign ([#8](https://github.com/adobe/spectrum-design-data/issues/8)), diff/lifecycle/sync re-keying ([#9](https://github.com/adobe/spectrum-design-data/issues/9)–11), a rewrite of every `packages/design-data/tokens/*.json` file, plus the one-time 3→1 UUID identity break ([#9](https://github.com/adobe/spectrum-design-data/issues/9)) | **low** — one additive schema field; backfill `conceptId` per concept (mechanically derivable from the existing shared `legacyKey`); no cascade, aliasing, diff, or sync code changes |

### Headline findings

* **`valuesByMode` wins exactly one identity criterion — concept identity ([#7](https://github.com/adobe/spectrum-design-data/issues/7))** — and that
  is the same and only criterion concept-id also wins. Everything valuesByMode was
  introduced to solve, concept-id solves too.
* **On the other six identity/migration criteria, concept-id strictly dominates
  `valuesByMode`.** It keeps aliasing, diff continuity, lifecycle, and Figma/registry sync
  byte-for-byte identical to today ([#8](https://github.com/adobe/spectrum-design-data/issues/8)–11), leaves the legacy set-bridge fields exactly as
  removable as they are now instead of entrenching them ([#12](https://github.com/adobe/spectrum-design-data/issues/12)), and costs one additive field
  versus a cross-stack schema/cascade/aliasing/sync rewrite ([#13](https://github.com/adobe/spectrum-design-data/issues/13)).
* **`valuesByMode` actively regresses on [#12](https://github.com/adobe/spectrum-design-data/issues/12)** — folding `setUuid`/`setSchema` into the core
  structure runs directly counter to the spec's stated intent to retire them.
* **Combined with Part 4:** across all 13 criteria, `valuesByMode`'s only net win is
  combinatory-mode ergonomics ([#5](https://github.com/adobe/spectrum-design-data/issues/5)). Concept-id matches or beats it on every other axis at a
  fraction of the migration cost.

## Part 6 — Synthesis & recommendation (`uo7t.4`)

### Full scorecard (all 13 criteria)

| #  | Criterion                             | Current         | `valuesByMode`  | Concept-id      |
| -- | ------------------------------------- | --------------- | --------------- | --------------- |
| 1  | `overrides[].value/$ref`              | clean           | strained        | clean           |
| 2  | `extensions.tokens` (net-new value)   | clean           | strained        | clean           |
| 3  | `modeSetRestrictions`                 | clean           | strained        | clean           |
| 4  | `extensions.modeSets` (h890.24)       | clean           | strained        | clean           |
| 5  | Combinatory modes                     | verbose (works) | **wins**        | verbose (works) |
| 6  | Cascade specificity & layer isolation | clean           | strained        | clean           |
| 7  | Concept identity                      | **no**          | **yes**         | **yes**         |
| 8  | `$ref` aliasing granularity           | per-mode        | lost            | per-mode        |
| 9  | Diff continuity / rename tracking     | intact          | broken (twice)  | intact          |
| 10 | Lifecycle `replacedBy`                | per-mode        | coarsened       | per-mode        |
| 11 | Figma / registry sync                 | unchanged       | re-key required | unchanged       |
| 12 | Legacy `setUuid`/`setSchema` fate     | removable       | **entrenched**  | removable       |
| 13 | Migration cost / blast radius         | none (baseline) | **high**        | **low**         |

**Tally:** `valuesByMode` — 1 net win ([#5](https://github.com/adobe/spectrum-design-data/issues/5)), 5 strained ([#1](https://github.com/adobe/spectrum-design-data/issues/1)–4, [#6](https://github.com/adobe/spectrum-design-data/issues/6)), 7 lost-or-costly ([#7](https://github.com/adobe/spectrum-design-data/issues/7)–13, though
[#7](https://github.com/adobe/spectrum-design-data/issues/7) is a genuine win it shares with concept-id). Concept-id — matches current on 11 of 13, adds
the identity win ([#7](https://github.com/adobe/spectrum-design-data/issues/7)) at low cost ([#13](https://github.com/adobe/spectrum-design-data/issues/13)), does not reach combinatory-mode parity ([#5](https://github.com/adobe/spectrum-design-data/issues/5)) without a
separate, non-blocking follow-up. Current — baseline; its only real gap is [#7](https://github.com/adobe/spectrum-design-data/issues/7).

### Recommendation

* **`valuesByMode` wholesale restructure — decline, with alternative.** It buys concept identity
  ([#7](https://github.com/adobe/spectrum-design-data/issues/7)) but pays for it by redesigning cascade resolution, aliasing, diff, lifecycle, and Figma
  sync ([#1](https://github.com/adobe/spectrum-design-data/issues/1)–4, [#6](https://github.com/adobe/spectrum-design-data/issues/6), [#8](https://github.com/adobe/spectrum-design-data/issues/8)–11), and it entrenches the `setUuid`/`setSchema` bridge fields the spec is
  actively trying to retire ([#12](https://github.com/adobe/spectrum-design-data/issues/12)) instead of retiring them.
* **Concept-id middle path — adopt.** Add a stable `conceptId` (or `groupId`) field to the
  current per-value token shape. Delivers the RFC's actual identity ask, additive schema change
  only, backfillable from the existing (non-canonical) `legacyKey`, zero change to cascade,
  aliasing, diff, lifecycle, or sync.
* **Combinatory-mode syntax ([#5](https://github.com/adobe/spectrum-design-data/issues/5)) — evaluate separately**, as an optional, non-blocking
  enhancement on the current per-value shape (not a reason to adopt `valuesByMode` wholesale).
  It is the one place `valuesByMode` is genuinely nicer than an explicit combination token, and
  it is worth exploring on its own merits once the identity work lands.
* **`classification` rename and optional `displayName`** — proceed as already agreed in the first
  RFC comment; independent of this recommendation.
