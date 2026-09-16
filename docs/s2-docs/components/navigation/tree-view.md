---
title: Tree view
source_url: /web/rsp/components/tree-view
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/tree-view
swc_exists: false
---

# Tree view

## Anatomy

tree view header (optional) tree view item label collapse and expand button checkbox (optional) drag icon (optional) context area (optional icon or thumbnail) actions area (optional action button or action group) in-field progress circle

## Component options

size A tree view offers four sizes: small, medium, large and extra-large. Medium is the default and most common. Use other sizes sparingly to create a visual hierarchy of importance on the page. isDetached When placed outside a panel, a tree view uses the detached style with rounded corners. Inside a panel, it spans edge to edge by default and does not include rounded corners. showDragIcon Tree view items can include a drag icon when needed. The icon serves as a keyboard-navigable indicator for items that support multiple actions. It appears only on hover, active and keyboard focus states. selectionMode The type of selection allowed in a collection can be none, single or multiple. None: tree view does not allow item selection by default. Single: users can select only one item at a time. Multiple: users can select more than one item at a time. selectionStyle Checkbox With checkboxes, both single-select and multi-select views display boxes on the left of each item. Clicking another item adds it to the selection, and clicking a selected item removes it. Highlight Use highlight selection when checkboxes add clutter or unnecessary controls. This style shows a highlighted state for selected items, and clicking a new item replaces the previous selection by default. All tree views have a hover state, regardless of whether actions or selections can be made. selectionBehavior Tree views support both single-select and multi-select modes, using either checkbox or highlight styles. In multi-select mode, selecting an item toggles its selection on or off. In single-select mode, selecting an item replaces the current selection.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedSupportedErrorNot supported

## Behaviors

### Collapse and expand

Clicking the collapse and expand button will expand or collapse a tree view item that contains child tree view items.

### Drag and drop

Tree view items can be dragged and dropped to reorder or restructure the hierarchy, including multiple items at once. Dropping items from different hierarchies into a new location flattens them as sibling children. Tree views should also accept external drops, such as files, to create new items. Drag icon focus: When this option is enabled, the drag icon receives keyboard focus to support keyboard-based drag-and-drop.

### Text overflow

When a tree view item label is too long for the available horizontal space, it truncates. The full label appears in a tooltip on hover or keyboard focus.

## Usage guidelines

### Always display the collapse and expand button

For proper functionality, a parent-level tree view must include a collapse-and-expand button that uses a chevron icon - regardless of its nesting level. This makes the expected behavior clear when users click an item icon.

### Using multiple sources in one tree view

When displaying hierarchical information from different sources, use a single tree view with separate sections and headings. Do not cross-reference sources to avoid confusing users. Single and multi-selection should work as expected within one tree view component.

### Customize the root item display

The root (topmost) level of the hierarchy does not always need to be shown or displayed as a tree view item. If the root provides no useful context, hide it or replace it with a section header. In cases such as mixed tree views, the root can serve as a "Back" button.

### Drill-in tree views

In some cases, users may need to view different hierarchies depending on context. To support this, let users drill into a tree view item to display a different variation of the tree view within the same panel. Use a navigation controller with a "Back" button to let users return to the previous view.

### Iconography

Choose icons that match the object type represented in the tree view. Icons can be unique to specific data types to help clarify meaning for users.

### Using thumbnails

Tree view items can display thumbnails instead of icons when users need a content preview. Use icons as a fallback when an image is unavailable, and size them to match the thumbnail. Thumbnails should scale appropriately to the tree view size. For example, an extra-large tree view should not use small thumbnails; in that case, icons may work better. Multiple thumbnails may be displayed in line with a tree view item (for example, layer masks). Each thumbnail should be individually selectable and support standard tree view behaviors, including drag-and-drop. Do not use more than three thumbnails per item.

### Restrict hierarchy depth

One way to manage overflow is to limit how many levels of hierarchy users can create in a tree view. Some products use this approach to reduce the complexity of deeply nested hierarchies. Setting limits helps when a complex hierarchy is unnecessary for the experience.

### Show truncated labels in tooltip

When a label is too long to fit in the tree view, it truncates with an ellipsis. Hovering over or focusing on the item reveals a tooltip with the full label text.

### Use an adjustable layout

