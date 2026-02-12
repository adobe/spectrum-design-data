---
title: "Coach indicator"
source_url: https://s2.spectrum.corp.adobe.com/page/coach-indicator/
last_updated: 2026-02-02
category: components/feedback
component_type: feedback
status: published
tags:

- components-feedback
related_components:
- alert-dialog
- coach-mark
parent_category: feedback

---

# Coach indicator

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Coach | [indicator](https://opensource.adobe.com/spectrum-css/?path=/docs/components-coach-indicator--docs)                                            |
| Spectrum Web Components SWC:       | [CoachIndicator](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/coachindicator--docs\&globals=system:spectrum-two) |

## Anatomy

```
coach indicator
- inner stroke (small ring)
- outer stroke (big ring)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property       | Value                                                                                                                                                                                          | Default value | Description |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| cornerRounding | none / corner-radius-75 / corner-radius-100 / corner-radius-200 / corner-radius-300 / corner-radius-400 / corner-radius-500 / corner-radius-600 / corner-radius-700 / corner-radius-800 / full | –             |             |
| staticColor    | white – If not set to white, the coach indicator uses the default                                                                                                                              | color.        |             |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

If not set to white, the coach indicator uses the default color.

"The rounding of the indicator is determined by the shape of the object that it is highlighting. There are three types of rounding for coach indicators: no rounding, default rounding, and full rounding."

No rounding means that there is no rounding on the object being indicated. In this case, a 6 px border radius rounding is applied to the coach indicator.

Default rounding happens when an object has its own rounding, but isn’t fully rounded. In this case, the coach indicator should have the same rounding of that object with a 2 px gap.

Full rounding occurs when an object already has a rounded style that gives it a pill shape (e.g., a button). In this case, the coach indicator is also rounded.

The animation is always on the coach indicator. When an implementation is unable to animate the coach indicator, it can use a non-animated version to provide a similar experience.

Coach indicators adopt the shape of the object they highlight. A 2 px space separates the indicator from the object’s placement area, creating padding on all sides.

When an indicator needs to be placed on top of a visual, use the static white option. Static white does not change values depending upon the color theme.

"Coach indicators are typically paired with coach marks to create accessible user onboarding experiences. When using coach indicators:"

## States

"Coach indicators are typically paired with coach marks to create accessible user onboarding experiences. When using coach indicators:"

## Behaviors

"Coach indicators are typically paired with coach marks to create accessible user onboarding experiences. When using coach indicators:"

## Usage guidelines

"Coach indicators are typically paired with coach marks to create accessible user onboarding experiences. When using coach indicators:"

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

* [Alert dialog](/page/alert-dialog/)
* [Coach mark](/page/coach-mark/)
