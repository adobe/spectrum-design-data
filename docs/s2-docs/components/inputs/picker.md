---
title: "Picker"
source_url: https://s2.spectrum.corp.adobe.com/page/picker/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- number-field
- radio-button
parent_category: inputs

---

# Picker

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Picker](https://opensource.adobe.com/spectrum-css/?path=/docs/components-picker--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Picker]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/picker--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Picker](https://react-spectrum.adobe.com/s2/index.html?path=/docs/picker--docs)                                                                                                        |

## Anatomy

```
picker
- label
- required asterisk, required text, or optional text
- field
- placeholder or value
- error icon
- chevron
- help text (help text or error message)
- menuContainer
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                                                                        | Default value | Description |
| ------------------ | ---------------------------------------------------------------------------- | ------------- | ----------- |
| label              | string                                                                       | –             |             |
| labelPosition      | top / side top                                                               | –             |             |
| placeholder        | string                                                                       | –             |             |
| value              | string                                                                       | –             |             |
| width              | number – Not applicable to quiet                                             | picker.       |             |
| size               | s / m / l / xl m                                                             | –             |             |
| isQuiet            | boolean                                                                      | false         |             |
| necessityIndicator | text / icon icon                                                             | –             |             |
| isRequired         | boolean                                                                      | false         |             |
| menuContainer      | popover / tray popover                                                       | –             |             |
| isDisabled         | boolean                                                                      | false         |             |
| isError            | boolean                                                                      | false         |             |
| description        | string                                                                       | null          |             |
| errorMessage       | string                                                                       | null          |             |
| state              | default / hover / focus + hover / focus + not hover / keyboard focus default | –             |             |

## External links

Pickers present a list of options in a compact format for selection. They’re sometimes called “dropdowns” or “selects,” and the available options may change based on context.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

The error message communicates an error for when the selection requirements aren’t met, prompting a user to adjust what they had originally selected.

A picker can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field.

A picker can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid.

A picker in a disabled state shows that an input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that it may become available later.

The picker menu is a menu element that is used to display the options for the picker. A picker menu can include menu items, menu dividers, and menu groups. A picker menu should never contain submenus, as doing so would render it inaccessible.

"For required pickers, you have two options:"

"For optional pickers, you have two options:"

By default, pickers have a visible background. This style works best in a dense array of controls where the background helps to separate the input from the surrounding container, or to give visibility to isolated buttons.

Alternatively, quiet pickers can have no visible background. This style works best when a clear layout (vertical stack, table, grid) makes it easy to parse the buttons. Too many quiet components in a small space can be hard to read.

"Pickers come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

The width of a picker can be customized appropriately for its context. This option is not applicable to quiet pickers.

The value shows the option that a user has selected.

Placeholder text provides hints about expected input values. It disappears once a user selects an option.

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

Pickers should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These pickers without a visible label should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

When the field label and menu text are too long for the available horizontal space, they wrap to form another line. The field text itself truncates at the end, but the text can be shown in full in the menu.

When the help or error text is too long for the available horizontal space, it wraps to form another line.

The picker menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

Every picker should have a label. A picker without a label is ambiguous and not accessible.

In rare cases where context is sufficient and a label could be absent, make sure to have the design reviewed and approved by an accessibility expert. These should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

Keep menu items short and concise. Long menu items that cause text to wrap to multiple lines are discouraged. If text wrapping becomes a frequent concern, consider revising the text or use alternative UI patterns that will give your content more space.

When possible, the field button width should be wide enough so that any chosen menu items can be displayed in full.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling pickers in a form, only mark the minority type — either required or optional — to reduce visual clutter:"

Never use an asterisk to indicate an optional picker.

"A picker’s description in the help text is can communicate what to select or how to select an option. This includes information such as:"

The help text’s message should not simply restate the same information in the label in order to prompt someone to interact with a picker. Don’t add help text if it isn’t actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

The help text area also displays an error message. When a picker already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the picker.

Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to complete the interaction. Error text tells a user how to fix the error by re-stating the selection requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn’t lost if one replaces the other like minimum requirements.

Write error messaging in a human-centered way by guiding a user and showing them a solution — don’t simply state what’s wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user.

"Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For pickers, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss selecting an option to note as their preferred contact method, write the error text like you’re offering a hint or a tip to help guide them to understand what needs to be selected: “Select a contact method.”"

Placeholder text provides hints about expected input values. When implemented properly, it enhances usability without compromising accessibility.

"Placeholder text:"

## States

When the help or error text is too long for the available horizontal space, it wraps to form another line.

The picker menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

Every picker should have a label. A picker without a label is ambiguous and not accessible.

When possible, the field button width should be wide enough so that any chosen menu items can be displayed in full.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling pickers in a form, only mark the minority type — either required or optional — to reduce visual clutter:"

Never use an asterisk to indicate an optional picker.

"A picker’s description in the help text is can communicate what to select or how to select an option. This includes information such as:"

Placeholder text provides hints about expected input values. When implemented properly, it enhances usability without compromising accessibility.

"Placeholder text:"

## Behaviors

When the help or error text is too long for the available horizontal space, it wraps to form another line.

The picker menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

Every picker should have a label. A picker without a label is ambiguous and not accessible.

When possible, the field button width should be wide enough so that any chosen menu items can be displayed in full.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling pickers in a form, only mark the minority type — either required or optional — to reduce visual clutter:"

Never use an asterisk to indicate an optional picker.

"A picker’s description in the help text is can communicate what to select or how to select an option. This includes information such as:"

Placeholder text provides hints about expected input values. When implemented properly, it enhances usability without compromising accessibility.

"Placeholder text:"

## Usage guidelines

Every picker should have a label. A picker without a label is ambiguous and not accessible.

When possible, the field button width should be wide enough so that any chosen menu items can be displayed in full.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling pickers in a form, only mark the minority type — either required or optional — to reduce visual clutter:"

Never use an asterisk to indicate an optional picker.

"A picker’s description in the help text is can communicate what to select or how to select an option. This includes information such as:"

Placeholder text provides hints about expected input values. When implemented properly, it enhances usability without compromising accessibility.

"Placeholder text:"

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

* [Number field](/page/number-field/)
* [Radio button](/page/radio-button/)
