---
title: Menu
description: "Menus help users take actions, choose from a list of options, configure settings, and more. They can be placed in a transient container, like a popover or tray."
category: actions
documentationUrl: https://spectrum.adobe.com/page/menu/
tags:
  - component
  - schema
  - actions
---

Menus help users take actions, choose from a list of options, configure settings, and more. They can be placed in a transient container, like a popover or tray.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| container | string | popover, tray | - | No | - |
| label | string | - | - | No | - |
| icon | - | - | - | No | Icon must be present if the label is not defined. |
| description | string | - | - | No | - |
| value | string | - | - | No | - |
| size | string | s, m, l, xl | m | No | - |
| selectionMode | string | single, multiple, no selection | - | No | - |
| selectionStyle | string | checkbox, switch | - | No | - |
| sectionHeader | string | - | - | No | - |
| isCollapsible | boolean | - | false | No | - |
| isUnavailable | boolean | - | false | No | - |
| isDisabled | boolean | - | false | No | - |
| state | string | default, hover, down, keyboard focus | default | No | - |
