---
title: "Color slider"
source_url: https://s2.spectrum.corp.adobe.com/page/color-slider/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- design-tokens
- color
related_components:
- color-handle
- color-wheel
parent_category: inputs

---

# Color slider

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Color | [slider](https://opensource.adobe.com/spectrum-css/?path=/docs/components-color-slider--docs)                                        |
| Spectrum Web Components SWC: Color | [Slider](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/color-slider--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                | [ColorSlider](http://react-spectrum.adobe.com/s2/index.html?path=/docs/colorslider--docs)                                            |

## Anatomy

```
color slider
- track
- handle
- loupe
- label
- value
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                                         | Default value | Description                                                         |
| ----------- | ------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| background  | string                                                        | –             | This will vary depending on implementation.                         |
| channel     | hue / saturation / lightness / red / green / blue / alpha hue | Which         | channel of the color this slider controls. Use 'alpha' for opacity. |
| value       | number – Number (from minValue to                             | maxValue).    |                                                                     |
| minValue    | number                                                        | 0             |                                                                     |
| maxValue    | number                                                        | 100           |                                                                     |
| step        | number                                                        | 1             |                                                                     |
| orientation | horizontal / vertical horizontal                              | –             |                                                                     |
| length      | number 192 units:                                             | px            |                                                                     |
| isDisabled  | boolean                                                       | false         |                                                                     |
| state       | default / hover / down / keyboard focus default               | –             |                                                                     |

## External links

Color sliders adjust a single channel of a color. They’re often used in combination with other color controls to provide fine-tuned visual selection.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A color slider in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a slider may become available later.

The slider’s length can be customized based on its context, while its thickness stays fixed for consistency and usability.

Color sliders can be either in horizontal or vertical orientation. By default, a color slider is horizontal and should be used when vertical space is more limited. The vertical orientation is used when horizontal space is more limited.

The step refers to the increment by which these values increase or decrease. A step value of 1 (default) allows a user to only select whole numbers within the min and max range.

The min and max values also can be customized appropriately for what the color slider is being used for (such as 0 to 360 for hue). By default, the min value starts at 0 and max value is set to 100.

The value is the number selected within the color slider’s range, from the min value to max value.

Controls a single color channel — such as hue, lightness, or alpha—at a time. The track’s gradient visualizes the full range of values for that channel.

The background of the color slider is a visual representation of the range of values a user can select from. This can represent color properties such as hues, color channel values (such as RGB or CMYK levels), or opacity. The exact format this background property takes will depend on what implementation you are working with. Some examples of the format include image, canvas, and gradient.

The keyboard focus state enlarges the handle to become twice as large. The loupe is a visual-only element and should not receive focus since it does not provide interactive functionality.

Unlike the slider itself, the color slider’s handle can slide all the way to the edge of the track. It always displays the selected color inside the handle and never gets cut off by the track or any container.

A color slider’s minimum length is 80 px on desktop, 100 px on mobile.

Color sliders should be labeled and, when applicable, paired with text fields. If labeling each individual slider is redundant, label the group of sliders instead (for example, “RGB” or “HSB”).

When using color sliders, it’s important to clearly display the color selection in real time. It can be in a color swatch, directly on the canvas, or both.

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.

## States

A color slider’s minimum length is 80 px on desktop, 100 px on mobile.

## Behaviors

A color slider’s minimum length is 80 px on desktop, 100 px on mobile.

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

* [Color handle and loupe](/page/color-handle/)
* [Color wheel](/page/color-wheel/)
