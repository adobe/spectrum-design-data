---
title: "Rating"
source_url: https://s2.spectrum.corp.adobe.com/page/rating/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
  related\_components:
- radio-group
- search-field
  parent\_category: inputs

---

# Rating

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Rating](https://opensource.adobe.com/spectrum-css/?path=/docs/components-rating--docs) |

## Anatomy

```
rating
- Star workflow icon
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property     | Value                                                    | Default value | Description |
| ------------ | -------------------------------------------------------- | ------------- | ----------- |
| value        | number 0 From 0 to 5, can be a decimal to represent half | stars         |             |
| isEmphasized | boolean                                                  | false         |             |
| isDisabled   | boolean                                                  | false         |             |
| state        | default / hover / down / keyboard focus default          | –             |             |

## External links

Ratings allow scoring of an item or experience based on quality or preference. Common examples include images, forum posts, or products.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A rating in a disabled state shows that the component exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later.

By default, ratings are not emphasized (dark gray). This version is optimal for when the rating is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content.

The emphasized (blue) version provides a visual prominence that is optimal for forms, dialogs, and other situations where a rating needs to be noticed.

The value is the number of the rating selected, on a sentiment scale from 0 to 5 (0 being the lowest, 5 being the highest).

"The rating component supports two main use cases: inputting and aggregating. Inputting allows users to select a rating, while aggregating displays the average rating, which may include fractional stars. Interactive ratings show only whole stars to avoid confusion during selection."

When a user interacts with a rating component that shows a previously entered value, a tooltip appears when they hover over a star. The language in the tooltip is phrased as a call-to-action to edit their rating. For example, “Edit 4 star rating”.

A user’s previously entered rating can be cleared if they select the “highest” star (for example, clicking or tapping the fourth star from the left on a four-star rating). On keyboard focus, the left/down arrow keys will decrease the rating until the last star is removed. A tooltip appears on hover with alt text that describes the action, for example “Clear 4 star rating”.

Rating can display approximate value or precise value depending on the needs of the product or service. For example, Amazon.com uses approximate rating, but Apple's App Store uses precise rating.

When representing multiple values (e.g., rating 2 photos at the same time), the rating is shown as empty if the ratings are not the same. This behavior is consistent with how a radio button group works, as well.

Star ratings should always have 5 available stars. This shouldn’t be increased or decreased to fit various containers.

## States

Star ratings should always have 5 available stars. This shouldn’t be increased or decreased to fit various containers.

## Behaviors

Star ratings should always have 5 available stars. This shouldn’t be increased or decreased to fit various containers.

## Usage guidelines

Star ratings should always have 5 available stars. This shouldn’t be increased or decreased to fit various containers.

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

* [Radio group](/page/radio-group/)
* [Search field](/page/search-field/)
