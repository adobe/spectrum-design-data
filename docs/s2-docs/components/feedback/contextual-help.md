---
title: Contextual help
source_url: /web/rsp/components/contextual-help
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/contextual-help
swc_exists: false
---

# Contextual help

## Anatomy

contextual help action button popover title description link

## Component options

containerPadding To make sure that a popover will stay within certain boundaries (e.g., a browser window) it’s possible to define a container, and a container padding value, to respect. popoverCrossOffset The cross offset is the placement offset on the cross axis (x-axis for top and bottom, y-axis for left and right). href A contextual help can have up to one link. popoverOffset The offset is the distance between the action button and the popover edge. There is a default value but this can also be adjusted depending on the context. popoverPlacement The popover is positioned in relation to the action button. icon Indicates whether contents are informative or provides helpful guidance.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A button can be navigated using a keyboard. The keyboard focus state takes the button’s visual hover state and adds a blue ring to the button in focus.

### Tooltip when the label is hidden

When the button label is hidden, a tooltip is shown on hover that displays the label text and, if appropriate, a keyboard shortcut.

### Flexible width

The width of a button automatically adjusts to fit the label text. The padding on each side of the button is equal to half its height.

### Minimum width

Buttons have a minimum width of 2.25× the height of the button. This ensures that small buttons retain an identifiable shape.

### Text overflow

When the button text is too long for the horizontal space available, it wraps to form another line.

### Cursor style

Buttons use the default arrow cursor for all states, including hover and down. The only exception occurs on the web; if the button is using the href property it will display the pointer cursor instead.

### Delay before pending state

Some progress can be very quick. In order to avoid showing a progress circle for a fraction of a second, which results in an unpleasant flickering, there is a delay of 1 second before the pending state appears. During this delay, the button continues to visually respond to interactive events (e.g., hover), but additional clicks do not result in repeated submissions.

## Usage guidelines

### Tooltip vs. contextual help

A tooltip shows in-line information about the element that a user is hovering or focusing on. Contextual help describes a larger experience, such as something that's associated with that element in a broader sense. Use contextual help to communicate information about an entire view, rather than a specific element of the experience (e.g., in high-level section headers). Tooltips are meant for a few words or a short sentence, such as showing the label for an icon-only button. Contextual help offers more space to give more information, or to describe where a user can find further help.

### Help text vs. contextual help

Help text is readily visible, in-line information about a specific UI element. The information in the contextual help component is about an entire experience or view, is hidden within a popover, and only appears once a user interacts with the icon-only action button. Use help text for critical information that a user needs to know to complete a task. Don't hide essential information in contextual help; it's intended to supplement the experience with minimal disruption.

### More information about disabled components

Contextual help can be used to explain why a component is disabled and how to enable it. Don't make disabled components interactive (with focus states or hovering) as a way to display contextual information.

### Action button component size

There are two size options for the action button in contextual help: extra-small and small. Regardless of size, the action button should be quiet and display only an icon.

## Content standards

### Informative vs. helpful content

The content within the contextual help's popover reflects the icon it's associated with: either the info icon or the help icon. Use the info icon for informative content: specific, brief, and contextual guidance. This is best for supplemental or nice-to-know information, in-line with a label or a component (if there is no label). The content should be instructive in tone. Use the help icon for helpful content: more detailed, in-depth guidance about a task, UI element, tool, or keyboard shortcuts. This may include an image, video, or link and should be helpful in tone.

### Use proper formatting

For this component, don't add a period to the end of the title. A question mark is acceptable, depending on the context. For the description, add a period to the end of the sentence, even if it's only a single sentence. If using a standalone link, do not add punctuation to the end of the link text.

### When to use a standalone link

If using a standalone link, make sure that the landing experience is intuitive, helpful, and naturally builds upon the information being introduced in the component. For example, don't link to an external sales website unless the information there is directly related to a user being able to do something within the product. A generic "Learn more" can be acceptable, but it's more helpful to include another word or two in the link text that gives more context about the landing experience.

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
