---
title: "Breadcrumbs"
source_url: https://s2.spectrum.corp.adobe.com/page/breadcrumbs/
last_updated: 2026-02-02
category: components/navigation
component_type: navigation
status: published
tags:

- components-navigation
  related\_components:
- accordion
- side-navigation
  parent\_category: navigation

---

# Breadcrumbs

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Breadcrumbs](https://opensource.adobe.com/spectrum-css/?path=/docs/components-breadcrumbs--docs)                                        |
| Spectrum Web Components SWC: | [Breadcrumbs](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/breadcrumbs--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [Breadcrumbs](https://react-spectrum.adobe.com/s2/index.html?path=/docs/breadcrumbs--docs)                                               |

## Anatomy

```
breadcrumbs
- truncated menu
- breadcrumbs item
- separator
- breadcrumbs title
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property     | Value                                                           | Default value | Description                                                           |
| ------------ | --------------------------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| state        | default / hover / down / keyboard focus / drag and drop default | –             |                                                                       |
| isMultiline  | boolean                                                         | false         | If true, the breadcrumb items will wrap to multiple lines.            |
| size         | m / l m                                                         | Controls      | the overall size of the breadcrumb component.                         |
| items        | array – An array of breadcrumb                                  | items.        |                                                                       |
| separator    | chevron / none chevron                                          | The           | separator icon used between breadcrumb items.                         |
| isTruncated  | boolean                                                         | false         | If true, the breadcrumb item is truncated and displayed as icon only. |
| sizeOverride | s / m / l / xl                                                  | –             | Overrides the size of the breadcrumb items when isMultiline is true.  |

## External links

Breadcrumbs show hierarchy and navigational context for a user’s location within an app.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

When set to true, the breadcrumb item is displayed as an icon only.

Separators visually divide breadcrumb items and convey hierarchy.

Breadcrumbs can include multiple items, but too many levels can overwhelm users. Limit the hierarchy to four items (including the root, if shown) to provide clear context while keeping truncated options accessible.

"Breadcrumbs come in two sizes: medium, and large. The medium size is the default and most frequently used option."

The multiline variation places emphasis on the selected breadcrumb item as a page title, helping a user to more clearly identify their current location.

Breadcrumbs truncate when there is not enough room to display all levels of the breadcrumb list, or as a way of managing relevance of the visible breadcrumb items in a deeply nested hierarchy. The truncation of breadcrumb items begins when either there is not enough room to display all items, or if there are 5 or more breadcrumbs to display.

The truncation menu displays all options within a breadcrumb. Items are listed with the hierarchy ordered from top (root) to bottom and include the currently selected item.

Breadcrumbs need a consistent hierarchical structure because they create a path for discovery and context for a user’s current location.

Breadcrumbs should be a form of navigating a linear hierarchy. They should not be used for any other interactions, such as displaying filters.

The truncation menu should display all available options within the hierarchy where a user is located — not as indented. Doing this provides context for the directionality of how the menu is being displayed. Adding indentation to the menu items does not add value to understanding the hierarchy, and it can actually decrease the readability of the menu options.

When list items are truncated into a menu but the label text is still too large for the horizontal space, truncate the text with an ellipsis. By default, truncation should occur at the end of the title. If your users need to see the end of truncated titles, truncating the middle of the title is acceptable.

When the breadcrumb title is truncated, a tooltip should display the full title when the user hovers, keyboard focuses, or single-taps on mobile.

Prioritize using the truncation menu when breadcrumb labels are long. Never truncate more than one breadcrumb label. If the current location has a long label, all items can be truncated into the menu.

Truncation should be avoided by way of the breadcrumbs overflow behavior, although in some cases the final breadcrumb title may truncate with an ellipsis.

Be mindful of your user’s cognitive load and truncate breadcrumbs appropriately. Displaying too many levels can be overwhelming. By displaying only 4 items in the hierarchy (including the root item, if you are displaying it), users will quickly understand context while still having easy access to any truncated options. Truncation of breadcrumb items begins when either there is not enough room to display all items, or if there are 5 or more breadcrumbs to display.

Don't use icons within the labels for breadcrumbs. Since breadcrumb labels are horizontally distributed, icons disrupt the rhythm and readability of the list.

Breadcrumbs are a way for traveling up a hierarchical navigation and should not be mixed with controls intended for lateral or non-hierarchical navigation.

## States

Breadcrumbs need a consistent hierarchical structure because they create a path for discovery and context for a user’s current location.

Breadcrumbs should be a form of navigating a linear hierarchy. They should not be used for any other interactions, such as displaying filters.

When the breadcrumb title is truncated, a tooltip should display the full title when the user hovers, keyboard focuses, or single-taps on mobile.

## Behaviors

Breadcrumbs need a consistent hierarchical structure because they create a path for discovery and context for a user’s current location.

Breadcrumbs should be a form of navigating a linear hierarchy. They should not be used for any other interactions, such as displaying filters.

When the breadcrumb title is truncated, a tooltip should display the full title when the user hovers, keyboard focuses, or single-taps on mobile.

## Usage guidelines

Breadcrumbs need a consistent hierarchical structure because they create a path for discovery and context for a user’s current location.

Breadcrumbs should be a form of navigating a linear hierarchy. They should not be used for any other interactions, such as displaying filters.

When the breadcrumb title is truncated, a tooltip should display the full title when the user hovers, keyboard focuses, or single-taps on mobile.

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

* [Accordion](/page/accordion/)
* [Side navigation](/page/side-navigation/)
