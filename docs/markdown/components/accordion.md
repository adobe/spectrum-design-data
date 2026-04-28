---
title: Accordion
description: "An accordion is a vertically stacked set of interactive headings that each contain a title and a content area."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/accordion/
source_url: https://opensource.adobe.com/spectrum-design-data/components/accordion/
tags:
  - component
  - schema
  - inputs
---

An accordion is a vertically stacked set of interactive headings that each contain a title and a content area.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| state | string | default, hover, down, keyboard focus | default | No | - |
| size | string | s, m, l, xl | m | No | - |
| isQuiet | boolean | - | false | No | - |
| isDisabled | boolean | - | false | No | - |
| density | string | compact, regular, spacious | regular | No | - |
| items | array | - | - | No | An array of accordion items. |
| isMultiple | boolean | - | false | No | If true, multiple accordion items can be expanded at the same time. |
