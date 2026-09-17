---
title: Color wheel
source_url: /web/rsp/components/color-wheel
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/color-wheel
swc_exists: false
---

# Color wheel

## Anatomy

color wheel track handle loupe

## Component options

isDisabled A color wheel in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that the wheel may become available later. size A color wheel's size can be customized appropriately for its context. step The step refers to the increment by which these values increase or decrease. A step value of 1 (default) allows a user to only select whole numbers within the min and max range. maxValue and minValue The min and max values can also be customized appropriately for what the color wheel is being used for. By default, the min value starts at 0 and max value is set to 360. value The value is the number selected within the color wheel's range, from the minimum value to the maximum value. background The background of the color wheel is a visual representation of the range of values that a user can select from. It can represent color properties such as hues or color channel values (such as RGB or CMYK levels). The exact format this background property takes will depend on what implementation you are working with. Some examples of the format include image, canvas, and gradient.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A color wheel can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

### Minimum size

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

## Usage guidelines

### Placing a color area inside a color wheel

The color wheel is often used together with the color area component for color selection. When placing the color area inside the color wheel, make sure to leave enough of a margin between the two components to ensure there's enough space for the both the handles.

### Display color selection

When using color areas, it's important to clearly display the color selection in real time. It can be in a color swatch, directly on the canvas, or both.

### Color loupe on down/touch state

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.
