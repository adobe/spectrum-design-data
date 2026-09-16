---
title: Color area
source_url: /web/rsp/components/color-area
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/color-area
swc_exists: false
---

# Color area

## Anatomy

color area area handle loupe

## Component options

isDisabled A color area in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that the area may become available later. height and width A color area's height and width can be customized appropriately for its context. step The step refers to the increment by which these values increase or decrease. A step value of 1 (default) allows a user to only select whole numbers within the min and max range. x-value and y-value The x and y values are the numbers selected within the color area's horizontal and vertical axes, respectively. x/y-min and x/y-max value The x/y min and max values also can be customized appropriately for what the color area is being used for. By default, the min value starts at 0 and max value is set to 100.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A color area can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

### Handle behavior

The color area's handle can slide all the way over the edge of the area. It always displays the selected color inside the handle and never gets cut off by the border or any container.

### Minimum width and height

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

## Usage guidelines

### Display color selection

When using color areas, it's important to clearly display the color selection in real time. This can be in a color swatch, directly on the canvas, or both.

### Color loupe on down/touch states

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a mouse, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.
