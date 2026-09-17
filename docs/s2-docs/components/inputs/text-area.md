---
title: Text area
source_url: /web/rsp/components/text-area
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/text-area
swc_exists: false
---

# Text area

## Anatomy

text area label required asterisk, required text, or optional text character count field value validation marker or error icon help text (help text or error message)

## Component options

label and hideLabel Text areas should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden or omitted. When no visible label is present, the input must still expose an accessible name (for example, in HTML via aria-label or aria-labelledby, and on other platforms via the platform's accessible-name mechanism). labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. value The value shows a user's entered text. width The text area's default width is field-default-width-[small/medium/large/extra-large]. size Text areas come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. isRequired and necessityIndicator Text areas can be marked as optional or required, depending on the situation. For required text areas, there are two styling options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional text areas are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. hasCharacterCount Text areas can show a character count when input must stay under a set limit. This indicator can appear alongside others, such as validation icons or "optional" and "required" labels. showValidIcon Text areas can show a validation icon when input must follow a specific format, such as an email or credit card number. The icon appears as soon as the entry is valid. isError A text area can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. If an error exists, the error icon always overrides the validation icon. isDisabled A text area in a disabled state shows that the input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a text area may become available later. hideDragIcon If the height is defined, text areas can either be a static size or can be resizable with a drag icon in the bottom right corner. The drag icon should be hidden if the fixed variant is turned off, or if the text area should not be resizable. height If undefined, height is dynamic and grows with input text. The maximum height of the element via the maxHeight property. When defined as fixed (either by the development team or by the end user via the dragIcon), users can scroll inside the field. helpText A text area can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field. errorMessage A text area can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. The error message communicates an error for when the field requirements aren't met, prompting a user to adjust what they had originally input. If an error exists, the error icon always overrides the validation icon. inputType A text area can have multiple input types, depending on the need and use case. Text areas have a text input type by default. Use these input types for the following use cases: Text defines a single-line text field. URL defines a field for entering a URL. Telephone defines a field for entering a telephone number. Email defines a field for entering an email address. Password defines a password field. As a user enters a value, the text changes to dots.

## States

State Support status DefaultSupportedHoverSupportedDownNot SupportedFocus hoverSupportedFocus not hoverSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedSupportedErrorSupported

## Behaviors

### Minimum width

Text areas are ideal for long sentences or paragraphs, and should comfortably accommodate larger amounts of text. They should have a minimum height of text-area-minimum-height (when the height of the text area is a defined number). The minimum width is field-default-width-[small/medium/large/extra-large].

### Text overflow

When typing into a text area and reaching the end of the field on a number-height text area, the cursor should remain as static in the bottom right corner (for left-to-right languages) while text above it overflows through the top of the field. When the field loses focus, text should overflow through the bottom of the text area, showing the beginning of the text.

### Mixed value

When a text area presents multiple values that are not identical, the field should show an en dash (–).

### Help text overflow

When the help text is too long for the available horizontal space, it wraps to form another line.

## Usage guidelines

### Include a label

Every text area should have a label. A text area without a label is ambiguous and not accessible.

### Follow capitalization rules

Text area labels and placeholder text should be written in sentence case.

### Mark the minority of text areas in a form as required or optional

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form. If most of the text fields are optional, only the required fields should be give an asterisk or have labels appended with "(required)". If most of the text fields are required, only the optional fields should be appended with "(optional)". An asterisk should never be used to note that a text area is optional.

### Use help text to show hints, formatting, and requirements

The description in the help text is flexible and encompasses a range of guidance. Sometimes this guidance is about what to input, and sometime it's about how to input. This includes information such as: An overall description of the input field Hints for what kind of information needs to be input Specific formatting examples or requirements The help text's message should not simply restate the same information in the label in order to prompt someone to interact with it. Don't add help text if it isn't actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

### Don't use placeholder text

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text. Instead of placeholder text, use the help text description to convey requirements or to show any formatting examples that would help user comprehension. If there's placeholder text and help text at the same time, it becomes redundant and distracting, especially if they're communicating the same thing.

### Switch help text with error text

The help text area also displays an error message. When a text area already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field. Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn't lost if one replaces the other like minimum requirements.

### Write error text that shows a solution

Write error messaging in a human-centered way by guiding a user and showing them a solution — don't simply state what's wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user. Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For text areas, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a required field that asks for their interests, write the error text like you're offering a hint or a tip to help guide them to understand what needs to go in the missing field: "Enter at least one interest."

## Internationalization

### RTL

In right‑to‑left languages, the text‑area layout is mirrored. The label appears right‑aligned, and elements such as the character count, validation icon and error icon appear left‑aligned. Keep in mind that some content, including email addresses, does not change direction or translate.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into a text area selects the existing text.Shift + TabMoves focus to the previous focusable element.EnterInserts a new line at the caret position.Arrow keysMove caret through text; with Shift, extend text selection.Home / EndMove caret to start/end of line (platform behavior may vary).Ctrl/Cmd + ASelect all text in the text area. Note: Standard native text-editing shortcuts (copy, paste, undo, redo, delete, word navigation) should be preserved and not overridden.

### Cursor guidelines

Cursor Description TextUse text cursor over editable text area content in all states.PointerAny clickable control that is part of the text area (e.g., clear/reveal/help icon) uses the pointer cursor.Move (up/down and left/right)Use while dragging the resize handle (if resizing is enabled).

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons paired with a text area (validation icons, clear-input icons), must provide a text alternative. All text areas need an accessible name (via a visible label, title, aria-label, or associated text) so screen readers can announce their purpose.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAText areas should be understandable by assistive technologies. The label, help text, error message, and required state must be programmatically associated with the field using semantic HTML or ARIA.Contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Resize text 1.4.4 AAText areas can be resized up to 200% without loss of content or functionality and without assistive technology.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of illustrations, icons, and component states have a contrast ratio of at least 3:1. Not applicable for empty fields.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
