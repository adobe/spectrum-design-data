# Proposal 003: Numeric Scale Index

**Status:** Implemented\
**Affects:** 280 active tokens across all source files\
**Spec reference:** taxonomy.md — name object field definitions

## Problem

Foundational scale tokens use numeric indices (e.g., `spacing-100`, `accent-color-900`, `font-size-200`) that have no field in the 13-field taxonomy. These are the backbone of the design system — spacing, color palette scales, font sizes, border widths, corner radii, and drop-shadow values all use this pattern.

| Pattern                    | Count | Examples                                                     |
| -------------------------- | ----- | ------------------------------------------------------------ |
| `{property}-{number}`      | \~120 | `spacing-100`, `border-width-200`                            |
| `{variant}-color-{number}` | \~80  | `accent-color-900`, `negative-color-400`                     |
| `{compound}-{number}`      | \~80  | `font-size-200`, `corner-radius-400`, `drop-shadow-blur-100` |

The analyzer currently flags these as `numeric-scale-index` gaps. They decompose correctly except for the numeric segment, which has no field to land in.

## Proposal

Add `scaleIndex` as a numeric field on the name object.

### Definition

* **Type:** Integer (non-negative)
* **Values:** Any non-negative integer, typically from the set: 0, 25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600
* **Validation:** Advisory (warn if not in the known scale set)
* **Cascade:** Does not participate in cascade resolution

### Serialization

Appended at the end of the serialized name, after all other fields:

```
{variant}-{component}-...-{state}-{scaleIndex}
```

### Examples

| Current token name         | Proposed name object                                               |
| -------------------------- | ------------------------------------------------------------------ |
| `spacing-100`              | `{ property: "spacing", scaleIndex: 100 }`                         |
| `accent-color-900`         | `{ variant: "accent", property: "color", scaleIndex: 900 }`        |
| `font-size-200`            | `{ property: "font-size", scaleIndex: 200 }`                       |
| `corner-radius-400`        | `{ property: "corner-radius", scaleIndex: 400 }`                   |
| `background-layer-1-color` | `{ object: "background", property: "layer-color", scaleIndex: 1 }` |

## Impact

* 280 active tokens gain a proper field for their numeric index
* All scale tokens can roundtrip correctly
* No breaking change to existing tokens — additive field only
