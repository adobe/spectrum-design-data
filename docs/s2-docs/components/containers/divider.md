---
title: "Divider"
source_url: https://s2.spectrum.corp.adobe.com/page/divider/
last_updated: 2026-02-02
category: components/containers
component_type: container
status: published
tags:

- components-containers
parent_category: containers

---

# Divider

Dividers group or separate related content to clarify layout. They help establish rhythm, visual hierarchy, and structural boundaries.

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                | Link                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) | [CSS: Divider](https://opensource.adobe.com/spectrum-css/?path=/docs/components-divider--docs)                                        |
| Spectrum Web Components | [SWC: Divider](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/divider--docs\&globals=system:spectrum-two) |
| React Spectrum          | [RSP: Divider](https://react-spectrum.adobe.com/s2/index.html?path=/docs/divider--docs)                                               |

## Anatomy

* divider
  * heading
  * divider
  * description

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                 | Default value | Description |
| ----------- | --------------------- | ------------- | ----------- |
| size        | s / m / l             | s             |             |
| orientation | horizontal / vertical | horizontal    |             |

### orientation

By default, dividers are horizontal and should be used for separating content vertically. The vertical divider is used to separate content horizontally.

### size

The small divider is the default size. This is used to divide similar components such as table rows, action button groups, and components within a panel.

The medium divider is used for dividing subsections on a page, or to separate different groupings of components such as panels, rails, etc.

The large divider should only be used for page titles or section titles.

## States

| State          | Support status |
| -------------- | -------------- |
| Default        | Supported      |
| Hover          | Not supported  |
| Down           | Not supported  |
| Keyboard focus | Not supported  |
| Disabled       | Not supported  |
| Selected       | Not supported  |
| Dragged        | Not supported  |
| Error          | Not supported  |

## Usage guidelines

### Place a divider below a header

Dividers (medium or large) can be used in combination with a header text to create a section or a page title. In such cases, place the divider below the header.

### Don't overuse dividers

Dividers lose their value when overused. Use them sparingly to avoid creating unnecessary noise.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).
