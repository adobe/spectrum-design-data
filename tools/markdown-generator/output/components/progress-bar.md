***

title: Progress bar
description: "Progress bars show the progression of a system operation: downloading, uploading, processing, etc., in a visual way. They can represent either determinate or in"
category: status
documentationUrl: <https://spectrum.adobe.com/page/progress-bar/>
tags:

* component
* schema
* status

***

Progress bars show the progression of a system operation: downloading, uploading, processing, etc., in a visual way. They can represent either determinate or indeterminate progress.

| Property        | Type    | Values                   | Default | Required | Description                                              |
| --------------- | ------- | ------------------------ | ------- | -------- | -------------------------------------------------------- |
| variant         | string  | default, over background | default | No       | -                                                        |
| staticColor     | string  | white                    | -       | No       | Static color can only be white, otherwise it is default. |
| label           | string  | -                        | -       | No       | -                                                        |
| labelPosition   | string  | top, side                | top     | No       | -                                                        |
| hideLabel       | boolean | -                        | false   | No       | -                                                        |
| value           | number  | -                        | -       | No       | Not applicable when indeterminate.                       |
| minValue        | number  | -                        | 0       | No       | Not applicable when indeterminate.                       |
| maxValue        | number  | -                        | 1       | No       | Not applicable when indeterminate.                       |
| valueLabel      | string  | -                        | -       | No       | -                                                        |
| width           | number  | -                        | -       | No       | -                                                        |
| size            | string  | s, m, l, xl              | m       | No       | -                                                        |
| isIndeterminate | boolean | -                        | false   | No       | -                                                        |
