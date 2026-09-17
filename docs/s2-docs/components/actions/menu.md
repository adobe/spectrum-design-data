---
title: Menu
source_url: /web/rsp/components/menu
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/menu
swc_exists: false
---

# Menu

## Anatomy

menu popover menu section header menu section description menu items icon label (required) description value switch checkbox thumbnail drill-in chevron link-out icon menu section divider

## Component options

isDisabled A disabled menu item indicates that an option exists but isn't available in the current context. This helps preserve layout consistency and signals that the action might be available later. isUnavailable An unavailable menu item signals that an option exists but isn't accessible in the current scenario. This helps ensure the label remains visible and provides context about why the option is unavailable, or directions for how to make it available. isCollapsible Displays submenus in a collapsed, nested format within the parent menu container. Works with both popover and tray styles. When using a tray, set a fixed height to avoid disorienting shifts when items expand or collapse. sectionHeader Use a section header when a menu section requires a label or descriptor. Section headers are helpful when two or more sections differ in function or context, making it easier for users to understand the structure. selectionStyle When the selection option is enabled, the selection can be displayed using checkmarks, checkboxes or switches. Switches are more commonly used on mobile. selectionMode A menu section has the options of single selection, multiple selection, or having no selection. By default, menu items have no selection, and perform an action on press. For single selection menu sections, menu items show a single checkmark to indicate the selected item. Multiple selection menu sections can display checkboxes or switches beside each menu item. size Menus come in four different sizes: small, medium, large, and extra-large. Medium is the default and most commonly used. Menu sizes should correspond to the size of the menu trigger component (like an action button), and any embedded components (like switches) should follow suit. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. value A menu item can display a related value in the value area. Examples of values include the selected option from a submenu, a keyboard shortcut for the action, or other content that clarifies the menu item. description Menu items can include description text to provide extra clarity beyond the label. Descriptions help users understand the action and make informed choices. Avoid cluttering items with repetitive details or promotional content. icon Menu items can include icons, but only when they add meaningful context — not just for decoration. Use icons when they have a strong, recognizable association with the label (like tool switching in a toolbar). label A menu item must include a label that clearly communicates the action or option it represents. container On desktop, menus are shown in a popover by default. On mobile, popovers can be used when appropriate. Submenus cascade in a separate popover by default.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Drill-in chevron

When a menu item includes a submenu, a drill-in chevron appears at the end of the item to indicate that additional options are available.

### Link-out icon

When a menu item leads to a different context, such as a new page or dialog, a link-out icon appears at the end of the item to indicate that the user will navigate away from the current view.

### Popover submenus

When a menu is displayed within popovers, a submenu will appear adjacent to the parent menu item in a separate popover. The submenu popover is aligned with an offset to horizontally overlap the parent menu and vertically align the first submenu item with the parent menu item. When a menu is shown in a popover, any submenu appears in a separate popover next to the parent item. The submenu popover is positioned to overlap the parent menu horizontally, with vertical alignment that matches the first submenu item to its parent.

### Tray submenus

When a menu is shown in a tray, selecting a parent item with a submenu replaces the tray's content with the submenu. A back button labeled with the parent item's title appears at the top of the tray to let users return to the previous menu level.

### Keyboard focus

A menu item can be navigated using a keyboard. The keyboard focus state takes the menu item's visual hover state and adds a focus ring around the item.

### Text overflow

When a menu item's label or description are too long for the available horizontal space, they wrap to form another line.

### Section dividers

Dividers appear between sections when two or more sections are used within the same menu.

### Windows high contrast mode

In Windows high contrast mode, menu items should display with default text color. Selected items should have the background and text colors defined for selected text.

## Usage guidelines

### Use consistent sizing

Menus should be sized according to the component being used as the menu trigger. All submenus within the menu should also be using the same size as the menu trigger.

### Use sentence case for menu items

Following Adobe's UX writing style, write menu items in sentence case unless they contain words that are branded terms.

### Ellipses in menu commands

Don't end a menu command with an ellipsis (…) unless it requires additional input to complete the action, typically in a dialog.

## Content standards

### Use sentence case for menu items

Following Adobe's UX writing style, write menu items in sentence case unless they contain words that are branded terms.

### Ellipses in menu commands

Don't end a menu command with an ellipsis (…) unless it requires additional input to complete the action, typically in a dialog.

### Using descriptions in menu items

Only use descriptions in menu items when the information will help a user to decide which action to take from the menu. Don't overload menu items with repetitive information or with promotional calls-to-action.

## Internationalization

### RTL

For RTL (right-to-left) languages, the entire menu is mirrored horizontally, including the direction of the drill-in chevron and popover placement for submenus.

## Accessibility

### Keyboard interactions

Key Interaction Enter or SpaceOpens menu and moves focus to first item.Down Arrow (on trigger)Opens menu and moves focus to first item.Up Arrow (on trigger, optional)Opens menu and moves focus to last item.Up Arrow / Down Arrow (in menu)Moves focus to previous/next item at the current menu level (wrapping behavior may be implementation-defined).Right Arrow / Left ArrowIn submenu hierarchies: opens child submenu or returns to parent menu item (direction follows hierarchy and orientation).Home / EndMoves focus to first/last item in current menu level.Printable character keysMoves focus to the next item whose label begins with typed character(s) (typeahead).Enter or Space (on item)Activates item. For checkbox/radio/switch items, may toggle state and optionally keep menu open based on selection behavior.EscCloses current submenu/menu and returns focus to parent item or menu trigger.Tab / Shift + TabExits menu, closes open menus, and moves focus to next/previous focusable element.

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for all interactive components in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons used in menu items, must provide a text alternative that communicates the item's purpose. All menu items, especially icon-only items, need an accessible name (for example, via a title, aria-label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAMenus must be understandable to assistive technologies, such as screen readers. Use proper semantic HTML or the appropriate ARIA roles to ensure accessibility.Text contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Resize text 1.4.4 AAMenus should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of illustrations and component states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
