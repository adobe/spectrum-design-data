---

title: "Tree view"
source\_url: <https://s2.spectrum.corp.adobe.com/page/tree-view/>
last\_updated: 2026-02-02
category: components/navigation
component\_type: navigation
status: published
tags:

* components-navigation
  related\_components:
* tabs
* avatar
  parent\_category: navigation

---

# Tree view

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Tree | [view](https://opensource.adobe.com/spectrum-css/?path=/docs/components-tree-view--docs) |
| Spectrum Web Components Not       | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/treeview--docs)    |
| React Spectrum RSP:               | [TreeView](https://react-spectrum.adobe.com/s2/index.html?path=/docs/treeview--docs)     |

## Anatomy

```
tree view
- header (optional)
- tree view item
- label
- collapse and expand button
- checkbox (optional)
- drag icon (optional)
- context area (optional icon or thumbnail)
- actions area (optional action button or action group)
- in-field progress circle
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property          | Value                                           | Default value | Description |
| ----------------- | ----------------------------------------------- | ------------- | ----------- |
| size              | s / m / l / xl m                                | –             |             |
| isDetached        | boolean                                         | false         |             |
| isEmphasized      | boolean                                         | false         |             |
| showDragIcon      | boolean                                         | false         |             |
| selectionMode     | single / multiple multiple                      | –             |             |
| selectionStyle    | checkbox / highlight checkbox                   | –             |             |
| selectionBehavior | toggle / replace toggle                         | –             |             |
| state             | default / hover / down / keyboard focus default | –             |             |

## External links

Tree views display nested, hierarchical content in a collapsible structure. They allow for navigation through multiple levels of grouped information.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

"A tree view offers four sizes: small, medium, large and extra-large. Medium is the default and most common. Use other sizes sparingly to create a visual hierarchy of importance on the page."

When placed outside a panel, a tree view uses the detached style with rounded corners. Inside a panel, it spans edge to edge by default and does not include rounded corners.

Tree view items can include a drag icon when needed. The icon serves as a keyboard-navigable indicator for items that support multiple actions. It appears only on hover, active and keyboard focus states.

The type of selection allowed in a collection can be none, single or multiple.

Checkbox With checkboxes, both single-select and multi-select views display boxes on the left of each item. Clicking another item adds it to the selection, and clicking a selected item removes it.

Highlight Use highlight selection when checkboxes add clutter or unnecessary controls. This style shows a highlighted state for selected items, and clicking a new item replaces the previous selection by default.

All tree views have a hover state, regardless of whether actions or selections can be made.

Tree views support both single-select and multi-select modes, using either checkbox or highlight styles. In multi-select mode, selecting an item toggles its selection on or off. In single-select mode, selecting an item replaces the current selection.

Clicking the collapse and expand button will expand or collapse a tree view item that contains child tree view items.

Tree view items can be dragged and dropped to reorder or restructure the hierarchy, including multiple items at once. Dropping items from different hierarchies into a new location flattens them as sibling children. Tree views should also accept external drops, such as files, to create new items.

When a tree view item label is too long for the available horizontal space, it truncates. The full label appears in a tooltip on hover or keyboard focus.

For proper functionality, a parent-level tree view must include a collapse-and-expand button that uses a chevron icon - regardless of its nesting level. This makes the expected behavior clear when users click an item icon.

When displaying hierarchical information from different sources, use a single tree view with separate sections and headings. Do not cross-reference sources to avoid confusing users. Single and multi-selection should work as expected within one tree view component.

The root (topmost) level of the hierarchy does not always need to be shown or displayed as a tree view item. If the root provides no useful context, hide it or replace it with a section header. In cases such as mixed tree views, the root can serve as a “Back” button.

In some cases, users may need to view different hierarchies depending on context. To support this, let users drill into a tree view item to display a different variation of the tree view within the same panel. Use a navigation controller with a “Back” button to let users return to the previous view.

Choose icons that match the object type represented in the tree view. Icons can be unique to specific data types to help clarify meaning for users.

Tree view items can display thumbnails instead of icons when users need a content preview. Use icons as a fallback when an image is unavailable, and size them to match the thumbnail. Thumbnails should scale appropriately to the tree view size. For example, an extra-large tree view should not use small thumbnails; in that case, icons may work better.

One way to manage overflow is to limit how many levels of hierarchy users can create in a tree view. Some products use this approach to reduce the complexity of deeply nested hierarchies. Setting limits helps when a complex hierarchy is unnecessary for the experience.

When a label is too long to fit in the tree view, it truncates with an ellipsis. Hovering over or focusing on the item reveals a tooltip with the full label text.

When a tree view hierarchy may extend beyond the available layout space, use an adjustable layout mechanism such as panels or rails. This lets users modify the layout while preserving visibility of the tree view.

If you have a layout that doesn't allow for users to adjust the width of the container for a tree view, allow them to horizontally scroll in order to see the full depth of the hierarchy.

When tree views are very large, use a progress circle or a “Show more” control to reveal additional parts when contextually relevant. These loading patterns can apply to the entire tree view or to nested items.

If system processes are delaying the display of child tree view items when a parent tree view item is expanded, show a clear indication that the items are in the process of loading.

Users should be able to sort a tree view. Sorting should not affect the hierarchical structure since each layer of the hierarchy is sorted individually.

Users may need to modify a tree view directly. They should be able to create new parent or child items, such as groups or folders, and flatten the hierarchy at the item level, such as ungrouping layers. In some cases, users should be able to edit item labels directly.

Any action for modifying the hierarchy should be offered as an explicit control and, if needed, as a keyboard shortcut — but never as a shortcut alone.

Allow users to enter multiple-selection mode explicitly when keyboard shortcuts such as Shift + click are unavailable or when you need to show a different selection type. Do this by toggling the selection style from highlight to checkbox.

The checkbox selection style is intended for performing bulk actions on tree view items. Use this option when selection corresponds to bulk actions.

When you need to provide selection controls within a hierarchy, use a checkbox component instead of the tree view item’s label. This should not correspond to selecting specific content and works best for cases like categorized filtering.

## States

Clicking the collapse and expand button will expand or collapse a tree view item that contains child tree view items.

Choose icons that match the object type represented in the tree view. Icons can be unique to specific data types to help clarify meaning for users.

The checkbox selection style is intended for performing bulk actions on tree view items. Use this option when selection corresponds to bulk actions.

## Behaviors

Clicking the collapse and expand button will expand or collapse a tree view item that contains child tree view items.

Choose icons that match the object type represented in the tree view. Icons can be unique to specific data types to help clarify meaning for users.

The checkbox selection style is intended for performing bulk actions on tree view items. Use this option when selection corresponds to bulk actions.

## Usage guidelines

Choose icons that match the object type represented in the tree view. Icons can be unique to specific data types to help clarify meaning for users.

The checkbox selection style is intended for performing bulk actions on tree view items. Use this option when selection corresponds to bulk actions.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Tabs](/page/tabs/)
* [Avatar](/page/avatar/)
