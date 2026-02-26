---
title: Swatch group
description: "A swatch group is a grouping of swatches that are related to each other."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/swatch-group/
source_url: https://opensource.adobe.com/spectrum-design-data/components/swatch-group/
tags:
  - component
  - schema
  - inputs
---

A swatch group is a grouping of swatches that are related to each other.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| size | string | xs, s, m, l | m | No | - |
| density | string | compact, regular, spacious | regular | No | - |
| enableSelection | boolean | - | false | No | - |
| selectionMode | string | single, multiple | single | No | Only applicable if selection is enabled. |
| allowsEmptySelection | boolean | - | false | No | Only applicable if selection is enabled. |
| cornerRadius | string | none, full, partial | none | No | Determines the corner radius of each swatch in the group. Partial refers to corner-radius-75. |
