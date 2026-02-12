---
title: "Swatch"
source_url: https://s2.spectrum.corp.adobe.com/page/swatch/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
  related\_components:
- slider
- swatch-group
  parent\_category: inputs

---

# Swatch

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Swatch](https://opensource.adobe.com/spectrum-css/?path=/docs/components-swatch--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Swatch]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/swatch--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [ColorSwatch](https://react-spectrum.adobe.com/s2/index.html?path=/docs/colorswatch--docs)                                                                                              |

## Anatomy

```
swatch
- container
- color
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property       | Value                                           | Default value | Description                                                          |
| -------------- | ----------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| preview        | string                                          | –             | This will vary depending on implementation.                          |
| size           | xs / s / m / l m                                | –             |                                                                      |
| shape          | square / rectangle square                       | –             |                                                                      |
| cornerRounding | none / partial / full none                      | Determines    | the corner radius of the swatch. Partial refers to corner-radius-75. |
| isSelected     | boolean                                         | false         |                                                                      |
| isDisabled     | boolean                                         | false         |                                                                      |
| state          | default / hover / down / keyboard focus default | –             |                                                                      |

## External links

A swatch shows a small sample of a fill — such as a color, gradient, texture, or material — that is intended to be applied to an object.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

The preview shows the sample of the fill that the swatch represents. This property can be a color, gradient, texture, or material. The exact format this property takes will depend on implementation. Some examples of the format include color values, image, canvas, and gradient.

"Swatches come in four different sizes: extra-small, small, medium, and large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

"By default, swatches have partial rounding. There are 3 options for a swatch’s rounding: none, partial rounding, and full rounding."

A swatch can have a selected state to allow for selection. This is often used in a swatch group.

A swatch in a disabled state shows that the swatch exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that a swatch may become available later. Disabled swatches should be used with caution.

A swatch can be navigated using a keyboard. The keyboard focus state adds a blue ring to the swatch in focus.

Even though swatches can have a disabled state, hiding unavailable swatches reduces visual clutter and eases cognitive load. Only show disabled swatches if hiding them would cause confusion to your users.

## States

A swatch can be navigated using a keyboard. The keyboard focus state adds a blue ring to the swatch in focus.

## Behaviors

A swatch can be navigated using a keyboard. The keyboard focus state adds a blue ring to the swatch in focus.

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

* [Slider](/page/slider/)
* [Swatch group](/page/swatch-group/)
