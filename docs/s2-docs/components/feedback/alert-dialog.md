---
title: "Alert dialog"
source_url: https://s2.spectrum.corp.adobe.com/page/alert-dialog/
last_updated: 2026-02-02
category: components/feedback
component_type: feedback
status: published
tags:

- components-feedback
- feedback
- overlay
  related\_components:
- alert-banner
- coach-indicator
  parent\_category: feedback

---

# Alert dialog

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Alert | [dialog](https://opensource.adobe.com/spectrum-css/?path=/docs/components-alert-dialog--docs)                                        |
| Spectrum Web Components SWC: Alert | [Dialog](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/alert-dialog--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                | [AlertDialog](https://react-spectrum.adobe.com/s2/index.html?path=/docs/alertdialog--docs)                                           |

## Anatomy

```
alert dialog
- alert dialog container
- title
- description
- primary action
- secondary action (optional)
- cancel action (optional)
- overlay
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property             | Value                                                                   | Default value | Description                                |
| -------------------- | ----------------------------------------------------------------------- | ------------- | ------------------------------------------ |
| title                | string                                                                  | –             |                                            |
| description          | string                                                                  | –             |                                            |
| variant              | confirmation / information / warning / destructive / error confirmation | –             |                                            |
| primaryActionLabel   | string                                                                  | –             |                                            |
| secondaryActionLabel | string                                                                  | –             | If undefined, this button does not appear. |
| cancelActionLabel    | string                                                                  | cancel        | If undefined, this button does not appear. |

## External links

Alert dialogs present critical information that must be acknowledged. They appear over the interface and block further interaction until an action is selected.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

By default, an alert dialog that includes a button to cancel or go back will be labeled “Cancel.”

Alert dialogs can include up to three buttons if a secondary outline button label is defined. If no label is defined, the button won’t appear. The secondary outline button should use a short, actionable phrase that clearly communicates the result of selecting the action—typically describing the previous step or an alternative choice.

An alert dialog must include at least one button. The primary action label refers to the rightmost button in the dialog footer for languages that read left to right. It should use a short, actionable phrase that clearly communicates the result of selecting the action—whether that means moving forward or dismissing the dialog.

"Use the appropriate variant based on the context of the message:"

Alert dialogs should include a description when available. The description briefly communicates any additional information or context a user needs to make a decision based on the options presented.

All alert dialogs must have a title. The title appears at the top of the dialog and uses a few words to convey the outcome of what will happen if a user continues with the primary action.

When the title and description text are too long for the available horizontal space, they wrap to form another line.

Alert dialogs can include up to three buttons. When horizontal space is limited, the buttons stack vertically. Buttons should be ordered by ascending importance, with the most critical action placed at the end or bottom of the stack.

Alert dialogs are interruptive, so they should be reserved for important information that users must acknowledge before continuing a task or workflow. Use them only when absolutely necessary—not for low-priority notifications or excessive confirmations.

Alert dialogs are designed to pause the experience until a decision is made, so only one should appear at a time. Avoid opening an alert dialog from within another. If a situation seems to require a sequence of decisions, consider using a different design pattern.

## States

When the title and description text are too long for the available horizontal space, they wrap to form another line.

## Behaviors

When the title and description text are too long for the available horizontal space, they wrap to form another line.

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

* [Alert banner](/page/alert-banner/)
* [Coach indicator](/page/coach-indicator/)
