---
title: "Side navigation"
source_url: https://s2.spectrum.corp.adobe.com/page/side-navigation/
last_updated: 2026-02-02
category: components/navigation
component_type: navigation
status: published
tags:

- components-navigation
  related\_components:
- breadcrumbs
- tabs
  parent\_category: navigation

---

# Side navigation

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                                                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Side | [nav](https://opensource.adobe.com/spectrum-css/?path=/docs/components-side-nav--docs)                                                                                                    |
| Spectrum Web Components SWC:      | \[Sidenav]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/sidenav--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |

## Anatomy

```
side navigation
- header
- item
- icon (optional)
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property      | Value                                           | Default value | Description                     |
| ------------- | ----------------------------------------------- | ------------- | ------------------------------- |
| state         | default / hover / down / keyboard focus default | –             |                                 |
| items         | array – The list of navigation                  | items.        |                                 |
| selectionMode | none / single / multiple single                 | How           | selection is handled for items. |

## External links

Side navigation provides access to the main content areas of a product or section. It can support single-level or multi-level navigation.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

The type of selection allowed in side navigation can be none, single or multiple.

The list of navigation items displayed in a side navigation. Each item includes a label by default and can optionally include an icon. Items that contain nested navigation levels can also include a trailing accessory area, which supports a chevron and an optional counter.

At a glance, the app frame side navigation may look similar to the standard side navigation. However, its interaction model introduces key differences.

The app frame side navigation includes a collapsible menu that lets users hide or reveal labels.

The standard side navigation, on the other hand, is best suited for fixed layouts that support multiple visual styles, such as icon-only, text-only, or mixed. Note that the standard side navigation cannot collapse.

The width of the side navigation is flexible, so choose a width that works with the navigation items in your experience. Make the width generous enough so that it doesn’t feel too condensed. Doing this will ensure that users won't confuse the side navigation with buttons or other controls.

When the navigation item text is too long for the horizontal space available, it wraps to form another line.

Make sure the width is generous enough so that it doesn’t feel too condensed. This ensures it doesn’t get confused with buttons or other controls.

Navigation should be helpful. Choose titles for navigation items that clearly communicate the places where they'll go. Arbitrary or non-useful titles cause usability issues.

Along with being descriptive, the labels of navigation items should be succinct. Keep navigation strings to 1 or 2 and no more than 3 concise words (in U.S. English, which is the source locale). Reduce any unnecessary words in order to ensure simplicity.

Navigation items should never be so long that they require truncation, except in instances where navigation is user-generated, such as folder and filenames.

When possible, the default width should automatically adjust to the longest string in the navigation to accommodate all translations. As a last resort for long strings, specific line breaks can be built into the implementation. These breaks depend on the content and require manual handling by globalization engineers.

In multi-level side navigation, icon and text-only styles can be used together. Users may include supporting icons on the first level and omit them on the second and third levels, or choose to use no icons at all.

Do not mix icon and no-icon options within the same navigation level.

The multi-level side navigation goes to three levels deep. Adding more than three levels will make the indentation indiscernible, which becomes a major usability issue.

If top-level navigation items have a location associated with them, send the user to that location and open the sub-level navigation items. If a top-level navigation item does not have any associated location, only open the sub-level navigation items.

Side navigation can use either of these behaviors, but should never mix behaviors in the same experience.

## States

The app frame side navigation includes a collapsible menu that lets users hide or reveal labels.

When the navigation item text is too long for the horizontal space available, it wraps to form another line.

Make sure the width is generous enough so that it doesn’t feel too condensed. This ensures it doesn’t get confused with buttons or other controls.

Do not mix icon and no-icon options within the same navigation level.

Side navigation can use either of these behaviors, but should never mix behaviors in the same experience.

## Behaviors

The app frame side navigation includes a collapsible menu that lets users hide or reveal labels.

When the navigation item text is too long for the horizontal space available, it wraps to form another line.

Make sure the width is generous enough so that it doesn’t feel too condensed. This ensures it doesn’t get confused with buttons or other controls.

Do not mix icon and no-icon options within the same navigation level.

Side navigation can use either of these behaviors, but should never mix behaviors in the same experience.

## Usage guidelines

Make sure the width is generous enough so that it doesn’t feel too condensed. This ensures it doesn’t get confused with buttons or other controls.

Do not mix icon and no-icon options within the same navigation level.

Side navigation can use either of these behaviors, but should never mix behaviors in the same experience.

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

* [Breadcrumbs](/page/breadcrumbs/)
* [Tabs](/page/tabs/)
