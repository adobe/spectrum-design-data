---
title: Swatch
source_url: /web/rsp/components/swatch
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/swatch
swc_exists: false
---

# Swatch

## Anatomy

swatch container color

## Component options

preview The preview shows the sample of the fill that the swatch represents. This property can be a color, gradient, texture, or material. The exact format this property takes will depend on implementation. Some examples of the format include color values, image, canvas, and gradient. size Swatches come in four different sizes: extra-small, small, medium, and large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. shape Swatches can have a square or a rectangle shape (aspect ratio of 2:1). The square shape is the default and is used in swatch groups (e.g., a palette of colors). cornerRounding By default, swatches have partial rounding. There are 3 options for a swatch's rounding: none, partial rounding, and full rounding. Partial rounding and full rounding are usually used when a swatch is presented by itself near other components. A rounding of "none" is used in a swatch group to help minimize the Hermann grid illusion that happens at the intersections of white space in the group. isSelected A swatch can have a selected state to allow for selection. This is often used in a swatch group. isDisabled A swatch in a disabled state shows that the swatch exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that a swatch may become available later. Disabled swatches should be used with caution.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A swatch can be navigated using a keyboard. The keyboard focus state adds a blue ring to the swatch in focus.

### Mixed value

When a swatch represents multiple values that are not identical, the preview shows a gray fill and a dash UI icon.

## Usage guidelines

### Hide unavailable swatches when possible

Even though swatches can have a disabled state, hiding unavailable swatches reduces visual clutter and eases cognitive load. Only show disabled swatches if hiding them would cause confusion to your users.

## Accessibility

### Keyboard interactions

KeyInteractionTabMoves focus onto or off of the swatch group. Focus moves to the first swatch in the group.Space or EnterTriggers an action or selects the swatch when selection is enabled. The focus remains on the swatch, unless the swatch opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for all interactive elements in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAASwatch groups should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized, so the grouping relationship between swatches and the selected state are programmatically conveyed.Use of color 1.4.1 AThis criterion requires that color not be the only method of communicating information. In swatches, the color itself is the content being presented, not a cue that conveys additional meaning. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
