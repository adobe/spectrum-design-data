---

title: "Tag"
source\_url: <https://s2.spectrum.corp.adobe.com/page/tag/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
  related\_components:
* switch
* tag-field
  parent\_category: inputs

---

# Tag

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Tag](https://opensource.adobe.com/spectrum-css/?path=/docs/components-tag--docs)                                                                                                   |
| Spectrum Web Components SWC: | \[Tags]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/tags--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [TagGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/taggroup--docs)                                                                                                |

## Anatomy

```
tag
- avatar (optional)
- label (required)
- close button (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                           | Default value | Description |
| ----------- | ----------------------------------------------- | ------------- | ----------- |
| label       | string                                          | –             |             |
| hasAvatar   | boolean                                         | false         |             |
| isRemovable | boolean                                         | false         |             |
| isError     | boolean                                         | false         |             |
| isDisabled  | boolean                                         | false         |             |
| isReadOnly  | boolean                                         | false         |             |
| state       | default / hover / down / keyboard focus default | –             |             |

## External links

Tags categorize content such as keywords or names. They’re often grouped to represent a search query or describe an item.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Tags should always include a label. These can represent search terms, filters, or keywords.

Tags have the option to include an avatar in addition to the label. These should be used to represent entities.

Tags have the option to be removable or not. Removable tags have a small close (“x”) button.

A tag can be marked as having an error to show that it has become invalid.

A tag in a disabled state shows that a tag exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that a tag may become available later.

Tags have a read-only option for when content in the disabled state still needs to be shown. This allows for content to be copied, but not interacted with or changed.

When the tag text is too long for the available horizontal space or when a tag reaches its maximum width, it truncates. Hovering over the tag shows a tooltip with the full text.

A tag can either trigger navigation or filtering, or act as a dismissible chip. Combining both interactions disrupts focus order and accessibility states. Choose one behavior — navigation or dismissal — and apply it consistently.

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

* [Switch](/page/switch/)
* [Tag field](/page/tag-field/)
