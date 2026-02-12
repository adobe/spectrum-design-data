---
title: "Color handle and loupe"
source_url: https://s2.spectrum.corp.adobe.com/page/color-handle-and-loupe/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- design-tokens
- color
related_components:
- color-area
- color-slider
parent_category: inputs

---

# Color handle and loupe

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Color | [handle](https://opensource.adobe.com/spectrum-css/?path=/docs/components-color-handle--docs)                                        |
| Spectrum Web Components SWC: Color | [Handle](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/color-handle--docs\&globals=system:spectrum-two) |

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

| Property   | Value                                                         | Default value | Description                                                         |
| ---------- | ------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| channel    | hue / saturation / lightness / red / green / blue / alpha hue | Which         | channel of the color this handle controls. Use 'alpha' for opacity. |
| isDisabled | boolean                                                       | false         |                                                                     |

## External links

Color handles select or adjust a color value along a track or wheel. They’re often paired with a color loupe to preview the selected color in context. The outer border is not included in the handle’s size.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

In the disabled state, the color handle indicates that input exists but is unavailable. The color loupe is not visible, as it only appears when interacting with the handle.

Color handle and loupe are purely indicators - they report the current color channel values at the handle position.

In the color area and color slider, the handle can slide all the way to the edge of the component. It always displays the selected color inside the handle and never gets cut off by the border or any container.

When using transparent colors, the handle and loupe display an opacity checkerboard background to clearly show the level of transparency.

The loupe is a floating element positioned above the handle. It provides a preview that reflects the color currently sampled by its parent color component and disappears when the interaction ends.

The keyboard focus state enlarges the handle to become twice as large. The loupe is a visual-only element and should not receive focus since it does not provide interactive functionality.

"Color selection usually happens using a variety of input methods (color area, color slider, color wheel). The color loupe should display the final output color: the combined values from multiple color inputs."

"The number of input methods is determined by the color space (or “mode”), for example:"

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.

## States

When using transparent colors, the handle and loupe display an opacity checkerboard background to clearly show the level of transparency.

"The number of input methods is determined by the color space (or “mode”), for example:"

## Behaviors

When using transparent colors, the handle and loupe display an opacity checkerboard background to clearly show the level of transparency.

"The number of input methods is determined by the color space (or “mode”), for example:"

## Usage guidelines

"The number of input methods is determined by the color space (or “mode”), for example:"

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
