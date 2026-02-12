---
title: "Tag field"
source_url: https://s2.spectrum.corp.adobe.com/page/tag-field/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
- input
- form
related_components:
- tag
- tag-group
parent_category: inputs

---

# Tag field

## Resources

### Design

* **Figma**: S2 Web

## Anatomy

```
tag field
- field label
- text area
- tag
- avatar (optional)
- label (required)
- close button (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                                                        | Default value | Description |
| ---------- | ---------------------------------------------------------------------------- | ------------- | ----------- |
| size       | s / m / l m                                                                  | –             |             |
| state      | default / hover / focus + hover / focus + not hover / keyboard focus default | –             |             |
| style      | keyword / icon / thumbnail / avatar keyword                                  | –             |             |
| isDisabled | boolean                                                                      | false         |             |
| hideLabel  | boolean                                                                      | false         |             |

## External links

Tag field is an input component for adding and editing multiple tags. It includes standard field label and error options, and is used to capture grouped keywords or descriptors. Tags can be added directly in the field and displayed inline for editing or removal.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

The label of the tag field can be hidden if the context for the tags is sufficient without the title — for example, when the page title or section title applies to the group of tags.

A tag field in a disabled state indicates that it exists but is not available in that context. This state helps maintain layout continuity and signals that tagging may become available later.

Tag groups within a tag field can include a keyword, icon, thumbnail or avatar. Icons, thumbnails and avatars should also include a keyword.

"Tag fields come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

A flyout/menu appears when the user starts typing to suggest tags that are supported or have already been entered previously.

Sometimes tag field can be additive, meaning new tags may be added from this particular tag field. They can also be restricted to only allowing tags that already exist in the system

When there are more tags than fit in the horizontal space, tags wrap to another line.

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

If there is space in an experience for the field to grow with the tags, such as at the bottom of a page or dialog, you can use the multi-line option.

If the tag field is located at the top of a header or otherwise constrained space, it is better to use a non-multi-line tag field.

The default option should be a standard text field with tags displayed below it. You may use a tag field if space is limited, especially when using a single-line tag field. This allows all fields to stay contained within a defined area.

## States

A flyout/menu appears when the user starts typing to suggest tags that are supported or have already been entered previously.

When there are more tags than fit in the horizontal space, tags wrap to another line.

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

If there is space in an experience for the field to grow with the tags, such as at the bottom of a page or dialog, you can use the multi-line option.

If the tag field is located at the top of a header or otherwise constrained space, it is better to use a non-multi-line tag field.

## Behaviors

A flyout/menu appears when the user starts typing to suggest tags that are supported or have already been entered previously.

When there are more tags than fit in the horizontal space, tags wrap to another line.

If the order of tags within the group matters, the user must be able to click or use keyboard focus between tags to add more.

If there is space in an experience for the field to grow with the tags, such as at the bottom of a page or dialog, you can use the multi-line option.

If the tag field is located at the top of a header or otherwise constrained space, it is better to use a non-multi-line tag field.

## Usage guidelines

If there is space in an experience for the field to grow with the tags, such as at the bottom of a page or dialog, you can use the multi-line option.

If the tag field is located at the top of a header or otherwise constrained space, it is better to use a non-multi-line tag field.

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

* [Tag](/page/tag/)
* [Tag group](/page/tag-group/)
