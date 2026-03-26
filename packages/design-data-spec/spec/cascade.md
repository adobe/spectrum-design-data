# Cascade resolution

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **cascade model**: three **layers**, **semantic specificity**, and the **resolution algorithm** used to pick a single winning token value for a given **context**.

## Layers

Design data is organized in three layers, ordered from lowest to highest precedence when values conflict:

| Layer | Name           | Description                                                                                 |
| ----- | -------------- | ------------------------------------------------------------------------------------------- |
| 1     | **Foundation** | Canonical design system data (e.g. Spectrum foundation).                                    |
| 2     | **Platform**   | Platform-specific adjustments; **MUST** remain type-compatible with foundation.             |
| 3     | **Product**    | Product-specific overrides; **MUST** remain type-compatible with the resolved lower layers. |

**NORMATIVE:** When two candidates match the same context, the candidate from the **higher** layer (larger number above) **MUST** win.

**NORMATIVE:** Overrides **MUST NOT** change the resolved token’s **value type** (e.g. color alias cannot resolve to a non-color).

## Semantic specificity

**Specificity** counts how many **non-default** dimension fields in the token’s **name object** are set for the dimensions declared in the dataset.

**NORMATIVE:** Default dimension values (see [Dimensions](dimensions.md)) **MUST NOT** contribute to specificity.

**NORMATIVE:** When two candidates from the **same layer** match the context, the candidate with **higher** specificity **MUST** win.

**NORMATIVE:** Ties on layer and specificity **MUST** be broken by a deterministic **document order** rule defined by the manifest or dataset index (implementation-defined in this draft; validators **SHOULD** emit a warning on ambiguous ties).

## Context

A **resolution context** is a set of dimension key/value pairs (e.g. `colorScheme: dark`, `scale: medium`, `contrast: regular`) plus the **target layer** being resolved (usually product → platform → foundation).

## Resolution algorithm (informative outline)

The following outline is **RECOMMENDED** for conforming resolvers:

1. Collect all token candidates whose name object **matches** the context (every specified dimension in the context equals the name object’s dimension field, or the name object omits that dimension where omission means “matches any” per dimension rules).
2. Filter to candidates at or below the requested layer.
3. Select the maximum **layer** precedence.
4. Within that layer, select the maximum **specificity**.
5. Break remaining ties by deterministic ordering.

Exact matching rules for omitted dimensions are defined alongside dimension declarations in [Dimensions](dimensions.md).

## Cross-dimensional overrides

**NORMATIVE:** Overrides that combine multiple dimensions in a way not expressible by a single name object alone **MUST** use **explicit combination tokens** (tokens whose name object sets multiple non-default dimensions) as defined in the dataset; magic merging of unrelated tokens is **NOT** allowed.

## References

* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* [#714 — Design Data Specification](https://github.com/adobe/spectrum-design-data/discussions/714)
