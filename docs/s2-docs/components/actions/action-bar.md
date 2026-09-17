---
title: Action bar
source_url: /web/rsp/components/action-bar
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/action-bar
swc_exists: false
---

# Action bar

## Anatomy

action bar close button label action group (quiet)

## Component options

isEmphasized An action bar is not emphasized by default. isEmphasized inverts the coloring of the action bar and is best used for when the bar needs to stand out from the rest of the UI, directing a user's focus to the actions.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Action bar in Dark theme

Action bar is split into a separate component for each color theme — light and dark. Since each is set to either light or dark mode in Figma, they do not switch automatically like the rest of the UI when placed in frames that are set to “auto” mode. In dark theme, the action bar also includes a 1px inner border to help it stand out against the background colors.

### Action group variants (Icon-only, Label-only, Icon + label)

At larger screen or section sizes, use an action group that shows a label and icon. For smaller screen or section sizes, use an icon-only action group. Place any overflow actions into a action menu at the end of the bar.

### Action disabled behavior

Individual actions can be disabled in an action bar which follow the isDisabled property of the action group. This disabled state shows that the action buttons within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action group may become available later.

### Placement

When a user selects items with relevant actions, an action bar appears at the bottom of the viewport. The bar should have margins of spacing-200 (12 pixels on desktop scale) on the sides and bottom.

### Safe zone

Include a safe zone of at least spacing-400 (24 pixels on desktop scale) between the item counter and the action group.

### Motion and stickiness

Action bars slide and fade in from the bottom of the page or section. They remain or "stick" there until a user either deselects the items or navigates away.

## Usage guidelines

### Don't add a drag bar

An action bar appears when items in a list or grid view are selected, and it remains in place until items are deselected or a user navigates away. Action bars can not be moved or dragged.

### Allow scrolling to view underlying content

Action bars appear on top of content. Allow space for a user to still be able to view the content underneath, especially if they're taking actions on a table or a list of items and need to be able to scroll.

### Don’t use quick actions

Instead of quick actions, use an action bar for both single and bulk selection patterns. An action bar is useful for when a user needs to perform actions on either a single or multiple items at the same time. It can be used on either a grid view or a table view. Don’t use quick actions — a deprecated component — because it presents conflicting nested actions (for example, a whole asset card could open a detailed view). This makes targeting specific actions very difficult, especially on smaller screens or with the keyboard.
