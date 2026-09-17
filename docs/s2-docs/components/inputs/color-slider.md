---
title: Color slider
source_url: /web/rsp/components/color-slider
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/color-slider
swc_exists: false
---

# Color slider

## Anatomy

color slider track handle loupe label value

## Component options

isDisabled A color slider in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a slider may become available later. length The slider's length can be customized based on its context, while its thickness stays fixed for consistency and usability. orientation Color sliders can be either in horizontal or vertical orientation. By default, a color slider is horizontal and should be used when vertical space is more limited. The vertical orientation is used when horizontal space is more limited. step The step refers to the increment by which these values increase or decrease. A step value of 1 (default) allows a user to only select whole numbers within the min and max range. maxValue and minValue The min and max values also can be customized appropriately for what the color slider is being used for (such as 0 to 360 for hue). By default, the min value starts at 0 and max value is set to 100. value The value is the number selected within the color slider's range, from the min value to max value. channel Controls a single color channel — such as hue, lightness, or alpha—at a time. The track's gradient visualizes the full range of values for that channel. background The background of the color slider is a visual representation of the range of values a user can select from. This can represent color properties such as hues, color channel values (such as RGB or CMYK levels), or opacity. The exact format this background property takes will depend on what implementation you are working with. Some examples of the format include image, canvas, and gradient.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

The keyboard focus state enlarges the handle to become twice as large. The loupe is a visual-only element and should not receive focus since it does not provide interactive functionality.

### Handle behavior

Unlike the slider itself, the color slider's handle can slide all the way to the edge of the track. It always displays the selected color inside the handle and never gets cut off by the track or any container.

### Minimum length

A color slider's minimum length is 80 px on desktop, 100 px on mobile.

## Usage guidelines

### Include labels

Color sliders should be labeled and, when applicable, paired with text fields. If labeling each individual slider is redundant, label the group of sliders instead (for example, "RGB" or "HSB").

### Display color selection

When using color sliders, it's important to clearly display the color selection in real time. It can be in a color swatch, directly on the canvas, or both.

### Color loupe on down/touch state

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.
