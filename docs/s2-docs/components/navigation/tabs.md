---
title: Tabs
source_url: /web/rsp/components/tabs
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/tabs
swc_exists: true
---

# Tabs

## Anatomy

tabs tab item (selected) tab item selection indicator

## Component options

orientation Tabs can be horizontal or vertical. By default, tabs are horizontal and should be used when horizontal space is limited. Use vertical tabs when horizontal space is more generous or when the list of sections is too long for a horizontal layout. Vertical tabs can also serve as anchor links, providing shortcuts to sections on a single page. In this case, tab items link to on-page anchors rather than opening a new tab view. items Tab items represent distinct sections of related content within a single view. We recommend using up to five tab items in a single tab component. If more are needed, consider an alternative navigation pattern to maintain clarity and usability.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Animation

When a user selects a tab item, the selection indicator slides along the base to the newly selected tab. The text and icon colors of both tabs fade during the transition. The tab view changes immediately upon selection.

### Tab overflow

When there are too many tabs to fit horizontally across the viewport, display the tabs component as a quiet picker. When appropriate, you can also use alternative overflow methods such as horizontal scrolling.

## Usage guidelines

### Too many tabs

When there are too many tabs to fit horizontally across the viewport, you can either allow horizontal scrolling or place all tab items in a quiet picker. Do not truncate multiple tab items just to make them fit horizontally.

### Don't use tabs for varying levels of importance

Use tabs to organize sections of equal importance. Groups of content under each tab item should not be of different natures. Don't use tabs to replace a flow; use pagination components instead.

### Nested tabs

Avoid using multiple levels of tabs. Instead, consider other organizational patterns such as side navigation, accordions or collapsible panels. Nesting tabs is acceptable only when there is a clear separation between the two tab experiences or when different orientations are used. Do not compromise hierarchy by using the same tab variations or orientations.

### Use icons consistently

Don't mix the use of icons in tabs. Navigation controls require a clear spacial relationship to one another, and mixing the use of icons can dramatically impact the visual balance and presence for each tab item. Keep in mind that if one tab item has an icon, then they all should have an icon.

### Use tooltips for icon only tabs

It can often be hard to identify the meaning of icon-only tabs. An icon-only tab should always show a tooltip displaying the label on hover.

## Internationalization

### RTL horizontal tabs

For RTL (right-to-left) languages, the layout of the horizontal tabs is mirrored. The tabs are right-aligned and their order is reverse.

### RTL vertical tabs

For RTL (right-to-left) languages, the layout of the vertical tabs is mirrored. The divider and selection indicator should be placed on the right, as they are meant to visually anchor the text labels.

## Accessibility

### Keyboard interactions

There are two possible behaviors for manipulating tabs with the keyboard: manual or automatic activation. Typically, manual activation of tabs is only necessary when content cannot be displayed instantly (i.e., not all the panel content is present in the DOM.) For additional guidance, see Deciding When to Make Selection Automatically Follow Focus. Option 1: Manual activation Key Interaction TabMoves focus into the tabs component and places focus on the selected tab item. If the tabs component is already in focus, moves focus to the next element in the page tab sequence.Left ArrowMoves focus to the previous tab item. If focus is on the first tab item, moves focus to the last tab item.Right ArrowMoves focus to the next tab item. If focus is on the last tab item, moves focus to the first tab item.Space or EnterActivates the tab item in focus.Home (optional)Moves focus to the first tab item.End (optional)Moves focus to the last tab item.Delete (optional)When deletion is allowed, Delete closes the currently activated tab item. If any tab items remain, moves focus to the tab item following one that was closed. Option 2: Automatic activation Key Interaction TabMoves focus into the tabs component and places focus on the selected tab item. If the tabs component is already in focus, moves focus to the next element in the page tab sequence.Left ArrowMoves focus to the previous tab item and automatically activates it. If focus is on the first tab item, moves focus to the last tab item.Right ArrowMoves focus to the next tab item and automatically activates it. If focus is on the last tab item, moves focus to the first tab item.Home (optional)Moves focus to the first tab item and automatically activates it.End (optional)Moves focus to the last tab item and automatically activates it.Delete (optional)When deletion is allowed, Delete closes the currently activated tab item. If any tab items remain, moves focus to and activates the tab item following one that was closed.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for interactive elements including tabs.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons used in tabs, must provide a text alternative that communicates the tab's purpose. All tabs, especially icon-only tabs, need an accessible name (for example, via a title, aria-label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAATabs should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Orientation 1.3.4 AATabs are available in both vertical and horizontal orientations.Use of color 1.4.1 AColor is not used as a means to convey information or distinguish elements.Contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Resize text 1.4.4 AATabs should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
