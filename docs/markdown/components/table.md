---
title: Table
description: "Tables display information in rows and columns, allowing users to compare and scan structured data."
category: data visualization
documentationUrl: https://spectrum.adobe.com/page/table/
tags:
  - component
  - schema
  - data visualization
---

Tables display information in rows and columns, allowing users to compare and scan structured data.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| size | string | s, m, l | m | No | Controls the density of table rows. |
| hideHeader | boolean | - | false | No | If true, the table header is hidden. |
| header | object | - | - | No | Configuration for the table header row. |
| density | string | compact, regular, spacious | regular | No | - |
| isQuiet | boolean | - | false | No | If true, the table uses a quiet visual style. |
| isSortable | boolean | - | false | No | If true, table columns can be sorted. |
| columns | array | - | - | No | An array of column definitions for the table. |
| rows | array | - | - | No | An array of row data for the table. |
