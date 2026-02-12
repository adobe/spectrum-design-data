---
title: "Avatar group"
source_url: https://s2.spectrum.corp.adobe.com/page/avatar-group/
last_updated: 2026-02-02
category: components/status
component_type: status
status: published
tags:

- components-status
  related\_components:
- avatar
- badge
  parent\_category: status

---

# Avatar group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                                   | Link                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) Available by using | [Avatar](https://opensource.adobe.com/spectrum-css/?path=/docs/components-avatar--docs)                                        |
| Spectrum Web Components Available by using | [Avatar](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/avatar--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                        | [AvatarGroup](http://react-spectrum.adobe.com/s2/index.html?path=/docs/avatargroup--docs)                                      |

## Anatomy

```
avatar group
- avatar
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property | Value                                     | Default value | Description                                                             |
| -------- | ----------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| label    | string                                    | –             | Optional text label displayed with the avatar group (e.g., group name). |
| size     | 50 / 75 / 100 / 200 / 300 / 400 / 500 100 | –             |                                                                         |

## External links

An avatar group displays a set of related avatars together. It’s typically used to represent a collection of people or entities.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Avatar sizes scale exponentially, based on the Spectrum type scale. Avatar has preset sizes to flex across all surfaces and can also be customized to fit appropriately for your context.

An Avatar group can have an optional text label that clearly describes the group or number of users that it represents.

Individual avatars inside Avatar group can be navigated using a keyboard. The keyboard focus state adds a focus ring around the avatar.

Each individual avatar has a stroke applied to better show distinction between individual users in the group. By default, the outline color is a neutral gray, but the stroke color should be adjusted manually to match the background where the avatar group is placed.

When using a colored background the avatar stroke color should remain set as default for both light and dark themes.

## States

Individual avatars inside Avatar group can be navigated using a keyboard. The keyboard focus state adds a focus ring around the avatar.

When using a colored background the avatar stroke color should remain set as default for both light and dark themes.

## Behaviors

Individual avatars inside Avatar group can be navigated using a keyboard. The keyboard focus state adds a focus ring around the avatar.

When using a colored background the avatar stroke color should remain set as default for both light and dark themes.

## Usage guidelines

When using a colored background the avatar stroke color should remain set as default for both light and dark themes.

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

* [Avatar](/page/avatar/)
* [Badge](/page/badge/)
