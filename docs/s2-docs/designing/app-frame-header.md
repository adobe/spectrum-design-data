---
title: "App frame header (browsing context)"
source_url: https://s2.spectrum.corp.adobe.com/page/app-frame-header/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
related_components:
- s2-app-frame
- s2-app-frame-side-navigation-browsing-context

---

# App frame header (browsing context)

## Resources

### Design

* **Figma**: S2 Web

## Anatomy

```
Property Value Default value Description
Property Value Default value Description
hasSideNavigationStateControl boolean false This is required when the side navigation is draggable for accessibility.
hasNavigationItems boolean false If a side nav is present, there should be no navigation items in the header.
hasSearch boolean false -
searchStyle default / minimized default Search can be shown in the default style (expanded) or minimized when there isn't enough space.
hasSkipToMainContentButton boolean false If using this, it appears only on keyboard focus, as the first item in the focus order.
Property Value Default value Description
Property Value Default value Description
hasIcon boolean false -
icon icon - -
label text - A label is required and is also used as the accessible name.
isSelected boolean false Selected items have a different visual style (inverted) in order to sufficiently differentiate from items that are not selected.
isDisabled boolean false Individual header navigation items can be disabled.
hasPopover boolean false Instead of clicking to select the item, a popover is shown instead with additional navigation items.
Property Value Default value Description
Property Value Default value Description
label text Show menu labels / Hide menu labels The label (optional) should be the same as the accessible name (required).
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property                      | Value                                                         | Default value | Description                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| hasSideNavigationStateControl | boolean                                                       | false         | This is required when the side navigation is draggable for accessibility.                                                        |
| hasNavigationItems            | boolean                                                       | false         | If a side nav is present, there should be no navigation items in the header.                                                     |
| hasSearch                     | boolean                                                       | false         | -                                                                                                                                |
| searchStyle                   | default / minimized default                                   | Search        | can be shown in the default style (expanded) or minimized when there isn't enough space.                                         |
| hasSkipToMainContentButton    | boolean                                                       | false         | If using this, it appears only on keyboard focus, as the first item in the focus order.                                          |
| hasIcon                       | boolean                                                       | false         | -                                                                                                                                |
| icon                          | icon -                                                        | -             |                                                                                                                                  |
| label                         | text - A label is required and is also used as the accessible | name.         |                                                                                                                                  |
| isSelected                    | boolean                                                       | false         | Selected items have a different visual style (inverted) in order to sufficiently differentiate from items that are not selected. |
| isDisabled                    | boolean                                                       | false         | Individual header navigation items can be disabled.                                                                              |
| hasPopover                    | boolean                                                       | false         | Instead of clicking to select the item, a popover is shown instead with additional navigation items.                             |
| label                         | text                                                          | Show          | menu labels / Hide menu labels The label (optional) should be the same as the accessible name (required).                        |

## External links

"There are several parts of the header that are consistent across all Adobe products:"

Shows a hamburger button on the far left of the header. This controls whether the minimized style of the side navigation (partial/full).

Shows navigation items in the header.

Shows a search option in the header.

Defines the style of the search option that's shown.

The “skip to main content” button helps improve keyboard navigation by creating a shortcut to the main content of the page. This button is an accessibility feature to allow skipping to the first navigable HTML item.

Shows an icon to represent the header navigation item.

The text that is displayed as the label of the header navigation item.

The text that is displayed as the label of the header navigation item.

Presents the header side navigation as selected or not selected.

Changes the header navigation item to the disabled state.

Shows a chevron next to the label that indicates an additional menu.

The text that is displayed as the label of the tooltip.

As a general rule, only use one call-to-action (CTA) button, aside from any buttons used to log in or log out, as defined in the universal nav. When too many CTAs are shown at once, the messages compete for attention and dilute the ability for a focused attention hierarchy.

If there are multiple actions, consider combining them into a single menu or use other button types. The button should represent the most important CTA across the product; for example, “Share” and “Get desktop app” are common CTAs.

Diagram with notes about the app frame header in the editing context. If there’s a menu represented by a hamburger icon, such as the application menu in Creative Cloud, it should be shown to the left of the product logo for continuity with the browsing context. The product name can be hidden in the editing context in order to provide more room for other actions. The height of the header should be the same as in the browsing context (56 px).

## States

## Usage guidelines

## Accessibility

## Notes on the editing context

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date              | Number | Notes                                                                                                                                                  |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| November 19, 2025 | 2.0.0  | Images converted to light mode. Updated guidance to match latest design decisions. Added new sections specific to header: • Component options • States |
| February 10, 2025 | 1.1.0  | Updated side navigation state control to behave as a button, and use the same icon (hamburger menu) for all side navigation states.                    |
| December 10, 2024 | 1.0.0  | This framework was added to the Spectrum 2 guidelines site.                                                                                            |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [App frame](/page/s2-app-frame/)
* [Browsing context: Side navigation](/page/s2-app-frame-side-navigation-browsing-context/)
