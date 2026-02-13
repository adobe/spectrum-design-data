---
title: Text field
description: "Text fields allow users to input custom text entries with a keyboard. Various options can be shown with the field to communicate the input requirements."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/text-field/
tags:
  - component
  - schema
  - inputs
---

Text fields allow users to input custom text entries with a keyboard. Various options can be shown with the field to communicate the input requirements.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | - | - | No | - |
| labelPosition | string | top, side | top | No | - |
| hideLabel | boolean | - | false | No | - |
| value | string | - | - | No | from minValue to maxValue |
| width | number | - | - | No | - |
| size | string | s, m, l, xl | m | No | - |
| necessityIndicator | string | text, icon | icon | No | - |
| isRequired | boolean | - | false | No | - |
| hasCharacterCount | boolean | - | false | No | - |
| showValidIcon | boolean | - | false | No | - |
| isError | boolean | - | false | No | If there is an error, this property overrides show valid icon. |
| isDisabled | boolean | - | false | No | - |
| helpText | string | - | - | No | - |
| errorMessage | string | - | - | No | - |
| state | string | default, hover, focus + hover, focus + not hover, keyboard focus | default | No | - |
