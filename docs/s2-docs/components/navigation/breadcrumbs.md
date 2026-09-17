---
title: Breadcrumbs
source_url: /web/rsp/components/breadcrumbs
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/breadcrumbs
swc_exists: false
---

# Breadcrumbs

## Anatomy

breadcrumbs truncated menu breadcrumbs item separator breadcrumbs title

## Component options

sizeOverride Overrides the default size of breadcrumb items when isMultiline is enabled. isTruncated When set to true, the breadcrumb item is displayed as an icon only. separator Separators visually divide breadcrumb items and convey hierarchy. items Breadcrumbs can include multiple items, but too many levels can overwhelm users. Limit the hierarchy to four items (including the root, if shown) to provide clear context while keeping truncated options accessible. size Breadcrumbs come in two sizes: medium, and large. The medium size is the default and most frequently used option. isMultiline The multiline variation places emphasis on the selected breadcrumb item as a page title, helping a user to more clearly identify their current

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Overflow

Breadcrumbs truncate when there is not enough room to display all levels of the breadcrumb list, or as a way of managing relevance of the visible breadcrumb items in a deeply nested hierarchy. The truncation of breadcrumb items begins when either there is not enough room to display all items, or if there are 5 or more breadcrumbs to display. The truncation menu displays all options within a breadcrumb. Items are listed with the hierarchy ordered from top (root) to bottom and include the currently selected item.

## Usage guidelines

### Use breadcrumbs to show hierarchy

Breadcrumbs need a consistent hierarchical structure because they create a path for discovery and context for a user’s current location.

### Use breadcrumbs for hierarchical navigation

Breadcrumbs should be a form of navigating a linear hierarchy. They should not be used for any other interactions, such as displaying filters.

### Don't indent menu items

The truncation menu should display all available options within the hierarchy where a user is located — not as indented. Doing this provides context for the directionality of how the menu is being displayed. Adding indentation to the menu items does not add value to understanding the hierarchy, and it can actually decrease the readability of the menu options.

### Don’t wrap breadcrumb list items

When list items are truncated into a menu but the label text is still too large for the horizontal space, truncate the text with an ellipsis. By default, truncation should occur at the end of the title. If your users need to see the end of truncated titles, truncating the middle of the title is acceptable.

### Tooltips

When the breadcrumb title is truncated, a tooltip should display the full title when the user hovers, keyboard focuses, or single-taps on mobile.

### Truncation and overflow

Prioritize using the truncation menu when breadcrumb labels are long. Never truncate more than one breadcrumb label. If the current location has a long label, all items can be truncated into the menu. Truncation should be avoided by way of the breadcrumbs overflow behavior, although in some cases the final breadcrumb title may truncate with an ellipsis.

### Don’t show too many breadcrumbs at once

Be mindful of your user’s cognitive load and truncate breadcrumbs appropriately. Displaying too many levels can be overwhelming. By displaying only 4 items in the hierarchy (including the root item, if you are displaying it), users will quickly understand context while still having easy access to any truncated options. Truncation of breadcrumb items begins when either there is not enough room to display all items, or if there are 5 or more breadcrumbs to display.

### Icons in breadcrumbs

Don't use icons within the labels for breadcrumbs. Since breadcrumb labels are horizontally distributed, icons disrupt the rhythm and readability of the list.

### Don’t modify breadcrumbs for lateral navigation

Breadcrumbs are a way for traveling up a hierarchical navigation and should not be mixed with controls intended for lateral or non-hierarchical navigation.
