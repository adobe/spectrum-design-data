---

title: "Text area"
source\_url: <https://s2.spectrum.corp.adobe.com/page/text-area/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
  related\_components:
* tag-group
* text-field
  parent\_category: inputs

---

# Text area

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Text | [area](https://opensource.adobe.com/spectrum-css/?path=/docs/components-text-area--docs)                                                                                                    |
| Spectrum Web Components SWC:      | \[Textarea]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/textarea--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:               | [TextField](https://react-spectrum.adobe.com/s2/index.html?path=/docs/textfield--docs#text-area-example)                                                                                    |

## Anatomy

```
text area
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

| Property           | Value                                                                        | Default value | Description               |
| ------------------ | ---------------------------------------------------------------------------- | ------------- | ------------------------- |
| label              | string                                                                       | –             |                           |
| labelPosition      | top / side top                                                               | –             |                           |
| hideLabel          | boolean                                                                      | false         |                           |
| value              | string                                                                       | –             | from minValue to maxValue |
| width              | number                                                                       | –             |                           |
| size               | s / m / l / xl m                                                             | –             |                           |
| necessityIndicator | text / icon icon                                                             | –             |                           |
| isRequired         | boolean                                                                      | false         |                           |
| hasCharacterCount  | boolean                                                                      | false         |                           |
| showValidIcon      | boolean                                                                      | false         |                           |
| isError            | boolean                                                                      | false         |                           |
| isDisabled         | boolean                                                                      | false         |                           |
| hideDragIcon       | boolean                                                                      | false         |                           |
| height             | number – If undefined, height is dynamic and grows with input                | text.         |                           |
| helpText           | string                                                                       | –             |                           |
| errorMessage       | string                                                                       | –             |                           |
| inputType          | text / url / phone / email / password text                                   | –             |                           |
| state              | default / hover / focus + hover / focus + not hover / keyboard focus default | –             |                           |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

The value shows a user’s entered text.

The text area’s default width is field-default-width-\[small/medium/large/extra-large].

"Text areas come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

"Text areas can be marked as optional or required, depending on the situation. For required text areas, there are two styling options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional text areas are either denoted with text added to the end of the label — “(optional)” — or have no indication at all."

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

Text areas can show a character count when input must stay under a set limit. This indicator can appear alongside others, such as validation icons or “optional” and “required” labels.

Text areas can show a validation icon when input must follow a specific format, such as an email or credit card number. The icon appears as soon as the entry is valid.

A text area can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. If an error exists, the error icon always overrides the validation icon.

A text area in a disabled state shows that the input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a text area may become available later.

If the height is defined, text areas can either be a static size or can be resizable with a drag icon in the bottom right corner. The drag icon should be hidden if the fixed variant is turned off, or if the text area should not be resizable.

When defined as fixed (either by the development team or by the end user via the dragIcon), users can scroll inside the field.

A text area can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field.

A text area can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. The error message communicates an error for when the field requirements aren’t met, prompting a user to adjust what they had originally input. If an error exists, the error icon always overrides the validation icon.

A text area can have multiple input types, depending on the need and use case. Text areas have a text input type by default.

"Use these input types for the following use cases:"

When typing into a text area and reaching the end of the field on a number-height text area, the cursor should remain as static in the bottom right corner (for left-to-right languages) while text above it overflows through the top of the field. When the field loses focus, text should overflow through the bottom of the text area, showing the beginning of the text.

When a text area presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Every text area should have a label. A text area without a label is ambiguous and not accessible.

Text area labels and placeholder text should be written in sentence case.

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form. If most of the text fields are optional, only the required fields should be give an asterisk or have labels appended with “(required)”. If most of the text fields are required, only the optional fields should be appended with “(optional)”. An asterisk should never be used to note that a text area is optional.

"The description in the help text is flexible and encompasses a range of guidance. Sometimes this guidance is about what to input, and sometime it’s about how to input. This includes information such as:"

The help text’s message should not simply restate the same information in the label in order to prompt someone to interact with it. Don’t add help text if it isn’t actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text.

Instead of placeholder text, use the help text description to convey requirements or to show any formatting examples that would help user comprehension. If there's placeholder text and help text at the same time, it becomes redundant and distracting, especially if they're communicating the same thing.

The help text area also displays an error message. When a text area already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field.

Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn’t lost if one replaces the other like minimum requirements.

Write error messaging in a human-centered way by guiding a user and showing them a solution — don’t simply state what’s wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user.

"Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For text areas, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a required field that asks for their interests, write the error text like you’re offering a hint or a tip to help guide them to understand what needs to go in the missing field: “Enter at least one interest.”"

## States

When a text area presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Every text area should have a label. A text area without a label is ambiguous and not accessible.

Text area labels and placeholder text should be written in sentence case.

## Behaviors

When a text area presents multiple values that are not identical, the field should show an en dash (–).

When the help text is too long for the available horizontal space, it wraps to form another line.

Every text area should have a label. A text area without a label is ambiguous and not accessible.

Text area labels and placeholder text should be written in sentence case.

## Usage guidelines

Every text area should have a label. A text area without a label is ambiguous and not accessible.

Text area labels and placeholder text should be written in sentence case.

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

* [Tag group](/page/tag-group/)
* [Text field](/page/text-field/)
