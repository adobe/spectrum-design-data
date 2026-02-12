---
title: Alert dialog
description: "Alert dialogs display important information that users need to acknowledge. They appear over the interface and block further interactions until an action is sel"
category: feedback
documentationUrl: https://spectrum.adobe.com/page/alert-dialog/
tags:
  - component
  - schema
  - feedback
---

Alert dialogs display important information that users need to acknowledge. They appear over the interface and block further interactions until an action is selected.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| title | string | - | - | No | - |
| description | string | - | - | No | - |
| variant | string | confirmation, information, warning, destructive, error | confirmation | No | - |
| primaryActionLabel | string | - | - | No | - |
| secondaryActionLabel | string | - | - | No | If undefined, this button does not appear. |
| cancelActionLabel | string | - | cancel | No | If undefined, this button does not appear. |
