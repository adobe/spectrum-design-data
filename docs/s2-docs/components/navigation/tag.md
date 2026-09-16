---
title: Tag
source_url: /web/rsp/components/tag
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/tag
swc_exists: false
---

# Tag

## Anatomy

tag avatar (optional) label (required) close button (optional)

## Component options

label Tags should always include a label. These can represent search terms, filters, or keywords. hasAvatar Tags have the option to include an avatar in addition to the label. These should be used to represent entities. isRemovable Tags have the option to be removable or not. Removable tags have a small close ("x") button. isError A tag can be marked as having an error to show that it has become invalid. isDisabled A tag in a disabled state shows that a tag exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a tag may become available later. isReadOnly Tags have a read-only option for when content in the disabled state still needs to be shown. This allows for content to be copied, but not interacted with or changed.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorSupported

## Behaviors

### Text overflow

When the tag text is too long for the available horizontal space or when a tag reaches its maximum width, it truncates. Hovering over the tag shows a tooltip with the full text.

## Usage guidelines

### Avoid conflicting tag actions

A tag can either trigger navigation or filtering, or act as a dismissible chip. Combining both interactions disrupts focus order and accessibility states. Choose one behavior — navigation or dismissal — and apply it consistently.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the tag is mirrored. The avatar is right-aligned and the close button is left-aligned.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into a group of tags places the focus on the first tag (only one tag receives the keyboard focus at a time).Arrow keysMoves focus through the group of tags.Page Up or Page DownMoves focus to the previous or next tag in the group (last becomes first, and first becomes last).Home or EndMoves focus to the first or last tag in the group.Backspace or DeleteRemoves the tag in focus from the group.SpaceIf the tag is selectable, the space bar will toggle selection.

### Cursor guidelines

Cursor Description Default (Arrow)Use the default cursor for non-interactive tags.PointerUse the pointer cursor for interactive tags, such as tags that are removable or can be used to filter content.Grab handUse the grab hand cursor when the order of tags can be rearranged.Grab fistUse the grab fist cursor when holding a tag.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in tags—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 AATags should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Text contrast 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AATags should be built in such a way that they can be resized without assistive technology up to 200%.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
