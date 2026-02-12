---

title: "Color wheel"
source\_url: <https://s2.spectrum.corp.adobe.com/page/color-wheel/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
* design-tokens
* color
  related\_components:
* color-slider
* combo-box
  parent\_category: inputs

---

# Color wheel

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Color | [wheel](https://opensource.adobe.com/spectrum-css/?path=/docs/components-color-wheel--docs)                                        |
| Spectrum Web Components SWC: Color | [Wheel](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/color-wheel--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                | [ColorWheel](https://react-spectrum.adobe.com/s2/index.html?path=/docs/colorwheel--docs)                                           |

## Anatomy

```
color wheel
- track
- handle
- loupe
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                           | Default value | Description                                 |
| ---------- | ----------------------------------------------- | ------------- | ------------------------------------------- |
| background | string                                          | –             | This will vary depending on implementation. |
| value      | number – Number (from minValue to               | maxValue)     |                                             |
| minValue   | number                                          | 0             |                                             |
| maxValue   | number                                          | 360           |                                             |
| step       | number                                          | 1             |                                             |
| size       | number 192 units:                               | px            |                                             |
| isDisabled | boolean                                         | false         |                                             |
| state      | default / hover / down / keyboard focus default | –             |                                             |

## External links

Color wheels adjust a single color channel using a circular track. They offer a visual, radial interface often paired with other color selection tools for more precise control.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A color wheel in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that the wheel may become available later.

A color wheel’s size can be customized appropriately for its context.

The step refers to the increment by which these values increase or decrease. A step value of 1 (default) allows a user to only select whole numbers within the min and max range.

The min and max values can also be customized appropriately for what the color wheel is being used for. By default, the min value starts at 0 and max value is set to 360.

The value is the number selected within the color wheel’s range, from the minimum value to the maximum value.

The background of the color wheel is a visual representation of the range of values that a user can select from. It can represent color properties such as hues or color channel values (such as RGB or CMYK levels). The exact format this background property takes will depend on what implementation you are working with. Some examples of the format include image, canvas, and gradient.

A color wheel can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

The color wheel is often used together with the color area component for color selection. When placing the color area inside the color wheel, make sure to leave enough of a margin between the two components to ensure there’s enough space for the both the handles.

When using color areas, it’s important to clearly display the color selection in real time. It can be in a color swatch, directly on the canvas, or both.

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a cursor, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.

## States

A color wheel can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

## Behaviors

A color wheel can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

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

* [Color slider](/page/color-slider/)
* [Combo box](/page/combo-box/)
