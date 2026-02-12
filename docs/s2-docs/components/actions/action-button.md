---
title: "Action button"
source_url: https://s2.spectrum.corp.adobe.com/page/action-button/
last_updated: 2026-02-01
category: components/actions
component_type: action
status: published
tags:

- components-actions
- action
- button
- interactive
  related\_components:
- action-bar
- action-group
  parent\_category: actions

---

# Action button

## Overview

Action buttons perform tasks or mark selections. They're suited for task-based workflows where buttons don't need to draw attention.

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                | Link                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) | [CSS: Action button](https://opensource.adobe.com/spectrum-css/?path=/docs/components-action-button--docs)                                        |
| Spectrum Web Components | [SWC: Action Button](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/action-button--docs\&globals=system:spectrum-two) |
| React Spectrum          | [RSP: ActionButton](https://react-spectrum.adobe.com/s2/index.html?path=/docs/actionbutton--docs)                                                 |

## Anatomy

```
action button
  - icon
  - label
  - hold icon (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property          | Value                                   | Default value | Description                                                             |
| ----------------- | --------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| label             | string                                  | –             |                                                                         |
| hideLabel         | boolean                                 | false         |                                                                         |
| icon              | –                                       | –             | Icon must be present if the label is not defined.                       |
| size              | xs / s / m / l / xl                     | m             |                                                                         |
| isQuiet           | boolean                                 | false         |                                                                         |
| isSelected        | boolean                                 | false         |                                                                         |
| isEmphasized      | boolean                                 | false         |                                                                         |
| staticColor       | white / black                           | –             | Static color must not be set for the default version of this component. |
| selectedTextColor | –                                       | –             |                                                                         |
| hasHoldIcon       | boolean                                 | false         |                                                                         |
| isDisabled        | boolean                                 | false         |                                                                         |
| state             | default / hover / down / keyboard focus | default       |                                                                         |

### isDisabled

An action button in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later.

### hasHoldIcon

An action button can have a hold icon (a small corner triangle). This icon indicates that holding down the action button for a short amount of time can reveal a popover menu, which can be used, for example, to switch between related actions.

### selectedTextColor

The text color on the selected state of the over-background variant can be customized to match the background it's on.

### staticColor

When an action button needs to be placed on top of a color background or a visual, use the static color option. Static color action buttons are available in transparencies, or in solid black or solid white, and don't change shades or values depending upon the color theme. Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of the color theme.

Static color action buttons can appear in static white, regardless of color theme. The static color option allows for them to be placed on top of a custom background that is not part of a Spectrum color theme.

### isEmphasized

By default, action buttons are not emphasized. This is optimal for when an action button is not the core part of an interface, such as in application panels, where all the visual components are monochrome in order to direct focus to the content.

The emphasized action button has a blue background for its selected state in order to provide a visual prominence. This is optimal for when the selection should call attention, such as within a tool bar.

### isSelected

An action button can have a selected state to allow for toggling — not only for taking a direct action. This can be used to disclose parts of an interface, such as for showing or hiding panels or to switch between views (for example, grid or list views).

### isQuiet

By default, action buttons have a visible background. This style works best in a dense array of controls where the background helps to separate action buttons from the surrounding container, or to give visibility to isolated buttons.

Alternatively, quiet action buttons can have no visible background until they're interacted with. This style works best when a clear layout (vertical stack, table, grid) makes it easy to parse the buttons. Too many quiet components in a small space can be hard to read.

### size

Action buttons come in five different sizes: extra-small, small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

### icon

Use an icon only when necessary and when it has a strong association with the label text.

### hideLabel

The label can be hidden to create an icon-only action button. If the label is hidden, an icon is required, and the label will appear in a tooltip on hover.

### label

Action buttons should always have a label, unless they are only using an icon that is universally understood and accessible. They can have an optional icon, but it should not be used for decoration.

## States

| State          | Support status |
| -------------- | -------------- |
| Default        | Supported      |
| Hover          | Supported      |
| Down           | Supported      |
| Keyboard focus | Supported      |
| Disabled       | Supported      |
| Selected       | Supported      |
| Dragged        | Not supported  |
| Error          | Not supported  |

## Behaviors

### Text overflow

When the action button text is too long for the available horizontal space, it truncates at the end. The full text should be revealed with a tooltip on hover.

### Keyboard focus

An action button can be navigated using a keyboard. The keyboard focus state takes the button's visual hover state and adds a blue ring to the button in focus.

## Usage guidelines

### Use tooltips

Icon-only action buttons can be hard to identify. They should always show a tooltip upon hovering for a short period of time, displaying the name and possibly a keyboard shortcut.

### Isolated action buttons

If you have an icon-only or text-only isolated action button, use the standard style to make sure it's more easily identifiable as a button.

### Only group related actions with a hold icon

When using a hold icon to switch actions, only group the actions that are part of the same family. Don't group unrelated actions just for the sake of saving space.

### Respect hold icon placement

In left-to-right interfaces, the hold icon is always in the bottom right corner of the action button. It's a symbolic indicator that shows that a popover menu will appear on hold. Don't change the placement of the hold icon based on the design of the interface.

### When to use static black and static white

To ensure maximum contrast with the background, use static black for light backgrounds and images, and use static white for dark backgrounds and images. Avoid placing static components on top of busy images with a lot of variance in contrast.

### Selected state text color

The text color on the selected state of the over-background variant can be customized to match the background it's on. Use the background color for selected text when the action button is on a solid color, and is dark enough to meet a 4.5:1 contrast ratio with a white background (or black background, for the static black variant).

Use black text when the button is on top of an image, or if the background is too low-contrast to meet the 4.5:1 contrast ratio.

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

* [Action bar](/page/action-bar/)
* [Action group](/page/action-group/)