When a tree view hierarchy may extend beyond the available layout space, use an adjustable layout mechanism such as panels or rails. This lets users modify the layout while preserving visibility of the tree view.

### Horizontal scrolling

If you have a layout that doesn't allow for users to adjust the width of the container for a tree view, allow them to horizontally scroll in order to see the full depth of the hierarchy.

### Large tree views

When tree views are very large, use a progress circle or a "Show more" control to reveal additional parts when contextually relevant. These loading patterns can apply to the entire tree view or to nested items.

### Loading tree view items

If system processes are delaying the display of child tree view items when a parent tree view item is expanded, show a clear indication that the items are in the process of loading.

### Sorting

Users should be able to sort a tree view. Sorting should not affect the hierarchical structure since each layer of the hierarchy is sorted individually.

### Modifying the tree view

Users may need to modify a tree view directly. They should be able to create new parent or child items, such as groups or folders, and flatten the hierarchy at the item level, such as ungrouping layers. In some cases, users should be able to edit item labels directly. Any action for modifying the hierarchy should be offered as an explicit control and, if needed, as a keyboard shortcut — but never as a shortcut alone.

### Entering into multiple selection mode

Allow users to enter multiple-selection mode explicitly when keyboard shortcuts such as Shift + click are unavailable or when you need to show a different selection type. Do this by toggling the selection style from highlight to checkbox.

### Use checkbox selection for modifying a tree view

The checkbox selection style is intended for performing bulk actions on tree view items. Use this option when selection corresponds to bulk actions.

### Use a checkbox component when selection doesn't affect tree view items

When you need to provide selection controls within a hierarchy, use a checkbox component instead of the tree view item's label. This should not correspond to selecting specific content and works best for cases like categorized filtering.

## Internationalization

### RTL

For RTL (right-to-left) languages, the entire tree view is mirrored horizontally, including the direction of the collapse and expand button. Workflow icons follow iconography internationalization guidelines.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus to the tree view, placing the first tree view item in focus.Shift + TabMoves focus out of the tree view to the previous focusable element.Down ArrowMoves focus to the tree view item below or to the next thumbnail of a tree view item.Up ArrowMoves focus to the tree view item above or to the previous thumbnail of a tree view item.Enter or SpaceSelects the currently focused tree view item. If focus is on a child of the tree view item, subsequent action is based on the child component’s keyboard interactions. For the drag icon, this places the user in drag-and-drop mode.Right Arrow (Left Arrow in RTL)Expands the currently focused tree view item. If the tree view item is already expanded, or if the tree view item is not expandable, focus is moved in a left-to-right direction along child components. If focus is on the rightmost child of the tree view item, focus does not move.Left Arrow (Right Arrow in RTL)Collapses the currently focused tree view item. If focus is on a child of the tree view item, focus is moved in a right-to-left direction along child components. If focus is on the leftmost child of the tree view item, focus is placed back on the parent tree view item.HomeMoves focus to the first item in the tree view without opening or closing a level.EndMoves focus to the last item in the tree view that is focusable without opening a level.Cmd + [ (optional)Moves the currently selected item up in the view order.Cmd + ] (optional)Moves the currently selected item down in the view order.Cmd + Z (optional)Undoes the action most recently taken, such as after the user drags and drops, reorders, or performs an action on a tree view item.Cmd + G (optional)Groups the selected tree view item(s) into a new parent tree view item.Shift + Cmd + G (optional)Ungroups or removes the selected parent tree view item, placing its children at the same level of hierarchy as the removed items.Printable charactersTypeahead: moves focus to next node matching typed text.* (optional)Expands all sibling nodes at the same level.

### Cursor guidelines

Cursor Description Default (Arrow)Use the default arrow cursor for non-interactive headers and disabled text.PointerUse the pointer cursor for all interactive pieces of the tree view component.Grab handUse the grab hand on the drag handle when tree view objects can be moved.Grab fistUse the grab fist cursor when actively dragging tree items.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons used in tree view items, must provide a text alternative that communicates the item's purpose. All tree items, especially icon-only items, need an accessible name (for example, via a title, aria-label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAATree views should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized, including parent/child relationships, expanded/collapsed states, and selection states.Use of color 1.4.1 AColor is not used as a means to convey information or distinguish elements.Contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and component states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
