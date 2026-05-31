***

title: Help text
description: "Help text provides either an informative description or an error message that gives more context about what a user needs to input. It’s commonly used in forms."
category: inputs
documentationUrl: <https://spectrum.adobe.com/page/help-text/>
tags:

* component
* schema
* inputs

***

Help text provides either an informative description or an error message that gives more context about what a user needs to input. It’s commonly used in forms.

| Property   | Type    | Values            | Default | Required | Description                                             |
| ---------- | ------- | ----------------- | ------- | -------- | ------------------------------------------------------- |
| text       | string  | -                 | -       | No       | -                                                       |
| variant    | string  | neutral, negative | neutral | No       | -                                                       |
| hideIcon   | boolean | -                 | false   | No       | Only applicable if variant is negative.                 |
| size       | string  | s, m, l, xl       | m       | No       | -                                                       |
| isDisabled | boolean | -                 | false   | No       | Help text cannot be both disabled and negative variant. |
