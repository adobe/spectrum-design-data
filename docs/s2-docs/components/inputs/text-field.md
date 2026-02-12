---
title: "Text field"
source_url: https://s2.spectrum.corp.adobe.com/page/text-field/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- form
related_components:
- text-area
- thumbnail
parent_category: inputs

---

# Text field

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Text | [field](https://opensource.adobe.com/spectrum-css/?path=/docs/components-text-field--docs)                                                                                                    |
| Spectrum Web Components SWC:      | \[Textfield]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/textfield--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:               | [TextField](https://react-spectrum.adobe.com/s2/index.html?path=/docs/textfield--docs)                                                                                                        |

## Anatomy

```
text field
- label
- required asterisk, required text, or optional text
- character count
- field
- value
- validation marker or error icon
- help text (help text or error message)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                                                                        | Default value | Description                                                    |
| ------------------ | ---------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| label              | string                                                                       | –             |                                                                |
| labelPosition      | top / side top                                                               | –             |                                                                |
| hideLabel          | boolean                                                                      | false         |                                                                |
| value              | string                                                                       | –             | from minValue to maxValue                                      |
| width              | number                                                                       | –             |                                                                |
| size               | s / m / l / xl m                                                             | –             |                                                                |
| necessityIndicator | text / icon icon                                                             | –             |                                                                |
| isRequired         | boolean                                                                      | false         |                                                                |
| hasCharacterCount  | boolean                                                                      | false         |                                                                |
| showValidIcon      | boolean                                                                      | false         |                                                                |
| isError            | boolean                                                                      | false         | If there is an error, this property overrides show valid icon. |
| isDisabled         | boolean                                                                      | false         |                                                                |
| helpText           | string                                                                       | –             |                                                                |
| errorMessage       | string                                                                       | –             |                                                                |
| state              | default / hover / focus + hover / focus + not hover / keyboard focus default | –             |                                                                |

## External links

Text fields collect custom text input. They can display optional cues to indicate formatting, validation, or other input requirements.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Text fields should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden or omitted. When no visible label is present, the input must still expose an accessible name (for example, in HTML via “aria-label” or “aria-labelledby,” and on other platforms via the platform’s accessible-name mechanism).

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

The value shows a user’s entered text.

The text field’s default width is field-default-width-\[small/medium/large/extra-large].

"Text fields come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

"Text fields can be marked as optional or required, depending on the situation. For required text fields, there are two styling options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional text fields are either denoted with text added to the end of the label — “(optional)” — or have no indication at all."

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

Text fields can display a character count indicator when the length of the text entry needs to be kept under a predefined value. Character count indicators can be used in conjunction with other indicators (validation icon, “optional” or “required” indicators) when necessary.

Text fields can display a validation icon when the text entry is expected to conform to a specific format such as email address, credit card number, password creation requirements, and many more. The icon appears as soon as a user types a valid entry in the field.

A text field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. If an error exists, the error icon always overrides the validation icon.

A text field in a disabled state shows that an text field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a field may become available later.

A text field can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field.

A text field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. The error message communicates an error for when the field requirements aren’t met, prompting a user to adjust what they had originally input. If an error exists, the error icon always overrides the validation icon.

The minimum width for a text field is 1.5 × the height of the field. This minimum width guarantees that small text fields are readable and easy to target on touch devices.

When the field label is too long for the available horizontal space, it wraps to form another line. The field text itself truncates.

When a text field presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Every text field should have a label. A field without a label is ambiguous and not accessible.

Field labels should be in sentence case.

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form. If most of the text fields are optional, only the required fields should be give an asterisk or have labels appended with “(required)”. If most of the text fields are required, only the optional fields should be appended with “(optional)”. An asterisk should never be used to note that a text field is optional.

The help text’s message should not simply restate the same information in the label in order to prompt someone to interact with it. Don’t add help text if it isn’t actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text.

Instead, use the help text description to convey requirements or to show any formatting examples that would help user comprehension. If there's placeholder text and help text at the same time, it becomes redundant and distracting, especially if they're communicating the same thing.

The help text area also displays an error message. When a text field already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field.

Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn’t lost if one replaces the other like password requirements.

Write error messaging in a human-centered way by guiding a user and showing them a solution — don’t simply state what’s wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user.

"Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For text fields, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a required field that asks for their email address, write the error text like you’re offering a hint or a tip to help guide them to understand what needs to go in the missing field: “Enter your email address.”"

## States

When the field label is too long for the available horizontal space, it wraps to form another line. The field text itself truncates.

When a text field presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Every text field should have a label. A field without a label is ambiguous and not accessible.

Field labels should be in sentence case.

## Behaviors

When the field label is too long for the available horizontal space, it wraps to form another line. The field text itself truncates.

When a text field presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Every text field should have a label. A field without a label is ambiguous and not accessible.

Field labels should be in sentence case.

## Usage guidelines

Every text field should have a label. A field without a label is ambiguous and not accessible.

Field labels should be in sentence case.

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

* [Text area](/page/text-area/)
* [Thumbnail](/page/thumbnail/)
