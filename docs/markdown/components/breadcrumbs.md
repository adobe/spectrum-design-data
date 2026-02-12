---
title: Breadcrumbs
description: "Breadcrumbs show hierarchy and navigational context for a user’s location within an app."
category: navigation
documentationUrl: https://spectrum.adobe.com/page/breadcrumbs/
tags:
  - component
  - schema
  - navigation
---

Breadcrumbs show hierarchy and navigational context for a user’s location within an app.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| state | string | default, hover, down, keyboard focus, drag and drop | default | No | - |
| isMultiline | boolean | - | false | No | If true, the breadcrumb items will wrap to multiple lines. |
| size | string | m, l | m | No | Controls the overall size of the breadcrumb component. |
| items | array | - | - | No | An array of breadcrumb items. |
| separator | string | chevron, none | chevron | No | The separator icon used between breadcrumb items. |
| isTruncated | boolean | - | false | No | If true, the breadcrumb item is truncated and displayed as icon only. |
| sizeOverride | string | s, m, l, xl | - | No | Overrides the size of the breadcrumb items when isMultiline is true. |
