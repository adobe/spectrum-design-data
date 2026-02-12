---
title: "Tag group"
source_url: https://s2.spectrum.corp.adobe.com/page/tag-group/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- tag-field
- text-area
parent_category: inputs

---

# Tag group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                         | Link                                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Tag | [group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-tag-group--docs)                                                                                           |
| Spectrum Web Components SWC:     | \[Tags]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/tags--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:              | [TagGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/taggroup--docs)                                                                                                |

## Anatomy

```
tag group
- field label
- tag
- action button
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property      | Value          | Default value | Description                                |
| ------------- | -------------- | ------------- | ------------------------------------------ |
| size          | s / m / l m    | –             |                                            |
| labelPosition | top / side top | –             |                                            |
| hideLabel     | boolean        | false         |                                            |
| actionLabel   | string         | –             | If undefined, this button does not appear. |

## External links

Tag groups organize multiple tags into a single visual group. They’re used to categorize content like keywords or names that describe an item or search query. Tags within the group can be added, removed, or styled to reflect different types of content.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

"Tag groups come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

Labels can be placed either on top or on the side of a group of tags. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

The label of the tag group can be hidden if the context for the tags is sufficient without the title — for example, when the page title or section title applies to the group of tags.

Define an action label to include a link-style button to perform an action on the entire group of tags. This button always appears at the end of the tag group.

When horizontal space is limited in a tag group, the individual tags wrap to form another line.

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

In some instances, it's possible to add an action next to a group of tags to provide a way to easily act on the entire group at once. Reveal the action only when more than one tag is displayed.

In cases where users cannot interact with a large group of tags, consider hiding the group and its broader construct rather than disabling all the individual tags.

## States

When horizontal space is limited in a tag group, the individual tags wrap to form another line.

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

## Behaviors

When horizontal space is limited in a tag group, the individual tags wrap to form another line.

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

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

* [Tag field](/page/tag-field/)
* [Text area](/page/text-area/)
