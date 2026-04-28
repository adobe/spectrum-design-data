---
title: Picker
description: "Pickers (sometimes known as \"dropdowns\" or \"selects\") allow users to choose from a list of options in a limited space. The list of options can change based on t"
category: inputs
documentationUrl: https://spectrum.adobe.com/page/picker/
source_url: https://opensource.adobe.com/spectrum-design-data/components/picker/
tags:
  - component
  - schema
  - inputs
---

Pickers (sometimes known as "dropdowns" or "selects") allow users to choose from a list of options in a limited space. The list of options can change based on the context.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | - | - | No | - |
| labelPosition | string | top, side | top | No | - |
| placeholder | string | - | - | No | - |
| value | string | - | - | No | - |
| width | number | - | - | No | Not applicable to quiet picker. |
| size | string | s, m, l, xl | m | No | - |
| isQuiet | boolean | - | false | No | - |
| necessityIndicator | string | text, icon | icon | No | - |
| isRequired | boolean | - | false | No | - |
| menuContainer | string | popover, tray | popover | No | - |
| isDisabled | boolean | - | false | No | - |
| isError | boolean | - | false | No | - |
| description | string | - | null | No | - |
| errorMessage | string | - | null | No | - |
| state | string | default, hover, focus + hover, focus + not hover, keyboard focus | default | No | - |
