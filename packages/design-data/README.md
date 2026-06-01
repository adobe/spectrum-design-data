# [**@adobe/spectrum-design-data**](https://github.com/adobe/spectrum-design-data)

Spectrum design tokens in **cascade format** — the canonical source of truth
for [`@adobe/spectrum-tokens`](../tokens).

## What is the cascade format?

Each `.tokens.json` file in `tokens/` is a JSON array of spec-compliant token
objects. Each token carries a structured `name` object with taxonomy fields
(`component`, `property`, `state`, `colorFamily`, `scaleIndex`, etc.) instead
of a flat kebab-case string. The format is defined in
[`packages/design-data-spec`](../design-data-spec).

```jsonc
// tokens/color-palette.tokens.json (excerpt)
[
  {
    "name": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 },
    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
    "value": "#E9F4FF",
    "uuid": "…"
  }
]
```

## Relationship to `@adobe/spectrum-tokens`

`packages/tokens/src/` (the legacy flat-object format consumed by Style
Dictionary and downstream tooling) is **generated** from this package. Do not
edit `packages/tokens/src/` directly — changes will be overwritten.

To regenerate the legacy package after editing tokens here:

```bash
moon run design-data:legacy-output
```

## Token corpus

8 files, 4 166 cascade tokens (from 2 460 legacy entries):

| File                          | Description                         |
| ----------------------------- | ----------------------------------- |
| `color-palette.json`          | Global color scale (blues, reds, …) |
| `color-component.json`        | Component-scoped color tokens       |
| `color-aliases.json`          | Semantic color aliases              |
| `semantic-color-palette.json` | Semantic/contextual palette         |
| `typography.json`             | Font sizes, weights, families       |
| `layout.json`                 | Global spacing and sizing           |
| `layout-component.json`       | Component-scoped layout tokens      |
| `icons.json`                  | Icon sizing tokens                  |

## Name-object quality

95% of tokens carry structured name objects:

* **23%** enriched from sidecar name metadata (`colorFamily`, `scaleIndex`, `variant`, …)
* **71%** decomposed from the legacy key (`component` + `property` + `state`)
* **6%** thin (full legacy key stored in `property`) — tracked as SPEC-017 tech debt

## moon tasks

| Task                     | Command                                       | Purpose                                               |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------- |
| `validate`               | `moon run design-data:validate`               | Validate cascade files against spec rules             |
| `legacy-output`          | `moon run design-data:legacy-output`          | Regenerate `packages/tokens/src/`                     |
| `roundtrip-verify`       | `moon run design-data:roundtrip-verify`       | CI guard: fail if cascade and legacy diverge          |
| `regenerate-from-legacy` | `moon run design-data:regenerate-from-legacy` | Re-sync cascade from legacy (one-time / escape hatch) |

## Consuming the cascade format

```js
import colorPalette from "@adobe/spectrum-design-data/tokens/color-palette";
// colorPalette is an array of cascade token objects
```
