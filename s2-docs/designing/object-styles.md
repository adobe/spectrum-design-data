---
title: "Object styles"
source_url: https://s2.spectrum.corp.adobe.com/page/object-styles/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
related_components:
- fonts
- spacing

---

# Object styles

## Resources

### Design

* **Figma**: S2 Web

## External links

Object styles are specific visual shapes or effects that are used to communicate intent or to give cues about an interaction.

"For example, different types of inputs all share styles. Search fields, text fields, and combo boxes use object styles to communicate a primary purpose: text input. A search field is often more of a global scope, and has full rounding to add emphasis and differentiation from other types of fields. Action buttons, pickers, and in-field buttons share a fill color to indicate selection. Checkboxes, radio buttons, and switches share object styles to indicate binary selection."

Example of how object styles are combined to communicate different interactions.

In general, Spectrum 2’s system for rounding is more pronounced and flexible than in Spectrum 1.

Larger rounding values give components more expression and personality, and having more rounding options makes it possible to create visual balance across a wide range of contexts.

In general, this system of rounding creates a visually balanced gap when nesting smaller objects within larger objects.

Avatars are displayed in circles to draw attention to user content. All other representations, such as groups and products, are displayed in rounded squares.

In Spectrum 2, rounding for different sized components varies based on a Major Second logarithmic scale. This allows for components to retain a consistent and identifiable shape at all sizes. Desktop and mobile scales share the same base rounding. Note that the values displayed are base values for desktop scale components, and specific corner radius values may vary between components.

Borders are only used when spacing isn’t enough to show separation. For example, a divider might sometimes be needed to separate two distinct action button groups. Or, an object might have a border to demarcate distinct areas, such as separating a panel or card from the rest of the content on a page.

"There are two border widths used within in-product UI contexts:"

"The third option is not used within in-product UI contexts:"

A medium divider separates two action button groups. Note that when dividers are used with visible gaps on both ends, the end caps are fully rounded.

In Spectrum 2, large borders are only used in longform content, such as in documentation pages. Large borders aren’t used within in-product UI contexts.

A full-width medium divider can be a helpful option for separating two distinct parts of a page, such as dividing a navigation panel from the rest of the content. When deciding whether a divider is needed, consider whether groups of information are still clear without one. Generally, more complex content with a varying alignment of objects will benefit the most from using a divider.

Similarly to the previous example, a full-width medium divider separates a commenting panel from the rest of the page. The divider is helpful in this context since the commenting panel can have varying content, from an empty state to many layers of nested comments. By creating a clear boundary, this helps set expectations for what content is presented in the panel.

Drop shadows draw attention and give the appearance of depth. By default, this style is used to show elevation, when content appears on top of other content.

While the detailed values are still in progress, the foundational concepts for drop shadows still apply.

"In Spectrum 2, shadows are composed of three layers: a key shadow, an ambient shadow, and a transition shadow that’s between them."

Containers that appear on top of content, such as menus and tooltips, have drop shadows to show elevation.

By default, objects have no drop shadows. When a container is dragged, a drop shadow is used to show elevation in both default and emphasized containers.

"An overlay represents elevation in a different way: it focuses attention on the content above the overlay only. When using an overlay (for example, behind a dialog), no additional drop shadow is applied to the background."

## Overview

Example of how object styles are combined to communicate different interactions.

In general, Spectrum 2’s system for rounding is more pronounced and flexible than in Spectrum 1.

In general, this system of rounding creates a visually balanced gap when nesting smaller objects within larger objects.

"There are two border widths used within in-product UI contexts:"

"The third option is not used within in-product UI contexts:"

A medium divider separates two action button groups. Note that when dividers are used with visible gaps on both ends, the end caps are fully rounded.

While the detailed values are still in progress, the foundational concepts for drop shadows still apply.

"In Spectrum 2, shadows are composed of three layers: a key shadow, an ambient shadow, and a transition shadow that’s between them."

Containers that appear on top of content, such as menus and tooltips, have drop shadows to show elevation.

## Rounding

In general, Spectrum 2’s system for rounding is more pronounced and flexible than in Spectrum 1.

In general, this system of rounding creates a visually balanced gap when nesting smaller objects within larger objects.

"There are two border widths used within in-product UI contexts:"

"The third option is not used within in-product UI contexts:"

A medium divider separates two action button groups. Note that when dividers are used with visible gaps on both ends, the end caps are fully rounded.

While the detailed values are still in progress, the foundational concepts for drop shadows still apply.

"In Spectrum 2, shadows are composed of three layers: a key shadow, an ambient shadow, and a transition shadow that’s between them."

Containers that appear on top of content, such as menus and tooltips, have drop shadows to show elevation.

## Border width

"There are two border widths used within in-product UI contexts:"

"The third option is not used within in-product UI contexts:"

A medium divider separates two action button groups. Note that when dividers are used with visible gaps on both ends, the end caps are fully rounded.

While the detailed values are still in progress, the foundational concepts for drop shadows still apply.

"In Spectrum 2, shadows are composed of three layers: a key shadow, an ambient shadow, and a transition shadow that’s between them."

Containers that appear on top of content, such as menus and tooltips, have drop shadows to show elevation.

## Drop shadow

While the detailed values are still in progress, the foundational concepts for drop shadows still apply.

"In Spectrum 2, shadows are composed of three layers: a key shadow, an ambient shadow, and a transition shadow that’s between them."

Containers that appear on top of content, such as menus and tooltips, have drop shadows to show elevation.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Fonts](/page/fonts/)
* [Spacing](/page/spacing/)
