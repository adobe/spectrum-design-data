---
title: Border width
category: designing
source_url: https://preview.spectrum.adobe.com/foundations/styles/object-styles/border-width
last_updated: '2026-08-14'
status: published
tags:
  - border width
  - divider
hub_path: /foundations/styles/object-styles/border-width
---

# Border width

## Principles

Image: Faint blue icon of a rounded square containing a small toggle switch and rounded rectangle, illustrating minimal border use where borders aren't needed. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_17c3007ebae0f53d3422c819976245b9093c4f4f4.png?width=750&format=png&optimize=medium)Image: Three horizontal pink gradient bars of consistent border width, illustrating consistent border styling across elements. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1e8f2ff262e3c29774ba33c7130140c6fb22bf3a1.png?width=750&format=png&optimize=medium)

### Borders when necessary only

Borders are an essential way to create separation, but they can also add visual noise to an interface by filling and disrupting negative space. As a result, they should be used sparingly, only when necessary. For example, a divider might sometimes be needed to separate two distinct action button groups. Or, an object might have a border to demarcate distinct areas, such as separating a panel or card from the rest of the content on a page. Whenever possible, achieve separation through other techniques, like negative space and section titles, instead of using borders.

### Consistent border widths

Border width is a functional design choice, not a decorative one. Use a single border width throughout the interface, and only introduce variations to the thickness to communicate meaningful change, such as focus or selection. Avoid varying border widths solely to create visual interest or hierarchy.

## Border width system

Borders are primarily used to define component boundaries and organize content within layouts. Different border width styles communicate different levels of emphasis and separation. Spectrum supports two border widths that are used within in-product UI contexts.

### Image: UI examples showing medium border widths: a radio button, checkbox, and toggle switch outline, a focused pill-shaped button with a blue border, an unfocused pill button, and a bordered text input field with label and value. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1a088c65b63f7e399bb131a44ff80e74953321fff.png?width=750&format=png&optimize=medium)

### Medium

Medium borders (2 px) are the default size for most contexts. Components with border options use the default medium size, as well as focus rings which appear on keyboard focus.

### Image: A list UI with two collapsible "Title" sections separated by thin hairline borders, and a checklist titled "Fruits" with thin-bordered rows for Apples, Oranges, and Pears. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1435bfbbdbca2c110617d050031937775d717f036.png?width=750&format=png&optimize=medium)

### Small

Small borders (1 px) are used in specific components and patterns where there’s greater density (for example, in accordions and tables).

## Applying border widths

Border treatments vary depending on their context. The following examples show how to apply borders across common interface patterns to create clear separation while maintaining a consistent appearance.

### Image: Adobe GenStudio interface with two magnified callouts comparing a rounded corner border end cap against a squared-off border end cap on a sidebar element. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_149631f31e7ffca6e95f54f0128c7dadc81cc445b.png?width=750&format=png&optimize=medium)

### Context-dependent end caps

The rounding of divider end caps changes depending on how the divider is used. When a divider extends to both edges of a container, it uses square ends so it meets each edge cleanly. When a divider has visible gaps at both ends, it uses fully rounded end caps.

### Image: Close-up of an app toolbar with a bordered rounded container grouping a percentage dropdown, share icon, upload icon, and blue Download button, next to ungrouped icon buttons. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1fd7f0c9ddbc8acc442c352f72f2f9f1888c96383.png?width=750&format=png&optimize=medium)

### Grouping related actions

Use a divider to separate groups of related actions in a header. This helps distinguish global actions from actions that apply only to the current view.

## Tokens

### Platform availability

These tokens are currently available on web. Guidance for additional platforms will be added in a future release. StyleTokenValueSmall border-width-100 1 pxMedium border-width-200 2 pxLarge border-width-400 4 px
