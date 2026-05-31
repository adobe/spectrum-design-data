---
title: "Contextual help"
source_url: https://s2.spectrum.corp.adobe.com/page/contextual-help/
last_updated: 2026-02-02
category: components/feedback
component_type: feedback
status: published
tags:

- components-feedback
related_components:
- coach-mark
- illustrated-message
parent_category: feedback

---

# Contextual help

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                                | Link                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Contextual | [help](https://opensource.adobe.com/spectrum-css/?path=/docs/components-contextual-help--docs)                                        |
| Spectrum Web Components SWC: Contextual | [Help](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/contextual-help--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                     | [ContextualHelp](https://react-spectrum.adobe.com/s2/index.html?path=/docs/contextualhelp--docs)                                      |

## Anatomy

```
contextual help
- action button
- popover
- title
- description
- link
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                                                                                                                                                                                                                                                              | Default value | Description                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------- |
| icon               | info / help info                                                                                                                                                                                                                                                   | –             |                                                                       |
| popoverPlacement   | top / top left / top right / top start / top end / bottom / bottom left / bottom right / bottom start / bottom end / left / left top / left bottom / start / start top / start bottom / right / right top / right bottom / end / end top / end bottom bottom start | –             |                                                                       |
| popoverOffset      | number                                                                                                                                                                                                                                                             | 8             |                                                                       |
| href               | string                                                                                                                                                                                                                                                             | –             | Optional URL within contextual help content like a 'Learn more' link. |
| popoverCrossOffset | number                                                                                                                                                                                                                                                             | 0             |                                                                       |
| containerPadding   | number                                                                                                                                                                                                                                                             | 8             |                                                                       |
| state              | default / down / open / keyboard focus default                                                                                                                                                                                                                     | –             |                                                                       |

## External links

Contextual help displays additional information about the state of a nearby component or an entire view. It explains high-level concepts and can link to more detailed guidance.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

To make sure that a popover will stay within certain boundaries (e.g., a browser window) it’s possible to define a container, and a container padding value, to respect.

The cross offset is the placement offset on the cross axis (x-axis for top and bottom, y-axis for left and right).

A contextual help can have up to one link.

The offset is the distance between the action button and the popover edge. There is a default value but this can also be adjusted depending on the context.

Indicates whether contents are informative or provides helpful guidance.

Contextual help can be used to explain why a component is disabled and how to enable it. Don’t make disabled components interactive (with focus states or hovering) as a way to display contextual information.

"There are two size options for the action button in contextual help: extra-small and small. Regardless of size, the action button should be quiet and display only an icon."

## States

## Usage guidelines

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

* [Coach mark](/page/coach-mark/)
* [Illustrated message](/page/illustrated-message/)
