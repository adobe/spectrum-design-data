---
title: Tooltip
source_url: /web/rsp/components/tooltip
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/tooltip
swc_exists: true
---

# Tooltip

## Anatomy

tooltip background label tip

## Component options

label All tooltips have a label. The label communicates the contextual help or information about specific components when a user hovers over or focuses on them. variant By default, tooltips are the neutral variant. These are the most common variant because most tooltips are used to only disclose additional information, without conveying a semantic meaning. The neutral variant never includes an icon. Tooltips also come in semantic variants: informative (blue), and negative (red). An icon is required for these variants to ensure information isn't conveyed by color alone. hasIcon 2 of the 3 tooltip variants (informative and negative) can include an icon to supplement the messaging. These icons are predefined and can not be customized. Unless it's being used to provide context about the exact same icon, a semantic tooltip should always show an icon. Doing this is essential for helping users with color vision deficiency to discern the message tone. maxWidth A tooltip comes with a maximum width to disclose a short message. If a larger amount of text or information needs to be disclosed, Contextual help or Help text should be considered. placement A tooltip is positioned in relation to its target. shouldFlip This option determines whether or not a tooltip should be able to switch sides when constrained by space. A tooltip placed at the top would flip to be placed at the bottom (and vice versa), and a tooltip placed at the left would flip to be placed at the right (and vice versa). offset The offset is the distance between the end of the tip and the target. containerPadding To make sure that the tooltip will stay within certain boundaries (e.g., a browser window) it's possible to define a container and a container padding value to respect.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the label is too long for the available horizontal space, it wraps to form another line.

### Animation

A tooltip fades in and out when showing and hiding, and slides a short distance from the source to indicate its origin. The direction of the slide (left, right, top, bottom) depends on the placement of the tooltip. The animation attributes (duration, easing, offset) are the same whether it's showing or hiding.

### Immediate or delayed appearance

Tooltips attached to help icons appear immediately. For conventional UI elements where a tooltip appearing immediately would be intrusive, delay appearance with a warmup period.

### Warmup and cooldown

The warmup period is a global timer that requires the cursor to remain on a UI element for the allotted time before a tooltip appears. Once this period is complete, a tooltip appears instantly on any hovered-upon UI element until the cursor is in an area that does not trigger a tooltip for the duration of the cooldown period.

## Usage guidelines

### Use tooltips to describe icons

Icons are not always easy to identify on their own. When you use components that don't have labels — for example, icon-only action buttons and tabs — make sure to use tooltips to provide context for the icons.

### Don't use tooltips to communicate crucial information

Show crucial information at all times, not just when a tooltip is displayed. A tooltip should only be used to provide supplementary context or hints to the message shown in help text. For example, in a scenario where a user is entering their password into a field, the crucial information would be to state the password requirements. Supplementary context would be a message about how to get help if they have forgotten their password.

### Be concise

Tooltips should be as concise and clear as possible. Keep the text to 1 or 2 short sentences. If the information you need to communicate is longer than that, look into using a different design. If a tooltip is written in a full sentence (or is 2 or more sentences), include a period at the end. If it's a short phrase or is only the name of a tool, action, or icon, don't add a period to the end.

### Don't place actions inside a tooltip

Tooltips appear only on hover or when in keyboard focus. They should not contain actions or links.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the tooltip is mirrored. The icon is placed on the right side of the text.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into an item that has a tooltip associated with it (e.g., an icon) shows the tooltip.EscHides the tooltip.

### Cursor guidelines

Cursor Usage PointerIf the trigger is a button or link, or a focus-only element (like an info icon that shows a tooltip on hover), use the pointer cursor.Default (Arrow)If the trigger is an icon that is not clickable, use the default cursor.PointerIf the tooltip has a link, use the pointer cursor when interacting with the link.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content1.1.1ANon‑text elements—such as icons used in tooltips and icons that trigger tooltips—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose1.3.1, 1.3.6A, AAATooltips should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized.Use of color1.4.1AColor is never used as the sole way to convey meaning in tooltips. Tooltips use color to reinforce their meaning, but every tooltip also includes a clear text label that communicates purpose.Text contrast minimums1.4.3AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text1.4.4AATooltips should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation1.4.8AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast1.4.11AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing1.4.12AALine height of text is at least 1.5x the font size in wrapped tooltips. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
