<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 020: A Spectrum styling layer for Vercel UI SDK

**Status:** Spike done for Switch (bead `spectrum-design-data-9fe.11`, branch `spike/ui-sdk-switch`, no PR). Recommendation: continue with Switch hardening, do not start Picker until it has anatomy and a recipe.
**Affects:** a possible new exporter (`sdk/plugins/ui-sdk` or a CLI `export` target), `registry/` (state vocabulary), anatomy `aliases`.

## Summary

[UI SDK](https://ui-sdk.dev) (vercel-labs/ui, Apache-2.0, beta) is a headless behavior library: components are `definePrimitive` objects with named slots, rendered as `data-slot="<name>-<slot>"` plus state attributes (`data-checked`, `data-disabled`, `data-open`, `data-invalid`, `data-highlighted`). It ships no visual design. Our anatomy, options, states, recipes, relationships and tokens are that design, as data. An exporter can turn a visual recipe into CSS keyed on UI SDK's attributes, so an agent gets Spectrum-looking UI SDK components in React, Vue, Svelte, Solid and Web Components.

## Mapping

| UI SDK                             | Spectrum Design Data                              | CSS                                              |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `data-slot="switch"`               | anatomy `track`                                   | the switch button itself                         |
| `data-slot="switch-thumb"`         | anatomy `handle`                                  | `translate` slides it                            |
| native `<label>`                   | anatomy `label` (and `container`)                 | `label:has(> [data-slot="switch"])`              |
| `:focus-visible` on the switch     | anatomy `focus-indicator`, state `keyboard-focus` | `outline`                                        |
| `data-checked` / `data-unchecked`  | option `isSelected`                               | attribute selector                               |
| `data-disabled`                    | option `isDisabled`                               | attribute selector                               |
| `data-readonly`                    | option `isReadOnly` (already `notVisual`)         | none                                             |
| none (UI SDK leaves it to the app) | options `size`, `isEmphasized`                    | our own `data-size`, `data-variant="emphasized"` |
| `:hover`, `:active`                | states `hover`, `down`                            | pseudo-class                                     |

## Spike result (Switch)

`tools/ui-sdk-spike/generate.mjs` renders the Switch recipe through `design-data render --batch --format scene` (so it reuses the real resolver: relationships, token chains, modes, precedence) and writes `switch.css`. It covers sizes s to xl, selected and not, default, emphasized and disabled, light and dark, and hover, down and keyboard-focus.

Checked in a browser against `@ui-sdk/react@0.1.0-beta.16`:

- **48 of 48** base combinations (4 sizes x on/off x default/emphasized/disabled x light/dark, 24 per scheme) match the scene graph exactly: track size, track fill, track border colour, thumb size, thumb offset and thumb fill.
- The label (gap, font size, weight, colour, minimum height) applies.
- Hover on one switch matches the hover scene. Active and focus-visible rules are emitted (80 each) but not driven in a browser.

Output is 93 KB raw and 3.1 KB gzipped, because values are literal per combination.

## Gaps this found

1. **No state vocabulary.** Nothing says which boolean options are states (`isSelected`, `isDisabled`, `isError`, `isOpen`) and which are design options (`size`, `isEmphasized`, `isQuiet`). The spike hard-codes it. A registry mapping from option to UI SDK attribute, or a `stateLike` flag, is needed.
2. **No part aliases for UI SDK.** The anatomy `aliases` field already exists for cross-implementation names; the exporter needs `track` to `switch` and `handle` to `switch-thumb` from data, not code.
3. **Press and RTL are not emitted.** The recipe's `pressDifference`, `pressWidthRatio` and `pressMinPerspective`, and the RTL flip of the thumb (`dir="rtl"`), are not in the CSS.
4. **Literal values.** Per-combination literals are large. Emitting token values as CSS variables per mode and per size, and referencing them in the rules, would cut it by roughly an order of magnitude and make the theme overridable. This also lines up with the shadcn theme exporter (PR #1512).
5. **Label order.** The recipe puts the control before the label; UI SDK examples put the text first. The spike's demo follows the recipe.
6. **Picker.** `anatomy: null` and no visual recipe, so its 163 relationship records cannot be tied to parts. UI SDK's Select spreads over `select-trigger`, `select-value`, `select-content`, `select-item`, `select-item-indicator` and more. Our Picker states `focus-+-hover` and `focus-+-not-hover` need cleaning up (state precedence epic qkj5.158).

## Recommendation

Go on, in this order:

1. Harden Switch: variables instead of literals, RTL, press, and a pixel comparison against our PNG render.
2. Add the state vocabulary and part aliases to the data (gaps 1 and 2), since the Figma and React Spectrum paths need the same thing.
3. Do a second component with a recipe already (checkbox or radio button) to prove the mapping generalizes before choosing a home (new plugin or `design-data export` target).
4. Picker only after its anatomy review (epic 5m92) produces a recipe.

Risk: UI SDK is four weeks old and in beta, so slot and attribute names may change; a pinned alias table limits the damage.
