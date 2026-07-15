# Proposal 001: Typography Taxonomy

**Status:** Partially adopted (2026-07-08) — see [Decision](#decision-2026-07-08) below\
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

## Decision (2026-07-08)

Adopted with one change: **`script` is dropped in favor of the already-shipped `family` field**
(`packages/design-data/fields/family.json`), whose registry (`typography-families.json`) already
enumerates `cjk` alongside `sans-serif`/`serif`/`code`. A separate `script` field would duplicate
that axis for no gain — `cjk` is a family value here, not an independent dimension.

`emphasis` is adopted as proposed: new field `packages/design-data/fields/emphasis.json` +
registry `packages/design-data/registry/typography-emphasis.json`, scoped to typography, holding
the atomic modifiers (`emphasized`, `strong`, `heavy`, `light`, `non-emphasized`). Compound values
(e.g. `heavy-strong-emphasized`) are not separately enumerated in the registry — they're built by
hyphen-joining atomic modifiers, per the compound-state pattern.

This keeps `family` and `emphasis` distinct from the CSS-axis `weight`/`style` fields, which model
actual `font-weight`/`font-style` values (e.g. `weight: "bold"`) rather than a relative emphasis
modifier layered on a family/component.

## Amendment (2026-07-14) — `script` reinstated, `family`/`cjk` fold reversed

The 2026-07-08 call that `cjk` is "a family value, not an independent dimension" is reversed. Two
things the original decision overlooked:

1. **`family` and the writing-system distinction are orthogonal, not the same axis.** Adobe ships
   Source Han **Sans** *and* Source Han **Serif** — "CJK serif" is a real, expressible combination
   in Adobe's own font foundry. Folding `cjk` into `family` makes `cjk` and `serif` mutually
   exclusive by construction, which cannot represent that combination. That is the textbook
   definition of an independent dimension, not a duplicate one.
2. **`family` collides with `property: "font-family"` at the token level.** A name object like
   `{ property: "font-family", family: "cjk" }` uses "family" at two different altitudes in the
   same object — the CSS property being set, and the variant axis — which reads as ambiguous.

Adobe's own S2 design docs (`docs/s2-docs/designing/fonts.md`) already organize fonts by *script*
("ideographic scripts", "Thai script", "Arabic script", "Devanagari script") — `script` is
established Adobe terminology, not an invented term.

Reinstating the proposal as originally written: `script` (value `cjk`, registry
`packages/design-data/registry/scripts.json`) is a first-class field, serialized immediately
before `family` (`component-script-family-emphasis-…-property-…`). `family` is narrowed back to
true typeface classifications (`sans-serif`, `serif`, `code`); `cjk` is removed from
`typography-families.json`. All existing `family: "cjk"` tokens are migrated to `script: "cjk"`.

Per-region future granularity (e.g. Adobe-Japan1 / Adobe-Korea1 character-collection precision) is
a *value* split on `script` (`script: "japanese" | "korean" | …`) if ever needed, not a new field.
