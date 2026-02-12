---

title: "Standard dialog"
source\_url: <https://s2.spectrum.corp.adobe.com/page/standard-dialog/>
last\_updated: 2026-02-02
category: components/feedback
component\_type: feedback
status: published
tags:

* components-feedback
* feedback
* overlay
  related\_components:
* in-line-alert
* takeover-dialog
  parent\_category: feedback

---

# Standard dialog

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: | [Dialog](https://opensource.adobe.com/spectrum-css/?path=/docs/components-dialog--docs)                                        |
| Spectrum Web Components SWC: | [Dialog](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/dialog--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [Dialog](https://react-spectrum.adobe.com/s2/index.html?path=/docs/dialog--docs)                                               |

## Anatomy

```
standard dialog
- standard dialog container
- cover image (optional)
- close button (optional)
- header area
- title
- body area
- description (optional)
- footer area
- footer content (optional)
- button group
- overlay
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property             | Value       | Default value | Description                                                              |
| -------------------- | ----------- | ------------- | ------------------------------------------------------------------------ |
| title                | string      | –             |                                                                          |
| description          | string      | –             |                                                                          |
| hideImage            | boolean     | false         | Optional image to display in dialog.                                     |
| size                 | s / m / l m | –             |                                                                          |
| hideCloseButton      | boolean     | false         |                                                                          |
| footerContent        | string      | –             | Optional footer content to display in the dialog footer like a checkbox. |
| primaryActionLabel   | string      | –             |                                                                          |
| secondaryActionLabel | string      | –             | If undefined, this button does not appear.                               |
| cancelActionLabel    | string      | cancel        | If undefined, this button does not appear.                               |

## External links

Standard dialogs are containers that appear over the interface to present contextual information, tasks, or workflows. They’re centered on the screen and used for moderately complex actions that require focused attention. Interactions outside the dialog are blocked until it's dismissed or completed.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

By default, an alert dialog that includes a button to cancel or go back will be labeled “Cancel.”

Standard dialogs can include up to three buttons if a secondary outline button label is defined. If no label is defined, the button won’t appear. The secondary outline button should use a short, actionable phrase that clearly communicates the result of selecting the action—typically describing the previous step or an alternative choice.

The primary action label refers to the rightmost button in the dialog footer for languages that read left to right. It should use a short, actionable phrase that clearly communicates the result of selecting the action—whether that means moving forward or dismissing the dialog.

The presence of a close button determines whether a dialog is dismissible.

In both cases, pressing the Escape key should close the dialog and return the page to its previous state. This action should behave the same as clicking a close or cancel button.

"Standard dialogs are available in three widths:"

Dialogs automatically scale down to 90% of the screen width on smaller viewports. Height is flexible and adjusts to fit the content.

Standard dialogs can include a full-bleed cover image at the top. Dialogs with a cover image should not be dismissible and rely on buttons in the footer area to close the dialog.

Standard dialogs can include an optional description. Use the description to briefly provide additional context or information that helps users make an informed decision based on the available actions.

All standard dialogs must include a title. The title appears at the top of the dialog and should briefly describe the expected outcome if the user proceeds with the primary action. If a cover image is shown, the title will appear below it.

Standard dialogs appear in the center of the screen.

When the title and description text are too long for the available horizontal space, they wrap to form another line.

Standard dialogs can include up to three buttons. When horizontal space is limited, the buttons stack vertically. Buttons should be ordered by ascending importance, with the most critical action placed at the end or bottom of the stack.

Avoid using a dismissible dialog when the user needs to confirm an action or make a decision. Instead, use a dismissible dialog for information that is optional or nice to know—content that can be quickly dismissed without requiring user action.

A dismissible dialog should not include buttons in the footer. Instead, the dialog is dismissed by clicking the close button or the background overlay.

Most dialog titles should communicate the primary action of the dialog. When possible, the button label should use the same language as the action mentioned in the title. For example, if the title is “Delete conversation,” the primary action button label should be “Delete.”

## States

Standard dialogs appear in the center of the screen.

When the title and description text are too long for the available horizontal space, they wrap to form another line.

## Behaviors

Standard dialogs appear in the center of the screen.

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

* [In-line alert](/page/in-line-alert/)
* [Takeover dialog](/page/takeover-dialog/)
