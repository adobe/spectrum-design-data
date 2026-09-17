---
title: Segmented control
source_url: /web/rsp/components/segmented-control
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/segmented-control
swc_exists: false
---

# Segmented control

## Anatomy

segmented control track segmented control item icon (optional) label

## Component options

items Segmented controls should have between two and five items. keyboardActivation By default, pressing arrow keys while focused on a tab changes the selection and updates the content. To disable automatic selection, set the keyboardActivation prop to "manual." In this mode, users must press Enter or Space to confirm a tab change. selectedItem The identifier of the currently selected item. hideTrack By default, segmented controls should include a track. The track style is justified within the parent container. Segmented controls without a track are left-aligned in left-to-right (LTR) languages. alignment Segmented controls without a track are left aligned in left-to-right languages. isFluid If true, the control takes up the full width of its container. Only horizontal segmented controls support fluid behavior. orientation Segmented controls can be either horizontal or vertical. By default, segmented controls are horizontal.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Mutually exclusive items

Segmented controls have one item selected by default at all times, and are mutually exclusive. This means selecting one item automatically deselects the others.

### Selection

Clicking on a segmented control item immediately performs the view change.

### Text overflow

When the segmented control item text is too long for the available horizontal space, it truncates at the end. The full text should be revealed with a tooltip on hover.

### Tooltips for hidden labels

Icon-only or truncated label segmented controls can be hard to identify. They should display a tooltip after a brief hover, showing the name and a keyboard shortcut, if applicable.

## Usage guidelines

### Segmented controls are for view switching

Segmented controls are only meant to be used to change the way you view information on a page. They should not be used for navigating, filtering content, or taking actions.

### Segmented controls vs. similar components

Use a segmented control when the primary goal is to switch views of content. Tabs are reserved for navigation. Action groups are for triggering actions. Tag groups are for filtering content.

### Use icons only when they have a clear meaning

It may not make sense in every case to include icons. If the items are too complicated to convey in an icon, don't force it. Keep in mind that if one segmented control has an icon, then they all should have an icon.

### Keep segmented control groups to 5 items or less

Segmented control groups work best with 2 to 5 items. If your component needs more than 5 items, consider using a dropdown or radio button group instead.

### Don't use segmented control as actions, to make selections, or to navigate

Segmented control groups are meant for switching views on a page. To navigate to a different page or progressively disclose different content, use tabs instead. To perform actions or make a selection, use action groups.

## Internationalization

### RTL

The order of the buttons in the segmented control are reversed in RTL languages. If it has icons with text, the icons are placed to the right of the text, and directional icons like arrows or chevrons are flipped horizontally.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
