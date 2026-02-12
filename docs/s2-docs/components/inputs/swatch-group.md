---
title: "Swatch group"
source_url: https://s2.spectrum.corp.adobe.com/page/swatch-group/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
  related\_components:
- swatch
- switch
  parent\_category: inputs

---

# Swatch group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                            | Link                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Spectrum CSS (archived) CSS: Swatch | [group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-swatch-group--docs)           |
| Spectrum Web Components SWC: Swatch | [group](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/swatch-group--docs) |
| React Spectrum RSP:                 | [ColorSwatchPicker](https://react-spectrum.adobe.com/s2/index.html?path=/docs/colorswatchpicker--docs) |

## Anatomy

```
swatch group
- swatch
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property             | Value                                | Default value | Description                                                                        |
| -------------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| size                 | xs / s / m / l m                     | –             |                                                                                    |
| density              | compact / regular / spacious regular | –             |                                                                                    |
| enableSelection      | boolean                              | false         |                                                                                    |
| selectionMode        | single / multiple single             | Only          | applicable if selection is enabled.                                                |
| allowsEmptySelection | boolean                              | false         | Only applicable if selection is enabled.                                           |
| cornerRadius         | none / full / partial none           | Determines    | the corner radius of each swatch in the group. Partial refers to corner-radius-75. |

## External links

Swatch groups organize related swatches into a single container. They’re used to display collections of colors, gradients, textures, or materials for comparison or selection.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

"Swatch groups come in 3 densities: regular (default), compact, and spacious. Compact and spacious densities retain the same swatch size as regular density but have less or more padding between each swatch, respectively."

By default, selection is not enabled in a swatch group. Selection can be enabled for a swatch group to allow for toggling. This is often used inside of swatch panels.

When selection is enabled, a swatch group can allow for either single or multiple selection of swatches. This is often used inside of swatch panels to allow for bulk operations, such as deleting multiple swatches at once.

It’s important for users to compare colors when they’re displayed in a swatch group. Because of this, swatches within a swatch group with low contrast (below 3:1 contrast with the background) have a less prominent border compared to the swatch component when used by itself. This reduces the likelihood of the UI interfering with color perception and comparisons.

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

* [Swatch](/page/swatch/)
* [Switch](/page/switch/)
