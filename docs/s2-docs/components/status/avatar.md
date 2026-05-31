---
title: "Avatar"
source_url: https://s2.spectrum.corp.adobe.com/page/avatar/
last_updated: 2026-02-02
category: components/status
component_type: status
status: published
tags:

- components-status
related_components:
- tree-view
- avatar-group
parent_category: status

---

# Avatar

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: | [Avatar](https://opensource.adobe.com/spectrum-css/?path=/docs/components-avatar--docs)                                        |
| Spectrum Web Components SWC: | [Avatar](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/avatar--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [Avatar](https://react-spectrum.adobe.com/s2/index.html?path=/docs/avatar--docs)                                               |

## Anatomy

```
avatar
- container
- user image
- gradient image
- initials
- guest icon
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                                                                                       | Default value | Description |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| size       | 50 / 75 / 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 / 1000 / 1100 / 1200 / 1300 / 1400 / 1500 500 | –             |             |
| image      | user image / gradient image / gradient / guest image / initials user image                                  | –             |             |
| isDisabled | boolean                                                                                                     | false         |             |
| showStroke | boolean                                                                                                     | false         |             |
| state      | default / down / keyboard focus default                                                                     | –             |             |

## External links

An avatar is a thumbnail representation of an entity, such as a user or an organization.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

An avatar in a disabled state shows that an avatar exists, but is not available or a user is not active in that circumstance. This can be used to maintain layout continuity and communicate that an avatar may become available or active later.

When used as an individual Avatar, showStroke is false by default. When used in Avatar group, showStroke is true by default to create separation between the stacked group of Avatar components.

Avatar sizes scale exponentially, based on the Spectrum type scale. Avatar has preset sizes to flex across all surfaces and can also be customized to fit appropriately for your context.

An avatar has multiple visual styles, depending on the user preference. These show up as branded gradient images, initials of the user’s name, as well as any image that a user uploads. For users who do not have Adobe accounts, they will default to the guest avatar.

An avatar can be navigated using a keyboard. The keyboard focus state adds a blue ring to the avatar in focus.

An avatar group displays a set of related avatars together. It’s typically used to represent a collection of people or entities.

Use branded generic avatars when a user has not set their avatar image. These images are designed to be abstracted from all genders, locales, and cultures.

The initials avatar is designed to work with latin characters only and supports 1 or 2 characters that are programmatically identified by the first name and last name in a user’s account settings. For users with non-latin characters, their default avatar should be the gradient image style.

The guest avatar style is designed for users who may be interacting with Adobe products, but are not logged in or do not have an Adobe account.

## States

An avatar can be navigated using a keyboard. The keyboard focus state adds a blue ring to the avatar in focus.

An avatar group displays a set of related avatars together. It’s typically used to represent a collection of people or entities.

The guest avatar style is designed for users who may be interacting with Adobe products, but are not logged in or do not have an Adobe account.

## Behaviors

An avatar can be navigated using a keyboard. The keyboard focus state adds a blue ring to the avatar in focus.

An avatar group displays a set of related avatars together. It’s typically used to represent a collection of people or entities.

The guest avatar style is designed for users who may be interacting with Adobe products, but are not logged in or do not have an Adobe account.

## Usage guidelines

The guest avatar style is designed for users who may be interacting with Adobe products, but are not logged in or do not have an Adobe account.

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

* [Tree view](/page/tree-view/)
* [Avatar group](/page/avatar-group/)
