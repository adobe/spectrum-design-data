***

title: Progress circle
description: "Progress circles show the progression of a system operation such as downloading, uploading, processing, etc. in a visual way. They can represent determinate or "
category: status
documentationUrl: <https://spectrum.adobe.com/page/progress-circle/>
tags:

* component
* schema
* status

***

Progress circles show the progression of a system operation such as downloading, uploading, processing, etc. in a visual way. They can represent determinate or indeterminate progress.

| Property        | Type    | Values                   | Default | Required | Description                        |
| --------------- | ------- | ------------------------ | ------- | -------- | ---------------------------------- |
| variant         | string  | default, over background | default | No       | -                                  |
| value           | number  | -                        | -       | No       | Not applicable when indeterminate. |
| minValue        | number  | -                        | 0       | No       | Not applicable when indeterminate. |
| maxValue        | number  | -                        | 1       | No       | Not applicable when indeterminate. |
| size            | string  | s, m, l                  | m       | No       | -                                  |
| isIndeterminate | boolean | -                        | false   | No       | -                                  |
