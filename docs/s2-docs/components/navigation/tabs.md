---

title: "Tabs"
source\_url: <https://s2.spectrum.corp.adobe.com/page/tabs/>
last\_updated: 2026-02-02
category: components/navigation
component\_type: navigation
status: published
tags:

* components-navigation
  related\_components:
* side-navigation
* tree-view
  parent\_category: navigation

---

# Tabs

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Tabs](https://opensource.adobe.com/spectrum-css/?path=/docs/components-tabs--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Tabs]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/tabs--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Tabs](https://react-spectrum.adobe.com/s2/index.html?path=/docs/tabs--docs)                                                                                                        |

## Anatomy

```
tabs
- tab item (selected)
- tab item
- selection indicator
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                            | Default value | Description |
| ----------- | -------------------------------- | ------------- | ----------- |
| orientation | horizontal / vertical horizontal | –             |             |
| items       | array – An array of tab          | items.        |             |

## External links

Tabs organize related content into multiple sections. They allow navigation between views while keeping the content grouped under a single context. Use when content can be divided logically into categories within the same view.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Tabs can be horizontal or vertical. By default, tabs are horizontal and should be used when horizontal space is limited.

Use vertical tabs when horizontal space is more generous or when the list of sections is too long for a horizontal layout. Vertical tabs can also serve as anchor links, providing shortcuts to sections on a single page. In this case, tab items link to on-page anchors rather than opening a new tab view.

When a user selects a tab item, the selection indicator slides along the base to the newly selected tab. The text and icon colors of both tabs fade during the transition. The tab view changes immediately upon selection.

When there are too many tabs to fit horizontally across the viewport, display the tabs component as a quiet picker. When appropriate, you can also use alternative overflow methods such as horizontal scrolling.

When there are too many tabs to fit horizontally across the viewport, you can either allow horizontal scrolling or place all tab items in a quiet picker. Do not truncate multiple tab items just to make them fit horizontally.

Use tabs to organize sections of equal importance. Groups of content under each tab item should not be of different natures. Don't use tabs to replace a flow; use pagination components instead.

Avoid using multiple levels of tabs. Instead, consider other organizational patterns such as side navigation, accordions or collapsible panels. Nesting tabs is acceptable only when there is a clear separation between the two tab experiences or when different orientations are used.

Do not compromise hierarchy by using the same tab variations or orientations.

Don’t mix the use of icons in tabs. Navigation controls require a clear spacial relationship to one another, and mixing the use of icons can dramatically impact the visual balance and presence for each tab item. Keep in mind that if one tab item has an icon, then they all should have an icon.

It can often be hard to identify the meaning of icon-only tabs. An icon-only tab should always show a tooltip displaying the label on hover.

## States

Do not compromise hierarchy by using the same tab variations or orientations.

It can often be hard to identify the meaning of icon-only tabs. An icon-only tab should always show a tooltip displaying the label on hover.

## Behaviors

Do not compromise hierarchy by using the same tab variations or orientations.

It can often be hard to identify the meaning of icon-only tabs. An icon-only tab should always show a tooltip displaying the label on hover.

## Usage guidelines

Do not compromise hierarchy by using the same tab variations or orientations.

It can often be hard to identify the meaning of icon-only tabs. An icon-only tab should always show a tooltip displaying the label on hover.

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

* [Side navigation](/page/side-navigation/)
* [Tree view](/page/tree-view/)
