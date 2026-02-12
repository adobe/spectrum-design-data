---
title: "Menu"
source_url: https://s2.spectrum.corp.adobe.com/page/menu/
last_updated: 2026-02-02
category: components/actions
component_type: action
status: published
tags:

- components-actions
- navigation
- menu
- dropdown
  related\_components:
- list-view
- cards
  parent\_category: actions

---

# Menu

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Menu](https://opensource.adobe.com/spectrum-css/?path=/docs/components-menu--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Menu]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/menu--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [Menu](https://react-spectrum.adobe.com/s2/index.html?path=/docs/menu--docs)                                                                                                        |

## Anatomy

```
menu
- popover
- menu section header
- menu section description
- menu items
- icon
- label (required)
- description
- value
- switch
- checkbox
- thumbnail
- drill-in chevron
- link-out icon
- menu section divider
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property       | Value                                           | Default value | Description |
| -------------- | ----------------------------------------------- | ------------- | ----------- |
| container      | popover / tray                                  | –             |             |
| label          | string                                          | –             |             |
| icon           | – – Icon must be present if the label is not    | defined.      |             |
| description    | string                                          | –             |             |
| value          | string                                          | –             |             |
| size           | s / m / l / xl m                                | –             |             |
| selectionMode  | single / multiple / no selection                | –             |             |
| selectionStyle | checkbox / switch                               | –             |             |
| sectionHeader  | string                                          | –             |             |
| isCollapsible  | boolean                                         | false         |             |
| isUnavailable  | boolean                                         | false         |             |
| isDisabled     | boolean                                         | false         |             |
| state          | default / hover / down / keyboard focus default | –             |             |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A disabled menu item indicates that an option exists but isn’t available in the current context. This helps preserve layout consistency and signals that the action might be available later.

An unavailable menu item signals that an option exists but isn’t accessible in the current scenario. This helps ensure the label remains visible and provides context about why the option is unavailable, or directions for how to make it available.

Displays submenus in a collapsed, nested format within the parent menu container. Works with both popover and tray styles. When using a tray, set a fixed height to avoid disorienting shifts when items expand or collapse.

Use a section header when a menu section requires a label or descriptor. Section headers are helpful when two or more sections differ in function or context, making it easier for users to understand the structure.

When the selection option is enabled, the selection can be displayed using checkmarks, checkboxes or switches. Switches are more commonly used on mobile.

A menu section has the options of single selection, multiple selection, or having no selection. By default, menu items have no selection, and perform an action on press.

For single selection menu sections, menu items show a single checkmark to indicate the selected item. Multiple selection menu sections can display checkboxes or switches beside each menu item.

"Menus come in four different sizes: small, medium, large, and extra-large. Medium is the default and most commonly used. Menu sizes should correspond to the size of the menu trigger component (like an action button), and any embedded components (like switches) should follow suit."

Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

A menu item can display a related value in the value area. Examples of values include the selected option from a submenu, a keyboard shortcut for the action, or other content that clarifies the menu item.

Menu items can include description text to provide extra clarity beyond the label. Descriptions help users understand the action and make informed choices.

Avoid cluttering items with repetitive details or promotional content.

Menu items can include icons, but only when they add meaningful context — not just for decoration. Use icons when they have a strong, recognizable association with the label (like tool switching in a toolbar).

A menu item must include a label that clearly communicates the action or option it represents.

On desktop, menus are shown in a popover by default. On mobile, popovers can be used when appropriate. Submenus cascade in a separate popover by default.

When a menu item includes a submenu, a drill-in chevron appears at the end of the item to indicate that additional options are available.

When a menu item leads to a different context, such as a new page or dialog, a link-out icon appears at the end of the item to indicate that the user will navigate away from the current view.

When a menu is displayed within popovers, a submenu will appear adjacent to the parent menu item in a separate popover. The submenu popover is aligned with an offset to horizontally overlap the parent menu and vertically align the first submenu item with the parent menu item.

When a menu is shown in a popover, any submenu appears in a separate popover next to the parent item. The submenu popover is positioned to overlap the parent menu horizontally, with vertical alignment that matches the first submenu item to its parent.

When a menu is shown in a tray, selecting a parent item with a submenu replaces the tray’s content with the submenu. A back button labeled with the parent item’s title appears at the top of the tray to let users return to the previous menu level.

A menu item can be navigated using a keyboard. The keyboard focus state takes the menu item’s visual hover state and adds a focus ring around the item.

When a menu item’s label or description are too long for the available horizontal space, they wrap to form another line.

Dividers appear between sections when two or more sections are used within the same menu.

In Windows high contrast mode, menu items should display with default text color. Selected items should have the background and text colors defined for selected text.

Menus should be sized according to the component being used as the menu trigger. All submenus within the menu should also be using the same size as the menu trigger.

Following Adobe’s UX writing style, write menu items in sentence case unless they contain words that are branded terms.

Don’t end a menu command with an ellipsis (…) unless it requires additional input to complete the action, typically in a dialog.

## States

When a menu item includes a submenu, a drill-in chevron appears at the end of the item to indicate that additional options are available.

When a menu item’s label or description are too long for the available horizontal space, they wrap to form another line.

Dividers appear between sections when two or more sections are used within the same menu.

Following Adobe’s UX writing style, write menu items in sentence case unless they contain words that are branded terms.

Don’t end a menu command with an ellipsis (…) unless it requires additional input to complete the action, typically in a dialog.

## Behaviors

When a menu item includes a submenu, a drill-in chevron appears at the end of the item to indicate that additional options are available.

When a menu item’s label or description are too long for the available horizontal space, they wrap to form another line.

Dividers appear between sections when two or more sections are used within the same menu.

Following Adobe’s UX writing style, write menu items in sentence case unless they contain words that are branded terms.

Don’t end a menu command with an ellipsis (…) unless it requires additional input to complete the action, typically in a dialog.

## Usage guidelines

Following Adobe’s UX writing style, write menu items in sentence case unless they contain words that are branded terms.

Don’t end a menu command with an ellipsis (…) unless it requires additional input to complete the action, typically in a dialog.

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

* [List view](/page/list-view/)
* [Cards](/page/cards/)
