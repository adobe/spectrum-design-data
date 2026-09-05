Proposal 013: Multi-Modal Token Data Model — Spike Samples & Comparison Criteria

**Status:** Complete (uo7t.1–uo7t.7 done, including Part 7's cross-modal guardrail analysis and
Sample D's full combinatory matrix). Analysis only, no schema or code changes.
Recommendation posted back to RFC [#1410](https://github.com/adobe/spectrum-design-data/issues/1410);
a follow-up reply addressing Nate Baldwin's guardrail and Figma-mapping questions is drafted
and pending approval to post.\
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

### Sample D — full combinatory matrix (`colorScheme` × `contrast`)

Nate asked for a concrete combinatory-mode worked example, generalizing Sample B's single
cell (dark + high-contrast) to the full 2×3 matrix he sketched for
`accent-background-color-default`:

| contrast \ colorScheme | light       | dark       |
| ---------------------- | ----------- | ---------- |
| regular                | accent-900  | accent-800 |
| low                    | accent-800  | accent-700 |
| high                   | accent-1000 | accent-900 |

**Data-model validity note:** `packages/design-data/mode-sets/contrast.json` declares
`modes: ["regular", "high"]` — there is no `low` contrast mode today. The `low` row is
**illustrative-only**; making this matrix data-model-valid requires first adding `low` to
`contrast.json`'s `modes` array, a foundation data decision out of scope for this spike
(tracked alongside `h890`'s contrast-gap work). All four target scale values
(accent-700/800/900/1000) *do* already exist as real, mode-agnostic semantic aliases in
`packages/design-data/tokens/semantic-color-palette.tokens.json`, so the sample uses their
real UUIDs rather than placeholders: accent-700 `a8fbe39b-db6d-4bb4-a7c5-8a235060d2ae`,
accent-800 `87a2c8f0-54fd-4939-8f42-3124fde1e49e`, accent-900 `90d82778-1cbb-47c0-aab9-b6e38a9cdc54`,
accent-1000 `9bf3fa2f-75d3-44d3-ae30-d88893665366`. The regular row is not hypothetical at
all — it's the real `accent-background-color-default` light/dark pair from Sample A1.

Specificity (defaults `colorScheme: light`, `contrast: regular`; only non-default fields
count, per [`cascade.md` §Semantic specificity](../../packages/design-data-spec/spec/cascade.md#semantic-specificity)):
light+regular = 0, dark+regular = 1, light+low = 1, light+high = 1, dark+low = 2, dark+high = 2.

**D1 — Current**: six per-value objects. Regular-contrast cells are the real Sample A1
objects, verbatim; low/high cells are explicit combination tokens (dark ones set both
`colorScheme` and `contrast` per [`cascade.md` §Cross-mode-set overrides](../../packages/design-data-spec/spec/cascade.md#cross-mode-set-overrides)):

```jsonc
[
  { "name": { "colorRole": "accent", "property": "color", "state": ["default"],
      "colorScheme": "light", "legacyKey": "accent-background-color-default", "object": "background" },
    "$schema": ".../token-types/alias.json", "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54",
    "uuid": "d9d8488d-9b38-47e0-9660-dcad040f3ca8" },                       // regular, light — real (Sample A1), specificity 0
  { "name": { "…": "…", "colorScheme": "dark" },
    "$schema": ".../token-types/alias.json", "$ref": "87a2c8f0-54fd-4939-8f42-3124fde1e49e",
    "uuid": "f24eb871-6419-4cef-88a2-cca8548ae31e" },                       // regular, dark — real (Sample A1), specificity 1
  { "name": { "…": "…", "contrast": "low" },
    "$schema": ".../token-types/alias.json", "$ref": "87a2c8f0-54fd-4939-8f42-3124fde1e49e",
    "uuid": "<new-uuid-1>" },                                               // low, light — hypothetical, specificity 1
  { "name": { "…": "…", "colorScheme": "dark", "contrast": "low" },
    "$schema": ".../token-types/alias.json", "$ref": "a8fbe39b-db6d-4bb4-a7c5-8a235060d2ae",
    "uuid": "<new-uuid-2>" },                                               // low, dark — hypothetical combination token, specificity 2
  { "name": { "…": "…", "contrast": "high" },
    "$schema": ".../token-types/alias.json", "$ref": "9bf3fa2f-75d3-44d3-ae30-d88893665366",
    "uuid": "<new-uuid-3>" },                                               // high, light — hypothetical, specificity 1
  { "name": { "…": "…", "colorScheme": "dark", "contrast": "high" },
    "$schema": ".../token-types/alias.json", "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54",
    "uuid": "<new-uuid-4>" }                                                // high, dark — hypothetical combination token, specificity 2
]
```

**D2 — `valuesByMode`**: one concept object; six `valuesByMode` entries, each a `modes`
array plus its own `$ref` — the shape's ergonomic high-water mark (criterion 5), since all
six cells live as array entries on one object instead of six top-level tokens:

```jsonc
{
  "uuid": "<new-concept-uuid>",
  "classification": { "colorRole": "accent", "property": "color", "state": ["default"],
    "legacyKey": "accent-background-color-default", "object": "background" },
  "valuesByMode": [
    { "modes": [{ "colorScheme": "light" }, { "contrast": "regular" }], "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54" },
    { "modes": [{ "colorScheme": "dark" },  { "contrast": "regular" }], "$ref": "87a2c8f0-54fd-4939-8f42-3124fde1e49e" },
    { "modes": [{ "colorScheme": "light" }, { "contrast": "low" }],     "$ref": "87a2c8f0-54fd-4939-8f42-3124fde1e49e" },
    { "modes": [{ "colorScheme": "dark" },  { "contrast": "low" }],     "$ref": "a8fbe39b-db6d-4bb4-a7c5-8a235060d2ae" },
    { "modes": [{ "colorScheme": "light" }, { "contrast": "high" }],    "$ref": "9bf3fa2f-75d3-44d3-ae30-d88893665366" },
    { "modes": [{ "colorScheme": "dark" },  { "contrast": "high" }],    "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54" }
  ]
}
```

**D3 — Concept-id middle path**: identical to D1's six per-value objects (cascade-resolved,
unchanged), plus the shared `conceptId` on every row:

```jsonc
{ "name": { "…": "…", "colorScheme": "dark", "contrast": "high" },
  "$ref": "90d82778-1cbb-47c0-aab9-b6e38a9cdc54", "uuid": "<new-uuid-4>",
  "conceptId": "accent-background-color-default" }
```

**Sample D confirms rather than changes the Part 4/6 finding on criterion 5**: `valuesByMode`
is genuinely more ergonomic here (D2's one concept object vs. D1/D3's six top-level tokens),
but current and concept-id both still *work* — just verbosely, via explicit combination
tokens per `cascade.md` §Cross-mode-set overrides — which is the same trade-off already
scored in [Part 4](#part-4--manifest--cascade-evaluation-uo7t2). It does not surface any new
cross-modal `$ref` risk: every `$ref` in D1/D2/D3 targets a mode-agnostic semantic alias
(accent-700/800/900/1000 carry no `colorScheme`), consistent with the Part 7 finding that
real aliases in this dataset never target per-mode leaf UUIDs directly.

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

## Part 7 — Cross-modal `$ref` guardrail gap (`uo7t.6`, Nate's reply)

Nate Baldwin [replied to the recommendation](https://github.com/adobe/spectrum-design-data/discussions/1410#discussioncomment-18296885)
with a concrete concern: nothing stops an alias `$ref` from targeting the *wrong mode's*
value of another multi-mode token — e.g. a light-mode token's `$ref` accidentally pointing
at blue-800's dark-mode UUID. He argues `$ref` should resolve against the **concept**, with
the mode determined by the referencing token's own context, not a specific per-value UUID —
structurally how `valuesByMode` works, and how neither the current shape nor concept-id do.

### The gap is real in the normative target model, not just the legacy bridge

* [`token-format.md` §Alias](../../packages/design-data-spec/spec/token-format.md#alias-ref)'s
  own normative example is a `colorScheme: dark` token whose `$ref` is a bare per-value UUID
  (`87a2c8f0…`). Nothing ties the target's mode to the referencing token's mode.
* [`cascade.md` §Alias resolution](../../packages/design-data-spec/spec/cascade.md#alias-resolution)
  is explicit that resolution is post-cascade and mode-blind — "Alias resolution MUST occur
  after cascade selection" and `$ref` is treated as an opaque UUID.
* `packages/design-data-spec/rules/rules.yaml`'s alias-integrity cluster (SPEC-001
  alias-target-exists, SPEC-002 alias-type-compatibility, SPEC-003 no-circular-aliases)
  checks only existence, type, and cycles — no mode-context check exists today.
* The SDK's context-aware alias path (`TokenGraph::resolve_alias_in_context` →
  `resolve_set_in_context`, `sdk/core/src/graph.rs:2041`) picks a mode-appropriate child only
  when the `$ref` targets a `set_uuid` — the legacy object-map bridge. A normative per-value
  UUID `$ref` falls through to context-free `resolve_alias_key`.

### But it is not live — zero violations in the current corpus

A full scan of `packages/design-data/tokens/*.json` (8 files, 2,374 token objects, 710
alias tokens with `$ref`, 447 of those carrying their own `name.colorScheme`) found:

| Alias (with `colorScheme`) → target relationship                                  | Count |
| --------------------------------------------------------------------------------- | ----- |
| Target is a mode-set (`set_uuid`) with a matching-mode member                     | 366   |
| Target is a mode-agnostic single alias (no `colorScheme`)                         | 81    |
| Target is a per-mode leaf UUID, **same** `colorScheme`                            | 0     |
| Target is a per-mode leaf UUID, **different** `colorScheme` (Nate's failure mode) | 0     |
| Dangling / unresolved `$ref`                                                      | 0     |

No alias in the corpus `$ref`s an individual per-mode leaf UUID at all — mode
differentiation is instead done by pointing at a different mode-agnostic semantic alias
(e.g. `accent-background-color-default` light/wireframe target `accent-900`, dark targets
`accent-800`), whose own terminal value is a `set_uuid` (color-palette entries sharing one
`set_uuid` per scale step, with distinct per-mode `uuid`s and rgb values, e.g. blue-900's
light/dark/wireframe members). The mode-appropriate palette member is selected by context at
resolution. **Today's data is mode-safe by construction — via the `set_uuid` bridge plus
context-aware resolution — even though the normative per-value target model doesn't require it.**

### `valuesByMode` is neither necessary nor sufficient for the property Nate wants

* **Not sufficient** — Sample A2 above shows `valuesByMode` entries still carry bare
  per-value `$ref` UUIDs (`"$ref": "90d82778-…"`). A light-mode entry can still be
  mis-authored to point at a dark target; collapsing the *referencing* token's three
  per-mode objects into one concept object does nothing to constrain what its
  per-mode `$ref` points at.
* **Not necessary** — the mode-safe resolution Nate wants already exists today via
  `resolve_set_in_context`: an alias targets a set/concept-level anchor, and the
  mode-appropriate member is chosen using the referencing token's own context. That
  mechanism is orthogonal to storage shape (per-value objects vs. `valuesByMode` array). The
  guarantee comes from *how `$ref` resolves* (context propagation against a concept/set
  anchor), not from *where per-mode values are stored*.

### The real risk: this rides on fields slated for removal

Current mode-safety depends on `set_uuid`/`set_schema`, which
[`relationship-format.md` §Transitional fields](../../packages/design-data-spec/spec/relationship-format.md#legacy-fields-interim)
says are "expected to be removed in a later spec version." If they're retired without
preserving a concept/set-level alias anchor plus context-aware resolution, authors lose the
mechanism that makes today's corpus mode-safe and are pushed back toward per-mode leaf
`$ref`s — at which point Nate's failure mode becomes reachable. `conceptId` is the natural
post-bridge anchor: an alias `$ref`s the concept, and resolution picks the mode by context,
exactly replacing the role `set_uuid` plays today.

### A companion validation rule can backstop the residual case

Sketch for **SPEC-059** (`alias-mode-context-compatibility`), the mode analogue of SPEC-002,
slotting into `rules/rules.yaml` immediately after SPEC-058:

* **assert:** For an alias token whose name object sets a mode-set field to value `M`, if its
  `$ref` — followed through the `alias_target` chain the way SPEC-042 does — resolves to a
  specific per-value token whose name object sets the *same* mode-set field to a value other
  than `M`, that is a mode-context violation. Targets that omit the field (mode-agnostic) or
  that are sets/concepts resolved in context are exempt.
* **severity:** warning to start — the scan above found zero current violations, so there's
  no false-positive surface, matching how SPEC-042/043 were introduced advisory-first;
  revisit as error once the target model (and the `set_uuid` retirement path) settles.
* **category:** `reference-integrity`, alongside SPEC-001–003.

A rule like this only *forbids* a bad `$ref`; it doesn't *provide* the positive mode-safe
resolution property. That property comes from concept/set-level targeting plus context-aware
resolution (above), which SPEC-059 backstops rather than replaces.

### Decision — recommendation stands, sharpened

`valuesByMode` remains declined. The reply to Nate is stronger than "add a validation rule":
the current model is *already* mode-safe in practice (0 violations) because real aliases
resolve against sets in context — the exact property he's asking for, achieved without his
restructure — and `valuesByMode` doesn't structurally guarantee that property either (its
`$ref`s are still raw UUIDs). Concept-id, plus (a) normativizing context-aware `$ref`
resolution against the concept anchor as the `set_uuid`/`set_schema` bridge retires, and (b)
the SPEC-059 guardrail, delivers Nate's mode-safety guarantee at the same additive cost as
before. This also refines criterion 8 (`$ref` aliasing granularity, Part 5): the current
model's per-value granularity is not the liability Nate frames it as, because real aliases
target mode-agnostic anchors or sets resolved in context, not per-mode leaves directly.

The `set_uuid`/`set_schema` retirement dependency identified here (point 4) is worth a
dedicated follow-on once the identity work lands, tracked separately from this analysis bead.
