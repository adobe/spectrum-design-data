---
title: Action button
description: "Action buttons allow users to perform an action or mark a selection. They're used for similar, task-based options within a workflow, and are ideal for interface"
category: actions
documentationUrl: https://spectrum.adobe.com/page/action-button/
tags:
  - component
  - schema
  - actions
---

Action buttons allow users to perform an action or mark a selection. They're used for similar, task-based options within a workflow, and are ideal for interfaces where buttons aren't meant to draw a lot of attention.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | - | - | No | - |
| hideLabel | boolean | - | false | No | - |
| icon | - | - | - | No | Icon must be present if the label is not defined. |
| size | string | xs, s, m, l, xl | m | No | - |
| isQuiet | boolean | - | false | No | - |
| isSelected | boolean | - | false | No | - |
| isEmphasized | boolean | - | false | No | - |
| staticColor | string | white, black | - | No | Static color must not be set for the default version of this component. |
| selectedTextColor | - | - | - | No | - |
| hasHoldIcon | boolean | - | false | No | - |
| isDisabled | boolean | - | false | No | - |
| state | string | default, hover, down, keyboard focus | default | No | - |
