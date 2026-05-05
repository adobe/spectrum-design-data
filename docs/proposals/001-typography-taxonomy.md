# Proposal 001: Typography Taxonomy

**Status:** Draft\
**Affects:** 221 active tokens in `typography.json`\
**Spec reference:** taxonomy.md line 76 — "Additional categories do and will exist for other token types (e.g. color, typography)."

## Problem

Typography tokens encode three concepts that have no field in the current 13-field semantic/layout taxonomy:

| Concept              | Term examples                            | Token count | Example token                             |
| -------------------- | ---------------------------------------- | ----------- | ----------------------------------------- |
| Writing system       | `cjk`                                    | 99          | `body-cjk-font-weight`                    |
| Font family          | `sans-serif`, `serif`                    | 135         | `title-sans-serif-emphasized-font-weight` |
| Typographic emphasis | `emphasized`, `strong`, `heavy`, `light` | 186         | `heading-cjk-heavy-emphasized-font-style` |

These terms are currently classified as "known gap" segments by the token-mapping-analyzer. They decompose but cannot roundtrip because there is no field to serialize them from.

## Proposal

Add three typography-scoped name object fields to the taxonomy spec.

### `script`

Writing system variant. Determines which character set and rendering rules apply.

| Value | Description                      |
| ----- | -------------------------------- |
| `cjk` | Chinese, Japanese, Korean script |

Registry: `packages/design-system-registry/registry/scripts.json` (new file)

### `family`

Font family category. Determines the typeface classification.

| Value        | Description         |
| ------------ | ------------------- |
| `sans-serif` | Sans-serif typeface |
| `serif`      | Serif typeface      |

Registry: `packages/design-system-registry/registry/families.json` (new file)

### `emphasis`

Typographic weight or emphasis level. Shared with component property axes (see Proposal 002), but with extended vocabulary for typography.

| Value            | Context    | Description                                               |
| ---------------- | ---------- | --------------------------------------------------------- |
| `emphasized`     | Both       | Standard emphasis                                         |
| `strong`         | Typography | Strong emphasis (heavier than emphasized)                 |
| `heavy`          | Typography | Heaviest emphasis                                         |
| `light`          | Typography | Lighter than default                                      |
| `non-emphasized` | Components | Explicitly not emphasized (maps to `isEmphasized: false`) |

Registry: `packages/design-system-registry/registry/emphasis.json` (new file)

### Serialization order

Typography tokens use the standard semantic/layout order, with typography fields inserted after `component`:

```
{variant}-{component}-{script}-{family}-{emphasis}-{structure}-{substructure}-{anatomy}-{object}-{property}-{orientation}-{position}-{size}-{density}-{shape}-{state}
```

### Examples

| Current token name                        | Proposed name object                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `body-cjk-emphasized-font-weight`         | `{ component: "body", script: "cjk", emphasis: "emphasized", property: "font-weight" }`         |
| `title-sans-serif-emphasized-font-style`  | `{ component: "title", family: "sans-serif", emphasis: "emphasized", property: "font-style" }`  |
| `heading-cjk-heavy-emphasized-font-style` | `{ component: "heading", script: "cjk", emphasis: "heavy-emphasized", property: "font-style" }` |

Note: `heavy-emphasized` is a compound emphasis value (heavy + emphasized). This follows the same pattern as compound states in Proposal 005.

## Impact

* 221 active tokens move from MEDIUM to HIGH confidence
* Three new registry files created
* Taxonomy spec updated with typography scope section
