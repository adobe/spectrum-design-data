---

title: "Radio group"
source\_url: <https://s2.spectrum.corp.adobe.com/page/radio-group/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
  related\_components:
* radio-button
* rating
  parent\_category: inputs

---

# Radio group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Field | [group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-field-group--docs)                                                                                           |
| Spectrum Web Components SWC: Radio | \[Group]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/radio--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                | [RadioGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/radiogroup--docs)                                                                                              |

## Anatomy

```
radio group
- field label
- radio button area
- help text (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                          | Default value | Description |
| ------------------ | ------------------------------ | ------------- | ----------- |
| label              | string                         | –             |             |
| labelPosition      | top / side top                 | –             |             |
| orientation        | horizontal / vertical vertical | –             |             |
| size               | s / m / l / xl m               | –             |             |
| isEmphasized       | boolean                        | false         |             |
| necessityIndicator | text / icon icon               | –             |             |
| isRequired         | boolean                        | false         |             |
| isError            | boolean                        | false         |             |
| isDisabled         | boolean                        | false         |             |
| errorMessage       | string                         | –             |             |
| description        | string                         | –             |             |

## External links

Radio groups organize related radio buttons into a single selection set. Only one option can be selected at a time.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Radio groups should use help text for error messaging and descriptions. Descriptions are valuable for giving context behind why a selection is required, or for clarifying the options.

Radio groups can be marked as having an error to show that a selection needs to be made in order to move forward, or that a selection that was made is invalid. The error is indicated with negative help text, along with an icon.

A radio group in a disabled state shows that a selection exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later. The field label, radio buttons, and help text are all displayed in a disabled state when the radio group is disabled.

"Radio groups can be marked as optional or required, depending on the situation. For required radio groups, there are two styling options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include help text to explain what the asterisk means. Optional radio groups are either denoted with text added to the end of the label — “(optional)” — or have no indication at all."

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

By default, radio buttons are not emphasized (gray). This option is best for when the radio button is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content.

The emphasized (blue) version provides a visual prominence that is best for forms, settings, lists or grids of assets, and other situations where a radio button needs to be noticed.

"Radio groups come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

Radio groups can be either horizontal or vertical. By default, radio groups are vertical. Use a horizontal radio group when vertical space is limited.

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

Radio groups should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These radio groups without a visible label should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

A radio button can be navigated using a keyboard. The keyboard focus state takes the radio button’s visual hover state and adds a blue ring to the radio button in focus.

When the label is too long for the horizontal space available, it wraps to form another line.

When a radio button group presents multiple values that are not identical, the group should not show a selection. Any subsequent selection should update all values.

Emphasized radio group is optimal for forms, settings, and other scenarios where the radio group need to be noticed. Default radio group is optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

Radio buttons and checkboxes are not interchangeable. Radio buttons are best used for selecting a single option from a list of mutually exclusive options. Checkboxes are best used for selecting multiple options at once (or no options).

Radio groups should always have a label that clearly describes what the list of options represents. This is important for accessibility, since a screen reader will read the label before each option. Make sure to include a label, and don't assume that the options are self-explanatory without one. Write the label in sentence case.

Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode).

Switches are best for communicating activation (e.g., turning a setting on or off).

Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

## States

When the label is too long for the horizontal space available, it wraps to form another line.

Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode).

Switches are best for communicating activation (e.g., turning a setting on or off).

Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

## Behaviors

When the label is too long for the horizontal space available, it wraps to form another line.

Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode).

Switches are best for communicating activation (e.g., turning a setting on or off).

Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

## Usage guidelines

Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode).

Switches are best for communicating activation (e.g., turning a setting on or off).

Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

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

* [Radio button](/page/radio-button/)
* [Rating](/page/rating/)
