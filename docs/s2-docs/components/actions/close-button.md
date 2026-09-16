---
title: Close button
source_url: /web/rsp/components/close-button
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/close-button
swc_exists: true
---

# Close button

## Anatomy

close button cross UI icon

## Component options

isDisabled A close button in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later. staticColor Use this option when a close button needs to be placed on top of a color background or visual. Static color close buttons are available in black or white, regardless of color theme. Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of color theme. Make sure that the background and the close button color meet the minimum color contrast ratio. iconSize The icon inside of the close button comes in two options: regular and large. These scale up and down for each close button size. This is a cross UI icon, not a workflow icon or the letter "x." size Close buttons come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A close button can be navigated using a keyboard. The keyboard focus state takes the close button's visual hover state and adds a ring to the button in focus.

## Usage guidelines

### Don't use close buttons for delete actions

A close button is only for dismissing or closing its parent component, not for taking a destructive action (like deleting a file). Use an action button instead.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the close button.Space or EnterExecutes the button (closes or dismisses the parent component). Focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for all interactive components in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—including the close icon—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAClose buttons should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role of buttons should be utilized.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
