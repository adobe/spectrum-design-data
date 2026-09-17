---
title: Date picker
source_url: /web/rsp/components/date-picker
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/date-picker
swc_exists: false
---

# Date picker

## Anatomy

date picker date field (with in-field button) calendar time field (optional)

## Component options

calendarPopover Calendar popover displays a grid of days spanning one, two, or three months, enabling users to select a single date or a range. dateField Date field allows users to enter and edit date values. Users can edit each part of a date value, such as the day, month, and year, by interacting with individual segments. A date field includes a label, segments for each value of the date, and an in-field button to allow the user to open the calendar popover. selectedRange The range of days the user has selected (a start date and an end date). selectedDate The selected date allows a user to see which date they have selected within the calendar popover. single A single date picker only displays a single date within the date field as well as a single month within the calendar popover. double A double date picker displays a date range within the date field as well as two consecutive months within the calendar popover. triple A triple date picker displays a date range within the date field as well as three consecutive months within the calendar popover.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorSupported

## Behaviors

### Displaying the popover calendar

The calendar popover is displayed or hidden when the user selects the in-field button (the calendar icon).

### Range selection

If a user selects a day preceding the first selection, that earlier day becomes the start of the range. For example: First selection: Jan 3. This is the start of the range. Second selection: Jan 1. This is the new start of the range. The range is now Jan 1–3 in the calendar popover and date field. A third selection resets the range. For example: Third selection: Jan 4. This is the start of a new range. Current state: Jan 4 (no end of range). The calendar popover displays Jan 4 as the start of the range but with no defined end. The date field remains populated by the user's last complete input (Jan 1-3) until they indicate the end of their new range.

### Individual segments for date field

Date pickers display placeholder values in individual segments by default. This is to makes it easier for users to focus and edit specific values like the day, month, or year without re-entering the entire date. This approach reduces input errors, improves accessibility, and supports faster, more precise interactions. It also adapts well to different regional formats, enhancing clarity across locales.

### Single date or date range

Date pickers can be used to select a single date or a date range (a start date and an end date).

### Date range selection

When a date picker is formatted to allow a range, it displays a placeholder by default. When the user first interacts with the date field, the first value of the placeholder is in focus. This is to allow the user to edit the individual segments. When the user opens the popover without interacting, it displays the current day along with the month and year based on their locale. However, the date field will continue to show the placeholder until the user either completes the range in the field or within the calendar popover. If the user inputs a date range within the date field that spans more than the maximum of three months that the calendar popover allows, the calendar popover will only show the first three consecutive months within that range.

### Granularity

The date field can also capture time values with precision down to the second, and may include time zone information. The calendar popover can also include time-specific fields, allowing users to specify start and end times.

## Usage guidelines

### Required or optional

Date pickers can be marked as optional or required, depending on the situation. For required date pickers, there are two styling options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include help text to explain what the asterisk means. Optional date pickers are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

### Read-only states vs. disabled states

A read-only state of date picker means that the user cannot interact with the field, and they can only read what the field is displaying. Therefore, the in-field button is not clickable. In the disabled state, the read-only state of date picker allows the user to focus on a value—even though they cannot change the value. A disabled date picker means that the user cannot interact with the field, but not for the same reasons as a read-only scenario. For example, a date picker may be temporarily disabled because the user needs to complete a dependent task (such as filling out another field) somewhere within their experience. A disabled date picker does not allow for the ability to focus on a value, or to change its value.

### Error

A date picker can be marked as having an error to show that a value needs to be entered in order to move forward, or that an entered value is invalid. In this scenario, displaying error text beneath the date field can aid the user in understanding how to resolve it. Error text within the calendar popover may also be helpful to aid the user in understanding what the error is signaling.
