---
title: Color wheel
description: "A color wheel lets users visually change an individual channel of a color on a circular track."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/color-wheel/
tags:
  - component
  - schema
  - inputs
---

A color wheel lets users visually change an individual channel of a color on a circular track.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| background | string | - | - | No | This will vary depending on implementation. |
| value | number | - | - | No | Number (from minValue to maxValue) |
| minValue | number | - | 0 | No | - |
| maxValue | number | - | 360 | No | - |
| step | number | - | 1 | No | - |
| size | number | - | 192 | No | units: px |
| isDisabled | boolean | - | false | No | - |
| state | string | default, hover, down, keyboard focus | default | No | - |
