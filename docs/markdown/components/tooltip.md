---
title: Tooltip
description: "Tooltips show contextual help or information about specific components when a user hovers or focuses on them."
category: feedback
documentationUrl: https://spectrum.adobe.com/page/tooltip/
tags:
  - component
  - schema
  - feedback
---

Tooltips show contextual help or information about specific components when a user hovers or focuses on them.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | - | - | No | - |
| variant | string | neutral, informative, negative | neutral | No | - |
| hasIcon | boolean | - | false | No | If the neutral variant, there is never an icon. |
| maxWidth | number | - | 160 | No | units: pixels |
| placement | string | top, bottom, left, right | top | No | - |
| shouldFlip | boolean | - | false | No | - |
| offset | number | - | 4 | No | units: pixels |
| containerPadding | number | - | 8 | No | units: pixels |
