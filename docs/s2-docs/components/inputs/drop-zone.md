---
title: "Drop zone"
source_url: https://s2.spectrum.corp.adobe.com/page/drop-zone/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- date-picker
- field-label
parent_category: inputs

---

# Drop zone

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Drop | [zone](https://opensource.adobe.com/spectrum-css/?path=/docs/components-drop-zone--docs)                                           |
| Spectrum Web Components SWC:      | [Dropzone](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/dropzone--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:               | [DropZone](https://react-spectrum.adobe.com/s2/index.html?path=/docs/dropzone--docs)                                               |

## Anatomy

```
drop zone
- illustration
- title
- body
- button (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value       | Default value | Description                                                           |
| ----------- | ----------- | ------------- | --------------------------------------------------------------------- |
| accept      | array       | –             |                                                                       |
| size        | s / m / l m | –             |                                                                       |
| actionLabel | string      | –             | If undefined, this button does not appear.                            |
| onDrop      | string      | –             | Callback function called when files are dropped onto the drop zone.   |
| onDragOver  | string      | –             | Callback function called when a file is dragged over the drop zone.   |
| onDragLeave | string      | –             | Callback function called when a file is dragged out of the drop zone. |

## External links

Drop zones accept dragged and dropped objects. They support upload and file management workflows, and are commonly used to move or add content within an interface.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A button is an optional element to prompt the user to take action.

"Drop zones come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option."

Indicate to users the accepted file types to let users know what they can upload before interacting. This can be done through helper text or placeholder content.

When a file is dragged over or dropped into the zone, provide the user with visual feedback such as highlighting the border or changing the background, to confirm the interaction is recognized.

Visual styling that indicates a user can replace file types within a dropzone should clearly communicate interactivity and the potential for change without disrupting the overall layout. This is typically achieved through subtle but intuitive cues such as displaying a button over the drop zone area informing the user that they may replace their content type.

## States

## Behaviors

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

* [Date picker](/page/date-picker/)
* [Field label](/page/field-label/)
