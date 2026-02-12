***

title: Standard dialog
description: "Standard dialogs display important information that users need to acknowledge. They appear over the interface and block further interactions until an action is "
category: feedback
documentationUrl: <https://spectrum.adobe.com/page/standard-dialog/>
tags:

* component
* schema
* feedback

***

Standard dialogs display important information that users need to acknowledge. They appear over the interface and block further interactions until an action is selected.

| Property             | Type    | Values  | Default | Required | Description                                                              |
| -------------------- | ------- | ------- | ------- | -------- | ------------------------------------------------------------------------ |
| title                | string  | -       | -       | No       | -                                                                        |
| description          | string  | -       | -       | No       | -                                                                        |
| hideImage            | boolean | -       | false   | No       | Optional image to display in dialog.                                     |
| size                 | string  | s, m, l | m       | No       | -                                                                        |
| hideCloseButton      | boolean | -       | false   | No       | -                                                                        |
| footerContent        | string  | -       | -       | No       | Optional footer content to display in the dialog footer like a checkbox. |
| primaryActionLabel   | string  | -       | -       | No       | -                                                                        |
| secondaryActionLabel | string  | -       | -       | No       | If undefined, this button does not appear.                               |
| cancelActionLabel    | string  | -       | cancel  | No       | If undefined, this button does not appear.                               |
