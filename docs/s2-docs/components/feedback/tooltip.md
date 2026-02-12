---
title: "Tooltip"
source_url: https://s2.spectrum.corp.adobe.com/page/tooltip/
last_updated: 2026-02-02
category: components/feedback
component_type: feedback
status: published
tags:

- components-feedback
related_components:
- toast
- calendar
parent_category: feedback

---

# Tooltip

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Tooltip](https://opensource.adobe.com/spectrum-css/?path=/docs/components-tooltip--docs)           |
| Spectrum Web Components SWC: | [Tooltip](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/tooltip--docs) |
| React Spectrum RSP:          | [Tooltip](https://react-spectrum.adobe.com/s2/index.html?path=/docs/tooltip--docs)                  |

## Anatomy

```
tooltip
- background
- label
- tip
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property         | Value                                    | Default value | Description                                     |
| ---------------- | ---------------------------------------- | ------------- | ----------------------------------------------- |
| label            | string                                   | –             |                                                 |
| variant          | neutral / informative / negative neutral | –             |                                                 |
| hasIcon          | boolean                                  | false         | If the neutral variant, there is never an icon. |
| maxWidth         | number 160 units:                        | pixels        |                                                 |
| placement        | top / bottom / left / right top          | –             |                                                 |
| shouldFlip       | boolean                                  | false         |                                                 |
| offset           | number 4 units:                          | pixels        |                                                 |
| containerPadding | number 8 units:                          | pixels        |                                                 |

## External links

Tooltips display contextual information related to a specific component. They appear on hover or focus to clarify purpose or behavior.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

All tooltips have a label. The label communicates the contextual help or information about specific components when a user hovers over or focuses on them.

By default, tooltips are the neutral variant. These are the most common variant because most tooltips are used to only disclose additional information, without conveying a semantic meaning. The neutral variant never includes an icon.

"Tooltips also come in semantic variants: informative (blue), and negative (red). An icon is required for these variants to ensure information isn’t conveyed by color alone."

2 of the 3 tooltip variants (informative and negative) can include an icon to supplement the messaging. These icons are predefined and can not be customized. Unless it's being used to provide context about the exact same icon, a semantic tooltip should always show an icon. Doing this is essential for helping users with color vision deficiency to discern the message tone.

A tooltip is positioned in relation to its target.

This option determines whether or not a tooltip should be able to switch sides when constrained by space. A tooltip placed at the top would flip to be placed at the bottom (and vice versa), and a tooltip placed at the left would flip to be placed at the right (and vice versa).

The offset is the distance between the end of the tip and the target.

To make sure that the tooltip will stay within certain boundaries (e.g., a browser window) it’s possible to define a container and a container padding value to respect.

When the label is too long for the available horizontal space, it wraps to form another line.

A tooltip fades in and out when showing and hiding, and slides a short distance from the source to indicate its origin. The direction of the slide (left, right, top, bottom) depends on the placement of the tooltip. The animation attributes (duration, easing, offset) are the same whether it’s showing or hiding.

Tooltips attached to help icons appear immediately. For conventional UI elements where a tooltip appearing immediately would be intrusive, delay appearance with a warmup period.

The warmup period is a global timer that requires the cursor to remain on a UI element for the allotted time before a tooltip appears. Once this period is complete, a tooltip appears instantly on any hovered-upon UI element until the cursor is in an area that does not trigger a tooltip for the duration of the cooldown period.

Icons are not always easy to identify on their own. When you use components that don’t have labels — for example, icon-only action buttons and tabs — make sure to use tooltips to provide context for the icons.

For example, in a scenario where a user is entering their password into a field, the crucial information would be to state the password requirements. Supplementary context would be a message about how to get help if they have forgotten their password.

Tooltips should be as concise and clear as possible. Keep the text to 1 or 2 short sentences. If the information you need to communicate is longer than that, look into using a different design.

If a tooltip is written in a full sentence (or is 2 or more sentences), include a period at the end. If it's a short phrase or is only the name of a tool, action, or icon, don't add a period to the end.

Tooltips appear only on hover or when in keyboard focus. They should not contain actions or links.

## States

When the label is too long for the available horizontal space, it wraps to form another line.

Tooltips appear only on hover or when in keyboard focus. They should not contain actions or links.

## Behaviors

When the label is too long for the available horizontal space, it wraps to form another line.

Tooltips appear only on hover or when in keyboard focus. They should not contain actions or links.

## Usage guidelines

Tooltips appear only on hover or when in keyboard focus. They should not contain actions or links.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Toast](/page/toast/)
* [Calendar](/page/calendar/)
