***

title: In-line alert
description: "In-line alerts display a non-modal message associated with objects in a view. These are often used in form validation, providing a place to aggregate feedback r"
category: feedback
documentationUrl: <https://spectrum.adobe.com/page/in-line-alert/>
tags:

* component
* schema
* feedback

***

In-line alerts display a non-modal message associated with objects in a view. These are often used in form validation, providing a place to aggregate feedback related to multiple fields.

| Property    | Type   | Values                                                   | Default | Required | Description                                                         |
| ----------- | ------ | -------------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------- |
| variant     | string | neutral, informative, positive, notice, negative, accent | neutral | No       | -                                                                   |
| style       | string | bold, subtle, outline                                    | outline | No       | The visual style of the alert.                                      |
| href        | string | -                                                        | -       | No       | Optional URL within in-line alert content like a 'Learn more' link. |
| heading     | string | -                                                        | -       | No       | Optional heading text displayed at the top of the alert.            |
| actionLabel | string | -                                                        | -       | No       | If undefined, this button does not appear.                          |
