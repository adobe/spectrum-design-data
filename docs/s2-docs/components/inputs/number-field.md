---
title: Number field
source_url: /web/rsp/components/number-field
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/number-field
swc_exists: false
---

# Number field

## Anatomy

number field label required asterisk, required text, or optional text field value validation marker or error icon stepper help text (help text or error message)

## Component options

hideStepper Number fields can have optional stepper buttons to the side of the field. Regardless of if a number field has these buttons or not, is should always accommodate arrow key shortcuts to increase or decrease the number. If true, hides in-field increment and decrement buttons (stepper). necessityIndicator and isRequired Number fields can be marked as optional or required, depending on the situation. For required number fields, there are two styling options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional number fields are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. isError A number field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. For this component, an incorrect value should typically revert back to either the previously entered number or to the default value, rather than showing an error. isDisabled A number field in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that the field may become available later. label and hideLabel Number fields should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden or omitted. When no visible label is present, the input must still expose an accessible name (for example, in HTML via "aria-label" or "aria-labelledby," and on other platforms via the platform's accessible-name mechanism). Number fields can show or hide the visible label. labelPosition Labels can be placed either on top or on the side,. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. size Number fields come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. value The value shows a user's entered text or a default value, plus the units of measurement, if applicable. errorMessage A number field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. The error message communicates an error for when the field requirements aren't met, prompting a user to adjust what they had originally input. If an error exists, the error icon always overrides the validation icon. When an error message is displayed, it replaces the help text. If an error exists, the error icon always overrides the validation icon. helpText A number field can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field. Help text is replaced by error messages when validation fails.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedFocus hoverSupportedFocus not hoverSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Minimum width

The minimum width for a number field is number-field-minimum-width-multiplier (without stepper) and number-field-with-stepper-minimum-width-[small/medium/large/extra-large] (with stepper). This minimum width guarantees that small number fields are readable and easy to interact with on touch devices.

### Text overflow

When the field label is too long for the available horizontal space, it wraps to form another line. The text inside the field truncates.

### Mixed value

When a number field presents multiple values that are not identical, the field should show an en dash (–).

### Help text and error message overflow

When the help text is too long for the available horizontal space, it wraps to form another line.

### Calculations

Number fields should always allow users to add, subtract, multiply, and divide, with the field automatically calculating the result.

### Units

Number fields can include units of measurement in the value. When focused or entering text, the units disappear. When scrolling, the units stay. If a user enters a unit that does not match the unit that the field requires, the field should automatically calculate a conversion and display the input value in the correct unit.

## Usage guidelines

### Choose default values for number fields

Choose a default value for a field to revert back to if an invalid entry is input. If a user enters a valid number and then enters an invalid number, revert to the most recent valid entry.

### Review label-less designs

Most number fields should have a label. A field without a label is ambiguous and not accessible. In rare cases where context is sufficient and a label could be absent, make sure to have the design reviewed and approved by an accessibility expert. These should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby").

### Follow capitalization rules

Labels for number fields should be in sentence case.

### Marking Required vs. Optional number fields in Forms

When labeling number fields in a form, only mark the minority type—either required or optional—to reduce visual clutter: If most number fields are optional, mark only the required ones (e.g., add an asterisk or "(required)"). If most number fields are required, mark only the optional ones (e.g., append "(optional)" to their labels). Important: Never use an asterisk to indicate an optional number field.

### Do not use placeholder text in number fields

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible, and should be avoided. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text. Instead of placeholder text, choose a default value to include in the field in default state. Use the help text description to convey requirements or to show any formatting examples that would help user comprehension.

### Use help text to show hints, formatting, and requirements

The description in the help text is flexible and encompasses a range of guidance. Sometimes this guidance is about what to input, and sometimes it's about how to input. This includes information such as: An overall description of the number field Hints for what kind of information needs to be input Specific formatting examples or requirements The help text's message should not simply restate the same information in the label in order to prompt someone to interact with it. Don't add help text if it isn't actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

### Switch help text with error text

The help text area also displays an error message. When a number field already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field. Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn't lost if one replaces the other like formatting requirements.

### Write error text that shows a solution

Write error messaging in a human-centered way by guiding a user and showing them a solution — don't simply state what's wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user. Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. Never end with an exclamation point. For number fields, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate.
