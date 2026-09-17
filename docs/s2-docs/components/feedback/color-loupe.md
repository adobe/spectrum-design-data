---
title: Color handle and loupe
source_url: /web/rsp/components/color-handle-and-loupe
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/color-handle-and-loupe
swc_exists: true
---

# Color handle and loupe

## Anatomy

color handle and loupe color handle opacity checkerboard color loupe (optional) opacity checkerboard

## Component options

isDisabled In the disabled state, the color handle indicates that input exists but is unavailable. The color loupe is not visible, as it only appears when interacting with the handle. channel Color handle and loupe are purely indicators - they report the current color channel values at the handle position.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedSupportedErrorNot supported

## Behaviors

### Handle behavior

In the color area and color slider, the handle can slide all the way to the edge of the component. It always displays the selected color inside the handle and never gets cut off by the border or any container.

### Transparent colors

When using transparent colors, the handle and loupe display an opacity checkerboard background to clearly show the level of transparency.

### Color loupe

The loupe is a floating element positioned above the handle. It provides a preview that reflects the color currently sampled by its parent color component and disappears when the interaction ends.

### Keyboard focus

The keyboard focus state enlarges the handle to become twice as large. The loupe is a visual-only element and should not receive focus since it does not provide interactive functionality.

## Usage guidelines

### Display combined values

Color selection usually happens using a variety of input methods (color area, color slider, color wheel). The color loupe should display the final output color: the combined values from multiple color inputs. The number of input methods is determined by the color space (or "mode"), for example: 2 controls: HSL using color wheel (hue) and color area (saturation and lightness) 3 controls: RGB using unique color sliders for Red, Green, and Blue 4 controls: RGBa using unique color sliders for Red, Green, Blue, and Alpha

### Color loupe on down/touch state

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.
