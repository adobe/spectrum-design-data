---
title: "Steplist"
source_url: https://s2.spectrum.corp.adobe.com/page/steplist/
last_updated: 2026-02-02
category: components/status
component_type: status
status: published
tags:

- components-status
related_components:
- status-light
- faqs
parent_category: status

---

# Steplist

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Steplist](https://opensource.adobe.com/spectrum-css/?path=/docs/components-steplist--docs) |

## Anatomy

```
steplist
- step item
- track
- label (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                      | Default value | Description                                           |
| ----------- | ------------------------------------------ | ------------- | ----------------------------------------------------- |
| orientation | horizontal / vertical horizontal           | –             |                                                       |
| items       | array – An array of step items in the step | list.         |                                                       |
| currentStep | string                                     | –             | The identifier or label of the currently active step. |

## External links

Steplists show progress across a series of discrete steps in a process. Use them for setups, wizards, or other flows with a fixed number of stages. They can be displayed horizontally or vertically.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A current step in a steplist is styled to indicate the user's active position within a sequence. This styling helps orient the user by showing which step they are currently working on or viewing. It typically uses a distinct visual treatment, such as displaying the number of the step, to differentiate it from completed or incomplete steps. This ensures clarity in navigation and reinforces the sense of progress through the workflow.

Represents an individual step within the steplist. Each item conveys a specific stage in a process or workflow.

By default, steplists are horizontal and should be used for wider layouts or panels to keep the user’s focus moving from left to right. Vertical steplists should be used for more narrow layouts or panels to accommodate more steps without crowding.

Users can’t click on incomplete steps. The steplist follows a linear flow, requiring completion of the previous step before moving to the next.

Completed steps display a checkmark, while remaining steps retain their numeric indicators. The current step uses a darker fill to indicate selection. This treatment is available in medium, large, and extra-large sizes.

When a step’s label is long for the available horizontal space, it wraps to form another line.

"Labels are optional in a steplist. Here are three recommended approaches:"

## States

Users can’t click on incomplete steps. The steplist follows a linear flow, requiring completion of the previous step before moving to the next.

When a step’s label is long for the available horizontal space, it wraps to form another line.

"Labels are optional in a steplist. Here are three recommended approaches:"

## Behaviors

Users can’t click on incomplete steps. The steplist follows a linear flow, requiring completion of the previous step before moving to the next.

When a step’s label is long for the available horizontal space, it wraps to form another line.

"Labels are optional in a steplist. Here are three recommended approaches:"

## Usage guidelines

"Labels are optional in a steplist. Here are three recommended approaches:"

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

* [Status light](/page/status-light/)
* [FAQs](/page/faqs/)
