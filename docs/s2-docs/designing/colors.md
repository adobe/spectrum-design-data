---
title: "Colors"
source_url: https://s2.spectrum.corp.adobe.com/page/colors/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
- design-tokens
- color
related_components:
- grays
- background-layers

---

# Colors

## Resources

### Design

* **Figma**: S2 Web

## External links

This update to the color palette improves how colors appear on the solid white primary background, includes brand colors in the palette, and makes our data visualization colors more color vision deficiency-safe.

The 6.0.0 color system didn’t account for any Adobe product brand colors, despite the colors being so close in hue and saturation. With the Spectrum 2 color update, we’ve shifted some previous colors to be able to include brand colors in the new palette.

The Leonardo tool generated the color palette by using several key colors, including brand colors. Most color scales are not a single hue key color. Leonardo tends to darken and lighten on either end of the gradient by adding black and white to the key colors, so some are included to ensure a high degree of saturation in the palette. In other cases, some key colors shift the actual hue in order to keep colors bright or recognizable, or shift them to help most users avoid confusion with adjacent colors.

Once the color scale is determined, lightness stops are input for each color in order to get aliased colors.

Brand colors are used to generate the Spectrum colors, but brand colors aren’t used one-to-one in the Spectrum palette. Branding is not strictly tied to using Spectrum colors, despite this alignment for Spectrum 2.

In Spectrum 2, colors have shifted blue to be more indigo. This is so we can continue using “blue” aliases but can have an updated, more approachable blue hue that leans more indigo. Moving forward, all products will use blue for the informative and accent semantics. This will help better unify all of Adobe’s products, including Adobe Express.

This change works nicely with the new integration with brand colors. For example, Photoshop’s blue is somewhere in between the current Spectrum blue and cyan. Pushing blue to be more indigo creates space for cyan to lean more blue and accommodate Photoshop’s blue. Similarly, pushing blue more indigo also means pushing indigo to be more purple, which allows for After Effect’s purple to fit nicely in the new indigo range.

The lightest shades of yellow and chartreuse were extra-saturated in Spectrum 6.0.0 colors, despite being the same 1.08:1 contrast with all the other colors. The Spectrum 2 update for colors desaturates these shades to keep them more uniform in style.

Spectrum 2 now uses solid white as the primary background for light UI. There’s also new variants of components, like the in-line alert, that use color-100 as the background. Having this lighter background introduced the need for a lighter shade for components, so the contrast of the lightest value (color-100) was lowered from 1.08:1 to 1.06:1.

We also needed a couple of darker shades to work for our data visualization palettes (available soon).

The color update for Spectrum 2 also aimed to fix some general issues with the previous color palette. Colors have become brighter and more saturated, contrast has been lightened where possible, and some shades like orange, yellow, and chartreuse have been fixed to appear less muddy.

## Overview

Once the color scale is determined, lightness stops are input for each color in order to get aliased colors.

We also needed a couple of darker shades to work for our data visualization palettes (available soon).

## Improvements to the current color system

Once the color scale is determined, lightness stops are input for each color in order to get aliased colors.

We also needed a couple of darker shades to work for our data visualization palettes (available soon).

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Grays](/page/grays/)
* [Background layers](/page/background-layers/)
