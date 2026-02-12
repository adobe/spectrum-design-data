---
title: "Popover"
source_url: https://s2.spectrum.corp.adobe.com/page/popover/
last_updated: 2026-02-02
category: components/containers
component_type: container
status: published
tags:

- components-containers
related_components:
- divider
- standard-panel
parent_category: containers

---

# Popover

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Popover](https://opensource.adobe.com/spectrum-css/?path=/docs/components-popover--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Popover]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/popover--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Popover](https://react-spectrum.adobe.com/s2/index.html?path=/docs/popover--docs)                                                                                                        |

## Anatomy

```
popover
- tip (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property         | Value                                                                                                                                                                                                                                                     | Default value | Description |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| width            | number                                                                                                                                                                                                                                                    | –             |             |
| height           | number                                                                                                                                                                                                                                                    | –             |             |
| hideTip          | boolean                                                                                                                                                                                                                                                   | false         |             |
| placement        | top / top left / top right / top start / top end / bottom / bottom left / bottom right / bottom start / bottom end / left / left top / left bottom / start / start top / start bottom / right / right top / right bottom / end / end top / end bottom top | –             |             |
| offset           | number 8 pixel                                                                                                                                                                                                                                            | measurement   |             |
| crossOffset      | number                                                                                                                                                                                                                                                    | 0             |             |
| containerPadding | number 8 pixel                                                                                                                                                                                                                                            | measurement   |             |

## External links

Popovers are containers for transient content like menus, options, or additional actions. They float above the interface and stand out visually using stroke and drop shadow.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

To keep a popover within certain boundaries, such as a browser window, define a container and a container padding value.

"The cross offset is the placement offset on the cross axis: the x-axis for top and bottom positions, and the y-axis for left and right positions."

The offset is the space between the source and the popover (or tip, if present). Adjust it as needed to align visually with the source’s perceived bounds and maintain a balanced relationship between the two elements.

A popover is positioned in relation to its source.

Popovers usually appear without a tip and rely on a distinct down state in the source to show their origin. When the source lacks that visual cue, add a tip to reinforce the connection between the popover and its source.

A popover’s height can be customized appropriately for its context.

A popover’s width can be customized appropriately for its context.

Popovers stem off of action buttons that act as a source to open up transient content.

When displaying a popover, it should animate from its source to reinforce the connection between popover and source. It should fade in and slide with subtle motion from the source.

A popover can be dismissed by clicking or tapping anywhere outside it, including the source, or by selecting an option or taking an action inside the popover.

Trays can be used as alternatives to popovers on small screens. Use a tray when the amount of content is too large or overwhelming for a popover.

When the source that triggers the popover does not have a visually distinct down state, use a popover with a tip to clearly indicate the connection to its source.

## States

Popovers stem off of action buttons that act as a source to open up transient content.

Trays can be used as alternatives to popovers on small screens. Use a tray when the amount of content is too large or overwhelming for a popover.

## Behaviors

Popovers stem off of action buttons that act as a source to open up transient content.

Trays can be used as alternatives to popovers on small screens. Use a tray when the amount of content is too large or overwhelming for a popover.

## Usage guidelines

Trays can be used as alternatives to popovers on small screens. Use a tray when the amount of content is too large or overwhelming for a popover.

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

* [Divider](/page/divider/)
* [Standard panel](/page/standard-panel/)
