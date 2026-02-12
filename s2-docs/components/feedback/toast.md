---
title: "Toast"
source_url: https://s2.spectrum.corp.adobe.com/page/toast/
last_updated: 2026-02-02
category: components/feedback
component_type: feedback
status: published
tags:

- components-feedback
- feedback
- overlay
related_components:
- takeover-dialog
- tooltip
parent_category: feedback

---

# Toast

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Toast](https://opensource.adobe.com/spectrum-css/?path=/docs/components-toast--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Toast]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/toast--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Toast](https://react-spectrum.adobe.com/s2/index.html?path=/docs/toast--docs)                                                                                                        |

## Anatomy

```
toast
- background
- icon
- text
- button
- close button
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property          | Value                                               | Default value | Description                                |
| ----------------- | --------------------------------------------------- | ------------- | ------------------------------------------ |
| text              | string                                              | –             |                                            |
| variant           | neutral / informative / positive / negative neutral | –             |                                            |
| actionLabel       | string                                              | –             | If undefined, this button does not appear. |
| isAutoDismissible | boolean                                             | false         |                                            |

## External links

Toasts display brief, temporary notifications. They appear briefly without blocking interaction and typically do not require user action.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Toasts must include text to communicate a message. Write the text as concisely as possible while still being clear about what has happened or is happening.

The neutral toast is the default variant. It is gray and does not have an icon. This is used when the message is neutral in tone or when its semantics do not fit in any of the other variants.

The informative toast uses the informative semantic color (blue) and has an info icon to help those with color vision deficiency discern the message tone. This should be used when the message should call extra attention compared to the neutral variant.

The positive toast uses the positive semantic color (green) and has a checkmark icon to help those with color vision deficiency discern the message tone. This is used to inform about a successful action or completion of a task.

The negative toast uses the negative semantic color (red) and has an alert icon to help those with color vision deficiency to discern the message tone. This is used to show an error or failure.

By default, a toast will dismiss when the user clicks the close button. A toast also has the option to auto-dismiss. Be sure to set a minimum of 5 seconds so that users can have time to read the toast message. If an actionable toast is set to auto-dismiss, make sure that the action is still available elsewhere in the app.

When the text is too long for the available horizontal space, it wraps to form another line. In actionable toasts, the button moves below the text prior to text wrapping.

The default state can display up to three toasts at a time. To view additional toasts beyond this limit, users can click the “Show all” action button. Alternatively, they can reveal remaining toasts by interacting with a button or dismissing the component. Additionally, hovering over the upper part of the toasts triggers a subtle animation, signaling to the user that the group can be fully expanded.

Please refer to more multiple toasts usage guideline below.

Toasts should only be used for confirmations, simple notifications, and low-priority alerts that do not need to completely interrupt the user experience.

Dialogs are ideal for when a situation requires a user’s attention, either for displaying important information or prompting for a response.

By default, a toast is placed at the bottom center for both desktop and mobile platform scales to avoid disrupting the user experience.

For desktop applications, a toast should be placed 16 px away from the bottom of the viewport.

If a toast isn’t noticeable or disrupts the user experience, its placement can be changed to bottom end, top end, or top center.

Actionable toasts should only have one button.

Actionable toasts should not have a button with a redundant action. For example, including a “Dismiss” button would be redundant because all toasts already have a close button.

Products should allow for users to be able turn off all types of alerts. Doing this helps people who want to focus and minimize information that they may find non-essential.

## States

Please refer to more multiple toasts usage guideline below.

Dialogs are ideal for when a situation requires a user’s attention, either for displaying important information or prompting for a response.

By default, a toast is placed at the bottom center for both desktop and mobile platform scales to avoid disrupting the user experience.

For desktop applications, a toast should be placed 16 px away from the bottom of the viewport.

If a toast isn’t noticeable or disrupts the user experience, its placement can be changed to bottom end, top end, or top center.

Actionable toasts should only have one button.

## Behaviors

Please refer to more multiple toasts usage guideline below.

Dialogs are ideal for when a situation requires a user’s attention, either for displaying important information or prompting for a response.

By default, a toast is placed at the bottom center for both desktop and mobile platform scales to avoid disrupting the user experience.

For desktop applications, a toast should be placed 16 px away from the bottom of the viewport.

If a toast isn’t noticeable or disrupts the user experience, its placement can be changed to bottom end, top end, or top center.

Actionable toasts should only have one button.

## Usage guidelines

Dialogs are ideal for when a situation requires a user’s attention, either for displaying important information or prompting for a response.

By default, a toast is placed at the bottom center for both desktop and mobile platform scales to avoid disrupting the user experience.

For desktop applications, a toast should be placed 16 px away from the bottom of the viewport.

If a toast isn’t noticeable or disrupts the user experience, its placement can be changed to bottom end, top end, or top center.

Actionable toasts should only have one button.

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

* [Takeover dialog](/page/takeover-dialog/)
* [Tooltip](/page/tooltip/)
