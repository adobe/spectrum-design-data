---
title: "Badge"
source_url: https://s2.spectrum.corp.adobe.com/page/badge/
last_updated: 2026-02-02
category: components/status
component_type: status
status: published
tags:

- components-status
related_components:
- avatar-group
- meter
parent_category: status

---

# Badge

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Badge](https://opensource.adobe.com/spectrum-css/?path=/docs/components-badge--docs)                                        |
| Spectrum Web Components SWC: | [Badge](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/badge--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [Badge](https://react-spectrum.adobe.com/s2/index.html?path=/docs/badge--docs)                                               |

## Anatomy

```
badge
- icon
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                                                                                                                                                                                                            | Default value | Description                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| label      | string                                                                                                                                                                                                                           | –             | When the label is not defined, the badge appears as icon-only. |
| icon       | –                                                                                                                                                                                                                                | –             |                                                                |
| variant    | neutral / info / positive / negative / indigo / yellow / magenta / fuchsia / purple / seafoam / accent / notice / gray / red / orange / chartreuse / celery / green / cyan / blue / pink / turquoise / brown / cinnamon / silver | –             |                                                                |
| style      | bold / subtle / outline                                                                                                                                                                                                          | –             |                                                                |
| fixed      | none / top / right / bottom / left none                                                                                                                                                                                          | –             |                                                                |
| isDisabled | boolean                                                                                                                                                                                                                          | false         |                                                                |
| size       | s / m / l / xl s                                                                                                                                                                                                                 | –             |                                                                |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

"Badges come in four different sizes: small, medium, large, and extra-large. The small size is the default and most frequently used option. Use the other sizes sparingly to create a hierarchy of importance on a page."

Badges can be placed as floating in a container, or they can be fixed to any edge of a container. They lose their default corner rounding on the fixed edge.

"A Badge’s style determines its visual emphasis. Badges come in three different styles: bold, subtle, and outline."

"When badges have a semantic meaning, they use semantic colors. Use these variants for the following statuses:"

When badges are for color-coded categories, they use non-semantic colors. Non-semantic variants are ideally used for when there are 8 categories or less.

A badge can have an optional icon. If no label is used, a badge becomes icon-only and it must include an icon. An icon-only badge is best for very small spaces, and it should always include a tooltip on hover to provide more context for the icon's meaning.

Badges should always have a label for accessibility and clear comprehension. When the label is not defined, a badge becomes icon-only.

Badges are display elements, not actions. They should not behave like buttons or links. If an action is required, use a more appropriate component (e.g., Button, Action button).

When a badge's label is too long for the available horizontal space, it wraps to form another line. If there is no room for a second line of text, the badge should truncate and include a tooltip to expose the full text upon hover.

Blue badges are easily confused with Spectrum's blue accent buttons. Only use blue badges when absolutely necessary.

The yellow badge is reserved to communicate "best deal" or "discount" situations only. Do not use the yellow badge for other situations.

Badges are meant to offer quick context about what category, status, or meaning an item is associated with. If your design requires multiple badges, consider using regular text metadata and reserve a single badge for only the most important status, category, or meaning instead.

It's best to use a text label on a badge whenever possible because communicating with an icon alone may be unclear or subjective. Reserve icon-only badges for responsive cases, such as for cards in a panel that don't have space for a full badge. In related contexts, pair the icon with a label to help teach a user what the icon means. Icon-only badges should always include a tooltip on hover to show their associated label.

Badge placement varies widely depending on the use case. In cards, place the badge on the left side of the footer, if possible. If there is no footer or if that space is filled, affix the badge to the right edge of the preview. If there is no preview, affix the badge to the top right corner of the card.

## States

Blue badges are easily confused with Spectrum's blue accent buttons. Only use blue badges when absolutely necessary.

The yellow badge is reserved to communicate "best deal" or "discount" situations only. Do not use the yellow badge for other situations.

## Behaviors

Blue badges are easily confused with Spectrum's blue accent buttons. Only use blue badges when absolutely necessary.

The yellow badge is reserved to communicate "best deal" or "discount" situations only. Do not use the yellow badge for other situations.

## Usage guidelines

Blue badges are easily confused with Spectrum's blue accent buttons. Only use blue badges when absolutely necessary.

The yellow badge is reserved to communicate "best deal" or "discount" situations only. Do not use the yellow badge for other situations.

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

* [Avatar group](/page/avatar-group/)
* [Meter](/page/meter/)
