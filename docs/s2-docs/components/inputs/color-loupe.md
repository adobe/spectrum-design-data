---
title: "Color loupe"
source_url: https://s2.spectrum.corp.adobe.com/page/color-handle/
last_updated: 2026-06-09
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- color
- color-picker
parent_category: inputs

---

# Color loupe

## Overview

A color loupe shows the output color that would otherwise be covered by a cursor, stylus, or finger during color selection.

## Behaviors

### Color loupe

The loupe is a floating element positioned above the handle. It provides a preview that reflects the color currently sampled by its parent color component and disappears when the interaction ends.

### Transparent colors

When using transparent colors, the loupe displays an opacity checkerboard background to clearly show the level of transparency.

### Keyboard focus

The loupe is a visual-only element and should not receive focus since it does not provide interactive functionality.

## Usage guidelines

### Display combined values

Color selection usually happens using a variety of input methods (color area, color slider, color wheel). The color loupe should display the final output color: the combined values from multiple color inputs.

The number of input methods is determined by the color space (or "mode"), for example:

* 2 controls: HSL using color wheel (hue) and color area (saturation and lightness)
* 3 controls: RGB using unique color sliders for Red, Green, and Blue
* 4 controls: RGBa using unique color sliders for Red, Green, Blue, and Alpha

### Color loupe on down/touch state

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Color handle](/page/color-handle/)
* [Color area](/page/color-area/)
* [Color slider](/page/color-slider/)
