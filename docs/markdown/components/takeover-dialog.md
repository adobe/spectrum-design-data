---
title: Takeover dialog
description: "Takeover dialogs are larger, flexible dialogs that contain other components to support complex workflows."
category: feedback
documentationUrl: https://spectrum.adobe.com/page/takeover-dialog/
tags:
  - component
  - schema
  - feedback
---

Takeover dialogs are larger, flexible dialogs that contain other components to support complex workflows.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| title | string | - | - | No | - |
| description | string | - | - | No | - |
| variant | string | dialog, full screen | dialog | No | - |
| primaryActionLabel | string | - | - | No | - |
| secondaryActionLabel | string | - | - | No | If undefined, this button does not appear. |
| cancelActionLabel | string | - | cancel | No | If undefined, this button does not appear. |
| slots | array | - | - | No | Areas where other components can be inserted (e.g. Side navigation, Steplist, Forms). |
