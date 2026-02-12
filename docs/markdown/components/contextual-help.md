---
title: Contextual help
description: "Contextual help shows a user extra information about the state of either an adjacent component or an entire view. It explains a high-level topic about an experi"
category: feedback
documentationUrl: https://spectrum.adobe.com/page/contextual-help/
tags:
  - component
  - schema
  - feedback
---

Contextual help shows a user extra information about the state of either an adjacent component or an entire view. It explains a high-level topic about an experience and can point users to more information elsewhere.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| icon | string | info, help | info | No | - |
| popoverPlacement | string | top, top left, top right, top start, top end, bottom, bottom left, bottom right, bottom start, bottom end, left, left top, left bottom, start, start top, start bottom, right, right top, right bottom, end, end top, end bottom | bottom start | No | - |
| popoverOffset | number | - | 8 | No | - |
| href | string | - | - | No | Optional URL within contextual help content like a 'Learn more' link. |
| popoverCrossOffset | number | - | 0 | No | - |
| containerPadding | number | - | 8 | No | - |
| state | string | default, down, open, keyboard focus | default | No | - |
