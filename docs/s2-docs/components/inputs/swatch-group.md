---
title: Swatch group
source_url: /web/rsp/components/swatch-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/swatch-group
swc_exists: false
---

# Swatch group

## Anatomy

swatch group swatch

## Component options

size Just like swatches, swatch groups come in four different sizes: extra-small, small, medium, and large. The medium size is the default option. This only affects the size of each individual swatch, not the spacing between them. density Swatch groups come in 3 densities: regular (default), compact, and spacious. Compact and spacious densities retain the same swatch size as regular density but have less or more padding between each swatch, respectively. enableSelection By default, selection is not enabled in a swatch group. Selection can be enabled for a swatch group to allow for toggling. This is often used inside of swatch panels. selectionMode When selection is enabled, a swatch group can allow for either single or multiple selection of swatches. This is often used inside of swatch panels to allow for bulk operations, such as deleting multiple swatches at once. allowsEmptySelection Controls whether users can deselect all swatches when selection is enabled. If true, empty selection is allowed; if false, at least one swatch must remain selected. cornerRadius By default, swatch group has no corner rounding. Corner rounding options include none, partial, or full. The swatch group corner rounding dictates the rounding for all the individual swatches in that group.

## States

State Support status DefaultSupportedHoverNot SupportedDownNot SupportedKeyboard focusNot SupportedDisabledNot SupportedSelectedNot SupportedDraggedNot supportedErrorNot supported

## Behaviors

### Border only for low-contrast swatches

It's important for users to compare colors when they're displayed in a swatch group. Because of this, swatches within a swatch group with low contrast (below 3:1 contrast with the background) have a less prominent border compared to the swatch component when used by itself. This reduces the likelihood of the UI interfering with color perception and comparisons.

## Usage guidelines

### Corner rounding in swatch groups

A corner rounding of none should be used in a swatch group in order to help minimize the Hermann grid illusion that happens at the intersections of the white space within the group. The only exception is when a swatch group only takes up a single row. In that case, use any of the rounding options: none, partial rounding, or full rounding.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto the swatch or swatch group.Arrow keysMoves focus through the swatches in the group.

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for all interactive elements in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAASwatch groups should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized, so the grouping relationship between swatches and the selected state are programmatically conveyed.Use of color 1.4.1 AThis criterion requires that color not be the only method of communicating information. In swatches, the color itself is the content being presented, not a cue that conveys additional meaning. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
