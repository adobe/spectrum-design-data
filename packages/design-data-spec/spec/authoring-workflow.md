# Authoring workflow

<!-- Copyright 2026 Adobe. All rights reserved. -->

**Spec version:** `1.0.0-draft` (see [Overview](index.md))\
**Status:** Draft — RFC [#625](https://github.com/adobe/spectrum-design-data/discussions/625) / Phase 4 (umbrella epic [#714](https://github.com/adobe/spectrum-design-data/discussions/714))

This document defines the **authoring workflow** for spec-conformant design data: the normative contract governing how design tokens and related design-system artifacts are **created, edited, and maintained** over time.

The source-of-truth direction is already normative in [Evolution](evolution.md#legacy-format-contract): the cascade format is the authoritative source; the legacy format is generated from it. This document extends that contract by specifying *where* the authoritative source lives, *what tooling* is expected to author it, and *what lifecycle operations* a conforming authoring surface MUST support across all data categories.

## Goals

1. **Single authoritative source.** All Spectrum design data is authored in `packages/design-data/` (or any spec-conformant dataset root) — not in legacy output directories. Generated outputs are derived artifacts.
2. **Tool-mediated authoring.** Design data is authored via tooling (`design-data` CLI, `design-data-tui`, MCP authoring-session tools, future management app), not by direct JSON editing of production files. Tooling enforces schema validity, name-object decomposition, and UUID consistency.
3. **Full lifecycle coverage.** Authoring surfaces cover the complete artifact lifecycle — create, edit, deprecate, rename, alias-rewire, and mode-set management — not just creation.
4. **All data categories.** The authoring contract applies to every dataset category: tokens, components, fields, registry, mode sets, and guidelines.

## Non-goals

* Specifying the *output format* of generated artifacts. Legacy format mapping is defined in [Evolution — Legacy format contract](evolution.md#legacy-format-contract); DTCG and StyleDictionary outputs are deferred (RFC [#627](https://github.com/adobe/spectrum-design-data/discussions/627)).
* Specifying the *consumer-facing API* of published packages (`@adobe/spectrum-tokens`, platform SDKs). Those are separately governed.
* Specifying the *UI* of the authoring tools; this document defines behavioral contracts, not user-interface design.
* Multi-user collaboration, permissions models, and Figma sync direction (open questions in RFC [#625](https://github.com/adobe/spectrum-design-data/discussions/625)).

## Authoritative source

Per [Evolution — Legacy format contract](evolution.md#legacy-format-contract), `packages/design-data/` (or the dataset root declared in the active `.design-data.toml`) is the **authoritative source** for all design data; output directories are derived artifacts. This document extends that contract with the following authoring-specific obligations:

**NORMATIVE:** The dataset root MUST be the only location where design artifacts are authored. Output directories — including `packages/tokens/src/` and any platform-SDK directories — MUST NOT be independently edited.

**NORMATIVE:** An authoring tool that writes design data MUST write to the dataset root's registered directories (`tokens/`, `components/`, `fields/`, `mode-sets/`, `registry/`, `guidelines/`) as defined in [Dataset layout](dataset-layout.md). Writing to legacy output directories (`foundation.json`, `platform.json`, `product.json`) constitutes a non-conforming write operation for Spectrum foundation corpus authoring.

## Authoring tools

The following tools constitute the normative authoring surface:

| Tool                       | Form                                                         | Status                                                                              | Scope                                                                  |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `design-data` CLI          | `design-data write-token` subcommand                         | Shipped — product-layer token creation                                              | Foundation corpus authoring: see [Gap — Phase B](#scheduled-promotion) |
| `design-data-tui`          | interactive token naming + creation wizard                   | Shipped (RFC [#973](https://github.com/adobe/spectrum-design-data/discussions/973)) | Foundation corpus authoring: see [Gap — Phase B](#scheduled-promotion) |
| MCP authoring session      | `start_authoring_session` / `authoring_session_commit` tools | Shipped (RFC [#973](https://github.com/adobe/spectrum-design-data/discussions/973)) | Foundation corpus authoring: see [Gap — Phase B](#scheduled-promotion) |
| Design Data management app | future browser-based tool                                    | Not yet shipped                                                                     | Full CRUD across all categories                                        |

**RECOMMENDED:** Authors SHOULD use the TUI or MCP authoring session rather than editing cascade JSON files directly. Tooling enforces UUID uniqueness, name-object field decomposition, and referential integrity that is difficult to maintain manually.

### Scheduled promotion {#scheduled-promotion}

The shipped CLI/TUI/MCP write path currently targets product-layer files (`foundation.json`, `platform.json`, `product.json`) — the distributed design system model introduced for product teams. Redirecting those tools to write to the foundation Spectrum corpus (`packages/design-data/tokens/*.tokens.json`) is Phase B work.

**NORMATIVE:** Once the Phase B authoring engine ships, all authoring tools described above MUST write to the dataset root, not to legacy layer files. The `write_token` and `write_component` operations in [Agent-readable surface](agent-surface.md) are currently RECOMMENDED; they are **scheduled to become required** (MUST) when the Phase B foundation-corpus write target ships. The exact promotion version is tracked in RFC [#625](https://github.com/adobe/spectrum-design-data/discussions/625). This mirrors the SPEC-017 escalation precedent in [Token format](token-format.md#string-name-escape-hatch--spec-017-severity-schedule).

## Lifecycle operations

The following table defines the **target token-authoring contract**: the complete set of lifecycle operations a fully conforming authoring tool MUST support. Current shipped conformance covers **create only**; edit and remaining lifecycle operations are Phase B work (see [Per-category authoring contracts](#per-category-authoring-contracts) and [Scheduled promotion](#scheduled-promotion)). Operations for non-token categories are specified in the per-category authoring contracts.

### Token lifecycle operations

| Operation               | Description                                                                                                                      | Required fields                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **create**              | Introduce a new token to the dataset. Assign a fresh UUID. Populate name object, value or alias `$ref`, `introduced` version.    | `uuid`, `name`, `value` or `$ref`      |
| **edit**                | Update a token's value, alias target, rationale, or name-object fields. Preserve UUID.                                           | `uuid` (for identity lookup)           |
| **deprecate**           | Set `deprecated` to the current spec version string; optionally set `replaced_by` and `deprecated_comment`.                      | `deprecated`, `uuid`                   |
| **rename**              | Assign a new name object. Introduce a `replaced_by` pointer on the old token (or retire it). Preserve UUID on the renamed token. | Name-object fields, `replaced_by`      |
| **alias-rewire**        | Change the `$ref` target UUID of an alias token. Verify the new target resolves in the cascade.                                  | `$ref`                                 |
| **mode-set management** | Add, rename, or remove a mode-set entry. Update affected `mode` fields across tokens.                                            | Mode-set file + affected token entries |
| **remove**              | Delete a token that has passed its migration window. Verify no `$ref` in the dataset resolves to the removed UUID.               | n/a                                    |

**NORMATIVE:** A conforming authoring tool MUST assign UUIDs at creation time and MUST NOT change the UUID of an existing token during any edit, deprecate, rename, or alias-rewire operation. UUID stability is the identity contract that allows `$ref`, `replaced_by`, and external consumers to reference tokens across versions.

**NORMATIVE:** A conforming authoring tool MUST write a valid `introduced` version on create, using the declared spec version of the active dataset (`specVersion` field in `dataset.json` or `.design-data.toml`).

**NORMATIVE:** A conforming authoring tool MUST validate the written dataset against Layer 1 (JSON Schema) and Layer 2 (semantic rules) before persisting the write. A write operation that produces a Layer 1 error MUST be rejected.

**RECOMMENDED:** A conforming authoring tool SHOULD capture an optional `rationale` argument at creation or edit time and record it in the token's inline `rationale` field. See [Product context](product-context.md#agent-capture-behavior) for the product-layer rationale convention.

## Per-category authoring contracts

The following per-category contracts specify what the authoring surface authors in each registered directory and which validation rules gate the output. Detailed authoring workflows per category are specified in separate subsections of this document as Phase A work progresses.

| Category   | Directory     | Authoring status                                                                 | Validation gate                            |
| ---------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Tokens     | `tokens/`     | Shipped (create only; edit/lifecycle operations are Phase B)                     | SPEC-001–017, SPEC-041, SPEC-042, SPEC-043 |
| Components | `components/` | Not yet shipped (`write_component` deferred — [Agent surface](agent-surface.md)) | SPEC-018–040                               |
| Fields     | `fields/`     | Not yet shipped                                                                  | SPEC-042, SPEC-043                         |
| Mode sets  | `mode-sets/`  | Not yet shipped                                                                  | SPEC-005, SPEC-008, SPEC-041               |
| Guidelines | `guidelines/` | Not yet shipped                                                                  | SPEC-045, SPEC-046                         |
| Registry   | `registry/`   | Not yet shipped (vocabulary is hand-maintained)                                  | SPEC-033, SPEC-034, SPEC-035               |

### Token authoring contract

Tokens are authored in `tokens/**/*.tokens.json`. Files may be nested arbitrarily within
`tokens/`; the convention is one thematic `.tokens.json` file per token group (e.g.
`color-palette.tokens.json`, `typography.tokens.json`).

**Required at creation:** A conforming authoring tool MUST write:

| Field             | Requirement            | Notes                                                                                                                                          |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | REQUIRED               | Name object with at least `property`; MUST be decomposed via the `fields/` catalog — see [Taxonomy-aware authoring](#taxonomy-aware-authoring) |
| `uuid`            | REQUIRED               | Fresh UUID v4 assigned by the tool; MUST NOT change for the lifetime of the token                                                              |
| `value` or `$ref` | REQUIRED (exactly one) | Literal value or alias reference to another token's UUID                                                                                       |
| `$schema`         | RECOMMENDED            | Token-type schema URI (e.g. `color.json`, `typography.json`) from `packages/design-data-spec/schemas/`                                         |
| `introduced`      | RECOMMENDED            | Spec version string of the active dataset at creation time                                                                                     |

**Validation gate:** SPEC-001–017 (name, value, lifecycle, tech-debt), SPEC-041 (mode-set
conformance), SPEC-042 (field-scope), SPEC-043 (domain-required-fields).

**Edit and lifecycle operations (Phase B):** Edit, deprecate, rename, alias-rewire, mode-set
management, and remove are specified in [Lifecycle operations](#lifecycle-operations) and are
implemented in Phase B.

***

### Component authoring contract

Components are authored in `components/{name}.json`. Each file declares one component and MUST
be named with the component's `name` field value (e.g. `button.json` for `name: "button"`).

**Required at creation:**

| Field                   | Requirement | Notes                                                                                                             |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `$id`                   | REQUIRED    | URI: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/components/{name}.json`                        |
| `name`                  | REQUIRED    | Kebab-case slug, unique within the dataset                                                                        |
| `displayName`           | REQUIRED    | Human-readable name (e.g. `"Button"`)                                                                             |
| `meta.category`         | REQUIRED    | One of: `actions`, `containers`, `data visualization`, `feedback`, `inputs`, `navigation`, `status`, `typography` |
| `meta.documentationUrl` | REQUIRED    | URI to component documentation page                                                                               |

**Recommended at creation:** `options` (component API), `anatomy` (anatomy parts array),
`states` (state declarations array).

**Validation gate:** SPEC-018–022 (anatomy/state/slot structure), SPEC-024–027 (tokenBindings,
cross-references), SPEC-034 (category registry sync), SPEC-035 (anatomy-term registry sync),
SPEC-038–040 (lifecycle, display name, schema).

**Authoring status:** Not yet shipped — `write_component` is Phase B scheduled (see
[Scheduled promotion](#scheduled-promotion)).

***

### Field authoring contract

Name-object field declarations are authored in `fields/{fieldName}.json`. Each file declares
one field. Field declarations extend the `fields/` catalog that the SDK and authoring tools
load for classification decomposition.

**Required at creation:**

| Field                    | Requirement | Notes                                                              |
| ------------------------ | ----------- | ------------------------------------------------------------------ |
| `name`                   | REQUIRED    | Field key on the token name object (e.g. `colorFamily`, `variant`) |
| `kind`                   | REQUIRED    | One of: `semantic`, `mode-set`, `numeric`                          |
| `validation`             | REQUIRED    | One of: `strict` (error), `advisory` (warning), `none`             |
| `serialization.position` | REQUIRED    | Integer; order in default serialized name string                   |

**Recommended at creation:** `description`, `registry` (path to vocabulary file, or `null`),
`scope` (domain restriction string, or `null` for universal fields).

**Validation gate:** SPEC-042 (field-scope-violation), SPEC-043 (domain-required-fields).

**Authoring status:** Not yet shipped — field declarations are currently hand-authored JSON.
Phase C will add tooling for field creation.

***

### Mode-set authoring contract

Mode sets are authored in `mode-sets/{name}.json`. Each file declares one mode set. Mode-set
names MUST be stable identifiers — they are referenced by tokens' mode-keyed `sets` objects
and by manifests; renaming a mode set is a breaking operation.

**Required at creation:**

| Field     | Requirement | Notes                                                                   |
| --------- | ----------- | ----------------------------------------------------------------------- |
| `name`    | REQUIRED    | Stable mode-set identifier (e.g. `colorScheme`, `scale`)                |
| `modes`   | REQUIRED    | Non-empty array of unique mode-value strings (e.g. `["light", "dark"]`) |
| `default` | REQUIRED    | A member of `modes`; MUST satisfy SPEC-005                              |

**Recommended at creation:** `description`.

**Validation gate:** SPEC-005 (default-mode-not-in-modes), SPEC-008 (base-variant-absence),
SPEC-041 (platform mode-set conformance).

**Authoring status:** Not yet shipped — mode sets are hand-authored JSON. Phase C will add
tooling for mode-set management.

***

### Guideline authoring contract

Guideline documents are authored in `guidelines/{name}.json`. Each file declares one guideline
document. The filename MUST match the document's `name` field.

**Required at creation:**

| Field            | Requirement | Notes                                                                                 |
| ---------------- | ----------- | ------------------------------------------------------------------------------------- |
| `$id`            | REQUIRED    | URI: `https://opensource.adobe.com/spectrum-design-data/guidelines/{name}.json`       |
| `name`           | REQUIRED    | Kebab-case slug matching filename                                                     |
| `title`          | REQUIRED    | Human-readable page title                                                             |
| `category`       | REQUIRED    | One of: `designing`, `fundamentals`, `developing`, `support`                          |
| `documentBlocks` | REQUIRED    | Array with at least one block (SPEC-045 requires a `purpose` block SHOULD be present) |

**Recommended at creation:** `sourceUrl`, `lastUpdated`, `tags`.

**Validation gate:** SPEC-045 (guideline-purpose-block), SPEC-046 (guideline-related-references-resolve).

**Authoring status:** Not yet shipped — guidelines are hand-authored JSON. Phase C will add
tooling for guideline creation.

***

### Registry authoring contract

Registry files in `registry/` declare vocabulary collections — the canonical term lists for
anatomy, component categories, states, variants, and other classified fields. Registry files
are currently **hand-maintained**: they are not yet authored via tooling.

Each registry file is a JSON object with `type`, `description`, and a `values` array. Each
value entry carries:

| Field   | Requirement | Notes                                                                |
| ------- | ----------- | -------------------------------------------------------------------- |
| `id`    | REQUIRED    | Canonical value string (kebab-case); unique within the registry file |
| `label` | REQUIRED    | Human-readable display name                                          |

**Recommended per entry:** `description`, `usedIn` (declarative metadata — see
[Registry spec](registry.md) for the field definition).

**Validation gate:** SPEC-009 (name-field-enum-sync, advisory), SPEC-033 (cross-registry ID
overlap is permitted), SPEC-034 (component-categories registry sync), SPEC-035
(anatomy-part-names registry sync).

**Authoring status:** Hand-maintained vocabulary — the `registry/` directory has an
`AUTHORING.md` guide in `packages/design-data/AUTHORING.md`. Tooling-assisted registry
authoring is Phase C scope; vocabulary additions today follow the manual process in that guide.

***

## Taxonomy-aware authoring

**NORMATIVE:** A conforming authoring tool MUST decompose the token name into name-object fields using the `fields/` catalog rather than accepting a freeform `property` string. At minimum, authoring tools MUST offer structured field selection for all fields declared in `packages/design-data/fields/*.json` (or the equivalent dataset-relative path).

**RECOMMENDED:** Authoring tools SHOULD validate candidate field values against the corresponding registry (where a `registry` path is declared on the field descriptor) and SHOULD warn the author when a value does not match any registered term.

**RATIONALE:** Baking taxonomy concepts (size, variant, density, etc.) into the `property` slug reproduces technical debt that the structured name-object format was designed to eliminate. SPEC-043 (`domain-required-fields`) tracks this decomposition debt at advisory severity; it is scheduled to tighten — see [Taxonomy — SPEC-043 severity schedule](taxonomy.md#spec-043-severity-schedule) for the escalation schedule and promotion conditions.

## Output generation

**NORMATIVE:** After any authoring operation that modifies the `tokens/` directory, the legacy output (`packages/tokens/src/`) MUST be regenerated by running the output generator pipeline (`design-data:legacy-output` moon task). The regenerated output MUST pass the round-trip verification gates (`design-data:roundtrip-verify`, `tokens:verifyLegacyRoundtrip`, `tokens:verifyLegacyOutput`).

**NORMATIVE:** The output generator MUST be deterministic: given the same input cascade files, it MUST produce byte-identical output on successive runs. See [Evolution — Legacy format contract](evolution.md#legacy-format-contract) for the field-mapping specification.

**RECOMMENDED:** Authoring tooling SHOULD trigger output regeneration automatically after a successful write, so that the generated outputs stay in sync without a manual pipeline step.

## Conformance

**NORMATIVE:** An authoring tool implementation that claims conformance with this section MUST:

1. Write all authored artifacts to the dataset root's registered directories (not to legacy output files).
2. Assign UUIDs at creation time and preserve them across all subsequent operations.
3. Write a valid `introduced` version on all created artifacts.
4. Validate written artifacts against Layer 1 (JSON Schema) and Layer 2 (semantic rules) before persisting.
5. Support structured name-object field decomposition using the `fields/` catalog for token creation.

## References

* [#625 — Token Authoring Workflow](https://github.com/adobe/spectrum-design-data/discussions/625) — RFC discussion
* [#714 — Design Data Specification (umbrella)](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#973 — Interactive TUI & Token Authoring Wizard](https://github.com/adobe/spectrum-design-data/discussions/973) — shipped authoring tooling
* [Dataset layout](dataset-layout.md) — normative directory structure and discovery algorithm
* [Agent-readable surface](agent-surface.md) — write operations and transport contracts
* [Evolution — Legacy format contract](evolution.md#legacy-format-contract) — cascade-is-source-of-truth policy
* [Token format](token-format.md) — token name object, lifecycle fields
* [Taxonomy](taxonomy.md) — name-object fields and vocabulary
* [`sdk/core/src/write.rs`](../../../sdk/core/src/write.rs) — reference write implementation
* [`sdk/core/src/legacy.rs`](../../../sdk/core/src/legacy.rs) — legacy output generator
