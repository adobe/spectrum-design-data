***

title: Text area
description: "A text area lets a user input a longer amount of text than a standard text field. It can include all of the standard validation options supported by the text fi"
category: inputs
documentationUrl: <https://spectrum.adobe.com/page/text-area/>
tags:

* component
* schema
* inputs

***

A text area lets a user input a longer amount of text than a standard text field. It can include all of the standard validation options supported by the text field component.

| Property           | Type    | Values                                                           | Default | Required | Description                                                |
| ------------------ | ------- | ---------------------------------------------------------------- | ------- | -------- | ---------------------------------------------------------- |
| label              | string  | -                                                                | -       | No       | -                                                          |
| labelPosition      | string  | top, side                                                        | top     | No       | -                                                          |
| hideLabel          | boolean | -                                                                | false   | No       | -                                                          |
| value              | string  | -                                                                | -       | No       | from minValue to maxValue                                  |
| width              | number  | -                                                                | -       | No       | -                                                          |
| size               | string  | s, m, l, xl                                                      | m       | No       | -                                                          |
| necessityIndicator | string  | text, icon                                                       | icon    | No       | -                                                          |
| isRequired         | boolean | -                                                                | false   | No       | -                                                          |
| hasCharacterCount  | boolean | -                                                                | false   | No       | -                                                          |
| showValidIcon      | boolean | -                                                                | false   | No       | -                                                          |
| isError            | boolean | -                                                                | false   | No       | -                                                          |
| isDisabled         | boolean | -                                                                | false   | No       | -                                                          |
| hideDragIcon       | boolean | -                                                                | false   | No       | -                                                          |
| height             | number  | -                                                                | -       | No       | If undefined, height is dynamic and grows with input text. |
| helpText           | string  | -                                                                | -       | No       | -                                                          |
| errorMessage       | string  | -                                                                | -       | No       | -                                                          |
| inputType          | string  | text, url, phone, email, password                                | text    | No       | -                                                          |
| state              | string  | default, hover, focus + hover, focus + not hover, keyboard focus | default | No       | -                                                          |
