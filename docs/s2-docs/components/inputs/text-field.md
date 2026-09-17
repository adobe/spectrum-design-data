---
title: Text field
source_url: /web/rsp/components/text-field
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/text-field
swc_exists: false
---

# Text field

## Anatomy

text field label required asterisk, required text, or optional text character count field value validation marker or error icon help text (help text or error message)

## Component options

label and hideLabel Text fields should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden or omitted. When no visible label is present, the input must still expose an accessible name (for example, in HTML via "aria-label" or "aria-labelledby," and on other platforms via the platform's accessible-name mechanism). labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. value The value shows a user's entered text. width The text field's default width is field-default-width-[small/medium/large/extra-large]. size Text fields come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. isRequired and necessityIndicator Text fields can be marked as optional or required, depending on the situation. For required text fields, there are two styling options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional text fields are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. hasCharacterCount Text fields can display a character count indicator when the length of the text entry needs to be kept under a predefined value. Character count indicators can be used in conjunction with other indicators (validation icon, "optional" or "required" indicators) when necessary. showValidIcon Text fields can display a validation icon when the text entry is expected to conform to a specific format such as email address, credit card number, password creation requirements, and many more. The icon appears as soon as a user types a valid entry in the field. isError A text field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. If an error exists, the error icon always overrides the validation icon. isDisabled A text field in a disabled state shows that an text field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a field may become available later. helpText A text field can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field. errorMessage A text field can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. The error message communicates an error for when the field requirements aren't met, prompting a user to adjust what they had originally input. If an error exists, the error icon always overrides the validation icon.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedFocus hoverSupportedFocus not hoverSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Minimum width

The minimum width for a text field is 1.5 × the height of the field. This minimum width guarantees that small text fields are readable and easy to target on touch devices.

### Text overflow

When the field label is too long for the available horizontal space, it wraps to form another line. The field text itself truncates.

### Mixed value

When a text field presents multiple values that are not identical, the field should show an en dash (–).

### Help text overflow

When the help text is too long for the available horizontal space, it wraps to form another line.

## Usage guidelines

### Include a label

Every text field should have a label. A field without a label is ambiguous and not accessible.

### Review label-less designs

In rare cases where context is sufficient and a label could be absent, make sure to have the design reviewed and approved by an accessibility expert. These should still include an aria-label in HTML (depending on the context, aria-label or aria-labelledby ).

### Follow capitalization rules

Field labels should be in sentence case.

### Mark the minority of text fields in a form as required or optional

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form. If most of the text fields are optional, only the required fields should be give an asterisk or have labels appended with "(required)". If most of the text fields are required, only the optional fields should be appended with "(optional)". An asterisk should never be used to note that a text field is optional.

### Use help text to show hints, formatting, and requirements

The description in the help text is flexible and encompasses a range of guidance. Sometimes this guidance is about what to input, and sometime it's about how to input. This includes information such as: An overall description of the input field Hints for what kind of information needs to be input Specific formatting examples or requirements The help text's message should not simply restate the same information in the label in order to prompt someone to interact with it. Don't add help text if it isn't actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

### Don't use placeholder text

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text. Instead, use the help text description to convey requirements or to show any formatting examples that would help user comprehension. If there's placeholder text and help text at the same time, it becomes redundant and distracting, especially if they're communicating the same thing.

### Switch help text with error text

The help text area also displays an error message. When a text field already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field. Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn't lost if one replaces the other like password requirements.

### Write error text that shows a solution

Write error messaging in a human-centered way by guiding a user and showing them a solution — don't simply state what's wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user. Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For text fields, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a required field that asks for their email address, write the error text like you're offering a hint or a tip to help guide them to understand what needs to go in the missing field: "Enter your email address."

## Internationalization

### RTL

In right‑to‑left languages, the text‑field layout is mirrored. The label is right‑aligned, and elements such as the character count, validation marker and error icon are left‑aligned. Keep in mind that some content, including email addresses, does not change direction or translate.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into a text field moves focus into the field and selects the existing text.Shift + TabMoves focus to the previous focusable element.Printable charactersInserts text at the caret position.Left / Right ArrowMoves caret one character left/right.Home / EndMoves caret to start/end of field value.Backspace / DeleteRemoves character before/after caret.Ctrl / Cmd + ASelects all text.EnterSubmits the enclosing form or triggers the form’s default action (implementation/context dependent).

### Cursor guidelines

Cursor Description TextUse over the field to indicate to the user that text is editable within the field.PointerAny clickable control that is part of the text field (e.g., clear/reveal/help icon) uses the pointer cursor.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons used inside text fields (e.g., validation, clear, or affordance icons), must provide a text alternative that communicates their purpose. All text fields need an accessible name so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAText fields and their labels, descriptions, and error messages should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Resize text 1.4.4 AAText fields can be resized up to 200% without loss of content or functionality and without assistive technology.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of illustrations, icons, and component states have a contrast ratio of at least 3:1. Not applicable for empty fields.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
