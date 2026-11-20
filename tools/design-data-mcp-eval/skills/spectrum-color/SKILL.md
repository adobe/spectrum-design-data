---
name: spectrum-color
description: "Choose Spectrum color tokens by meaning: color roles, contrast steps, interaction states and modes. Use when picking a color for any interface element."
metadata:
  generator: spectrum-studio
  generator-version: "1"
  fingerprint: eaac7ac62b285321
---

# Spectrum color

## Purpose

Use this skill when choosing a color for any interface element. It explains what each color role means, how its steps compare, and how states and modes change the result.

## How color steps work

Each color role uses one color scale. Its tokens are numbered steps on that scale.

A higher step means more contrast against the background. Use lower steps for quiet fills and higher steps for text, icons and borders that must stand out.

Step numbers are names, not measurements. Don't calculate with them or create steps that aren't listed.

## Contrast and use

Each step has a minimum contrast ratio against the primary background, and that ratio decides what the step can be used for. The ratios in Contrast by step are the lowest in any color scheme or contrast setting, so the guidance holds in every mode. Exported colors always meet these minimums.

* **4.5:1 or more**: safe for text, including body text, and everything else. WCAG 2.2 success criterion 1.4.3 Contrast (Minimum), level AA (<https://www.w3.org/TR/WCAG22/#contrast-minimum>).
* **3:1 to under 4.5:1**: for interface elements and meaningful graphics, such as icons, input and button borders, focus indicators and chart marks. WCAG 2.2 success criterion 1.4.11 Non-text Contrast, level AA (<https://www.w3.org/TR/WCAG22/#non-text-contrast>). Also enough for large text (at least 18 point, or 14 point bold), but not body text.
* **Under 3:1**: only for decoration, or uses WCAG exempts: disabled elements, decorative graphics, logos, and fills where a border or text carries the meaning.
* This guidance assumes the element sits on the primary background. On another surface or color the ratio changes, so check it before relying on it.

## Contrast by step

Step 900 and higher is safe for text on every scale. Step 700 and higher is safe for interface elements and graphics on every scale. Exceptions are listed by scale token name. To check a role's step, find the role's scale in Color roles, then look up the step here, but still use the role token in designs.

* **25** on gray scale: for decoration or exempt uses only (lowest 1:1).
* **50** on gray scale: for decoration or exempt uses only (lowest 1:1).
* **75** on gray scale: for decoration or exempt uses only (lowest 1.1:1).
* **100** on every scale: for decoration or exempt uses only (lowest 1:1).
* **200** on every scale: for decoration or exempt uses only (lowest 1.1:1).
* **300** on every scale: for decoration or exempt uses only (lowest 1.3:1).
* **400** on every scale: for decoration or exempt uses only (lowest 1.6:1).
* **500** on every scale except gray: for decoration or exempt uses only (lowest 2:1). `gray-500`: for interface elements and graphics, not body text (lowest 3.2:1).
* **600** on every scale except gray: for decoration or exempt uses only (lowest 2.6:1). `gray-600`: safe for text (lowest 4.8:1).
* **700** on every scale except gray: for interface elements and graphics, not body text (lowest 3.2:1). `gray-700`: safe for text (lowest 8:1).
* **800** on every scale except gray: for interface elements and graphics, not body text (lowest 3.9:1). `gray-800`: safe for text (lowest 13.2:1).
* **900** on every scale: safe for text (lowest 4.7:1).
* **1000** on every scale: safe for text (lowest 6.2:1).
* **1100** on every scale with this step: safe for text (lowest 7.9:1).
* **1200** on every scale with this step: safe for text (lowest 10:1).
* **1300** on every scale with this step: safe for text (lowest 12.3:1).
* **1400** on every scale with this step: safe for text (lowest 14.7:1).
* **1500** on every scale with this step: safe for text (lowest 17:1).
* **1600** on every scale with this step: safe for text (lowest 19.4:1).

## Choosing a color

1. Decide what the element means, then pick the matching role from Color roles. Don't pick a role for how it looks.
2. Pick a step by how much the element should stand out from its background, then confirm it in Contrast by step: text needs a step that is safe for text on that scale, and interface elements and meaningful graphics need at least a step for interface elements.
3. If the element has a hover or focus state, use the state token described in Interaction states instead of choosing a different step.
4. Use the same token in every mode. Modes and user settings change the resolved color.
5. Look up the token's value with the design-data service only when you need the value itself.

## Color roles

Colors that communicate specific meaning or intent.

* **Positive**: For communicating positive information and feedback to the user. Uses the green scale, steps 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600. Token names follow `positive-{step}`.
* **Negative**: For communicating bad or negative information and feedback to the user. Uses the red scale, steps 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600. Token names follow `negative-{step}`.
* **Informative**: For signifying a piece of content as being helpful or informative to the user. Uses the blue scale, steps 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600. Token names follow `informative-{step}`.
* **Notice**: For communicating a potentially bad or negative feedback to the user. Uses the orange scale, steps 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600. Token names follow `notice-{step}`.
* **Neutral**: When other roles are used, neutral signifies no additional meaning communicated through color. Uses the gray scale, steps 25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000. Token names follow `neutral-{step}`.
* **Accent**: For signifying or highlighting specific elements of UI for higher user attention. Uses the blue scale, steps 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600. Token names follow `accent-{step}`.

## Interaction states

These rules create state tokens from the resting token. Use the generated state token; don't shift steps yourself.

* **Icon interaction colors**: Offsets icon colors for hover and focus, reversing direction in Dark mode.
  * Applies when (Element is Workflow icon or Element is Ui icon) and (Interaction is Hover or Interaction is Focus).
  * Creates state tokens for: Hover, Focus.
  * When Color scheme is Dark, the state token moves 1 step lower than the resting token, on the same scale.
  * Otherwise, the state token moves 1 step higher than the resting token, on the same scale.
* **Interaction state colors**: Offsets emphasized backgrounds for hover and focus, reversing direction in Dark mode.
  * Applies when Attribute is Background and Visibility is Emphasized and (Interaction is Hover or Interaction is Focus).
  * Creates state tokens for: Hover, Focus.
  * When Color scheme is Dark, the state token moves 1 step lower than the resting token, on the same scale.
  * Otherwise, the state token moves 1 step higher than the resting token, on the same scale.

## Modes and user settings

Modes change resolved colors without changing token names. Design once with tokens and let each mode resolve them.

* **Color scheme**: Changes to the overall appearance of color such as hue, saturation and lightness. Options: Light (default), Dark, Wireframe.
* **Contrast**: Changes to the overall contrast of the colors, typically for accessibility and personalization needs. Options: Regular (default), High.

## Don't

* Don't choose a color by its look. Choose the role that matches the meaning.
* Don't invent roles, steps or token names that aren't listed here or returned by the design-data service.
* Don't use a step for text, icons or borders unless Contrast by step allows it on that scale.
* Don't make hover or focus colors by moving steps. Use the state tokens.
* Don't switch tokens for each mode. Let modes resolve them.
* Don't copy color values into designs. Always reference the token.

## Looking up values

This skill has no color values on purpose. When you need one, ask the design-data service for the token by name, along with the modes you're designing for.
