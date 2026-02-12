---
title: "Status light"
source_url: https://s2.spectrum.corp.adobe.com/page/status-light/
last_updated: 2026-02-02
category: components/status
component_type: status
status: published
tags:

- components-status
  related\_components:
- progress-circle
- steplist
  parent\_category: status

---

# Status light

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                            | Link                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Status | [light](https://opensource.adobe.com/spectrum-css/?path=/docs/components-status-light--docs)                |
| Spectrum Web Components SWC:        | [StatusLight](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/statuslight--docs) |
| React Spectrum RSP:                 | [StatusLight](https://react-spectrum.adobe.com/s2/index.html?path=/docs/statuslight--docs)                  |

## Anatomy

```
status light
- label
- dot
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property | Value                                                                                                                                                                                                                               | Default value | Description |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| label    | string                                                                                                                                                                                                                              | –             |             |
| variant  | informative / neutral / positive / notice / negative / indigo / celery / chartreuse / yellow / magenta / fuchsia / purple / seafoam / pink / turquoise / cinnamon / brown / silver / gray / red / orange / green / cyan informative | –             |             |
| size     | s / m / l / xl m                                                                                                                                                                                                                    | –             |             |

## External links

Status lights indicate the state or condition of an item. They convey semantic meaning such as statuses and categories.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Status lights should always include a label. Color alone is not enough to communicate the status.

"When status lights have a semantic meaning, they use semantic colors. Use these variants for the following statuses:"

When status lights are used to color code categories and labels that are commonly found in data visualization, they use non-semantic label colors. The ideal usage for these is when there are 8 or fewer categories or labels being color coded.

"Status lights come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

When the text is too long for the horizontal space available, it wraps to form another line.

Semantic status lights should never be used for color coding categories or labels, and vice versa.

A status light should always include a label with text that clearly communicates about the kind of status being shown. Do not change the text color to match the dot.

## States

When the text is too long for the horizontal space available, it wraps to form another line.

Semantic status lights should never be used for color coding categories or labels, and vice versa.

## Behaviors

When the text is too long for the horizontal space available, it wraps to form another line.

Semantic status lights should never be used for color coding categories or labels, and vice versa.

## Usage guidelines

Semantic status lights should never be used for color coding categories or labels, and vice versa.

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

* [Progress circle](/page/progress-circle/)
* [Steplist](/page/steplist/)
