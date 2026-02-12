---

title: "In-line alert"
source\_url: <https://s2.spectrum.corp.adobe.com/page/in-line-alert/>
last\_updated: 2026-02-02
category: components/feedback
component\_type: feedback
status: published
tags:

* components-feedback
* feedback
* overlay
  related\_components:
* illustrated-message
* standard-dialog
  parent\_category: feedback

---

# In-line alert

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                             | Link                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: In-line | [alert](https://opensource.adobe.com/spectrum-css/?path=/docs/components-in-line-alert--docs) |
| Spectrum Web Components Not          | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/inlinealert--docs)      |
| React Spectrum RSP:                  | [InlineAlert](https://react-spectrum.adobe.com/s2/index.html?path=/docs/inlinealert--docs)    |

## Anatomy

```
in-line alert
- background
- title (optional)
- icon
- body area
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                                                 | Default value | Description                                                         |
| ----------- | --------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| variant     | neutral / informative / positive / notice / negative / accent neutral | –             |                                                                     |
| style       | bold / subtle / outline outline                                       | The           | visual style of the alert.                                          |
| href        | string                                                                | –             | Optional URL within in-line alert content like a 'Learn more' link. |
| heading     | string                                                                | –             | Optional heading text displayed at the top of the alert.            |
| actionLabel | string                                                                | –             | If undefined, this button does not appear.                          |

## External links

In-line alerts display non-modal messages connected to elements in a view. They’re often used in forms to show validation feedback across multiple fields.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

An in-line alert can have up to one button. This label should be kept concise, and it should only be used when there’s a direct action available that is related to the in-line alert text.

Heading is optional for in-line alerts.

The outline style is the default for in-line alerts.

"There are five semantic variants:"

When the title of an in-line alert is too long for the available horizontal space, it wraps to form another line. The optional icon in the top-right corner stays aligned to the top.

## States

## Behaviors

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

* [Illustrated message](/page/illustrated-message/)
* [Standard dialog](/page/standard-dialog/)
