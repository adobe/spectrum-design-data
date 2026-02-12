---
title: "Segmented control"
source_url: https://s2.spectrum.corp.adobe.com/page/segmented-control/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- search-field
- select-box
parent_category: inputs

---

# Segmented control

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                    | Link                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) Not | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/segmentedcontrol--docs)        |
| Spectrum Web Components Not | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/segmentedcontrol--docs)        |
| React Spectrum RSP:         | [SegmentedControl](https://react-spectrum.adobe.com/s2/index.html?path=/docs/segmentedcontrol--docs) |

## Anatomy

```
segmented control
- track
- segmented control item
- icon (optional)
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                                 | Default value | Description                                                                                                      |
| ------------------ | ------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| orientation        | horizontal / vertical horizontal      | –             |                                                                                                                  |
| isFluid            | boolean                               | false         | If true, the control takes up the full width of its container. Only applicable to horizontal segmented controls. |
| alignment          | start / center start                  | –             |                                                                                                                  |
| hideTracker        | boolean                               | false         | If true, the tracker that indicates the selected item is hidden.                                                 |
| selectedItem       | string                                | –             | The identifier of the currently selected item.                                                                   |
| keyboardActivation | manual / automatic manual             | –             |                                                                                                                  |
| items              | array – An array of segmented control | items.        |                                                                                                                  |

## External links

Segmented controls display a group of buttons where only one can be selected at a time. They're ideal for toggling between layouts like a list, grid, or map. Avoid using them for navigation or triggering actions.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Segmented controls should have between two and five items.

The identifier of the currently selected item.

By default, segmented controls should include a track. The track style is justified within the parent container. Segmented controls without a track are left-aligned in left-to-right (LTR) languages.

Segmented controls without a track are left aligned in left-to-right languages.

If true, the control takes up the full width of its container. Only horizontal segmented controls support fluid behavior.

Segmented controls can be either horizontal or vertical. By default, segmented controls are horizontal.

Segmented controls have one item selected by default at all times, and are mutually exclusive. This means selecting one item automatically deselects the others.

Clicking on a segmented control item immediately performs the view change.

When the segmented control item text is too long for the available horizontal space, it truncates at the end. The full text should be revealed with a tooltip on hover.

Icon-only or truncated label segmented controls can be hard to identify. They should display a tooltip after a brief hover, showing the name and a keyboard shortcut, if applicable.

Segmented controls are only meant to be used to change the way you view information on a page. They should not be used for navigating, filtering content, or taking actions.

Use a segmented control when the primary goal is to switch views of content. Tabs are reserved for navigation. Action groups are for triggering actions. Tag groups are for filtering content.

It may not make sense in every case to include icons. If the items are too complicated to convey in an icon, don’t force it. Keep in mind that if one segmented control has an icon, then they all should have an icon.

Segmented control groups work best with 2 to 5 items. If your component needs more than 5 items, consider using a dropdown or radio button group instead.

Segmented control groups are meant for switching views on a page. To navigate to a different page or progressively disclose different content, use tabs instead. To perform actions or make a selection, use action groups.

## States

Clicking on a segmented control item immediately performs the view change.

## Behaviors

Clicking on a segmented control item immediately performs the view change.

## Usage guidelines

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

* [Search field](/page/search-field/)
* [Select box](/page/select-box/)
