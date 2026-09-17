---
title: List view
source_url: /web/rsp/components/list-view
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/list-view
swc_exists: false
---

# List view

## Anatomy

list view list view section header list item checkbox icon thumbnail label (required) description (optional) actions trailing icons (drill-in icon, link out icon)

## Component options

items A list view is a versatile component and can contain many items depending on the use case. These items can be icons, thumbnails, avatars, checkboxes, drag handles, action buttons, and more. isQuiet By default a list view is not quiet. If true, the list view uses a quiet visual style meaning there is no background or borders to the component. selectionMode The selection mode defines how many items can be selected at once. A list view can use single selection, multiple selection, or none.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedSupportedErrorNot supported

## Behaviors

### Navigation

In the highlight selection style for touch interactions, tapping anywhere on the item will navigate to its contents. For mouse-based interactions, double-clicking anywhere on the item or single-clicking the navigation icon will do the same. In the checkbox selection style, clicking or tapping the label area or navigation icon of a list view item will navigate to its contents.

### Selection

Single-clicking or tapping anywhere on a list view item will select the item, except the label in checkbox selection style. For checkbox selection style, clicking the label will navigate to the item.

### Touch navigation and selection

In touch experiences, the list view default is navigation only with the highlight selection style. Users enter a selection mode by a touch and hold gesture on any list view item. Selection mode in touch uses the checkbox selection style and suppresses navigation. Users can exit selection mode by pressing the Escape key or deselecting all items.

### Drag and drop

List view items can be dragged and dropped to reorder or restructure the list. Multiple items can be dragged at a time and shifted from one level of hierarchy to another. List views can also accept dropped items from outside the component, to modify the list. Keyboard-based drag and drop When using this option for a list view, the drag icon receives keyboard focus in order to allow for a keyboard-based drag and drop interaction. Touch-based drag and drop The drag and drop interaction is initiated by a touch and hold gesture, followed by drag gesture. If a user performs a touch and hold gesture without dragging, the list view enters a selection mode.

### Text overflow

A list view item's label or description will truncate if the text is longer than the available horizontal space. Display the full label or description text in a tooltip on hover and focus states.

### Actions overflow

When more than two actions are available for a list view item, the actions are nested within an action menu.

## Usage guidelines

### When to use a List view vs. Tree view

List views work best for flat collections of items that share the same hierarchy level. Tree views are ideal for displaying nested or hierarchical relationships.
