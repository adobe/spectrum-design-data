---
title: "Number field"
source_url: https://s2.spectrum.corp.adobe.com/page/number-field/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- form
  related\_components:
- help-text
- picker
  parent\_category: inputs

---

# Number field

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                            | Link                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) Not         | \[available]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/number-field--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| Spectrum Web Components SWC: Number | \[Field]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/number-field--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)>     |
| React Spectrum RSP:                 | [NumberField](https://react-spectrum.adobe.com/s2/index.html?path=/docs/numberfield--docs)                                                                                                       |

## Anatomy

```
number field
- label
- required asterisk, required text, or optional text
- field
- value
- validation marker or error icon
- stepper
- help text (help text or error message)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                                                       | Default value | Description                                                        |
| ------------------ | ----------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| label              | string                                                      | –             |                                                                    |
| size               | s / m / l / xl m                                            | –             |                                                                    |
| labelPosition      | top / side top                                              | –             |                                                                    |
| hideLabel          | boolean                                                     | false         |                                                                    |
| state              | default / hover / focus + hover / focus + not hover default | –             |                                                                    |
| isDisabled         | boolean                                                     | false         |                                                                    |
| isError            | boolean                                                     | false         |                                                                    |
| isRequired         | boolean                                                     | false         |                                                                    |
| necessityIndicator | text / icon icon                                            | –             |                                                                    |
| hideStepper        | boolean                                                     | false         | If true, hides in-field increment and decrement buttons (stepper). |

## External links

Number fields accept numeric inputs and allow values to be incremented or decremented. They are commonly used when a defined range or step value is required.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Number fields can have optional stepper buttons to the side of the field. Regardless of if a number field has these buttons or not, is should always accommodate arrow key shortcuts to increase or decrease the number.

If true, hides in-field increment and decrement buttons (stepper).

"Number fields can be marked as optional or required, depending on the situation. For required number fields, there are two styling options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional number fields are either denoted with text added to the end of the label — “(optional)” — or have no indication at all."

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

A number field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. For this component, an incorrect value should typically revert back to either the previously entered number or to the default value, rather than showing an error.

A number field in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that the field may become available later.

Number fields should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden or omitted. When no visible label is present, the input must still expose an accessible name (for example, in HTML via “aria-label” or “aria-labelledby,” and on other platforms via the platform’s accessible-name mechanism).

Number fields can show or hide the visible label.

Labels can be placed either on top or on the side,. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

"Number fields come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

The value shows a user’s entered text or a default value, plus the units of measurement, if applicable.

A number field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. The error message communicates an error for when the field requirements aren’t met, prompting a user to adjust what they had originally input. If an error exists, the error icon always overrides the validation icon.

When an error message is displayed, it replaces the help text. If an error exists, the error icon always overrides the validation icon.

A number field can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field.

Help text is replaced by error messages when validation fails.

When the field label is too long for the available horizontal space, it wraps to form another line. The text inside the field truncates.

When a number field presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Number fields should always allow users to add, subtract, multiply, and divide, with the field automatically calculating the result.

Number fields can include units of measurement in the value. When focused or entering text, the units disappear. When scrolling, the units stay. If a user enters a unit that does not match the unit that the field requires, the field should automatically calculate a conversion and display the input value in the correct unit.

Choose a default value for a field to revert back to if an invalid entry is input. If a user enters a valid number and then enters an invalid number, revert to the most recent valid entry.

Most number fields should have a label. A field without a label is ambiguous and not accessible. In rare cases where context is sufficient and a label could be absent, make sure to have the design reviewed and approved by an accessibility expert. These should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

Labels for number fields should be in sentence case.

"When labeling number fields in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional number field."

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible, and should be avoided. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text.

Instead of placeholder text, choose a default value to include in the field in default state. Use the help text description to convey requirements or to show any formatting examples that would help user comprehension.

The help text’s message should not simply restate the same information in the label in order to prompt someone to interact with it. Don’t add help text if it isn’t actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

The help text area also displays an error message. When a number field already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field.

Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn’t lost if one replaces the other like formatting requirements.

Write error messaging in a human-centered way by guiding a user and showing them a solution — don’t simply state what’s wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user.

Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. Never end with an exclamation point. For number fields, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate.

## States

When the field label is too long for the available horizontal space, it wraps to form another line. The text inside the field truncates.

When a number field presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Number fields should always allow users to add, subtract, multiply, and divide, with the field automatically calculating the result.

Labels for number fields should be in sentence case.

"When labeling number fields in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional number field."

## Behaviors

When the field label is too long for the available horizontal space, it wraps to form another line. The text inside the field truncates.

When a number field presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Number fields should always allow users to add, subtract, multiply, and divide, with the field automatically calculating the result.

Labels for number fields should be in sentence case.

"When labeling number fields in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional number field."

## Usage guidelines

Labels for number fields should be in sentence case.

"When labeling number fields in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional number field."

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

* [Help text](/page/help-text/)
* [Picker](/page/picker/)
