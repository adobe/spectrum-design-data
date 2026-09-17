---
title: Checkbox group
source_url: /web/rsp/components/checkbox-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/checkbox-group
swc_exists: false
---

# Checkbox group

## Anatomy

checkbox group field label checkbox help text

## Component options

errorMessage Checkbox groups should use help text for error messaging. description Checkbox groups should use help text for descriptions. Descriptions are valuable for giving context behind why a selection is required, or for clarifying the options. When a description is present and an error is triggered, it is replaced with an error message. Once the error is resolved, the help text description reappears. isDisabled A checkbox group in a disabled state shows that a selection exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later. The field label, checkboxes, and help text are all displayed in a disabled state when the checkbox group is disabled. isError Checkbox groups can be marked as having an error to show that a selection needs to be made in order to move forward, or that a selection that was made is invalid. The error is indicated with negative help text, along with an icon. orientation Checkbox groups can be either horizontal or vertical. By default, checkbox groups are stacked vertically. Use a horizontal checkbox group when vertical space is limited. isRequired Checkbox groups can be marked as optional or required, depending on the situation. Optional checkbox groups are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. necessityIndicator For required checkbox groups, there are two necessity indicator options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include help text to explain what the asterisk means. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. label Checkbox groups should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These checkbox groups without a visible label should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby").

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the checkbox group (and its component parts) is mirrored. The checkmarks and icons are placed on the right side of the text, and text is aligned to the right.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into a group of checkboxes places the focus on the first checkbox (only one checkbox receives the keyboard focus at a time).Shift + TabMoves focus to the previous item or group of items.Arrow keysMoves focus through the group of checkboxes.Page Up or Page DownMoves focus to the previous or next checkbox in the group (last becomes first, and first becomes last).Home or EndMoves focus to the first or last checkbox in the group.Space or EnterToggles the checkbox between selected and not selected. If the checkbox is partially selected initially, the checkbox becomes selected first (subsequent toggles alternate normally between selected and not selected).

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for interactive elements like checkboxes.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as the checkbox control—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAACheckboxes should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized.Orientation 1.3.4 AACheckbox groups are available in both vertical and horizontal orientations.Use of color 1.4.1 AColor is not used as a means to convey information or distinguish elements, indicate an action, or prompt a response. Color is always paired with text or icons, and is only used to enhance the meaning of the text.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AACheckboxes should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe checkbox control and its various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when the label is wrapped. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical feactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
