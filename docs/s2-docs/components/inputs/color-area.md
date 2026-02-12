---
title: "Color area"
source_url: https://s2.spectrum.corp.adobe.com/page/color-area/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- design-tokens
- color
related_components:
- checkbox-group
- color-handle
parent_category: inputs

---

# Color area

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Color | [area](https://opensource.adobe.com/spectrum-css/?path=/docs/components-color-area--docs)                                        |
| Spectrum Web Components SWC: Color | [Area](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/color-area--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                | [ColorArea](https://react-spectrum.adobe.com/s2/index.html?path=/docs/colorarea--docs)                                           |

## Anatomy

```
color area
- area
- handle
- loupe
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                           | Default value | Description                                 |
| ---------- | ----------------------------------------------- | ------------- | ------------------------------------------- |
| background | string                                          | –             | This will vary depending on implementation. |
| x-value    | number – Number (from x-minValue to             | x-maxValue)   |                                             |
| x-minValue | number                                          | 0             |                                             |
| x-maxValue | number                                          | 100           |                                             |
| y-value    | number – Number (from y-minValue to             | y-maxValue)   |                                             |
| y-minValue | number                                          | 0             |                                             |
| y-maxValue | number                                          | 100           |                                             |
| step       | number                                          | 1             |                                             |
| width      | number 192 units:                               | px            |                                             |
| height     | number 192 units:                               | px            |                                             |
| isDisabled | boolean                                         | false         |                                             |
| state      | default / hover / down / keyboard focus default | –             |                                             |

## External links

A color area enables visual selection of two color properties at once. It's often paired with a color slider or color wheel.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A color area in a disabled state shows that an input exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that the area may become available later.

A color area’s height and width can be customized appropriately for its context.

The step refers to the increment by which these values increase or decrease. A step value of 1 (default) allows a user to only select whole numbers within the min and max range.

The x and y values are the numbers selected within the color area’s horizontal and vertical axes, respectively.

The x/y min and max values also can be customized appropriately for what the color area is being used for. By default, the min value starts at 0 and max value is set to 100.

A color area can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

The color area’s handle can slide all the way over the edge of the area. It always displays the selected color inside the handle and never gets cut off by the border or any container.

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

When using color areas, it’s important to clearly display the color selection in real time. This can be in a color swatch, directly on the canvas, or both.

The color loupe component can be used above the handle to show the selected color that would otherwise be covered by a mouse, stylus, or finger on the down/touch state. This can be customized to appear only on finger-input, or always appear regardless of input type.

## States

A color area can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

Minimum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

## Behaviors

A color area can be navigated using a keyboard. The keyboard focus state enlarges the handle to become twice as large.

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

* [Checkbox group](/page/checkbox-group/)
* [Color handle and loupe](/page/color-handle/)
