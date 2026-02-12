---

title: "Date picker"
source\_url: <https://s2.spectrum.corp.adobe.com/page/date-picker/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
  related\_components:
* combo-box
* drop-zone
  parent\_category: inputs

---

# Date picker

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Date | [picker](https://opensource.adobe.com/spectrum-css/?path=/docs/components-date-picker--docs) |
| Spectrum Web Components Not       | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/datepicker--docs)      |
| React Spectrum RSP:               | [DatePicker](https://react-spectrum.adobe.com/s2/index.html?path=/docs/datepicker--docs)     |

## Anatomy

```
date picker
- date field (with in-field button)
- calendar
- time field (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property        | Value                                                                  | Default value | Description                                                     |
| --------------- | ---------------------------------------------------------------------- | ------------- | --------------------------------------------------------------- |
| variant         | single / double / triple single                                        | Controls      | the number of months displayed in the calendar popover.         |
| selectedDate    | string                                                                 | –             | The currently selected date. Used when selectionMode is single. |
| selectedRange   | object – The currently selected date range, used when selectionMode is | range.        |                                                                 |
| dateField       | object – Configuration for the date input                              | field.        |                                                                 |
| calendarPopover | object – Configuration for the calendar                                | popover.      |                                                                 |

## External links

Date pickers allow selection of a single date or a date range. They include a calendar within a popover, with optional manual entry. Date range variants support selecting a start and end date in one field.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Calendar popover displays a grid of days spanning one, two, or three months, enabling users to select a single date or a range.

Date field allows users to enter and edit date values. Users can edit each part of a date value, such as the day, month, and year, by interacting with individual segments. A date field includes a label, segments for each value of the date, and an in-field button to allow the user to open the calendar popover.

The range of days the user has selected (a start date and an end date).

The selected date allows a user to see which date they have selected within the calendar popover.

A single date picker only displays a single date within the date field as well as a single month within the calendar popover.

A double date picker displays a date range within the date field as well as two consecutive months within the calendar popover.

A triple date picker displays a date range within the date field as well as three consecutive months within the calendar popover.

The calendar popover is displayed or hidden when the user selects the in-field button (the calendar icon).

"If a user selects a day preceding the first selection, that earlier day becomes the start of the range. For example:"

"A third selection resets the range. For example:"

Date pickers display placeholder values in individual segments by default. This is to makes it easier for users to focus and edit specific values like the day, month, or year without re-entering the entire date.

This approach reduces input errors, improves accessibility, and supports faster, more precise interactions. It also adapts well to different regional formats, enhancing clarity across locales.

Date pickers can be used to select a single date or a date range (a start date and an end date).

When a date picker is formatted to allow a range, it displays a placeholder by default. When the user first interacts with the date field, the first value of the placeholder is in focus. This is to allow the user to edit the individual segments. When the user opens the popover without interacting, it displays the current day along with the month and year based on their locale. However, the date field will continue to show the placeholder until the user either completes the range in the field or within the calendar popover.

If the user inputs a date range within the date field that spans more than the maximum of three months that the calendar popover allows, the calendar popover will only show the first three consecutive months within that range.

The date field can also capture time values with precision down to the second, and may include time zone information. The calendar popover can also include time-specific fields, allowing users to specify start and end times.

"Date pickers can be marked as optional or required, depending on the situation. For required date pickers, there are two styling options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include help text to explain what the asterisk means. Optional date pickers are either denoted with text added to the end of the label — “(optional)” — or have no indication at all."

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

A read-only state of date picker means that the user cannot interact with the field, and they can only read what the field is displaying. Therefore, the in-field button is not clickable. In the disabled state, the read-only state of date picker allows the user to focus on a value—even though they cannot change the value.

A disabled date picker means that the user cannot interact with the field, but not for the same reasons as a read-only scenario. For example, a date picker may be temporarily disabled because the user needs to complete a dependent task (such as filling out another field) somewhere within their experience. A disabled date picker does not allow for the ability to focus on a value, or to change its value.

A date picker can be marked as having an error to show that a value needs to be entered in order to move forward, or that an entered value is invalid. In this scenario, displaying error text beneath the date field can aid the user in understanding how to resolve it. Error text within the calendar popover may also be helpful to aid the user in understanding what the error is signaling.

## States

The calendar popover is displayed or hidden when the user selects the in-field button (the calendar icon).

"If a user selects a day preceding the first selection, that earlier day becomes the start of the range. For example:"

"A third selection resets the range. For example:"

Date pickers can be used to select a single date or a date range (a start date and an end date).

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

## Behaviors

The calendar popover is displayed or hidden when the user selects the in-field button (the calendar icon).

"If a user selects a day preceding the first selection, that earlier day becomes the start of the range. For example:"

"A third selection resets the range. For example:"

Date pickers can be used to select a single date or a date range (a start date and an end date).

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

## Usage guidelines

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

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

* [Combo box](/page/combo-box/)
* [Drop zone](/page/drop-zone/)
