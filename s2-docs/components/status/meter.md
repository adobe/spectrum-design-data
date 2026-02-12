---
title: "Meter"
source_url: https://s2.spectrum.corp.adobe.com/page/meter/
last_updated: 2026-02-02
category: components/status
component_type: status
status: published
tags:

- components-status
related_components:
- badge
- progress-bar
parent_category: status

---

# Meter

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Meter](https://opensource.adobe.com/spectrum-css/?path=/docs/components-meter--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Meter]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/meter--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Meter](https://react-spectrum.adobe.com/s2/index.html?path=/docs/meter--docs)                                                                                                        |

## Anatomy

```
meter
- label
- value
- track
- fill
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                                  | Default value | Description |
| ---------- | ------------------------------------------------------ | ------------- | ----------- |
| variant    | informative / positive / notice / negative informative | –             |             |
| label      | string                                                 | –             |             |
| hideLabel  | boolean                                                | false         |             |
| valueLabel | string                                                 | –             |             |
| width      | number                                                 | –             |             |
| size       | s / m / l / xl m                                       | –             |             |
| value      | number                                                 | –             |             |
| helpText   | string                                                 | –             |             |

## External links

Meters are visual representations of a quantity or an achievement. Their progress is determined by user actions, rather than system actions.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A meter can include help text below it to explain what the value means and how to reach the target. This text may include units, value ranges, thresholds like targets or warnings, and actions that affect the meter.

The value represents a user-driven quantity or achievement, such as tutorials completed or storage used. Unlike a progress bar, it reflects user actions, not system activity.

"Meters come in four different sizes: small, medium, large, and extra-large. By default, meters use medium size. Use the small size when there are multiple meters shown at the same time in a more confined space, such as in tables or cards."

Meters can include a value label to show details like “60%” or “2 of 8.” It should only appear if the main label is shown and is always placed above the track.

Meters should always have a label placed above the track. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These meters without a visible label should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

"Meter has four variants: informative, positive, notice, and negative."

When the label is too long for the available horizontal space, it wraps to form another line. The value is always shown in full and never wraps or truncates.

Use the built-in style for showing a label associated with the meter. By default, the label is start-aligned and an optional value is end-aligned above the track. (In left-to-right languages, this means the label appears on the left and the value on the right; in right-to-left languages, this flips.) The label should be written in sentence case.

Meter variants can be used to represent semantic values by switching variants as the value changes, from positive, to notice, and then to negative. This kind of variant switching should be handled appropriately within the context of your product so that you’re setting accurate expectations for your users about the semantic meaning.

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

* [Badge](/page/badge/)
* [Progress bar](/page/progress-bar/)
