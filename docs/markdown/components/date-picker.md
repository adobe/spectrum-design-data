---
title: Date picker
description: "A date picker lets users enter a single date or a date range. It includes a calendar popover and a field."
category: inputs
documentationUrl: https://spectrum.adobe.com/page/date-picker/
tags:
  - component
  - schema
  - inputs
---

A date picker lets users enter a single date or a date range. It includes a calendar popover and a field.

| Property | Type | Values | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| variant | string | single, double, triple | single | No | Controls the number of months displayed in the calendar popover. |
| selectedDate | string | - | - | No | The currently selected date. Used when selectionMode is single. |
| selectedRange | object | - | - | No | The currently selected date range, used when selectionMode is range. |
| dateField | object | - | - | No | Configuration for the date input field. |
| calendarPopover | object | - | - | No | Configuration for the calendar popover. |
