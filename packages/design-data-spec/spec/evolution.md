# Evolution

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **evolution policy** for the Design Data Specification: how the spec, schemas, and token data change over time, with a focus on the token deprecation lifecycle and backward compatibility.

## Token deprecation lifecycle

Tokens progress through the following lifecycle stages:

```
introduced → active → deprecated → planned removal → removed
```

| Stage               | Token state                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Introduced**      | Token first appears in the dataset. `introduced` field records the version.                                                                                                    |
| **Active**          | Token is current and recommended for use. No `deprecated` field.                                                                                                               |
| **Deprecated**      | Token is no longer recommended. `deprecated` records the version. Consumers receive warnings. `replaced_by` points to the successor token(s) when a direct replacement exists. |
| **Planned removal** | `plannedRemoval` records the target version. The token remains in the dataset but consumers should complete migration.                                                         |
| **Removed**         | Token is deleted from the dataset. Consumers that still reference it will break.                                                                                               |

### Lifecycle fields

See [Token format — Lifecycle and metadata](token-format.md#lifecycle-and-metadata) for the full field definitions and normative rules.

### What `replaced_by` guarantees

When a token carries `replaced_by`:

* Each target UUID **MUST** resolve to an existing token in the dataset (rule `SPEC-010`).
* The target token **SHOULD NOT** itself be deprecated. Chains of replacements (A replaced by B, B replaced by C) are discouraged; authors should point directly to the final replacement.
* For a single UUID (1:1 replacement), consumers can mechanically rewrite references.
* For an array of UUIDs (one-to-many split), the `deprecated_comment` **MUST** explain which replacement applies in which context.

## Migration windows

**NORMATIVE:** A deprecated token **MUST** remain in the published dataset for at least **two minor versions** after the version recorded in `deprecated` before it may be removed.

**EXAMPLE:** A token deprecated in `3.2.0` may not be removed until `3.4.0` at the earliest. Removal in a major version (e.g. `4.0.0`) is always permitted regardless of how recently the token was deprecated.

**RATIONALE:** Two minor versions gives consumers at least two release cycles to migrate. The major-version escape hatch allows accumulated deprecations to be cleaned up in a coordinated breaking release.

If `plannedRemoval` is set, it overrides the default window — the token will be removed in the specified version (which must not precede the `deprecated` version).

## Change classification

The specification follows [Semantic Versioning](https://semver.org/) for its published artifacts (schemas, rule catalog, spec documents).

### Minor changes (backward compatible)

* New tokens added to the dataset
* New optional fields added to token schema
* New validation rules added to the rule catalog
* Tokens deprecated (with `deprecated` field)
* Rule severity relaxed (error → warning)
* New enum values added to registries

### Major changes (breaking)

* Tokens removed from the dataset
* Required fields added to token schema
* Existing fields removed or type-changed
* Rule severity tightened (warning → error)
* Enum values removed from registries
* Constraint tightening (e.g. stricter value validation)

### Patch changes (clarifications)

* Typo fixes in spec prose
* Clarifications to normative text that do not change conformance behavior
* Test fixture additions or corrections

## Legacy format contract

The `@adobe/spectrum-tokens` package continues to publish tokens in the **legacy format** (JSON object maps with `color-set`, `scale-set`, etc.) for backward compatibility with existing consumers.

**NORMATIVE:** The legacy format output **MUST** be generated from the cascade-format authoritative source. It is a **derived artifact**, not independently authored.

### Lifecycle field mapping

| Cascade format                         | Legacy format                         |
| -------------------------------------- | ------------------------------------- |
| `deprecated: "3.2.0"` (version string) | `deprecated: true` (boolean)          |
| `replaced_by: "<uuid>"`                | `renamed: "<target-token-name>"`      |
| `introduced`                           | Not emitted                           |
| `lastModified`                         | Not emitted                           |
| `plannedRemoval`                       | Not emitted                           |
| `deprecated_comment`                   | `deprecated_comment` (passed through) |

### Coexistence during migration

Both formats are published simultaneously. The cascade format is the source of truth; the legacy format is generated from it. This dual-format period continues until platform consumers have migrated to the cascade format or to platform SDKs that consume it.

## References

* [#623 — Token Lifecycle Metadata](https://github.com/adobe/spectrum-design-data/discussions/623)
* [#735 — RFC: Versioning and Evolution](https://github.com/adobe/spectrum-design-data/discussions/735)
* [#736 — Define spec evolution policy and migration contract](https://github.com/adobe/spectrum-design-data/issues/736)
