---
title: Button group
source_url: /web/rsp/components/button-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/button-group
swc_exists: true
---

# Button group

## Anatomy

button group button label

## Component options

isDisabled A button group in a disabled state shows that the buttons within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that a button group may become available later. overflowMode This option stacks button groups vertically when horizontal space is limited, placing the most important action at the bottom. size Button groups come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. orientation A button group can be either horizontal or vertical in its orientation. By default, a button group is horizontal. Use vertical option when horizontal space is limited.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Overflow

When horizontal space is limited, button groups stack vertically. Buttons are stacked by the importance of the action, with the most critical or primary action at the bottom.

## Usage guidelines

### Use the recommended option for subsequent actions

The most critical action within a button group should be an accent, primary, or negative button (fill or outline). The other actions should always be a secondary outline button.

### Align button groups based on content

Button groups are aligned contextually. In general, button groups are left-aligned to follow content such as a block of text. They are center-aligned in the context of an empty state. And, they should be right-aligned inside container components such as dialogs, popovers, or cards.

### Respect button order within a group

The order of button priority should match the alignment of surrounding text. When text is left-aligned, buttons should be arranged so that the leftmost button is the most critical. When text is right- or center- aligned, the most critical action should be the furthest right.

### Use icons only for the most critical actions

Not all buttons in a group require an icon, but buttons with icons should always be of a higher priority than ones without icons. If the most critical action in a group doesn't have an icon, don't use icons in the remaining lower-level actions.

### Use a button group to show additional actions

Instead of a single split button (now a deprecated component), use a button group to show any additional actions related to the most critical action.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the button group is mirrored.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button group. Focus is placed on the primary button of the group.Shift + TabMoves focus to the previous component.Space or EnterExecutes the selected action within the button group. Focus remains on the active button to preserve context across the group. If the action opens or closes a related container, focus moves into the resulting context or returns to the triggering buttonArrow keysMoves focus through the group of buttons.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Orientation 1.3.4 AAButton groups are available in both vertical and horizontal orientations.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when text is wrapped in buttons. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
