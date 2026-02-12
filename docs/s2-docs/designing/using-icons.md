---
title: "Using icons"
source_url: https://s2.spectrum.corp.adobe.com/page/using-icons/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
related_components:
- icon-fundamentals
- illustrations

---

# Using icons

## Resources

### Design

* **Figma**: S2 Web

## External links

Workflow icons are graphical metaphors or symbols that users interact with to navigate and manipulate objects. They maintain a consistent size and style within each platform to ensure visual harmony and usability. While consistency is key, it is now fairly common to combine different icon scales to support hierarchy and context.

UI icons are atomic pieces — like arrows, crosses, or chevrons — that are part of a component. They aren’t metaphorical per se, but they’re an indication of how users interact with a component (for example, what happens when you click on a disclosure chevron or drag handle in a panel). Unlike workflow icons, UI icons come in assorted sizes.

Status badges are indicators that communicate a variety of statuses or states, such as presence, validity, completeness, and more. Premium badges indicate that a feature is only available to paying customers.

"Spectrum 2 workflow icons come in two sizes per platform, but with one stroke weight: 1.5 px."

The primary size for Desktop/Web is a canvas of 20 px with the icon being \~18 px. There’s a secondary size for UI areas — like a layers panel, lists, or cards — which require smaller versions and come in a 16 px canvas with the icon being \~14 px.

The equivalent for Mobile is the primary size of the canvas at 24 px with the icon being \~22 px. The secondary size canvas is 20 px with the icon being \~18px.

"In Spectrum components, workflow icons scale up or down slightly when they’re used. For example: a 20 px icon in a medium-sized component will be slightly larger in a large-sized component, and smaller in a small-sized component. UI icons come in their respective size range, since Spectrum components treat these differently."

“S2” is the prefix for Spectrum 2 icons.

"Here’s a breakdown of each part of the icon naming convention:"

An example of the naming convention for Spectrum 2 (S2) icons.

Keeping one stroke weight consistent within a size range helps to balance out and contrast the visual weight. For Web and Desktop platforms, icons are designed at a 20 px canvas as default with a 1.5 px stroke, resulting in a 1.64 px stroke when sized up to 24 px for mobile. This helps keep a unified look, and it builds icons efficiently since it’s not necessary to redraw them for each platform.

All icons with angles get a 1.5 px rounding treatment to achieve a rounder appearance. Inner corners are slightly rounded, and all stroke ends have rounded end caps. By default, the corner radius can be decreased in case a metaphor requires pointy edges.

Icon designs include a safe area to ensure there’s flexibility for finding the best positioning and balance in a layout. The main shape should be centered, and modifier placement is primarily at the bottom right corner of the canvas. Notification dots appear at the top right corner (these are mostly added programmatically).

The intersections of badge/modifier placement.

The vertical spacing between icons and text is adjusted to create balance.

"For example: in a medium-sized component, shifting the text box 1 px up and the icon box 1 px down inside a button better balances out the appearance and refines the relationship with text in Adobe Clean Medium."

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

The new SVG native format for icons allows for automatic tinting to match different states (hover, selected, etc.) and can programmatically switch depending on UI brightness or color theme. It’s not about tinting the whole SVG in one color, but tinting single elements inside the SVG. To do this, the new SVGs use named CSS variables to set color values for every element. There will be Spectrum tokens for this, so automatic tinting will work out-of-the-box in any product using Spectrum CSS.

For other apps, it will be easier to add the needed color information to their own CSS. Transparencies will be used to achieve tints of the primary icon color, making it easy to use at least the gray tone when it’s not possible to work with CSS variables.

Example of SVG code. The highlighted sections show that two dynamic colors will be changed programmatically, and that there's a white exclamation mark which should always be displayed in white.

If you diverge from Spectrum colors, you’ll need to make sure that your design has enough contrast between the icon and the background. Use subtle fills in light and dark themes to maintain legibility without overpowering the UI. Make sure that the icons remain legible and distinguishable across varied backgrounds and themes.

The library currently only includes a subset of icons, and are for mock-up purposes only. If you need to create a mock-up with an icon that isn’t available yet, just use a placeholder icon. Don’t use unapproved icons in your work (for example, downloaded from Noun Project, or icons you’ve created yourself).

## Types of icons

"Spectrum 2 workflow icons come in two sizes per platform, but with one stroke weight: 1.5 px."

“S2” is the prefix for Spectrum 2 icons.

"Here’s a breakdown of each part of the icon naming convention:"

An example of the naming convention for Spectrum 2 (S2) icons.

The intersections of badge/modifier placement.

The vertical spacing between icons and text is adjusted to create balance.

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

## Sizes

"Spectrum 2 workflow icons come in two sizes per platform, but with one stroke weight: 1.5 px."

“S2” is the prefix for Spectrum 2 icons.

"Here’s a breakdown of each part of the icon naming convention:"

An example of the naming convention for Spectrum 2 (S2) icons.

The intersections of badge/modifier placement.

The vertical spacing between icons and text is adjusted to create balance.

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

## Naming convention

“S2” is the prefix for Spectrum 2 icons.

"Here’s a breakdown of each part of the icon naming convention:"

An example of the naming convention for Spectrum 2 (S2) icons.

The intersections of badge/modifier placement.

The vertical spacing between icons and text is adjusted to create balance.

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

## Attributes

The intersections of badge/modifier placement.

The vertical spacing between icons and text is adjusted to create balance.

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

## Icon and badges placement

The intersections of badge/modifier placement.

The vertical spacing between icons and text is adjusted to create balance.

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

## Text and icon alignment

The vertical spacing between icons and text is adjusted to create balance.

An example of icon and text alignment in a button.

An example of a quiet action button with a 16 px icon.

## New SVG structure

## Usage guidelines

## Requesting icons

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Fundamentals](/page/icon-fundamentals/)
* [Illustrations](/page/illustrations/)
