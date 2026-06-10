---
title: "Color handle"
source_url: https://s2.spectrum.corp.adobe.com/page/color-handle/
last_updated: 2026-06-09
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- color
- color-picker
parent_category: inputs

---

# Color handle

## Overview

Color handles select or adjust a color value along a track or wheel. The outer border is not included in the handle's size.

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived)      | [CSS: Color handle](https://opensource.adobe.com/spectrum-css/?path=/docs/components-color-handle--docs)                                       |
| Spectrum Web Components      | [SWC: Color Handle](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/color-handle--docs&globals=system:spectrum-two) |
| React Spectrum               | Available as part of all relevant color components                                                                                             |

## Anatomy

```
color handle and loupe
- color handle
- opacity checkerboard
- color loupe (optional)
- opacity checkerboard
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                                             | Default value | Description                                                              |
| ----------- | ----------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| channel     | hue / saturation / lightness / red / green / blue / alpha        | hue           | Which channel of the color this handle controls. Use 'alpha' for opacity. |
| isDisabled  | boolean                                                           | false         |                                                                          |

### isDisabled

In the disabled state, the color handle indicates that input exists but is unavailable. The color loupe is not visible, as it only appears when interacting with the handle.

### channel

Color handle and loupe are purely indicators - they report the current color channel values at the handle position.

## States

| State          | Support status |
| -------------- | -------------- |
| Default        | Supported      |
| Hover          | Not supported  |
| Down           | Not supported  |
| Keyboard focus | Supported      |
| Disabled       | Supported      |
| Selected       | Not supported  |
| Dragged        | Supported      |
| Error          | Not supported  |

## Behaviors

### Handle behavior

In the color area and color slider, the handle can slide all the way to the edge of the component. It always displays the selected color inside the handle and never gets cut off by the border or any container.

### Transparent colors

When using transparent colors, the handle displays an opacity checkerboard background to clearly show the level of transparency.

### Keyboard focus

The keyboard focus state enlarges the handle to become twice as large.

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

* [Color area](/page/color-area/)
* [Color slider](/page/color-slider/)
