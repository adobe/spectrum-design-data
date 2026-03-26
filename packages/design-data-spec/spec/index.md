# Design Data Specification

**Version:** `1.0.0-draft`\
**Status:** Draft — normative text and schemas may change before `1.0.0`.

This document is the top-level overview for the **Design Data Specification**: a machine-readable model for Spectrum design tokens, dimensions, platform manifests, and validation.

## Scope

The specification defines:

1. **Token format** — structured token identity (`name`), literal `value` or alias `$ref`, and lifecycle metadata ([Token format](token-format.md)).
2. **Cascade and resolution** — layered data (foundation, platform, product), specificity, and how a context picks a winning value ([Cascade](cascade.md)).
3. **Dimensions** — declared modes, defaults, and coverage expectations ([Dimensions](dimensions.md)).
4. **Platform manifest** — how a platform repo pins foundation data, filters tokens, and applies typed overrides ([Manifest](manifest.md)).

Out of scope for this draft (tracked elsewhere):

* Exact query syntax for `include` / `exclude` in manifests (placeholder fields only).
* Full evolution, migration windows, and SDK version negotiation — see [discussion #735](https://github.com/adobe/spectrum-design-data/discussions/735).

## Conformance

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** in this specification are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) \[[RFC2119](https://www.rfc-editor.org/rfc/rfc2119.html)] \[[RFC8174](https://www.rfc-editor.org/rfc/rfc8174.html)] when, and only when, they appear in all capitals, as shown here.

### Conformance levels

| Level           | Meaning                                                 |
| --------------- | ------------------------------------------------------- |
| **NORMATIVE**   | Required for a conforming document or tool.             |
| **RECOMMENDED** | Strong default; deviations SHOULD be documented.        |
| **OPTIONAL**    | May be omitted unless a feature explicitly requires it. |

### Validation layers

Conformance is checked in three layers (all under `@adobe/design-data-spec`):

| Layer | Artifact           | Responsibility                                             |
| ----- | ------------------ | ---------------------------------------------------------- |
| 1     | `schemas/*.json`   | Per-instance structural shape (JSON Schema Draft 2020-12). |
| 2     | `rules/rules.yaml` | Semantic rules with stable IDs (e.g. `SPEC-001`).          |
| 3     | `conformance/`     | Fixtures and expected diagnostics for implementors.        |

A **conforming validator** MUST implement Layer 1 for supported document types and SHOULD implement Layer 2 rules whose `introduced_in` is less than or equal to the validator’s claimed spec version.

## Spec version and SemVer

This document set carries the **spec version** `1.0.0-draft`. Published artifacts (schemas, rule catalog) are expected to align with [Semantic Versioning](https://semver.org/) once `1.0.0` is released: **MAJOR** for incompatible schema or rule behavior, **MINOR** for backward-compatible additions, **PATCH** for clarifications and compatible fixes.

Full governance (compatibility tiers, migration, CLI `--spec-version`) is discussed in [discussion #735 — Versioning and Evolution](https://github.com/adobe/spectrum-design-data/discussions/735).

## Normative references (sibling documents)

| Document                        | Role                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| [Token format](token-format.md) | Token `name`, `value` / `$ref`, value types, lifecycle metadata. |
| [Cascade](cascade.md)           | Layers, specificity, resolution algorithm.                       |
| [Dimensions](dimensions.md)     | Dimension declarations, built-in dimensions, coverage.           |
| [Manifest](manifest.md)         | Platform manifest fields and validation expectations.            |

## JSON Schema `$id` and versioning

**NORMATIVE:** Canonical schema documents use **versioned path** `$id` URIs so major revisions can coexist on the documentation host:

* Base: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/`
* Examples: `.../v0/token.schema.json`, `.../v0/dimension.schema.json`, `.../v0/manifest.schema.json`

The **`v0`** segment denotes the **draft / pre-1.0** schema family aligned with spec version `1.0.0-draft`. A future **1.0.0** stable release MAY introduce `v1` paths without reusing `v0` URLs for incompatible shapes.

**RECOMMENDED:** Each root schema document includes a top-level string property `specVersion` (const matching this spec’s version label) when the instance is a design-data document that should self-identify; see individual schemas.

Packaged copies in this repository live under `packages/design-data-spec/schemas/`; their `$id` still identifies the canonical published URL above.

## Relationship to existing Adobe packages

| Package / area                          | Relationship                                                                                                                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@adobe/spectrum-tokens`                | **Current** token JSON under `packages/tokens/` is the **legacy** shape (e.g. `color-set`, `scale-set`). This spec defines the **target** format; backward-compat schemas and migration are Phase 1 ([#723](https://github.com/adobe/spectrum-design-data/issues/723)). |
| `@adobe/design-system-registry`         | Registry enums and component metadata MAY be referenced by validation rules (e.g. component association); exact coupling is Layer 2.                                                                                                                                    |
| `@adobe/spectrum-component-api-schemas` | Component schemas MAY be cross-checked by graph rules; not required for Layer 1 structural validation.                                                                                                                                                                  |

## Umbrella discussions

* [#714 — Design Data Specification (umbrella)](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#715 — Distributed Design Data Architecture](https://github.com/adobe/spectrum-design-data/discussions/715)
* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
