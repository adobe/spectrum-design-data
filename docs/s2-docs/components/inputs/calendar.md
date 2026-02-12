---
title: "Calendar"
source_url: https://s2.spectrum.corp.adobe.com/page/calendar/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- tooltip
- checkbox
parent_category: inputs

---

# Calendar

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Calendar](https://opensource.adobe.com/spectrum-css/?path=/docs/components-calendar--docs) |
| Spectrum Web Components Not  | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/calendar--docs)       |
| React Spectrum RSP:          | [Calendar](https://react-spectrum.adobe.com/s2/index.html?path=/docs/calendar--docs)        |

## Anatomy

```
calendar
- chevron
- month
- year
- week
- days
time field (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property      | Value                                                                     | Default value | Description                                                          |
| ------------- | ------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| currentMonth  | number – The month currently displayed in the calendar (1 = January, 12 = | December).    |                                                                      |
| currentYear   | number – The year currently displayed in the calendar (Gregorian year     | number).      |                                                                      |
| selectionMode | single / range single                                                     | Controls      | whether the calendar allows selecting a single date or a date range. |
| isDisabled    | boolean                                                                   | false         |                                                                      |
| isError       | boolean                                                                   | false         |                                                                      |
| minValue      | string                                                                    | –             | The minimum allowed date that a user may select (ISO format string). |
| maxValue      | string                                                                    | –             | The maximum allowed date that a user may select (ISO format string). |
| showTimeZone  | boolean                                                                   | false         | Whether to show a time zone indicator in the calendar.               |
| days          | array – An array of days displayed in the current calendar                | view.         |                                                                      |

## External links

Calendars display the days of a selected month and highlight the current day. They support navigating to past or future months and selecting a specific date.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

"An array of days that are displayed in the current calendar view. This includes:"

The maximum amount of months displayed in the calendar popover is three.

The minimum amount of months displayed in the calendar popover is one.

The calendar popover may display an error as error text when a user attempts to provide an input that violates the defined constraints of the date selection. For example, when the user selects dates that fall outside allowable limits, or conflict with contextual restrictions.

The calendar popover is disabled. For example, a month within a three-month range is disabled.

The types of selection available for the calendar.

The current year or month displayed in the calendar popover.

When a day or several days are unavailable within the calendar popover, each day should display a strikethrough to help the user understand that they cannot select it.

Disabled days use a distinct gray style to clearly differentiate them from unavailable days. When the calendar prevents selection of past dates, this visual treatment helps users distinguish disabled days from those marked as unavailable.

In a date selection system, users often need to distinguish between dates that cannot be selected and dates that are simply inactive. Supporting both states improves clarity and prevents errors.

"Here’s an example scenario: A potential guest is browsing a calendar to book a stay at a vacation rental."

"Unavailable dates: Days when the rental is already booked or blocked by the owner. These appear with a strikethrough, indicating they cannot be selected."

"Disabled dates: Past dates that are no longer valid for booking. These appear visually distinct (gray style) to show they are inactive."

Guests see unavailable dates marked clearly so they don’t attempt to select them. Hosts or admins can view past dates as disabled and also mark future dates as unavailable when needed.

By supporting both behaviors, the system provides a clear, intuitive experience for different user roles and prevents confusion during date selection.

The range fill shows which days fall between two selected dates. If the range spans more than the three-month calendar view, it ends on the last visible day but continues as users navigate with the calendar chevrons. A dashed stroke outlines the fill to improve visibility on bright screens and for users with vision impairments.

The strikethrough styling intentionally accommodates internationalization.

The calendar popover supports a disabled state but not a read-only state. Dates or months may be temporarily disabled based on context (for example, if a user must complete a task before selecting a date). In these cases, help text can explain why certain dates are unavailable.

If a date picker is truly read-only, users shouldn’t be able to open the calendar popover at all, since they can’t interact with it.

The calendar popover can also include time-specific fields, allowing users to specify start and end times.

## States

"Here’s an example scenario: A potential guest is browsing a calendar to book a stay at a vacation rental."

"Disabled dates: Past dates that are no longer valid for booking. These appear visually distinct (gray style) to show they are inactive."

By supporting both behaviors, the system provides a clear, intuitive experience for different user roles and prevents confusion during date selection.

The strikethrough styling intentionally accommodates internationalization.

If a date picker is truly read-only, users shouldn’t be able to open the calendar popover at all, since they can’t interact with it.

The calendar popover can also include time-specific fields, allowing users to specify start and end times.

## Behaviors

"Here’s an example scenario: A potential guest is browsing a calendar to book a stay at a vacation rental."

"Disabled dates: Past dates that are no longer valid for booking. These appear visually distinct (gray style) to show they are inactive."

By supporting both behaviors, the system provides a clear, intuitive experience for different user roles and prevents confusion during date selection.

The strikethrough styling intentionally accommodates internationalization.

If a date picker is truly read-only, users shouldn’t be able to open the calendar popover at all, since they can’t interact with it.

The calendar popover can also include time-specific fields, allowing users to specify start and end times.

## Usage guidelines

The strikethrough styling intentionally accommodates internationalization.

If a date picker is truly read-only, users shouldn’t be able to open the calendar popover at all, since they can’t interact with it.

The calendar popover can also include time-specific fields, allowing users to specify start and end times.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Tooltip](/page/tooltip/)
* [Checkbox](/page/checkbox/)
