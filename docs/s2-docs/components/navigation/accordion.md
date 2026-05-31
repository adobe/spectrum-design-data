---
title: "Accordion"
source_url: https://s2.spectrum.corp.adobe.com/page/accordion/
last_updated: 2026-02-02
category: components/navigation
component_type: navigation
status: published
tags:

- components-navigation
related_components:
- thumbnail
- breadcrumbs
parent_category: navigation

---

# Accordion

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: | [Accordion](https://opensource.adobe.com/spectrum-css/?path=/docs/components-accordion--docs)                                        |
| Spectrum Web Components SWC: | [Accordion](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/accordion--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [Accordion](https://react-spectrum.adobe.com/s2/index.html?path=/docs/accordion--docs)                                               |

## Anatomy

```
accordion
- accordion items
- small divider
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                           | Default value | Description                                                         |
| ---------- | ----------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| state      | default / hover / down / keyboard focus default | –             |                                                                     |
| size       | s / m / l / xl m                                | –             |                                                                     |
| isQuiet    | boolean                                         | false         |                                                                     |
| isDisabled | boolean                                         | false         |                                                                     |
| density    | compact / regular / spacious regular            | –             |                                                                     |
| items      | array – An array of accordion                   | items.        |                                                                     |
| isMultiple | boolean                                         | false         | If true, multiple accordion items can be expanded at the same time. |

## External links

An accordion displays a list of items that can be expanded or collapsed to show additional content. It can support zero, one, or multiple expanded items at a time.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

By default, only one accordion item can be expanded at a time. Use the isMultiple option to allow multiple items to be expanded simultaneously.

Accordions can contain any number of items. Each item can be expanded or collapsed by interacting with any part of the item.

"Accordions come in three densities: compact, regular, and spacious. Each of the different densities have the same font size, but have tighter or looser vertical spacing between the rows."

Individual accordion items can be disabled using the isDisabled option. Disabled items cannot be expanded or collapsed.

By default, accordions have dividers between sections. This style works best when lots of content is inside each section.

Alternatively, you can have no dividers between sections. This style works best when a clear layout (vertical stack, table, grid) makes it easy see and understand. Too many quiet components in a small space can be hard to differentiate.

"Accordions come in four different sizes: small, medium, large, and extra-large. The medium size is the default and recommended option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. Each of the different sizes have varying font sizes, and tighter or looser vertical spacing between the rows."

By default, only one accordion item may be expanded at a time. However, the component can be configured to allow multiple items to remain open simultaneously.

Accordion titles wrap automatically if they exceed the available width.

An optional action button or switch can be placed on the trailing edge of an accordion item to support contextual interactions.

Accordions are effective for organizing large amounts of related content within a limited space. They help users stay focused by revealing information only when it's needed, making them ideal for scenarios where not all content needs to be visible at once.

Avoid using accordions when users are likely to read all the content in one go, as they can introduce unnecessary clicks and hinder the user experience. For complex or deeply nested information structures, consider alternative components such as tree views or tabs to maintain clarity and ease of navigation.

## States

Accordion titles wrap automatically if they exceed the available width.

An optional action button or switch can be placed on the trailing edge of an accordion item to support contextual interactions.

## Behaviors

Accordion titles wrap automatically if they exceed the available width.

An optional action button or switch can be placed on the trailing edge of an accordion item to support contextual interactions.

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

* [Thumbnail](/page/thumbnail/)
* [Breadcrumbs](/page/breadcrumbs/)
