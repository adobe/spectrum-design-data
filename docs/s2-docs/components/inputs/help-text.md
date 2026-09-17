---
title: Help text
source_url: /web/rsp/components/help-text
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/help-text
swc_exists: false
---

# Help text

## Anatomy

help text (placed under the input) icon (optional) and text (description or error message)

## Component options

isDisabled Help text using the neutral variant can be displayed in a disabled state. The text appears with a lighter gray that matches the style of other components in a disabled state. Help text using the negative variant cannot be displayed in a disabled state because it communicates an error, and error messages should not be visible when the component is disabled. size Help text comes in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly and pair them with components of the same size to respect the built-in hierarchy. hideIcon Help text using the negative variant can have an optional icon. In most cases, help text is used with a component that already displays an icon communicating an error (e.g., text field, text area, picker, combo box ), so it's not necessary to include another icon. In other cases, help text that is used with a component that does not display an icon communicating an error (e.g., checkbox group, radio group) needs to display an icon. variant Help text has two variants: neutral and negative. The neutral variant is used to convey informative messages, while the negative variant is used to convey error messages. text The text can accommodate either a description or an error message, giving extra context and guidance. Sometimes this communicates what to input or select, and sometimes it communicates how. It includes information such as: An overall description of an input field or controls Hints for what kind of information needs to be input or selected Specific formatting examples or requirements Regardless of the kind of message, it should be clear and concise. Use 1-2 short, complete sentences that end with a period (never an exclamation point). When showing formatting examples, it's not necessary to end with a period.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Text overflow

When the text is too long for the available horizontal space, it wraps to form another line.

## Usage guidelines

### Use the optional icon depending on the accompanying component

For the optional icon that can be displayed with the negative variant, usage depends on what kind of component the help text is accompanying. Whether to include the optional icon with the negative variant depends on the component that the help text accompanies. For components such as text field, text area, picker, and combo box, where there is already an icon communicating an error, it's not necessary to include another icon in the help text. For checkbox groups or radio button groups, where there is no icon to communicate an error, include the optional icon.

### Switch the help text description with an error message

Help text displays either a description (the neutral variant) or an error message (the negative variant) in the same space. When a description is present and an error is triggered, it is replaced with an error message. Once the error is resolved, the help text description reappears. Because one replaces the other, the language of the help text description and the error need to work together to convey the same messaging. The description text explains the requirements or adds supplementary context for how to successfully interact with a component. The error message text restates the same requirements, guiding the user to fix the issue. Make sure that the help text description and error message include the same essential information so that it isn't lost if one replaces the other. Learn how this applies to help text for text field, text area, combo box, and picker.

### Write error messages that show a solution

Communicate error messages in a human-centered way by guiding a user and showing them a solution — don't simply state what's wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user. For help text, usually the error is related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a required field that asks for their email address, write the error text like you're offering a hint or a tip to help guide them to understand what needs to go in the missing field: "Enter your email address." Learn how this applies to help text for text field, text area, combo box, and picker.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the help text is mirrored. The icon is placed on the right side of the text.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
