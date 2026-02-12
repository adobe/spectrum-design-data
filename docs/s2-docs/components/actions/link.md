---

title: "Link"
source\_url: <https://s2.spectrum.corp.adobe.com/page/link/>
last\_updated: 2026-02-02
category: components/actions
component\_type: action
status: published
tags:

* components-actions
  related\_components:
* close-button
* list-view
  parent\_category: actions

---

# Link

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Link](https://opensource.adobe.com/spectrum-css/?path=/docs/components-link--docs) |
| Spectrum Web Components SWC: | [Link](https://opensource.adobe.com/spectrum-css/?path=/docs/components-link--docs) |
| React Spectrum RSP:          | [Link](https://react-spectrum.adobe.com/s2/index.html?path=/docs/link--docs)        |

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                           | Default value | Description                                                             |
| ----------- | ----------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| variant     | primary / secondary primary                     | –             |                                                                         |
| isQuiet     | boolean                                         | false         |                                                                         |
| staticColor | white / black                                   | –             | Static color must not be set for the default version of this component. |
| state       | default / hover / down / keyboard focus default | –             |                                                                         |

## External links

Links provide navigation to a different location. They can appear within a paragraph or as standalone text.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Use the static color option when a link needs to be placed on top of a color background or visual. Static color links are available in black or white, regardless of color theme. They can also be placed on top of a custom background that isn’t part of a Spectrum color theme.

Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of color theme. Make sure that the background and the link color meet the minimum color contrast ratio.

All links can have a quiet style, without an underline. This style should only be used when the placement and context of the link is explicit enough that a visible underline isn’t necessary.

"The variant property defines the visual style of a link and includes two options: primary and secondary."

The primary variant is the default style and displays the link in Spectrum blue. It is intended to draw attention to the link and is suitable when the blue color complements the surrounding content without being overwhelming.

The secondary variant uses the same gray color as the surrounding paragraph text. Its subdued appearance is ideal for scenarios where multiple links are present in a block of text and the primary variant would be too visually dominant.

Links are for usage in body copy and are not appropriate in titles. Consider using a different component if you're looking for a larger or more prominent call to action, such as a button.

Be mindful of link placement and language, and create experiences that are inclusive of users navigating with screen readers. Screen readers pull a list of links — only the link text, and not including other surrounding language — to determine the content of the page.

People using screen readers may tab between links without getting the text in between, so very generic link wording like “learn more” or “click here” doesn’t communicate any context from elsewhere in the experience. Identify the target of each link directly in the link text to communicate context and set clear expectations about where the link will go.

Quiet links are less accessible, so don't use them for links that are critical to an experience. Quiet links are commonly used in website footers, where there are several lists of links that are shortcuts to other pages.

## States

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

* [Close button](/page/close-button/)
* [List view](/page/list-view/)
