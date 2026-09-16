---
title: Picker
source_url: /web/rsp/components/picker
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/picker
swc_exists: false
---

# Picker

## Anatomy

picker label required asterisk, required text, or optional text field placeholder or value error icon chevron help text (help text or error message) menuContainer

## Component options

errorMessage The error message communicates an error for when the selection requirements aren't met, prompting a user to adjust what they had originally selected. helpText A picker can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field. isError A picker can be marked as having an error to show that a value needs to be entered in order to move forward or that a value that was entered is invalid. isDisabled A picker in a disabled state shows that an input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that it may become available later. menuContainer The picker menu is a menu element that is used to display the options for the picker. A picker menu can include menu items, menu dividers, and menu groups. A picker menu should never contain submenus, as doing so would render it inaccessible. isRequired and necessityIndicator Pickers can be marked as optional or required depending on the situation, using the necessityIndicator property. For required pickers, you have two options: Text label: Display "(required)" after the label text Asterisk: Display an asterisk (*). If you use an asterisk, include hint text that explains what it means (e.g., "* indicates a required field") For optional pickers, you have two options: Text label: Display "(optional)" after the label text No indicator: Show no indication at all isQuiet By default, pickers have a visible background. This style works best in a dense array of controls where the background helps to separate the input from the surrounding container, or to give visibility to isolated buttons. Alternatively, quiet pickers can have no visible background. This style works best when a clear layout (vertical stack, table, grid) makes it easy to parse the buttons. Too many quiet components in a small space can be hard to read. size Pickers come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. width The width of a picker can be customized appropriately for its context. This option is not applicable to quiet pickers. value The value shows the option that a user has selected. placeholder Placeholder text provides hints about expected input values. It disappears once a user selects an option. labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. label Pickers should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These pickers without a visible label should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby").

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedFocus + hoverSupportedFocus + not hoverSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Minimum width

The minimum width for a picker is picker-minimum-width-multiplier (2× the height of the field button). This guarantees that small pickers are readable and easy to target on touch devices. Quiet pickers do not have a minimum width; their width depends on the length of the text.

### Text overflow

When the field label and menu text are too long for the available horizontal space, they wrap to form another line. The field text itself truncates at the end, but the text can be shown in full in the menu.

### Help and error text overflow

When the help or error text is too long for the available horizontal space, it wraps to form another line.

### Menu height

The picker menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

## Usage guidelines

### Include a label

Every picker should have a label. A picker without a label is ambiguous and not accessible.

### Review label-less designs

In rare cases where context is sufficient and a label could be absent, make sure to have the design reviewed and approved by an accessibility expert. These should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby").

### Keep menu items concise

Keep menu items short and concise. Long menu items that cause text to wrap to multiple lines are discouraged. If text wrapping becomes a frequent concern, consider revising the text or use alternative UI patterns that will give your content more space.

### Choose an appropriate width

When possible, the field button width should be wide enough so that any chosen menu items can be displayed in full.

### Follow capitalization rules

Field labels, placeholder text, and menu items should be in sentence case.

### Marking required vs. optional pickers in forms

When labeling pickers in a form, only mark the minority type — either required or optional — to reduce visual clutter: If most pickers are optional, mark only the required ones (e.g., add an asterisk or "(required)"). If most pickers are required, mark only the optional ones (e.g., append "(optional)" to their labels). Never use an asterisk to indicate an optional picker.

### Use help text to show context

A picker's description in the help text is can communicate what to select or how to select an option. This includes information such as: An overall description of the picker options Hints for what kind of information to choose More context for why a user needs to make a selection The help text's message should not simply restate the same information in the label in order to prompt someone to interact with a picker. Don't add help text if it isn't actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

### Switch help text with error text

The help text area also displays an error message. When a picker already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the picker. Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to complete the interaction. Error text tells a user how to fix the error by re-stating the selection requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn't lost if one replaces the other like minimum requirements.

### Write error text that shows a solution

Write error messaging in a human-centered way by guiding a user and showing them a solution — don't simply state what's wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user. Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For pickers, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss selecting an option to note as their preferred contact method, write the error text like you're offering a hint or a tip to help guide them to understand what needs to be selected: "Select a contact method."

### Use placeholder text for hints

Placeholder text provides hints about expected input values. When implemented properly, it enhances usability without compromising accessibility. Placeholder text: always supplements, never replaces labels; uses disappearing text only for non-critical guidance. It never replaces the help text. is always paired with a visible label; is brief and instructional; is compatible with the screen reader. Ensure that placeholders are properly announced by screen readers by using appropriate ARIA attributes when needed.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the picker is mirrored. Text and the checkmark are right-aligned while the chevron is left-aligned.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
