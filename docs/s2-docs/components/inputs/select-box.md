---
title: "Select box"
source_url: https://s2.spectrum.corp.adobe.com/page/select-box/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- form
related_components:
- segmented-control
- slider
parent_category: inputs

---

# Select box

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                    | Link                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) Not | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/selectboxgroup-alpha--docs)      |
| Spectrum Web Components Not | [available](https://react-spectrum.adobe.com/s2/index.html?path=/docs/selectboxgroup-alpha--docs)      |
| React Spectrum RSP:         | [SelectBoxGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/selectboxgroup-alpha--docs) |

## Anatomy

```
select box
- illustration (optional)
- label (required) and body (optional)
- checkbox
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property         | Value                                           | Default value | Description                               |
| ---------------- | ----------------------------------------------- | ------------- | ----------------------------------------- |
| label            | string                                          | –             |                                           |
| orientation      | horizontal / vertical vertical                  | –             |                                           |
| body             | string                                          | –             |                                           |
| isSelected       | boolean                                         | false         |                                           |
| hideIllustration | boolean                                         | false         |                                           |
| showCheckbox     | boolean                                         | false         |                                           |
| isDisabled       | boolean                                         | false         |                                           |
| state            | default / down / hover / keyboard focus default | –             |                                           |
| multiple         | boolean                                         | false         | Set to true to allow multiple selections. |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Select boxes allow users to choose options in a workflow. Both single-select and multi-select versions use checkboxes to show selection. Multi-select boxes display unchecked checkboxes by default to signal that multiple choices are allowed. Single-select boxes only show an unchecked checkbox on hover. If showCheckbox is false, selection is only shown using the dark border.

A select box in a disabled state shows that the items within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an option may become available later. Individual boxes may be disabled or the entire group may be disabled.

Illustrations are optional but recommended and included by default.

A label is required in select boxes. It acts as the title of the select box and explains its action or purpose.. Ideally, the label should be kept concise, even in the horizontal orientation.

Body is optional in select boxes. If no value is entered for the body, then it will not appear in the component. Body is usually reserved for the horizontal version of select boxes.

A select box is vertical by default, which works best when metadata is limited to a short title, with or without an illustration. The horizontal orientation is recommended when the select box includes longer-form metadata.

Minimum and maximum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

All select boxes should be the same size as one another. Keep metadata concise, and make the size of the box large enough to accommodate longer text when translated to other languages.

When the title of the select box is too long for the available horizontal space, it wraps to another line. Wrapped text should not affect the size of an individual select box. Each box in a group should have enough space to allow for longer, localized text to fit as necessary.

Clicking a select box does not immediately move to the next step in the sequence. After making a selection, the user must initiate the next step by choosing a button or similar component outside the select box group.

A select box group can be navigated using a keyboard. The keyboard focus state takes the button’s visual hover state and adds a blue ring to the button in focus.

Illustrations should be used when they help clarify the content. If the items are too complex to represent visually, it may be better to omit them. For consistency, if one select box includes an illustration, all select boxes in the group should include one.

Select box groups work best with 3 to 9 items. If your experience needs more than 9 items, consider using a dropdown, checkboxes, or radio button group instead.

Select boxes are used to choose an item from a group. If clicking an item is meant to immediately trigger an action, use an action group instead.

All select boxes in a group should be the same size to maintain visual consistency and usability.

Select boxes use a checkbox to indicate both single- and multi-selection. Don’t use radio buttons for single-selection.

Some cases may make more sense for the user to select one or a few options in a group of select boxes, but if the use case doesn’t make sense to be checking a selection, showCheckbox can be false and the highlight style can be used instead. There is no visual differentiation between single- and multi-select behaviors when checkboxes are not present.

## States

Minimum and maximum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

Select boxes are used to choose an item from a group. If clicking an item is meant to immediately trigger an action, use an action group instead.

All select boxes in a group should be the same size to maintain visual consistency and usability.

Select boxes use a checkbox to indicate both single- and multi-selection. Don’t use radio buttons for single-selection.

## Behaviors

Minimum and maximum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

Select boxes are used to choose an item from a group. If clicking an item is meant to immediately trigger an action, use an action group instead.

All select boxes in a group should be the same size to maintain visual consistency and usability.

Select boxes use a checkbox to indicate both single- and multi-selection. Don’t use radio buttons for single-selection.

## Usage guidelines

Select boxes are used to choose an item from a group. If clicking an item is meant to immediately trigger an action, use an action group instead.

All select boxes in a group should be the same size to maintain visual consistency and usability.

Select boxes use a checkbox to indicate both single- and multi-selection. Don’t use radio buttons for single-selection.

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

* [Segmented control](/page/segmented-control/)
* [Slider](/page/slider/)
