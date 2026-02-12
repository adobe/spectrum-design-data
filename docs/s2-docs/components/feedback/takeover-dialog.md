---

title: "Takeover dialog"
source\_url: <https://s2.spectrum.corp.adobe.com/page/takeover-dialog/>
last\_updated: 2026-02-02
category: components/feedback
component\_type: feedback
status: published
tags:

* components-feedback
* feedback
* overlay
  related\_components:
* standard-dialog
* toast
  parent\_category: feedback

---

# Takeover dialog

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                                       | Link                                                                                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Dialog Fullscreen | [Takeover](https://opensource.adobe.com/spectrum-css/?path=/story/components-dialog--fullscreen-takeover)                                                                                                 |
| Spectrum Web Components SWC: Dialog Fullscreen | \[Takeover]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/story/dialog--fullscreen-takeover&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                            | [FullscreenDialog](https://react-spectrum.adobe.com/s2/index.html?path=/docs/fullscreendialog--docs\&globals=backgrounds.grid:!false)                                                                     |

## Anatomy

```
takeover dialog
- takeover dialog container
- header area
- title
- header content (optional)
- button group
- body area
- body content (optional)
- overlay
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property             | Value                                                                                 | Default value | Description                                |
| -------------------- | ------------------------------------------------------------------------------------- | ------------- | ------------------------------------------ |
| title                | string                                                                                | –             |                                            |
| description          | string                                                                                | –             |                                            |
| variant              | dialog / full screen dialog                                                           | –             |                                            |
| primaryActionLabel   | string                                                                                | –             |                                            |
| secondaryActionLabel | string                                                                                | –             | If undefined, this button does not appear. |
| cancelActionLabel    | string                                                                                | cancel        | If undefined, this button does not appear. |
| slots                | array – Areas where other components can be inserted (e.g. Side navigation, Steplist, | Forms).       |                                            |

## External links

Takeover dialogs are full-screen modals used for complex or immersive workflows. They block access to the rest of the interface and are typically used when multiple steps or tools need focused attention. Use when the task requires the entire screen and shouldn’t be interrupted.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

The takeover dialog supports two slots—one in the header and one in the body—where other components can be inserted.

"Takeover dialogs support two layout variants: dialog and full-screen."

All takeover dialogs must include a title. The title appears at the top of the dialog and should briefly describe the expected outcome if the user proceeds with the primary action.

A takeover dialog must include at least one button. The primary action label refers to the rightmost button in the dialog footer for languages that read left to right. It should use a short, actionable phrase that clearly communicates the result of selecting the action—whether that means taking action, progressing through a workflow, or dismissing the dialog.

Takeover dialogs can include up to three buttons if a secondary outline button label is defined. If no label is defined, the button won’t appear. The secondary outline button should use a short, actionable phrase that clearly communicates the result of selecting the action—typically describing the previous step or an alternative choice.

By default, a takeover dialog that includes a button to cancel or go back will be labeled “Cancel.”

When the title is too long for the available horizontal space, it wraps to form another line.

Takeover dialogs can optionally include additional elements in the header custom content area. When horizontal space is limited, the header custom content will be displayed underneath the title.

Most dialog titles should communicate the primary action of the dialog. When possible, the button label should use the same language as the action mentioned in the title. For example, if the title is “Delete conversation,” the primary action button label should be “Delete.”

## States

When the title is too long for the available horizontal space, it wraps to form another line.

## Behaviors

When the title is too long for the available horizontal space, it wraps to form another line.

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

* [Standard dialog](/page/standard-dialog/)
* [Toast](/page/toast/)
