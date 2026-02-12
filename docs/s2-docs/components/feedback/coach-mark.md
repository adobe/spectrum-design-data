---
title: "Coach mark"
source_url: https://s2.spectrum.corp.adobe.com/page/coach-mark/
last_updated: 2026-02-02
category: components/feedback
component_type: feedback
status: published
tags:

- components-feedback
  related\_components:
- coach-indicator
- contextual-help
  parent\_category: feedback

---

# Coach mark

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Coach | [mark](https://opensource.adobe.com/spectrum-css/?path=/docs/components-coach-mark--docs)                                            |
| Spectrum Web Components SWC:       | [Coachmark](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/coachmark--docs\&globals=system:spectrum-two) |

## Anatomy

```
coach mark
- container
- image (optional)
- title
- more actions menu
- keyboard shortcuts
- description
- tour step counter
- button group
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                 | Default value | Description                          |
| ----------- | ------------------------------------- | ------------- | ------------------------------------ |
| title       | string                                | –             |                                      |
| description | string                                | –             |                                      |
| hideImage   | boolean                               | false         | Optional image to display in dialog. |
| actions     | object – Configuration for coach mark | actions.      |                                      |

## External links

Coach marks are temporary messages that provide guidance during new or unfamiliar experiences. They can appear as a single message or be sequenced into a tour.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Actions is an area for certain configurations of a Coach mark and can contain an action menu, keyboard shortcut, or both. When both are enabled, the component layout adjusts to display the keyboard shortcut below the title.

Coach marks can contain images or videos that relate to their content, such as demonstrations of gestures, the feature being used, or illustrations.

Coach marks must include a title. Titles appear in bold at the top of the coach mark and use a few words to convey its purpose.

All coach marks must have a description. Descriptions briefly communicate the information and context needed to educate a user about a new or unfamiliar product experience.

When the text of a header or description is too long for the available horizontal space, it wraps to form another line. The steps in a tour are always shown in full and never wrap or truncate.

By default, the step counter appears next to the title. If an action menu is also used, the keyboard shortcut appears below the title instead.

Choose a width for coach marks that is spacious enough to accommodate all of their content. In a tour that includes several coach marks, keep the width consistent across each one.

The “Previous” button should always be a quiet secondary button.

The “Skip tour” and “Restart tour” options should only be available within the more actions menu.

Titles help with way finding and setting context for what a user is learning about. Summarize the description of the coach mark in a few concise words. In a tour, use a different title for each coach mark to keep users active and engaged. Avoid repeating the title in the description.

Coach marks are meant to provide quick overviews of functionality. Content should be at least a few words, but no more than a few sentences.

The primary action should be brief and consistent. Use "OK" for a single coach mark. Within a tour, use “Next” for all but the last step, and “Finish” for the last step. Don’t use different primary action names for every step in a tour.

When a part of the tour is dependent on a user taking an action, it’s okay to put the primary button in the disabled state as long as the user has a way to exit the tour. For a one-off coach mark, this means the primary button should remain as a route to dismiss. In a tour, it’s recommended to have the more actions menu present.

When part of the tour is dependent on a user action, don't force users to confirm that they've taken that action.

## States

By default, the step counter appears next to the title. If an action menu is also used, the keyboard shortcut appears below the title instead.

The “Previous” button should always be a quiet secondary button.

The “Skip tour” and “Restart tour” options should only be available within the more actions menu.

Coach marks are meant to provide quick overviews of functionality. Content should be at least a few words, but no more than a few sentences.

When part of the tour is dependent on a user action, don't force users to confirm that they've taken that action.

## Behaviors

By default, the step counter appears next to the title. If an action menu is also used, the keyboard shortcut appears below the title instead.

The “Previous” button should always be a quiet secondary button.

The “Skip tour” and “Restart tour” options should only be available within the more actions menu.

Coach marks are meant to provide quick overviews of functionality. Content should be at least a few words, but no more than a few sentences.

When part of the tour is dependent on a user action, don't force users to confirm that they've taken that action.

## Usage guidelines

The “Previous” button should always be a quiet secondary button.

The “Skip tour” and “Restart tour” options should only be available within the more actions menu.

Coach marks are meant to provide quick overviews of functionality. Content should be at least a few words, but no more than a few sentences.

When part of the tour is dependent on a user action, don't force users to confirm that they've taken that action.

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

* [Coach indicator](/page/coach-indicator/)
* [Contextual help](/page/contextual-help/)
