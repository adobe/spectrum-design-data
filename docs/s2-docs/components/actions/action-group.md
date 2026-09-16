---
title: Action group
source_url: /web/rsp/components/action-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/action-group
swc_exists: false
---

# Action group

## Anatomy

action group action button 1 action button 2 action menu (optional)

## Component options

size Action groups come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. density Action groups come in two densities: regular and compact. The compact density retains the same font and icon sizes, but has tighter spacing. The action buttons also become connected for non-quiet action groups. isJustified An action group can become justified. By default, it is not justified since the action button size depends on the label and/or icon inside each button. When an action group is justified, it takes up the entire available container width, divided equally for each action button that is inside the group. isEmphasized Like action buttons, action groups are not emphasized by default. This is optimal for when the action group is not the core part of an interface, such as in application panels, where all components are monochrome in order to direct focus to the content. The emphasized action group has a blue background for its selected state in order to provide a visual prominence that meets the accessible color contrast ratio. This is optimal for when the selection should call attention, such as within a tool bar. selectionMode When selection is enabled, an action group can allow for single or multiple selection of action buttons. enableSelection By default, selection is not enabled in an action group. This is used for action groups that offer direct actions, rather than toggling. Selection can be enabled for an action group to allow for toggling. This can be used to disclose parts of an interface (for example, showing or hiding panels) or to switch between views (for example, grid or list views). isDisabled An action group in a disabled state shows that the action buttons within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action group may become available later. isQuiet By default, an action group uses not-quiet action buttons. This style works best in a dense array of controls where the background helps to separate action buttons from the surrounding container, or to give visibility to isolated buttons. Alternatively, quiet action groups can have no visible background until they're interacted with. This style works best when a clear layout (vertical stack, table, grid) makes it easy to parse the buttons. Too many quiet components in a small space can be hard to read. orientation An action group can be either horizontal or vertical in its orientation. By default, an action group is horizontal. The vertical option should be reserved for when horizontal space is limited. allowsEmptySelection When selection is enabled, an action group's selection behavior can be set to allow for an empty selection, or not. overflowMode When space is limited in an action group, there are two options for the group's overflow behavior: wrap or collapse. By default, an action group is set to wrap, meaning that the action buttons inside the group wrap to form another line. Alternatively, an action group can be set to collapse inside a More (...) action button, that is referred to as an action menu.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Use an Action menu to show additional actions

When there are more actions than the action group has horizontal space for, overflowMode collapse will use an Action menu to contain additional actions. This is used in the components like action bar or panels to show an array of actions to select from when horizontal space is limited.

## Usage guidelines

### When to use Action group vs. Segmented control

When multiple items can be selected at a time use an action group when taking actions or making choices from a list of options. Action group is the preferred competent to use when those actions are simple (1-2 words or icon only). If you are switching views or navigating to different content, a segmented control is the preferred component.

### Fully justified action groups

Use the fully justified variant when using the vertical compact action group (both the quiet and not quiet options). This will ensure the buttons have the same width.
