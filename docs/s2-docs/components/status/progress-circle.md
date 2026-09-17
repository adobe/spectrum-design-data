---
title: Progress circle
source_url: /web/rsp/components/progress-circle
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/progress-circle
swc_exists: true
---

# Progress circle

## Anatomy

progress circle track fill

## Component options

isIndeterminate Progress circles can be determinate or indeterminate. Use determinate when progress can be measured against a goal, such as downloading a file. Use indeterminate when the duration or effort is unknown, like reconnecting to a server. size Progress circles come in 3 sizes: small, medium (default), or large. These are available to fit various contexts. For example, the small progress circle can be used in place of an icon or in tight spaces, while the large one can be used for full-page loading. value, min value, max value The value represents progress within the circle's range, from minimum to maximum. These defaults are 0 and 100 but can be customized. Min and max values don't apply to indeterminate progress circles. variant When a progress circle needs to be placed on top of a colored background, use the over background variant. This progress circle uses a static white color regardless of the color theme. Make sure the background offers enough contrast for the progress circle to be legible.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Usage guidelines

### Use progress circles for loading views

Medium and large progress circles are optimized for large areas with no space constraints. Use them for loading content into views (e.g., web pages, panels, etc.)

### Use small progress circle when space is limited

Small progress circles are well suited when space is limited both vertically and horizontally, such as in buttons, menu items, and input fields.

## Internationalization

### RTL

For RTL (right-to-left) languages, the fill of both the determinate and indeterminate progress circle continues to spin clockwise.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
