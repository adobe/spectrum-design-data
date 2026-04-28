# Proposal 009: Typography Scale Composite Token

**Status:** Draft\
**Affects:** 36 scale-set tokens (18 `font-size-*` + 18 `line-height-font-size-*`) in typography.json\
**Spec reference:** token-format.md — value types; taxonomy.md — name object field definitions

## Problem

The token `line-height-font-size-100` doesn't decompose cleanly into the name object taxonomy. The `font-size` segment is a scale qualifier ("this line-height is for font-size tier 100"), but no taxonomy field exists for this relationship. The decomposer leaves `line` and `height` as unmatched segments (18 tokens affected, 36 unmatched segment instances).

More fundamentally, `font-size-100` and `line-height-font-size-100` are always used as a pair — they represent the same typographic tier at the same platform scale (desktop/mobile). Storing them as separate tokens creates a naming problem where one token must encode its relationship to the other.

## Prior Art

The repo already has composite token types:

| Type            | Structure                                                                   | Example                |
| --------------- | --------------------------------------------------------------------------- | ---------------------- |
| **drop-shadow** | Array of `{ x, y, blur, spread, color }`                                    | `drop-shadow-elevated` |
| **typography**  | Object of `{ fontFamily, fontSize, fontWeight, letterSpacing, lineHeight }` | `component-m-regular`  |

The typography composites already bundle font-size and line-height — but at the component level, referencing separate primitive tokens. This proposal moves the bundling down to the scale level.

## Proposal

Introduce a **typography-scale** composite value type that bundles font-size and line-height for each typographic tier.

### New Value Type Schema: `typography-scale.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": ".../schemas/token-types/typography-scale.json",
  "title": "Typography Scale",
  "description": "A composite token that pairs a font size with its corresponding line height at a single typographic tier.",
  "type": "object",
  "allOf": [{ "$ref": "token.json" }],
  "properties": {
    "value": {
      "type": "object",
      "properties": {
        "fontSize": { "type": "string" },
        "lineHeight": { "type": "string" }
      },
      "required": ["fontSize", "lineHeight"]
    }
  }
}
```

### Token Examples

Before (two separate tokens per tier):

```json
"font-size-100": {
  "$schema": ".../scale-set.json",
  "sets": {
    "desktop": { "value": "14px" },
    "mobile": { "value": "17px" }
  }
},
"line-height-font-size-100": {
  "$schema": ".../scale-set.json",
  "sets": {
    "desktop": { "value": "18px" },
    "mobile": { "value": "22px" }
  }
}
```

After (one composite per tier):

```json
"typography-scale-100": {
  "$schema": ".../typography-scale.json",
  "sets": {
    "desktop": {
      "value": { "fontSize": "14px", "lineHeight": "18px" }
    },
    "mobile": {
      "value": { "fontSize": "17px", "lineHeight": "22px" }
    }
  }
}
```

### Name Object Decomposition

```json
{
  "property": "typography-scale",
  "scaleIndex": 100
}
```

Serializes to `typography-scale-100`. Clean roundtrip with existing taxonomy fields — no new fields required.

### Impact on Typography Composites

Component-level composites would reference the scale composite. Two options:

**Option A — Nested composite reference (simpler):**

```json
"component-m-regular": {
  "value": {
    "typographyScale": "{typography-scale-100}",
    "fontFamily": "{sans-serif-font-family}",
    "fontWeight": "{regular-font-weight}",
    "letterSpacing": "{letter-spacing}"
  }
}
```

**Option B — Flat with sub-property references (backward-compatible):**

```json
"component-m-regular": {
  "value": {
    "fontSize": "{font-size-100}",
    "lineHeight": "{line-height-font-size-100}",
    "fontFamily": "{sans-serif-font-family}",
    "fontWeight": "{regular-font-weight}",
    "letterSpacing": "{letter-spacing}"
  }
}
```

Option B preserves backward compatibility while the old primitives are deprecated. Option A is cleaner long-term.

## Migration

1. Create `typography-scale-{25..1500}` composite tokens (18 new)
2. Deprecate `line-height-font-size-{25..1500}` with `replaced_by` pointing to corresponding composite UUIDs
3. Keep `font-size-{25..1500}` as aliases during transition (they're referenced by 50+ other tokens)
4. Update `component-*` composites to reference new scale tokens
5. `line-height-100` and `line-height-200` (abstract multipliers, values 1.3/1.5) are **unaffected** — they're a different concept

## Impact

* **36 tokens → 18 composites** (plus deprecation aliases)
* **Eliminates 36 unmatched analyzer segments** (`line`, `height` × 18)
* **Zero new taxonomy fields** — uses existing `property` + `scaleIndex`
* **Follows established composite patterns** (drop-shadow, typography)
* **No breaking change** — additive composites with deprecation lifecycle

## Open Questions

1. Should `font-size-{N}` primitives be deprecated once composites are adopted, or kept permanently as convenience aliases?
2. Should the composite include `letterSpacing` too? (Currently all typography composites reference the same `{letter-spacing}` token, so it may not vary by tier.)
3. Does the current alias resolution tooling support sub-property references (`{typography-scale-100.fontSize}`)? If not, Option B is the only viable path during transition.
