---

title: "Progress circle"
source\_url: <https://s2.spectrum.corp.adobe.com/page/progress-circle/>
last\_updated: 2026-02-02
category: components/status
component\_type: status
status: published
tags:

* components-status
  related\_components:
* progress-bar
* status-light
  parent\_category: status

---

# Progress circle

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                              | Link                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Progress | [circle](https://opensource.adobe.com/spectrum-css/?path=/docs/components-progress-circle--docs)                                                                                                 |
| Spectrum Web Components SWC: Progress | \[Circle]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/progress-circle--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                   | [ProgressCircle](https://react-spectrum.adobe.com/s2/index.html?path=/docs/progresscircle--docs)                                                                                                 |

## Anatomy

```
progress circle
- track
- fill
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property        | Value                             | Default value  | Description |
| --------------- | --------------------------------- | -------------- | ----------- |
| variant         | default / over background default | –              |             |
| value           | number – Not applicable when      | indeterminate. |             |
| minValue        | number 0 Not applicable when      | indeterminate. |             |
| maxValue        | number 1 Not applicable when      | indeterminate. |             |
| size            | s / m / l m                       | –              |             |
| isIndeterminate | boolean                           | false          |             |

## External links

Progress circles show the progression of a system operation such as downloading, uploading, processing, etc. in a visual way. They can represent determinate or indeterminate progress.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Progress circles can be determinate or indeterminate. Use determinate when progress can be measured against a goal, such as downloading a file. Use indeterminate when the duration or effort is unknown, like reconnecting to a server.

"Progress circles come in 3 sizes: small, medium (default), or large. These are available to fit various contexts. For example, the small progress circle can be used in place of an icon or in tight spaces, while the large one can be used for full-page loading."

The value represents progress within the circle’s range, from minimum to maximum. These defaults are 0 and 100 but can be customized. Min and max values don’t apply to indeterminate progress circles.

When a progress circle needs to be placed on top of a colored background, use the over background variant. This progress circle uses a static white color regardless of the color theme. Make sure the background offers enough contrast for the progress circle to be legible.

Medium and large progress circles are optimized for large areas with no space constraints. Use them for loading content into views (e.g., web pages, panels, etc.)

Small progress circles are well suited when space is limited both vertically and horizontally, such as in buttons, menu items, and input fields.

## States

Small progress circles are well suited when space is limited both vertically and horizontally, such as in buttons, menu items, and input fields.

## Usage guidelines

Small progress circles are well suited when space is limited both vertically and horizontally, such as in buttons, menu items, and input fields.

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

* [Progress bar](/page/progress-bar/)
* [Status light](/page/status-light/)
