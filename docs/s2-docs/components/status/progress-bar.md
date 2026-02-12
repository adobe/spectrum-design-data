---

title: "Progress bar"
source\_url: <https://s2.spectrum.corp.adobe.com/page/progress-bar/>
last\_updated: 2026-02-02
category: components/status
component\_type: status
status: published
tags:

* components-status
  related\_components:
* meter
* progress-circle
  parent\_category: status

---

# Progress bar

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                              | Link                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Progress | [bar](https://opensource.adobe.com/spectrum-css/?path=/docs/components-progress-bar--docs)                                                                                                 |
| Spectrum Web Components SWC: Progress | \[Bar]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/progress-bar--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                   | [ProgressBar](https://react-spectrum.adobe.com/s2/index.html?path=/docs/progressbar--docs)                                                                                                 |

## Anatomy

```
progress bar
- label
- value
- track
- fill
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property        | Value                                                   | Default value  | Description |
| --------------- | ------------------------------------------------------- | -------------- | ----------- |
| variant         | default / over background default                       | –              |             |
| staticColor     | white – Static color can only be white, otherwise it is | default.       |             |
| label           | string                                                  | –              |             |
| labelPosition   | top / side top                                          | –              |             |
| hideLabel       | boolean                                                 | false          |             |
| value           | number – Not applicable when                            | indeterminate. |             |
| minValue        | number 0 Not applicable when                            | indeterminate. |             |
| maxValue        | number 1 Not applicable when                            | indeterminate. |             |
| valueLabel      | string                                                  | –              |             |
| width           | number                                                  | –              |             |
| size            | s / m / l / xl m                                        | –              |             |
| isIndeterminate | boolean                                                 | false          |             |

## External links

"Progress bars show the progression of a system operation: downloading, uploading, processing, etc., in a visual way. They can represent either determinate or indeterminate progress."

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A progress bar can be either determinate or indeterminate. By default, progress bars are determinate. Use a determinate progress bar when progress can be calculated against a specific goal (e.g., downloading a file of a known size). Use an indeterminate progress bar when progress is happening but the time or effort to completion can’t be determined (e.g., attempting to reconnect to a server).

"Progress bars come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

Progress bars can have a value label that gives detailed information about the progress (e.g. "60%" or "2 of 8"). This value label works alongside the label and should not be displayed if the label itself is not displayed. It should also not be displayed if the progress is indeterminate. Similar to the label, the value label is always placed above the track.

The value represents progress within the bar’s range, from minimum to maximum. These defaults are 0 and 100 but can be customized. Min and max values don’t apply to indeterminate progress bars.

The label of the progress bar can be hidden if the context for the progress bar is sufficient without the title — for example, when the progress bar is shown inside a table row and the item is labeled in another column.

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

Progress bars should have a label that gives context about the operation being performed. Use an ellipsis at the end of the label text to communicate that the process is in progress. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These progress bars should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

When a progress bar needs to be placed on top of a colored background, use the over background variant. This progress bar uses a static white color regardless of the color theme. Make sure the background offers enough contrast for the progress bar to be legible.

Use the over background variant when a progress bar needs to be placed on top of a colored background or visual.

Over background progress bars are available in static black or white, meaning they don’t change with the theme of the page. Use static black on light color or image backgrounds, and white on dark color or image backgrounds.

The minimum width of a progress bar is 48 px and the maximum width of a progress bar is 768 px, for both desktop and mobile platform scale. Smaller progress bars should only be used in places where it’s not necessary to have a label.

When the label is too long for the available horizontal space, it wraps to form another line. The value is always shown in full and never wraps or truncates.

Both progress bars and circles can show either determinate or indeterminate progress. The available space should help determine whether a progress bar or circle is best. Progress bars are preferred in vertically narrow areas such as tables or cards. Use a progress circle for full-page loading or very small areas. Use a progress bar in a loader dialog.

Use the built-in style to show a label associated with the operation. This style always includes a left-aligned label and a right-aligned percentage value above the track. The label should be in sentence case. Add an ellipsis ("...") at the end to indicate that the action is in progress — for example, "Loading data..." or "Updating settings..."

## States

## Behaviors

## Usage guidelines

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

* [Meter](/page/meter/)
* [Progress circle](/page/progress-circle/)
