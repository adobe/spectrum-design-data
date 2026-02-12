---
title: "List view"
source_url: https://s2.spectrum.corp.adobe.com/page/list-view/
last_updated: 2026-02-02
category: components/actions
component_type: action
status: published
tags:

- components-actions
  related\_components:
- link
- menu
  parent\_category: actions

---

# List view

## Resources

### Design

* **Figma**: S2 Web

## Anatomy

```
list view
- list view section header
- list item
- checkbox
- icon
- thumbnail
- label (required)
- description (optional)
- actions
- trailing icons (drill-in icon, link out icon)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property      | Value                           | Default value | Description                                       |
| ------------- | ------------------------------- | ------------- | ------------------------------------------------- |
| selectionMode | none / single / multiple single | Defines       | how many items can be selected at once.           |
| isQuiet       | boolean                         | false         | If true, the list view uses a quiet visual style. |
| items         | array – An array of list view   | items.        |                                                   |

## External links

List views display content in a structured, scrollable list. They support sorting, organizing, and selecting multiple items at once.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A list view is a versatile component and can contain many items depending on the use case. These items can be icons, thumbnails, avatars, checkboxes, drag handles, action buttons, and more.

By default a list view is not quiet. If true, the list view uses a quiet visual style meaning there is no background or borders to the component.

The selection mode defines how many items can be selected at once. A list view can use single selection, multiple selection, or none.

In the highlight selection style for touch interactions, tapping anywhere on the item will navigate to its contents. For mouse-based interactions, double-clicking anywhere on the item or single-clicking the navigation icon will do the same.

In the checkbox selection style, clicking or tapping the label area or navigation icon of a list view item will navigate to its contents.

Single-clicking or tapping anywhere on a list view item will select the item, except the label in checkbox selection style. For checkbox selection style, clicking the label will navigate to the item.

In touch experiences, the list view default is navigation only with the highlight selection style. Users enter a selection mode by a touch and hold gesture on any list view item.

Selection mode in touch uses the checkbox selection style and suppresses navigation. Users can exit selection mode by pressing the Escape key or deselecting all items.

List view items can be dragged and dropped to reorder or restructure the list.

Multiple items can be dragged at a time and shifted from one level of hierarchy to another.

List views can also accept dropped items from outside the component, to modify the list.

A list view item's label or description will truncate if the text is longer than the available horizontal space. Display the full label or description text in a tooltip on hover and focus states.

When more than two actions are available for a list view item, the actions are nested within an action menu.

List views work best for flat collections of items that share the same hierarchy level.

Tree views are ideal for displaying nested or hierarchical relationships.

## States

In the checkbox selection style, clicking or tapping the label area or navigation icon of a list view item will navigate to its contents.

List view items can be dragged and dropped to reorder or restructure the list.

Multiple items can be dragged at a time and shifted from one level of hierarchy to another.

List views can also accept dropped items from outside the component, to modify the list.

When more than two actions are available for a list view item, the actions are nested within an action menu.

List views work best for flat collections of items that share the same hierarchy level.

Tree views are ideal for displaying nested or hierarchical relationships.

## Behaviors

In the checkbox selection style, clicking or tapping the label area or navigation icon of a list view item will navigate to its contents.

List view items can be dragged and dropped to reorder or restructure the list.

Multiple items can be dragged at a time and shifted from one level of hierarchy to another.

List views can also accept dropped items from outside the component, to modify the list.

When more than two actions are available for a list view item, the actions are nested within an action menu.

List views work best for flat collections of items that share the same hierarchy level.

Tree views are ideal for displaying nested or hierarchical relationships.

## Usage guidelines

List views work best for flat collections of items that share the same hierarchy level.

Tree views are ideal for displaying nested or hierarchical relationships.

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

* [Link](/page/link/)
* [Menu](/page/menu/)
