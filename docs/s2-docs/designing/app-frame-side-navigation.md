---
title: "App frame side navigation (browsing context)"
source_url: https://s2.spectrum.corp.adobe.com/page/app-frame-side-navigation/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
  related\_components:
- s2-app-frame-header-browsing-context
- s2-app-frame-content-area-browsing-context

---

# App frame side navigation (browsing context)

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum Web Components UEC: | [Sidenav](https://git.corp.adobe.com/pages/Spectrum/unified-experience-components/main/storybook/index.html?path=/story/labs-sidenav--default\&globals=system:spectrum-two) |

## Anatomy

```
Property Value Default value Description
Property Value Default value Description
minimized boolean false If the side navigation can be minimized, the app frame side navigation control must be present.
minimizedStyle partial / full partial Use a partial style when users still need access to navigation items when the navigation is minimized. The panel supports expanded and partially minimized, or expanded and fully minimized states, not all three.
hasCreateButton boolean false This is an instance of the button component specific to only app frame.
isResizable boolean false Resizing is primarily useful when there is user-generated content in the side navigation. Otherwise, the default expanded and minimized states are sufficient.
dragToMinimize boolean false -
minWidth (expanded) number 160px If drag to collapse is enabled, this is the minimum width at which the side navigation will be minimized.
defaultWdth (expanded) auto / number auto The default panel width should auto-adjust to the longest string in the navigation in order to accommodate all translations.
Property Value Default value Description
Property Value Default value Description
icon icon - An icon is required in order to identify the side navigation item for the first level.
label text - A label is required and is also used as the accessible name.
hideLabel boolean false If the label is hidden, the label will appear in the tooltip on hover. If the side navigation panel supports behavior to minimize and expand, it will override this option.
labelTruncation one line / two lines / none two lines The default value works for most cases based on Spectrum's recommended string length in English (in U.S. English, which is the source locale). However, this should be validated on a case-by-case basis, depending on the label. In general, labels should not be so long that they require truncation.
isSelected boolean false Selected items have a different visual style (inverted) in order to sufficiently differentiate from items that are not selected.
isDisabled boolean false Individual side navigation items can be disabled.
Property Value Default value Description
Property Value Default value Description
label text Show menu labels / Hide menu labels The label (optional) should be the same as the accessible name (required).
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property        | Value                                                                                                                  | Default value | Description                                                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| minimized       | boolean                                                                                                                | false         | If the side navigation can be minimized, the app frame side navigation control must be present.                                                                                                                                                                                                      |
| minimizedStyle  | partial / full partial                                                                                                 | Use           | a partial style when users still need access to navigation items when the navigation is minimized. The panel supports expanded and partially minimized, or expanded and fully minimized states, not all three.                                                                                       |
| hasCreateButton | boolean                                                                                                                | false         | This is an instance of the button component specific to only app frame.                                                                                                                                                                                                                              |
| isResizable     | boolean                                                                                                                | false         | Resizing is primarily useful when there is user-generated content in the side navigation. Otherwise, the default expanded and minimized states are sufficient.                                                                                                                                       |
| dragToMinimize  | boolean                                                                                                                | false         | -                                                                                                                                                                                                                                                                                                    |
| minWidth        | (expanded) number 160px If drag to collapse is enabled, this is the minimum width at which the side navigation will be | minimized.    |                                                                                                                                                                                                                                                                                                      |
| defaultWdth     | (expanded) auto / number auto                                                                                          | The           | default panel width should auto-adjust to the longest string in the navigation in order to accommodate all translations.                                                                                                                                                                             |
| icon            | icon - An icon is required in order to identify the side navigation item for the first                                 | level.        |                                                                                                                                                                                                                                                                                                      |
| label           | text - A label is required and is also used as the accessible                                                          | name.         |                                                                                                                                                                                                                                                                                                      |
| hideLabel       | boolean                                                                                                                | false         | If the label is hidden, the label will appear in the tooltip on hover. If the side navigation panel supports behavior to minimize and expand, it will override this option.                                                                                                                          |
| labelTruncation | one line / two lines / none two lines                                                                                  | The           | default value works for most cases based on Spectrum's recommended string length in English (in U.S. English, which is the source locale). However, this should be validated on a case-by-case basis, depending on the label. In general, labels should not be so long that they require truncation. |
| isSelected      | boolean                                                                                                                | false         | Selected items have a different visual style (inverted) in order to sufficiently differentiate from items that are not selected.                                                                                                                                                                     |
| isDisabled      | boolean                                                                                                                | false         | Individual side navigation items can be disabled.                                                                                                                                                                                                                                                    |
| label           | text                                                                                                                   | Show          | menu labels / Hide menu labels The label (optional) should be the same as the accessible name (required).                                                                                                                                                                                            |

## External links

The side navigation is always used in partnership with the header, and never instead of it. When used, the side navigation holds the main categories of product functionality, such as workflow-related navigational items (e.g., Home, Files, Learn, Dashboards). Don’t use this for categorizing marketing pages.

"Side navigation consists of a few parts:"

Additionally, this button should not be used outside of the app frame context. It has unique animations between expanding and collapsing that are optimized for the app frame side navigation panel.

Allows the side navigation to be minimized by the user.

The partial style displays icon-only side navigation items when minimized. The full style hides the side navigation when minimized.

Shows a create button at the top of the panel.

Enables drag on the side navigation.

"If the side navigation panel can be minimized (Can be minimized: true), dragging to the min width (expanded) will collapse the side navigation into the minimized state."

The minimum width that the side navigation panel can be adjusted to.

The default width that the side navigation panel appears in.

The text that is displayed as the label of the app frame side navigation item, to supplement the icon.

Hides the label, making the app frame side navigation item icon-only.

The number of lines that is shown before the label is truncated.

After the user clicks on an app frame side navigation item, the left visual bar will turn gray-800, text will bold, and color will change to content-neutral.

Changes the side navigation item to the disabled state.

The text that is displayed as the label of the tooltip.

"Use the overlay variant of the app frame: side navigation (browsing) component for smaller breakpoints. The overlay is triggered via the hamburger menu in the header (rather than a touchpoint at the bottom)."

Although 768 px is the recommended breakpoint to begin displaying the overlay designs, each product team should determine which breakpoint best suits their needs.

The divider at the bottom of the side navigation is an intentional visual element that separates overflow side navigation items and end section items from the state control icon.

The end section is optional and used to contain navigation items in a separate category that is secondary to the main navigation items. Categories, when defined, should readily communicate a clear purpose and be meaningful to users. Items placed here sit on a separate area. When resized to a smaller height, the items should append onto the start section and scroll together.

"The minimum width is customizable, depending on the number of levels:"

If the side navigation contains user-generated content (like shortcuts to folders and files), enabling resizing can be a good way to improve usability by respecting user content, without needing to predict the length of labels that users might input.

Along with being descriptive, the labels of navigation items should be succinct. Keep navigation strings to 1 or 2 and no more than 3 concise words (in U.S. English, which is the source locale). Reduce any unnecessary words in order to ensure simplicity.

Navigation items should never be so long that they require truncation, except in instances where navigation is user-generated (e.g., folder and file names).

If possible, the default width should auto-adjust to the longest string in the navigation in order to accommodate all translations. As a last resort for long strings, specific line breaks can be built into the implementation. These line breaks depend on the content, and requires manual handling by Globalization engineers.

When navigation items are shown in both the side navigation and header at the same time, the hierarchy and relationships between them become unclear. If the side navigation is used, don’t put any navigation items in the header.

Supporting multiple states (default, and partial or fully minimized style) provides users with the option to choose their preferred layout based on their own preferences. In user studies, individual preference is the biggest factor when it comes to whether or not people want to view labels by default.

If supporting multiple states, consider showing the side navigation in the expanded state by default, and preserve user preferences across pages and sessions. If minimizing the side navigation is not supported, show the side navigation in the expanded state. Showing labels by default increases recognition and familiarity.

There are some app frame-specific constraints for the side navigation. Icons are required at the parent level. Nested items can have no icon, but the parent level must have an icon.

"Diagram describing notes about the side navigation for the app frame, in the editing context. While toolbars share the same location as the app frame side navigation in a browsing context, toolbars in an editing context serve a different purpose: to readily select commonly used tools, rather than to navigate between pages. The behavior and interaction of toolbars doesn’t need to mirror the side navigation and should instead best serve user needs in an editing context. For example, the option to show and hide tool labels can be an additional customization option and doesn’t need to be controlled by the hamburger menu, which is used to display the application menu in Creative Cloud."

## States

"The minimum width is customizable, depending on the number of levels:"

## Behaviors

"The minimum width is customizable, depending on the number of levels:"

## Usage guidelines

## Accessibility

## Notes on the editing context

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date              | Number | Notes                                                                                                                                                                                                                           |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| November 19, 2025 | 2.0.0  | Images converted to light mode. Updated guidance to match latest design decisions. Added new sections specific to side navigation: • Mobile overlay guidance • End section divider • Minimum width • Component options • States |
| February 10, 2025 | 1.1.0  | -                                                                                                                                                                                                                               |
| December 10, 2024 | 1.0.0  | This framework was added to the Spectrum 2 guidelines site.                                                                                                                                                                     |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Browsing context: Header](/page/s2-app-frame-header-browsing-context/)
* [Browsing context: Content area](/page/s2-app-frame-content-area-browsing-context/)
