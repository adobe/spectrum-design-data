---
title: "Thumbnail"
source_url: https://s2.spectrum.corp.adobe.com/page/thumbnail/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- text-field
- accordion
parent_category: inputs

---

# Thumbnail

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Thumbnail](https://opensource.adobe.com/spectrum-css/?path=/docs/components-thumbnail--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Thumbnail]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/thumbnail--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |

## Anatomy

```
thumbnail
- container
- image
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property | Value                                                                | Default value | Description |
| -------- | -------------------------------------------------------------------- | ------------- | ----------- |
| size     | 50 / 75 / 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 / 1000 | –             |             |
| state    | default / disabled default                                           | –             |             |

## External links

Thumbnails display a preview of an image, layer, or effect, and appear in a variety of locations as a visual reference.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Thumbnail sizes scale exponentially. The opacity checkerboard responsively resizes to appropriately fit within each thumbnail size.

Thumbnails can be navigated using a keyboard in certain scenarios, such as layers or layer masks. When a thumbnail is used as pure representation of an item, focus should be set on the component the thumbnail is used within.

Thumbnails feature rounded corners and may include images with transparency. A subtle inset border helps distinguish images that might otherwise blend into the product’s theme colors.

When thumbnails are used in layer management (such as Treeview, Compact or Detail Layers panels), the thumbnail is given a thick gray border.

When a user selects a thumbnail in layer management, such as in Treeview, Compact or Detail Layers panels, it is highlighted with a thick blue border.

Tree view items can show thumbnails as an alternative to icons. Thumbnails are best used when a user needs to have a preview of the content represented by the tree view item. Icons can be used as a fallback for when an image is unavailable, but should be appropriately sized to match the thumbnail.

Tree views with thumbnails should use a thumbnail size that is appropriate to the size of the tree view itself. For example, an extra-large tree view would not work well with small thumbnails; those proportions may be better suited for using icons instead.

In some cases, multiple thumbnails need to be displayed in-line with the tree view item (e.g., layer masks). These thumbnails should be individually selectable and inherit all other behaviors of a standard tree view item, such as drag-and-drop behavior. Don't use more than 3 thumbnails per tree view item.

## States

When thumbnails are used in layer management (such as Treeview, Compact or Detail Layers panels), the thumbnail is given a thick gray border.

When a user selects a thumbnail in layer management, such as in Treeview, Compact or Detail Layers panels, it is highlighted with a thick blue border.

## Behaviors

When thumbnails are used in layer management (such as Treeview, Compact or Detail Layers panels), the thumbnail is given a thick gray border.

When a user selects a thumbnail in layer management, such as in Treeview, Compact or Detail Layers panels, it is highlighted with a thick blue border.

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

* [Text field](/page/text-field/)
* [Accordion](/page/accordion/)
