---

title: "Field label"
source\_url: <https://s2.spectrum.corp.adobe.com/page/field-label/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
* input
* form
  related\_components:
* drop-zone
* help-text
  parent\_category: inputs

---

# Field label

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Field | [label](https://opensource.adobe.com/spectrum-css/?path=/docs/components-field-label--docs)                                                                                                 |
| Spectrum Web Components SWC: Field | \[Label]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/field-label--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |

## Anatomy

```
field label
- label
- necessity indicator
- input(s)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value            | Default value | Description |
| ------------------ | ---------------- | ------------- | ----------- |
| label              | string           | –             |             |
| labelPosition      | top / side top   | –             |             |
| size               | s / m / l / xl m | –             |             |
| necessityIndicator | text / icon icon | –             |             |
| isRequired         | boolean          | false         |             |
| isDisabled         | boolean          | false         |             |

## External links

Field labels provide context for associated input fields. They describe the expected content or data type.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A field label in a disabled state shows that an input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an input field may become available later.

"Inputs can be marked as required or optional, depending on the situation, using a necessity indicator. There are two styles for the necessity indicator: icon or text."

By default, the necessity indicator is shown with an asterisk icon. Required inputs are marked with this at the end of the label. If you use this icon, be sure to include hint text to explain what it means. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. Optional inputs do not have an icon.

Alternatively, the necessity indicator can be shown with text. This appends text that reads either “(required)” or “(optional)” at the end of the label.

"Field labels come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option with medium-sized inputs. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. Both small and medium field labels have the same font size, but different paddings when used as side labels."

A label can be placed either on top or on the side of an input. This option affects the bounding box of the component to ensure proper alignment. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

When the field label is too long for the available horizontal space, it wraps to form another line.

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form.

If most of the input fields are optional, only the required fields should be given an asterisk icon or have labels appended with “(required).” If most of the input fields are required, only the optional fields should be appended with “(optional).” An asterisk icon should never be used to note that a field is optional.

## States

When the field label is too long for the available horizontal space, it wraps to form another line.

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form.

## Behaviors

When the field label is too long for the available horizontal space, it wraps to form another line.

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form.

## Usage guidelines

In a single form, mark only the required fields or only the optional fields, depending on whichever is less frequent in the entire form.

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

* [Drop zone](/page/drop-zone/)
* [Help text](/page/help-text/)
