---
title: Slider
description: "Sliders allow users to quickly select a value within a range. They should be used when the upper and lower bounds to the range are invariable."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/slider/
tags:
  - component
  - schema
  - inputs
---

Sliders allow users to quickly select a value within a range. They should be used when the upper and lower bounds to the range are invariable.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | - | - | No | - |
| labelPosition | string | top, side | top | No | - |
| value | number | - | - | No | from minValue to maxValue |
| minValue | number | - | 0 | No | - |
| maxValue | number | - | 100 | No | - |
| isRange | boolean | - | false | No | If true, the slider will allow selection of a range of values by displaying two handles. |
| step | number | - | 1 | No | - |
| valueFormat | string | - | - | No | This will vary depending on implementation. |
| progressionScale | string | linear, log | linear | No | - |
| width | number | - | - | No | - |
| hasFill | boolean | - | false | No | - |
| fillStart | number | - | 0 | No | - |
| hasGradient | boolean | - | false | No | - |
| isEditable | boolean | - | false | No | - |
| isDisabled | boolean | - | false | No | - |
| state | string | default, hover, down, keyboard focus | default | No | - |
