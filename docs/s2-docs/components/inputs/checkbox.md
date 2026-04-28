---
title: "Checkbox"
source_url: https://s2.spectrum.corp.adobe.com/page/checkbox/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- form
related_components:
- calendar
- checkbox-group
parent_category: inputs

---

# Checkbox

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Field | [group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-field-group--docs)                                                                                                 |
| Spectrum Web Components SWC: Field | \[Group]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/field-group--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                | [Checkbox](https://react-spectrum.adobe.com/s2/index.html?path=/docs/checkbox--docs)                                                                                                        |

## Anatomy

```
checkbox
- control
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property        | Value                                           | Default value | Description                                                                   |
| --------------- | ----------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| label           | string                                          | –             | When the label is not defined, the checkbox appears as a standalone checkbox. |
| isSelected      | boolean                                         | false         |                                                                               |
| isIndeterminate | boolean                                         | false         | When a checkbox is indeterminate, it overrides the selection state.           |
| size            | s / m / l / xl m                                | –             |                                                                               |
| isEmphasized    | boolean                                         | false         |                                                                               |
| isDisabled      | boolean                                         | false         |                                                                               |
| isError         | boolean                                         | false         |                                                                               |
| state           | default / hover / down / keyboard focus default | –             |                                                                               |

## External links

Checkboxes support selecting one or more items from a list. Each item can be selected independently or in combination with others.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Checkboxes can be marked as having an error to show that a selection needs to be made in order to move forward, or that a selection that was made is invalid. For example, in a form that requires a user to acknowledge legal terms before proceeding, the checkbox would show an unchecked error to communicate that it needs to be selected.

A checkbox in a disabled state shows that a selection exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later.

By default, checkboxes are not emphasized (gray). This version is optimal for when the checkbox is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content.

The emphasized (blue) version provides a visual prominence that is optimal for forms, settings, lists or grids of assets, and other situations where a checkbox need to be noticed.

"Checkboxes come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

Checkboxes can be in an indeterminate state when they represent both selected and not selected values.

Checkboxes can be selected or not selected.

Checkboxes should always have a label. When the label is not defined, a checkbox becomes standalone. Standalone checkboxes are only used when their connection to other components is clear and they give sufficient context — for example, in application panels.

A checkbox can be navigated using a keyboard. The keyboard focus state takes the checkbox’s visual hover state and adds a blue ring to the checkbox in focus.

When the label is too long for the horizontal space available, it wraps to form another line.

Emphasized checkboxes are optimal for forms, settings, etc. where the checkboxes need to be noticed, or to bring attention to selected items such as cards or table rows. Not emphasized checkboxes are optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

Standalone checkboxes should be used in situations where the context is clear without an associated text label. An example of this would be when a checkbox is connected to other controls inside of a panel.

Checkboxes and radio buttons are not interchangeable. A set of checkboxes should be used to select as many options as desired (or none). A set of radio buttons should be used to select only a single option from a list of mutually exclusive options.

Use checkboxes to show selection, such as choosing multiple table rows. Use switches to show activation, like turning a setting on or off. Unlike switches, checkboxes can display an error state.

Sets of checkboxes should always have a clear label that describes what the list of options represents and guides users what to do. This is important for accessibility, since a screen reader will read the label before each option.

When a checkbox represents multiple values that are not identical, the checkbox should appear in the indeterminate state. Any subsequent click or tap should select the checkbox, and update all values to be selected. Another click or tap after that should deselect the checkbox, and update all values to be not selected.

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

* [Calendar](/page/calendar/)
* [Checkbox group](/page/checkbox-group/)
