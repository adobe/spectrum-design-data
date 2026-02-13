---
title: Color area
description: "A color area allows users to visually select two properties of a color simultaneously. It's commonly used together with a color slider or color wheel."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/color-area/
tags:
  - component
  - schema
  - inputs
---

A color area allows users to visually select two properties of a color simultaneously. It's commonly used together with a color slider or color wheel.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| background | string | - | - | No | This will vary depending on implementation. |
| x-value | number | - | - | No | Number (from x-minValue to x-maxValue) |
| x-minValue | number | - | 0 | No | - |
| x-maxValue | number | - | 100 | No | - |
| y-value | number | - | - | No | Number (from y-minValue to y-maxValue) |
| y-minValue | number | - | 0 | No | - |
| y-maxValue | number | - | 100 | No | - |
| step | number | - | 1 | No | - |
| width | number | - | 192 | No | units: px |
| height | number | - | 192 | No | units: px |
| isDisabled | boolean | - | false | No | - |
| state | string | default, hover, down, keyboard focus | default | No | - |
