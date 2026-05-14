# Mode Sets

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines how **mode sets** (axes such as color scheme, scale, contrast) are **declared**, assigned **defaults**, and validated for **coverage**.

## Mode Set declaration

A **mode set declaration** is a JSON object describing one axis of variation. It **MUST** conform to [`mode-set.schema.json`](../schemas/mode-set.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json`).

### Required fields

| Field     | Description                                              |
| --------- | -------------------------------------------------------- |
| `name`    | Stable identifier for the mode set (e.g. `colorScheme`). |
| `modes`   | Array of allowed mode values (strings).                  |
| `default` | Default mode; **MUST** be a member of `modes`.           |

### Optional fields

| Field         | Description                          |
| ------------- | ------------------------------------ |
| `description` | Human-readable documentation.        |
| `coverage`    | Rules for mode coverage (see below). |

## Built-in mode sets

These mode sets are declared in the `mode-sets/` catalog (see [Mode Set catalog](#mode-set-catalog)) and **SHOULD** be used consistently across Spectrum-compatible datasets:

| `name`        | `modes`                      | `default` | Notes                                                                             |
| ------------- | ---------------------------- | --------- | --------------------------------------------------------------------------------- |
| `colorScheme` | `light`, `dark`, `wireframe` | `light`   | Theme / appearance.                                                               |
| `scale`       | `desktop`, `mobile`          | `desktop` | Density scale. Legacy names; desktop = medium, mobile = large in W3C terminology. |
| `contrast`    | `regular`, `high`            | `regular` | Accessibility contrast level.                                                     |

## Mode Set catalog

The Spectrum foundation publishes mode set declarations as JSON files under `packages/design-data-spec/mode-sets/`. Each file conforms to [`mode-set.schema.json`](../schemas/mode-set.schema.json).

**NORMATIVE:** Tooling (validators, resolution engine) **MUST** load mode set declarations from the dataset's mode set catalog before performing specificity calculations or coverage validation.

**RECOMMENDED:** The catalog directory is named `mode-sets/` and is co-located with the dataset's spec package or manifest.

## Optional mode sets

Additional mode sets (e.g. `language`, `motion`) **MAY** be declared in a dataset's mode set catalog. Token name objects **MAY** include keys matching declared mode set names.

## Defaults and specificity

**NORMATIVE:** A token name object **omitting** a mode set field implies the token applies under the mode set's **`default`** mode for specificity and matching purposes unless the spec for that mode set states otherwise.

**NORMATIVE:** Only **non-default** mode set fields on the name object increase **semantic specificity** (see [Cascade](cascade.md)).

## Coverage validation

**RECOMMENDED:** If a mode set's `coverage` requires **peer modes** (e.g. defining `dark` requires `light`), validators implement rule **`SPEC-005`** (see `rules/rules.yaml`).

**RECOMMENDED:** Explicit **combination** tokens are used for rare cross-mode-set cases instead of inferring Cartesian products.

## References

* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* [#714 — Design Data Specification](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#746 — Phase 2: Mode Set declarations (machine-readable)](https://github.com/adobe/spectrum-design-data/issues/746)
