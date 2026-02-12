---
title: "Slider"
source_url: https://s2.spectrum.corp.adobe.com/page/slider/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
  related\_components:
- select-box
- swatch
  parent\_category: inputs

---

# Slider

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Slider](https://opensource.adobe.com/spectrum-css/?path=/docs/components-slider--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Slider]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/slider--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Slider](https://react-spectrum.adobe.com/s2/index.html?path=/docs/slider--docs)                                                                                                        |

## Anatomy

```
slider
- label (optional)
- value (optional)
- track
- fill
- handle
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property         | Value                                           | Default value | Description                                                                              |
| ---------------- | ----------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| label            | string                                          | –             |                                                                                          |
| labelPosition    | top / side top                                  | –             |                                                                                          |
| value            | number – from minValue to                       | maxValue      |                                                                                          |
| minValue         | number                                          | 0             |                                                                                          |
| maxValue         | number                                          | 100           |                                                                                          |
| isRange          | boolean                                         | false         | If true, the slider will allow selection of a range of values by displaying two handles. |
| step             | number                                          | 1             |                                                                                          |
| valueFormat      | string                                          | –             | This will vary depending on implementation.                                              |
| progressionScale | linear / log linear                             | –             |                                                                                          |
| width            | number                                          | –             |                                                                                          |
| hasFill          | boolean                                         | false         |                                                                                          |
| fillStart        | number                                          | 0             |                                                                                          |
| hasGradient      | boolean                                         | false         |                                                                                          |
| isEditable       | boolean                                         | false         |                                                                                          |
| isDisabled       | boolean                                         | false         |                                                                                          |
| state            | default / hover / down / keyboard focus default | –             |                                                                                          |

## External links

Sliders select a value along a continuous range. They’re ideal when upper and lower limits are fixed. Use when approximate or fast selection is more important than precision.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long text, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

The value is the number selected within the slider’s range, from the min value to max value.

The min and max values can also be customized appropriately for whatever the slider is showing. By default, the min value starts at 0 and the max value is set to 100.

More information about a design scenario, to use this option in the component.

The step is the increment by which these values increase or decrease. A step value of 1 (the default) lets a user only select whole numbers within the min and max range.

Sometimes a value needs to be formatted for localization or for clearer communication such as currencies or percentages. Formatting can involve rounding, mathematical transformations, number formatting, or displaying a prefix or suffix, such as “+/-” or “px.”

Sliders use a linear progression scale by default which means that value is directly correlated to the position of the handle along the track. In some cases, sliders can use a logarithmic (log) progression scale, which is helpful when users need finer control over small values.

The width of a slider can be customized appropriately for its context.

The track of the slider can have a fill. By default, the fill originates from the left side of the track.

If the value represents an offset, the fill start can be set to represent the point of origin. This allows the slider fill to start from inside the track.

A gradient can be added to the track of any slider to give more meaning to the range of values. Tracks with a gradient can also have a fill. A gradient track should not be used for choosing a precise color; use a color slider, color area, or color wheel instead.

In situations where users should be able to precisely input a value, the value can be editable within a text field.

A disabled slider shows that an input exists but is not available in the current context. This helps maintain layout continuity and signals that the slider may become available later.

A slider can be navigated using a keyboard. The keyboard focus state takes the slider’s visual hover state and adds a blue ring to the slider handle in focus.

A slider representing multiple non-identical values appears as indeterminate, with an en dash (–) in place of the value. The handle position corresponds to the first selected value.

When the label is too long for the available horizontal space, it wraps to form another line.

After a slider has been adjusted, it can be reset to the default value by double-clicking the handle.

Every slider should have a label. A slider without a label is ambiguous and not accessible. Write the label in sentence case.

In addition to dragging the handle, sliders can offer other ways to change the value, known as “hot text.” Users can click the value text and drag up or down, or scroll up or down while hovering over the value text.

Slider values can include a unit when it adds context, such as “%” or “px.” When the value is shown within a text field, the unit disappears on focus.

If the value ranges from negative to positive, prefix the value with a plus (+) or minus (-) sign. When the sign is shown within a text field, it remains visible on focus. When the sign is shown outside the text field, there should be a space between the sign and the numerical value for readability.

## States

When the label is too long for the available horizontal space, it wraps to form another line.

After a slider has been adjusted, it can be reset to the default value by double-clicking the handle.

Every slider should have a label. A slider without a label is ambiguous and not accessible. Write the label in sentence case.

Slider values can include a unit when it adds context, such as “%” or “px.” When the value is shown within a text field, the unit disappears on focus.

## Behaviors

When the label is too long for the available horizontal space, it wraps to form another line.

After a slider has been adjusted, it can be reset to the default value by double-clicking the handle.

Every slider should have a label. A slider without a label is ambiguous and not accessible. Write the label in sentence case.

Slider values can include a unit when it adds context, such as “%” or “px.” When the value is shown within a text field, the unit disappears on focus.

## Usage guidelines

Every slider should have a label. A slider without a label is ambiguous and not accessible. Write the label in sentence case.

Slider values can include a unit when it adds context, such as “%” or “px.” When the value is shown within a text field, the unit disappears on focus.

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

* [Select box](/page/select-box/)
* [Swatch](/page/swatch/)
