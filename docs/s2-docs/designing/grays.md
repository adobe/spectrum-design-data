---

title: "Grays"
source\_url: <https://s2.spectrum.corp.adobe.com/page/grays/>
last\_updated: 2026-02-02
category: designing
status: published
tags:

* designing
  related\_components:
* attention-hierarchy
* colors

---

# Grays

## Resources

### Design

* **Figma**: S2 Web

## External links

Gray-100 was previously the default background color. With Spectrum 2, gray-25 is the new default background color, which makes the UI brighter and have higher contrast than before.

Spectrum 2 includes two new grays — gray-25 and gray-1000 — plus an update to the rest of the 11 grays. This means that there are 13 grays total in the system.

The Spectrum team collected feedback from product teams across Adobe and determined that the 6.0.0 color system for light UI had an issue with the steps between gray-50 and gray-75. The difference between these two was so slight it was almost imperceivable, making it so that gray-75 was not very useful. Also, the grays from -100 to -400 had too much contrast between each step, making it so that each component state appeared too harsh. Gray-900 was solid black, which was too high of a contrast to be used in text components. Reading solid black text on a solid white background is not ideal; it creates optical strain for a significant number of users.

Adding two new grays also allowed us to keep a solid black (in light UI) and solid white (in dark UI) without having to keep gray-900 so bright. Now gray-1000 can be used for borders with opacities.

Adding an extra shade in the low range allowed for us to make more incremental steps between background grays.

With the 6.0.0 gray system, users working in apps that support dark theme felt the colors were too light and muddy. And, users working in apps that support darkest theme felt the UI was too high-contrast, which makes it difficult to view the screen comfortably for long periods of time. The Spectrum 2 update addresses both issues by combining the dark and darkest themes into a new theme, with brightness values that are between the two existing themes.

This update affects the layering system. The primary, secondary, and tertiary layers now use grays 25-75 instead of grays 50-100.

"There are no current WCAG or W3C guidelines about if every fill and stroke in every component of every state needs to be 3:1 in contrast. Another thing to consider is that it’s irresponsible to approach the topic of contrast with a “one-size-fits-all” approach: every user has different needs, and design should account for user preference and customization. While one user may need interfaces to be higher contrast to be able to more clearly read and interact with the content, others may prefer interfaces to be lower in contrast (for example, people who are prone to getting migraines)."

Because of this, Spectrum designs all active states of UI components to be at least 3:1 in contrast in some way with the background (such as a text field’s active state border). And, all objects within components, such as icons, drag handles, and text, are also compliant with the 3:1 or 4.5:1 requirement. Other graphical objects also always use at least 3:1 contrast and are accompanied by textual descriptions. Products using Spectrum should be built in such a way that the interface contrast, coloring, sizing, motion, and more can all be adjustable by the user to fit their own specific needs.

The Spectrum 2 color update changed gray-900 (which is used by most heading or title text) to slightly lower contrast in both dark and light UI to ensure improved readability for as many users as possible.

Color updates are breaking changes, so you’ll need to use the following information to responsibly migrate to Spectrum 2 colors. If this isn’t done correctly, backgrounds and components will appear extra dark.

Field borders are currently the only objects that stay gray-300 in the default state.

## Overview

Adding an extra shade in the low range allowed for us to make more incremental steps between background grays.

This update affects the layering system. The primary, secondary, and tertiary layers now use grays 25-75 instead of grays 50-100.

Field borders are currently the only objects that stay gray-300 in the default state.

## Two new grays

Adding an extra shade in the low range allowed for us to make more incremental steps between background grays.

This update affects the layering system. The primary, secondary, and tertiary layers now use grays 25-75 instead of grays 50-100.

Field borders are currently the only objects that stay gray-300 in the default state.

## A single dark theme

This update affects the layering system. The primary, secondary, and tertiary layers now use grays 25-75 instead of grays 50-100.

Field borders are currently the only objects that stay gray-300 in the default state.

## Layering system

This update affects the layering system. The primary, secondary, and tertiary layers now use grays 25-75 instead of grays 50-100.

Field borders are currently the only objects that stay gray-300 in the default state.

## Accessibility

Field borders are currently the only objects that stay gray-300 in the default state.

## Migration guide

Field borders are currently the only objects that stay gray-300 in the default state.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Attention hierarchy](/page/attention-hierarchy/)
* [Colors](/page/colors/)
