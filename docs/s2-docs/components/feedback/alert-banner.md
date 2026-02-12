---

title: "Alert banner"
source\_url: <https://s2.spectrum.corp.adobe.com/page/alert-banner/>
last\_updated: 2026-02-02
category: components/feedback
component\_type: feedback
status: published
tags:

* components-feedback
* feedback
* overlay
  related\_components:
* table
* alert-dialog
  parent\_category: feedback

---

# Alert banner

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Alert | [banner](https://opensource.adobe.com/spectrum-css/?path=/docs/components-alert-banner--docs)                                        |
| Spectrum Web Components SWC: Alert | [Banner](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/alert-banner--docs\&globals=system:spectrum-two) |

## Anatomy

```
alert banner
- background
- icon
- text
- button
- close button
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property      | Value                                             | Default value | Description                                |
| ------------- | ------------------------------------------------- | ------------- | ------------------------------------------ |
| text          | string                                            | –             |                                            |
| variant       | neutral / informative / negative / accent neutral | –             |                                            |
| actionLabel   | string                                            | –             | If undefined, this button does not appear. |
| isDismissible | boolean                                           | false         |                                            |

## External links

Alert banners communicate high-priority messages that need immediate attention. They appear prominently in the interface and often prompt an action.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

An alert banner can include an icon-only close button to dismiss it.

An alert banner ideally provides a way for a user to address an issue in-line with an action. It can have both an icon-only close button and a button with a contextual action to take. There should never be more than one button with a contextual action in an alert banner.

An alert banner always has a semantic meaning and uses semantic colors. Only gray (neutral), blue (informative), and red (negative) are available as options.

Text is required for all alert banners. The message should be concise and, if applicable, describe the next step that a user can take.

When the text is too long for the available horizontal space, it wraps to form another line. In actionable alert banners, the button moves below the text prior to text wrapping.

Whenever possible, add an in-line action button if there's a way for a user to quickly address the issue associated with an alert.

The close button is optional, depending on context. Consider adding one to let a user easily dismiss the alert.

Alert banners should be reserved only for high-signal, system-level alert messages, such as internet connection issues, expirations of subscriptions, or major changes.

Don’t use yellow or orange colors for errors because the contrast is not accessible.

If you need to show a “notice” message or other non-critical communication, use the gray (neutral) or blue (informative) semantic color options. Reserve the red (negative) option only for errors that directly interrupt or block a user’s experience — not for nice-to-know information.

Don't include more than one action in an alert banner. Having more than one action to choose from can be overwhelming, and it can become difficult for users to decide what to do next in such a small space.

Alert banners should appear at the top of a page, below the header.

Don't show multiple alert banners at the same time. If a new alert banner appears with a higher priority message, it should replace an existing alert banner of lesser importance until the higher priority one has been addressed.

Overlay an alert banner when it's expected to fade in and out without impacting the content underneath it, and when it's not hiding any important actions or information by being there. An alert banner should only overlay content if it is dismissible.

Push an alert banner when it's expected to stay in place, when it's not dismissible, or when no information should be hidden from the view.

If a user dismisses an alert banner without addressing an error that needs to be resolved, it should come back into view at the next possible occasion.

Never allow alert banners to time out. Since these are system-level messages, they should not dismiss on their own unless there is a change in the system that resolves an issue (e.g., regaining internet connectivity after losing it).

When used in the app frame, the alert banner appears above the Top App Bar (TAB) and header, or above the header if the TAB isn’t active.

Learn more about how the Top App Bar (TAB) works in the app frame.

## States

Whenever possible, add an in-line action button if there's a way for a user to quickly address the issue associated with an alert.

The close button is optional, depending on context. Consider adding one to let a user easily dismiss the alert.

Don’t use yellow or orange colors for errors because the contrast is not accessible.

Alert banners should appear at the top of a page, below the header.

Push an alert banner when it's expected to stay in place, when it's not dismissible, or when no information should be hidden from the view.

When used in the app frame, the alert banner appears above the Top App Bar (TAB) and header, or above the header if the TAB isn’t active.

Learn more about how the Top App Bar (TAB) works in the app frame.

## Behaviors

Whenever possible, add an in-line action button if there's a way for a user to quickly address the issue associated with an alert.

The close button is optional, depending on context. Consider adding one to let a user easily dismiss the alert.

Don’t use yellow or orange colors for errors because the contrast is not accessible.

Alert banners should appear at the top of a page, below the header.

Push an alert banner when it's expected to stay in place, when it's not dismissible, or when no information should be hidden from the view.

When used in the app frame, the alert banner appears above the Top App Bar (TAB) and header, or above the header if the TAB isn’t active.

Learn more about how the Top App Bar (TAB) works in the app frame.

## Usage guidelines

Whenever possible, add an in-line action button if there's a way for a user to quickly address the issue associated with an alert.

The close button is optional, depending on context. Consider adding one to let a user easily dismiss the alert.

Don’t use yellow or orange colors for errors because the contrast is not accessible.

Alert banners should appear at the top of a page, below the header.

Push an alert banner when it's expected to stay in place, when it's not dismissible, or when no information should be hidden from the view.

When used in the app frame, the alert banner appears above the Top App Bar (TAB) and header, or above the header if the TAB isn’t active.

Learn more about how the Top App Bar (TAB) works in the app frame.

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

* [Table](/page/table/)
* [Alert dialog](/page/alert-dialog/)
