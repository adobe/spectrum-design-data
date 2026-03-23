# Dimensions

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines how **dimensions** (modes such as color scheme, scale, contrast) are **declared**, assigned **defaults**, and validated for **coverage**.

## Dimension declaration

A **dimension declaration** is a JSON object describing one axis of variation. It **MUST** conform to [`dimension.schema.json`](../schemas/dimension.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/dimension.schema.json`).

### Required fields

| Field     | Description                                               |
| --------- | --------------------------------------------------------- |
| `name`    | Stable identifier for the dimension (e.g. `colorScheme`). |
| `modes`   | Array of allowed mode values (strings).                   |
| `default` | Default mode; **MUST** be a member of `modes`.            |

### Optional fields

| Field         | Description                          |
| ------------- | ------------------------------------ |
| `description` | Human-readable documentation.        |
| `coverage`    | Rules for mode coverage (see below). |

## Built-in dimensions

These dimensions **SHOULD** be used consistently across Spectrum-compatible datasets:

| `name`        | Typical `modes`                 | Notes                         |
| ------------- | ------------------------------- | ----------------------------- |
| `colorScheme` | `light`, `dark`, `wireframe`, … | Theme / appearance.           |
| `scale`       | `medium`, `large`, …            | Density / t-shirt scale.      |
| `contrast`    | `regular`, `high`, …            | Accessibility contrast level. |

## Optional dimensions

Additional dimensions (e.g. `language`, `motion`) **MAY** be declared in a dataset’s dimension catalog. Token name objects **MAY** include keys matching declared dimension names.

## Defaults and specificity

**NORMATIVE:** A token name object **omitting** a dimension field implies the token applies under the dimension’s **`default`** mode for specificity and matching purposes unless the spec for that dimension states otherwise.

**NORMATIVE:** Only **non-default** dimension fields on the name object increase **semantic specificity** (see [Cascade](cascade.md)).

## Coverage validation

**RECOMMENDED:** If a dimension’s `coverage` requires **peer modes** (e.g. defining `dark` requires `light`), validators implement rule **`SPEC-005`** (see `rules/rules.yaml`).

**RECOMMENDED:** Explicit **combination** tokens are used for rare cross-dimensional cases instead of inferring Cartesian products.

## References

* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* [#714 — Design Data Specification](https://github.com/adobe/spectrum-design-data/discussions/714)
