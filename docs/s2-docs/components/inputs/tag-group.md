---
title: Tag group
source_url: /web/rsp/components/tag-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/tag-group
swc_exists: false
---

# Tag group

## Anatomy

tag group field label tag action button

## Component options

size Tag groups come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. labelPosition Labels can be placed either on top or on the side of a group of tags. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. hideLabel The label of the tag group can be hidden if the context for the tags is sufficient without the title — for example, when the page title or section title applies to the group of tags. actionLabel Define an action label to include a link-style button to perform an action on the entire group of tags. This button always appears at the end of the tag group.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Tag group overflow

When horizontal space is limited in a tag group, the individual tags wrap to form another line.

### Focus between tags

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

## Usage guidelines

### Allow bulk actions

In some instances, it's possible to add an action next to a group of tags to provide a way to easily act on the entire group at once. Reveal the action only when more than one tag is displayed.

### Avoid disabling a large group of tags

In cases where users cannot interact with a large group of tags, consider hiding the group and its broader construct rather than disabling all the individual tags.

## Internationalization

### RTL

For RTL (right-to-left) languages, the group of tags is mirrored. The first tag will appear on the left instead of the right and flow from there.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into a group of tags places the focus on the first tag (only one tag receives the keyboard focus at a time).Arrow keysMoves focus through the group of tags.Page Up or Page DownMoves focus to the previous or next tag in the group (last becomes first, and first becomes last).Home or EndMoves focus to the first or last tag in the group.Backspace or DeleteRemoves the tag in focus from the group.SpaceIf the tag is selectable, the space bar will toggle selection.Ctrl / Cmd + ASelects all tags.

### Cursor guidelines

Cursor Description Default (Arrow)Use the default cursor for non-interactive tags.PointerUse the pointer cursor for interactive tags, such as tags that are removable or can be used to filter content.Grab handUse the grab hand cursor when the order of tags can be rearranged.Grab fistUse the grab fist cursor when holding a tag.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in tags—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAATags should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Text contrast 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AATag groups should be built in such a way that they can be resized without assistive technology up to 200%.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when wrapped. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
