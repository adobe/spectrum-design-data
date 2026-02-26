---
title: Color slider
description: "A color slider lets users visually change an individual channel of a color."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/color-slider/
source_url: https://opensource.adobe.com/spectrum-design-data/components/color-slider/
tags:
  - component
  - schema
  - inputs
---

A color slider lets users visually change an individual channel of a color.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| background | string | - | - | No | This will vary depending on implementation. |
| channel | string | hue, saturation, lightness, red, green, blue, alpha | hue | No | Which channel of the color this slider controls. Use 'alpha' for opacity. |
| value | number | - | - | No | Number (from minValue to maxValue). |
| minValue | number | - | 0 | No | - |
| maxValue | number | - | 100 | No | - |
| step | number | - | 1 | No | - |
| orientation | string | horizontal, vertical | horizontal | No | - |
| length | number | - | 192 | No | units: px |
| isDisabled | boolean | - | false | No | - |
| state | string | default, hover, down, keyboard focus | default | No | - |
