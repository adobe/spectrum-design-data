---

title: "Radio button"
source\_url: <https://s2.spectrum.corp.adobe.com/page/radio-button/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
* action
* button
* interactive
  related\_components:
* picker
* radio-group
  parent\_category: inputs

---

# Radio button

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Radio](https://opensource.adobe.com/spectrum-css/?path=/docs/components-radio--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Radio]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/radio--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [RadioGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/radiogroup--docs)                                                                                              |

## Anatomy

```
radio button
- control
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property     | Value                                           | Default value | Description                                |
| ------------ | ----------------------------------------------- | ------------- | ------------------------------------------ |
| state        | default / hover / down / keyboard focus default | –             |                                            |
| isSelected   | boolean                                         | false         |                                            |
| isEmphasized | boolean                                         | false         |                                            |
| label        | string                                          | –             | The text displayed next to a radio button. |

## External links

Radio buttons present a list of options where only one can be selected at a time. They are styled consistently with other components that support binary selection. Use when all options should be visible and only one can apply.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Radio button should always have a label for accessibility and clear comprehension. When the label is not defined, a radio button becomes standalone. Standalone radio buttons should only be used when their connection to other components is clear and they give sufficient context — for example, in application panels.

By default, radio buttons are not emphasized. This version is optimal for when the radio button is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content.

The emphasized version provides a visual prominence that is optimal for forms, settings, lists or grids of assets, and other situations where a radio button needs to be noticed.

Radio button can either be selected or not selected. They cannot be in an indeterminate state (unlike checkboxes).

"Radio buttons come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

A radio button can be navigated using a keyboard. The keyboard focus state takes the radio button’s visual hover state and adds a blue ring to the radio button in focus.

When the button text is too long for the horizontal space available, it wraps to form another line.

Radio buttons are best when only one option can be selected at a time from a set (for example choosing one preference or mode). Switches are best for communicating activation (e.g., turning a setting on or off). Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

Emphasized radio buttons are optimal for forms, settings, and other scenarios where the radio buttons need to be noticed. Default radio buttons are optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

Radio buttons can only be on or off. Indeterminate radio buttons don’t exist in accessibility APIs, so it’s not possible to make an indeterminate radio button accessible. If you need to show a partial state, use a checkbox instead of a radio button. When a parent radio button represents a group of radio buttons, it should be turned off unless all of the radio buttons are on (turning the parent radio button on turns all of the radio buttons on).

## States

When the button text is too long for the horizontal space available, it wraps to form another line.

## Behaviors

When the button text is too long for the horizontal space available, it wraps to form another line.

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

* [Picker](/page/picker/)
* [Radio group](/page/radio-group/)
