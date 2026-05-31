***

title: Calendar
description: "Calendars display days, weeks, and months, allowing users to select dates or ranges."
category: inputs
documentationUrl: <https://spectrum.adobe.com/page/calendar/>
tags:

* component
* schema
* inputs

***

Calendars display days, weeks, and months, allowing users to select dates or ranges.

| Property      | Type    | Values        | Default | Required | Description                                                                   |
| ------------- | ------- | ------------- | ------- | -------- | ----------------------------------------------------------------------------- |
| currentMonth  | number  | -             | -       | No       | The month currently displayed in the calendar (1 = January, 12 = December).   |
| currentYear   | number  | -             | -       | No       | The year currently displayed in the calendar (Gregorian year number).         |
| selectionMode | string  | single, range | single  | No       | Controls whether the calendar allows selecting a single date or a date range. |
| isDisabled    | boolean | -             | false   | No       | -                                                                             |
| isError       | boolean | -             | false   | No       | -                                                                             |
| minValue      | string  | -             | -       | No       | The minimum allowed date that a user may select (ISO format string).          |
| maxValue      | string  | -             | -       | No       | The maximum allowed date that a user may select (ISO format string).          |
| showTimeZone  | boolean | -             | false   | No       | Whether to show a time zone indicator in the calendar.                        |
| days          | array   | -             | -       | No       | An array of days displayed in the current calendar view.                      |
