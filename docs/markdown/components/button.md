---
title: Button
description: "Buttons allow users to perform an action or to navigate to another page."
category: actions
documentationUrl: https://spectrum.adobe.com/page/button/
source_url: https://opensource.adobe.com/spectrum-design-data/components/button/
tags:
  - component
  - schema
  - actions
---

Buttons allow users to perform an action or to navigate to another page.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| variant | string | accent, negative, primary, secondary | accent | No | Visual emphasis level. |
| style | string | fill, outline | fill | No | - |
| size | string | s, m, l, xl | m | No | - |
| isDisabled | boolean | - | false | No | - |
| isPending | boolean | - | false | No | - |
| isLabelHidden | boolean | - | false | No | - |
| icon | - | - | - | No | Icon placed at the start of the button. Required when isLabelHidden is true. |
| staticColor | string | white, black | - | No | Static color for use on colored backgrounds. |
