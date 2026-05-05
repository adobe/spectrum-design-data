# Proposal 002: Component Property Axes — `style`, `staticColor`, `emphasis`

**Status:** Draft\
**Affects:** 234 active tokens across `color-aliases.json`, `color-component.json`, `icons.json`, `semantic-color-palette.json`\
**Spec reference:** taxonomy.md — name object field definitions

## Problem

Component schemas define four independent variant-like axes, but the token taxonomy has only a single `variant` field. Tokens encoding multiple axes cannot be decomposed:

| Schema property       | Type                   | Components                            | Token pattern                      |
| --------------------- | ---------------------- | ------------------------------------- | ---------------------------------- |
| `variant` (enum)      | Primary color/semantic | 16 components                         | Already handled                    |
| `style` (enum)        | Visual treatment       | badge, button, in-line-alert, etc.    | `subtle`, `subdued`, `primary`     |
| `staticColor` (enum)  | Theme-override color   | button, action-button, link, etc.     | `static-black-*`, `static-white-*` |
| `isEmphasized` (bool) | Emphasis toggle        | action-button, checkbox, switch, etc. | `emphasized`, `non-emphasized`     |

These are **non-mutually-exclusive**. A Badge can be `variant: "blue"` AND `style: "subtle"` simultaneously. A Button can be `variant: "primary"` AND `staticColor: "white"` at the same time.

### Why not array variant?

The component schemas model these as **separate named properties**, not as multiple values on one axis. Flattening them into `variant: ["blue", "primary"]` loses the distinction between which axis each value belongs to and creates ambiguity (is `"primary"` a color variant or a style?).

## Proposal

Add three name object fields that directly mirror component schema properties.

### `style`

Visual treatment or presentation style of a component. Maps to component schema `style` enum.

| Value       | Description                                              | Used by              |
| ----------- | -------------------------------------------------------- | -------------------- |
| `subtle`    | Reduced visual emphasis                                  | badge, in-line-alert |
| `subdued`   | Quieter than subtle                                      | neutral tokens       |
| `bold`      | Strong visual emphasis                                   | badge, in-line-alert |
| `outline`   | Outline-only treatment                                   | badge, button        |
| `primary`   | Primary emphasis (when used as style, not color variant) | icon tokens          |
| `secondary` | Secondary emphasis                                       | icon tokens          |

Registry: Add to `packages/design-system-registry/registry/styles.json` (new file)

### `staticColor`

Theme-override color modifier. Maps to component schema `staticColor` enum. Indicates the token does not change with theme — it always uses the specified color context.

| Value   | Description                |
| ------- | -------------------------- |
| `black` | Black static color context |
| `white` | White static color context |

Registry: Add to `packages/design-system-registry/registry/static-colors.json` (new file)

### `emphasis`

Emphasis level. Maps to component schema `isEmphasized` boolean. Shared with typography taxonomy (see Proposal 001) which extends the vocabulary.

| Value            | Description               |
| ---------------- | ------------------------- |
| `emphasized`     | Emphasized presentation   |
| `non-emphasized` | Explicitly not emphasized |

Registry: Shared with Proposal 001's `packages/design-system-registry/registry/emphasis.json`

### Serialization order

These three fields are inserted after `shape`, before `state`:

```
{variant}-{component}-{structure}-{substructure}-{anatomy}-{object}-{property}-{orientation}-{position}-{size}-{density}-{shape}-{style}-{emphasis}-{staticColor}-{state}
```

### Examples

| Current token name                                   | Proposed name object                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `accent-subtle-background-color-default`             | `{ variant: "accent", style: "subtle", object: "background", property: "color", state: "default" }`                                |
| `icon-color-blue-primary-default`                    | `{ component: "icon", variant: "blue", style: "primary", property: "color", state: "default" }`                                    |
| `neutral-subdued-background-color-hover`             | `{ variant: "neutral", style: "subdued", object: "background", property: "color", state: "hover" }`                                |
| `static-black-text-color`                            | `{ variant: "static", staticColor: "black", anatomy: "text", property: "color" }`                                                  |
| `disabled-static-white-background-color`             | `{ variant: "static", staticColor: "white", object: "background", property: "color", state: "disabled" }`                          |
| `stack-item-selected-background-color-emphasized`    | `{ component: "stack", substructure: "item", state: "selected", object: "background", property: "color", emphasis: "emphasized" }` |
| `table-selected-row-background-color-non-emphasized` | `{ component: "table", state: "selected", anatomy: "row", object: "background", property: "color", emphasis: "non-emphasized" }`   |

### Impact by field

| Field            | Tokens resolved | Primary source files                                        |
| ---------------- | --------------- | ----------------------------------------------------------- |
| `style`          | 88              | semantic-color-palette.json, color-aliases.json, icons.json |
| `staticColor`    | 12              | color-aliases.json                                          |
| `emphasis`       | 36              | color-component.json, color-aliases.json                    |
| **Total unique** | **\~234**       |                                                             |

### Interaction with existing `variant` field

With these new fields, the existing `variant` field should be narrowed to its original purpose: the primary color or semantic variant of a component. Values like `subtle`, `subdued`, `static` should be **removed from `variants.json`** (added in Phase 1) and instead live in their proper registries (`styles.json`, `static-colors.json`).

The `variant` registry categories (emphasis, semantic, color, context) map cleanly:

* **color** → stays in `variant` (`blue`, `red`, `accent`, etc.)
* **semantic** → stays in `variant` (`negative`, `positive`, `informative`, etc.)
* **emphasis** → moves to `style` (`subtle`, `subdued`, `primary`, `secondary`)
* **context** → `static` stays in `variant`, `black`/`white` move to `staticColor`

## Impact

* 234 active tokens move from MEDIUM to HIGH confidence
* Two new registry files, one shared with Proposal 001
* Serialization order updated in taxonomy spec
* Aligns token naming with component schema architecture
