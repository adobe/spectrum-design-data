---

title: "Action group"
source\_url: <https://s2.spectrum.corp.adobe.com/page/action-group/>
last\_updated: 2026-02-02
category: components/actions
component\_type: action
status: published
tags:

* components-actions
  related\_components:
* action-button
* button
  parent\_category: actions

---

# Action group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                            | Link                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Action | [group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-action-group--docs)                                        |
| Spectrum Web Components SWC: Action | [Group](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/action-group--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                 | [ActionButtonGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/actionbuttongroup--docs)                              |

## Anatomy

```
action group
- action button 1
- action button 2
- action menu (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property             | Value                            | Default value | Description                             |
| -------------------- | -------------------------------- | ------------- | --------------------------------------- |
| orientation          | horizontal / vertical horizontal | –             |                                         |
| size                 | s / m / l / xl m                 | –             |                                         |
| density              | regular / compact regular        | –             |                                         |
| isJustified          | boolean                          | false         |                                         |
| isQuiet              | boolean                          | false         |                                         |
| isEmphasized         | boolean                          | false         |                                         |
| enableSelection      | boolean                          | false         |                                         |
| selectionMode        | single / multiple single         | Only          | applicable if selection is enabled      |
| allowsEmptySelection | boolean                          | false         | Only applicable if selection is enabled |
| overflowMode         | wrap / collapse wrap             | –             |                                         |
| isDisabled           | boolean                          | false         |                                         |

## External links

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

An action group in a disabled state shows that the action buttons within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action group may become available later.

When selection is enabled, an action group's selection behavior can be set to allow for an empty selection, or not.

When selection is enabled, an action group can allow for single or multiple selection of action buttons.

By default, selection is not enabled in an action group. This is used for action groups that offer direct actions, rather than toggling.

Selection can be enabled for an action group to allow for toggling. This can be used to disclose parts of an interface (for example, showing or hiding panels) or to switch between views (for example, grid or list views).

Like action buttons, action groups are not emphasized by default. This is optimal for when the action group is not the core part of an interface, such as in application panels, where all components are monochrome in order to direct focus to the content.

The emphasized action group has a blue background for its selected state in order to provide a visual prominence that meets the accessible color contrast ratio. This is optimal for when the selection should call attention, such as within a tool bar.

By default, an action group uses not-quiet action buttons. This style works best in a dense array of controls where the background helps to separate action buttons from the surrounding container, or to give visibility to isolated buttons.

Alternatively, quiet action groups can have no visible background until they’re interacted with. This style works best when a clear layout (vertical stack, table, grid) makes it easy to parse the buttons. Too many quiet components in a small space can be hard to read.

An action group can become justified. By default, it is not justified since the action button size depends on the label and/or icon inside each button. When an action group is justified, it takes up the entire available container width, divided equally for each action button that is inside the group.

"Action groups come in two densities: regular and compact. The compact density retains the same font and icon sizes, but has tighter spacing. The action buttons also become connected for non-quiet action groups."

"Action groups come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

An action group can be either horizontal or vertical in its orientation. By default, an action group is horizontal. The vertical option should be reserved for when horizontal space is limited.

When there are more actions than the action group has horizontal space for, overflowMode collapse will use an Action menu to contain additional actions. This is used in the components like action bar or panels to show an array of actions to select from when horizontal space is limited.

When multiple items can be selected at a time use an action group when taking actions or making choices from a list of options. Action group is the preferred competent to use when those actions are simple (1-2 words or icon only). If you are switching views or navigating to different content, a segmented control is the preferred component.

Use the fully justified variant when using the vertical compact action group (both the quiet and not quiet options). This will ensure the buttons have the same width.

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

* [Action button](/page/action-button/)
* [Button](/page/button/)
