---
title: "Checkbox group"
source_url: https://s2.spectrum.corp.adobe.com/page/checkbox-group/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- form
related_components:
- checkbox
- color-area
parent_category: inputs

---

# Checkbox group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                           | Link                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Field | [Group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-field-group--docs)                                                                                                 |
| Spectrum Web Components SWC: Field | \[Group]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/field-group--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                | [CheckboxGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/checkboxgroup--docs)                                                                                              |

## Anatomy

```
checkbox group
- field label
- checkbox
- help text
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                          | Default value | Description |
| ------------------ | ------------------------------ | ------------- | ----------- |
| label              | string                         | –             |             |
| labelPosition      | top / side top                 | –             |             |
| necessityIndicator | text / icon icon               | –             |             |
| isRequired         | boolean                        | false         |             |
| orientation        | horizontal / vertical vertical | –             |             |
| isError            | boolean                        | false         |             |
| isDisabled         | boolean                        | false         |             |
| description        | string                         | –             |             |
| errorMessage       | string                         | –             |             |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

When a description is present and an error is triggered, it is replaced with an error message. Once the error is resolved, the help text description reappears.

A checkbox group in a disabled state shows that a selection exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later. The field label, checkboxes, and help text are all displayed in a disabled state when the checkbox group is disabled.

Checkbox groups can be either horizontal or vertical. By default, checkbox groups are stacked vertically. Use a horizontal checkbox group when vertical space is limited.

Checkbox groups can be marked as optional or required, depending on the situation. Optional checkbox groups are either denoted with text added to the end of the label — “(optional)” — or have no indication at all.

"For required checkbox groups, there are two necessity indicator options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include help text to explain what the asterisk means."

The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself.

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

Checkbox groups should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These checkbox groups without a visible label should still include an aria-label in HTML (depending on the context, “aria-label” or “aria-labelledby”).

## States

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

* [Checkbox](/page/checkbox/)
* [Color area](/page/color-area/)
