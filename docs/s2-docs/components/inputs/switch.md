---
title: "Switch"
source_url: https://s2.spectrum.corp.adobe.com/page/switch/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
  related\_components:
- swatch-group
- tag
  parent\_category: inputs

---

# Switch

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Switch](https://opensource.adobe.com/spectrum-css/?path=/docs/components-switch--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Switch]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/switch--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Switch](https://react-spectrum.adobe.com/s2/index.html?path=/docs/switch--docs)                                                                                                        |

## Anatomy

```
switch
- track
- handle
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property     | Value                                           | Default value | Description |
| ------------ | ----------------------------------------------- | ------------- | ----------- |
| label        | string                                          | –             |             |
| isSelected   | boolean                                         | false         |             |
| size         | s / m / l / xl m                                | –             |             |
| isEmphasized | boolean                                         | false         |             |
| isDisabled   | boolean                                         | false         |             |
| isReadOnly   | boolean                                         | false         |             |
| state        | default / hover / down / keyboard focus default | –             |             |

## External links

Switches toggle an individual option on or off. They're typically used to activate or deactivate a specific setting.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Switch should always have a label for accessibility and clear comprehension. When the label is not defined, a switch becomes standalone. Standalone switches should only be used when their connection to other components is clear and they give sufficient context — for example, in application panels.

Switches can either be selected or not selected. They cannot be in an indeterminate state (unlike checkboxes). When a switch represents multiple values that are not identical, the switch should appear as not selected.

"Switch come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

By default, switches are not emphasized (gray). This version is optimal for when the switch is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content.

The emphasized (blue) version provides a visual prominence that is optimal for forms, settings, lists or grids of assets, and other situations where a switch needs to be noticed.

A switch in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later.

Switches have a read-only option for when they’re in the disabled state but still need their labels to be shown. This allows for content to be copied, but not interacted with or changed.

A switch can be navigated using a keyboard. The keyboard focus state takes the switch’s visual hover state and adds a blue ring to the switch in focus.

When the label is too long for the horizontal space available, it wraps to form another line.

Emphasized switches are optimal for forms, settings, and other scenarios where the switches need to be noticed. Not emphasized switches are optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

Standalone switches should be used in situations where the context is clear without an associated text label. For example, a switch located at the top of a panel next to the panel's title makes it clear that the switch will enable/disable the panel options.

Switches are best for communicating activation (e.g., turning a setting on or off). Checkboxes are best for communicating selection (e.g., selecting multiple items from a list). Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode).

When a switch represents multiple values that are not identical, the switch should appear as not selected. Any subsequent click or tap should select the switch, and update all values to be selected. Another click or tap after that should deselect the switch, and update all values to be not selected.

Switches can only be on or off. Indeterminate switches don’t exist in accessibility APIs, so it’s not possible to make an indeterminate switch accessible. If you need to show a partial state, use a checkbox instead of a switch.

When a parent switch represents a group of switches, it should be turned off unless all of the switches are on (turning the parent switch on turns all of the switches on).

## States

When the label is too long for the horizontal space available, it wraps to form another line.

## Behaviors

When the label is too long for the horizontal space available, it wraps to form another line.

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

* [Swatch group](/page/swatch-group/)
* [Tag](/page/tag/)
