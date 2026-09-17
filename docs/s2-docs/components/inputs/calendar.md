---
title: Calendar
source_url: /web/rsp/components/calendar
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/calendar
swc_exists: false
---

# Calendar

## Anatomy

calendar chevron month year week days time field (optional)

## Component options

days An array of days that are displayed in the current calendar view. This includes: Selected day - The chosen day within the calendar popover. Current day - The current day within the calendar popover. Unselected day - A day within the calendar popover that the user has not selected. Unavailable day - A day within the calendar popover that the user cannot select, shown as a strikethrough on the day. Within range day - A day within a range that the user has selected, shown as a blue highlight over each day within the range. Disabled day - A day that the user cannot select. This is usually a day that precedes the user's current day, shown as a gray color to distinguish it from the strikethrough styling of an unavailable day. maxValue The maximum amount of months displayed in the calendar popover is three. minValue The minimum amount of months displayed in the calendar popover is one. isError The calendar popover may display an error as error text when a user attempts to provide an input that violates the defined constraints of the date selection. For example, when the user selects dates that fall outside allowable limits, or conflict with contextual restrictions. isDisabled The calendar popover is disabled. For example, a month within a three-month range is disabled. selectionMode The types of selection available for the calendar. Single - The calendar popover only displays a single month. Range - The calendar popover displays two, or a maximum of three, months. currentYear and currentMonth The current year or month displayed in the calendar popover.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorSupported

## Behaviors

### Unavailable dates

When a day or several days are unavailable within the calendar popover, each day should display a strikethrough to help the user understand that they cannot select it. Disabled days use a distinct gray style to clearly differentiate them from unavailable days. When the calendar prevents selection of past dates, this visual treatment helps users distinguish disabled days from those marked as unavailable.

### Why unavailable and disabled days are necessary

In a date selection system, users often need to distinguish between dates that cannot be selected and dates that are simply inactive. Supporting both states improves clarity and prevents errors. Here's an example scenario: A potential guest is browsing a calendar to book a stay at a vacation rental. Unavailable dates: Days when the rental is already booked or blocked by the owner. These appear with a strikethrough, indicating they cannot be selected. Disabled dates: Past dates that are no longer valid for booking. These appear visually distinct (gray style) to show they are inactive. Guests see unavailable dates marked clearly so they don't attempt to select them. Hosts or admins can view past dates as disabled and also mark future dates as unavailable when needed. By supporting both behaviors, the system provides a clear, intuitive experience for different user roles and prevents confusion during date selection.

## Usage guidelines

### Range fill color

The range fill shows which days fall between two selected dates. If the range spans more than the three-month calendar view, it ends on the last visible day but continues as users navigate with the calendar chevrons. A dashed stroke outlines the fill to improve visibility on bright screens and for users with vision impairments.

### Do not change the styling of unavailable days

The strikethrough styling intentionally accommodates internationalization.

### Calendar popover states

The calendar popover supports a disabled state but not a read-only state. Dates or months may be temporarily disabled based on context (for example, if a user must complete a task before selecting a date). In these cases, help text can explain why certain dates are unavailable. If a date picker is truly read-only, users shouldn't be able to open the calendar popover at all, since they can't interact with it.

### Optional time fields

The calendar popover can also include time-specific fields, allowing users to specify start and end times.
