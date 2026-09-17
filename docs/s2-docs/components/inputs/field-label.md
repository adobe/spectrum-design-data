---
title: Field label
source_url: /web/rsp/components/field-label
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/field-label
swc_exists: false
---

# Field label

## Anatomy

field label label necessity indicator input(s)

## Component options

isDisabled A field label in a disabled state shows that an input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an input field may become available later. label Inputs ( text field, checkbox, slider, etc.) should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These inputs without a visible label should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”). size Field labels come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option with medium-sized inputs. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. Both small and medium field labels have the same font size, but different paddings when used as side labels. labelPosition A label can be placed either on top or on the side of an input. This option affects the bounding box of the component to ensure proper alignment. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. necessityIndicator and isRequired Inputs can be marked as required or optional, depending on the situation, using a necessity indicator. There are two styles for the necessity indicator: icon or text. By default, the necessity indicator is shown with an asterisk icon. Required inputs are marked with this at the end of the label. If you use this icon, be sure to include hint text to explain what it means. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. Optional inputs do not have an icon. Alternatively, the necessity indicator can be shown with text. This appends text that reads either “(required)” or “(optional)” at the end of the label.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the field label is too long for the available horizontal space, it wraps to form another line.

## Usage guidelines

### Mark the minority of inputs in a form as required or optional

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form. If most of the input fields are optional, only the required fields should be given an asterisk icon or have labels appended with "(required)." If most of the input fields are required, only the optional fields should be appended with "(optional)." An asterisk icon should never be used to note that a field is optional.

## Content standards

For field label text, use a short, catch-all description (1-3 words) of the information that a user needs to provide. Field label text that gets too long can be overwhelming and distracting, especially in complex interactions and long forms. Supplementary information or requirements about what to input can be shown in help text below the field, or in a tooltip.

### Use verbs like "enter," "add," or "input" in a field label sparingly

Field labels generally communicate what a user should input, rather than direct them as to how to do it. The component design of fields and other inputs already implies that a user needs to enter, add, or input information in order to move forward with a task or workflow. If the interaction may be new or unfamiliar it can be helpful to guide a user with action prompts using these verbs, but for more common patterns (such as forms), this can get redundant and clutter an interface.

### Don't add a colon at the end of a field label

Don't add a colon (:) at the end of a field label to imply that the label text applies to the field it accompanies. The design of the component already communicates the relationship between the label and the input field.

### Use sentence case

Following Adobe's UX writing style, field labels are written in sentence case unless they contain words that are branded terms.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the button is mirrored. The icon is placed on the right side of the text.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
