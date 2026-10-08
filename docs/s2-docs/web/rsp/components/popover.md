---
title: Popover
category: containers
source_url: /web/rsp/components/popover
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/popover
platform: rsp
design_data_targets:
  - popover
swc_exists: true
---

# Popover

## Anatomy

popover tip (optional)

## Component options

containerPadding To keep a popover within certain boundaries, such as a browser window, define a container and a container padding value. crossOffset The cross offset is the placement offset on the cross axis: the x-axis for top and bottom positions, and the y-axis for left and right positions. offset The offset is the space between the source and the popover (or tip, if present). Adjust it as needed to align visually with the source's perceived bounds and maintain a balanced relationship between the two elements. placement A popover is positioned in relation to its source. showTip Popovers usually appear without a tip and rely on a distinct down state in the source to show their origin. When the source lacks that visual cue, add a tip to reinforce the connection between the popover and its source. height A popover's height can be customized appropriately for its context. width A popover's width can be customized appropriately for its context.

## States

State Support status Default Supported Hover Not supported Down Not supported Keyboard focus Not supported Disabled Not supported Selected Not supported Dragged Not supported Error Not supported

## Behaviors

### Source

Popovers stem off of action buttons that act as a source to open up transient content.

### Animation

When displaying a popover, it should animate from its source to reinforce the connection between popover and source. It should fade in and slide with subtle motion from the source.

### Dismissing a popover

A popover can be dismissed by clicking or tapping anywhere outside it, including the source, or by selecting an option or taking an action inside the popover.

## Usage guidelines

### Popovers vs. trays

Trays can be used as alternatives to popovers on small screens. Use a tray when the amount of content is too large or overwhelming for a popover.

### Show tip when source is ambiguous

When the source that triggers the popover does not have a visually distinct down state, use a popover with a tip to clearly indicate the connection to its source.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the popover is mirrored. Text is right-aligned and buttons are left-aligned.

## Accessibility

### Keyboard interactions

Key Interaction Tab Moves focus onto or off of the button. Space or Enter Executes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage Pointer Use the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 A Non‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function. Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAA Buttons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized. Use of color 1.4.1 A Color is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs. Text contrast minimums 1.4.3 AA Large text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement. Resize text 1.4.4 AA Buttons should be built in such a way that they can be resized without assistive technology up to 200%. Visual presentation 1.4.8 AAA The width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified. Non-text contrast 1.4.11 AA The visual presentation of icons and various states have a contrast ratio of at least 3:1. Text spacing 1.4.12 AA Line height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAA All functionality of the component is operable through a keyboard without specific timing for keystrokes. Keyboard traps 2.1.2 A Focus can be moved away from the component using only a keyboard. Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAA There is no flashing content or unnecessary motion or animation in this component. Focus order 2.4.3 A Navigation sequences receive focus in an order that preserves meaning and operability. Focus visible 2.4.7 AA Keyboard states use an indicator that is visible with at least 3:1 contrast.
