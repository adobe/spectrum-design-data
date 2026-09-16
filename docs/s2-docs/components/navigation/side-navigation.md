---
title: Side navigation
source_url: /web/rsp/components/side-navigation
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/side-navigation
swc_exists: false
---

# Side navigation

## Anatomy

side navigation header item icon (optional) label

## Component options

selectionMode The type of selection allowed in side navigation can be none, single or multiple. None: side navigation does not allow item selection by default. Single: users can select only one item at a time. Multiple: users can select more than one item at a time. items The list of navigation items displayed in a side navigation. Each item includes a label by default and can optionally include an icon. Items that contain nested navigation levels can also include a trailing accessory area, which supports a chevron and an optional counter.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### App frame side navigation

At a glance, the app frame side navigation may look similar to the standard side navigation. However, its interaction model introduces key differences. The app frame side navigation includes a collapsible menu that lets users hide or reveal labels. The standard side navigation, on the other hand, is best suited for fixed layouts that support multiple visual styles, such as icon-only, text-only, or mixed. Note that the standard side navigation cannot collapse.

### Flexible width

The width of the side navigation is flexible, so choose a width that works with the navigation items in your experience. Make the width generous enough so that it doesn't feel too condensed. Doing this will ensure that users won't confuse the side navigation with buttons or other controls.

### Text overflow

When the navigation item text is too long for the horizontal space available, it wraps to form another line.

## Usage guidelines

### Don't make the width too condensed

Make sure the width is generous enough so that it doesn't feel too condensed. This ensures it doesn't get confused with buttons or other controls.

### Use descriptive titles

Navigation should be helpful. Choose titles for navigation items that clearly communicate the places where they'll go. Arbitrary or non-useful titles cause usability issues.

### Be concise

Along with being descriptive, the labels of navigation items should be succinct. Keep navigation strings to 1 or 2 and no more than 3 concise words (in U.S. English, which is the source locale). Reduce any unnecessary words in order to ensure simplicity. Navigation items should never be so long that they require truncation, except in instances where navigation is user-generated, such as folder and filenames.

### Be cautious with line breaks

When possible, the default width should automatically adjust to the longest string in the navigation to accommodate all translations. As a last resort for long strings, specific line breaks can be built into the implementation. These breaks depend on the content and require manual handling by globalization engineers.

### Mixed icon usage

In multi-level side navigation, icon and text-only styles can be used together. Users may include supporting icons on the first level and omit them on the second and third levels, or choose to use no icons at all. Do not mix icon and no-icon options within the same navigation level.

### Avoid deeply nested menus

The multi-level side navigation goes to three levels deep. Adding more than three levels will make the indentation indiscernible, which becomes a major usability issue.

### Use consistent multi-level behavior

If top-level navigation items have a location associated with them, send the user to that location and open the sub-level navigation items. If a top-level navigation item does not have any associated location, only open the sub-level navigation items. Side navigation can use either of these behaviors, but should never mix behaviors in the same experience.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the side navigation is mirrored. Navigation items are left-aligned and their icons are placed on the right side of the text.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus to next item.Shift + TabMoves focus to previous item.Enter or SpaceSelects item, expands and collapses item with children.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components in every state.Grab handUse the grab hand cursor when hovering over a side navigation item that can be moved.Grab fistUse the grabbing hand cursor while dragging a side nav item.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in side navigations—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAASide navigation must be understandable to assistive technologies, such as screen readers. Use proper semantic HTML or the appropriate ARIA roles to ensure accessibility.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
