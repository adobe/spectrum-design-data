***

title: Segmented Control
description: "Segmented controls allow users to select one option from a set of mutually exclusive options."
category: navigation
documentationUrl: <https://spectrum.adobe.com/page/segmented-control/>
tags:

* component
* schema
* navigation

***

Segmented controls allow users to select one option from a set of mutually exclusive options.

| Property           | Type    | Values               | Default    | Required | Description                                                                                                      |
| ------------------ | ------- | -------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| orientation        | string  | horizontal, vertical | horizontal | No       | -                                                                                                                |
| isFluid            | boolean | -                    | false      | No       | If true, the control takes up the full width of its container. Only applicable to horizontal segmented controls. |
| alignment          | string  | start, center        | start      | No       | -                                                                                                                |
| hideTracker        | boolean | -                    | false      | No       | If true, the tracker that indicates the selected item is hidden.                                                 |
| selectedItem       | string  | -                    | -          | No       | The identifier of the currently selected item.                                                                   |
| keyboardActivation | string  | manual, automatic    | manual     | No       | -                                                                                                                |
| items              | array   | -                    | -          | No       | An array of segmented control items.                                                                             |
