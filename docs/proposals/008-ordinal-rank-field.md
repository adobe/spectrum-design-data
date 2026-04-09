# Proposal 008: Ordinal Rank Field

**Status:** Draft\
**Affects:** 8 active tokens across color-aliases.json and layout.json\
**Spec reference:** taxonomy.md — name object field definitions

## Problem

A small set of tokens use low integers (1, 2, 3) that express positional rank or order rather than a design system scale value. These are currently parsed as `scaleIndex` by the decomposer, but they represent a fundamentally different concept:

| Token                      | Value | Meaning               |
| -------------------------- | ----- | --------------------- |
| `background-layer-1-color` | 1     | First (primary) layer |
| `background-layer-2-color` | 2     | Second layer          |
| `gradient-stop-1-genai`    | 1     | First gradient stop   |
| `gradient-stop-2-genai`    | 2     | Second gradient stop  |
| `gradient-stop-3-genai`    | 3     | Third gradient stop   |
| `gradient-stop-1-premium`  | 1     | First gradient stop   |
| `gradient-stop-2-premium`  | 2     | Second gradient stop  |
| `gradient-stop-3-premium`  | 3     | Third gradient stop   |

These differ from `scaleIndex` values (25, 50, 75, 100...1600) in two ways:

1. **Semantics** — they express order/rank (primary, secondary, tertiary), not a position on a design system ramp
2. **Serialization** — they appear mid-name (e.g., `layer-1-color`), not at the end like scale indices

## Proposal

Add `ordinal` as a new field on the name object.

### Definition

* **Type:** Integer (positive, small)
* **Values:** Typically 1, 2, 3
* **Validation:** Advisory
* **Cascade:** Does not participate in cascade resolution

### Serialization

The ordinal appears inline adjacent to the structure or object it qualifies, not appended at the end:

```
{object}-{ordinal}-{property}
→ background-layer-1-color
```

This differs from `scaleIndex`, which always serializes at the end.

### Examples

| Current token name         | Proposed name object                                                          |
| -------------------------- | ----------------------------------------------------------------------------- |
| `background-layer-1-color` | `{ object: "background", structure: "layer", ordinal: 1, property: "color" }` |
| `gradient-stop-2-genai`    | `{ property: "gradient-stop", ordinal: 2, variant: "genai" }`                 |

## Impact

* 8 active tokens gain a proper field for their positional index
* Distinguishes ordinal rank from design system scale values
* Requires decomposer changes to detect ordinal vs scaleIndex (heuristic: value <= small threshold and appears mid-name)
* No breaking change to existing tokens — additive field only

## Open Questions

* Should the threshold be value-based (e.g., <= 10) or context-based (adjacent to a known structure/object)?
* Should ordinal support zero-based indexing?
