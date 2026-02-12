---
title: "Close button"
source_url: https://s2.spectrum.corp.adobe.com/page/close-button/
last_updated: 2026-02-02
category: components/actions
component_type: action
status: published
tags:

- components-actions
- action
- button
- interactive
  related\_components:
- button-group
- link
  parent\_category: actions

---

# Close button

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Close | [button](https://opensource.adobe.com/spectrum-css/?path=/docs/components-close-button--docs) |

## Anatomy

```
close button
- Cross UI icon
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                           | Default value | Description                                                             |
| ----------- | ----------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| size        | s / m / l / xl m                                | –             |                                                                         |
| iconSize    | string                                          | –             |                                                                         |
| staticColor | white / black                                   | –             | Static color must not be set for the default version of this component. |
| isDisabled  | boolean                                         | false         |                                                                         |
| state       | default / hover / down / keyboard focus default | –             |                                                                         |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A close button in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later.

Use this option when a close button needs to be placed on top of a color background or visual. Static color close buttons are available in black or white, regardless of color theme.

Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of color theme. Make sure that the background and the close button color meet the minimum color contrast ratio.

"The icon inside of the close button comes in two options: regular and large. These scale up and down for each close button size. This is a cross UI icon, not a workflow icon or the letter “x.”"

"Close buttons come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

A close button can be navigated using a keyboard. The keyboard focus state takes the close button’s visual hover state and adds a ring to the button in focus.

## States

## Behaviors

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

* [Button group](/page/button-group/)
* [Link](/page/link/)
