<!-- Copyright 2026 Adobe. All rights reserved. -->

# Comparing renders with platform components

The comparison pipeline checks design-data visual-recipe renders against real platform components (React Spectrum S2 and SWC through Storybook, then the iOS Catalog app). **Numbers decide the verdict.** Pixel diffs and AI review only help a person look.

The SDK covers the data side and nothing else. It renders states and compares numbers. It captures nothing and handles no images, so adapters that read a platform (Playwright for Storybook, the iOS capture) live outside the SDK and only have to write the JSON below.

```text
states.json ──design-data render --batch──▶ <dir>/<id>.svg + <id>.scene.json + index.json
                                                         │
adapter ──▶ measured.json ──design-data render-compare──▶ report.json / report.md ──▶ gap beads
```

## 1. Batch render

```sh
design-data render --batch states.json --out renders/
```

`states.json` is an array of states, or `{ "states": [...] }`. Every field but `component` is optional.

| Field                  | Default             | Meaning                                                                                                                   |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `component`            | required            | Component name (`button`, `button-ios`)                                                                                   |
| `size`                 | `m`                 | Size key of the recipe's `sizeScale`                                                                                      |
| `states`               | `[]`                | Interaction states (`hover`, `down`, `keyboard-focus`)                                                                    |
| `options`              | `{}`                | Component options (`{ "style": "accent" }`)                                                                               |
| `colorScheme`, `scale` | `light`, `desktop`  | Mode context                                                                                                              |
| `label`                | `Label`             | Text for text parts                                                                                                       |
| `platform`             | global `--platform` | A `[platforms.<id>]` entry; the batch loads one graph per platform                                                        |
| `id`                   | derived             | File stem and the key the measured file uses; derived from the fields (for example `button-m-style-accent-light-desktop`) |

The command writes `<id>.svg` and `<id>.scene.json` per state, and `index.json` listing them with render diagnostics. A state that fails to render is recorded in `index.json` with an `error` and the command exits 1 after the rest finish. Duplicate ids are an error.

## 2. Measured values

An adapter writes one JSON document, `design-data-measured/1`:

```json
{
  "format": "design-data-measured/1",
  "source": {
    "platform": "react-spectrum-s2",
    "adapter": "storybook",
    "commit": "36f3adde2",
    "capturedAt": "2026-11-05"
  },
  "tolerances": { "size": 1, "color": 3 },
  "states": [
    {
      "id": "button-m-style-accent-light-desktop",
      "parts": {
        "container": {
          "width": 94.7,
          "height": 32,
          "paddingLeft": 14,
          "cornerRadius": 16,
          "fill": "rgb(59, 99, 251)"
        },
        "label": {
          "width": 41.4,
          "fontSize": 14,
          "fontWeight": 700,
          "color": "rgb(255, 255, 255)"
        }
      }
    }
  ]
}
```

* `source` is free-form provenance. The report copies it. `platform` names the platform in gap titles. Record the library commit or app version.
* `states[].id` is the id from the batch render. `parts` keys are the **recipe part names** in the scene (`container`, `label`, `icon`). The adapter maps a DOM element or view to a part name; a part the scene lacks is reported as skipped, not as a difference.
* Every property is optional. Measure what you can.

| Property                                                     | Value                           | Compared with                             |
| ------------------------------------------------------------ | ------------------------------- | ----------------------------------------- |
| `width`, `height`                                            | number                          | the part's box                            |
| `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` | number                          | the token-bound padding measurement (LTR) |
| `cornerRadius`                                               | number                          | the part's corner radius                  |
| `fill`                                                       | colour                          | a box's fill                              |
| `color`                                                      | colour                          | a text part's colour                      |
| `fontSize`                                                   | number                          | the text part's font size                 |
| `fontWeight`                                                 | number (`700`) or name (`bold`) | the text part's weight                    |

Units match the scene: CSS pixels on the web, points on iOS. Never device pixels. Take the unscaled layout box (`getBoundingClientRect` at scale 1, or a view's frame), not a transformed one. Colours are `rgb()`, `rgba()` (comma or space syntax), `#rgb`, `#rrggbb`, `#rrggbbaa`, `transparent` or `none`. Padding is only compared when the scene has a token-bound padding for that edge; otherwise the value is reported as skipped. A colour that can't be parsed is skipped, with the reason.

## 3. Compare

```sh
design-data render-compare --scenes renders/ --measured measured.json \
  --format markdown -o report.md [--tolerance size=0.5] [--fail-on-diff]
design-data render-compare --scenes renders/ --measured measured.json -o report.json
```

Defaults: size ±1, font size ±0.5, font weight ±0, colour ±3. Colour distance is the largest channel difference on a 0-255 scale, with alpha scaled to 0-255. Tolerances come from the defaults, then the measured file's `tolerances`, then `--tolerance` flags (`size`, `fontSize`, `fontWeight`, `color`).

The report (`design-data-comparison/1`) holds `summary`, the tolerances used, and per state the `differences`, `skipped` values and the number `compared`. It also lists measured ids with no scene and scenes with no measurement. A difference has `part`, `property`, `expected` (design data), `measured`, `delta`, `tolerance`, the `token` the scene value came from, and a `gap` suggestion.

**Label widths.** The renderer estimates text width from Source Sans 3 metrics (R2 in `component-visuals.md`), so a label-width difference may be the estimate, not the data. A text part's `width` difference is marked `possibleCause: "r2-text-width-estimate"`, and so is a `width` difference on the other parts of that state, since the container grows with the label. The Markdown says so. Confirm with the same font on both sides before filing a gap.

## 4. Gap beads

Each difference carries `gap.title` and `gap.labels` following the gap-tracking convention under epic `qkj5`: `comp:<component>`, `layer:` (`token` when the scene value is token-bound, `recipe` when not, `renderer` for the R2 case), `kind:source-conflict`, `disp:` (`needs-design`, or `fix-renderer` for R2) and `needs-decision`. These are suggestions. Triage decides the real layer, kind and disposition, and one bead per finding goes under `qkj5`, for example:

```sh
bd create --parent spectrum-design-data-qkj5 --title "<gap.title>" --labels "<gap.labels>" --type task
```
