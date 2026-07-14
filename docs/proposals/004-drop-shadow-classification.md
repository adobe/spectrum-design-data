# Proposal 004: Drop-Shadow Classification

**Status:** Implemented (spectrum-design-data-dsi.1)\
**Affects:** 70 tokens across `color-aliases.tokens.json`, `color-component.tokens.json`, `layout.tokens.json`, `layout-component.tokens.json`\
**Spec reference:** taxonomy.md — structures registry

## Problem

`drop-shadow` appears across color and layout tokens as both a grouping concept and a compound property. It has sub-properties (`blur`, `x`, `y`, `color`) and modifiers (`emphasized`, `ambient`, `dragged`, `elevated`, `transition`, `key`).

Current tokens have no consistent decomposition because `drop-shadow` doesn't fit cleanly into any existing field:

* Not a `component` — it's a visual effect, not a UI component
* Not a `property` — it groups multiple properties (blur, x, y, color)
* Not an `object` — it's not a styling surface like background/border

## Proposal

Classify `drop-shadow` as a **structure** in the design system registry.

### Rationale

Structures are defined as "individual objects or object categories that have shared styling... structures and visual patterns that can or do occur across many varieties of components." Drop-shadow is a visual pattern that occurs across many components and has shared styling properties.

### Registry change

Add to `packages/design-data/registry/structures.json`:

```json
{
  "id": "drop-shadow",
  "label": "Drop Shadow",
  "description": "Elevated shadow effect applied to components and containers"
}
```

### Sub-properties as `property` values

| Sub-property | Description        |
| ------------ | ------------------ |
| `blur`       | Shadow blur radius |
| `x`          | Horizontal offset  |
| `y`          | Vertical offset    |
| `color`      | Shadow color       |

### Context modifiers

The terms `ambient`, `dragged`, `elevated`, `transition`, `key` describe drop-shadow contexts. These should be treated as **variants**:

| Modifier     | Description                          |
| ------------ | ------------------------------------ |
| `ambient`    | Ambient/diffuse shadow               |
| `dragged`    | Shadow during drag interaction       |
| `elevated`   | Elevated surface shadow              |
| `transition` | Shadow during transition             |
| `key`        | Key light shadow                     |
| `emphasized` | Emphasized shadow (see Proposal 002) |

### Examples

| Current token name                   | Proposed name object                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `drop-shadow-blur-100`               | `{ structure: "drop-shadow", property: "blur", scaleIndex: 100 }`                         |
| `drop-shadow-color-100`              | `{ structure: "drop-shadow", property: "color", scaleIndex: 100 }`                        |
| `drop-shadow-dragged-x`              | `{ structure: "drop-shadow", variant: "dragged", property: "x" }`                         |
| `drop-shadow-emphasized-hover-color` | `{ structure: "drop-shadow", emphasis: "emphasized", property: "color", state: "hover" }` |
| `drop-shadow-elevated-key-color`     | `{ structure: "drop-shadow", variant: "elevated-key", property: "color" }`                |

### Non-drop-shadow surface contexts

`background-elevated-color` and `background-pasteboard-color` share the `elevated`
context term but aren't drop-shadow tokens — they decompose independently as
`{ object: "background", property: "color", variant: "elevated" | "pasteboard" }`,
with `pasteboard` added to the variant registry as a plain surface-context term
(not drop-shadow-specific).

## Impact

* 70 tokens gain a proper structural classification
* Leverages existing `structure` field — no schema change needed
* Drop-shadow sub-properties and context modifiers cleanly decompose
