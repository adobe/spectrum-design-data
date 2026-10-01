---
name: Spectrum Design Data docs site
description: Adobe Spectrum's docs site, built directly on published @spectrum-css packages
colors:
  accent-default: "#3b63fb"
  accent-hover: "#274dea"
  gray-900: "#131313"
  gray-800: "#292929"
  gray-700: "#505050"
  gray-25: "#ffffff"
typography:
  body:
    fontFamily: "adobe-clean, 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Trebuchet MS', 'Lucida Grande', sans-serif"
    fontSize: "16px"
    fontWeight: 400
rounded:
  control-s: "3px"
  control-m: "4px"
  control-l: "5px"
  control-xl: "6px"
  container-s: "7px"
  container-m: "8px"
  container-l: "9px"
  container-xl: "10px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-accent:
    backgroundColor: "{colors.accent-default}"
    textColor: "{colors.gray-25}"
    rounded: "{rounded.control-m}"
  button-accent-hover:
    backgroundColor: "{colors.accent-hover}"
---

# Design System: Spectrum Design Data docs site

## Overview

**Creative North Star: "The System, Documenting Itself"**

This site is not a bespoke brand — it *is* Adobe Spectrum, rendered with the same `@spectrum-css` packages (`actionbutton`, `link`, `page`, `table`, `typography`, `tokens`) that this repository's data produces for every other Spectrum consumer. There is no independent visual language to invent here; the only correct move is to use Spectrum's own tokens and components exactly as published, at their default light/desktop/regular-contrast values (this project's baseline context), matching light/dark and other scales only where the site's audience needs it.

**Key Characteristics:**

* Tokens over hex. Every color, radius, and spacing value below traces back to a real `--spectrum-*` custom property in `@spectrum-css/tokens`, not an invented palette.
* No custom component variants. If Spectrum doesn't ship it, this site doesn't invent it.
* Values shown here are a **light/desktop/regular** snapshot for quick reference; the frontmatter is not the source of truth — the published package and the design-data MCP tools are.

## Colors

Spectrum's core neutral + accent ramp, light theme, as consumed via `@spectrum-css/tokens/dist/css/light-vars.css` and `global-vars.css`.

### Primary

* **Accent Default** (`#3b63fb`, `--spectrum-accent-background-color-default` → `--spectrum-blue-900`): primary buttons, links, active/selected states.
* **Accent Hover** (`#274dea`, `--spectrum-accent-background-color-hover` → `--spectrum-blue-1000`): hover/down state of accent surfaces.

### Neutral

* **Gray 900** (`#131313`, `--spectrum-gray-900`): headings, highest-contrast text, hovered neutral surfaces.
* **Gray 800** (`#292929`, `--spectrum-neutral-content-color-default` → `--spectrum-gray-800`): default body text color.
* **Gray 700** (`#505050`, `--spectrum-gray-700`): secondary/muted text.
* **Gray 25** (`#ffffff`, `--spectrum-background-base-color` / `--spectrum-background-layer-2-color` → `--spectrum-gray-25`): page and elevated-surface background.

### Named Rules

**The No-Invented-Hex Rule.** Never write a literal hex/rgb value into new CSS. Reference the `--spectrum-*` custom property (or, once this site adopts gen2 components, `token('token-name')` — see Components below) so theme/scale changes propagate automatically instead of drifting.

## Typography

**Body Font:** `adobe-clean` (with the Spectrum sans-serif stack fallback, then `Source Sans Pro`, system fonts)

**Character:** Spectrum's standard UI sans — neutral, highly legible, no display/editorial treatment. This site does not introduce a secondary display face.

### Hierarchy

* **Body** (400, `16px` / `--spectrum-font-size-200` via `--spectrum-body-size-m`): default paragraph and UI text size at medium scale.

## Shapes

Spectrum's corner-radius tokens split into two roles — **control** (buttons, inputs, small interactive elements) and **container** (cards, panels, larger surfaces) — each scaling s/m/l/xl. This site should reference the role/size pair that matches the element, never a fixed pixel value:

* Control: s `3px` · m `4px` · l `5px` · xl `6px`
* Container: s `7px` · m `8px` · l `9px` · xl `10px`

## Components

### Buttons

* **Shape:** control corner-radius scaled to the button `size` prop (`s`/`m`/`l`/`xl`) — see [Shapes](#shapes). Never hardcode a radius.
* **Primary (accent):** `background-color: var(--spectrum-accent-background-color-default)`, text uses the static-white/black rule for contrast (see button component guidance below).
* **Hover / Focus:** background shifts to `--spectrum-accent-background-color-hover`; keyboard focus adds Spectrum's standard focus ring — do not customize.
* **Constraint:** per Spectrum's own button guideline, **don't override button colors** — variant/style props (`accent` / `negative` / `primary` / `secondary`, `fill` / `outline`) are the only supported way to change a button's look.

## Do's and Don'ts

### Do:

* **Do** resolve exact token values (and confirm names haven't changed) with the `design-data` MCP tools (`query_tokens`, `resolve_token`, `describe_component`) or the `design-data` skill before writing new UI — this repository is the literal source of truth those tools read from.
* **Do** use gen2 Spectrum Web Components' `token('token-name')` function (via `@adobe/postcss-token` + `@adobe/swc-tokens`) instead of hand-written `var(--swc-*)` once/where this site adopts gen2 components — it fails the build if the token name doesn't exist, which is stronger than any convention documented here.
* **Do** treat this file as a snapshot: re-run `/impeccable document` (scan mode) after a `@spectrum-css`/token package bump so drift gets caught.

### Don't:

* **Don't** invent colors, radii, spacing, or component variants not present in `@spectrum-css`/`@adobe/swc-tokens`. If Spectrum doesn't have it, the answer is "use the closest existing token," not "make one up."
* **Don't** hardcode a hex/px value pulled from memory. Every value in this file was verified against installed package CSS or the design-data MCP at authoring time — new work should do the same, not copy stale numbers forward indefinitely.
* **Don't** silently overwrite this file. If Spectrum's palette or scale changes, refresh via `/impeccable document`, don't hand-edit around drift.
