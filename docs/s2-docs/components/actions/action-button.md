---
title: Action button
source_url: /web/rsp/components/action-button
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/action-button
swc_exists: true
---

# Action button

## Anatomy

action button icon label hold icon (optional)

## Component options

size Action buttons come in five different sizes: extra-small, small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. hasHoldIcon An action button can have a hold icon (a small corner triangle). This icon indicates that holding down the action button for a short amount of time can reveal a popover menu, which can be used, for example, to switch between related actions. staticColor When an action button needs to be placed on top of a color background or a visual, use the static color option. Static color action buttons are available in transparencies, or in solid black or solid white, and don't change shades or values depending upon the color theme. Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of the color theme. Static color action buttons can appear in static white, regardless of color theme. The static color option allows for them to be placed on top of a custom background that is not part of a Spectrum color theme. isEmphasized By default, action buttons are not emphasized. This is optimal for when an action button is not the core part of an interface, such as in application panels, where all the visual components are monochrome in order to direct focus to the content. The emphasized action button has a blue background for its selected state in order to provide a visual prominence. This is optimal for when the selection should call attention, such as within a tool bar. label Action buttons should always have a label, unless they are only using an icon that is universally understood and accessible. They can have an optional icon, but it should not be used for decoration. hideLabel The label can be hidden to create an icon-only action button. If the label is hidden, an icon is required, and the label will appear in a tooltip on hover. isSelected An action button can have a selected state to allow for toggling — not only for taking a direct action. This can be used to disclose parts of an interface, such as for showing or hiding panels or to switch between views (for example, grid or list views). isDisabled An action button in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later. selectedTextColor The text color on the selected state of the over-background variant can be customized to match the background it's on. icon Use an icon only when necessary and when it has a strong association with the label text. isQuiet By default, action buttons have a visible background. This style works best in a dense array of controls where the background helps to separate action buttons from the surrounding container, or to give visibility to isolated buttons. Alternatively, quiet action buttons can have no visible background until they're interacted with. This style works best when a clear layout (vertical stack, table, grid) makes it easy to parse the buttons. Too many quiet components in a small space can be hard to read.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the action button text is too long for the available horizontal space, it truncates at the end. The full text should be revealed with a tooltip on hover.

### Keyboard focus

An action button can be navigated using a keyboard. The keyboard focus state takes the button’s visual hover state and adds a blue ring to the button in focus.

## Usage guidelines

### Use tooltips

Icon-only action buttons can be hard to identify. They should always show a tooltip upon hovering for a short period of time, displaying the name and possibly a keyboard shortcut.

### Isolated action buttons

If you have an icon-only or text-only isolated action button, use the standard style to make sure it’s more easily identifiable as a button.

### Only group related actions with a hold icon

When using a hold icon to switch actions, only group the actions that are part of the same family. Don't group unrelated actions just for the sake of saving space.

### Respect hold icon placement

In left-to-right interfaces, the hold icon is always in the bottom right corner of the action button. It's a symbolic indicator that shows that a popover menu will appear on hold. Don't change the placement of the hold icon based on the design of the interface.

### When to use static black and static white

To ensure maximum contrast with the background, use static black for light backgrounds and images, and use static white for dark backgrounds and images. Avoid placing static components on top of busy images with a lot of variance in contrast.

### Selected state text color

The text color on the selected state of the over-background variant can be customized to match the background it’s on. Use the background color for selected text when the action button is on a solid color, and is dark enough to meet a 4.5:1 contrast ratio with a white background (or black background, for the static black variant). Use black text when the button is on top of an image, or if the background is too low-contrast to meet the 4.5:1 contrast ratio.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the action button is mirrored. The icon is placed on the right side of the text and the hold icon is placed on the left side of the icon.

## Accessibility

### Keyboard interactions

When an action button does not feature a hold icon: Key Interaction Space or EnterExecutes the action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.TabMoves focus into the action button component and places focus on the selected action item.Shift + TabReturns focus to the previous action within the action button component. When an action button features a hold icon: Key Interaction EnterExecutes the action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.SpaceOpens the popover menu.Alt + Down ArrowOpens the popover menu.TabMoves focus into the action button component and places focus on the selected action item.Shift + TabReturns focus to the previous action within the action button component.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in action buttons—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAAction buttons should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Text contrast 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size if text is wrapped inside an action button. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
